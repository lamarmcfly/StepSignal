import { Card } from './ui';

interface CognitiveProfileChartProps {
  riskProfile: {
    knowledgeDeficitCount: number;
    misreadCount: number;
    prematureClosureCount: number;
    timeManagementCount: number;
    strategyErrorCount: number;
    totalErrorsAnalyzed: number;
  };
}

const ERROR_TYPES = [
  {
    key: 'knowledgeDeficitCount',
    label: 'Knowledge Deficit',
    color: '#dc3545',
    icon: '📚',
  },
  {
    key: 'misreadCount',
    label: 'Misread/Misinterpretation',
    color: '#ffc107',
    icon: '👁️',
  },
  {
    key: 'prematureClosureCount',
    label: 'Premature Closure',
    color: '#fd7e14',
    icon: '🚪',
  },
  {
    key: 'timeManagementCount',
    label: 'Time Management',
    color: '#17a2b8',
    icon: '⏱️',
  },
  {
    key: 'strategyErrorCount',
    label: 'Strategy Error',
    color: '#6f42c1',
    icon: '🎯',
  },
];

export function CognitiveProfileChart({ riskProfile }: CognitiveProfileChartProps) {
  const errorData = ERROR_TYPES.map((type) => ({
    ...type,
    count: riskProfile[type.key as keyof typeof riskProfile] as number,
    percentage:
      riskProfile.totalErrorsAnalyzed > 0
        ? ((riskProfile[type.key as keyof typeof riskProfile] as number) /
            riskProfile.totalErrorsAnalyzed) *
          100
        : 0,
  })).filter((item) => item.count > 0);

  const maxCount = Math.max(...errorData.map((item) => item.count), 1);

  return (
    <Card
      title="Cognitive Error Profile"
      subtitle="Pattern analysis of thinking errors"
    >
      {errorData.length === 0 ? (
        <div
          style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          No error data available yet. Errors will appear as assessments are logged.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {errorData.map((item) => (
            <div key={item.key}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-2)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span>{item.icon}</span>
                  <span style={{ fontWeight: 'var(--font-medium)' }}>{item.label}</span>
                </span>
                <span
                  style={{
                    fontWeight: 'var(--font-semibold)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {item.count} ({Math.round(item.percentage)}%)
                </span>
              </div>

              {/* Bar chart */}
              <div
                style={{
                  height: '8px',
                  background: 'var(--color-bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(item.count / maxCount) * 100}%`,
                    background: item.color,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          ))}

          {/* Summary */}
          <div
            style={{
              marginTop: 'var(--space-2)',
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--color-border)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
            }}
          >
            Total errors analyzed: {riskProfile.totalErrorsAnalyzed}
          </div>
        </div>
      )}
    </Card>
  );
}
