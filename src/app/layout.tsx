import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Providers } from '@/lib/providers/Providers';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: {
    default: 'eTourNEX — Premier Esports Tournament Platform',
    template: '%s | eTourNEX',
  },
  description: 'Join competitive esports tournaments, track live bracket progression, submit match results, and climb the global leaderboards. The premier esports ecosystem.',
  keywords: ['esports', 'tournament', 'gaming', 'bracket', 'leaderboard', 'eFootball', 'competitive gaming'],
  openGraph: {
    title: 'eTourNEX — Premier Esports Tournament Platform',
    description: 'The premier competitive gaming ecosystem. Host tournaments, climb leaderboards, and make your mark in esports history.',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch server-side session and profile
  let profile = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      profile = data;
    }
  } catch {
    // Ignore auth errors on initial render
  }

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background text-gray-100 min-h-screen flex flex-col antialiased selection:bg-primary-500/40 selection:text-white">
        <Providers initialProfile={profile}>
          <Navbar user={profile} />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
