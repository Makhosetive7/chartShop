import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import styled from 'styled-components';
import { ChevronDown, Users } from 'lucide-react';
import {
  addTeamMember,
  fetchTeamMembers,
  regenerateSetupCode,
  removeTeamMember,
  updateMemberRole,
  type TeamMember,
} from '@/api/team';
import { useAuth } from '@/auth';
import {
  Card,
  Row,
  Field,
  Input,
  Button,
  Badge,
} from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SetupInviteDialog } from '@/components/settings/SetupInviteDialog';
import { toastError, toastSuccess } from '@/lib/toast';
import { sanitizeUsernameInput, validateUsername } from '@/utils/username';

const SectionHead = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const IconBadge = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 0;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.peachSoft};
  color: ${({ theme }) => theme.colors.maroon};
`;

const SectionCopy = styled.div`
  min-width: 0;

  h2 {
    margin: 0 0 4px;
    font-size: 1.15rem;
    color: ${({ theme }) => theme.colors.maroon};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

const MemberList = styled.ul`
  list-style: none;
  margin: 0 0 ${({ theme }) => theme.space[5]};
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MemberRow = styled.li<{ $pending?: boolean; $you?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid
    ${({ theme, $pending }) =>
      $pending ? theme.colors.warning : theme.colors.border};
  background: ${({ theme, $pending, $you }) =>
    $pending
      ? theme.colors.warningTint
      : $you
        ? theme.colors.primaryTint
        : theme.colors.cream};

  @media (min-width: 640px) {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
  }
`;

const MemberMeta = styled.div`
  min-width: 0;
  flex: 1 1 auto;

  strong {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 0.95rem;
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  span.handle {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.85rem;
  }
`;

const PendingNote = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.warning};
  font-size: 0.8rem;
  line-height: 1.4;
`;

const MemberActions = styled.div<{ $hasPrimary?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $hasPrimary }) =>
    $hasPrimary ? 'minmax(0, 1fr) auto' : '1fr'};
  gap: 8px;
  width: 100%;
  align-items: stretch;

  @media (min-width: 640px) {
    width: auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
  }
`;

const ActionPrimary = styled.div`
  min-width: 0;

  > button {
    width: 100%;
  }

  @media (min-width: 640px) {
    width: auto;

    > button {
      width: auto;
    }
  }
`;

const ModeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: ${({ theme }) => theme.space[3]};

  @media (min-width: 520px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const ModeChip = styled.button<{ $active?: boolean }>`
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.maroon : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primaryTint : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.maroon : theme.colors.textSecondary};
  padding: 10px 12px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: ${({ theme, $active }) =>
    $active ? theme.fontWeights.semibold : theme.fontWeights.regular};
  cursor: pointer;
  text-align: left;
  width: 100%;

  &:hover {
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
`;

const ManageTrigger = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.maroon};
  padding: 0 12px;
  min-height: 40px;
  width: 100%;
  font: inherit;
  font-size: 0.85rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;

  &[data-state='open'] {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.cream};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (min-width: 640px) {
    width: auto;
  }
`;

const MenuContent = styled.div`
  z-index: 70;
  min-width: 180px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.float};
  padding: 6px;
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  padding: 10px 12px;
  font: inherit;
  font-size: 0.9rem;
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.danger : theme.colors.textPrimary};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: ${({ theme, $danger }) =>
      $danger ? theme.colors.dangerTint : theme.colors.cream};
    outline: none;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const InviteBlock = styled.div`
  padding-top: ${({ theme }) => theme.space[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const InviteTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 1rem;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.maroon};
  letter-spacing: -0.02em;
`;

const InviteLead = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.88rem;
  line-height: 1.45;
`;

const FieldHint = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.regular};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.8rem;
`;

const FormActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: ${({ theme }) => theme.space[3]};

  > button {
    width: 100%;

    @media (min-width: 520px) {
      width: auto;
    }
  }
`;

const EmptyNote = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[5]};
  padding: 14px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.cream};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
  line-height: 1.45;
`;

const Muted = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
  line-height: 1.45;
