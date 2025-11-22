import { useState } from 'react';
import { Button, Badge, Alert } from './ui';

interface SimulationResult {
  projectedRiskChange: number;
  weeklyHourImpact: number[];
  recommendations: string[];
}

interface StudyPlanSimulatorModalProps {
  studyPlanId: string;
  currentRiskScore: number;
  exams: Array<{
    id: string;
    scheduledDate: string;
    examType: {
      name: string;
    };
  }>;
  currentWeeklyHours: number;
  onClose: () => void;
}

export function StudyPlanSimulatorModal({
  studyPlanId,
  currentRiskScore,
  exams,
  currentWeeklyHours,
  onClose,
}: StudyPlanSimulatorModalProps) {
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [newExamDate, setNewExamDate] = useState('');
  const [hoursChange, setHoursChange] = useState(0);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setError(null);
    setIsSimulating(true);

    try {
      const params: any = {};

      if (selectedExamId && newExamDate) {
        params.examDateChange = {
          examId: selectedExamId,
          newDate: newExamDate,
        };
      }

      if (hoursChange !== 0) {
        params.hoursChange = hoursChange;
      }

      if (Object.keys(params).length === 0) {
        setError('Please make at least one change to simulate');
        setIsSimulating(false);
        return;
      }

      const res = await fetch(`http://localhost:3000/api/study-plans/${studyPlanId}/simulate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        throw new Error('Failed to run simulation');
      }

      const data = await res.json();
      setSimulation(data.simulation);
    } catch (err: any) {
      setError(err.message || 'Failed to run simulation');
      setSimulation(null);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleReset = () => {
    setSelectedExamId('');
    setNewExamDate('');
    setHoursChange(0);
    setSimulation(null);
    setError(null);
  };

  const projectedRiskScore = currentRiskScore + (simulation?.projectedRiskChange || 0);
  const newWeeklyHours = currentWeeklyHours + hoursChange;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          maxWidth: '700px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-bold)',
            marginBottom: 'var(--space-2)',
          }}
        >
          What-If Simulation
        </h2>
        <p
          style={{
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Adjust exam dates or study hours to see how it affects your risk level and study plan.
        </p>

        {error && (
          <Alert variant="error" title="Error" style={{ marginBottom: 'var(--space-4)' }}>
            {error}
          </Alert>
        )}

        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {/* Current State */}
          <div
            style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <h3
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-semibold)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Current State
            </h3>
            <div style={{ display: 'grid', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Risk Score:</span>
                <span style={{ fontWeight: 'var(--font-semibold)' }}>
                  {currentRiskScore.toFixed(1)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Weekly Hours:</span>
                <span style={{ fontWeight: 'var(--font-semibold)' }}>
                  {currentWeeklyHours} hours/week
                </span>
              </div>
            </div>
          </div>

          {/* Simulation Controls */}
          <div>
            <h3
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-semibold)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Adjustments
            </h3>

            {/* Exam Date Change */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Change Exam Date
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <option value="">Select Exam</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.examType.name} ({new Date(exam.scheduledDate).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newExamDate}
                  onChange={(e) => setNewExamDate(e.target.value)}
                  disabled={!selectedExamId}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)',
                  }}
                />
              </div>
            </div>

            {/* Hours Change */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Adjust Weekly Hours ({hoursChange > 0 ? '+' : ''}
                {hoursChange} hours)
              </label>
              <input
                type="range"
                min="-10"
                max="10"
                step="1"
                value={hoursChange}
                onChange={(e) => setHoursChange(parseInt(e.target.value))}
                style={{
                  width: '100%',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  marginTop: 'var(--space-1)',
                }}
              >
                <span>-10 hours</span>
                <span>0</span>
                <span>+10 hours</span>
              </div>
              {hoursChange !== 0 && (
                <div
                  style={{
                    marginTop: 'var(--space-2)',
                    padding: 'var(--space-2)',
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  New weekly hours: <strong>{newWeeklyHours} hours/week</strong>
                </div>
              )}
            </div>
          </div>

          {/* Simulation Results */}
          {simulation && (
            <div
              style={{
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-primary)',
              }}
            >
              <h3
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                Projected Impact
              </h3>

              {/* Risk Score Change */}
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  <span style={{ fontSize: 'var(--text-sm)' }}>Risk Score Change:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                      {currentRiskScore.toFixed(1)}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                    <span
                      style={{
                        fontSize: 'var(--text-lg)',
                        fontWeight: 'var(--font-bold)',
                        color:
                          simulation.projectedRiskChange < 0
                            ? 'var(--color-success)'
                            : simulation.projectedRiskChange > 0
                            ? 'var(--color-error)'
                            : 'inherit',
                      }}
                    >
                      {projectedRiskScore.toFixed(1)}
                    </span>
                    <Badge
                      variant={
                        simulation.projectedRiskChange < 0
                          ? 'success'
                          : simulation.projectedRiskChange > 0
                          ? 'error'
                          : 'default'
                      }
                    >
                      {simulation.projectedRiskChange > 0 ? '+' : ''}
                      {simulation.projectedRiskChange.toFixed(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {simulation.recommendations.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-semibold)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    Recommendations:
                  </div>
                  <ul
                    style={{
                      listStyle: 'disc',
                      paddingLeft: 'var(--space-4)',
                      fontSize: 'var(--text-sm)',
                      display: 'grid',
                      gap: 'var(--space-1)',
                    }}
                  >
                    {simulation.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              justifyContent: 'space-between',
            }}
          >
            <Button variant="secondary" onClick={handleReset} disabled={isSimulating}>
              Reset
            </Button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="secondary" onClick={onClose} disabled={isSimulating}>
                Close
              </Button>
              <Button variant="primary" onClick={handleSimulate} disabled={isSimulating}>
                {isSimulating ? 'Simulating...' : 'Run Simulation'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
