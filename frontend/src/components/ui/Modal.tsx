import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import styled, { keyframes, css } from 'styled-components';
import { Button } from '@/components/ui/Button';

const overlayShow = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const contentShow = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

const Overlay = styled(Dialog.Overlay)`
  position: fixed;
  inset: 0;
  background: rgba(20, 8, 8, 0.48);
  z-index: 60;
  animation: ${overlayShow} 140ms ease-out;
`;

const Content = styled(Dialog.Content)<{ $size: 'sm' | 'md' | 'lg' }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 61;
  display: flex;
  flex-direction: column;
  max-height: min(90vh, 720px);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.float};
  padding: 22px 22px 18px;
  animation: ${contentShow} 160ms ease-out;
  outline: none;

  ${({ $size }) => {
    if ($size === 'lg') {
      return css`
        width: min(720px, calc(100vw - 32px));
      `;
    }
    if ($size === 'md') {
      return css`
        width: min(520px, calc(100vw - 32px));
      `;
    }
    return css`
      width: min(420px, calc(100vw - 32px));
    `;
  }}
`;

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  flex-shrink: 0;
`;

const HeaderText = styled.div`
  min-width: 0;
  flex: 1;
`;

const Title = styled(Dialog.Title)`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.25rem;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.maroon};
`;

const Description = styled(Dialog.Description)`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.95rem;
  line-height: 1.5;
`;

const Body = styled.div`
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  margin-top: 12px;
  padding-right: 2px;
`;

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
  flex-shrink: 0;
`;

export type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
  /** When true, shows a Done button that closes the modal if no custom footer is provided. */
  showDone?: boolean;
  doneLabel?: string;
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  footer,
  showDone = false,
  doneLabel = 'Done',
}: ModalProps) {
  const resolvedFooter =
    footer !== undefined ? (
      footer
    ) : showDone ? (
      <Button type="button" variant="filled" onClick={() => onOpenChange(false)}>
        {doneLabel}
      </Button>
    ) : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Overlay />
        <Content $size={size} onOpenAutoFocus={(e) => e.preventDefault()}>
          <Header>
            <HeaderText>
              <Title>{title}</Title>
              {description ? <Description>{description}</Description> : null}
            </HeaderText>
          </Header>
          <Body>{children}</Body>
          {resolvedFooter ? <Footer>{resolvedFooter}</Footer> : null}
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
