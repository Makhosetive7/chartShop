import axios from 'axios';
import { api, type User } from './client';

export type TeamMember = User;

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const { data } = await api.get<{ success: boolean; members: TeamMember[] }>(
    '/team',
  );
  return data.members || [];
}

export async function addTeamMember(input: {
  username: string;
  pin?: string;
  displayName: string;
  role?: 'admin' | 'member';
}): Promise<{
  success: boolean;
  member?: TeamMember;
  setupCode?: string | null;
  message?: string;
  error?: string;
  suggestions?: string[];
}> {
  try {
    const { data } = await api.post<{
      success: boolean;
      member: TeamMember;
      setupCode?: string | null;
      message?: string;
    }>('/team', input);
    return {
      success: true,
      member: data.member,
      setupCode: data.setupCode || null,
      message: data.message,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const payload = error.response?.data as
        | { error?: string; suggestions?: string[] }
        | undefined;
      return {
        success: false,
        error: payload?.error || 'Could not add member',
        suggestions: payload?.suggestions,
      };
    }
    throw error;
  }
}

export async function updateMemberRole(
  userId: string,
  role: 'admin' | 'member',
): Promise<{ success: boolean; member?: TeamMember; error?: string }> {
  try {
    const { data } = await api.patch<{
      success: boolean;
      member: TeamMember;
      message?: string;
    }>(`/team/${userId}/role`, { role });
    return { success: true, member: data.member };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { error?: string } | undefined)?.error ||
        'Could not update role';
      return { success: false, error: message };
    }
    throw error;
  }
}

export async function removeTeamMember(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api.delete(`/team/${userId}`);
    return { success: true };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { error?: string } | undefined)?.error ||
        'Could not remove member';
      return { success: false, error: message };
    }
    throw error;
  }
}

export async function regenerateSetupCode(
  userId: string,
): Promise<{
  success: boolean;
  member?: TeamMember;
  setupCode?: string | null;
  message?: string;
  error?: string;
}> {
  try {
    const { data } = await api.post<{
      success: boolean;
      member: TeamMember;
      setupCode?: string | null;
      message?: string;
    }>(`/team/${userId}/setup-code`);
    return {
      success: true,
      member: data.member,
      setupCode: data.setupCode || null,
      message: data.message,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { error?: string } | undefined)?.error ||
        'Could not regenerate setup code';
      return { success: false, error: message };
    }
    throw error;
  }
}
