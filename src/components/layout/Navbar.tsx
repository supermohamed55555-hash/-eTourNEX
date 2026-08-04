'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import NotificationDropdown from '@/components/layout/NotificationDropdown';
import {
  Trophy, Users, BarChart3, Shield, Home,
  Menu, X, ChevronDown, Search, Zap, LogOut,
  Settings, User, Star, Gamepad2, Newspaper, Film, Swords, ShieldCheck, ShoppingBag
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',             label: 'Home',        icon: Home },
  { href: '/tournaments',  label: 'Tournaments', icon: Trophy },
  { href: '/games',        label: 'Games',       icon: Gamepad2 },
  { href: '/shop',         label: 'Shop',        icon: ShoppingBag },
  { href: '/leaderboard',  label: 'Leaderboard', icon: BarChart3 },
  { href: '/players',      label: 'Players',     icon: Users },
  { href: '/teams',        label: 'Teams',       icon: Swords },
  { href: '/sponsors',     label: 'Sponsors',    icon: Star },
  { href: '/news',         label: 'News',        icon: Newspaper },
  { href: '/community',    label: 'Community',   icon: Film },
];

interface NavbarProps {
  user?: { id: string; username?: string; avatar_url?: string; role?: string; email_confirmed?: boolean } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname   = usePathname();
  const router     = useRouter();
  const [mobile, setMobile]     = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  /* scroll shadow */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  /* outside click closes dropdown */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* close mobile menu on route change */
  useEffect(() => { setMobile(false); }, [pathname]);

  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer' || isAdmin;

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
          scrolled
            ? 'bg-gaming-dark/90 backdrop-blur-xl border-b border-white/08 shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-16 gap-6">

            {/* ── Logo ── */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shadow-purple-glow-sm">
                <Gamepad2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-lg tracking-tight">
                <span className="brand-text">eTour</span>
                <span className="text-white">NEX</span>
              </span>
            </Link>

            {/* ── Desktop Nav ── */}
            <nav className="hidden lg:flex items-center gap-1 flex-1">
              {NAV_ITEMS.map(item => {
                const active = item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                      active
                        ? 'text-white bg-primary-600/20 border border-primary-500/30 shadow-purple-glow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* ── Right side ── */}
            <div className="ml-auto flex items-center gap-2">

              {/* Search button */}
              <button
                onClick={() => router.push('/search')}
                title="Search"
                className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <Search className="w-4 h-4" />
              </button>

              {user ? (
                <>
                  {/* Notifications */}
                  <NotificationDropdown />

                  {/* Profile Dropdown */}
                  <div className="relative" ref={dropRef}>
                    <button
                      onClick={() => setDropdown(v => !v)}
                      className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/5 transition-all group"
                    >
                      <Avatar
                        src={user.avatar_url}
                        alt={user.username}
                        size="sm"
                        seed={user.username}
                      />
                      <span className="hidden md:block text-sm font-semibold text-gray-200 group-hover:text-white max-w-[100px] truncate">
                        {user.username || 'Player'}
                      </span>
                      <ChevronDown className={cn('w-3 h-3 text-gray-500 transition-transform', dropdown && 'rotate-180')} />
                    </button>

                    <AnimatePresence>
                      {dropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-56 glass-card rounded-2xl shadow-glass border border-white/10 overflow-hidden z-50"
                        >
                          {/* User info */}
                          <div className="px-4 py-3 border-b border-white/10">
                            <p className="text-sm font-bold text-white">{user.username || 'Player'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={isAdmin ? 'admin' : 'player'}>
                                {user.role || 'player'}
                              </Badge>
                              {user.email_confirmed && (
                                <Badge variant="verified">verified</Badge>
                              )}
                            </div>
                          </div>

                          {/* Menu items */}
                          <div className="p-2 space-y-0.5">
                            <DropdownItem href="/dashboard" icon={<BarChart3 className="w-4 h-4" />} label="Dashboard" />
                            <DropdownItem href={`/players/${user.username}`} icon={<User className="w-4 h-4" />} label="My Profile" />
                            <DropdownItem href="/dashboard/settings" icon={<Settings className="w-4 h-4" />} label="Settings" />
                            {isOrganizer && (
                              <DropdownItem href="/organizer" icon={<ShieldCheck className="w-4 h-4" />} label="Organizer Center" highlight />
                            )}
                            {isAdmin && (
                              <DropdownItem href="/admin" icon={<Shield className="w-4 h-4" />} label="Admin Panel" highlight />
                            )}
                          </div>

                          <div className="p-2 border-t border-white/10">
                            <form action="/api/auth/signout" method="POST">
                              <button
                                type="submit"
                                className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-danger hover:bg-danger/10 transition-colors font-medium"
                              >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                              </button>
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="hidden sm:block px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-purple-glow-sm hover:shadow-purple-glow hover:scale-[1.02] transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Get Started
                  </Link>
                </div>
              )}

              {/* Hamburger */}
              <button
                onClick={() => setMobile(v => !v)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                {mobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile Menu ── */}
        <AnimatePresence>
          {mobile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden border-t border-white/10 bg-gaming-dark/95 backdrop-blur-xl"
            >
              <nav className="p-4 space-y-1">
                {NAV_ITEMS.map(item => {
                  const active = item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                        active
                          ? 'text-white bg-primary-600/20 border border-primary-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
                {/* Search link (mobile) */}
                <Link
                  href="/search"
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                    pathname === '/search'
                      ? 'text-white bg-primary-600/20 border border-primary-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Search className="w-4 h-4" />
                  Search
                </Link>
                {!user && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <Link href="/login" className="block px-4 py-3 rounded-xl text-center text-sm font-semibold text-gray-300 hover:bg-white/5 transition-all">
                      Log In
                    </Link>
                    <Link href="/register" className="block px-4 py-3 rounded-xl text-center text-sm font-bold bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-purple-glow-sm">
                      Get Started
                    </Link>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  );
}

/* ── Dropdown Item ─────────────────────────────────────── */
function DropdownItem({ href, icon, label, highlight }: {
  href: string; icon: React.ReactNode; label: string; highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
        highlight
          ? 'text-primary-400 hover:bg-primary-500/10'
          : 'text-gray-300 hover:text-white hover:bg-white/5'
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
