export type UserRole = 'admin' | 'player';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  country: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: UserRole;
  email_confirmed: boolean;
  created_at: string;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  created_at: string;
}

export type TournamentFormat = 'single_elimination';

export type TournamentStatus = 'registration' | 'in_progress' | 'completed' | 'cancelled';

export interface Tournament {
  id: string;
  game_id: string | null;
  name: string;
  description: string | null;
  rules: string | null;
  banner_url: string | null;
  prize_pool: string | null;
  format: TournamentFormat;
  status: TournamentStatus;
  max_players: number | null;
  starts_at: string | null;
  created_by: string | null;
  created_at: string;
  game?: Game | null;
  participants_count?: number;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  player_id: string;
  seed: number | null;
  eliminated: boolean;
  joined_at: string;
  profile?: Profile;
}

export type MatchStatus = 'scheduled' | 'pending_review' | 'confirmed' | 'disputed' | 'cancelled';

export interface Match {
  id: string;
  tournament_id: string;
  round_name: string | null;
  round_order: number;
  player_a_id: string | null;
  player_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_id: string | null;
  status: MatchStatus;
  proof_screenshot_url: string | null;
  reported_by: string | null;
  confirmed_by: string | null;
  next_match_id: string | null;
  scheduled_for: string | null;
  created_at: string;
  player_a?: TournamentParticipant | null;
  player_b?: TournamentParticipant | null;
  winner?: TournamentParticipant | null;
  reporter?: Profile | null;
}

export interface LeaderboardEntry {
  id: string;
  player_id: string;
  wins: number;
  losses: number;
  tournaments_played: number;
  tournaments_won: number;
  updated_at: string;
  profile?: Profile;
}
