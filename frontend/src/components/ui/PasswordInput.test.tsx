import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';
import { theme } from '@/styles/theme';
import { PasswordInput } from '@/components/ui/PasswordInput';

function renderInput() {
  return render(
    <ThemeProvider theme={theme}>
      <PasswordInput placeholder="4-digit PIN" aria-label="PIN" />
    </ThemeProvider>,
  );
}

describe('PasswordInput', () => {
  it('starts hidden and toggles visibility', async () => {
    const user = userEvent.setup();
    renderInput();

    const input = screen.getByLabelText('PIN');
    expect(input).toHaveAttribute('type', 'password');

    const show = screen.getByRole('button', { name: /show password/i });
    await user.click(show);
    expect(input).toHaveAttribute('type', 'text');
    expect(show).toHaveAttribute('aria-pressed', 'true');

    const hide = screen.getByRole('button', { name: /hide password/i });
    await user.click(hide);
    expect(input).toHaveAttribute('type', 'password');
  });
});
