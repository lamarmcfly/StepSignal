import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell, Card, Badge, Alert, Table, Button } from '../components/ui';
import type { User } from '@stepsignal/shared';

interface HighRiskStudent {
  id: string;
  classYear: number;
  hasAccommodations: boolean;
  user: {
    email: string;
  };
  riskProfile: {
    overallRiskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    trendDirection: 'improving' | 'stable' | 'declining' | null;
  };
}

interface DashboardStats {
  totalStudents: number;
  highRiskCount: number;
  upcomingExams: number;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [trendFilter, setTrendFilter] = useState<'all' | 'improving' | 'stable' | 'declining'>('all');

  useEffect(() => {
    fetch('http://localhost:3000/api/auth/me', {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Not authenticated');
        }
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        navigate('/login');
      });
  }, [navigate]);

  // Fetch high-risk students
  const { data: highRiskStudents } = useQuery({
    queryKey: ['highRiskStudents'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/risk/institution/high-risk', {
        credentials: 'include',
      });
      if (!res.ok) {
        return [];
      }
      const json = await res.json();
      return json.students as HighRiskStudent[];
    },
    enabled: !!user,
  });

  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/students', {
        credentials: 'include',
      });
      if (!res.ok) {
        return { totalStudents: 0, highRiskCount: 0, upcomingExams: 0 };
      }
      const json = await res.json();
      return {
        totalStudents: json.pagination?.total || 0,
        highRiskCount: highRiskStudents?.length || 0,
        upcomingExams: 0, // TODO: Implement when exams endpoint is ready
      } as DashboardStats;
    },
    enabled: !!user,
  });

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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
        <h1
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-bold)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
          Welcome back, {user?.email}
        </p>

        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Alert variant="success" title="Authentication Working">
            You are successfully logged in as{' '}
            <Badge variant={user?.role === 'admin' ? 'warning' : 'info'}>{user?.role}</Badge>
          </Alert>
        </div>

        <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            <Card title="Total Students" subtitle="Across all cohorts">
              <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text)' }}>
                {stats?.totalStudents || 0}
              </p>
            </Card>

            <Card title="High-Risk Students" subtitle="Require attention">
              <p
                style={{
                  fontSize: 'var(--text-3xl)',
                  fontWeight: 'var(--font-bold)',
                  color: 'var(--color-risk-high)',
                }}
              >
                {highRiskStudents?.length || 0}
              </p>
            </Card>

            <Card title="Upcoming Exams" subtitle="Next 4 weeks">
              <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text)' }}>
                {stats?.upcomingExams || 0}
              </p>
            </Card>
          </div>

          {/* High-Risk Students Table */}
          {highRiskStudents && highRiskStudents.length > 0 && (
            <Card
              title="Student Risk Queue"
              subtitle={`${highRiskStudents.filter((s) => {
                const matchesRisk = riskFilter === 'all' || s.riskProfile.riskLevel === riskFilter;
                const matchesTrend = trendFilter === 'all' || s.riskProfile.trendDirection === trendFilter;
                return matchesRisk && matchesTrend;
              }).length} students matching filters`}
            >
              <div>
                {/* Filters */}
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-4)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-medium)',
                        marginBottom: 'var(--space-1)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Filter by Risk Level
                    </label>
                    <select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value as any)}
                      style={{
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      <option value="all">All Levels</option>
                      <option value="critical">Critical Only</option>
                      <option value="high">High Only</option>
                      <option value="medium">Medium Only</option>
                      <option value="low">Low Only</option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-medium)',
                        marginBottom: 'var(--space-1)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Filter by Trend
                    </label>
                    <select
                      value={trendFilter}
                      onChange={(e) => setTrendFilter(e.target.value as any)}
                      style={{
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      <option value="all">All Trends</option>
                      <option value="improving">Improving</option>
                      <option value="stable">Stable</option>
                      <option value="declining">Declining</option>
                    </select>
                  </div>

                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end' }}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setRiskFilter('all');
                        setTrendFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <Table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class Year</th>
                      <th>Risk Score</th>
                      <th>Risk Level</th>
                      <th>Trend</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRiskStudents
                      .filter((student) => {
                        const matchesRisk = riskFilter === 'all' || student.riskProfile.riskLevel === riskFilter;
                        const matchesTrend = trendFilter === 'all' || student.riskProfile.trendDirection === trendFilter;
                        return matchesRisk && matchesTrend;
                      })
                      .map((student) => (
                        <tr key={student.id}>
                          <td>{student.user.email}</td>
                          <td>{student.classYear}</td>
                          <td>
                            <span style={{ fontWeight: 'var(--font-semibold)' }}>
                              {Math.round(student.riskProfile.overallRiskScore)}
                            </span>
                          </td>
                          <td>
                            <Badge
                              variant={
                                student.riskProfile.riskLevel === 'critical'
                                  ? 'error'
                                  : student.riskProfile.riskLevel === 'high'
                                  ? 'warning'
                                  : student.riskProfile.riskLevel === 'medium'
                                  ? 'info'
                                  : 'success'
                              }
                            >
                              {student.riskProfile.riskLevel.toUpperCase()}
                            </Badge>
                          </td>
                          <td>
                            {student.riskProfile.trendDirection === 'improving' && (
                              <span style={{ color: '#10b981' }}>↓ Improving</span>
                            )}
                            {student.riskProfile.trendDirection === 'stable' && (
                              <span style={{ color: '#6b7280' }}>→ Stable</span>
                            )}
                            {student.riskProfile.trendDirection === 'declining' && (
                              <span style={{ color: '#ef4444' }}>↑ Declining</span>
                            )}
                            {!student.riskProfile.trendDirection && '-'}
                          </td>
                          <td>
                            <Button
                              variant="secondary"
                              onClick={() => navigate(`/students/${student.id}`)}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </Table>

                {highRiskStudents.filter((s) => {
                  const matchesRisk = riskFilter === 'all' || s.riskProfile.riskLevel === riskFilter;
                  const matchesTrend = trendFilter === 'all' || s.riskProfile.trendDirection === trendFilter;
                  return matchesRisk && matchesTrend;
                }).length === 0 && (
                  <div
                    style={{
                      padding: 'var(--space-8)',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    No students match the selected filters.
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
