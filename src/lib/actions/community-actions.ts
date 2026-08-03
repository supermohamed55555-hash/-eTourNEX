'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendNotification } from '@/lib/actions/interaction-actions';
import type { ArticleComment, TournamentComment, ClipCategory } from '@/lib/types/database';

// ─── 1. ARTICLE LIKES ───────────────────────────────────────────────────

export async function toggleArticleLike(articleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check existing like
  const { data: existing } = await supabase
    .from('article_likes')
    .select('id')
    .eq('article_id', articleId)
    .eq('player_id', user.id)
    .maybeSingle();

  if (existing) {
    // Remove like
    await supabase.from('article_likes').delete().eq('id', existing.id);
  } else {
    // Insert like (UNIQUE constraint prevents duplicates)
    const { error } = await supabase
      .from('article_likes')
      .insert({ article_id: articleId, player_id: user.id });

    if (error && error.code !== '23505') throw new Error(error.message);

    // Fetch article author to notify
    const { data: article } = await supabase
      .from('news_articles')
      .select('title, slug, author_id')
      .eq('id', articleId)
      .single();

    if (article?.author_id && article.author_id !== user.id) {
      await sendNotification({
        playerId: article.author_id,
        title: '❤️ New Like on your Article!',
        message: `Someone liked your article "${article.title}".`,
        type: 'system',
        linkUrl: `/news/${article.slug}`,
        referenceId: `like_art_${articleId}_${user.id}`,
      });
    }
  }

  revalidatePath('/news');
  revalidatePath(`/news/${articleId}`);
}

export async function getArticleLikes(articleId: string, userId?: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from('article_likes')
    .select('*', { count: 'exact', head: true })
    .eq('article_id', articleId);

  let hasLiked = false;
  if (userId) {
    const { data } = await supabase
      .from('article_likes')
      .select('id')
      .eq('article_id', articleId)
      .eq('player_id', userId)
      .maybeSingle();
    hasLiked = !!data;
  }

  return { count: count || 0, hasLiked };
}

// ─── 2. ARTICLE COMMENTS ────────────────────────────────────────────────

export async function addArticleComment(articleId: string, content: string, parentId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!content || content.trim().length === 0) {
    throw new Error('Comment text cannot be empty.');
  }

  const { data: comment, error } = await supabase
    .from('article_comments')
    .insert({
      article_id: articleId,
      player_id: user.id,
      content: content.trim(),
      parent_id: parentId || null,
    })
    .select('*, player:profiles(id, username, avatar_url, display_name)')
    .single();

  if (error) throw new Error(error.message);

  // Notify article author or parent comment author
  const { data: article } = await supabase
    .from('news_articles')
    .select('title, slug, author_id')
    .eq('id', articleId)
    .single();

  if (article?.author_id && article.author_id !== user.id) {
    await sendNotification({
      playerId: article.author_id,
      title: '💬 New Comment on your Article',
      message: `Someone commented on "${article.title}".`,
      type: 'system',
      linkUrl: `/news/${article.slug}`,
      referenceId: `comment_art_${comment.id}`,
    });
  }

  revalidatePath(`/news/${article?.slug}`);
  return comment;
}

export async function fetchArticleComments(articleId: string): Promise<ArticleComment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('article_comments')
    .select('*, player:profiles(id, username, avatar_url, display_name)')
    .eq('article_id', articleId)
    .order('created_at', { ascending: true });

  if (error) return [];

  // Group top-level comments and nested replies
  const commentsMap = new Map<string, ArticleComment & { replies: ArticleComment[] }>();
  const topLevel: (ArticleComment & { replies: ArticleComment[] })[] = [];

  (data || []).forEach((c: any) => {
    const commentWithReplies = { ...c, replies: [] };
    commentsMap.set(c.id, commentWithReplies);
  });

  commentsMap.forEach(comment => {
    if (comment.parent_id && commentsMap.has(comment.parent_id)) {
      commentsMap.get(comment.parent_id)!.replies.push(comment);
    } else if (!comment.parent_id) {
      topLevel.push(comment);
    }
  });

  return topLevel;
}

