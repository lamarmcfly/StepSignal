import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Button, FormField, Alert } from '../components/ui';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  role: 'student' | 'advisor' | 'admin';
  institutionId: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: {
      role: 'student',
      institutionId: '00000000-0000-0000-0000-000000000001', // Test institution
    },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setIsLoading(true);

    try {
      const { confirmPassword, ...registerData } = data;

      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(registerData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Registration failed');
        return;
      }

      // Successful registration - redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Register error:', err);
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

        <Card title="Create Account" subtitle="Join your institution's analytics platform">
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {error && (
              <Alert variant="error" title="Registration Failed">
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
              helperText="Must be at least 8 characters"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              })}
            />

            <FormField
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
            />

            <div>
              <label
                htmlFor="role"
                style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  color: 'var(--color-text)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Role
              </label>
              <select
                id="role"
                {...register('role')}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  fontSize: 'var(--text-base)',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                }}
              >
                <option value="student">Student</option>
                <option value="advisor">Advisor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <input type="hidden" {...register('institutionId')} />

            <Button variant="primary" type="submit" isLoading={isLoading} style={{ width: '100%' }}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>

            <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  fontWeight: 'var(--font-medium)',
                }}
              >
                Sign in
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
