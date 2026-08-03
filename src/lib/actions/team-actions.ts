'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendNotification } from '@/lib/actions/interaction-actions';
import type { TeamMemberRole } from '@/lib/types/database';

// ─── Helpers ───────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

async function requireTeamRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  userId: string,
  roles: TeamMemberRole[]
) {
  const { data } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('player_id', userId)
    .maybeSingle();

  if (!data || !roles.includes(data.role as TeamMemberRole)) {
    throw new Error('You do not have permission to perform this action.');
  }
  return data.role as TeamMemberRole;
}

// ─── 1. CREATE TEAM ────────────────────────────────────────────────────

export async function createTeam(data: {
  name: string;
  tag?: string;
  description?: string;
  country?: string;
  logo_url?: string;
  banner_url?: string;
  is_recruiting?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!data.name || data.name.trim().length < 2) {
    throw new Error('Team name must be at least 2 characters.');
  }
  if (data.tag && (data.tag.length < 2 || data.tag.length > 5)) {
    throw new Error('Team tag must be 2–5 characters.');
  }

  // Check user is not already in a team
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('player_id', user.id)
    .maybeSingle();

  if (existing) throw new Error('You are already a member of a team. Leave your current team first.');

  // Generate unique slug
  let baseSlug = toSlug(data.name);
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const { data: conflict } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!conflict) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  // Create team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      name: data.name.trim(),
      slug,
      tag: data.tag?.trim().toUpperCase() || null,
      description: data.description?.trim() || null,
      country: data.country || null,
      logo_url: data.logo_url || null,
      banner_url: data.banner_url || null,
      is_recruiting: data.is_recruiting ?? true,
      captain_id: user.id,
    })
    .select()
    .single();

  if (teamError) throw new Error(teamError.message);

  // Insert captain as member with role 'captain'
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      player_id: user.id,
      role: 'captain',
    });

  if (memberError) {
    // Rollback team creation
    await supabase.from('teams').delete().eq('id', team.id);
    throw new Error('Failed to set up team captain: ' + memberError.message);
  }

  revalidatePath('/teams');
  return team;
}

// ─── 2. UPDATE TEAM ────────────────────────────────────────────────────

export async function updateTeam(
  teamId: string,
  data: {
    name?: string;
    tag?: string;
    description?: string;
    country?: string;
    logo_url?: string;
    banner_url?: string;
    is_recruiting?: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await requireTeamRole(supabase, teamId, user.id, ['captain']);

  if (data.tag && (data.tag.length < 2 || data.tag.length > 5)) {
    throw new Error('Team tag must be 2–5 characters.');
  }

  const update: Record<string, unknown> = {};
  if (data.name        !== undefined) update.name        = data.name.trim();
  if (data.tag         !== undefined) update.tag         = data.tag.trim().toUpperCase() || null;
  if (data.description !== undefined) update.description = data.description.trim() || null;
  if (data.country     !== undefined) update.country     = data.country || null;
  if (data.logo_url    !== undefined) update.logo_url    = data.logo_url || null;
  if (data.banner_url  !== undefined) update.banner_url  = data.banner_url || null;
  if (data.is_recruiting !== undefined) update.is_recruiting = data.is_recruiting;

  const { error } = await supabase
    .from('teams')
    .update(update)
    .eq('id', teamId);

  if (error) throw new Error(error.message);

  revalidatePath('/teams');
  revalidatePath(`/teams/${teamId}`);
}

// ─── 3. DELETE TEAM ────────────────────────────────────────────────────

export async function deleteTeam(teamId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await requireTeamRole(supabase, teamId, user.id, ['captain']);

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) throw new Error(error.message);

  revalidatePath('/teams');
}

// ─── 4. INVITE PLAYER ─────────────────────────────────────────────────

