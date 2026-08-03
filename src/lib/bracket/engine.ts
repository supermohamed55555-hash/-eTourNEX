import { createClient } from '@/lib/supabase/client';
import type { Profile, Tournament, TournamentParticipant, Match, LeaderboardEntry, Game } from '@/lib/types/database';

// ─── Tournament Queries ─────────────────────────────────────────────────

export async function fetchTournaments(): Promise<Tournament[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tournaments')
    .select('*, game:games(*), participants:tournament_participants(count)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(t => ({
    ...t,
    participants_count: t.participants?.[0]?.count ?? 0,
  }));
}

export async function fetchTournamentById(id: string): Promise<Tournament | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tournaments')
    .select('*, game:games(*), participants:tournament_participants(count)')
    .eq('id', id)
    .single();

  if (error) return null;

  return {
    ...data,
    participants_count: data.participants?.[0]?.count ?? 0,
  };
}

// ─── Participant Queries ────────────────────────────────────────────────

export async function fetchParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tournament_participants')
    .select('*, profile:profiles(*)')
    .eq('tournament_id', tournamentId)
    .order('seed', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchMyTournaments(playerId: string): Promise<Tournament[]> {
  const supabase = createClient();

  // Get tournament IDs where user is a participant
  const { data: participations, error: partError } = await supabase
    .from('tournament_participants')
    .select('tournament_id')
    .eq('player_id', playerId);

  if (partError) throw new Error(partError.message);
  if (!participations || participations.length === 0) return [];

  const tournamentIds = participations.map(p => p.tournament_id);

  const { data, error } = await supabase
    .from('tournaments')
    .select('*, game:games(*), participants:tournament_participants(count)')
    .in('id', tournamentIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(t => ({
    ...t,
    participants_count: t.participants?.[0]?.count ?? 0,
  }));
}

export async function fetchOrganizedTournaments(userId: string): Promise<Tournament[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tournaments')
    .select('*, game:games(*), participants:tournament_participants(count)')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(t => ({
    ...t,
    participants_count: t.participants?.[0]?.count ?? 0,
  }));
}

// ─── Match Queries ──────────────────────────────────────────────────────

export async function fetchMatches(tournamentId: string): Promise<Match[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      player_a:tournament_participants!matches_player_a_id_fkey(*, profile:profiles(*)),
      player_b:tournament_participants!matches_player_b_id_fkey(*, profile:profiles(*)),
      winner:tournament_participants!matches_winner_id_fkey(*, profile:profiles(*)),
      reporter:profiles!matches_reported_by_fkey(*)
    `)
    .eq('tournament_id', tournamentId)
    .order('round_order', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchPendingReviews(): Promise<(Match & { tournament?: Tournament })[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      player_a:tournament_participants!matches_player_a_id_fkey(*, profile:profiles(*)),
      player_b:tournament_participants!matches_player_b_id_fkey(*, profile:profiles(*)),
      reporter:profiles!matches_reported_by_fkey(*),
      tournament:tournaments(*)
    `)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchMyMatches(playerId: string): Promise<Match[]> {
  const supabase = createClient();

  // Get participant IDs for this player
  const { data: parts, error: partError } = await supabase
    .from('tournament_participants')
    .select('id')
    .eq('player_id', playerId);

  if (partError) throw new Error(partError.message);
  if (!parts || parts.length === 0) return [];

  const partIds = parts.map(p => p.id);

  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      player_a:tournament_participants!matches_player_a_id_fkey(*, profile:profiles(*)),
      player_b:tournament_participants!matches_player_b_id_fkey(*, profile:profiles(*)),
      winner:tournament_participants!matches_winner_id_fkey(*, profile:profiles(*)),
      tournament:tournaments(name, id)
    `)
    .or(`player_a_id.in.(${partIds.join(',')}),player_b_id.in.(${partIds.join(',')})`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Profile Queries ────────────────────────────────────────────────────

export async function fetchProfiles(): Promise<Profile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchProfileById(id: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .single();

  if (error) return null;
  return data;
}

// ─── Leaderboard Queries ────────────────────────────────────────────────

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*, profile:profiles(*)')
    .order('tournaments_won', { ascending: false })
    .order('wins', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchLeaderboardByPlayerId(playerId: string): Promise<LeaderboardEntry | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*, profile:profiles(*)')
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) return null;
  return data;
}

// ─── Games Queries ──────────────────────────────────────────────────────

export async function fetchGames(): Promise<Game[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Phase 2: Achievements & Badges Queries ────────────────────────────

export async function fetchAchievements() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function fetchPlayerAchievements(playerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('player_achievements')
    .select('*, achievement:achievements(*)')
    .eq('player_id', playerId);

  if (error) return [];
  return data || [];
}

export async function fetchBadges() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function fetchPlayerBadges(playerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('player_badges')
    .select('*, badge:badges(*)')
    .eq('player_id', playerId);

  if (error) return [];
  return data || [];
}

export async function fetchAllPlayerBadges() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('player_badges')
    .select('*, badge:badges(*)');

  if (error) return [];
  return data || [];
}

// ─── Phase 3: Disputes Queries ──────────────────────────────────────────

export async function fetchDisputes(status?: 'open' | 'resolved' | 'dismissed') {
  const supabase = createClient();
  let query = supabase
    .from('match_disputes')
    .select(`
      *,
      match:matches(
        id, round_name, score_a, score_b, tournament_id, status,
        player_a:tournament_participants!matches_player_a_id_fkey(*, profile:profiles(*)),
        player_b:tournament_participants!matches_player_b_id_fkey(*, profile:profiles(*))
      ),
      reporter:profiles!match_disputes_reported_by_fkey(id, username, avatar_url),
      resolver:profiles!match_disputes_resolved_by_fkey(id, username)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('fetchDisputes error:', error.message);
    return [];
  }
  return data || [];
}

// ─── Phase 3: Player Statistics ─────────────────────────────────────────

export async function fetchPlayerMatchHistory(playerId: string, limit = 20) {
  const supabase = createClient();

  // Get all participant IDs for this player
  const { data: parts, error: partError } = await supabase
    .from('tournament_participants')
    .select('id')
    .eq('player_id', playerId);

  if (partError || !parts || parts.length === 0) return [];

  const partIds = parts.map(p => p.id);

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      round_name,
      score_a,
      score_b,
      status,
      created_at,
      winner_id,
      player_a_id,
      player_b_id,
      player_a:tournament_participants!matches_player_a_id_fkey(
        id, player_id, profile:profiles(id, username, avatar_url)
      ),
      player_b:tournament_participants!matches_player_b_id_fkey(
        id, player_id, profile:profiles(id, username, avatar_url)
      ),
      tournament:tournaments(id, name, game:games(name, icon_url))
    `)
    .or(`player_a_id.in.(${partIds.join(',')}),player_b_id.in.(${partIds.join(',')})`)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('fetchPlayerMatchHistory error:', error.message);
    return [];
  }

  // Annotate each match: did this player win?
  return (data || []).map((m: any) => {
    const isPlayerA = partIds.includes(m.player_a_id);
    const won = m.winner_id && partIds.includes(m.winner_id);
    const opponent = isPlayerA ? m.player_b : m.player_a;
    return { ...m, won, opponent };
  });
}

export interface PlayerStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;       // positive = win streak, negative = loss streak
  longestWinStreak: number;
  points: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  leaderboardRank: number | null;
}

export async function fetchPlayerStats(playerId: string): Promise<PlayerStats> {
  const supabase = createClient();

  // Leaderboard data
  const { data: lb } = await supabase
    .from('leaderboard_entries')
    .select('wins, losses, points, tournaments_won')
    .eq('player_id', playerId)
    .maybeSingle();

  const wins   = lb?.wins   ?? 0;
  const losses = lb?.losses ?? 0;
  const total  = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Tournaments played
  const { count: tournamentsPlayed } = await supabase
    .from('tournament_participants')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId);

  // Rank — count players with more points
  const { count: playersAhead } = await supabase
    .from('leaderboard_entries')
    .select('id', { count: 'exact', head: true })
    .gt('points', lb?.points ?? 0);

  const leaderboardRank = total > 0 ? (playersAhead ?? 0) + 1 : null;

  // Current streak — look at last 20 confirmed matches in order
  const history = await fetchPlayerMatchHistory(playerId, 20);
  let currentStreak = 0;
  let longestWinStreak = 0;
  let runningWin = 0;

  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (i === 0) {
      currentStreak = m.won ? 1 : -1;
    } else {
      const prevWon = history[i - 1].won;
      if (m.won === prevWon) {
        currentStreak += m.won ? 1 : -1;
      } else {
        break; // streak ended
      }
    }
  }

  for (const m of history) {
    if (m.won) {
      runningWin++;
      longestWinStreak = Math.max(longestWinStreak, runningWin);
    } else {
      runningWin = 0;
    }
  }

  return {
    totalMatches:      total,
    wins,
    losses,
    winRate,
    currentStreak,
    longestWinStreak,
    points:            lb?.points ?? 0,
    tournamentsPlayed: tournamentsPlayed ?? 0,
    tournamentsWon:    lb?.tournaments_won ?? 0,
    leaderboardRank,
  };
}

export async function fetchPointsHistory(playerId: string, limit = 15) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('points_transactions')
    .select('points, reason, created_at')
    .eq('player_id', playerId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return [];

  // Build cumulative chart data
  let cumulative = 0;
  return (data || []).map((tx: any) => {
    cumulative += tx.points;
    return {
      date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      points: cumulative,
      gained: tx.points,
      reason: tx.reason,
    };
  });
}

// ─── Team Queries ───────────────────────────────────────────────────────

import type { Team, TeamMember, TeamInvitation } from '@/lib/types/database';

export async function fetchTeams(options?: {
  recruiting?: boolean;
  limit?: number;
}): Promise<Team[]> {
  const supabase = createClient();
  let query = supabase
    .from('teams')
    .select('*, captain:profiles!teams_captain_id_fkey(*), members:team_members(count)')
    .order('wins', { ascending: false });

  if (options?.recruiting) {
    query = query.eq('is_recruiting', true);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).map((t: any) => ({
    ...t,
    members_count: t.members?.[0]?.count ?? 0,
  }));
}

export async function fetchTeamBySlug(slug: string): Promise<Team | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('teams')
    .select('*, captain:profiles!teams_captain_id_fkey(*), members:team_members(count)')
    .eq('slug', slug)
    .single();

  if (error) return null;

  return {
    ...data,
    members_count: data.members?.[0]?.count ?? 0,
  };
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('team_members')
    .select('*, profile:profiles(*)')
    .eq('team_id', teamId)
    .order('role', { ascending: true });  // captain → officer → member

  if (error) throw new Error(error.message);
  return (data as TeamMember[]) || [];
}

export async function fetchTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('team_invitations')
    .select('*, player:profiles(*), inviter:profiles!team_invitations_invited_by_fkey(*)')
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as TeamInvitation[]) || [];
}

export async function fetchMyTeamInvitations(playerId: string): Promise<TeamInvitation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('team_invitations')
    .select('*, team:teams(*), inviter:profiles!team_invitations_invited_by_fkey(*)')
    .eq('player_id', playerId)
    .eq('type', 'invite')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data as TeamInvitation[]) || [];
}

export async function fetchMyTeam(playerId: string): Promise<(TeamMember & { team: Team }) | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('team_members')
    .select('*, team:teams(*, captain:profiles!teams_captain_id_fkey(*))')
    .eq('player_id', playerId)
    .maybeSingle();

  if (error || !data) return null;
  return data as TeamMember & { team: Team };
}

// ─── Multi Game Queries ────────────────────────────────────────────────

export async function fetchActiveGames(): Promise<Game[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) return [];
  return (data as Game[]) || [];
}

export async function fetchGameBySlug(slug: string): Promise<Game | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  return data as Game;
}

export async function fetchTournamentsByGame(gameId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tournaments')
    .select('*, game:games(*), participants:tournament_participants(count)')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map((t: any) => ({
    ...t,
    participants_count: t.participants?.[0]?.count ?? 0,
  }));
}

