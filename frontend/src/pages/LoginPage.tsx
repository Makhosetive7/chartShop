import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth';

const Page = styled.div`
  min-height: calc(100vh - 200px);
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space[5]};
  background:
    radial-gradient(circle at top left, rgba(227, 18, 88, 0.08), transparent 42%),
    radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.08), transparent 38%),
    ${({ theme }) => theme.colors.background};
`;

const Card = styled(motion.form)`
  width: min(420px, 100%);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.soft};
  padding: ${({ theme }) => theme.space[6]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
`;

const Brand = styled.h1`
  margin: 0;
  font-size: 2.25rem;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary};
`;

const Lead = styled.p`
  margin: ${({ theme }) => theme.space[2]} 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: ${({ theme }) => theme.fontWeights.regular};
`;

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  font-size: 0.9rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Input = styled.input`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.borderStrong};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryTint};
  }
`;

const Button = styled.button`
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.surface};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryLight};
  }

  &:active:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryDark};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.danger};
  background: ${({ theme }) => theme.colors.dangerTint};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 8px 10px;
  font-size: 0.9rem;
`;

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(userId.trim(), pin.trim());
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <Page>
      <Card
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div>
          <Brand>ChartShop</Brand>
          <Lead>Sign in with your channel user id and PIN.</Lead>
        </div>
        <Label>
          User ID
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Telegram id or wa:phone"
            autoComplete="username"
            required
          />
        </Label>
        <Label>
          PIN
          <Input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="4-digit PIN"
            autoComplete="current-password"
            required
          />
        </Label>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </Card>
    </Page>
  );
}
