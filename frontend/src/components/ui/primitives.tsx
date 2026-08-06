import styled, { css } from 'styled-components';
import type { ReactNode, TableHTMLAttributes } from 'react';

export { Button } from './Button';
export type { ButtonProps } from './Button';

export const Page = styled.div`
  position: relative;
  width: 100%;
  max-width: min(1100px, 100%);
  margin: 0 auto;
  min-width: 0;
`;

export const PageTitle = styled.h1`
  margin: 0 0 ${({ theme }) => theme.space[2]};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: clamp(1.35rem, 5vw, 2.15rem);
  letter-spacing: -0.035em;
  color: ${({ theme }) => theme.colors.maroon};
  overflow-wrap: anywhere;
`;

export const PageLead = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[4]};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.55;
  max-width: 40rem;
  font-size: 0.95rem;

  @media (min-width: 720px) {
    margin-bottom: ${({ theme }) => theme.space[5]};
    font-size: 1rem;
  }
`;

export const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[4]};
  overflow: hidden;
  min-width: 0;
  max-width: 100%;

  @media (min-width: 720px) {
    padding: ${({ theme }) => theme.space[5]};
  }
`;

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]};
  align-items: end;
  min-width: 0;
  max-width: 100%;
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
  flex: 1 1 140px;
  min-width: 0;
  max-width: 100%;
`;

const controlBase = `
  border: 1px solid;
  font: inherit;
  color: inherit;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
`;

export const Input = styled.input`
  ${controlBase}
  width: 100%;
  max-width: 100%;
  border-color: ${({ theme }) => theme.colors.border};
  border-radius: 0;
  padding: 11px 13px;
  background: ${({ theme }) => theme.colors.cream};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.borderStrong};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryTint};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

export const Select = styled.select`
  ${controlBase}
  width: 100%;
  max-width: 100%;
  border-color: ${({ theme }) => theme.colors.border};
  border-radius: 0;
  padding: 11px 13px;
  background: ${({ theme }) => theme.colors.cream};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.borderStrong};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryTint};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

export const TextArea = styled.textarea`
  ${controlBase}
  width: 100%;
  max-width: 100%;
  border-color: ${({ theme }) => theme.colors.border};
  border-radius: 0;
  padding: 11px 13px;
  background: ${({ theme }) => theme.colors.cream};
  min-height: 88px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.borderStrong};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryTint};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

export const TableWrap = styled.div<{ $compact?: boolean }>`
  width: 100%;
  max-width: 100%;
  overflow-x: ${({ $compact }) => ($compact ? 'hidden' : 'auto')};
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.colors.borderStrong} transparent;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.borderStrong};
    border-radius: 0;
  }
`;

const TableEl = styled.table<{ $compact?: boolean }>`
  width: 100%;
  min-width: ${({ $compact }) => ($compact ? '0' : '480px')};
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.88rem;
  table-layout: ${({ $compact }) => ($compact ? 'fixed' : 'auto')};

  @media (min-width: 720px) {
    min-width: 0;
    font-size: 0.92rem;
  }

  th,
  td {
    text-align: left;
    padding: 10px 8px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    vertical-align: middle;
    background: ${({ theme }) => theme.colors.surface};
  }

  @media (min-width: 720px) {
    th,
    td {
      padding: 12px 10px;
    }
  }

  th {
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  td {
    white-space: nowrap;
  }

  td:has(button),
  td:has(input) {
    white-space: normal;
  }

  tbody tr:hover td {
    background: ${({ theme }) => theme.colors.peachSoft};
  }

  ${({ $compact, theme }) =>
    $compact
      ? css`
          /* Compact 2–3 col tables: fit the viewport, wrap the label column */
          th:first-child,
          td:first-child {
            width: 52%;
            overflow-wrap: anywhere;
            white-space: normal;
          }

          th:not(:first-child),
          td:not(:first-child) {
            width: auto;
            white-space: nowrap;
          }
        `
      : css`
          /* Keep the first column readable while scrolling on small screens */
          @media (max-width: 719px) {
            th:first-child,
            td:first-child {
              position: sticky;
              left: 0;
              z-index: 2;
              width: 8rem;
              min-width: 8rem;
              max-width: 8rem;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              background-clip: padding-box;
              /* Hard edge + soft fade so scrolling cells cannot peek through */
              box-shadow:
                1px 0 0 0 ${theme.colors.border},
                8px 0 10px -8px rgba(26, 10, 10, 0.16);
            }

            thead th:first-child {
              z-index: 3;
            }

            tbody tr:hover td:first-child {
              background: ${theme.colors.peachSoft};
            }
          }
        `}
`;

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children?: ReactNode;
  /** Fit narrow viewports without sideways scroll (2–3 column tables). */
  compact?: boolean;
};

