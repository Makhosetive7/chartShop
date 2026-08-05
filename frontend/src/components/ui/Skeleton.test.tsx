import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';
import { theme } from '@/styles/theme';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { DashboardSkeleton } from '@/components/skeletons/PageSkeletons';

function wrap(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('Skeleton loaders', () => {
  it('renders a shimmer block', () => {
    const { container } = wrap(<Skeleton $w="4rem" $h="1rem" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders a table skeleton with expected rows', () => {
    const { container } = wrap(<TableSkeleton columns={3} rows={4} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(container.querySelectorAll('thead th')).toHaveLength(3);
  });

  it('renders dashboard skeleton structure', () => {
    wrap(<DashboardSkeleton />);
    expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument();
  });
});
