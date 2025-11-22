import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Button, FormField, Alert } from '../components/ui';

interface LoginFormData {
  email: string;
  password: string;
  institutionId: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      institutionId: '00000000-0000-0000-0000-000000000001', // Test institution
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Login failed');
        return;
      }

      // Successful login
      navigate('/dashboard');
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-page)',
        padding: 'var(--space-4)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-bold)',
              color: 'var(--color-primary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            StepSignal
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Medical School Analytics
          </p>
        </div>

        <Card title="Sign In" subtitle="Access your student dashboard">
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {error && (
              <Alert variant="error" title="Login Failed">
                {error}
              </Alert>
            )}

            <FormField
              label="Email Address"
              type="email"
              placeholder="student@university.edu"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />

            <FormField
              label="Password"
              type="password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              })}
            />

            <input type="hidden" {...register('institutionId')} />

            <Button variant="primary" type="submit" isLoading={isLoading} style={{ width: '100%' }}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Don't have an account?{' '}
              <Link
                to="/register"
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  fontWeight: 'var(--font-medium)',
                }}
              >
                Create one
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
