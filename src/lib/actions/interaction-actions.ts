'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { PointReason, NotificationType } from '@/lib/types/database';

// ─── 1. POINTS SYSTEM ───────────────────────────────────────────────────

export async function awardPoints(
  playerId: string,
  points: number,
  reason: PointReason,
  referenceId?: string | null
) {
  if (!playerId || points <= 0) return;
  const supabase = await createClient();

  // Idempotency check: if referenceId is given, ensure we haven't already awarded points for this event
  if (referenceId) {
    const { data: existing } = await supabase
      .from('points_transactions')
      .select('id')
      .eq('player_id', playerId)
      .eq('reason', reason)
      .eq('reference_id', referenceId)
      .maybeSingle();

    if (existing) {
      return; // Already awarded, do nothing (idempotent)
    }
  }

  // Record points transaction
  const { error: txError } = await supabase
    .from('points_transactions')
    .insert({
      player_id: playerId,
      points,
      reason,
      reference_id: referenceId || null,
    });

  if (txError) {
    // If unique constraint prevented duplicate insertion, safely exit
    if (txError.code === '23505') return;
    console.error('Failed to insert points transaction:', txError.message);
    return;
  }

  // Update leaderboard_entries table
  const { data: lbEntry } = await supabase
    .from('leaderboard_entries')
    .select('points')
    .eq('player_id', playerId)
    .maybeSingle();

  if (lbEntry) {
    await supabase
      .from('leaderboard_entries')
      .update({
        points: (lbEntry.points || 0) + points,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', playerId);
  } else {
    await supabase
      .from('leaderboard_entries')
      .insert({
        player_id: playerId,
        points: points,
        wins: 0,
        losses: 0,
        tournaments_played: 0,
        tournaments_won: 0,
      });
  }

  // Send notification about points earned
  const reasonTextMap: Record<PointReason, string> = {
    match_win: 'Winning a match',
    tournament_participation: 'Participating in a tournament',
    tournament_champion: 'Winning a tournament championship',
    achievement_bonus: 'Unlocking an achievement',
  };

  await sendNotification({
    playerId,
    title: `+${points} Points Earned!`,
    message: `You received ${points} points for ${reasonTextMap[reason] || 'an event'}.`,
    type: 'points_earned',
    referenceId: referenceId ? `pts_${reason}_${referenceId}` : undefined,
  });
}

// ─── 2. ACHIEVEMENTS & BADGES ──────────────────────────────────────────

export async function evaluateAchievementsAndBadges(playerId: string) {
  if (!playerId) return;
  const supabase = await createClient();

  // Fetch player profile and stats
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', playerId)
    .maybeSingle();

  const { data: lb } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();

  if (!profile) return;

  const wins = lb?.wins || 0;
  const losses = lb?.losses || 0;
  const matchesPlayed = wins + losses;
  const tournamentsPlayed = lb?.tournaments_played || 0;
  const tournamentsWon = lb?.tournaments_won || 0;

  // Check achievements to unlock
  const achievementsToTest = [
    { id: 'first_match', condition: matchesPlayed >= 1 },
    { id: 'first_win', condition: wins >= 1 },
    { id: 'tournament_participant', condition: tournamentsPlayed >= 1 },
    { id: 'champion', condition: tournamentsWon >= 1 },
  ];

  for (const item of achievementsToTest) {
    if (item.condition) {
      await unlockAchievement(supabase, playerId, item.id);
    }
  }

  // Check badges to grant
  const badgesToTest = [
    { id: 'verified', condition: profile.email_confirmed === true },
    { id: 'champion', condition: tournamentsWon >= 1 },
    { id: 'organizer', condition: profile.role === 'admin' },
  ];

  for (const item of badgesToTest) {
    if (item.condition) {
      await grantBadge(supabase, playerId, item.id);
    }
  }
}

async function unlockAchievement(supabase: any, playerId: string, achievementId: string) {
  // Check if already unlocked (idempotent)
  const { data: existing } = await supabase
    .from('player_achievements')
    .select('id')
    .eq('player_id', playerId)
    .eq('achievement_id', achievementId)
    .maybeSingle();

  if (existing) return;

  // Fetch achievement details
  const { data: achievement } = await supabase
    .from('achievements')
    .select('*')
    .eq('id', achievementId)
    .single();

  if (!achievement) return;

  // Grant achievement
  const { error } = await supabase
    .from('player_achievements')
    .insert({
      player_id: playerId,
      achievement_id: achievementId,
    });

  if (error) {
    if (error.code === '23505') return; // Duplicate key error
    console.error('Failed to unlock achievement:', error.message);
    return;
  }

  // Send notification
  await sendNotification({
    playerId,
    title: '🏆 Achievement Unlocked!',
    message: `You unlocked "${achievement.title}": ${achievement.description}`,
    type: 'achievement_unlocked',
    referenceId: `ach_${achievementId}`,
    linkUrl: `/players/${playerId}`,
  });

  // Award bonus points if specified
  if (achievement.points_reward > 0) {
    await awardPoints(playerId, achievement.points_reward, 'achievement_bonus', `ach_${achievementId}`);
  }
}

async function grantBadge(supabase: any, playerId: string, badgeId: string) {
  // Check if already granted (idempotent)
  const { data: existing } = await supabase
    .from('player_badges')
    .select('id')
    .eq('player_id', playerId)
    .eq('badge_id', badgeId)
    .maybeSingle();

  if (existing) return;

  const { data: badge } = await supabase
    .from('badges')
    .select('*')
    .eq('id', badgeId)
    .single();

  if (!badge) return;

  const { error } = await supabase
    .from('player_badges')
    .insert({
      player_id: playerId,
      badge_id: badgeId,
    });

  if (error) {
    if (error.code === '23505') return;
    console.error('Failed to grant badge:', error.message);
    return;
  }

  await sendNotification({
    playerId,
    title: '🎖 New Badge Earned!',
    message: `You earned the "${badge.name}" badge.`,
    type: 'badge_earned',
    referenceId: `badge_${badgeId}`,
    linkUrl: `/players/${playerId}`,
  });
}

// ─── 3. NOTIFICATIONS ──────────────────────────────────────────────────

export async function sendNotification(data: {
  playerId: string;
  title: string;
  message: string;
  type: NotificationType;
  linkUrl?: string;
  referenceId?: string;
}) {
  if (!data.playerId) return;
  const supabase = await createClient();

  // Idempotency check if referenceId is present
  if (data.referenceId) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('player_id', data.playerId)
      .eq('type', data.type)
      .eq('reference_id', data.referenceId)
      .maybeSingle();

    if (existing) return;
  }

  const { error } = await supabase
    .from('notifications')
    .insert({
      player_id: data.playerId,
      title: data.title,
      message: data.message,
      type: data.type,
      link_url: data.linkUrl || null,
      reference_id: data.referenceId || null,
      is_read: false,
    });

  if (error && error.code !== '23505') {
    console.error('Failed to send notification:', error.message);
  }
}

export async function getMyNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('player_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('player_id', user.id);

  revalidatePath('/dashboard');
}

export async function markAllNotificationsAsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('player_id', user.id)
    .eq('is_read', false);

  revalidatePath('/dashboard');
}
