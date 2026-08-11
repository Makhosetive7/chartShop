import styled from 'styled-components';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeMode } from '@/theme';
import type { ThemePreference } from '@/styles/theme';

const Segment = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  background: ${({ theme }) => theme.colors.peachSoft};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const Option = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 10px;
  border: none;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.surface : 'transparent'};
  color: ${({ theme }) => theme.colors.maroon};
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: ${({ theme, $active }) =>
    $active ? theme.fontWeights.semibold : theme.fontWeights.medium};
  box-shadow: ${({ theme, $active }) => ($active ? theme.shadows.card : 'none')};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemePreferencePicker() {
  const { preference, setPreference } = useThemeMode();

  return (
    <Segment role="radiogroup" aria-label="Color theme">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <Option
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            $active={active}
            onClick={() => setPreference(value)}
          >
            <Icon size={16} strokeWidth={1.85} />
            {label}
          </Option>
        );
      })}
    </Segment>
  );
}
