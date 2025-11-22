import { useQuery } from '@tanstack/react-query';
import { Alert } from './ui';

export function RiskDisclaimer() {
  const { data: settings } = useQuery({
    queryKey: ['institutionSettings'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/settings', {
        credentials: 'include',
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.settings as { disclaimerText: string | null };
    },
  });

  if (!settings?.disclaimerText) {
    return null;
  }

  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <Alert variant="info" title="Important Notice">
        {settings.disclaimerText}
      </Alert>
    </div>
  );
}
