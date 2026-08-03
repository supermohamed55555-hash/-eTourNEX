'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/actions/audit';

export async function fetchOrganizerStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check organizer or admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'organizer' && profile.role !== 'admin')) {
    throw new Error('Organizer or Admin access required');
  }

  // Fetch organizer tournaments
  let query = supabase
    .from('tournaments')
    .select('id, status, created_at, prize_pool, game_id, participants:tournament_participants(count)');

  if (profile.role !== 'admin') {
    query = query.eq('created_by', user.id);
  }

  const { data: rawTournaments } = await query;
  const tournaments: any[] = rawTournaments ?? [];

  const totalTournaments = tournaments.length;
  const activeTournaments = tournaments.filter((t: any) => t.status === 'registration' || t.status === 'in_progress').length;
  const completedTournaments = tournaments.filter((t: any) => t.status === 'completed').length;

  const totalParticipants = tournaments.reduce((acc: number, t: any) => acc + (t.participants?.[0]?.count ?? 0), 0);

  return {
    totalTournaments,
    activeTournaments,
    completedTournaments,
    totalParticipants,
  };
}

export async function fetchOrganizerTournaments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'organizer' && profile.role !== 'admin')) {
    throw new Error('Organizer or Admin access required');
  }

  let query = supabase
    .from('tournaments')
    .select('*, game:games(*), participants:tournament_participants(count)')
    .order('created_at', { ascending: false });

  if (profile.role !== 'admin') {
    query = query.eq('created_by', user.id);
  }

  const { data, error } = await query;
  if (error) return [];

  return (data || []).map((t: any) => ({
    ...t,
    participants_count: t.participants?.[0]?.count ?? 0,
  }));
}

export async function removeParticipantByOrganizer(tournamentId: string, participantId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify tournament ownership or admin
  const { data: tourney } = await supabase
    .from('tournaments')
    .select('created_by, status')
    .eq('id', tournamentId)
    .single();

  if (!tourney) throw new Error('Tournament not found.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isOwner = tourney.created_by === user.id;
  const isAdmin = profile?.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new Error('Permission denied. You can only manage participants for tournaments you created.');
  }

  if (tourney.status !== 'registration') {
    throw new Error('Cannot remove participants after tournament bracket has started.');
  }

  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('id', participantId)
    .eq('tournament_id', tournamentId);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'remove_participant', 'tournament', tournamentId, { participantId });
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath('/organizer/tournaments');
}
