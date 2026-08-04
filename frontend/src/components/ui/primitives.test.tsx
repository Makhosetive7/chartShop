import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/styles/theme';
import { PageTitle } from '@/components/ui/primitives';

describe('UI primitives', () => {
  it('renders a page title', () => {
    render(
      <ThemeProvider theme={theme}>
        <PageTitle>Products</PageTitle>
      </ThemeProvider>,
    );
    expect(screen.getByText('Products')).toBeInTheDocument();
  });

  it('boots query + router wrappers', () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <PageTitle>Sales</PageTitle>
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('Sales')).toBeInTheDocument();
  });
});
