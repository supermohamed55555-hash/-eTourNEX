'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function joinTournament(tournamentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // RLS handles: email_confirmed check, tournament status check
  const { error } = await supabase
    .from('tournament_participants')
    .insert({
      tournament_id: tournamentId,
      player_id: user.id,
    });

  if (error) {
    if (error.code === '23505') throw new Error('You are already registered for this tournament.');
    if (error.message.includes('registration')) throw new Error('Tournament registration is closed.');
    if (error.message.includes('email_confirmed')) throw new Error('Please verify your email before joining tournaments.');
    throw new Error(error.message);
  }

  // Update leaderboard tournaments_played
  const { data: lb } = await supabase
    .from('leaderboard_entries')
    .select('tournaments_played')
    .eq('player_id', user.id)
    .maybeSingle();

  if (lb) {
    await supabase
      .from('leaderboard_entries')
      .update({
        tournaments_played: (lb.tournaments_played || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', user.id);
  } else {
    await supabase
      .from('leaderboard_entries')
      .insert({
        player_id: user.id,
        wins: 0,
        losses: 0,
        tournaments_played: 1,
        tournaments_won: 0,
        points: 0,
      });
  }

  // Award tournament participation points & evaluate achievements
  const { awardPoints, evaluateAchievementsAndBadges } = await import('@/lib/actions/interaction-actions');
  await awardPoints(user.id, 20, 'tournament_participation', tournamentId);
  await evaluateAchievementsAndBadges(user.id);

  revalidatePath(`/tournaments/${tournamentId}`);
}

export async function leaveTournament(tournamentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('player_id', user.id);

  if (error) throw new Error(error.message);
  revalidatePath(`/tournaments/${tournamentId}`);
}
