import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell, Card, Table, Button, Badge, Alert } from '../components/ui';

interface Student {
  id: string;
  classYear: number;
  hasAccommodations: boolean;
  user: {
    email: string;
    role: string;
  };
  createdAt: string;
}

interface StudentsResponse {
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function StudentsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['students', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) {
        params.append('search', search);
      }

      const res = await fetch(`http://localhost:3000/api/students?${params}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) {
          navigate('/login');
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch students');
      }

      return res.json() as Promise<StudentsResponse>;
    },
  });

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

  if (error) {
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
            Failed to load students. Please try again.
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
            <h1
              style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-bold)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Students
            </h1>
            <p style={{ color: 'var(--color-text-muted)' }}>
              {data?.pagination.total || 0} total students
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/students/new')}>
            Add Student
          </Button>
        </div>

        <Card>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
              }}
            />
          </div>

          <Table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Class Year</th>
                <th>Accommodations</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.students.map((student) => (
                <tr key={student.id}>
                  <td>{student.user.email}</td>
                  <td>{student.classYear}</td>
                  <td>
                    {student.hasAccommodations ? (
                      <Badge variant="info">Yes</Badge>
                    ) : (
                      <Badge variant="default">No</Badge>
                    )}
                  </td>
                  <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {data && data.pagination.pages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                marginTop: 'var(--space-4)',
                paddingTop: 'var(--space-4)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span style={{ padding: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
                Page {page} of {data.pagination.pages}
              </span>
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
