import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell, Card, Table, Button, Badge, Alert } from '../components/ui';
import { RiskOverviewCard } from '../components/RiskOverviewCard';
import { CognitiveProfileChart } from '../components/CognitiveProfileChart';
import { SystemWeaknessChart } from '../components/SystemWeaknessChart';
import { StudyPlanCard } from '../components/StudyPlanCard';
import { StudyPlanGeneratorModal } from '../components/StudyPlanGeneratorModal';
import { StudyPlanSimulatorModal } from '../components/StudyPlanSimulatorModal';
import { RiskTimelineChart } from '../components/RiskTimelineChart';
import { TopActionsCard } from '../components/TopActionsCard';
import { AdvisorNotesPanel } from '../components/AdvisorNotesPanel';
import { StudentReflections } from '../components/StudentReflections';

interface Assessment {
  id: string;
  type: string;
  name: string;
  dateTaken: string;
  score: number | null;
  percentCorrect: number | null;
  totalQuestions: number | null;
  errorEvents: Array<{
    id: string;
    errorType: string;
    system: string;
  }>;
}

interface Exam {
  id: string;
  scheduledDate: string;
  attemptNumber: number;
  outcome: string | null;
  examType: {
    code: string;
    name: string;
  };
}

interface StudentDetail {
  id: string;
  classYear: number;
  hasAccommodations: boolean;
  user: {
    email: string;
    role: string;
  };
  exams: Exam[];
  assessments: Assessment[];
  createdAt: string;
}

