import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Badge } from './ui';

interface StudentReflectionsProps {
  studentId: string;
}

interface Reflection {
  id: string;
  content: string;
  mood: string | null;
  tags: string[];
  voiceMemoPath: string | null;
  createdAt: string;
  assessment: {
    name: string;
    type: string;
    dateTaken: string;
  } | null;
  studyPlan: {
    title: string;
  } | null;
  studyPlanItem: {
    weekNumber: number;
  } | null;
}

const MOOD_EMOJIS: Record<string, string> = {
  great: '😊',
  good: '🙂',
  okay: '😐',
  stressed: '😰',
  overwhelmed: '😫',
  frustrated: '😤',
  confident: '💪',
  tired: '😴',
};

const MOOD_COLORS: Record<string, string> = {
  great: '#10b981',
  good: '#84cc16',
  okay: '#eab308',
  stressed: '#f97316',
  overwhelmed: '#ef4444',
  frustrated: '#dc2626',
  confident: '#3b82f6',
  tired: '#6b7280',
};

export function StudentReflections({ studentId }: StudentReflectionsProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    content: '',
    mood: '',
    tags: '',
  });

  // Fetch reflections
  const { data, isLoading } = useQuery({
    queryKey: ['reflections', studentId],
    queryFn: async () => {
      const res = await fetch(
        `http://localhost:3000/api/advisor/students/${studentId}/reflections?limit=20`,
        {
          credentials: 'include',
        }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch reflections');
      }

      const json = await res.json();
      return json.reflections as Reflection[];
    },
    enabled: !!studentId,
  });

  // Fetch trends
  const { data: trendsData } = useQuery({
    queryKey: ['reflectionTrends', studentId],
    queryFn: async () => {
      const res = await fetch(
        `http://localhost:3000/api/advisor/students/${studentId}/reflections/trends`,
        {
          credentials: 'include',
        }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch reflection trends');
      }

      const json = await res.json();
      return json.trends;
    },
    enabled: !!studentId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingReflection
        ? `http://localhost:3000/api/advisor/reflections/${editingReflection.id}`
        : `http://localhost:3000/api/advisor/students/${studentId}/reflections`;

      const method = editingReflection ? 'PATCH' : 'POST';

      const body = {
        content: formData.content,
        mood: formData.mood || null,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['reflections', studentId] });
        queryClient.invalidateQueries({ queryKey: ['reflectionTrends', studentId] });
        setShowForm(false);
        setEditingReflection(null);
        setFormData({ content: '', mood: '', tags: '' });
      }
    } catch (error) {
      console.error('Failed to save reflection:', error);
    }
  };

  const handleDelete = async (reflectionId: string) => {
    if (!confirm('Are you sure you want to delete this reflection?')) return;

    try {
      const res = await fetch(`http://localhost:3000/api/advisor/reflections/${reflectionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['reflections', studentId] });
        queryClient.invalidateQueries({ queryKey: ['reflectionTrends', studentId] });
      }
    } catch (error) {
      console.error('Failed to delete reflection:', error);
    }
  };

  const handleEdit = (reflection: Reflection) => {
    setEditingReflection(reflection);
    setFormData({
      content: reflection.content,
      mood: reflection.mood || '',
      tags: reflection.tags.join(', '),
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingReflection(null);
    setFormData({ content: '', mood: '', tags: '' });
  };

  return (
    <Card
      title="Student Reflections"
      subtitle={data ? `${data.length} reflections` : ''}
    >
      <div>
        {/* Trends Summary */}
        {trendsData && trendsData.totalReflections > 0 && (
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <h4
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-semibold)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Reflection Insights
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  Total Reflections
                </div>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>
                  {trendsData.totalReflections}
                </div>
              </div>
              {trendsData.recentMoods.length > 0 && trendsData.recentMoods[0].mood && (
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Recent Mood
                  </div>
                  <div style={{ fontSize: 'var(--text-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span>{MOOD_EMOJIS[trendsData.recentMoods[0].mood] || '😐'}</span>
                    <span style={{ textTransform: 'capitalize' }}>{trendsData.recentMoods[0].mood}</span>
                  </div>
                </div>
              )}
              {trendsData.topTags.length > 0 && (
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Top Tags
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {trendsData.topTags.slice(0, 3).map((t: any) => `#${t.tag}`).join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Reflection Button */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Button variant="primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Reflection'}
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-medium)',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  How are you feeling?
                </label>
                <select
                  value={formData.mood}
                  onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <option value="">Select mood (optional)</option>
                  <option value="great">😊 Great</option>
                  <option value="good">🙂 Good</option>
                  <option value="okay">😐 Okay</option>
                  <option value="confident">💪 Confident</option>
                  <option value="stressed">😰 Stressed</option>
                  <option value="overwhelmed">😫 Overwhelmed</option>
                  <option value="frustrated">😤 Frustrated</option>
                  <option value="tired">😴 Tired</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-medium)',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  Reflection
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  rows={5}
                  placeholder="What did you learn today? What challenges did you face? What are your goals?"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-medium)',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., study-session, practice-exam, breakthrough"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button type="submit" variant="primary">
                  {editingReflection ? 'Update Reflection' : 'Save Reflection'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Reflections List */}
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading reflections...
          </div>
        ) : !data || data.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No reflections yet. Add your first reflection to track your learning journey.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {data.map((reflection) => (
              <div
                key={reflection.id}
                style={{
                  padding: 'var(--space-4)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: reflection.mood
                    ? `4px solid ${MOOD_COLORS[reflection.mood]}`
                    : '4px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {reflection.mood && (
                      <span style={{ fontSize: '20px' }} title={reflection.mood}>
                        {MOOD_EMOJIS[reflection.mood]}
                      </span>
                    )}
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                      {new Date(reflection.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text)',
                    marginBottom: 'var(--space-3)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {reflection.content}
                </p>

                {/* Related items */}
                {(reflection.assessment || reflection.studyPlan) && (
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    {reflection.assessment && (
                      <div>
                        📝 Related to: {reflection.assessment.name}
                      </div>
                    )}
                    {reflection.studyPlan && (
                      <div>
                        📚 Study plan: {reflection.studyPlan.title}
                        {reflection.studyPlanItem && ` (Week ${reflection.studyPlanItem.weekNumber})`}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {reflection.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                    {reflection.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 'var(--text-xs)',
                          padding: 'var(--space-1) var(--space-2)',
                          background: 'var(--color-bg-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button
                    variant="secondary"
                    onClick={() => handleEdit(reflection)}
                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)' }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleDelete(reflection.id)}
                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)' }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
