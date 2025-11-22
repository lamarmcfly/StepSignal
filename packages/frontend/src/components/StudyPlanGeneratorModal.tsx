import { useState } from 'react';
import { Button, Badge, Alert } from './ui';

interface StudyPlanGeneratorModalProps {
  studentId: string;
  upcomingExams: Array<{
    id: string;
    scheduledDate: string;
    examType: {
      name: string;
      code: string;
    };
  }>;
  onClose: () => void;
  onGenerate: (params: {
    weeklyHoursAvailable: number;
    dailyHoursCap: number;
    startDate: string;
    title?: string;
  }) => Promise<void>;
}

export function StudyPlanGeneratorModal({
  studentId,
  upcomingExams,
  onClose,
  onGenerate,
}: StudyPlanGeneratorModalProps) {
  const [weeklyHours, setWeeklyHours] = useState(20);
  const [dailyHoursCap, setDailyHoursCap] = useState(4);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (weeklyHours < 1 || weeklyHours > 80) {
      setError('Weekly hours must be between 1 and 80');
      return;
    }

    if (dailyHoursCap < 0.5 || dailyHoursCap > 12) {
      setError('Daily hours cap must be between 0.5 and 12');
      return;
    }

    try {
      setIsGenerating(true);
      await onGenerate({
        weeklyHoursAvailable: weeklyHours,
        dailyHoursCap,
        startDate,
        title: title || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate study plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const estimatedWeeks =
    upcomingExams.length > 0
      ? Math.ceil(
          (new Date(upcomingExams[upcomingExams.length - 1].scheduledDate).getTime() -
            new Date(startDate).getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        )
      : 0;

  const totalPlannedHours = estimatedWeeks * weeklyHours;
  const avgQuestionsPerWeek = weeklyHours * 10; // 10 questions per hour

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-bold)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Generate Study Plan
        </h2>

        {error && (
          <Alert variant="error" title="Error" style={{ marginBottom: 'var(--space-4)' }}>
            {error}
          </Alert>
        )}

        {upcomingExams.length === 0 && (
          <Alert variant="warning" title="No Upcoming Exams" style={{ marginBottom: 'var(--space-4)' }}>
            This student has no upcoming exams scheduled. Please schedule at least one exam before
            generating a study plan.
          </Alert>
        )}

        {upcomingExams.length > 0 && (
          <>
            {/* Exam Timeline */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h3
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Target Exams ({upcomingExams.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {upcomingExams.map((exam) => (
                  <div
                    key={exam.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: 'var(--space-2)',
                      backgroundColor: 'var(--color-surface)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    <span>{exam.examType.name}</span>
                    <Badge variant="info">
                      {new Date(exam.scheduledDate).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Title */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-semibold)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Plan Title (optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Step 1 Prep - Spring 2024"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
                  }}
                />
              </div>

              {/* Start Date */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-semibold)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
                  }}
                />
              </div>

              {/* Weekly Hours */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-semibold)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Weekly Hours Available *
                </label>
                <input
                  type="number"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(parseFloat(e.target.value))}
                  min="1"
                  max="80"
                  step="0.5"
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
                  }}
                />
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  Hours available for study per week (typically 15-25 hours)
                </div>
              </div>

              {/* Daily Hours Cap */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-semibold)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Daily Hours Cap *
                </label>
                <input
                  type="number"
                  value={dailyHoursCap}
                  onChange={(e) => setDailyHoursCap(parseFloat(e.target.value))}
                  min="0.5"
                  max="12"
                  step="0.5"
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
                  }}
                />
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  Maximum study hours per day (recommended: 3-5 hours)
                </div>
              </div>

              {/* Plan Summary */}
              {estimatedWeeks > 0 && (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  <h4
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-semibold)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    Plan Summary
                  </h4>
                  <div style={{ display: 'grid', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Duration:</span>
                      <span style={{ fontWeight: 'var(--font-semibold)' }}>
                        {estimatedWeeks} weeks
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Total Study Hours:</span>
                      <span style={{ fontWeight: 'var(--font-semibold)' }}>
                        ~{totalPlannedHours} hours
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        Avg Questions/Week:
                      </span>
                      <span style={{ fontWeight: 'var(--font-semibold)' }}>
                        ~{avgQuestionsPerWeek} questions
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={onClose} disabled={isGenerating}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isGenerating || upcomingExams.length === 0}
                >
                  {isGenerating ? 'Generating...' : 'Generate Plan'}
                </Button>
              </div>
            </form>
          </>
        )}

        {upcomingExams.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