export async function deleteArticleComment(commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('article_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw new Error(error.message);
  revalidatePath('/news');
}

// ─── 3. TOURNAMENT LIKES ───────────────────────────────────────────────

export async function toggleTournamentLike(tournamentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('tournament_likes')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('player_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('tournament_likes').delete().eq('id', existing.id);
  } else {
    const { error } = await supabase
      .from('tournament_likes')
      .insert({ tournament_id: tournamentId, player_id: user.id });

    if (error && error.code !== '23505') throw new Error(error.message);

    // Notify creator
    const { data: tourney } = await supabase
      .from('tournaments')
      .select('name, created_by')
      .eq('id', tournamentId)
      .single();

    if (tourney?.created_by && tourney.created_by !== user.id) {
      await sendNotification({
        playerId: tourney.created_by,
        title: '❤️ New Tournament Favorite!',
        message: `A player liked your tournament "${tourney.name}".`,
        type: 'system',
        linkUrl: `/tournaments/${tournamentId}`,
        referenceId: `like_trn_${tournamentId}_${user.id}`,
      });
    }
  }

  revalidatePath(`/tournaments/${tournamentId}`);
}

export async function getTournamentLikes(tournamentId: string, userId?: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from('tournament_likes')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  let hasLiked = false;
  if (userId) {
    const { data } = await supabase
      .from('tournament_likes')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('player_id', userId)
      .maybeSingle();
    hasLiked = !!data;
  }

  return { count: count || 0, hasLiked };
}

// ─── 4. TOURNAMENT COMMENTS / DISCUSSION ───────────────────────────────

export async function addTournamentComment(tournamentId: string, content: string, parentId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!content || content.trim().length === 0) {
    throw new Error('Comment text cannot be empty.');
  }

  const { data: comment, error } = await supabase
    .from('tournament_comments')
    .insert({
      tournament_id: tournamentId,
      player_id: user.id,
      content: content.trim(),
      parent_id: parentId || null,
    })
    .select('*, player:profiles(id, username, avatar_url, display_name)')
    .single();

  if (error) throw new Error(error.message);

  // Notify tournament organizer
  const { data: tourney } = await supabase
    .from('tournaments')
    .select('name, created_by')
    .eq('id', tournamentId)
    .single();

  if (tourney?.created_by && tourney.created_by !== user.id) {
    await sendNotification({
      playerId: tourney.created_by,
      title: '💬 New Tournament Post',
      message: `Someone posted in the discussion for "${tourney.name}".`,
      type: 'system',
      linkUrl: `/tournaments/${tournamentId}`,
      referenceId: `comment_trn_${comment.id}`,
    });
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  return comment;
}

export async function fetchTournamentComments(tournamentId: string): Promise<TournamentComment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tournament_comments')
    .select('*, player:profiles(id, username, avatar_url, display_name)')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });

  if (error) return [];

  const commentsMap = new Map<string, TournamentComment & { replies: TournamentComment[] }>();
  const topLevel: (TournamentComment & { replies: TournamentComment[] })[] = [];

  (data || []).forEach((c: any) => {
    const commentWithReplies = { ...c, replies: [] };
    commentsMap.set(c.id, commentWithReplies);
  });

  commentsMap.forEach(comment => {
    if (comment.parent_id && commentsMap.has(comment.parent_id)) {
      commentsMap.get(comment.parent_id)!.replies.push(comment);
    } else if (!comment.parent_id) {
      topLevel.push(comment);
    }
  });

  return topLevel;
}

export async function deleteTournamentComment(commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('tournament_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw new Error(error.message);
  revalidatePath('/tournaments');
}

// ─── 5. COMMUNITY CLIPS ────────────────────────────────────────────────


export async function fetchCommunityClips(category?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('community_clips')
    .select('*, player:profiles(*), game:games(*)')
    .order('created_at', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function postCommunityClip(data: {
  title: string;
  video_url: string;
  thumbnail_url?: string | null;
  game_id?: string | null;
  category: ClipCategory;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: clip, error } = await supabase
    .from('community_clips')
    .insert({
      title: data.title.trim(),
      video_url: data.video_url.trim(),
      thumbnail_url: data.thumbnail_url?.trim() || null,
      game_id: data.game_id || null,
      player_id: user.id,
      category: data.category || 'highlight',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/community');
  return clip;
}

export async function toggleLikeCommunityClip(clipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('clip_likes')
    .select('id')
    .eq('clip_id', clipId)
    .eq('player_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('clip_likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('clip_likes').insert({ clip_id: clipId, player_id: user.id });
  }

  revalidatePath('/community');
}

export async function deleteCommunityClip(clipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('community_clips')
    .delete()
    .eq('id', clipId);

  if (error) throw new Error(error.message);
  revalidatePath('/community');
}