export async function invitePlayer(teamId: string, playerId: string, message?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await requireTeamRole(supabase, teamId, user.id, ['captain', 'officer']);

  if (playerId === user.id) throw new Error('You cannot invite yourself.');

  // Check player is not already in any team
  const { data: alreadyMember } = await supabase
    .from('team_members')
    .select('id')
    .eq('player_id', playerId)
    .maybeSingle();

  if (alreadyMember) throw new Error('This player is already in a team.');

  // Check no pending invite already
  const { data: existingInvite } = await supabase
    .from('team_invitations')
    .select('id')
    .eq('team_id', teamId)
    .eq('player_id', playerId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingInvite) throw new Error('An invitation is already pending for this player.');

  const { error } = await supabase
    .from('team_invitations')
    .insert({
      team_id: teamId,
      player_id: playerId,
      invited_by: user.id,
      type: 'invite',
      status: 'pending',
      message: message?.trim() || null,
    });

  if (error) throw new Error(error.message);

  // Fetch team name for notification
  const { data: team } = await supabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .single();

  await sendNotification({
    playerId,
    title: '📩 Team Invitation!',
    message: `You have been invited to join team "${team?.name}".`,
    type: 'team_invite',
    linkUrl: `/teams/${teamId}`,
    referenceId: `team_invite_${teamId}_${playerId}`,
  });

  revalidatePath(`/teams/${teamId}`);
}

// ─── 5. REQUEST TO JOIN ───────────────────────────────────────────────

export async function requestToJoinTeam(teamId: string, message?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check not already in a team
  const { data: alreadyMember } = await supabase
    .from('team_members')
    .select('id')
    .eq('player_id', user.id)
    .maybeSingle();

  if (alreadyMember) throw new Error('You are already a member of a team.');

  // Check no pending request
  const { data: existingReq } = await supabase
    .from('team_invitations')
    .select('id')
    .eq('team_id', teamId)
    .eq('player_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingReq) throw new Error('You already have a pending request for this team.');

  const { error } = await supabase
    .from('team_invitations')
    .insert({
      team_id: teamId,
      player_id: user.id,
      invited_by: null,
      type: 'request',
      status: 'pending',
      message: message?.trim() || null,
    });

  if (error) throw new Error(error.message);

  // Notify captain
  const { data: team } = await supabase
    .from('teams')
    .select('name, captain_id')
    .eq('id', teamId)
    .single();

  if (team?.captain_id) {
    const { data: requester } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    await sendNotification({
      playerId: team.captain_id,
      title: '📥 New Join Request',
      message: `${requester?.username ?? 'A player'} wants to join "${team.name}".`,
      type: 'team_request',
      linkUrl: `/teams/${teamId}`,
      referenceId: `team_req_${teamId}_${user.id}`,
    });
  }

  revalidatePath(`/teams/${teamId}`);
}

// ─── 6. RESPOND TO INVITATION ─────────────────────────────────────────

export async function respondToInvitation(
  invitationId: string,
  accept: boolean
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: invitation, error: fetchErr } = await supabase
    .from('team_invitations')
    .select('*, team:teams(id, name, slug, captain_id)')
    .eq('id', invitationId)
    .single();

  if (fetchErr || !invitation) throw new Error('Invitation not found.');
  if (invitation.status !== 'pending') throw new Error('This invitation has already been responded to.');
  if (invitation.type === 'invite' && invitation.player_id !== user.id) {
    throw new Error('You cannot respond to this invitation.');
  }
  if (invitation.type === 'request') {
    // Must be captain/officer of the team
    await requireTeamRole(supabase, invitation.team_id, user.id, ['captain', 'officer']);
  }

  const newStatus = accept ? 'accepted' : 'rejected';

  const { error: updateErr } = await supabase
    .from('team_invitations')
    .update({ status: newStatus, responded_at: new Date().toISOString() })
    .eq('id', invitationId);

  if (updateErr) throw new Error(updateErr.message);

  if (accept) {
    const targetPlayerId = invitation.type === 'invite' ? user.id : invitation.player_id;

    // Verify player not already in a team
    const { data: alreadyMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('player_id', targetPlayerId)
      .maybeSingle();

    if (alreadyMember) {
      // Reject silently — player joined another team between request and acceptance
      await supabase
        .from('team_invitations')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', invitationId);
      throw new Error('Player is already a member of another team.');
    }

    // Add as member
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        player_id: targetPlayerId,
        role: 'member',
      });

    if (memberError && memberError.code !== '23505') {
      throw new Error(memberError.message);
    }

    // Notify the invited player if a request was accepted
    const team = invitation.team as any;
    if (invitation.type === 'request') {
      await sendNotification({
        playerId: invitation.player_id,
        title: '🎉 Join Request Accepted!',
        message: `Your request to join "${team?.name}" has been accepted!`,
        type: 'team_accepted',
        linkUrl: `/teams/${team?.slug}`,
        referenceId: `team_accepted_${invitationId}`,
      });
    }
  }

  const team = invitation.team as any;
  revalidatePath(`/teams/${team?.slug}`);
  revalidatePath('/dashboard');
}