export function Table({
  children,
  style,
  className,
  compact = false,
  ...rest
}: TableProps) {
  return (
    <TableWrap style={style} className={className} $compact={compact}>
      <TableEl {...rest} $compact={compact}>
        {children}
      </TableEl>
    </TableWrap>
  );
}

export const Badge = styled.span<{ $tone?: 'success' | 'warning' | 'danger' | 'info' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 0;
  font-size: 0.72rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  background: ${({ theme, $tone }) => {
    if ($tone === 'success') return theme.colors.successTint;
    if ($tone === 'warning') return theme.colors.warningTint;
    if ($tone === 'danger') return theme.colors.dangerTint;
    if ($tone === 'info') return theme.colors.infoTint;
    return theme.colors.primaryTint;
  }};
  color: ${({ theme, $tone }) => {
    if ($tone === 'success') return theme.colors.success;
    if ($tone === 'warning') return theme.colors.warning;
    if ($tone === 'danger') return theme.colors.danger;
    if ($tone === 'info') return theme.colors.info;
    return theme.colors.maroon;
  }};
`;

export const ErrorBanner = styled.div`
  background: ${({ theme }) => theme.colors.dangerTint};
  color: ${({ theme }) => theme.colors.danger};
  border-radius: 0;
  padding: 12px 14px;
  margin-bottom: ${({ theme }) => theme.space[4]};
  font-size: 0.9rem;
`;

export const SuccessBanner = styled.div`
  background: ${({ theme }) => theme.colors.successTint};
  color: ${({ theme }) => theme.colors.success};
  border-radius: 0;
  padding: 12px 14px;
  margin-bottom: ${({ theme }) => theme.space[4]};
  font-size: 0.9rem;
`;

export const Tabs = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin-bottom: ${({ theme }) => theme.space[4]};
  padding: 6px;
  border-radius: 0;
  background: ${({ theme }) => theme.colors.peachSoft};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  width: 100%;
  max-width: 100%;
  min-width: 0;

  &::-webkit-scrollbar {
    display: none;
  }
`;

export const Tab = styled.button<{ $active?: boolean }>`
  border: none;
  flex: 0 0 auto;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.surface : 'transparent'};
  color: ${({ theme }) => theme.colors.maroon};
  border-radius: 0;
  padding: 9px 14px;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: 0.84rem;
  font-family: inherit;
  cursor: pointer;
  box-shadow: ${({ theme, $active }) => ($active ? theme.shadows.card : 'none')};
  transition: background 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.colors.surface : 'rgba(255, 255, 255, 0.45)'};
  }
`;

export const Muted = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[5]};

  @media (min-width: 640px) {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: ${({ theme }) => theme.space[4]};
  }
`;

export const KpiCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: ${({ theme }) => theme.space[4]};
`;

export const KpiLabel = styled.div`
  font-size: 0.72rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 8px;
`;

export const KpiValue = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.45rem, 2.5vw, 1.85rem);
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.maroon};
  line-height: 1.1;
`;
