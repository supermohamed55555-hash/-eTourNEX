'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import {
  fetchTeamBySlug, fetchTeamMembers, fetchTeamInvitations, fetchMyTeam,
} from '@/lib/bracket/engine';
import {
  updateTeam, deleteTeam, invitePlayer, requestToJoinTeam,
  respondToInvitation, leaveTeam, removeMember, updateMemberRole,
  transferCaptain, cancelInvitation,
} from '@/lib/actions/team-actions';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Shield, Globe, Users, Trophy, Swords, Crown, Star,
  Settings, UserPlus, LogOut, Trash2, Check, X,
  ChevronDown, Edit2, MoreVertical, UserMinus, ArrowLeft,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import type { TeamMember, TeamInvitation } from '@/lib/types/database';

const ROLE_COLORS: Record<string, string> = {
  captain: 'gold',
  officer: 'admin',
  member:  'player',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  captain: <Crown className="w-3 h-3" />,
  officer: <Star className="w-3 h-3" />,
  member:  <Users className="w-3 h-3" />,
};

function MemberRow({
  member, myRole, myId, teamId, captainId, onRefetch,
}: {
  member: TeamMember;
  myRole: string | null;
  myId: string;
  teamId: string;
  captainId: string;
  onRefetch: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isMe = member.player_id === myId;
  const isCaptain = member.role === 'captain';
  const canManage = (myRole === 'captain' || myRole === 'officer') && !isMe && !isCaptain;
  const canTransfer = myRole === 'captain' && !isMe && !isCaptain;

  async function handle(fn: () => Promise<void>) {
    setActionLoading(true);
    try { await fn(); onRefetch(); } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); setOpen(false); }
  }

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
        <Avatar
          src={member.profile?.avatar_url}
          alt={member.profile?.username || '?'}
          seed={member.profile?.username}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <Link
            href={`/players/${member.profile?.username}`}
            className="text-sm font-semibold text-white hover:text-primary-300 transition-colors truncate block"
          >
            {member.profile?.display_name || member.profile?.username}
          </Link>
          <p className="text-xs text-gray-500">@{member.profile?.username}</p>
        </div>

        <Badge variant={ROLE_COLORS[member.role] as any} className="gap-1">
          {ROLE_ICONS[member.role]}
          {member.role}
        </Badge>

        {(canManage || isMe) && (
          <div className="relative">
            <button
              onClick={() => setOpen(v => !v)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {open && (
              <div className="absolute right-0 top-8 z-20 glass-card rounded-xl shadow-glass w-44 py-1 overflow-hidden">
                {canManage && (
                  <>
                    {member.role === 'member' && myRole === 'captain' && (
                      <button
                        onClick={() => handle(() => updateMemberRole(teamId, member.player_id, 'officer'))}
                        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2"
                      >
                        <Star className="w-3.5 h-3.5 text-accent-blue" /> Promote to Officer
                      </button>
                    )}
                    {member.role === 'officer' && myRole === 'captain' && (
                      <button
                        onClick={() => handle(() => updateMemberRole(teamId, member.player_id, 'member'))}
                        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2"
                      >
                        <UserMinus className="w-3.5 h-3.5 text-gray-400" /> Demote to Member
                      </button>
                    )}
                    {canTransfer && (
                      <button
                        onClick={() => { setOpen(false); setConfirmTransfer(true); }}
                        className="w-full px-3 py-2 text-left text-sm text-accent-amber hover:bg-white/10 flex items-center gap-2"
                      >
                        <Crown className="w-3.5 h-3.5" /> Transfer Captain
                      </button>
                    )}
                    <button
                      onClick={() => { setOpen(false); setConfirmRemove(true); }}
                      className="w-full px-3 py-2 text-left text-sm text-danger hover:bg-white/10 flex items-center gap-2"
                    >
                      <UserMinus className="w-3.5 h-3.5" /> Remove
                    </button>
                  </>
                )}
                {isMe && member.role !== 'captain' && (
                  <button
                    onClick={() => { setOpen(false); setConfirmLeave(true); }}
                    className="w-full px-3 py-2 text-left text-sm text-danger hover:bg-white/10 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Leave Team
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => handle(() => removeMember(teamId, member.player_id))}
        title="Remove Member"
        message={`Remove ${member.profile?.username} from the team?`}
        confirmLabel="Remove"
        danger
        loading={actionLoading}
      />
      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => handle(() => leaveTeam(teamId))}
        title="Leave Team"
        message="Are you sure you want to leave this team?"
        confirmLabel="Leave"
        danger
        loading={actionLoading}
      />
      <ConfirmDialog
        open={confirmTransfer}
        onClose={() => setConfirmTransfer(false)}
        onConfirm={() => handle(() => transferCaptain(teamId, member.player_id))}
        title="Transfer Captaincy"
        message={`Transfer captain role to ${member.profile?.username}? You will become a regular member.`}
        confirmLabel="Transfer"
        danger={false}
        loading={actionLoading}
      />
    </>
  );
}

function InvitationRow({
  inv, isTeamStaff, myId, onRefetch,
}: {
  inv: TeamInvitation;
  isTeamStaff: boolean;
  myId: string;
  onRefetch: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function respond(accept: boolean) {
    setLoading(true);
    try { await respondToInvitation(inv.id, accept); onRefetch(); }
    catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  }

  async function cancel() {
    setLoading(true);
    try { await cancelInvitation(inv.id); onRefetch(); }
    catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  }

  const isMyRequest = inv.type === 'request' && inv.player_id === myId;
  const isMyInvite = inv.type === 'invite' && inv.player_id === myId;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
      <Avatar
        src={(inv.player as any)?.avatar_url}
        alt={(inv.player as any)?.username || '?'}
        seed={(inv.player as any)?.username}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {(inv.player as any)?.username}
        </p>
        <p className="text-xs text-gray-500">
          {inv.type === 'invite' ? 'Invited' : 'Requested to join'} · {timeAgo(inv.created_at)}
        </p>
      </div>

      <div className="flex gap-2">
        {(isTeamStaff && inv.type === 'request') || isMyInvite ? (
          <>
            <button
              onClick={() => respond(true)}
              disabled={loading}
              className="p-1.5 rounded-lg bg-accent-neon/10 text-accent-neon hover:bg-accent-neon/20 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => respond(false)}
              disabled={loading}
              className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-all disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (isMyRequest || (isTeamStaff && inv.type === 'invite')) ? (
          <button
            onClick={cancel}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-surface-3 text-xs text-gray-400 hover:text-white transition-all disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function TeamProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { profile: user } = useAuth();
  const qc = useQueryClient();

  const [inviteUsername, setInviteUsername]   = useState('');
  const [inviteModal, setInviteModal]         = useState(false);
  const [editModal, setEditModal]             = useState(false);
  const [requestModal, setRequestModal]       = useState(false);
  const [requestMsg, setRequestMsg]           = useState('');
  const [confirmDelete, setConfirmDelete]     = useState(false);
  const [actionLoading, setActionLoading]     = useState(false);
  const [actionError, setActionError]         = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName]               = useState('');
  const [editTag, setEditTag]                 = useState('');
  const [editDesc, setEditDesc]               = useState('');
  const [editCountry, setEditCountry]         = useState('');
  const [editLogo, setEditLogo]               = useState('');
  const [editBanner, setEditBanner]           = useState('');
  const [editRecruiting, setEditRecruiting]   = useState(true);

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ['team', slug] });
    qc.invalidateQueries({ queryKey: ['team-members', slug] });
    qc.invalidateQueries({ queryKey: ['team-invitations'] });
    qc.invalidateQueries({ queryKey: ['my-team', user?.id] });
  };

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['team', slug],
    queryFn: () => fetchTeamBySlug(slug),
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['team-members', slug],
    queryFn: () => (team ? fetchTeamMembers(team.id) : Promise.resolve([])),
    enabled: !!team,
  });

  const { data: myMembership } = useQuery({
    queryKey: ['my-team', user?.id],
    queryFn: () => (user?.id ? fetchMyTeam(user.id) : null),
    enabled: !!user?.id,
  });

  const myRole = members.find(m => m.player_id === user?.id)?.role ?? null;
  const isTeamStaff = myRole === 'captain' || myRole === 'officer';
  const isMember = !!myRole;
  const alreadyInATeam = !!myMembership;

  const { data: invitations = [] } = useQuery({
    queryKey: ['team-invitations', team?.id],
    queryFn: () => (team && isTeamStaff ? fetchTeamInvitations(team.id) : Promise.resolve([])),
    enabled: !!team && isTeamStaff,
  });

  function openEdit() {
    if (!team) return;
    setEditName(team.name);
    setEditTag(team.tag || '');
    setEditDesc(team.description || '');
    setEditCountry(team.country || '');
    setEditLogo(team.logo_url || '');
    setEditBanner(team.banner_url || '');
    setEditRecruiting(team.is_recruiting);
    setEditModal(true);
  }

  async function handleEdit() {
    if (!team) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await updateTeam(team.id, {
        name: editName, tag: editTag, description: editDesc,
        country: editCountry, logo_url: editLogo, banner_url: editBanner,
        is_recruiting: editRecruiting,
      });
      setEditModal(false);
      refetchAll();
    } catch (e: any) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleDelete() {
    if (!team) return;
    setActionLoading(true);
    try {
      await deleteTeam(team.id);
      router.push('/teams');
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleInvite() {
    if (!team || !inviteUsername.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      // Look up player by username
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', inviteUsername.trim())
        .maybeSingle();
      if (!profile) throw new Error('Player not found.');
      await invitePlayer(team.id, profile.id);
      setInviteUsername('');
      setInviteModal(false);
      refetchAll();
    } catch (e: any) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleJoinRequest() {
    if (!team) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await requestToJoinTeam(team.id, requestMsg || undefined);
      setRequestModal(false);
      refetchAll();
    } catch (e: any) { setActionError(e.message); }
    finally { setActionLoading(false); }
  }

  if (teamLoading) {
    return (
      <div className="min-h-screen py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-48 w-full rounded-2xl mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Shield className="w-16 h-16 text-gray-700" />
        <h2 className="text-xl font-bold text-gray-400">Team not found</h2>
        <Link href="/teams"><Button variant="secondary">Back to Teams</Button></Link>
      </div>
    );
  }

  const winRate = team.wins + team.losses > 0
    ? Math.round((team.wins / (team.wins + team.losses)) * 100)
    : 0;

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="relative h-52 bg-gradient-to-br from-primary-900/60 to-secondary-900/40 overflow-hidden">
        {team.banner_url ? (
          <img src={team.banner_url} alt={team.name} className="w-full h-full object-cover opacity-50" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 via-secondary-900/60 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-20 pb-12 relative">
        {/* Back */}
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> All Teams
        </Link>

        {/* Team Header */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl border-2 border-surface-3 bg-surface-2 flex items-center justify-center overflow-hidden shadow-xl shrink-0">
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-9 h-9 text-primary-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black text-white">
                {team.name}
                {team.tag && (
                  <span className="ml-2 text-lg font-mono text-gray-500">[{team.tag}]</span>
                )}
              </h1>
              {team.is_recruiting && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-accent-neon/20 text-accent-neon border border-accent-neon/30">
                  RECRUITING
                </span>
              )}
            </div>
            {team.country && (
              <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-1">
                <Globe className="w-4 h-4" /> {team.country}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            {myRole === 'captain' && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openEdit}
                  icon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setInviteModal(true)}
                  icon={<UserPlus className="w-3.5 h-3.5" />}
                >
                  Invite
                </Button>
              </>
            )}
            {myRole === 'officer' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInviteModal(true)}
                icon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Invite
              </Button>
            )}
            {!isMember && user && !alreadyInATeam && team.is_recruiting && (
              <Button
                size="sm"
                onClick={() => setRequestModal(true)}
                icon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Request to Join
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Info + Members */}
          <div className="lg:col-span-2 space-y-5">
            {/* Description */}
            {team.description && (
              <div className="glass-card rounded-2xl p-5">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">About</h2>
                <p className="text-gray-300 text-sm leading-relaxed">{team.description}</p>
              </div>
            )}

            {/* Pending Invitations (staff only) */}
            {isTeamStaff && invitations.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  Pending
                  <span className="px-1.5 py-0.5 rounded-full bg-accent-amber/20 text-accent-amber text-xs">
                    {invitations.length}
                  </span>
                </h2>
                <div className="space-y-2">
                  {invitations.map(inv => (
                    <InvitationRow
                      key={inv.id}
                      inv={inv}
                      isTeamStaff={isTeamStaff}
                      myId={user?.id || ''}
                      onRefetch={refetchAll}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            <div className="glass-card rounded-2xl p-5">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members
                <span className="text-gray-500">({members.length})</span>
              </h2>
              {membersLoading ? (
                <div className="space-y-2">
                  {[0,1,2].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-gray-600 py-4 text-center">No members yet.</p>
              ) : (
                <div className="space-y-1">
                  {members.map(member => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      myRole={myRole}
                      myId={user?.id || ''}
                      teamId={team.id}
                      captainId={team.captain_id}
                      onRefetch={refetchAll}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Danger Zone (captain only) */}
            {myRole === 'captain' && (
              <div className="glass-card rounded-2xl p-5 border-danger/20">
                <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3">Danger Zone</h2>
                <p className="text-xs text-gray-500 mb-3">
                  Deleting your team is permanent and cannot be undone. All members will be removed.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete Team
                </Button>
              </div>
            )}
          </div>

          {/* Right — Stats */}
          <div className="space-y-5">
            <div className="glass-card rounded-2xl p-5">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Team Stats</h2>
              <div className="space-y-4">
                {[
                  { label: 'Members',           value: team.members_count ?? members.length,   icon: <Users className="w-4 h-4 text-accent-blue" /> },
                  { label: 'Tournaments Played', value: team.tournaments_played, icon: <Swords className="w-4 h-4 text-primary-400" /> },
                  { label: 'Tournaments Won',   value: team.tournaments_won,    icon: <Trophy className="w-4 h-4 text-accent-amber" /> },
                  { label: 'Wins',              value: team.wins,               icon: <Check className="w-4 h-4 text-accent-neon" /> },
                  { label: 'Losses',            value: team.losses,             icon: <X className="w-4 h-4 text-danger" /> },
                  { label: 'Win Rate',          value: `${winRate}%`,           icon: <Star className="w-4 h-4 text-accent-amber" /> },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      {stat.icon} {stat.label}
                    </div>
                    <span className="text-sm font-bold text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Captain Card */}
            {team.captain && (
              <div className="glass-card rounded-2xl p-5">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-accent-amber" /> Captain
                </h2>
                <Link
                  href={`/players/${(team.captain as any).username}`}
                  className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-xl transition-colors"
                >
                  <Avatar
                    src={(team.captain as any).avatar_url}
                    alt={(team.captain as any).username}
                    seed={(team.captain as any).username}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {(team.captain as any).display_name || (team.captain as any).username}
                    </p>
                    <p className="text-xs text-gray-500">@{(team.captain as any).username}</p>
                  </div>
                </Link>
              </div>
            )}

            {/* Founded */}
            <div className="glass-card rounded-2xl p-5">
              <p className="text-xs text-gray-500">Founded</p>
              <p className="text-sm font-semibold text-white mt-1">
                {new Date(team.created_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Team" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Team Name *" value={editName} onChange={e => setEditName(e.target.value)} required />
            <Input
              label="Tag (2–5 chars)"
              value={editTag}
              onChange={e => setEditTag(e.target.value.toUpperCase())}
              maxLength={5}
            />
          </div>
          <Textarea label="Description" value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} />
          <Input label="Logo URL" value={editLogo} onChange={e => setEditLogo(e.target.value)} />
          <Input label="Banner URL" value={editBanner} onChange={e => setEditBanner(e.target.value)} />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={editRecruiting} onChange={e => setEditRecruiting(e.target.checked)} className="w-4 h-4 accent-primary-500" />
            <span className="text-sm text-gray-300">Open to Recruitment</span>
          </label>
          {actionError && <p className="text-xs text-danger">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditModal(false)} className="flex-1">Cancel</Button>
            <Button loading={actionLoading} onClick={handleEdit} className="flex-1">Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Invite Player" size="sm">
        <div className="space-y-4">
          <Input
            label="Username"
            placeholder="Enter exact username..."
            value={inviteUsername}
            onChange={e => setInviteUsername(e.target.value)}
          />
          {actionError && <p className="text-xs text-danger">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setInviteModal(false)} className="flex-1">Cancel</Button>
            <Button loading={actionLoading} onClick={handleInvite} className="flex-1" disabled={!inviteUsername.trim()}>
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>

      {/* Request to Join Modal */}
      <Modal open={requestModal} onClose={() => setRequestModal(false)} title="Request to Join" description={team.name} size="sm">
        <div className="space-y-4">
          <Textarea
            label="Message (optional)"
            placeholder="Tell the captain why you want to join..."
            value={requestMsg}
            onChange={e => setRequestMsg(e.target.value)}
            rows={3}
          />
          {actionError && <p className="text-xs text-danger">{actionError}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setRequestModal(false)} className="flex-1">Cancel</Button>
            <Button loading={actionLoading} onClick={handleJoinRequest} className="flex-1">Send Request</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Team"
        message={`Delete "${team.name}"? This action is permanent and all members will be removed.`}
        confirmLabel="Delete Team"
        danger
        loading={actionLoading}
      />
    </div>
  );
}
