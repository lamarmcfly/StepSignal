import { useQuery } from '@tanstack/react-query';
import { Card } from './ui';

interface TopActionsCardProps {
  studentId: string;
}

export function TopActionsCard({ studentId }: TopActionsCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['topActions', studentId],
    queryFn: async () => {
      const res = await fetch(
        `http://localhost:3000/api/advisor/students/${studentId}/top-actions`,
        {
          credentials: 'include',
        }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch top actions');
      }

      const json = await res.json();
      return json.actions as string[];
    },
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <Card title="Top 3 Recommended Actions">
        <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading recommendations...
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card title="Top 3 Recommended Actions">
        <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No recommendations available. Add assessments and risk profile data to generate personalized action items.
        </div>
      </Card>
    );
  }

  return (
    <Card title="Top 3 Recommended Actions" subtitle="Personalized next steps">
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {data.map((action, index) => {
          const isUrgent = action.toLowerCase().includes('urgent');

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                background: isUrgent ? '#fef2f2' : 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-md)',
                borderLeft: isUrgent ? '4px solid #ef4444' : '4px solid #3b82f6',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--font-bold)',
                  color: isUrgent ? '#ef4444' : '#3b82f6',
                  minWidth: '32px',
                }}
              >
                {index + 1}
              </div>
              <div>
                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text)',
                    lineHeight: '1.5',
                  }}
                >
                  {action}
                </p>
                {isUrgent && (
                  <div
                    style={{
                      marginTop: 'var(--space-2)',
                      fontSize: 'var(--text-xs)',
                      color: '#dc2626',
                      fontWeight: 'var(--font-semibold)',
                    }}
                  >
                    ⚠️ URGENT ACTION REQUIRED
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div
          style={{
            marginTop: 'var(--space-2)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
          }}
        >
          💡 These actions are automatically generated based on risk profile, error patterns, upcoming exams, and study plan data.
        </div>
      </div>
    </Card>
  );
}
