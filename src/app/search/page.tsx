'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { searchAll } from '@/lib/actions/search-actions';
import type { SearchResults } from '@/lib/actions/search-actions';
import {
  Search, Users, Trophy, X, ChevronRight,
  Gamepad2, Calendar, Globe, Swords,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'all' | 'players' | 'tournaments';

const STATUS_CONFIG = {
  registration: { label: 'Open',      class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  in_progress:  { label: 'Live',      class: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  completed:    { label: 'Ended',     class: 'text-gray-400 bg-gray-500/10 border-gray-500/30' },
  cancelled:    { label: 'Cancelled', class: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
};

export default function SearchPage() {
  const [query, setQuery]         = useState('');
  const [tab, setTab]             = useState<Tab>('all');
  const [results, setResults]     = useState<SearchResults>({ players: [], tournaments: [], total: 0 });
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  /* ── Auto-focus on mount ── */
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* ── Debounced search ── */
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults({ players: [], tournaments: [], total: 0 });
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchAll(q);
      setResults(data);
      setSearched(true);
    } catch {
      setResults({ players: [], tournaments: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  /* ── Filtered results ── */
  const displayedPlayers     = tab === 'tournaments' ? [] : results.players;
  const displayedTournaments = tab === 'players'     ? [] : results.tournaments;
  const hasResults           = displayedPlayers.length > 0 || displayedTournaments.length > 0;

  /* ── Tab counts ── */
  const counts = {
    all:         results.players.length + results.tournaments.length,
    players:     results.players.length,
    tournaments: results.tournaments.length,
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="text-center mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300 text-xs font-bold">
          <Search className="w-3.5 h-3.5" /> GLOBAL SEARCH
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white">
          Find <span className="brand-text">Players</span> &amp; <span className="brand-text">Tournaments</span>
        </h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Search across the entire eTourNEX platform in real-time.
        </p>
      </div>

      {/* ── Search Input ── */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players, tournaments…"
          className="w-full pl-12 pr-12 py-4 bg-surface-2 border border-white/10 rounded-2xl text-white placeholder-gray-500
                     focus:outline-none focus:border-primary-500 focus:shadow-[0_0_0_2px_rgba(139,92,246,0.2)]
                     text-base transition-all duration-200"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center
                       rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Tabs (only show when there are results) ── */}
      <AnimatePresence>
        {searched && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex gap-2 mb-8"
          >
            {(['all', 'players', 'tournaments'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  tab === t
                    ? 'bg-primary-600/20 border border-primary-500/40 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                )}
              >
                {t === 'all'         && <Search className="w-3.5 h-3.5" />}
                {t === 'players'     && <Users className="w-3.5 h-3.5" />}
                {t === 'tournaments' && <Trophy className="w-3.5 h-3.5" />}
                <span className="capitalize">{t}</span>
                {counts[t] > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-primary-500/20 text-primary-300 text-[10px] font-bold">
                    {counts[t]}
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading Skeleton ── */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty / Intro State ── */}
      {!loading && !searched && (
        <div className="text-center py-20 space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-surface-2 border border-white/10 flex items-center justify-center">
            <Search className="w-9 h-9 text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm">Type at least 2 characters to search.</p>
          <div className="flex justify-center gap-6 pt-2">
            <div className="flex items-center gap-2 text-gray-600 text-xs">
              <Users className="w-4 h-4" /> Players
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-xs">
              <Trophy className="w-4 h-4" /> Tournaments
            </div>
          </div>
        </div>
      )}

      {/* ── No Results ── */}
      {!loading && searched && !hasResults && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 space-y-4"
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-surface-2 border border-white/10 flex items-center justify-center">
            <Swords className="w-9 h-9 text-gray-600" />
          </div>
          <p className="text-white font-semibold">No results for &quot;{query}&quot;</p>
          <p className="text-gray-500 text-sm">Try a different player name or tournament title.</p>
        </motion.div>
      )}

      {/* ── Results ── */}
      {!loading && hasResults && (
        <div className="space-y-8">

          {/* Players Section */}
          {displayedPlayers.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4" /> Players
                  <span className="text-xs text-gray-600 normal-case font-normal">
                    ({displayedPlayers.length} found)
                  </span>
                </h2>
                <Link href="/players" className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1">
                  All Players <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {displayedPlayers.map((player, i) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={`/players/${player.username}`}
                      className="flex items-center gap-4 p-4 glass-card rounded-2xl border border-white/5
                                 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all group"
                    >
                      <Avatar
                        src={player.avatar_url}
                        alt={player.username}
                        seed={player.username}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white group-hover:text-primary-300 transition-colors truncate">
                          {player.display_name || player.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate">@{player.username}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {player.country && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Globe className="w-3 h-3" /> {player.country}
                          </span>
                        )}
                        <Badge variant={player.role === 'admin' ? 'admin' : 'player'}>
                          {player.role}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary-400 transition-colors" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Tournaments Section */}
          {displayedTournaments.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Tournaments
                  <span className="text-xs text-gray-600 normal-case font-normal">
                    ({displayedTournaments.length} found)
                  </span>
                </h2>
                <Link href="/tournaments" className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1">
                  All Tournaments <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {displayedTournaments.map((tournament, i) => {
                  const statusCfg = STATUS_CONFIG[tournament.status] ?? STATUS_CONFIG.completed;
                  return (
                    <motion.div
                      key={tournament.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link
                        href={`/tournaments/${tournament.id}`}
                        className="flex items-center gap-4 p-4 glass-card rounded-2xl border border-white/5
                                   hover:border-primary-500/30 hover:bg-primary-500/5 transition-all group"
                      >
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600/20 to-secondary-600/20
                                        border border-primary-500/20 flex items-center justify-center shrink-0">
                          {tournament.game?.icon_url ? (
                            <img
                              src={tournament.game.icon_url}
                              alt={tournament.game.name}
                              className="w-7 h-7 object-contain"
                            />
                          ) : (
                            <Gamepad2 className="w-5 h-5 text-primary-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white group-hover:text-primary-300 transition-colors truncate">
                            {tournament.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {tournament.game && (
                              <span className="text-xs text-gray-500">{tournament.game.name}</span>
                            )}
                            {tournament.starts_at && (
                              <span className="flex items-center gap-1 text-xs text-gray-600">
                                <Calendar className="w-3 h-3" />
                                {new Date(tournament.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={cn(
                            'text-[11px] font-bold px-2 py-0.5 rounded-lg border',
                            statusCfg.class
                          )}>
                            {statusCfg.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {tournament.participants_count}/{tournament.max_players ?? '∞'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary-400 transition-colors" />
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
