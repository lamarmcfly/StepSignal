import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Badge } from './ui';

interface AdvisorNotesPanelProps {
  studentId: string;
}

interface AdvisorNote {
  id: string;
  type: 'general' | 'session' | 'risk_assessment' | 'study_plan' | 'intervention';
  title: string | null;
  content: string;
  isPinned: boolean;
  tags: string[];
  createdAt: string;
  assessment: {
    name: string;
    dateTaken: string;
  } | null;
  studyPlan: {
    title: string;
  } | null;
  alert: {
    title: string;
    severity: string;
  } | null;
}

const NOTE_TYPE_LABELS: Record<string, string> = {
  general: 'General',
  session: 'Session Note',
  risk_assessment: 'Risk Assessment',
  study_plan: 'Study Plan',
  intervention: 'Intervention',
};

const NOTE_TYPE_COLORS: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  general: 'default',
  session: 'info',
  risk_assessment: 'warning',
  study_plan: 'success',
  intervention: 'error',
};

export function AdvisorNotesPanel({ studentId }: AdvisorNotesPanelProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<AdvisorNote | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'general',
    title: '',
    content: '',
    tags: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['advisorNotes', studentId, filter, showPinnedOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('type', filter);
      if (showPinnedOnly) params.append('isPinned', 'true');

      const res = await fetch(
        `http://localhost:3000/api/advisor/students/${studentId}/notes?${params}`,
        {
          credentials: 'include',
        }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch notes');
      }

      const json = await res.json();
      return json.notes as AdvisorNote[];
    },
    enabled: !!studentId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingNote
        ? `http://localhost:3000/api/advisor/notes/${editingNote.id}`
        : `http://localhost:3000/api/advisor/students/${studentId}/notes`;

      const method = editingNote ? 'PATCH' : 'POST';

      const body = {
        type: formData.type,
        title: formData.title || null,
        content: formData.content,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['advisorNotes', studentId] });
        setShowForm(false);
        setEditingNote(null);
        setFormData({ type: 'general', title: '', content: '', tags: '' });
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const res = await fetch(`http://localhost:3000/api/advisor/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['advisorNotes', studentId] });
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleTogglePin = async (note: AdvisorNote) => {
    try {
      const res = await fetch(`http://localhost:3000/api/advisor/notes/${note.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['advisorNotes', studentId] });
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleEdit = (note: AdvisorNote) => {
    setEditingNote(note);
    setFormData({
      type: note.type,
      title: note.title || '',
      content: note.content,
      tags: note.tags.join(', '),
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingNote(null);
    setFormData({ type: 'general', title: '', content: '', tags: '' });
  };

  return (
    <Card title="Advisor Notes" subtitle={data ? `${data.length} notes` : ''}>
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
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="session">Session Notes</option>
            <option value="risk_assessment">Risk Assessment</option>
            <option value="study_plan">Study Plan</option>
            <option value="intervention">Intervention</option>
          </select>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={showPinnedOnly}
              onChange={(e) => setShowPinnedOnly(e.target.checked)}
            />
            Pinned only
          </label>

          <div style={{ marginLeft: 'auto' }}>
            <Button variant="primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Add Note'}
            </Button>
          </div>
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
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <option value="general">General</option>
                  <option value="session">Session Note</option>
                  <option value="risk_assessment">Risk Assessment</option>
                  <option value="study_plan">Study Plan</option>
                  <option value="intervention">Intervention</option>
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
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief title for this note"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
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
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  rows={4}
                  placeholder="Note details..."
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
                  placeholder="e.g., follow-up, urgent, progress"
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
                  {editingNote ? 'Update Note' : 'Save Note'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Notes List */}
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading notes...
          </div>
        ) : !data || data.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No notes found. Add your first note to get started.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {data.map((note) => (
              <div
                key={note.id}
                style={{
                  padding: 'var(--space-4)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: note.isPinned ? '#fffbeb' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Badge variant={NOTE_TYPE_COLORS[note.type]}>
                      {NOTE_TYPE_LABELS[note.type]}
                    </Badge>
                    {note.isPinned && (
                      <span style={{ fontSize: '14px' }} title="Pinned">
                        📌
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {note.title && (
                  <h4
                    style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-semibold)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    {note.title}
                  </h4>
                )}

                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text)',
                    marginBottom: 'var(--space-3)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {note.content}
                </p>

                {/* Related items */}
                {(note.assessment || note.studyPlan || note.alert) && (
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                      marginBottom: 'var(--space-3)',
                    }}
                  >
                    {note.assessment && (
                      <div>
                        Related to assessment: {note.assessment.name}
                      </div>
                    )}
                    {note.studyPlan && (
                      <div>
                        Related to study plan: {note.studyPlan.title}
                      </div>
                    )}
                    {note.alert && (
                      <div>
                        Related to alert: {note.alert.title}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {note.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                    {note.tags.map((tag) => (
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
                    onClick={() => handleTogglePin(note)}
                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)' }}
                  >
                    {note.isPinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleEdit(note)}
                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-2)' }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleDelete(note.id)}
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
