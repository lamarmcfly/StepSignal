import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell, Card, Button, Alert } from '../components/ui';
import type { User } from '@stepsignal/shared';

interface InstitutionSettings {
  lowRiskThreshold: number;
  mediumRiskThreshold: number;
  highRiskThreshold: number;
  defaultWeeklyHours: number;
  defaultDailyHoursCap: number;
  accommodationsMultiplier: number;
  disclaimerText: string | null;
  enableAutoAlerts: boolean;
  enableStudyPlanEngine: boolean;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [lowRiskThreshold, setLowRiskThreshold] = useState(25);
  const [mediumRiskThreshold, setMediumRiskThreshold] = useState(50);
  const [highRiskThreshold, setHighRiskThreshold] = useState(75);
  const [defaultWeeklyHours, setDefaultWeeklyHours] = useState(20);
  const [defaultDailyHoursCap, setDefaultDailyHoursCap] = useState(4);
  const [accommodationsMultiplier, setAccommodationsMultiplier] = useState(0.75);
  const [disclaimerText, setDisclaimerText] = useState('');
  const [enableAutoAlerts, setEnableAutoAlerts] = useState(true);
  const [enableStudyPlanEngine, setEnableStudyPlanEngine] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/auth/me', {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        if (data.user.role !== 'admin') {
          navigate('/dashboard');
        }
        setLoading(false);
      })
      .catch(() => navigate('/login'));
  }, [navigate]);

  // Fetch settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['institutionSettings'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/settings', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch settings');
      const json = await res.json();
      return json.settings as InstitutionSettings;
    },
    enabled: !!user && user.role === 'admin',
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setLowRiskThreshold(settings.lowRiskThreshold);
      setMediumRiskThreshold(settings.mediumRiskThreshold);
      setHighRiskThreshold(settings.highRiskThreshold);
      setDefaultWeeklyHours(settings.defaultWeeklyHours);
      setDefaultDailyHoursCap(settings.defaultDailyHoursCap);
      setAccommodationsMultiplier(settings.accommodationsMultiplier);
      setDisclaimerText(settings.disclaimerText || '');
      setEnableAutoAlerts(settings.enableAutoAlerts);
      setEnableStudyPlanEngine(settings.enableStudyPlanEngine);
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (updates: Partial<InstitutionSettings>) => {
      const res = await fetch('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save settings');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutionSettings'] });
      setSaveSuccess(true);
      setSaveError(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error: Error) => {
      setSaveError(error.message);
      setSaveSuccess(false);
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:3000/api/settings/reset', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reset settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutionSettings'] });
      setSaveSuccess(true);
      setSaveError(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error: Error) => {
      setSaveError(error.message);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      lowRiskThreshold,
      mediumRiskThreshold,
      highRiskThreshold,
      defaultWeeklyHours,
      defaultDailyHoursCap,
      accommodationsMultiplier,
      disclaimerText: disclaimerText || null,
      enableAutoAlerts,
      enableStudyPlanEngine,
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetMutation.mutate();
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading || loadingSettings) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <AppShell
      navItems={[
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/students', label: 'Students', icon: '👥' },
        { path: '/exams', label: 'Exams', icon: '📝' },
        { path: '/analytics', label: 'Analytics', icon: '📈' },
        { path: '/settings', label: 'Settings', icon: '⚙️' },
      ]}
      userEmail={user?.email}
      onLogout={handleLogout}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
              Institution Settings
            </h1>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Configure institution-wide defaults and risk thresholds
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={handleReset} disabled={resetMutation.isPending}>
              Reset to Defaults
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        {saveSuccess && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Alert variant="success" title="Success">
              Settings saved successfully
            </Alert>
          </div>
        )}

        {saveError && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Alert variant="error" title="Error">
              {saveError}
            </Alert>
          </div>
        )}

        <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
          {/* Risk Thresholds */}
          <Card title="Risk Level Thresholds" subtitle="Define score ranges for each risk level (0-100 scale)">
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)', alignItems: 'center' }}>
                <label htmlFor="lowRiskThreshold" style={{ fontWeight: 'var(--font-medium)' }}>
                  Low Risk Threshold
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <input
                    id="lowRiskThreshold"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={lowRiskThreshold}
                    onChange={(e) => setLowRiskThreshold(parseFloat(e.target.value))}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--text-sm)',
                      width: '120px',
                    }}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    (0 - {lowRiskThreshold} = Low)
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)', alignItems: 'center' }}>
                <label htmlFor="mediumRiskThreshold" style={{ fontWeight: 'var(--font-medium)' }}>
                  Medium Risk Threshold
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <input
                    id="mediumRiskThreshold"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={mediumRiskThreshold}
                    onChange={(e) => setMediumRiskThreshold(parseFloat(e.target.value))}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--text-sm)',
                      width: '120px',
                    }}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    ({lowRiskThreshold} - {mediumRiskThreshold} = Medium)
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)', alignItems: 'center' }}>
                <label htmlFor="highRiskThreshold" style={{ fontWeight: 'var(--font-medium)' }}>
                  High Risk Threshold
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <input
                    id="highRiskThreshold"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={highRiskThreshold}
                    onChange={(e) => setHighRiskThreshold(parseFloat(e.target.value))}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--text-sm)',
                      width: '120px',
                    }}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    ({mediumRiskThreshold} - {highRiskThreshold} = High, {highRiskThreshold}+ = Critical)
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Study Plan Defaults */}
          <Card title="Study Plan Defaults" subtitle="Default capacity settings for study plans">
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)', alignItems: 'center' }}>
                <label htmlFor="defaultWeeklyHours" style={{ fontWeight: 'var(--font-medium)' }}>
                  Default Weekly Hours
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <input
                    id="defaultWeeklyHours"
                    type="number"
                    min="1"
                    max="168"
                    step="0.5"
                    value={defaultWeeklyHours}
                    onChange={(e) => setDefaultWeeklyHours(parseFloat(e.target.value))}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--text-sm)',
                      width: '120px',
                    }}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    hours per week
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)', alignItems: 'center' }}>
                <label htmlFor="defaultDailyHoursCap" style={{ fontWeight: 'var(--font-medium)' }}>
                  Default Daily Hours Cap
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <input
                    id="defaultDailyHoursCap"
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={defaultDailyHoursCap}
                    onChange={(e) => setDefaultDailyHoursCap(parseFloat(e.target.value))}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--text-sm)',
                      width: '120px',
                    }}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    max hours per day
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Accommodations */}
          <Card title="Accommodations" subtitle="Adjust expected volume for students with accommodations">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)', alignItems: 'center' }}>
              <label htmlFor="accommodationsMultiplier" style={{ fontWeight: 'var(--font-medium)' }}>
                Accommodations Multiplier
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <input
                  id="accommodationsMultiplier"
                  type="number"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={accommodationsMultiplier}
                  onChange={(e) => setAccommodationsMultiplier(parseFloat(e.target.value))}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--text-sm)',
                    width: '120px',
                  }}
                />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  ({((1 - accommodationsMultiplier) * 100).toFixed(0)}% reduction in expected volume)
                </span>
              </div>
            </div>
          </Card>

          {/* Disclaimer Text */}
          <Card title="Risk Disclaimer" subtitle="Disclaimer text displayed on risk assessment pages">
            <textarea
              value={disclaimerText}
              onChange={(e) => setDisclaimerText(e.target.value)}
              placeholder="Enter disclaimer text (optional)"
              rows={4}
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </Card>

          {/* Feature Flags */}
          <Card title="Feature Flags" subtitle="Enable or disable platform features">
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="checkbox"
                  checked={enableAutoAlerts}
                  onChange={(e) => setEnableAutoAlerts(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontWeight: 'var(--font-medium)' }}>Enable Automatic Alerts</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="checkbox"
                  checked={enableStudyPlanEngine}
                  onChange={(e) => setEnableStudyPlanEngine(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontWeight: 'var(--font-medium)' }}>Enable Study Plan Engine</span>
              </label>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
