import styled, { keyframes } from 'styled-components';
import type { CSSProperties } from 'react';
import { Table } from './primitives';

const shimmer = keyframes`
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
`;

export const Skeleton = styled.div<{
  $w?: string;
  $h?: string;
  $mt?: string;
  $mb?: string;
  $radius?: string;
}>`
  display: block;
  width: ${({ $w }) => $w ?? '100%'};
  height: ${({ $h }) => $h ?? '0.9rem'};
  margin-top: ${({ $mt }) => $mt ?? '0'};
  margin-bottom: ${({ $mb }) => $mb ?? '0'};
  border-radius: ${({ $radius }) => $radius ?? '0'};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.peachSoft} 0%,
    ${({ theme }) => theme.colors.cream} 40%,
    ${({ theme }) => theme.colors.peachSoft} 80%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.35s ease-in-out infinite;
  flex-shrink: 0;
`;

export const SkeletonStack = styled.div<{ $gap?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap ?? '10px'};
  width: 100%;
  min-width: 0;
`;

export const SkeletonRow = styled.div<{ $gap?: string; $align?: string }>`
  display: flex;
  flex-wrap: wrap;
  align-items: ${({ $align }) => $align ?? 'center'};
  gap: ${({ $gap }) => $gap ?? '10px'};
  width: 100%;
  min-width: 0;
`;

type TableSkeletonProps = {
  columns: number;
  rows?: number;
  widths?: Array<string | undefined>;
  style?: CSSProperties;
  className?: string;
};

export function TableSkeleton({
  columns,
  rows = 6,
  widths,
  style,
  className,
}: TableSkeletonProps) {
  return (
    <Table style={style} className={className} aria-hidden="true">
      <thead>
        <tr>
          {Array.from({ length: columns }, (_, i) => (
            <th key={`h-${i}`}>
              <Skeleton $w={widths?.[i] ?? '4.5rem'} $h="0.65rem" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, r) => (
          <tr key={`r-${r}`}>
            {Array.from({ length: columns }, (_, c) => (
              <td key={`c-${r}-${c}`}>
                <Skeleton
                  $w={
                    widths?.[c] ??
                    (c === 0 ? '8rem' : c === columns - 1 ? '4rem' : '5rem')
                  }
                  $h="0.85rem"
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
