import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AppShell, Card, Button, FormField, Alert } from '../components/ui';

type ImportType = 'qbank' | 'nbme';

export function ImportPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [importType, setImportType] = useState<ImportType>('qbank');
  const [file, setFile] = useState<File | null>(null);
  const [blockName, setBlockName] = useState('');
  const [dateTaken, setDateTaken] = useState('');

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const endpoint =
        importType === 'qbank' ? '/api/import/qbank' : '/api/import/nbme';

      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 401) {
          navigate('/login');
          throw new Error('Unauthorized');
        }
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to import CSV');
      }

      return res.json();
    },
    onSuccess: () => {
      navigate(`/students/${studentId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !studentId) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('studentId', studentId);

    if (importType === 'qbank') {
      if (!blockName || !dateTaken) {
        return;
      }
      formData.append('blockName', blockName);
      formData.append('dateTaken', dateTaken);
    }

    importMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <AppShell
      navItems={[
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/students', label: 'Students', icon: '👥' },
        { path: '/exams', label: 'Exams', icon: '📝' },
        { path: '/analytics', label: 'Analytics', icon: '📈' },
        { path: '/settings', label: 'Settings', icon: '⚙️' },
      ]}
    >
      <div>
        <Button
          variant="secondary"
          onClick={() => navigate(`/students/${studentId}`)}
          style={{ marginBottom: 'var(--space-4)' }}
        >
          ← Back to Student
        </Button>

        <h1
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-bold)',
            marginBottom: 'var(--space-6)',
          }}
        >
          Import Assessment Data
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
            <Card title="Import Type">
              <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <input
                    type="radio"
                    name="importType"
                    value="qbank"
                    checked={importType === 'qbank'}
                    onChange={(e) => setImportType(e.target.value as ImportType)}
                  />
                  QBank Export (UWorld/AMBOSS)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <input
                    type="radio"
                    name="importType"
                    value="nbme"
                    checked={importType === 'nbme'}
                    onChange={(e) => setImportType(e.target.value as ImportType)}
                  />
                  NBME Score Report
                </label>
              </div>
            </Card>

            {importType === 'qbank' && (
              <Card title="QBank Details" subtitle="Information about the QBank block">
                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  <Alert variant="info" title="CSV Format">
                    Your CSV should include columns: Question #, System, Correct (Y/N), Topic
                    (optional), Error Type (optional), Notes (optional)
                  </Alert>

                  <FormField
                    label="Block Name*"
                    type="text"
                    value={blockName}
                    onChange={(e) => setBlockName(e.target.value)}
                    placeholder="e.g., UWorld Block 14"
                    required
                  />

                  <FormField
                    label="Date Taken*"
                    type="date"
                    value={dateTaken}
                    onChange={(e) => setDateTaken(e.target.value)}
                    required
                  />
                </div>
              </Card>
            )}

            {importType === 'nbme' && (
              <Card title="NBME Score Report" subtitle="Import multiple NBME scores">
                <Alert variant="info" title="CSV Format">
                  Your CSV should include columns: Exam Name, Date, Score (optional), Percent
                  Correct (optional), Total Questions (optional)
                </Alert>
              </Card>
            )}

            <Card title="Upload CSV File">
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                    CSV File*
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    required
                    style={{
                      padding: 'var(--space-3)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      width: '100%',
                    }}
                  />
                </div>

                {file && (
                  <div
                    style={{
                      padding: 'var(--space-3)',
                      background: 'var(--color-bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <strong>Selected file:</strong> {file.name} (
                    {(file.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </div>
            </Card>

            {importMutation.isError && (
              <Alert variant="error" title="Import Failed">
                {importMutation.error instanceof Error
                  ? importMutation.error.message
                  : 'Failed to import CSV. Please check the file format and try again.'}
              </Alert>
            )}

            {importMutation.isSuccess && importMutation.data && (
              <Alert variant="success" title="Import Successful">
                {importType === 'qbank' ? (
                  <>
                    Imported {importMutation.data.summary.totalQuestions} questions
                    <br />
                    {importMutation.data.summary.correctCount} correct,{' '}
                    {importMutation.data.summary.incorrectCount} incorrect
                    <br />
                    {importMutation.data.summary.errorsLogged} errors logged
                  </>
                ) : (
                  <>
                    Imported {importMutation.data.summary.totalImported} assessments
                    {importMutation.data.summary.skipped > 0 && (
                      <>
                        <br />({importMutation.data.summary.skipped} rows skipped)
                      </>
                    )}
                  </>
                )}
              </Alert>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button
                variant="primary"
                type="submit"
                disabled={importMutation.isPending || !file}
              >
                {importMutation.isPending ? 'Importing...' : 'Import CSV'}
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => navigate(`/students/${studentId}`)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
