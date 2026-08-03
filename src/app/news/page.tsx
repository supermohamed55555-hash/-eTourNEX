'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchNewsArticles } from '@/lib/actions/news-actions';
import type { NewsArticle, NewsCategory } from '@/lib/types/database';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Newspaper, Search, Calendar, ChevronRight, Sparkles, Tag,
  Megaphone, Shield, Flame, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all',          label: 'All Updates' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'patch_notes',  label: 'Patch Notes' },
  { id: 'esports_news', label: 'Esports News' },
  { id: 'community',    label: 'Community' },
];

const CATEGORY_STYLES: Record<string, string> = {
  announcement: 'border-purple-500/30 text-purple-300 bg-purple-500/10',
  patch_notes:  'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
  esports_news: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
  community:    'border-sky-500/30 text-sky-300 bg-sky-500/10',
};

export default function NewsIndexPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch]                       = useState('');

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['news-public', selectedCategory],
    queryFn: () => fetchNewsArticles(selectedCategory),
  });

  const filtered = articles.filter((a: NewsArticle) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.excerpt && a.excerpt.toLowerCase().includes(search.toLowerCase()))
  );

  const featured = filtered[0];
  const regularList = filtered.slice(1);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">

      {/* ── Header Banner ── */}
      <div className="relative rounded-3xl overflow-hidden glass-card p-8 sm:p-12 border border-white/10">
        <div className="absolute inset-0 bg-hero-mesh opacity-60" />
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <Newspaper className="w-3.5 h-3.5" /> PLATFORM NEWS & ANNOUNCEMENTS
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Esports <span className="brand-text">Newsroom</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Stay updated with season launches, tournament recaps, platform updates, and competitive esports rules.
          </p>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border',
                selectedCategory === cat.id
                  ? 'bg-primary-600/30 border-primary-500/50 text-white shadow-purple-glow-sm'
                  : 'glass text-gray-400 hover:text-white border-white/5 hover:border-white/15'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search news..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* ── Loading Skeleton ── */}
      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-80 w-full rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        </div>
      )}

      {/* ── Featured Article Banner ── */}
      {!isLoading && featured && (
        <Link href={`/news/${featured.slug}`}>
          <div className="glass-card rounded-3xl border border-white/10 overflow-hidden group card-hover relative flex flex-col lg:flex-row">
            {featured.cover_image_url && (
              <div className="lg:w-1/2 h-64 lg:h-auto relative overflow-hidden bg-surface-2">
                {/* eslint-disable-next-html-extension/no-img-element */}
                <img
                  src={featured.cover_image_url}
                  alt={featured.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gaming-dark/90 via-transparent to-transparent lg:hidden" />
              </div>
            )}
            <div className="p-8 lg:p-12 lg:w-1/2 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border',
                    CATEGORY_STYLES[featured.category] || CATEGORY_STYLES.announcement
                  )}>
                    {featured.category.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(featured.published_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-primary-400 transition-colors leading-tight">
                  {featured.title}
                </h2>

                {featured.excerpt && (
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                    {featured.excerpt}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                {featured.author ? (
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={featured.author.avatar_url}
                      alt={featured.author.username}
                      seed={featured.author.username}
                      size="xs"
                    />
                    <span className="text-xs text-gray-300 font-semibold">@{featured.author.username}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">eTourNEX Staff</span>
                )}

                <span className="text-xs font-bold text-primary-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Read Full Article <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ── Articles Grid ── */}
      {!isLoading && (
        <div>
          {regularList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularList.map((article: NewsArticle) => (
                <Link key={article.id} href={`/news/${article.slug}`}>
                  <div className="glass-card rounded-2xl border border-white/10 overflow-hidden group card-hover flex flex-col h-full">
                    {article.cover_image_url && (
                      <div className="h-44 overflow-hidden bg-surface-2 relative">
                        {/* eslint-disable-next-html-extension/no-img-element */}
                        <img
                          src={article.cover_image_url}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1 justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border',
                            CATEGORY_STYLES[article.category] || CATEGORY_STYLES.announcement
                          )}>
                            {article.category.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(article.published_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric'
                            })}
                          </span>
                        </div>

                        <h3 className="font-bold text-lg text-white group-hover:text-primary-400 transition-colors line-clamp-2">
                          {article.title}
                        </h3>

                        {article.excerpt && (
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                            {article.excerpt}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                        <span className="text-gray-500">
                          {article.author ? `@${article.author.username}` : 'Staff'}
                        </span>
                        <span className="font-bold text-primary-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                          Read <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : !featured && (
            <div className="text-center py-20 glass-card rounded-3xl border border-white/5 space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-gray-600" />
              <h3 className="text-xl font-bold text-white">No Articles Found</h3>
              <p className="text-gray-400 text-sm">No updates posted for this category yet.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
