'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Check, CheckCheck, Trophy, Crown, Swords, Zap, Shield, Link as LinkIcon
} from 'lucide-react';
import {
  getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead
} from '@/lib/actions/interaction-actions';
import type { Notification } from '@/lib/types/database';
import Link from 'next/link';

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getMyNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await markAllNotificationsAsRead();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'tournament_started':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'achievement_unlocked':
        return <Crown className="w-4 h-4 text-purple-400" />;
      case 'badge_earned':
        return <Shield className="w-4 h-4 text-blue-400" />;
      case 'points_earned':
        return <Zap className="w-4 h-4 text-emerald-400" />;
      case 'match_reminder':
        return <Swords className="w-4 h-4 text-red-400" />;
      default:
        return <Bell className="w-4 h-4 text-primary-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setOpen(prev => !prev);
          if (!open) loadNotifications();
        }}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-neon border border-gaming-dark animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 glass-card rounded-2xl shadow-glass border border-white/10 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-surface-2/50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-primary-600/30 text-primary-300 border border-primary-500/30">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-primary-400 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-white/5">
              {loading && notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  No notifications yet.
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) handleMarkAsRead(n.id);
                    }}
                    className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 ${
                      n.is_read ? 'bg-transparent opacity-70 hover:opacity-100' : 'bg-primary-600/10 border border-primary-500/20'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-surface-3 shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-white truncate">{n.title}</p>
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                      {n.link_url && (
                        <Link
                          href={n.link_url}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-400 hover:text-primary-300 mt-1.5"
                        >
                          View Details <LinkIcon className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
