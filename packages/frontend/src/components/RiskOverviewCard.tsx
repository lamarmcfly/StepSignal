import { Card, Badge } from './ui';

interface RiskOverviewCardProps {
  riskProfile: {
    overallRiskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    trendDirection: 'improving' | 'stable' | 'declining' | null;
    recentPerformance: number | null;
    totalErrorsAnalyzed: number;
    lastCalculatedAt: string;
  };
}

const RISK_COLORS = {
  low: { bg: '#d4edda', border: '#28a745', text: '#155724' },
  medium: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
  high: { bg: '#f8d7da', border: '#dc3545', text: '#721c24' },
  critical: { bg: '#f5c6cb', border: '#c82333', text: '#491217' },
};

const TREND_ICONS = {
  improving: '📈',
  stable: '➡️',
  declining: '📉',
};

export function RiskOverviewCard({ riskProfile }: RiskOverviewCardProps) {
  const colors = RISK_COLORS[riskProfile.riskLevel];

  return (
    <Card title="Risk Assessment" subtitle="AI-powered early warning system">
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {/* Overall Risk Score */}
        <div
          style={{
            padding: 'var(--space-4)',
            background: colors.bg,
            border: `2px solid ${colors.border}`,
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                  color: colors.text,
                  marginBottom: 'var(--space-1)',
                }}
              >
                Overall Risk Level
              </div>
              <div
                style={{
                  fontSize: 'var(--text-3xl)',
                  fontWeight: 'var(--font-bold)',
                  color: colors.text,
                }}
              >
                {riskProfile.riskLevel.toUpperCase()}
              </div>
            </div>
            <div
              style={{
                fontSize: '3rem',
                fontWeight: 'var(--font-bold)',
                color: colors.border,
              }}
            >
              {Math.round(riskProfile.overallRiskScore)}
            </div>
          </div>
        </div>

        {/* Trend and Performance Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          {/* Performance Trend */}
          {riskProfile.trendDirection && (
            <div
              style={{
                padding: 'var(--space-3)',
                background: 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                Performance Trend
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-xl)' }}>
                  {TREND_ICONS[riskProfile.trendDirection]}
                </span>
                <span
                  style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-semibold)',
                    textTransform: 'capitalize',
                  }}
                >
                  {riskProfile.trendDirection}
                </span>
              </div>
            </div>
          )}

          {/* Recent Performance */}
          {riskProfile.recentPerformance !== null && (
            <div
              style={{
                padding: 'var(--space-3)',
                background: 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                Recent Performance
              </div>
              <div
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-semibold)',
                }}
              >
                {Math.round(riskProfile.recentPerformance * 100)}% Correct
              </div>
            </div>
          )}
        </div>

        {/* Additional Stats */}
        <div
          style={{
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
          }}
        >
          <span>{riskProfile.totalErrorsAnalyzed} errors analyzed</span>
          <span>
            Last updated: {new Date(riskProfile.lastCalculatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Card>
  );
}
