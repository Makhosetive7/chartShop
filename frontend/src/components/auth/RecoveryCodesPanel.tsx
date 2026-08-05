import { useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/ui/Button';
import { ArrowButton } from '@/components/marketing/marketingPrimitives';

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Warning = styled.p`
  margin: 0;
  padding: 12px 14px;
  background: ${({ theme }) => theme.colors.dangerTint};
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.9rem;
  line-height: 1.5;
`;

const Lead = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.92rem;
  line-height: 1.5;
`;

const CodeList = styled.ul`
  margin: 0;
  padding: 12px 14px;
  list-style: none;
  display: grid;
  gap: 8px;
  background: ${({ theme }) => theme.colors.cream};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.95rem;
`;

const CodeItem = styled.li`
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: 0.02em;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`;

const Confirm = styled.label`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 0.88rem;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.textPrimary};
  cursor: pointer;

  input {
    margin-top: 3px;
    flex-shrink: 0;
  }
`;

const Status = styled.p`
  margin: 0;
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

function buildShareText(codes: string[], username?: string | null) {
  const who = username ? ` for @${username}` : '';
  return [
    `ChartShop recovery codes${who}`,
    'Keep private. Each code resets your PIN once.',
    'Anyone with this chat can reset your shop PIN.',
    '',
    ...codes,
    '',
    'Reset: open ChartShop → /recover',
  ].join('\n');
}

function openWhatsAppShare(text: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

type RecoveryCodesPanelProps = {
  codes: string[];
  username?: string | null;
  onContinue?: () => void;
  continueLabel?: string;
  requireAck?: boolean;
};

export function RecoveryCodesPanel({
  codes,
  username,
  onContinue,
  continueLabel = 'I saved my codes — continue',
  requireAck = true,
}: RecoveryCodesPanelProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [acked, setAcked] = useState(!requireAck);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function downloadTxt() {
    const blob = new Blob([buildShareText(codes, username), '\n'], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chartshop-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function shareToWhatsApp() {
    const text = buildShareText(codes, username);
    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share({
          title: 'ChartShop recovery codes',
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
    <Panel>
      <Warning>
        Save these codes now. They are shown once and never again. If you lose
        your PIN and these codes, your shop may be unrecoverable.
      </Warning>
      <Lead>
        Use one code with your username at <strong>/recover</strong> to reset
        your PIN. Each code works only once.
      </Lead>
      <CodeList>
        {codes.map((code) => (
          <CodeItem key={code}>{code}</CodeItem>
        ))}
      </CodeList>
      <Actions>
        <Button
          type="button"
          variant="light"
          size="sm"
          onClick={() => void copyAll()}
        >
          {copied ? 'Copied' : 'Copy all'}
        </Button>
        <Button type="button" variant="light" size="sm" onClick={downloadTxt}>
          Download .txt
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
      <Status>
        Tip: in WhatsApp, choose <strong>You</strong> (Message yourself) so the
        codes stay in your personal notes. Anyone with that chat can reset your
        PIN.
      </Status>
      {onContinue ? (
        <>
          {requireAck ? (
            <Confirm>
              <input
                type="checkbox"
                checked={acked}
                onChange={(e) => setAcked(e.target.checked)}
              />
              <span>
                I saved these codes offline. I understand ChartShop cannot show
                them again.
              </span>
            </Confirm>
          ) : null}
          <Actions>
            <ArrowButton type="button" disabled={!acked} onClick={onContinue}>
              {continueLabel}
            </ArrowButton>
          </Actions>
        </>
      ) : null}
      <Status>
        ChartShop never sends codes to WhatsApp for you — this only opens a
        share on your device.
      </Status>
    </Panel>
  );
}
