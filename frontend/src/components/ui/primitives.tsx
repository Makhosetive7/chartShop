import styled from 'styled-components';

export const Page = styled.div`
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
`;

export const PageTitle = styled.h1`
  margin: 0 0 ${({ theme }) => theme.space[2]};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: clamp(1.6rem, 3vw, 2rem);
`;

export const PageLead = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[5]};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: ${({ theme }) => theme.space[5]};
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]};
  align-items: end;
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.textPrimary};
  flex: 1;
  min-width: 140px;
`;

export const Input = styled.input`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.surface};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.borderStrong};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryTint};
  }
`;

export const Select = styled.select`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.surface};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
`;

export const TextArea = styled.textarea`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.surface};
  min-height: 80px;
  font: inherit;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
`;

export const Button = styled.button<{ $variant?: 'primary' | 'ghost' | 'danger' }>`
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px 14px;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  cursor: pointer;
  white-space: nowrap;

  background: ${({ theme, $variant }) => {
    if ($variant === 'ghost') return theme.colors.surface;
    if ($variant === 'danger') return theme.colors.danger;
    return theme.colors.primary;
  }};
  color: ${({ theme, $variant }) =>
    $variant === 'ghost' ? theme.colors.textPrimary : theme.colors.surface};
  border: 1px solid
    ${({ theme, $variant }) =>
      $variant === 'ghost' ? theme.colors.border : 'transparent'};

  &:hover:not(:disabled) {
    background: ${({ theme, $variant }) => {
      if ($variant === 'ghost') return theme.colors.background;
      if ($variant === 'danger') return theme.colors.danger;
      return theme.colors.primaryLight;
    }};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;

  th,
  td {
    text-align: left;
    padding: 10px 8px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  th {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    font-size: 0.8rem;
  }
`;

export const Badge = styled.span<{ $tone?: 'success' | 'warning' | 'danger' | 'info' }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  background: ${({ theme, $tone }) => {
    if ($tone === 'success') return theme.colors.successTint;
    if ($tone === 'warning') return theme.colors.warningTint;
    if ($tone === 'danger') return theme.colors.dangerTint;
    return theme.colors.infoTint;
  }};
  color: ${({ theme, $tone }) => {
    if ($tone === 'success') return theme.colors.success;
    if ($tone === 'warning') return theme.colors.warning;
    if ($tone === 'danger') return theme.colors.danger;
    return theme.colors.info;
  }};
`;

export const ErrorBanner = styled.div`
  background: ${({ theme }) => theme.colors.dangerTint};
  color: ${({ theme }) => theme.colors.danger};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px 12px;
  margin-bottom: ${({ theme }) => theme.space[4]};
  font-size: 0.9rem;
`;

export const SuccessBanner = styled.div`
  background: ${({ theme }) => theme.colors.successTint};
  color: ${({ theme }) => theme.colors.success};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px 12px;
  margin-bottom: ${({ theme }) => theme.space[4]};
  font-size: 0.9rem;
`;

export const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

export const Tab = styled.button<{ $active?: boolean }>`
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primaryTint : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primaryDark : theme.colors.textSecondary};
  border-radius: 999px;
  padding: 8px 14px;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
`;

export const Muted = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
`;
