import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell, Card, Button, Table, Badge } from '../components/ui';
import type { User } from '@stepsignal/shared';

interface RiskDistribution {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  percentage: number;
}

interface CohortRiskSummary {
  totalStudents: number;
  distribution: RiskDistribution[];
  averageRiskScore: number;
  filters: {
    classYear?: number;
    examTypeCode?: string;
    weeksToExam?: number;
  };
}

interface ClerkshipStats {
  clerkshipName: string;
  studentCount: number;
  averageRiskScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topErrorType: string | null;
}

interface AdvisorWorkload {
  advisorId: string;
  advisorEmail: string;
  totalStudents: number;
  highRiskStudents: number;
  criticalRiskStudents: number;
  averageRiskScore: number;
  workloadPercentage: number;
}

const RISK_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const ERROR_TYPE_LABELS: Record<string, string> = {
  knowledge_deficit: 'Knowledge Deficit',
  misread: 'Misread/Misinterpretation',
  premature_closure: 'Premature Closure',
  time_management: 'Time Management',
  strategy_error: 'Strategy Error',
};

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [classYearFilter, setClassYearFilter] = useState<string>('all');
  const [examTypeFilter, setExamTypeFilter] = useState<string>('all');
  const [weeksToExamFilter, setWeeksToExamFilter] = useState<string>('all');

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
        setLoading(false);
      })
      .catch(() => navigate('/login'));
  }, [navigate]);

  // Fetch available filter options
  const { data: classYears } = useQuery({
    queryKey: ['classYears'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/analytics/class-years', {
        credentials: 'include',
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.classYears as number[];
    },
    enabled: !!user,
  });

  const { data: examTypes } = useQuery({
    queryKey: ['examTypes'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/analytics/exam-types', {
        credentials: 'include',
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.examTypes as Array<{ code: string; name: string }>;
    },
    enabled: !!user,
  });

  // Fetch cohort risk summary with filters
  const { data: riskSummary, isLoading: loadingRisk } = useQuery({
    queryKey: ['cohortRiskSummary', classYearFilter, examTypeFilter, weeksToExamFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (classYearFilter !== 'all') params.append('classYear', classYearFilter);
      if (examTypeFilter !== 'all') params.append('examTypeCode', examTypeFilter);
      if (weeksToExamFilter !== 'all') params.append('weeksToExam', weeksToExamFilter);

      const res = await fetch(
        `http://localhost:3000/api/analytics/cohort/risk-summary?${params}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to fetch risk summary');
      const json = await res.json();
      return json.summary as CohortRiskSummary;
    },
    enabled: !!user,
  });

  // Fetch clerkship comparisons
  const { data: clerkships } = useQuery({
    queryKey: ['clerkships'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/analytics/clerkships', {
        credentials: 'include',
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.clerkships as ClerkshipStats[];
    },
    enabled: !!user,
  });

  // Fetch advisor workload
  const { data: workload } = useQuery({
    queryKey: ['advisorWorkload'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/analytics/advisor-workload', {
        credentials: 'include',
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.workload as AdvisorWorkload[];
    },
    enabled: !!user,
  });

  const handleExportCSV = () => {
    window.open('http://localhost:3000/api/analytics/export/csv', '_blank');
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
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
              Cohort Analytics
            </h1>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Institution-level insights and resource allocation
            </p>
          </div>
          <Button variant="primary" onClick={handleExportCSV}>
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card title="Filters" subtitle="Filter cohort risk summary">
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)', color: 'var(--color-text-muted)' }}>
                Class Year
              </label>
              <select
                value={classYearFilter}
                onChange={(e) => setClassYearFilter(e.target.value)}
                style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)' }}
              >
                <option value="all">All Years</option>
                {classYears?.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)', color: 'var(--color-text-muted)' }}>
                Exam Type
              </label>
              <select
                value={examTypeFilter}
                onChange={(e) => setExamTypeFilter(e.target.value)}
                style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)' }}
              >
                <option value="all">All Exam Types</option>
                {examTypes?.map((type) => (
                  <option key={type.code} value={type.code}>{type.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-1)', color: 'var(--color-text-muted)' }}>
                Weeks to Exam
              </label>
              <select
                value={weeksToExamFilter}
                onChange={(e) => setWeeksToExamFilter(e.target.value)}
                style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)' }}
              >
                <option value="all">Any Time</option>
                <option value="2">Within 2 Weeks</option>
                <option value="4">Within 4 Weeks</option>
                <option value="8">Within 8 Weeks</option>
                <option value="12">Within 12 Weeks</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setClassYearFilter('all');
                  setExamTypeFilter('all');
                  setWeeksToExamFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
          {/* Cohort Risk Distribution */}
          {loadingRisk ? (
            <Card title="Cohort Risk Distribution">
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading...
              </div>
            </Card>
          ) : riskSummary && riskSummary.totalStudents > 0 ? (
            <Card
              title="Cohort Risk Distribution"
              subtitle={`${riskSummary.totalStudents} students | Avg Risk Score: ${riskSummary.averageRiskScore.toFixed(1)}`}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                {riskSummary.distribution.map((item) => (
                  <div
                    key={item.riskLevel}
                    style={{
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${RISK_COLORS[item.riskLevel]}`,
                      background: `${RISK_COLORS[item.riskLevel]}10`,
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                      {item.riskLevel}
                    </div>
                    <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: RISK_COLORS[item.riskLevel], marginBottom: 'var(--space-1)' }}>
                      {item.count}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                      {item.percentage.toFixed(1)}% of cohort
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card title="Cohort Risk Distribution">
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No data available for the selected filters.
              </div>
            </Card>
          )}

          {/* Clerkship Comparisons */}
          {clerkships && clerkships.length > 0 && (
            <Card title="Clerkship Risk Comparison" subtitle={`${clerkships.length} clerkships`}>
              <Table>
                <thead>
                  <tr>
                    <th>Clerkship</th>
                    <th>Students</th>
                    <th>Avg Risk</th>
                    <th>Critical</th>
                    <th>High</th>
                    <th>Medium</th>
                    <th>Low</th>
                    <th>Top Error Type</th>
                  </tr>
                </thead>
                <tbody>
                  {clerkships.map((clerkship) => (
                    <tr key={clerkship.clerkshipName}>
                      <td style={{ fontWeight: 'var(--font-semibold)' }}>{clerkship.clerkshipName}</td>
                      <td>{clerkship.studentCount}</td>
                      <td>
                        <span style={{ fontWeight: 'var(--font-semibold)', color: clerkship.averageRiskScore >= 75 ? RISK_COLORS.critical : clerkship.averageRiskScore >= 50 ? RISK_COLORS.high : clerkship.averageRiskScore >= 25 ? RISK_COLORS.medium : RISK_COLORS.low }}>
                          {clerkship.averageRiskScore.toFixed(1)}
                        </span>
                      </td>
                      <td>{clerkship.riskDistribution.critical}</td>
                      <td>{clerkship.riskDistribution.high}</td>
                      <td>{clerkship.riskDistribution.medium}</td>
                      <td>{clerkship.riskDistribution.low}</td>
                      <td>{clerkship.topErrorType ? ERROR_TYPE_LABELS[clerkship.topErrorType] : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}

          {/* Advisor Workload */}
          {workload && workload.length > 0 && (
            <Card title="Advisor Workload Distribution" subtitle={`${workload.length} advisors`}>
              <Table>
                <thead>
                  <tr>
                    <th>Advisor</th>
                    <th>Total Students</th>
                    <th>High Risk</th>
                    <th>Critical Risk</th>
                    <th>Avg Risk Score</th>
                    <th>Workload %</th>
                  </tr>
                </thead>
                <tbody>
                  {workload.map((advisor) => (
                    <tr key={advisor.advisorId}>
                      <td>{advisor.advisorEmail}</td>
                      <td>{advisor.totalStudents}</td>
                      <td>
                        <Badge variant={advisor.highRiskStudents > 5 ? 'warning' : 'default'}>
                          {advisor.highRiskStudents}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={advisor.criticalRiskStudents > 0 ? 'error' : 'default'}>
                          {advisor.criticalRiskStudents}
                        </Badge>
                      </td>
                      <td>{advisor.averageRiskScore.toFixed(1)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <div style={{ flex: 1, height: '8px', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${advisor.workloadPercentage}%`, background: advisor.workloadPercentage > 40 ? '#f97316' : '#3b82f6' }} />
                          </div>
                          <span style={{ fontSize: 'var(--text-sm)', minWidth: '40px' }}>
                            {advisor.workloadPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
