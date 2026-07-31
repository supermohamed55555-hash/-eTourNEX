'use client';

import React, { useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  NodeProps, 
  Handle, 
  Position,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Avatar } from '@/components/ui/Avatar';
import { Trophy } from 'lucide-react';
import type { Match, TournamentParticipant } from '@/lib/types/database';

/* ── Custom Match Node ─────────────────────────────────── */
function MatchNode({ data }: NodeProps<{ match: Match & { player_a?: TournamentParticipant & { profile?: any } | null; player_b?: TournamentParticipant & { profile?: any } | null }; onMatchClick?: (m: Match) => void }>) {
  const m = data.match;
  const pa = m.player_a?.profile;
  const pb = m.player_b?.profile;
  const isCompleted = m.status === 'confirmed';

  return (
    <div 
      onClick={() => data.onMatchClick?.(m)}
      className="glass-card rounded-xl w-64 p-3 border border-white/10 shadow-glass hover:border-primary-500/50 cursor-pointer transition-all duration-150"
    >
      <Handle type="target" position={Position.Left} className="!bg-primary-500 !w-2 !h-2" />

      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
        <span>{m.round_name || `Round ${m.round_order}`}</span>
        {isCompleted && <span className="text-accent-neon">✓ ENDED</span>}
      </div>

      {/* Player A */}
      <div className={`flex items-center justify-between p-2 rounded-lg ${m.winner_id === m.player_a_id && m.player_a_id ? 'bg-primary-600/20 border border-primary-500/40 text-white font-bold' : 'text-gray-300'}`}>
        <div className="flex items-center gap-2 overflow-hidden">
          <Avatar src={pa?.avatar_url} alt={pa?.username || 'TBD'} size="xs" seed={pa?.username || 'tbd1'} />
          <span className="text-xs truncate">{pa?.username || 'TBD'}</span>
        </div>
        <span className="font-mono text-xs ml-2">{m.score_a ?? '-'}</span>
      </div>

      {/* Player B */}
      <div className={`flex items-center justify-between p-2 rounded-lg mt-1 ${m.winner_id === m.player_b_id && m.player_b_id ? 'bg-primary-600/20 border border-primary-500/40 text-white font-bold' : 'text-gray-300'}`}>
        <div className="flex items-center gap-2 overflow-hidden">
          <Avatar src={pb?.avatar_url} alt={pb?.username || 'TBD'} size="xs" seed={pb?.username || 'tbd2'} />
          <span className="text-xs truncate">{pb?.username || 'TBD'}</span>
        </div>
        <span className="font-mono text-xs ml-2">{m.score_b ?? '-'}</span>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary-500 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { matchNode: MatchNode };

export default function BracketFlow({ matches, onMatchClick }: { matches: Match[]; onMatchClick?: (m: Match) => void }) {
  const { nodes, edges } = useMemo(() => {
    if (!matches || matches.length === 0) return { nodes: [], edges: [] as Edge[] };

    const rounds = Array.from(new Set(matches.map(m => m.round_order))).sort((a, b) => a - b);
    const generatedNodes: any[] = [];
    const generatedEdges: Edge[] = [];

    const X_SPACING = 320;
    const Y_SPACING = 140;

    rounds.forEach((round, rIndex) => {
      const roundMatches = matches.filter(m => m.round_order === round);
      roundMatches.forEach((match, mIndex) => {
        const x = rIndex * X_SPACING;
        const yOffset = (Math.pow(2, rIndex) - 1) * (Y_SPACING / 2);
        const y = mIndex * Y_SPACING * Math.pow(2, rIndex) + yOffset;

        generatedNodes.push({
          id: match.id,
          type: 'matchNode',
          position: { x, y },
          data: { match, onMatchClick },
        });

        if (match.next_match_id) {
          generatedEdges.push({
            id: `e-${match.id}-${match.next_match_id}`,
            source: match.id,
            target: match.next_match_id,
            animated: match.status === 'pending_review',
            style: { stroke: '#8B5CF6', strokeWidth: 2 },
          });
        }
      });
    });

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [matches, onMatchClick]);

  if (matches.length === 0) {
    return (
      <div className="py-20 text-center text-gray-500 glass-card rounded-2xl border border-white/10">
        <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">Bracket has not been generated yet.</p>
        <p className="text-xs text-gray-600 mt-1">Registration must close before the bracket is seeded.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[550px] glass-card rounded-2xl overflow-hidden border border-white/10 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background color="#8B5CF6" gap={24} size={1} style={{ opacity: 0.15 }} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
