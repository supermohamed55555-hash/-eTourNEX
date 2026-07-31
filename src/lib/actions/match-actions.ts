'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function reportMatchResult(
  matchId: string,
  scoreA: number,
  scoreB: number,
  proofScreenshotUrl: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (scoreA < 0 || scoreB < 0) throw new Error('Scores cannot be negative.');
  if (scoreA === scoreB) throw new Error('Single elimination matches must have a decisive winner (no draws).');
  if (!proofScreenshotUrl || proofScreenshotUrl.trim().length === 0) {
    throw new Error('Proof screenshot is required.');
  }

  // The RLS policy ensures only match participants can update
  const { error } = await supabase
    .from('matches')
    .update({
      score_a: scoreA,
      score_b: scoreB,
      proof_screenshot_url: proofScreenshotUrl,
      status: 'pending_review',
      reported_by: user.id,
    })
    .eq('id', matchId)
    .eq('status', 'scheduled'); // Only allow reporting for scheduled matches

  if (error) throw new Error(error.message);
}

export async function confirmMatch(matchId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'admin') throw new Error('Admin access required');

  // Fetch the match
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (fetchError || !match) throw new Error('Match not found');
  if (match.status !== 'pending_review') throw new Error('Match is not pending review');
  if (match.score_a === null || match.score_b === null) throw new Error('Match has no scores');

  // Determine winner
  let winnerId: string | null = null;
  if (match.score_a > match.score_b) {
    winnerId = match.player_a_id;
  } else if (match.score_b > match.score_a) {
    winnerId = match.player_b_id;
  } else {
    throw new Error('Single elimination matches cannot end in a draw');
  }

  if (!winnerId) throw new Error('Cannot confirm a match with an empty player slot');

  // Update match as confirmed
  const { error: updateError } = await supabase
    .from('matches')
    .update({
      winner_id: winnerId,
      status: 'confirmed',
      confirmed_by: user.id,
    })
    .eq('id', matchId);

  if (updateError) throw new Error(updateError.message);

  // Advance winner to next match
  await advanceWinner(supabase, match, winnerId);

  // Log audit event
  await logAudit(supabase, user.id, 'confirm_match', 'match', matchId, {
    winner_id: winnerId,
    score_a: match.score_a,
    score_b: match.score_b,
  });
}

export async function rejectMatch(matchId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'admin') throw new Error('Admin access required');

  // Reset match to scheduled
  const { error } = await supabase
    .from('matches')
    .update({
      score_a: null,
      score_b: null,
      proof_screenshot_url: null,
      status: 'scheduled',
      reported_by: null,
      winner_id: null,
    })
    .eq('id', matchId);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'reject_match', 'match', matchId, {});
}

export async function disputeMatch(matchId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!reason || reason.trim().length === 0) {
    throw new Error('Dispute reason is required.');
  }

  // Update match status to disputed (if the status column supports it)
  const { error } = await supabase
    .from('matches')
    .update({
      status: 'disputed',
    })
    .eq('id', matchId);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'dispute_match', 'match', matchId, { reason });
}

// ─── Internal Helpers ─────────────────────────────────────────────────

async function advanceWinner(
  supabase: any,
  match: any,
  winnerParticipantId: string
) {
  // Mark loser as eliminated
  const loserId = match.player_a_id === winnerParticipantId ? match.player_b_id : match.player_a_id;
  if (loserId) {
    await supabase
      .from('tournament_participants')
      .update({ eliminated: true })
      .eq('id', loserId);
  }

  if (match.next_match_id) {
    // Find the next match and fill the winner into the first available slot
    const { data: nextMatch } = await supabase
      .from('matches')
      .select('player_a_id, player_b_id')
      .eq('id', match.next_match_id)
      .single();

    if (nextMatch) {
      if (!nextMatch.player_a_id) {
        await supabase
          .from('matches')
          .update({ player_a_id: winnerParticipantId })
          .eq('id', match.next_match_id);
      } else if (!nextMatch.player_b_id) {
        await supabase
          .from('matches')
          .update({ player_b_id: winnerParticipantId })
          .eq('id', match.next_match_id);
      }
    }
  } else {
    // Final match — mark tournament as completed
    await supabase
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', match.tournament_id);
  }
}

async function logAudit(
  supabase: any,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, any>
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to log audit event:', action);
  }
}
