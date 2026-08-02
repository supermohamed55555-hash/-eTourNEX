'use server';

import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/actions/audit';
import { revalidatePath } from 'next/cache';

// ─── Tournament CRUD ────────────────────────────────────────────────────

export async function createTournament(data: {
  name: string;
  description?: string | null;
  rules?: string | null;
  prize_pool?: string | null;
  max_players?: number | null;
  starts_at?: string | null;
  game_id?: string | null;
  banner_url?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await requireAdmin(supabase, user.id);

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      ...data,
      format: 'single_elimination',
      status: 'registration',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'create_tournament', 'tournament', tournament.id, { name: data.name });
  revalidatePath('/admin/tournaments');
  return tournament;
}

export async function updateTournament(id: string, data: Record<string, any>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await requireAdmin(supabase, user.id);

  const { error } = await supabase
    .from('tournaments')
    .update(data)
    .eq('id', id);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'update_tournament', 'tournament', id, data);
  revalidatePath('/admin/tournaments');
}

export async function cancelTournament(id: string) {
  return updateTournament(id, { status: 'cancelled' });
}

// ─── Bracket Generation ─────────────────────────────────────────────────

export async function generateBracket(tournamentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await requireAdmin(supabase, user.id);

  // Fetch tournament
  const { data: tournament, error: tError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (tError || !tournament) throw new Error('Tournament not found');
  if (tournament.status !== 'registration') throw new Error('Tournament must be in registration status');

  // Fetch participants
  const { data: participants, error: pError } = await supabase
    .from('tournament_participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('seed', { ascending: true });

  if (pError) throw new Error(pError.message);
  if (!participants || participants.length < 2) {
    throw new Error('Tournament needs at least 2 participants');
  }

  // Remove old matches if any
  await supabase.from('matches').delete().eq('tournament_id', tournamentId);

  // Shuffle participants for seeding
  const seeded = [...participants].sort(() => 0.5 - Math.random());
  const count = seeded.length;

  // Find smallest power of 2 >= count
  let power = 2;
  while (power < count) power *= 2;

  const numByes = power - count;
  const totalRounds = Math.log2(power);

  const roundNamesMap: Record<number, string> = {};
  for (let r = 1; r <= totalRounds; r++) {
    if (r === totalRounds) roundNamesMap[r] = 'Final';
    else if (r === totalRounds - 1) roundNamesMap[r] = 'Semifinal';
    else if (r === totalRounds - 2) roundNamesMap[r] = 'Quarterfinal';
    else roundNamesMap[r] = `Round ${r}`;
  }

  // Build matches from top (Final) down to Round 1
  // We use temporary IDs and then insert all at once
  interface MatchInsert {
    temp_id: string;
    tournament_id: string;
    round_name: string;
    round_order: number;
    player_a_id: string | null;
    player_b_id: string | null;
    next_temp_id: string | null;
    scheduled_for: string;
  }

  const matchInserts: MatchInsert[] = [];
  const roundMatches: Record<number, MatchInsert[]> = {};

  for (let r = totalRounds; r >= 1; r--) {
    roundMatches[r] = [];
    const matchesInRound = Math.pow(2, totalRounds - r);

    for (let i = 0; i < matchesInRound; i++) {
      const nextRoundMatch = r < totalRounds ? roundMatches[r + 1][Math.floor(i / 2)] : null;

      const m: MatchInsert = {
        temp_id: `r${r}-${i}`,
        tournament_id: tournamentId,
        round_name: roundNamesMap[r] || `Round ${r}`,
        round_order: r,
        player_a_id: null,
        player_b_id: null,
        next_temp_id: nextRoundMatch ? nextRoundMatch.temp_id : null,
        scheduled_for: new Date(Date.now() + r * 3600000).toISOString(),
      };

      roundMatches[r].push(m);
      matchInserts.push(m);
    }
  }

  // Populate Round 1 matches with participants
  let playerIndex = 0;
  const r1Matches = roundMatches[1];

  for (let i = 0; i < r1Matches.length; i++) {
    if (playerIndex < count) {
      r1Matches[i].player_a_id = seeded[playerIndex++].id;
    }
    if (playerIndex < count) {
      r1Matches[i].player_b_id = seeded[playerIndex++].id;
    }
  }

  // Handle byes — advance remaining players to Round 2
  if (numByes > 0 && totalRounds > 1) {
    const r2Matches = roundMatches[2];
    while (playerIndex < count) {
      const byePlayer = seeded[playerIndex++];
      for (const r2m of r2Matches) {
        if (!r2m.player_a_id) {
          r2m.player_a_id = byePlayer.id;
          break;
        } else if (!r2m.player_b_id) {
          r2m.player_b_id = byePlayer.id;
          break;
        }
      }
    }
  }

  // Insert matches in order (from Round 1 to Final) — since next_match_id
  // references matches we haven't inserted yet, we insert in reverse order
  // (Final first) and then update next_match_id linkages.

  // Insert ALL matches first without next_match_id
  const insertData = matchInserts.map(m => ({
    tournament_id: m.tournament_id,
    round_name: m.round_name,
    round_order: m.round_order,
    player_a_id: m.player_a_id,
    player_b_id: m.player_b_id,
    status: 'scheduled' as const,
    scheduled_for: m.scheduled_for,
  }));

  const { data: insertedMatches, error: insertError } = await supabase
    .from('matches')
    .insert(insertData)
    .select('id, round_order, round_name')
    .order('round_order', { ascending: true });

  if (insertError) throw new Error(insertError.message);
  if (!insertedMatches) throw new Error('Failed to insert matches');

  // Now map temp_ids to real IDs and update next_match_id linkages
  // Group inserted matches by round_order to maintain correspondence
  const insertedByRound: Record<number, typeof insertedMatches> = {};
  for (const m of insertedMatches) {
    if (!insertedByRound[m.round_order]) insertedByRound[m.round_order] = [];
    insertedByRound[m.round_order].push(m);
  }

  // For each round except the Final, set next_match_id
  for (let r = 1; r < totalRounds; r++) {
    const currentRound = insertedByRound[r];
    const nextRound = insertedByRound[r + 1];
    if (!currentRound || !nextRound) continue;

    for (let i = 0; i < currentRound.length; i++) {
      const nextMatchIndex = Math.floor(i / 2);
      if (nextMatchIndex < nextRound.length) {
        await supabase
          .from('matches')
          .update({ next_match_id: nextRound[nextMatchIndex].id })
          .eq('id', currentRound[i].id);
      }
    }
  }

  // Update tournament status
  await supabase
    .from('tournaments')
    .update({ status: 'in_progress' })
    .eq('id', tournamentId);

  await logAudit(supabase, user.id, 'generate_bracket', 'tournament', tournamentId, {
    participants: count,
    rounds: totalRounds,
  });

  revalidatePath(`/admin/tournaments/${tournamentId}/bracket`);
}

// ─── User Management ────────────────────────────────────────────────────

export async function promoteUser(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await requireAdmin(supabase, user.id);

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'promote_user', 'profile', userId, { new_role: 'admin' });
  revalidatePath('/admin/users');
}

export async function demoteUser(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await requireAdmin(supabase, user.id);

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'player' })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'demote_user', 'profile', userId, { new_role: 'player' });
  revalidatePath('/admin/users');
}

export async function forceVerifyUser(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await requireAdmin(supabase, user.id);

  const { error } = await supabase
    .from('profiles')
    .update({ email_confirmed: true })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'force_verify_user', 'profile', userId, {});
  revalidatePath('/admin/users');
}

export async function suspendUser(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await requireAdmin(supabase, user.id);

  // For now, set role to 'player' and email_confirmed to false as a form of suspension
  // A proper suspension system would add a 'suspended' column
  const { error } = await supabase
    .from('profiles')
    .update({ email_confirmed: false })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'suspend_user', 'profile', userId, {});
  revalidatePath('/admin/users');
}

// ─── Internal Helpers ─────────────────────────────────────────────────

async function requireAdmin(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw new Error('Admin access required');
  }
}
