import Link from 'next/link';
import { Gamepad2, Twitter, Youtube, Twitch, Github, MessageCircle, ExternalLink } from 'lucide-react';

const footerLinks = {
  // Teams and News links are omitted while those pages are hidden (mock data only).
  Platform: [
    { label: 'Tournaments', href: '/tournaments' },
    { label: 'Leaderboard', href: '/leaderboard' },
    { label: 'Players',     href: '/players' },
  ],
  Company: [
    { label: 'About',    href: '/about' },
    { label: 'Sponsors', href: '/sponsors' },
    { label: 'Careers',  href: '#' },
  ],
  Support: [
    { label: 'Help Center',    href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Contact',        href: '#' },
  ],
};

const socials = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: MessageCircle, href: '#', label: 'Discord' },
  { icon: Youtube, href: '#', label: 'YouTube' },
  { icon: Twitch,  href: '#', label: 'Twitch' },
  { icon: Github,  href: '#', label: 'GitHub' },
];

export default function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/08 overflow-hidden">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        {/* Top Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 py-14">

          {/* Brand */}
          <div className="col-span-2 lg:col-span-2 space-y-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shadow-purple-glow-sm">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl tracking-tight">
                <span className="brand-text">eTour</span>
                <span className="text-white">NEX</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              The premier competitive gaming ecosystem. Host tournaments, climb leaderboards, and make your mark in esports history.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-2">
              {socials.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-xl bg-surface-2 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-primary-500/50 hover:bg-primary-500/10 hover:shadow-purple-glow-sm transition-all duration-200"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="space-y-4">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest">{title}</h4>
              <ul className="space-y-3">
                {links.map(l => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-1.5 group"
                    >
                      {l.label}
                      {l.href === '#' && (
                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/08 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} eTourNEX. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-neon animate-pulse" />
            <span className="text-xs text-gray-600 font-medium">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
