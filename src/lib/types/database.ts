export type UserRole = 'admin' | 'player' | 'organizer';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  country: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: UserRole;
  email_confirmed: boolean;
  email?: string | null;
  created_at: string;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  category: string;
  publisher: string | null;
  icon_url: string | null;
  banner_url: string | null;
  color?: string | null;
  is_active: boolean;
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
  max_participants?: number;
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
  points: number;
  updated_at: string;
  profile?: Profile;
}

export type PointReason = 'match_win' | 'tournament_participation' | 'tournament_champion' | 'achievement_bonus';

export interface PointsTransaction {
  id: string;
  player_id: string;
  points: number;
  reason: PointReason;
  reference_id: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points_reward: number;
  created_at: string;
}

export interface PlayerAchievement {
  id: string;
  player_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface PlayerBadge {
  id: string;
  player_id: string;
  badge_id: string;
  granted_at: string;
  badge?: Badge;
}

export type NotificationType =
  | 'match_reminder'
  | 'tournament_started'
  | 'achievement_unlocked'
  | 'badge_earned'
  | 'points_earned'
  | 'team_invite'
  | 'team_request'
  | 'team_accepted'
  | 'system';

export interface Notification {
  id: string;
  player_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  link_url: string | null;
  reference_id: string | null;
  created_at: string;
}

export type DisputeStatus = 'open' | 'resolved' | 'dismissed';

export type ClipCategory = 'highlight' | 'clutch' | 'guide' | 'funny';

export interface CommunityClip {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  game_id: string | null;
  player_id: string;
  likes_count: number;
  category: ClipCategory;
  created_at: string;
  player?: Profile;
  game?: Game;
  user_has_liked?: boolean;
}

export type NewsCategory = 'announcement' | 'patch_notes' | 'esports_news' | 'community';

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: NewsCategory;
  author_id: string | null;
  is_published: boolean;
  is_featured?: boolean;
  published_at: string;
  created_at: string;
  author?: Profile;
}

export type SponsorTier = 'title' | 'platinum' | 'gold' | 'silver' | 'partner';

export interface Sponsor {
  id: string;
  name: string;
  tier: SponsorTier;
  logo_url: string;
  website_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MatchDispute {
  id: string;
  match_id: string;
  reported_by: string;
  reason: string;
  status: DisputeStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  match?: Match;
  reporter?: Profile;
  resolver?: Profile;
}

// ─── Teams ────────────────────────────────────────────────────────────

export type TeamMemberRole = 'captain' | 'officer' | 'member';

export type TeamInvitationType = 'invite' | 'request';

export type TeamInvitationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface Team {
  id: string;
  name: string;
  slug: string;
  tag: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  country: string | null;
  captain_id: string;
  is_recruiting: boolean;
  wins: number;
  losses: number;
  tournaments_played: number;
  tournaments_won: number;
  created_at: string;
  updated_at: string;
  captain?: Profile;
  members?: TeamMember[];
  members_count?: number;
}

export interface TeamMember {
  id: string;
  team_id: string;
  player_id: string;
  role: TeamMemberRole;
  joined_at: string;
  profile?: Profile;
  team?: Team;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  player_id: string;
  invited_by: string | null;
  type: TeamInvitationType;
  status: TeamInvitationStatus;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  team?: Team;
  player?: Profile;
  inviter?: Profile;
}

// ─── Community Interactions ────────────────────────────────────────────

export interface ArticleLike {
  id: string;
  article_id: string;
  player_id: string;
  created_at: string;
}

export interface ArticleComment {
  id: string;
  article_id: string;
  player_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  player?: Profile;
  replies?: ArticleComment[];
}

export interface TournamentLike {
  id: string;
  tournament_id: string;
  player_id: string;
  created_at: string;
}

export interface TournamentComment {
  id: string;
  tournament_id: string;
  player_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  player?: Profile;
  replies?: TournamentComment[];
}
