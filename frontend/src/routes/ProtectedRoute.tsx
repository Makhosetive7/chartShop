import { Navigate, Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '@/auth';

const Boot = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.95rem;
`;

export function ProtectedRoute() {
  const { isAuthenticated, bootstrapping } = useAuth();

  if (bootstrapping) {
    return <Boot>Opening your shop…</Boot>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
