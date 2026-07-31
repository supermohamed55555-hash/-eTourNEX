'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Newspaper, Calendar, User, ArrowRight } from 'lucide-react';

export default function NewsPage() {
  const articles = [
    { id: 1, title: 'eFootball Season 4 Open Tournament Announced', date: 'Oct 24, 2025', author: 'eTourNEX Staff', snippet: 'Compete for the largest prize pool of the year in our newly revamped double elimination system.' },
    { id: 2, title: 'Anti-Cheat Update: Proof Screenshot Verification System', date: 'Oct 20, 2025', author: 'Security Team', snippet: 'Our new AI-powered screenshot audit system prevents match manipulation and guarantees fair outcomes.' },
    { id: 3, title: 'Top 10 Players of the Month - Rankings Reveal', date: 'Oct 15, 2025', author: 'Community Editor', snippet: 'Check out who dominated the leaderboards this month and secured their spot in the Grand Finals.' },
  ];

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-4xl sm:text-5xl font-black text-white">Esports <span className="brand-text">News & Updates</span></h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto">Latest announcements, tournament recaps, and community stories.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.map(a => (
          <Card key={a.id} hover>
            <CardHeader>
              <div className="flex items-center gap-2 text-xs text-primary-400">
                <Calendar className="w-3.5 h-3.5" /> {a.date}
              </div>
              <CardTitle className="mt-2 text-lg">{a.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400 leading-relaxed">{a.snippet}</p>
              <Button variant="ghost" size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>Read Article</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
