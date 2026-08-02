'use server';

import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/actions/audit';
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

  // Item 12: this filters on status AND relies on RLS, either of which can
  // reduce the write to zero rows. PostgREST does not treat that as an error,
  // so `error` alone would let a no-op report back as success. `.select()`
  // returns what was actually written, making the no-op detectable.
  const { data: reported, error } = await supabase
    .from('matches')
    .update({
      score_a: scoreA,
      score_b: scoreB,
      proof_screenshot_url: proofScreenshotUrl,
      status: 'pending_review',
      reported_by: user.id,
    })
    .eq('id', matchId)
    .eq('status', 'scheduled') // Only allow reporting for scheduled matches
    .select('id');

  if (error) throw new Error(error.message);
  if (!reported || reported.length === 0) {
    // Either the match left 'scheduled' (already reported, or an admin
    // confirmed it) or the caller is not a participant and RLS filtered it out.
    throw new Error(
      'Could not report this result. The match may have already been reported ' +
      'or confirmed, or you may not be one of its players. Refresh and try again.'
    );
  }
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
      confirmed_by: null,
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

  // Item 10: this function has no UI entry point today. It is hardened rather
  // than wired up — adding a dispute button is a product decision, not a bug
  // fix — so that it is already safe whenever one is added.
  //
  // Check the status before writing. Migration 004's USING clause excludes
  // 'confirmed', so a player disputing a confirmed match updates zero rows,
  // which PostgREST reports as success. Without this, the caller saw nothing
  // happen and the audit log recorded a dispute that never occurred.
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('status')
    .eq('id', matchId)
    .single();

  if (fetchError || !match) throw new Error('Match not found');

  if (match.status === 'confirmed') {
    throw new Error('Confirmed results can only be disputed by an admin.');
  }
  if (match.status === 'disputed') {
    throw new Error('This match is already under dispute.');
  }
  if (match.status !== 'pending_review') {
    throw new Error('Only a reported result can be disputed.');
  }

  const { data: disputed, error } = await supabase
    .from('matches')
    .update({
      status: 'disputed',
    })
    .eq('id', matchId)
    .eq('status', 'pending_review') // Guard against a concurrent confirm/reject
    .select('id');

  if (error) throw new Error(error.message);
  if (!disputed || disputed.length === 0) {
    // Lost a race, or RLS filtered the write (caller is not a participant).
    throw new Error(
      'Could not dispute this match. Its status may have changed, or you may ' +
      'not be one of its players. Refresh and try again.'
    );
  }

  // Audit only after the write is confirmed, so the log cannot claim a dispute
  // that did not land.
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
    // Item 8: RLS filters a policy-less UPDATE down to zero rows WITHOUT
    // raising, so an `error` check alone cannot detect it — that is precisely
    // how this went unnoticed. `.select()` makes PostgREST return the rows it
    // actually wrote, so a no-op becomes observable.
    const { data: eliminated, error: elimError } = await supabase
      .from('tournament_participants')
      .update({ eliminated: true })
      .eq('id', loserId)
      .select('id');

    if (elimError) throw new Error(elimError.message);
    if (!eliminated || eliminated.length === 0) {
      throw new Error(
        `Failed to mark participant ${loserId} eliminated: the update matched no rows. ` +
        'This usually means the admin UPDATE policy on tournament_participants is missing ' +
        '(supabase/migrations/006_participant_elimination.sql).'
      );
    }
  }

  if (match.next_match_id) {
    // Find the next match and fill the winner into the first available slot
    const { data: nextMatch, error: nextFetchError } = await supabase
      .from('matches')
      .select('player_a_id, player_b_id')
      .eq('id', match.next_match_id)
      .single();

    // This fetch also discarded its error. A failed read left nextMatch null
    // and skipped the whole advancement below without a word.
    if (nextFetchError) throw new Error(nextFetchError.message);
    if (!nextMatch) {
      throw new Error(
        `Match ${match.id} points at next_match_id ${match.next_match_id}, which does not exist.`
      );
    }

    // Item 11: same silent-no-op risk as Item 8. These writes are covered by
    // the admin FOR ALL policy on matches, so they should succeed — but
    // "should succeed, result discarded" is exactly what hid Item 8 for every
    // tournament to date. A winner who fails to advance leaves the bracket
    // stuck with no signal anywhere.
    const slot = !nextMatch.player_a_id
      ? 'player_a_id'
      : !nextMatch.player_b_id
        ? 'player_b_id'
        : null;

    // Previously an else-less if: with both slots full nothing was written and
    // nothing was raised, so the winner was quietly dropped from the bracket.
    if (!slot) {
      throw new Error(
        `Cannot advance winner: both player slots in next match ${match.next_match_id} ` +
        'are already filled. The bracket is inconsistent and needs admin review.'
      );
    }

    const { data: advanced, error: advanceError } = await supabase
      .from('matches')
      .update({ [slot]: winnerParticipantId })
      .eq('id', match.next_match_id)
      .select('id');

    if (advanceError) throw new Error(advanceError.message);
    if (!advanced || advanced.length === 0) {
      throw new Error(
        `Failed to advance the winner into next match ${match.next_match_id}: ` +
        'the update matched no rows.'
      );
    }
  } else {
    // Final match — mark tournament as completed
    const { data: completed, error: completeError } = await supabase
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', match.tournament_id)
      .select('id');

    if (completeError) throw new Error(completeError.message);
    if (!completed || completed.length === 0) {
      throw new Error(
        `Failed to mark tournament ${match.tournament_id} completed: the update matched no rows.`
      );
    }
  }
}