`;

function sortMembers(members: TeamMember[], selfId?: string | null) {
  return [...members].sort((a, b) => {
    const aYou = a.id === selfId ? 0 : 1;
    const bYou = b.id === selfId ? 0 : 1;
    if (aYou !== bYou) return aYou - bYou;
    const aPend = a.mustSetPin ? 0 : 1;
    const bPend = b.mustSetPin ? 0 : 1;
    if (aPend !== bPend) return aPend - bPend;
    return (a.displayName || a.username).localeCompare(
      b.displayName || b.username,
    );
  });
}

export function TeamSettingsCard() {
  const { user, isAdmin, isDemo } = useAuth();
  const qc = useQueryClient();
  const [inviteMode, setInviteMode] = useState<'setup' | 'pin'>('setup');
  const [form, setForm] = useState({
    displayName: '',
    username: '',
    pin: '',
  });
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [setupInvite, setSetupInvite] = useState<{
    username: string;
    setupCode: string;
  } | null>(null);

  const teamQ = useQuery({
    queryKey: ['team'],
    queryFn: fetchTeamMembers,
    enabled: !isDemo,
  });

  const addMut = useMutation({
    mutationFn: () => {
      const pin = inviteMode === 'pin' ? form.pin.trim() : '';
      return addTeamMember({
        displayName: form.displayName.trim(),
        username: form.username.trim().toLowerCase(),
        ...(pin ? { pin } : {}),
        role: 'member',
      });
    },
    onSuccess: (result) => {
      if (!result.success) {
        toastError(result.error || 'Could not add member');
        return;
      }
      const username = form.username.trim().toLowerCase();
      setForm({ displayName: '', username: '', pin: '' });
      setInviteMode('setup');
      void qc.invalidateQueries({ queryKey: ['team'] });
      if (result.setupCode) {
        setSetupInvite({ username, setupCode: result.setupCode });
        toastSuccess('Invite created — share the setup code now.');
      } else {
        toastSuccess('Team member added.');
      }
    },
    onError: () => toastError('Could not add member'),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => removeTeamMember(userId),
    onSuccess: (result) => {
      if (!result.success) {
        toastError(result.error || 'Could not remove member');
        return;
      }
      toastSuccess('Member removed.');
      setRemoveId(null);
      void qc.invalidateQueries({ queryKey: ['team'] });
    },
    onError: () => toastError('Could not remove member'),
  });

  const roleMut = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: 'admin' | 'member';
    }) => updateMemberRole(userId, role),
    onSuccess: (result) => {
      if (!result.success) {
        toastError(result.error || 'Could not update role');
        return;
      }
      toastSuccess(
        result.member?.role === 'admin' ? 'Promoted to admin.' : 'Set to member.',
      );
      void qc.invalidateQueries({ queryKey: ['team'] });
    },
    onError: () => toastError('Could not update role'),
  });

  const regenMut = useMutation({
    mutationFn: (userId: string) => regenerateSetupCode(userId),
    onSuccess: (result) => {
      if (!result.success || !result.setupCode) {
        toastError(result.error || 'Could not regenerate setup code');
        return;
      }
      setSetupInvite({
        username: result.member?.username || 'member',
        setupCode: result.setupCode,
      });
      toastSuccess('New setup code ready — share it now.');
      void qc.invalidateQueries({ queryKey: ['team'] });
    },
    onError: () => toastError('Could not regenerate setup code'),
  });

  if (isDemo) return null;

  function onAdd(event: FormEvent) {
    event.preventDefault();
    const validation = validateUsername(form.username);
    if (!validation.valid) {
      toastError(validation.message);
      return;
    }
    if (!form.displayName.trim()) {
      toastError('Display name is required.');
      return;
    }
    if (inviteMode === 'pin') {
      if (!/^\d{4}$/.test(form.pin.trim())) {
        toastError('PIN must be exactly 4 digits.');
        return;
      }
    }
    addMut.mutate();
  }

  const members = sortMembers(teamQ.data || [], user?.id);
  const pendingCount = members.filter((m) => m.mustSetPin).length;
  const removeTarget = members.find((m) => m.id === removeId);

  return (
    <Card>
      <SectionHead>
        <IconBadge>
          <Users size={18} />
        </IconBadge>
        <SectionCopy>
          <h2>Team</h2>
          <p>
            Everyone on this shop shares sales and stock. Admins manage people
            and settings.
            {members.length > 0
              ? ` ${members.length} people${
                  pendingCount ? ` · ${pendingCount} waiting to set a PIN` : ''
                }.`
              : null}
          </p>
        </SectionCopy>
      </SectionHead>

      {teamQ.isLoading ? (
        <EmptyNote>Loading team…</EmptyNote>
      ) : members.length === 0 ? (
        <EmptyNote>No team members yet.</EmptyNote>
      ) : (
        <MemberList>
          {members.map((member) => {
            const isYou = member.id === user?.id;
            const pending = Boolean(member.mustSetPin);
            return (
              <MemberRow key={member.id} $pending={pending} $you={isYou}>
                <MemberMeta>
                  <strong>
                    {member.displayName || member.username}
                    <Badge $tone={member.role === 'admin' ? 'info' : undefined}>
                      {member.role === 'admin' ? 'Admin' : 'Member'}
                    </Badge>
                    {pending ? <Badge $tone="warning">Pending setup</Badge> : null}
                    {isYou ? <Badge $tone="success">You</Badge> : null}
                  </strong>
                  <span className="handle">@{member.username}</span>
                  {pending ? (
                    <PendingNote>
                      Hasn&apos;t set a PIN yet — share a setup code so they can
                      join.
                    </PendingNote>
                  ) : null}
                </MemberMeta>
                {isAdmin && !isYou ? (
                  <MemberActions $hasPrimary={pending}>
                    {pending ? (
                      <ActionPrimary>
                        <Button
                          type="button"
                          variant="filled"
                          size="sm"
                          loading={
                            regenMut.isPending &&
                            regenMut.variables === member.id
                          }
                          onClick={() => regenMut.mutate(member.id)}
                        >
                          New setup code
                        </Button>
                      </ActionPrimary>
                    ) : null}
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <ManageTrigger
                          type="button"
                          disabled={
                            (roleMut.isPending &&
                              roleMut.variables?.userId === member.id) ||
                            (regenMut.isPending &&
                              regenMut.variables === member.id)
                          }
                        >
                          Manage
                          <ChevronDown size={16} aria-hidden />
                        </ManageTrigger>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          asChild
                          sideOffset={6}
                          align="end"
                        >
                          <MenuContent>
                            <DropdownMenu.Item asChild>
                              <MenuItem
                                type="button"
                                disabled={
                                  roleMut.isPending &&
                                  roleMut.variables?.userId === member.id
                                }
                                onSelect={() =>
                                  roleMut.mutate({
                                    userId: member.id,
                                    role:
                                      member.role === 'admin'
                                        ? 'member'
                                        : 'admin',
                                  })
                                }
                              >
                                {member.role === 'admin'
                                  ? 'Make member'
                                  : 'Make admin'}
                              </MenuItem>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item asChild>
                              <MenuItem
                                type="button"
                                $danger
                                onSelect={() => setRemoveId(member.id)}
                              >
                                Remove
                              </MenuItem>
                            </DropdownMenu.Item>
                          </MenuContent>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </MemberActions>
                ) : null}
              </MemberRow>
            );
          })}
        </MemberList>
      )}

      {isAdmin ? (
        <InviteBlock>
          <InviteTitle>Invite someone</InviteTitle>
          <InviteLead>
            They get the same till access. Prefer a setup code so they choose
            their own PIN.
          </InviteLead>

          <ModeRow>
            <ModeChip
              type="button"
              $active={inviteMode === 'setup'}
              onClick={() => setInviteMode('setup')}
            >
              They set their own PIN
            </ModeChip>
            <ModeChip
              type="button"
              $active={inviteMode === 'pin'}
              onClick={() => setInviteMode('pin')}
            >
              I set their PIN
            </ModeChip>
          </ModeRow>

          <form onSubmit={onAdd}>
            <Row>
              <Field>
                Display name
                <Input
                  value={form.displayName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, displayName: e.target.value }))
                  }
                  placeholder="Their name"
                  required
                />
              </Field>
              <Field>
                Username
                <FieldHint>Their login on web & chat</FieldHint>
                <Input
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      username: sanitizeUsernameInput(e.target.value),
                    }))
                  }
                  placeholder="Their username"
                  autoComplete="off"
                  required
                />
              </Field>
              {inviteMode === 'pin' ? (
                <Field>
                  PIN
                  <FieldHint>Exactly 4 digits</FieldHint>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    value={form.pin}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pin: e.target.value }))
                    }
                    placeholder="4-digit PIN"
                    required
                  />
                </Field>
              ) : null}
            </Row>
            <FormActions>
              <Button type="submit" loading={addMut.isPending}>
                {addMut.isPending
                  ? 'Inviting…'
                  : inviteMode === 'setup'
                    ? 'Create invite'
                    : 'Add with PIN'}
              </Button>
            </FormActions>
          </form>
        </InviteBlock>
      ) : (
        <Muted>Ask an admin if you need someone else added to this shop.</Muted>
      )}

      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(open) => {
          if (!open) setRemoveId(null);
        }}
        title="Remove team member?"
        description={
          removeTarget
            ? `@${removeTarget.username} will lose access immediately. Past sales and activity stay on the shop.`
            : 'They will lose access immediately. Past sales and activity stay on the shop.'
        }
        confirmLabel="Remove"
        cancelLabel="Keep"
        tone="danger"
        loading={removeMut.isPending}
        onConfirm={() => {
          if (removeId) removeMut.mutate(removeId);
        }}
      />

      <SetupInviteDialog
        open={Boolean(setupInvite)}
        username={setupInvite?.username || ''}
        setupCode={setupInvite?.setupCode || ''}
        onOpenChange={(open) => {
          if (!open) setSetupInvite(null);
        }}
      />
    </Card>
  );
}
