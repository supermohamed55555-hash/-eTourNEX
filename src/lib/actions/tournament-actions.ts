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
