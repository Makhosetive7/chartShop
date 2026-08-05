import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth';
import { ArrowButton } from '@/components/marketing/marketingPrimitives';

type Props = {
  variant?: 'filled' | 'light' | 'ghost';
  children?: string;
};

export function TryDemoButton({
  variant = 'filled',
  children = 'Try demo',
}: Props) {
  const { enterDemo } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      await enterDemo();
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo is unavailable');
      setPending(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 6 }}>
      <ArrowButton
        type="button"
        variant={variant}
        disabled={pending}
        onClick={() => void handleClick()}
      >
        {pending ? 'Opening demo…' : children}
      </ArrowButton>
      {error ? (
        <span style={{ fontSize: '0.8rem', color: '#8B1E3A' }}>{error}</span>
      ) : null}
    </span>
  );
}
