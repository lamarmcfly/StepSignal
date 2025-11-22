import { useQuery } from '@tanstack/react-query';
import { Card } from './ui';

interface RiskTimelineChartProps {
  studentId: string;
}

interface RiskHistoryPoint {
  id: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recordedAt: string;
  knowledgeDeficitCount: number;
  misreadCount: number;
  prematureClosureCount: number;
  timeManagementCount: number;
  strategyErrorCount: number;
  totalErrorsAnalyzed: number;
}

const RISK_LEVEL_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const RISK_LEVEL_ZONES = [
  { level: 'critical', min: 75, max: 100, color: '#fef2f2' },
  { level: 'high', min: 50, max: 75, color: '#fff7ed' },
  { level: 'medium', min: 25, max: 50, color: '#fffbeb' },
  { level: 'low', min: 0, max: 25, color: '#f0fdf4' },
];

export function RiskTimelineChart({ studentId }: RiskTimelineChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['riskTimeline', studentId],
    queryFn: async () => {
      const res = await fetch(
        `http://localhost:3000/api/advisor/students/${studentId}/risk-timeline?limit=50`,
        {
          credentials: 'include',
        }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch risk timeline');
      }

      const json = await res.json();
      return json.timeline as RiskHistoryPoint[];
    },
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <Card title="Risk Timeline" subtitle="Risk score over time">
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading timeline...
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card title="Risk Timeline" subtitle="Risk score over time">
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No risk history available yet. Risk snapshots are recorded automatically as assessments are logged.
        </div>
      </Card>
    );
  }

  // Chart dimensions
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const minScore = 0;
  const maxScore = 100;
  const xScale = (index: number) => (index / (data.length - 1)) * chartWidth;
  const yScale = (score: number) => chartHeight - ((score - minScore) / (maxScore - minScore)) * chartHeight;

  // Generate path
  const pathData = data
    .map((point, index) => {
      const x = xScale(index);
      const y = yScale(point.overallRiskScore);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // Calculate trend
  const firstScore = data[0].overallRiskScore;
  const lastScore = data[data.length - 1].overallRiskScore;
  const trend = lastScore - firstScore;
  const trendDirection = trend < -5 ? 'improving' : trend > 5 ? 'worsening' : 'stable';
  const trendColor = trendDirection === 'improving' ? '#10b981' : trendDirection === 'worsening' ? '#ef4444' : '#6b7280';

  return (
    <Card
      title="Risk Timeline"
      subtitle={`${data.length} risk snapshots recorded`}
    >
      <div>
        {/* Chart SVG */}
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ overflow: 'visible' }}
        >
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Risk level zones */}
            {RISK_LEVEL_ZONES.map((zone) => (
              <rect
                key={zone.level}
                x={0}
                y={yScale(zone.max)}
                width={chartWidth}
                height={yScale(zone.min) - yScale(zone.max)}
                fill={zone.color}
                opacity={0.3}
              />
            ))}

            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((score) => (
              <g key={score}>
                <line
                  x1={0}
                  y1={yScale(score)}
                  x2={chartWidth}
                  y2={yScale(score)}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={-10}
                  y={yScale(score)}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  fontSize="12"
                  fill="var(--color-text-muted)"
                >
                  {score}
                </text>
              </g>
            ))}

            {/* Line path */}
            <path
              d={pathData}
              fill="none"
              stroke={RISK_LEVEL_COLORS[data[data.length - 1].riskLevel]}
              strokeWidth={2}
            />

            {/* Data points */}
            {data.map((point, index) => (
              <g key={point.id}>
                <circle
                  cx={xScale(index)}
                  cy={yScale(point.overallRiskScore)}
                  r={4}
                  fill={RISK_LEVEL_COLORS[point.riskLevel]}
                  stroke="white"
                  strokeWidth={2}
                />
                <title>
                  {new Date(point.recordedAt).toLocaleDateString()}: {point.overallRiskScore.toFixed(1)} ({point.riskLevel})
                </title>
              </g>
            ))}

            {/* X-axis labels */}
            {data.length <= 10 ? (
              // Show all labels if few data points
              data.map((point, index) => (
                <text
                  key={point.id}
                  x={xScale(index)}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--color-text-muted)"
                >
                  {new Date(point.recordedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </text>
              ))
            ) : (
              // Show first, middle, and last labels
              [0, Math.floor(data.length / 2), data.length - 1].map((index) => (
                <text
                  key={index}
                  x={xScale(index)}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--color-text-muted)"
                >
                  {new Date(data[index].recordedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </text>
              ))
            )}

            {/* Y-axis label */}
            <text
              x={-chartHeight / 2}
              y={-40}
              textAnchor="middle"
              fontSize="12"
              fill="var(--color-text-muted)"
              transform={`rotate(-90, -${chartHeight / 2}, -40)`}
            >
              Risk Score
            </text>
          </g>
        </svg>

        {/* Summary Stats */}
        <div
          style={{
            marginTop: 'var(--space-4)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Current Score
            </div>
            <div
              style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-bold)',
                color: RISK_LEVEL_COLORS[lastScore >= 75 ? 'critical' : lastScore >= 50 ? 'high' : lastScore >= 25 ? 'medium' : 'low'],
              }}
            >
              {lastScore.toFixed(1)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Trend
            </div>
            <div
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-semibold)',
                color: trendColor,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              {trendDirection === 'improving' && '↓'}
              {trendDirection === 'worsening' && '↑'}
              {trendDirection === 'stable' && '→'}
              <span style={{ textTransform: 'capitalize' }}>{trendDirection}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Change
            </div>
            <div
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-semibold)',
                color: trendColor,
              }}
            >
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Latest snapshot details */}
        <div
          style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3)',
            background: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-semibold)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Latest Snapshot ({new Date(data[data.length - 1].recordedAt).toLocaleDateString()})
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Total errors analyzed: {data[data.length - 1].totalErrorsAnalyzed}
          </div>
        </div>
      </div>
    </Card>
  );
}
