import { Card, Badge, Button } from './ui';

interface StudyPlanItem {
  id: string;
  weekNumber: number;
  allocatedHours: number;
  targetQuestions: number;
  completedHours: number;
  completedQuestions: number;
  isCompleted: boolean;
  focusSystems: string[];
  focusErrorTypes: string[];
  recommendations: string;
  exam: {
    examType: {
      name: string;
    };
  } | null;
}

interface StudyPlan {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  weeklyHoursAvailable: number;
  dailyHoursCap: number;
  startDate: string;
  endDate: string;
  items: StudyPlanItem[];
}

interface StudyPlanCardProps {
  studyPlan: StudyPlan;
  onUpdateProgress?: (itemId: string, hours: number, questions: number) => void;
  onActivate?: () => void;
  onEdit?: () => void;
  onSimulate?: () => void;
}

const SYSTEM_LABELS: Record<string, string> = {
  cardiovascular: 'Cardiovascular',
  pulmonary: 'Pulmonary',
  renal: 'Renal',
  gastrointestinal: 'Gastrointestinal',
  endocrine: 'Endocrine',
  neurology: 'Neurology',
  psychiatry: 'Psychiatry',
  musculoskeletal: 'Musculoskeletal',
  dermatology: 'Dermatology',
  reproductive: 'Reproductive',
  hematology: 'Hematology',
  immunology: 'Immunology',
  general: 'General',
};

const ERROR_TYPE_LABELS: Record<string, string> = {
  knowledge_deficit: 'Knowledge Gaps',
  misread: 'Reading Errors',
  premature_closure: 'Premature Closure',
  time_management: 'Time Management',
  strategy_error: 'Strategy Errors',
};

export function StudyPlanCard({
  studyPlan,
  onUpdateProgress,
  onActivate,
  onEdit,
  onSimulate,
}: StudyPlanCardProps) {
  const startDate = new Date(studyPlan.startDate);
  const endDate = new Date(studyPlan.endDate);
  const today = new Date();

  // Calculate current week
  const weeksSinceStart = Math.floor(
    (today.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const currentWeekNumber = weeksSinceStart + 1;

  // Get current week's plan
  const currentWeekPlan = studyPlan.items.find(
    (item) => item.weekNumber === currentWeekNumber
  );

  // Calculate overall progress
  const totalAllocatedHours = studyPlan.items.reduce(
    (sum, item) => sum + item.allocatedHours,
    0
  );
  const totalCompletedHours = studyPlan.items.reduce(
    (sum, item) => sum + item.completedHours,
    0
  );
  const overallProgress =
    totalAllocatedHours > 0
      ? (totalCompletedHours / totalAllocatedHours) * 100
      : 0;

  const completedWeeks = studyPlan.items.filter((item) => item.isCompleted).length;

  return (
    <Card
      title={studyPlan.title}
      subtitle={`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`}
    >
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {/* Status and Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <Badge
              variant={
                studyPlan.status === 'active'
                  ? 'success'
                  : studyPlan.status === 'completed'
                  ? 'info'
                  : 'default'
              }
            >
              {studyPlan.status.toUpperCase()}
            </Badge>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Week {currentWeekNumber} of {studyPlan.items.length}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {studyPlan.status === 'draft' && onActivate && (
              <Button variant="primary" onClick={onActivate}>
                Activate Plan
              </Button>
            )}
            {onEdit && (
              <Button variant="secondary" onClick={onEdit}>
                Edit
              </Button>
            )}
            {onSimulate && (
              <Button variant="secondary" onClick={onSimulate}>
                Simulate Changes
              </Button>
            )}
          </div>
        </div>

        {/* Overall Progress */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-2)',
            }}
          >
            <span style={{ fontWeight: 'var(--font-semibold)' }}>Overall Progress</span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              {completedWeeks}/{studyPlan.items.length} weeks completed
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'var(--color-border)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${overallProgress}%`,
                height: '100%',
                backgroundColor: 'var(--color-primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 'var(--space-1)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
            }}
          >
            <span>
              {totalCompletedHours.toFixed(1)} / {totalAllocatedHours.toFixed(1)} hours
            </span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
        </div>

        {/* Current Week Focus */}
        {currentWeekPlan && studyPlan.status === 'active' && (
          <div
            style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--color-primary)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-3)',
              }}
            >
              <h3 style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-lg)' }}>
                This Week (Week {currentWeekNumber})
              </h3>
              {currentWeekPlan.exam && (
                <Badge variant="info">{currentWeekPlan.exam.examType.name}</Badge>
              )}
            </div>

            {/* Weekly Targets */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  Study Hours
                </div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>
                  {currentWeekPlan.completedHours.toFixed(1)} /{' '}
                  {currentWeekPlan.allocatedHours.toFixed(1)}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: 'var(--color-border)',
                    borderRadius: 'var(--radius-full)',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, (currentWeekPlan.completedHours / currentWeekPlan.allocatedHours) * 100)}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-success)',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  Questions
                </div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>
                  {currentWeekPlan.completedQuestions} / {currentWeekPlan.targetQuestions}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: 'var(--color-border)',
                    borderRadius: 'var(--radius-full)',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, (currentWeekPlan.completedQuestions / currentWeekPlan.targetQuestions) * 100)}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-success)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Focus Areas */}
            {(currentWeekPlan.focusSystems.length > 0 ||
              currentWeekPlan.focusErrorTypes.length > 0) && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <div
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-semibold)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Focus Areas:
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {currentWeekPlan.focusSystems.map((system) => (
                    <Badge key={system} variant="info">
                      {SYSTEM_LABELS[system] || system}
                    </Badge>
                  ))}
                  {currentWeekPlan.focusErrorTypes.map((errorType) => (
                    <Badge key={errorType} variant="warning">
                      {ERROR_TYPE_LABELS[errorType] || errorType}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {currentWeekPlan.recommendations && (
              <div
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-background)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)',
                  whiteSpace: 'pre-line',
                }}
              >
                {currentWeekPlan.recommendations}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Weeks Preview */}
        {studyPlan.status === 'active' && (
          <div>
            <h4
              style={{
                fontWeight: 'var(--font-semibold)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Upcoming Weeks
            </h4>
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              {studyPlan.items
                .filter((item) => item.weekNumber > currentWeekNumber)
                .slice(0, 3)
                .map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: 'var(--space-2)',
                      backgroundColor: 'var(--color-surface)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 'var(--font-semibold)' }}>
                        Week {item.weekNumber}
                      </span>
                      {item.exam && (
                        <span style={{ color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                          • {item.exam.examType.name}
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)' }}>
                      {item.allocatedHours.toFixed(1)}h • {item.targetQuestions}q
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
