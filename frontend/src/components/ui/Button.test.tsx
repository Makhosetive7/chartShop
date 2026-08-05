import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';
import { theme } from '@/styles/theme';
import { Button } from '@/components/ui/Button';

describe('Button loading', () => {
  it('disables and marks busy while loading', () => {
    render(
      <ThemeProvider theme={theme}>
        <Button loading>Saving…</Button>
      </ThemeProvider>,
    );
    const btn = screen.getByRole('button', { name: /saving/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });
});
