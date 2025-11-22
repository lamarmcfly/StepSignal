import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AppShell, Card, Button, FormField, Alert } from '../components/ui';

const ASSESSMENT_TYPES = [
  { value: 'nbme_practice', label: 'NBME Practice Exam' },
  { value: 'nbme_shelf', label: 'NBME Shelf Exam' },
  { value: 'cbse', label: 'CBSE' },
  { value: 'qbank_block', label: 'QBank Block' },
  { value: 'custom', label: 'Custom Assessment' },
];

const ERROR_TYPES = [
  { value: 'knowledge_deficit', label: 'Knowledge Deficit' },
  { value: 'misread', label: 'Misread/Misinterpretation' },
  { value: 'premature_closure', label: 'Premature Closure' },
  { value: 'time_management', label: 'Time Management' },
  { value: 'strategy_error', label: 'Strategy Error' },
];

const MEDICAL_SYSTEMS = [
  { value: 'cardiovascular', label: 'Cardiovascular' },
  { value: 'pulmonary', label: 'Pulmonary' },
  { value: 'renal', label: 'Renal' },
  { value: 'gastrointestinal', label: 'Gastrointestinal' },
  { value: 'endocrine', label: 'Endocrine' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'psychiatry', label: 'Psychiatry' },
  { value: 'musculoskeletal', label: 'Musculoskeletal' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'reproductive', label: 'Reproductive' },
  { value: 'hematology', label: 'Hematology' },
  { value: 'immunology', label: 'Immunology' },
  { value: 'general', label: 'General' },
];

interface ErrorEvent {
  errorType: string;
  system: string;
  topic: string;
  questionRef: string;
  reflection: string;
}

export function AddAssessmentPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    type: 'qbank_block',
    name: '',
    dateTaken: '',
    score: '',
    percentCorrect: '',
    totalQuestions: '',
    notes: '',
  });

  const [errorEvents, setErrorEvents] = useState<ErrorEvent[]>([]);
  const [currentError, setCurrentError] = useState<ErrorEvent>({
    errorType: 'knowledge_deficit',
    system: 'general',
    topic: '',
    questionRef: '',
    reflection: '',
  });

  const createAssessment = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('http://localhost:3000/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 401) {
          navigate('/login');
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to create assessment');
      }

      return res.json();
    },
    onSuccess: () => {
      navigate(`/students/${studentId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const assessmentData = {
      studentId,
      ...formData,
      errorEvents,
    };

    createAssessment.mutate(assessmentData);
  };

  const addErrorEvent = () => {
    if (currentError.errorType && currentError.system) {
      setErrorEvents([...errorEvents, currentError]);
      setCurrentError({
        errorType: 'knowledge_deficit',
        system: 'general',
        topic: '',
        questionRef: '',
        reflection: '',
      });
    }
  };

  const removeErrorEvent = (index: number) => {
    setErrorEvents(errorEvents.filter((_, i) => i !== index));
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
          Add Assessment
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
            <Card title="Assessment Details">
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                    Assessment Type*
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: 'var(--space-3)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {ASSESSMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <FormField
                  label="Assessment Name*"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., UWorld Block 14, NBME 25, Psych Shelf"
                  required
                />

                <FormField
                  label="Date Taken*"
                  type="date"
                  value={formData.dateTaken}
                  onChange={(e) => setFormData({ ...formData, dateTaken: e.target.value })}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                  <FormField
                    label="Score"
                    type="number"
                    step="0.01"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    placeholder="e.g., 240"
                  />

                  <FormField
                    label="Percent Correct"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.percentCorrect}
                    onChange={(e) =>
                      setFormData({ ...formData, percentCorrect: e.target.value })
                    }
                    placeholder="e.g., 0.75 for 75%"
                  />

                  <FormField
                    label="Total Questions"
                    type="number"
                    value={formData.totalQuestions}
                    onChange={(e) =>
                      setFormData({ ...formData, totalQuestions: e.target.value })
                    }
                    placeholder="e.g., 40"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Any additional notes about this assessment"
                    style={{
                      width: '100%',
                      padding: 'var(--space-3)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>
            </Card>

            <Card title="Error Events" subtitle={`${errorEvents.length} errors logged`}>
              {errorEvents.length > 0 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  {errorEvents.map((error, index) => (
                    <div
                      key={index}
                      style={{
                        padding: 'var(--space-3)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{ERROR_TYPES.find(t => t.value === error.errorType)?.label}</strong>
                        {' - '}
                        {MEDICAL_SYSTEMS.find(s => s.value === error.system)?.label}
                        {error.topic && `: ${error.topic}`}
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => removeErrorEvent(index)}
                        type="button"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                      Error Type
                    </label>
                    <select
                      value={currentError.errorType}
                      onChange={(e) =>
                        setCurrentError({ ...currentError, errorType: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: 'var(--space-3)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      {ERROR_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                      Medical System
                    </label>
                    <select
                      value={currentError.system}
                      onChange={(e) =>
                        setCurrentError({ ...currentError, system: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: 'var(--space-3)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      {MEDICAL_SYSTEMS.map((system) => (
                        <option key={system.value} value={system.value}>
                          {system.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <FormField
                    label="Topic"
                    type="text"
                    value={currentError.topic}
                    onChange={(e) =>
                      setCurrentError({ ...currentError, topic: e.target.value })
                    }
                    placeholder="e.g., Heart Failure, Diabetes"
                  />

                  <FormField
                    label="Question #"
                    type="text"
                    value={currentError.questionRef}
                    onChange={(e) =>
                      setCurrentError({ ...currentError, questionRef: e.target.value })
                    }
                    placeholder="e.g., Q15"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                    Reflection
                  </label>
                  <textarea
                    value={currentError.reflection}
                    onChange={(e) =>
                      setCurrentError({ ...currentError, reflection: e.target.value })
                    }
                    rows={2}
                    placeholder="What did you learn from this error?"
                    style={{
                      width: '100%',
                      padding: 'var(--space-3)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <Button variant="secondary" onClick={addErrorEvent} type="button">
                  Add Error
                </Button>
              </div>
            </Card>

            {createAssessment.isError && (
              <Alert variant="error" title="Error">
                Failed to create assessment. Please try again.
              </Alert>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button
                variant="primary"
                type="submit"
                disabled={createAssessment.isPending}
              >
                {createAssessment.isPending ? 'Saving...' : 'Save Assessment'}
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
