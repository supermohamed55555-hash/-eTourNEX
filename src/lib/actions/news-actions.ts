'use server';

import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/actions/audit';
import { revalidatePath } from 'next/cache';
import type { NewsCategory } from '@/lib/types/database';

export async function fetchNewsArticles(category?: string, limit = 20) {
  const supabase = await createClient();
  let query = supabase
    .from('news_articles')
    .select('*, author:profiles(id, username, avatar_url, display_name)')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) {
    console.error('fetchNewsArticles error:', error.message);
    return [];
  }

  return data || [];
}

export async function fetchFeaturedNewsArticle() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('news_articles')
    .select('*, author:profiles(id, username, avatar_url, display_name)')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) return data;

  // Fallback to latest published article
  const { data: latest } = await supabase
    .from('news_articles')
    .select('*, author:profiles(id, username, avatar_url, display_name)')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return latest || null;
}

export async function fetchRelatedNewsArticles(currentSlug: string, category?: string, limit = 3) {
  const supabase = await createClient();
  let query = supabase
    .from('news_articles')
    .select('*, author:profiles(id, username, avatar_url, display_name)')
    .eq('is_published', true)
    .neq('slug', currentSlug)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  const { data } = await query;
  return data || [];
}

export async function fetchNewsArticleBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('news_articles')
    .select('*, author:profiles(id, username, avatar_url, display_name)')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data;
}

export async function createNewsArticle(data: {
  title: string;
  content: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  category: NewsCategory;
  is_published?: boolean;
  is_featured?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Require admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') throw new Error('Admin access required');

  if (!data.title || data.title.trim().length === 0) throw new Error('Title is required.');
  if (!data.content || data.content.trim().length === 0) throw new Error('Content is required.');

  const baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

  // If set as featured, unfeature others
  if (data.is_featured) {
    await supabase.from('news_articles').update({ is_featured: false }).eq('is_featured', true);
  }

  const { data: article, error } = await supabase
    .from('news_articles')
    .insert({
      title: data.title.trim(),
      slug,
      content: data.content.trim(),
      excerpt: data.excerpt?.trim() || null,
      cover_image_url: data.cover_image_url?.trim() || null,
      category: data.category || 'announcement',
      author_id: user.id,
      is_published: data.is_published ?? true,
      is_featured: data.is_featured ?? false,
      published_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'create_news', 'news_article', article.id, { title: data.title });
  revalidatePath('/news');
  revalidatePath('/admin/news');
  return article;
}

export async function updateNewsArticle(id: string, data: Partial<{
  title: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: NewsCategory;
  is_published: boolean;
  is_featured: boolean;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') throw new Error('Admin access required');

  if (data.is_featured) {
    await supabase.from('news_articles').update({ is_featured: false }).eq('is_featured', true);
  }

  const { error } = await supabase
    .from('news_articles')
    .update(data)
    .eq('id', id);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'update_news', 'news_article', id, data);
  revalidatePath('/news');
  revalidatePath('/admin/news');
}

export async function deleteNewsArticle(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') throw new Error('Admin access required');

  const { error } = await supabase
    .from('news_articles')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  await logAudit(supabase, user.id, 'delete_news', 'news_article', id, {});
  revalidatePath('/news');
  revalidatePath('/admin/news');
}

