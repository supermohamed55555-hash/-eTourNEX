'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { MessageSquare, Heart, Reply, Trash2, Send, CornerDownRight } from 'lucide-react';
import { timeAgo, cn } from '@/lib/utils';
import type { ArticleComment, TournamentComment } from '@/lib/types/database';

type GenericComment = ArticleComment | TournamentComment;

interface CommentSectionProps {
  comments: GenericComment[];
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onToggleLike?: () => Promise<void>;
  likesCount?: number;
  hasLiked?: boolean;
  title?: string;
  loading?: boolean;
}

function CommentItem({
  comment,
  onAddComment,
  onDeleteComment,
  currentUserId,
  isAdmin,
}: {
  comment: GenericComment;
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(replyText, comment.id);
      setReplyText('');
      setReplyOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const canDelete = currentUserId && (comment.player_id === currentUserId || isAdmin);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:border-white/10 transition-all">
        <Avatar
          src={comment.player?.avatar_url}
          alt={comment.player?.username || '?'}
          seed={comment.player?.username}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {comment.player?.display_name || comment.player?.username || 'Player'}
              </span>
              <span className="text-xs text-gray-500">@{comment.player?.username}</span>
              <span className="text-xs text-gray-600">• {timeAgo(comment.created_at)}</span>
            </div>

            {canDelete && onDeleteComment && (
              <button
                onClick={() => onDeleteComment(comment.id)}
                className="text-gray-600 hover:text-red-400 p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Delete comment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="text-sm text-gray-300 mt-1 leading-relaxed whitespace-pre-line">
            {comment.content}
          </p>

          <div className="flex items-center gap-4 mt-2 pt-2">
            <button
              onClick={() => setReplyOpen(v => !v)}
              className="text-xs text-gray-400 hover:text-primary-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <Reply className="w-3.5 h-3.5" /> Reply
            </button>
          </div>

          {/* Reply Input Form */}
          {replyOpen && (
            <form onSubmit={handleReply} className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder={`Reply to @${comment.player?.username}...`}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                className="input text-xs py-2 px-3 flex-1"
                autoFocus
              />
              <Button type="submit" size="sm" loading={submitting} disabled={!replyText.trim()}>
                Reply
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-6 sm:pl-8 space-y-3 border-l-2 border-primary-500/20 ml-4">
          {comment.replies.map(reply => (
            <div key={reply.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <Avatar
                src={reply.player?.avatar_url}
                alt={reply.player?.username || '?'}
                seed={reply.player?.username}
                size="xs"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {reply.player?.display_name || reply.player?.username}
                    </span>
                    <span className="text-[10px] text-gray-600">• {timeAgo(reply.created_at)}</span>
                  </div>

                  {currentUserId && (reply.player_id === currentUserId || isAdmin) && onDeleteComment && (
                    <button
                      onClick={() => onDeleteComment(reply.id)}
                      className="text-gray-600 hover:text-red-400 p-1 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  {reply.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({
  comments,
  onAddComment,
  onDeleteComment,
  onToggleLike,
  likesCount = 0,
  hasLiked = false,
  title = 'Community Discussion',
  loading = false,
}: CommentSectionProps) {
  const { profile: user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLikeToggle() {
    if (!onToggleLike) return;
    setLikeLoading(true);
    try {
      await onToggleLike();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLikeLoading(false);
    }
  }

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-400" />
          {title}
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-3 text-gray-400 font-bold">
            {comments.length}
          </span>
        </h3>

        {onToggleLike && (
          <Button
            variant={hasLiked ? 'primary' : 'ghost'}
            size="sm"
            onClick={handleLikeToggle}
            loading={likeLoading}
            icon={<Heart className={cn('w-4 h-4', hasLiked && 'fill-white')} />}
          >
            {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
          </Button>
        )}
      </div>

      {/* Add Main Comment Input */}
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="Share your thoughts or join the discussion..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              disabled={!newComment.trim()}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Post Comment
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-2xl bg-surface-2 border border-white/5 text-center text-xs text-gray-400">
          Please log in to join the conversation and post comments.
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4 pt-2">
        {loading ? (
          <p className="text-xs text-gray-500 text-center py-4">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">
            No comments yet. Be the first to start the discussion!
          </p>
        ) : (
          comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              onAddComment={onAddComment}
              onDeleteComment={onDeleteComment}
              currentUserId={user?.id}
              isAdmin={user?.role === 'admin'}
            />
          ))
        )}
      </div>
    </div>
  );
}
