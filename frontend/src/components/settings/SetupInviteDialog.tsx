import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import styled, { keyframes } from 'styled-components';
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

const Content = styled(Dialog.Content)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 61;
  width: min(440px, calc(100vw - 32px));
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.float};
  padding: 22px 22px 18px;
  animation: ${contentShow} 160ms ease-out;
  outline: none;
`;

const Title = styled(Dialog.Title)`
  margin: 0 0 8px;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.25rem;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.maroon};
`;

const Lead = styled(Dialog.Description)`
  margin: 0 0 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.95rem;
  line-height: 1.5;
`;

const Warning = styled.p`
  margin: 0 0 12px;
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.dangerTint};
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.88rem;
  line-height: 1.45;
`;

const CodeBox = styled.div`
  margin: 0 0 14px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.colors.cream};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.05rem;
  letter-spacing: 0.03em;
  color: ${({ theme }) => theme.colors.textPrimary};
  word-break: break-all;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
`;

const FooterActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
`;

const Tip = styled.p`
  margin: 0 0 8px;
  font-size: 0.82rem;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.textMuted};
`;

function setupUrl(username: string) {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://chartshop.app';
  return `${origin}/setup?username=${encodeURIComponent(username)}`;
}

function buildShareText(username: string, setupCode: string) {
  return [
    `ChartShop invite for @${username}`,
    'Set your PIN with this one-time setup code:',
    setupCode,
    '',
    `Open: ${setupUrl(username)}`,
    'Enter your username, this code, and choose a 4-digit PIN.',
  ].join('\n');
}

function openWhatsAppShare(text: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

type SetupInviteDialogProps = {
  open: boolean;
  username: string;
  setupCode: string;
  onOpenChange: (open: boolean) => void;
};

export function SetupInviteDialog({
  open,
  username,
  setupCode,
  onOpenChange,
}: SetupInviteDialogProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(setupCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function shareToWhatsApp() {
    const text = buildShareText(username, setupCode);
    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share({
          title: `ChartShop invite for @${username}`,
          text,
        });
        setShared(true);
        window.setTimeout(() => setShared(false), 2500);
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
    }

    openWhatsAppShare(text);
    setShared(true);
    window.setTimeout(() => setShared(false), 2500);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Overlay />
        <Content onOpenAutoFocus={(e) => e.preventDefault()}>
          <Title>Share this setup code once</Title>
          <Lead>
            Send it to <strong>@{username}</strong>. They open /setup, enter
            username + code, and choose a PIN.
          </Lead>
          <Warning>
            Shown once. If it gets lost, use New setup code on their team row.
          </Warning>
          <CodeBox>{setupCode}</CodeBox>
          <Actions>
            <Button
              type="button"
              variant="light"
              size="sm"
              onClick={() => void copyCode()}
            >
              {copied ? 'Copied' : 'Copy code'}
            </Button>
            <Button
              type="button"
              variant="light"
              size="sm"
              onClick={() => void shareToWhatsApp()}
            >
              {shared ? 'Opened share' : 'Share to WhatsApp'}
            </Button>
          </Actions>
          <Tip>
            Tip: in WhatsApp, pick their chat (or Message yourself first, then
            forward). ChartShop never sends the code for you — this only opens
            a share on your device.
          </Tip>
          <FooterActions>
            <Button
              type="button"
              variant="filled"
              onClick={() => onOpenChange(false)}
            >
              I&apos;ve shared it
            </Button>
          </FooterActions>
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
