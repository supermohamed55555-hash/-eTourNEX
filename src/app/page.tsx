'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import HeroParticles from '@/components/gaming/HeroParticles';
import TournamentCard from '@/components/gaming/TournamentCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useQuery } from '@tanstack/react-query';
import { fetchTournaments, fetchLeaderboard } from '@/lib/bracket/engine';
import {
  Trophy, Users, Gamepad2, Zap, ChevronRight, Star,
  Shield, TrendingUp, Calendar, Globe, Award, Flame,
  BarChart3, Play, ArrowRight
} from 'lucide-react';

/* ── Animated counter ─────────────────────────────────── */
function Counter({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const start = Date.now();
    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(ease * to));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{val >= 1000 ? `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}K` : val}{suffix}
    </span>
  );
}

/* ── Section fade-up wrapper ──────────────────────────── */
function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── PLATFORM STATS ────────────────────────────────────── */
const STATS = [
  { icon: Trophy,  label: 'Tournaments Hosted', value: 1240, suffix: '+', color: 'text-primary-400',   bg: 'bg-primary-500/10'  },
  { icon: Users,   label: 'Active Players',     value: 48000, suffix: '+', color: 'text-secondary-400', bg: 'bg-secondary-500/10' },
  { icon: Globe,   label: 'Countries',          value: 82,    suffix: '',  color: 'text-accent-neon',   bg: 'bg-accent-neon/10'  },
  { icon: Award,   label: 'Prize Pool Paid',    value: 250,  prefix: '$', suffix: 'K+', color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

/* ── FEATURES ──────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Trophy,
    title: 'Competitive Brackets',
    desc: 'Single elimination, double elimination, round-robin — powered by our precision bracket engine.',
    color: 'from-primary-600/20 to-primary-900/5',
    iconColor: 'text-primary-400',
  },
  {
    icon: Shield,
    title: 'Verified Results',
    desc: 'Match results require screenshot proof, eliminating cheating and ensuring fair competition.',
    color: 'from-secondary-600/20 to-secondary-900/5',
    iconColor: 'text-secondary-400',
  },
  {
    icon: BarChart3,
    title: 'Live Leaderboards',
    desc: 'Real-time rankings updated instantly as matches conclude. Climb to the top.',
    color: 'from-accent-neon/10 to-emerald-900/5',
    iconColor: 'text-accent-neon',
  },
  {
    icon: Gamepad2,
    title: 'Multi-Game Support',
    desc: 'eFootball, FIFA, Rocket League, Valorant — one platform for all your competitive games.',
    color: 'from-amber-600/15 to-amber-900/5',
    iconColor: 'text-amber-400',
  },
];

import { GameFilter } from '@/components/games/GameFilter';

export default function HomePage() {
  const [selectedGameId, setSelectedGameId] = useState('all');

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments,
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
  });

  const players = leaderboard.slice(0, 6).map(lb => ({
    ...lb.profile!,
    wins:   lb.wins,
    losses: lb.losses,
    id:     lb.profile?.id ?? lb.player_id,
  })).filter(p => p.username);

  const filteredTournaments = selectedGameId === 'all'
    ? tournaments
    : tournaments.filter(t => t.game_id === selectedGameId || t.game?.slug === selectedGameId);

  const featured = filteredTournaments.filter(t => t.status === 'registration' || t.status === 'in_progress').slice(0, 6);
  const upcoming = filteredTournaments.filter(t => t.status === 'registration').slice(0, 6);

  return (
    <div className="overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Mesh gradient bg */}
        <div className="absolute inset-0 bg-hero-mesh" />
        <div className="absolute inset-0 bg-hero-radial" />

        {/* Particles */}
        <HeroParticles />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center py-24">
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary-500/30 text-primary-300 text-xs font-bold mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-neon animate-pulse" />
            PLATFORM NOW LIVE — SEASON 4 TOURNAMENTS OPEN
            <Flame className="w-3.5 h-3.5 text-accent-neon" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 leading-none"
          >
            Where Champions{' '}
            <span className="brand-text block sm:inline">Are Made</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Join <span className="text-white font-semibold">48,000+ players</span> competing in professional esports tournaments.
            Build your legacy, win prizes, and rise to the top.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/tournaments"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-purple-glow hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
            >
              <Zap className="w-5 h-5" />
              Browse Tournaments
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base glass border border-white/15 text-white hover:border-primary-500/50 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Create Account
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-14 flex items-center justify-center gap-6 flex-wrap"
          >
            <div className="flex -space-x-2.5">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="w-9 h-9 rounded-full border-2 border-gaming-dark overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=hero${i}`} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="text-xs text-gray-500 font-medium">Trusted by 48K+ competitive players worldwide</span>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] text-gray-600 uppercase tracking-widest">Scroll to explore</span>
          <div className="w-5 h-8 rounded-full border border-white/15 flex items-start justify-center pt-2">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1 h-2 rounded-full bg-primary-400"
            />
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════
          PLATFORM STATS
      ═══════════════════════════════════════════════════ */}
      <section className="py-20 border-y border-white/08 bg-surface/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <FadeUp key={s.label} delay={i * 0.1}>
                <div className="flex flex-col items-center text-center gap-3 p-6 glass-card rounded-2xl">
                  <div className={cn('p-3 rounded-2xl', s.bg)}>
                    <s.icon className={cn('w-6 h-6', s.color)} />
                  </div>
                  <div>
                    <p className={cn('text-3xl font-black', s.color)}>
                      {s.prefix && <span>{s.prefix}</span>}
                      <Counter to={s.value} suffix={s.suffix} />
                    </p>
                    <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FEATURED / LIVE TOURNAMENTS
      ═══════════════════════════════════════════════════ */}
      {featured.length > 0 && (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
          <FadeUp>
            <div className="section-header mb-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-accent-neon animate-pulse" />
                  <span className="text-xs font-bold text-accent-neon uppercase tracking-widest">Active Now</span>
                </div>
                <h2 className="text-3xl font-black text-white">Live & Open <span className="purple-text">Tournaments</span></h2>
              </div>
              <Link href="/tournaments" className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-400 font-semibold transition-colors">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeUp>

          <div className="mb-6">
            <GameFilter selectedGameId={selectedGameId} onSelectGame={setSelectedGameId} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((t, i) => (
              <TournamentCard key={t.id} tournament={t as any} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          FEATURES GRID
      ═══════════════════════════════════════════════════ */}
      <section className="py-20 bg-surface/30 border-y border-white/08">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <FadeUp className="text-center mb-14">
            <span className="text-xs font-bold text-primary-400 uppercase tracking-widest">Built for Competitors</span>
            <h2 className="text-3xl font-black text-white mt-2">
              Everything You Need to <span className="brand-text">Compete</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-lg mx-auto text-sm">
              A complete competitive gaming ecosystem built from the ground up for professional play.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.1}>
                <div className={cn(
                  'h-full p-6 rounded-2xl bg-gradient-to-br border border-white/08 glass-card card-hover flex flex-col gap-4',
                  f.color
                )}>
                  <div className={cn('p-3 rounded-2xl w-fit', f.iconColor, 'bg-white/5')}>
                    <f.icon className={cn('w-6 h-6', f.iconColor)} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TOP PLAYERS
      ═══════════════════════════════════════════════════ */}
      {players.length > 0 && (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
          <FadeUp>
            <div className="section-header mb-10">
              <div>
                <span className="text-xs font-bold text-primary-400 uppercase tracking-widest">Global Rankings</span>
                <h2 className="text-3xl font-black text-white mt-1">Top <span className="purple-text">Players</span></h2>
              </div>
              <Link href="/leaderboard" className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-400 font-semibold transition-colors">
                Full Leaderboard <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeUp>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {players.map((p, i) => {
              const winRate = p.losses > 0 || p.wins > 0
                ? Math.round((p.wins / (p.wins + p.losses)) * 100)
                : 0;
              return (
                <FadeUp key={p.id} delay={i * 0.06}>
                  <Link href={`/players/${p.username}`} className="block group">
                    <div className="glass-card rounded-2xl p-4 flex flex-col items-center gap-3 text-center card-hover">
                      {/* Rank badge */}
                      <div className="relative">
                        {i < 3 && (
                          <span className={cn(
                            'absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black z-10',
                            i === 0 && 'bg-amber-400 text-black',
                            i === 1 && 'bg-slate-400 text-black',
                            i === 2 && 'bg-amber-700 text-white',
                          )}>
                            #{i + 1}
                          </span>
                        )}
                        <Avatar
                          src={p.avatar_url}
                          alt={p.username}
                          size="lg"
                          seed={p.username}
                          rank={i + 1}
                          verified={p.email_confirmed}
                        />
                      </div>

                      <div>
                        <p className="font-bold text-white text-xs group-hover:text-primary-300 transition-colors truncate max-w-full">
                          {p.username}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{p.wins}W/{p.losses}L</p>
                      </div>

                      <div className="w-full pt-2 border-t border-white/10">
                        <p className={cn('text-sm font-black', winRate >= 70 ? 'text-accent-neon' : winRate >= 50 ? 'text-secondary-400' : 'text-gray-400')}>
                          {winRate}%
                        </p>
                        <p className="text-[10px] text-gray-600">win rate</p>
                      </div>
                    </div>
                  </Link>
                </FadeUp>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          UPCOMING TOURNAMENTS GRID
      ═══════════════════════════════════════════════════ */}
      {upcoming.length > 0 && (
        <section className="py-20 bg-surface/30 border-t border-white/08">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <FadeUp className="section-header mb-10">
              <div>
                <span className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Registration Open</span>
                <h2 className="text-3xl font-black text-white mt-1">Upcoming <span className="purple-text">Events</span></h2>
              </div>
              <Link href="/tournaments" className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-400 font-semibold transition-colors">
                See All Events <ChevronRight className="w-4 h-4" />
              </Link>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {upcoming.map((t, i) => (
                <TournamentCard key={t.id} tournament={t as any} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════════ */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <FadeUp className="text-center mb-14">
          <span className="text-xs font-bold text-accent-neon uppercase tracking-widest">Simple Process</span>
          <h2 className="text-3xl font-black text-white mt-2">How It <span className="brand-text">Works</span></h2>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', icon: Gamepad2, title: 'Create Account', desc: 'Sign up in seconds and complete your gaming profile to unlock the competitive ecosystem.', color: 'text-primary-400' },
            { step: '02', icon: Trophy, title: 'Join a Tournament', desc: 'Browse open tournaments for your favorite game and register before spots fill up.', color: 'text-secondary-400' },
            { step: '03', icon: TrendingUp, title: 'Compete & Climb', desc: 'Submit match results with screenshot proof and climb the global leaderboard.', color: 'text-accent-neon' },
          ].map((item, i) => (
            <FadeUp key={item.step} delay={i * 0.15}>
              <div className="relative flex flex-col gap-5 p-7 glass-card rounded-2xl h-full">
                <span className="absolute top-5 right-5 text-5xl font-black text-white/[0.04] select-none">{item.step}</span>
                <div className={cn('p-3.5 rounded-2xl bg-white/5 w-fit')}>
                  <item.icon className={cn('w-7 h-7', item.color)} />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          CTA BANNER
      ═══════════════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6">
        <FadeUp>
          <div className="max-w-4xl mx-auto relative overflow-hidden rounded-3xl">
            {/* BG */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600/40 via-secondary-700/30 to-primary-900/60" />
            <div className="absolute inset-0 bg-hero-mesh opacity-50" />
            <div className="absolute inset-0 border border-primary-500/30 rounded-3xl" />

            <div className="relative z-10 px-8 py-16 text-center">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                className="text-5xl mb-6 inline-block"
              >
                🏆
              </motion.div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                Ready to Compete?
              </h2>
              <p className="text-gray-300 max-w-md mx-auto mb-8 leading-relaxed">
                Join thousands of players already competing for glory and prizes. Your journey to the top starts now.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm bg-white text-gaming-dark hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glass"
                >
                  <Zap className="w-4 h-4" />
                  Start Competing Free
                </Link>
                <Link
                  href="/tournaments"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm border border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all"
                >
                  Browse Tournaments
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>
    </div>
  );
}
