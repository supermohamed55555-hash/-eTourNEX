'use server';

import { createClient } from '@/lib/supabase/server';
import type { Profile, Tournament } from '@/lib/types/database';

const SEARCH_LIMIT = 10;

// ─── Search Players ─────────────────────────────────────────────────────

export async function searchPlayers(query: string): Promise<Profile[]> {
  if (!query || query.trim().length < 2) return [];

  const supabase = await createClient();
  const term = query.trim();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .limit(SEARCH_LIMIT)
    .order('username', { ascending: true });

  if (error) {
    console.error('searchPlayers error:', error.message);
    return [];
  }

  return data || [];
}

// ─── Search Tournaments ──────────────────────────────────────────────────

export async function searchTournaments(
  query: string
): Promise<(Tournament & { participants_count: number })[]> {
  if (!query || query.trim().length < 2) return [];

  const supabase = await createClient();
  const term = query.trim();

  const { data, error } = await supabase
    .from('tournaments')
    .select('*, game:games(*), participants:tournament_participants(count)')
    .ilike('name', `%${term}%`)
    .limit(SEARCH_LIMIT)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('searchTournaments error:', error.message);
    return [];
  }

  return (data || []).map((t) => ({
    ...t,
    participants_count: (t.participants as { count: number }[])?.[0]?.count ?? 0,
  }));
}

// ─── Search All ──────────────────────────────────────────────────────────

export interface SearchResults {
  players: Profile[];
  tournaments: (Tournament & { participants_count: number })[];
  total: number;
}

export async function searchAll(query: string): Promise<SearchResults> {
  if (!query || query.trim().length < 2) {
    return { players: [], tournaments: [], total: 0 };
  }

  // Run both queries in parallel
  const [players, tournaments] = await Promise.all([
    searchPlayers(query),
    searchTournaments(query),
  ]);

  return {
    players,
    tournaments,
    total: players.length + tournaments.length,
  };
}
