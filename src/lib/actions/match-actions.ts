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

  // Determine winner and loser participant IDs
  let winnerParticipantId: string | null = null;
  let loserParticipantId: string | null = null;
  if (match.score_a > match.score_b) {
    winnerParticipantId = match.player_a_id;
    loserParticipantId = match.player_b_id;
  } else if (match.score_b > match.score_a) {
    winnerParticipantId = match.player_b_id;
    loserParticipantId = match.player_a_id;
  } else {
    throw new Error('Single elimination matches cannot end in a draw');
  }

  if (!winnerParticipantId) throw new Error('Cannot confirm a match with an empty player slot');

  // Update match as confirmed
  const { error: updateError } = await supabase
    .from('matches')
    .update({
      winner_id: winnerParticipantId,
      status: 'confirmed',
      confirmed_by: user.id,
    })
    .eq('id', matchId);

  if (updateError) throw new Error(updateError.message);

  // Get real player UUIDs from tournament_participants
  const { data: participants } = await supabase
    .from('tournament_participants')
    .select('id, player_id')
    .in('id', [winnerParticipantId, loserParticipantId].filter(Boolean));

  const winnerPlayer = participants?.find(p => p.id === winnerParticipantId);
  const loserPlayer = participants?.find(p => p.id === loserParticipantId);

  const { awardPoints, evaluateAchievementsAndBadges, sendNotification } = await import('@/lib/actions/interaction-actions');

  // Update leaderboard wins/losses
  if (winnerPlayer?.player_id) {
    const { data: lbW } = await supabase
      .from('leaderboard_entries')
      .select('wins')
      .eq('player_id', winnerPlayer.player_id)
      .maybeSingle();

    await supabase
      .from('leaderboard_entries')
      .update({
        wins: (lbW?.wins || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', winnerPlayer.player_id);

    // Award match win points (50 pts)
    await awardPoints(winnerPlayer.player_id, 50, 'match_win', matchId);

    await sendNotification({
      playerId: winnerPlayer.player_id,
      title: 'Match Victory!',
      message: 'Your match result has been confirmed. You earned 50 points!',
      type: 'match_reminder',
      linkUrl: `/tournaments/${match.tournament_id}`,
      referenceId: `win_match_${matchId}`,
    });
  }

  if (loserPlayer?.player_id) {
    const { data: lbL } = await supabase
      .from('leaderboard_entries')
      .select('losses')
      .eq('player_id', loserPlayer.player_id)
      .maybeSingle();

    await supabase
      .from('leaderboard_entries')
      .update({
        losses: (lbL?.losses || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', loserPlayer.player_id);

    await sendNotification({
      playerId: loserPlayer.player_id,
      title: 'Match Result Confirmed',
      message: 'Your match result has been confirmed. Good luck in your next match!',
      type: 'match_reminder',
      linkUrl: `/tournaments/${match.tournament_id}`,
      referenceId: `loss_match_${matchId}`,
    });
  }

  // Advance winner to next match
  await advanceWinner(supabase, match, winnerParticipantId);

  // If Final match (no next match), award tournament champion points (250 pts)
  if (!match.next_match_id && winnerPlayer?.player_id) {
    const { data: lbC } = await supabase
      .from('leaderboard_entries')
      .select('tournaments_won')
      .eq('player_id', winnerPlayer.player_id)
      .maybeSingle();

    await supabase
      .from('leaderboard_entries')
      .update({
        tournaments_won: (lbC?.tournaments_won || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', winnerPlayer.player_id);

    await awardPoints(winnerPlayer.player_id, 250, 'tournament_champion', match.tournament_id);
  }

  // Evaluate achievements & badges for both players
  if (winnerPlayer?.player_id) await evaluateAchievementsAndBadges(winnerPlayer.player_id);
  if (loserPlayer?.player_id) await evaluateAchievementsAndBadges(loserPlayer.player_id);

  // Log audit event
  await logAudit(supabase, user.id, 'confirm_match', 'match', matchId, {
    winner_id: winnerParticipantId,
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

export async function reportDispute(matchId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!reason || reason.trim().length < 10) {
    throw new Error('Please provide a detailed dispute reason (at least 10 characters).');
  }

  // Verify match exists and can be disputed
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('status, player_a_id, player_b_id, tournament_id')
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
    throw new Error('Only a reported (pending review) result can be disputed.');
  }

  // Verify caller is a participant in this match
  const { data: participantCheck } = await supabase
    .from('tournament_participants')
    .select('id')
    .or(`id.eq.${match.player_a_id},id.eq.${match.player_b_id}`)
    .eq('player_id', user.id)
    .maybeSingle();

  if (!participantCheck) {
    throw new Error('You are not a participant in this match.');
  }

  // Update match status to disputed (guarded against race condition)
  const { data: disputed, error: updateError } = await supabase
    .from('matches')
    .update({ status: 'disputed' })
    .eq('id', matchId)
    .eq('status', 'pending_review')
    .select('id');

  if (updateError) throw new Error(updateError.message);
  if (!disputed || disputed.length === 0) {
    throw new Error('Could not dispute this match. Its status may have changed. Refresh and try again.');
  }

  // Insert dispute record (unique index prevents duplicate open disputes)
  const { error: disputeError } = await supabase
    .from('match_disputes')
    .insert({
      match_id: matchId,
      reported_by: user.id,
      reason: reason.trim(),
      status: 'open',
    });

  if (disputeError && disputeError.code !== '23505') {
    throw new Error(disputeError.message);
  }

  // Notify admins (via system notification — using player_id of reporter for audit trail)
  await logAudit(supabase, user.id, 'report_dispute', 'match', matchId, { reason: reason.trim() });

  revalidatePath(`/tournaments/${match.tournament_id}`);
  revalidatePath('/admin/disputes');
}

export async function resolveDispute(
  disputeId: string,
  resolution: 'resolved' | 'dismissed',
  winnerId: string | null,
  adminNotes: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'admin') throw new Error('Admin access required');

  // Fetch dispute
  const { data: dispute, error: fetchError } = await supabase
    .from('match_disputes')
    .select('*, match:matches(*)')
    .eq('id', disputeId)
    .single();

  if (fetchError || !dispute) throw new Error('Dispute not found');
  if (dispute.status !== 'open') throw new Error('This dispute has already been resolved.');

  const match = dispute.match as any;

  if (resolution === 'resolved') {
    if (!winnerId) throw new Error('A winner must be selected to resolve the dispute.');

    // Confirm the match with the admin-selected winner
    const { error: matchUpdateError } = await supabase
      .from('matches')
      .update({
        winner_id: winnerId,
        status: 'confirmed',
        confirmed_by: user.id,
      })
      .eq('id', dispute.match_id);

    if (matchUpdateError) throw new Error(matchUpdateError.message);

    // Advance winner in bracket
    await advanceWinner(supabase, match, winnerId);

    // Get player UUIDs from tournament_participants
    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('id, player_id')
      .in('id', [match.player_a_id, match.player_b_id].filter(Boolean));

    const { awardPoints, evaluateAchievementsAndBadges, sendNotification } = await import('@/lib/actions/interaction-actions');

    const winnerParticipant = participants?.find(p => p.id === winnerId);
    const loserParticipant  = participants?.find(p => p.id !== winnerId);

    if (winnerParticipant?.player_id) {
      const { data: lbW } = await supabase
        .from('leaderboard_entries')
        .select('wins')
        .eq('player_id', winnerParticipant.player_id)
        .maybeSingle();

      await supabase
        .from('leaderboard_entries')
        .update({ wins: (lbW?.wins || 0) + 1, updated_at: new Date().toISOString() })
        .eq('player_id', winnerParticipant.player_id);

      await awardPoints(winnerParticipant.player_id, 50, 'match_win', dispute.match_id);
      await sendNotification({
        playerId: winnerParticipant.player_id,
        title: 'Dispute Resolved — You Won! 🏆',
        message: 'The admin has reviewed your disputed match and ruled in your favour.',
        type: 'match_reminder',
        linkUrl: `/tournaments/${match.tournament_id}`,
        referenceId: `dispute_win_${disputeId}`,
      });
    }

    if (loserParticipant?.player_id) {
      const { data: lbL } = await supabase
        .from('leaderboard_entries')
        .select('losses')
        .eq('player_id', loserParticipant.player_id)
        .maybeSingle();

      await supabase
        .from('leaderboard_entries')
        .update({ losses: (lbL?.losses || 0) + 1, updated_at: new Date().toISOString() })
        .eq('player_id', loserParticipant.player_id);

      await sendNotification({
        playerId: loserParticipant.player_id,
        title: 'Dispute Resolved',
        message: 'The admin has reviewed your disputed match. The result has been confirmed.',
        type: 'match_reminder',
        linkUrl: `/tournaments/${match.tournament_id}`,
        referenceId: `dispute_loss_${disputeId}`,
      });
    }

    if (winnerParticipant?.player_id) await evaluateAchievementsAndBadges(winnerParticipant.player_id);
    if (loserParticipant?.player_id)  await evaluateAchievementsAndBadges(loserParticipant.player_id);

  } else {
    // Dismissed — reset match to scheduled so players can re-report
    await supabase
      .from('matches')
      .update({
        status: 'scheduled',
        score_a: null,
        score_b: null,
        proof_screenshot_url: null,
        reported_by: null,
        winner_id: null,
      })
      .eq('id', dispute.match_id);
  }

  // Update dispute record
  const { error: disputeUpdateError } = await supabase
    .from('match_disputes')
    .update({
      status: resolution,
      admin_notes: adminNotes?.trim() || null,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId);

  if (disputeUpdateError) throw new Error(disputeUpdateError.message);

  await logAudit(supabase, user.id, 'resolve_dispute', 'match_dispute', disputeId, {
    resolution,
    winner_id: winnerId,
    notes: adminNotes,
  });

  revalidatePath('/admin/disputes');
  revalidatePath('/admin');
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
