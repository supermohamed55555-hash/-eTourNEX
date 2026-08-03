'use client';

import React, { use } from 'react';
import { notFound } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchNewsArticleBySlug, fetchNewsArticles } from '@/lib/actions/news-actions';
import type { NewsArticle } from '@/lib/types/database';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Calendar, ChevronLeft, Share2, Tag, ArrowRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const CATEGORY_STYLES: Record<string, string> = {
  announcement: 'border-purple-500/30 text-purple-300 bg-purple-500/10',
  patch_notes:  'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
  esports_news: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
  community:    'border-sky-500/30 text-sky-300 bg-sky-500/10',
};

export default function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data: article, isLoading } = useQuery({
    queryKey: ['news-article', slug],
    queryFn: () => fetchNewsArticleBySlug(slug),
  });

  const { data: related = [] } = useQuery({
    queryKey: ['news-related', article?.category],
    queryFn: () => fetchNewsArticles(article?.category, 4),
    enabled: !!article?.category,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!article) notFound();

  const relatedArticles = related.filter((a: NewsArticle) => a.id !== article.id).slice(0, 3);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">

      {/* Back button */}
      <Link href="/news">
        <Button variant="ghost" size="sm" icon={<ChevronLeft className="w-4 h-4" />}>
          Back to Newsroom
        </Button>
      </Link>

      {/* Article Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={cn(
            'text-xs font-extrabold uppercase px-3 py-1 rounded-full border',
            CATEGORY_STYLES[article.category] || CATEGORY_STYLES.announcement
          )}>
            {article.category.replace('_', ' ')}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(article.published_at).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric'
            })}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="text-gray-300 text-base leading-relaxed font-medium">
            {article.excerpt}
          </p>
        )}

        {/* Author info */}
        {article.author && (
          <div className="flex items-center gap-3 pt-2">
            <Avatar
              src={article.author.avatar_url}
              alt={article.author.username}
              seed={article.author.username}
              size="sm"
            />
            <div>
              <p className="text-xs text-gray-400">Written by</p>
              <p className="text-sm font-bold text-white">@{article.author.username}</p>
            </div>
          </div>
        )}
      </div>

      {/* Cover Image */}
      {article.cover_image_url && (
        <div className="rounded-3xl overflow-hidden glass-card border border-white/10 h-72 sm:h-96 relative">
          {/* eslint-disable-next-html-extension/no-img-element */}
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Article Content */}
      <div className="glass-card rounded-3xl p-8 sm:p-12 border border-white/10 space-y-6 text-gray-200 text-sm sm:text-base leading-relaxed whitespace-pre-line">
        {article.content}
      </div>

      {/* Community Comments & Discussion */}
      <ArticleCommentsSection articleId={article.id} />

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/10">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" /> Related News
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedArticles.map((rel: NewsArticle) => (
              <Link key={rel.id} href={`/news/${rel.slug}`}>
                <div className="glass-card rounded-2xl p-4 border border-white/10 card-hover space-y-2 h-full">
                  <span className="text-[10px] text-gray-500">
                    {new Date(rel.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <h4 className="font-bold text-white text-sm line-clamp-2 hover:text-primary-400 transition-colors">
                    {rel.title}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

import { CommentSection } from '@/components/community/CommentSection';
import {
  fetchArticleComments, addArticleComment, deleteArticleComment,
  getArticleLikes, toggleArticleLike
} from '@/lib/actions/community-actions';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';

function ArticleCommentsSection({ articleId }: { articleId: string }) {
  const { profile: user } = useAuth();
  const qc = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['article-comments', articleId],
    queryFn: () => fetchArticleComments(articleId),
  });

  const { data: likesData = { count: 0, hasLiked: false } } = useQuery({
    queryKey: ['article-likes', articleId, user?.id],
    queryFn: () => getArticleLikes(articleId, user?.id),
  });

  const handleAdd = async (content: string, parentId?: string) => {
    await addArticleComment(articleId, content, parentId);
    qc.invalidateQueries({ queryKey: ['article-comments', articleId] });
  };

  const handleDelete = async (commentId: string) => {
    await deleteArticleComment(commentId);
    qc.invalidateQueries({ queryKey: ['article-comments', articleId] });
  };

  const handleToggleLike = async () => {
    await toggleArticleLike(articleId);
    qc.invalidateQueries({ queryKey: ['article-likes', articleId] });
  };

  return (
    <CommentSection
      comments={comments}
      onAddComment={handleAdd}
      onDeleteComment={handleDelete}
      onToggleLike={handleToggleLike}
      likesCount={likesData.count}
      hasLiked={likesData.hasLiked}
      title="Article Discussion"
      loading={isLoading}
    />
  );
}