// ─── 7. LEAVE TEAM ────────────────────────────────────────────────────

export async function leaveTeam(teamId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Captain cannot leave — must transfer first
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('player_id', user.id)
    .maybeSingle();

  if (!membership) throw new Error('You are not a member of this team.');
  if (membership.role === 'captain') {
    throw new Error('As captain, you must transfer captaincy before leaving.');
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('player_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/teams');
  revalidatePath(`/teams/${teamId}`);
  revalidatePath('/dashboard');
}

// ─── 8. REMOVE MEMBER ─────────────────────────────────────────────────

export async function removeMember(teamId: string, targetPlayerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const callerRole = await requireTeamRole(supabase, teamId, user.id, ['captain', 'officer']);

  // Fetch target member role
  const { data: targetMember } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('player_id', targetPlayerId)
    .maybeSingle();

  if (!targetMember) throw new Error('Player is not a member of this team.');
  if (targetMember.role === 'captain') throw new Error('The captain cannot be removed.');
  if (callerRole === 'officer' && targetMember.role === 'officer') {
    throw new Error('Officers cannot remove other officers.');
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('player_id', targetPlayerId);

  if (error) throw new Error(error.message);

  revalidatePath(`/teams/${teamId}`);
}

// ─── 9. UPDATE MEMBER ROLE ────────────────────────────────────────────

export async function updateMemberRole(
  teamId: string,
  targetPlayerId: string,
  newRole: 'officer' | 'member'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await requireTeamRole(supabase, teamId, user.id, ['captain']);

  const { data: target } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('player_id', targetPlayerId)
    .maybeSingle();

  if (!target) throw new Error('Player is not a member of this team.');
  if (target.role === 'captain') throw new Error('Cannot change captain role this way.');

  const { error } = await supabase
    .from('team_members')
    .update({ role: newRole })
    .eq('team_id', teamId)
    .eq('player_id', targetPlayerId);

  if (error) throw new Error(error.message);

  revalidatePath(`/teams/${teamId}`);
}

// ─── 10. TRANSFER CAPTAINCY ───────────────────────────────────────────

export async function transferCaptain(teamId: string, newCaptainId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await requireTeamRole(supabase, teamId, user.id, ['captain']);
  if (newCaptainId === user.id) throw new Error('You are already the captain.');

  // Verify new captain is in the team
  const { data: newCapMember } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('player_id', newCaptainId)
    .maybeSingle();

  if (!newCapMember) throw new Error('The target player is not a member of this team.');

  // Update old captain to member, new captain to captain
  const { error: demoteErr } = await supabase
    .from('team_members')
    .update({ role: 'member' })
    .eq('team_id', teamId)
    .eq('player_id', user.id);

  if (demoteErr) throw new Error(demoteErr.message);

  const { error: promoteErr } = await supabase
    .from('team_members')
    .update({ role: 'captain' })
    .eq('team_id', teamId)
    .eq('player_id', newCaptainId);

  if (promoteErr) throw new Error(promoteErr.message);

  // Update teams.captain_id
  const { error: teamErr } = await supabase
    .from('teams')
    .update({ captain_id: newCaptainId })
    .eq('id', teamId);

  if (teamErr) throw new Error(teamErr.message);

  revalidatePath(`/teams/${teamId}`);
}

// ─── 11. CANCEL INVITATION ────────────────────────────────────────────

export async function cancelInvitation(invitationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: invitation } = await supabase
    .from('team_invitations')
    .select('team_id, player_id, type, status')
    .eq('id', invitationId)
    .single();

  if (!invitation) throw new Error('Invitation not found.');
  if (invitation.status !== 'pending') throw new Error('This invitation is no longer pending.');

  // Only captain/officer can cancel an invite; player cancels their own request
  if (invitation.type === 'invite') {
    await requireTeamRole(supabase, invitation.team_id, user.id, ['captain', 'officer']);
  } else {
    if (invitation.player_id !== user.id) throw new Error('Permission denied.');
  }

  await supabase
    .from('team_invitations')
    .update({ status: 'cancelled', responded_at: new Date().toISOString() })
    .eq('id', invitationId);

  revalidatePath(`/teams/${invitation.team_id}`);
}
