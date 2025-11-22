import { Card } from './ui';

interface SystemWeaknessChartProps {
  systemWeaknesses: Record<string, number>;
  totalErrors: number;
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

const SYSTEM_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#34495e',
  '#16a085',
  '#27ae60',
  '#2980b9',
  '#8e44ad',
  '#95a5a6',
];

export function SystemWeaknessChart({
  systemWeaknesses,
  totalErrors,
}: SystemWeaknessChartProps) {
  const systemData = Object.entries(systemWeaknesses)
    .map(([system, count], index) => ({
      system,
      label: SYSTEM_LABELS[system] || system,
      count,
      percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
      color: SYSTEM_COLORS[index % SYSTEM_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Show top 10 systems

  const maxCount = Math.max(...systemData.map((item) => item.count), 1);

  return (
    <Card
      title="System Weaknesses"
      subtitle="Medical content areas needing attention"
    >
      {systemData.length === 0 ? (
        <div
          style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          No system-specific data available yet. Data will appear as assessments are logged.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {systemData.map((item) => (
            <div key={item.system}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-2)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <span style={{ fontWeight: 'var(--font-medium)' }}>{item.label}</span>
                <span
                  style={{
                    fontWeight: 'var(--font-semibold)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {item.count} errors ({Math.round(item.percentage)}%)
                </span>
              </div>

              {/* Bar chart */}
              <div
                style={{
                  height: '10px',
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

          {/* Focus Recommendation */}
          {systemData.length > 0 && (
            <div
              style={{
                marginTop: 'var(--space-2)',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--color-border)',
                padding: 'var(--space-3)',
                background: 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                💡 Focus Recommendation
              </div>
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Prioritize studying <strong>{systemData[0].label}</strong> - this system has the
                highest error concentration with {systemData[0].count} errors.
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
