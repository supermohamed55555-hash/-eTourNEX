'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { notFound } from 'next/navigation';
import { fetchNewsArticles, createNewsArticle, updateNewsArticle, deleteNewsArticle } from '@/lib/actions/news-actions';
import type { NewsArticle, NewsCategory } from '@/lib/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Newspaper, Plus, Edit2, Trash2, CheckCircle2, XCircle,
  ExternalLink, Shield, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AdminNewsPage() {
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen]     = useState(false);
  const [editArticle, setEditArticle] = useState<NewsArticle | null>(null);

  // Form State
  const [title, setTitle]             = useState('');
  const [category, setCategory]       = useState<NewsCategory>('announcement');
  const [excerpt, setExcerpt]         = useState('');
  const [content, setContent]         = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured]   = useState(false);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['admin-news'],
    queryFn: () => fetchNewsArticles('all', 50),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createNewsArticle({
        title,
        category,
        excerpt: excerpt || null,
        content,
        cover_image_url: coverImageUrl || null,
        is_published: isPublished,
        is_featured: isFeatured,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      queryClient.invalidateQueries({ queryKey: ['news-public'] });
      closeModal();
    },
    onError: (err: any) => setErrorMsg(err.message || 'Failed to publish article.'),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateNewsArticle(editArticle!.id, {
        title,
        category,
        excerpt: excerpt || null,
        content,
        cover_image_url: coverImageUrl || null,
        is_published: isPublished,
        is_featured: isFeatured,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      queryClient.invalidateQueries({ queryKey: ['news-public'] });
      closeModal();
    },
    onError: (err: any) => setErrorMsg(err.message || 'Failed to update article.'),
  });

  const togglePublishMut = useMutation({
    mutationFn: (a: NewsArticle) =>
      updateNewsArticle(a.id, { is_published: !a.is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      queryClient.invalidateQueries({ queryKey: ['news-public'] });
    },
  });

  const toggleFeaturedMut = useMutation({
    mutationFn: (a: NewsArticle) =>
      updateNewsArticle(a.id, { is_featured: !a.is_featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      queryClient.invalidateQueries({ queryKey: ['news-public'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteNewsArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      queryClient.invalidateQueries({ queryKey: ['news-public'] });
    },
  });

  if (currentUser && currentUser.role !== 'admin') {
    return notFound();
  }

  const openCreateModal = () => {
    setEditArticle(null);
    setTitle('');
    setCategory('announcement');
    setExcerpt('');
    setContent('');
    setCoverImageUrl('');
    setIsPublished(true);
    setIsFeatured(false);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (a: NewsArticle) => {
    setEditArticle(a);
    setTitle(a.title);
    setCategory(a.category);
    setExcerpt(a.excerpt || '');
    setContent(a.content);
    setCoverImageUrl(a.cover_image_url || '');
    setIsPublished(a.is_published);
    setIsFeatured(!!a.is_featured);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditArticle(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
            <Newspaper className="w-3.5 h-3.5" /> CONTENT MANAGEMENT
          </div>
          <h1 className="text-3xl font-black text-white">
            News & <span className="brand-text">Announcements</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Publish platform updates, patch notes, and esports news.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/news" target="_blank">
            <Button variant="ghost" icon={<ExternalLink className="w-4 h-4" />}>
              View Live Feed
            </Button>
          </Link>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
            Publish Article
          </Button>
        </div>
      </div>

      {/* Articles List */}
      <Card>
        <CardHeader>
          <CardTitle>All Articles ({articles.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-gray-400 font-bold">No news articles published yet.</p>
              <Button variant="primary" size="sm" onClick={openCreateModal}>Publish First Article</Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {articles.map((a: NewsArticle) => (
                <div
                  key={a.id}
                  className={cn(
                    'p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white/[0.02]',
                    !a.is_published && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {a.cover_image_url ? (
                        /* eslint-disable-next-html-extension/no-img-element */
                        <img src={a.cover_image_url} alt={a.title} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <Newspaper className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-white text-base">{a.title}</h3>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-purple-500/30 text-purple-300 bg-purple-500/10">
                          {a.category.replace('_', ' ')}
                        </span>
                        {a.is_featured && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Featured
                          </span>
                        )}
                        {!a.is_published && (
                          <span className="text-[10px] font-bold text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-full border border-gray-500/20">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Published {new Date(a.published_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleFeaturedMut.mutate(a)}
                      title={a.is_featured ? 'Unfeature' : 'Set as Featured'}
                    >
                      <Star className={cn('w-4 h-4', a.is_featured ? 'text-amber-400 fill-amber-400' : 'text-gray-600')} />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => togglePublishMut.mutate(a)}
                      title={a.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {a.is_published ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-500" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => openEditModal(a)}
                    >
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => {
                        if (confirm(`Delete article "${a.title}"?`)) deleteMut.mutate(a.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          title={editArticle ? 'Edit Article' : 'Publish New Article'}
          open={modalOpen}
          onClose={closeModal}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <Input
              label="Article Title *"
              placeholder="e.g. eTourNEX Season 4 Launch"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as NewsCategory)}
                className="input w-full"
              >
                <option value="announcement">Announcement</option>
                <option value="patch_notes">Patch Notes</option>
                <option value="esports_news">Esports News</option>
                <option value="community">Community</option>
              </select>
            </div>

            <Textarea
              label="Summary / Excerpt (optional)"
              placeholder="Short 1-2 sentence preview for feed cards..."
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              rows={2}
            />

            <Textarea
              label="Article Body Content *"
              placeholder="Full article body text..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
            />

            <Input
              label="Cover Image URL (optional)"
              placeholder="https://images.unsplash.com/..."
              value={coverImageUrl}
              onChange={e => setCoverImageUrl(e.target.value)}
            />

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-300">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={e => setIsPublished(e.target.checked)}
                  className="rounded border-white/20 bg-surface-2 text-primary-600 focus:ring-primary-500"
                />
                Publish Immediately
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-300">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={e => setIsFeatured(e.target.checked)}
                  className="rounded border-white/20 bg-surface-2 text-amber-500 focus:ring-amber-400"
                />
                Set as Featured Headline
              </label>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => editArticle ? updateMut.mutate() : createMut.mutate()}
                disabled={createMut.isPending || updateMut.isPending || !title.trim() || !content.trim()}
              >
                {createMut.isPending || updateMut.isPending ? 'Publishing…' : editArticle ? 'Save Changes' : 'Publish Article'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
