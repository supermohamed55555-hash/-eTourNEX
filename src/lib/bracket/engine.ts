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