interface RiskProfile {
  id: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  knowledgeDeficitCount: number;
  misreadCount: number;
  prematureClosureCount: number;
  timeManagementCount: number;
  strategyErrorCount: number;
  systemWeaknesses: Record<string, number>;
  trendDirection: 'improving' | 'stable' | 'declining' | null;
  recentPerformance: number | null;
  totalErrorsAnalyzed: number;
  lastCalculatedAt: string;
}

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Modal state
  const [showPlanGenerator, setShowPlanGenerator] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const res = await fetch(`http://localhost:3000/api/students/${id}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) {
          navigate('/login');
          throw new Error('Unauthorized');
        }
        if (res.status === 404) {
          throw new Error('Student not found');
        }
        throw new Error('Failed to fetch student');
      }

      const json = await res.json();
      return json.student as StudentDetail;
    },
    enabled: !!id,
  });

  // Fetch risk profile
  const { data: riskData } = useQuery({
    queryKey: ['riskProfile', id],
    queryFn: async () => {
      const res = await fetch(`http://localhost:3000/api/risk/${id}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        return null; // Risk profile might not exist yet
      }

      const json = await res.json();
      return json.riskProfile as RiskProfile;
    },
    enabled: !!id,
  });

  // Fetch study plans
  const { data: studyPlansData } = useQuery({
    queryKey: ['studyPlans', id],
    queryFn: async () => {
      const res = await fetch(`http://localhost:3000/api/study-plans/student/${id}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        return [];
      }

      const json = await res.json();
      return json.studyPlans || [];
    },
    enabled: !!id,
  });

  // Find active study plan
  const activeStudyPlan = studyPlansData?.find((plan: any) => plan.status === 'active');

  // Event handlers
  const handleGeneratePlan = async (params: {
    weeklyHoursAvailable: number;
    dailyHoursCap: number;
    startDate: string;
    title?: string;
  }) => {
    try {
      const res = await fetch('http://localhost:3000/api/study-plans', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: id,
          ...params,
        }),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['studyPlans', id] });
      }
    } catch (error) {
      console.error('Failed to generate study plan:', error);
    }
  };

  const handleUpdateProgress = async (itemId: string, completedHours: number, completedQuestions: number) => {
    if (!activeStudyPlan) return;

    try {
      await fetch(`http://localhost:3000/api/study-plans/${activeStudyPlan.id}/items/${itemId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completedHours,
          completedQuestions,
        }),
      });

      queryClient.invalidateQueries({ queryKey: ['studyPlans', id] });
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleActivatePlan = async (planId: string) => {
    try {
      await fetch(`http://localhost:3000/api/study-plans/${planId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'active',
        }),
      });

      queryClient.invalidateQueries({ queryKey: ['studyPlans', id] });
    } catch (error) {
      console.error('Failed to activate plan:', error);
    }
  };

  if (isLoading) {
    return (
      <AppShell
        navItems={[
          { path: '/dashboard', label: 'Dashboard', icon: '📊' },
          { path: '/students', label: 'Students', icon: '👥' },
          { path: '/exams', label: 'Exams', icon: '📝' },
          { path: '/analytics', label: 'Analytics', icon: '📈' },
          { path: '/settings', label: 'Settings', icon: '⚙️' },
        ]}
      >
        <div style={{ padding: 'var(--space-8)' }}>Loading...</div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell
        navItems={[
          { path: '/dashboard', label: 'Dashboard', icon: '📊' },
          { path: '/students', label: 'Students', icon: '👥' },
          { path: '/exams', label: 'Exams', icon: '📝' },
          { path: '/analytics', label: 'Analytics', icon: '📈' },
          { path: '/settings', label: 'Settings', icon: '⚙️' },
        ]}
      >
        <div style={{ padding: 'var(--space-8)' }}>
          <Alert variant="error" title="Error">
            {error instanceof Error ? error.message : 'Failed to load student'}
          </Alert>
        </div>
      </AppShell>
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
    >
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div>
            <Button
              variant="secondary"
              onClick={() => navigate('/students')}
              style={{ marginBottom: 'var(--space-3)' }}
            >
              ← Back to Students
            </Button>
            <h1
              style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-bold)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {data.user.email}
            </h1>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Class of {data.classYear}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button
              variant="secondary"
              onClick={() => navigate(`/students/${id}/import`)}
            >
              Import CSV
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(`/students/${id}/assessments/new`)}
            >
              Add Assessment
            </Button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
          {/* Risk Analytics Section - Only show if risk profile exists */}
          {riskData && (
            <>
              <RiskOverviewCard riskProfile={riskData} />

              {/* Risk Timeline */}
              <RiskTimelineChart studentId={id!} />

              {/* Top Actions */}
              <TopActionsCard studentId={id!} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                <CognitiveProfileChart riskProfile={riskData} />
                <SystemWeaknessChart
                  systemWeaknesses={riskData.systemWeaknesses}
                  totalErrors={riskData.totalErrorsAnalyzed}
                />
              </div>
            </>
          )}

          {/* Advisor Tools Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
            <AdvisorNotesPanel studentId={id!} />
            <StudentReflections studentId={id!} />
          </div>

          {/* Study Plan Section */}
          {activeStudyPlan ? (
            <StudyPlanCard
              studyPlan={activeStudyPlan}
              onUpdateProgress={handleUpdateProgress}
              onActivate={() => {}}
              onEdit={() => setShowPlanGenerator(true)}
              onSimulate={() => setShowSimulator(true)}
            />
          ) : (
            data.exams.length > 0 && riskData && (
              <Card title="Study Plan">
                <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                    No active study plan. Generate a personalized plan based on upcoming exams and risk profile.
                  </p>
                  <Button variant="primary" onClick={() => setShowPlanGenerator(true)}>
                    Generate Study Plan
                  </Button>
                </div>
              </Card>
            )
          )}

          {/* Student Info Card */}
          <Card title="Student Information">
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <div>
                <span style={{ fontWeight: 'var(--font-semibold)' }}>Email:</span>{' '}
                {data.user.email}
              </div>
              <div>
                <span style={{ fontWeight: 'var(--font-semibold)' }}>Class Year:</span>{' '}
                {data.classYear}
              </div>
              <div>
                <span style={{ fontWeight: 'var(--font-semibold)' }}>Accommodations:</span>{' '}
                {data.hasAccommodations ? (
                  <Badge variant="info">Yes</Badge>
                ) : (
                  <Badge variant="default">No</Badge>
                )}
              </div>
              <div>
                <span style={{ fontWeight: 'var(--font-semibold)' }}>Added:</span>{' '}
                {new Date(data.createdAt).toLocaleDateString()}
              </div>
            </div>
          </Card>

          {/* Exams Timeline Card */}
          <Card title="Scheduled Exams" subtitle={`${data.exams.length} exams`}>
            {data.exams.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No exams scheduled</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Date</th>
                    <th>Attempt</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {data.exams.map((exam) => (
                    <tr key={exam.id}>
                      <td>{exam.examType.name}</td>
                      <td>{new Date(exam.scheduledDate).toLocaleDateString()}</td>
                      <td>{exam.attemptNumber}</td>
                      <td>
                        {exam.outcome ? (
                          <Badge
                            variant={
                              exam.outcome.toLowerCase() === 'pass' ? 'success' : 'error'
                            }
                          >
                            {exam.outcome}
                          </Badge>
                        ) : (
                          <Badge variant="default">Pending</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          {/* Recent Assessments Card */}
          <Card
            title="Recent Assessments"
            subtitle={`${data.assessments.length} assessments logged`}
          >
            {data.assessments.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No assessments logged yet</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Errors</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assessments.map((assessment) => (
                    <tr key={assessment.id}>
                      <td>{assessment.name}</td>
                      <td>
                        <Badge variant="info">
                          {assessment.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td>{new Date(assessment.dateTaken).toLocaleDateString()}</td>
                      <td>
                        {assessment.percentCorrect !== null
                          ? `${Math.round(assessment.percentCorrect * 100)}%`
                          : assessment.score !== null
                          ? assessment.score
                          : 'N/A'}
                      </td>
                      <td>
                        <Badge variant="warning">{assessment.errorEvents.length}</Badge>
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/assessments/${assessment.id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        {/* Modals */}
        {showPlanGenerator && (
          <StudyPlanGeneratorModal
            studentId={id!}
            upcomingExams={data.exams.filter((exam) => !exam.outcome)}
            onClose={() => setShowPlanGenerator(false)}
            onGenerate={handleGeneratePlan}
          />
        )}

        {showSimulator && activeStudyPlan && riskData && (
          <StudyPlanSimulatorModal
            studyPlanId={activeStudyPlan.id}
            currentRiskScore={riskData.overallRiskScore}
            exams={data.exams.filter((exam) => !exam.outcome)}
            currentWeeklyHours={activeStudyPlan.weeklyHoursAvailable}
            onClose={() => setShowSimulator(false)}
          />
        )}
      </div>
    </AppShell>
  );
}
