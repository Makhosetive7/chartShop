import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { Users } from 'lucide-react';
import {
  addTeamMember,
  fetchTeamMembers,
  removeTeamMember,
  updateMemberRole,
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
import { toastError, toastSuccess } from '@/lib/toast';
import { sanitizeUsernameInput, validateUsername } from '@/utils/username';

const SectionHead = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const IconBadge = styled.div`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 0;
  background: ${({ theme }) => theme.colors.peachSoft};
  color: ${({ theme }) => theme.colors.maroon};
`;

const SectionCopy = styled.div`
  min-width: 0;

  h2 {
    margin: 0 0 4px;
    font-size: 1.05rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.9rem;
    line-height: 1.45;
  }
`;

const MemberList = styled.ul`
  list-style: none;
  margin: 0 0 ${({ theme }) => theme.space[4]};
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const MemberRow = styled.li`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const MemberMeta = styled.div`
  min-width: 0;

  strong {
    display: block;
    font-size: 0.95rem;
  }

  span {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.85rem;
  }
`;

const FormActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: ${({ theme }) => theme.space[3]};
`;

const MemberActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export function TeamSettingsCard() {
  const { user, isAdmin, isDemo } = useAuth();
  const qc = useQueryClient();
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
      const pin = form.pin.trim();
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
      void qc.invalidateQueries({ queryKey: ['team'] });
      if (result.setupCode) {
        setSetupInvite({ username, setupCode: result.setupCode });
        toastSuccess('Member added — copy the setup code now.');
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
      toastSuccess(result.member?.role === 'admin' ? 'Promoted to admin.' : 'Set to member.');
      void qc.invalidateQueries({ queryKey: ['team'] });
    },
    onError: () => toastError('Could not update role'),
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
    const pin = form.pin.trim();
    if (pin && !/^\d{4}$/.test(pin)) {
      toastError('PIN must be exactly 4 digits, or leave blank for a setup code.');
      return;
    }
    addMut.mutate();
  }

  const members = teamQ.data || [];

  return (
    <Card>
      <SectionHead>
        <IconBadge>
          <Users size={18} />
        </IconBadge>
        <SectionCopy>
          <h2>Team</h2>
          <p>
            People who can sign in to this shop on web, Telegram, and WhatsApp.
            Everyone shares the same sales and stock; admins manage the team and
            shop settings. Leave PIN blank to generate a one-time setup code.
          </p>
        </SectionCopy>
      </SectionHead>

      <MemberList>
        {teamQ.isLoading ? (
          <MemberRow>
            <MemberMeta>
              <strong>Loading…</strong>
            </MemberMeta>
          </MemberRow>
        ) : (
          members.map((member) => (
            <MemberRow key={member.id}>
              <MemberMeta>
                <strong>
                  {member.displayName || member.username}{' '}
                  <Badge>
                    {member.role === 'admin' ? 'Admin' : 'Member'}
                  </Badge>
                  {member.id === user?.id ? (
                    <Badge style={{ marginLeft: 6 }}>You</Badge>
                  ) : null}
                </strong>
                <span>@{member.username}</span>
              </MemberMeta>
              {isAdmin && member.id !== user?.id ? (
                <MemberActions>
                  <Button
                    type="button"
                    variant="ghost"
                    loading={roleMut.isPending}
                    onClick={() =>
                      roleMut.mutate({
                        userId: member.id,
                        role: member.role === 'admin' ? 'member' : 'admin',
                      })
                    }
                  >
                    {member.role === 'admin' ? 'Make member' : 'Make admin'}
                  </Button>
                  <Button
                    type="button"
                    $variant="danger"
                    onClick={() => setRemoveId(member.id)}
                  >
                    Remove
                  </Button>
                </MemberActions>
              ) : null}
            </MemberRow>
          ))
        )}
      </MemberList>

      {isAdmin ? (
        <form onSubmit={onAdd}>
          <Row>
            <Field>
              Display name
              <Input
                value={form.displayName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayName: e.target.value }))
                }
                placeholder="Thabo"
                required
              />
            </Field>
            <Field>
              Username
              <Input
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    username: sanitizeUsernameInput(e.target.value),
                  }))
                }
                placeholder="thabo"
                autoComplete="off"
                required
              />
            </Field>
            <Field>
              PIN (optional)
              <Input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={form.pin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pin: e.target.value }))
                }
                placeholder="Leave blank → setup code"
              />
            </Field>
          </Row>
          <FormActions>
            <Button type="submit" loading={addMut.isPending}>
              {addMut.isPending ? 'Adding…' : 'Add member'}
            </Button>
          </FormActions>
        </form>
      ) : (
        <p style={{ margin: 0, opacity: 0.75, fontSize: '0.9rem' }}>
          Ask an admin if you need someone else added to this shop.
        </p>
      )}

      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(open) => {
          if (!open) setRemoveId(null);
        }}
        title="Remove team member?"
        description="They will lose access immediately. Past sales and activity stay on the shop."
        confirmLabel="Remove"
        cancelLabel="Keep"
        tone="danger"
        loading={removeMut.isPending}
        onConfirm={() => {
          if (removeId) removeMut.mutate(removeId);
        }}
      />

      <ConfirmDialog
        open={Boolean(setupInvite)}
        onOpenChange={(open) => {
          if (!open) setSetupInvite(null);
        }}
        title="Share this setup code once"
        description={
          setupInvite
            ? `Give @${setupInvite.username} this one-time code: ${setupInvite.setupCode}. They open /setup, enter username + code, and choose a PIN. It will not be shown again.`
            : ''
        }
        confirmLabel="I've copied it"
        cancelLabel="Close"
        onConfirm={() => setSetupInvite(null)}
      />
    </Card>
  );
}
