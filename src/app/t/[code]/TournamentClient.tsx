'use client';

import { useState, useCallback } from 'react';
import { BracketView } from '@/components/bracket/BracketView';
import type { PublicMatch, TournamentRole } from '@/types/tournament';

interface Props {
  tournamentId: string;
  tournamentCode: string;
  tournamentName: string;
  initialMatches: PublicMatch[];
  role: TournamentRole;
  playerToken?: string;
}

export function TournamentClient({
  tournamentId,
  tournamentCode,
  tournamentName,
  initialMatches,
  role,
  playerToken,
}: Props) {
  const [matches, setMatches] = useState(initialMatches);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/t/${tournamentCode}`);
    if (res.ok) {
      const { data } = await res.json() as { data: { matches: PublicMatch[] } };
      setMatches(data.matches);
    }
  }, [tournamentCode]);

  const isOrganizer = role === 'organizer';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{tournamentName}</h1>
        <div className="flex items-center gap-2">
          <span className={[
            'rounded-full px-3 py-1 text-xs font-medium',
            role === 'organizer' ? 'bg-brand-500/20 text-brand-500' :
            role === 'player' ? 'bg-green-500/20 text-green-400' :
            'bg-white/10 text-gray-400',
          ].join(' ')}>
            {role}
          </span>
          {isOrganizer && (
            <span className="text-xs text-gray-500">/t/{tournamentCode}</span>
          )}
        </div>
      </div>

      <BracketView
        matches={matches}
        isOrganizer={isOrganizer}
        playerToken={playerToken}
        onRefresh={refresh}
      />

      {isOrganizer && (
        <div className="mt-8 rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-300">Share link</h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded bg-black/30 px-3 py-2 text-sm text-gray-300">
              {typeof window !== 'undefined'
                ? `${window.location.origin}/t/${tournamentCode}`
                : `/t/${tournamentCode}`}
            </code>
            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  `${window.location.origin}/t/${tournamentCode}`,
                )
              }
              className="rounded bg-white/5 px-3 py-2 text-sm text-gray-400 transition hover:bg-white/10 hover:text-white"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Anyone with this link can view the bracket. Players get a unique link
            to report their match score.
          </p>
        </div>
      )}

      {/* Pending validations for organizer */}
      {isOrganizer && (
        <div className="mt-4">
          {matches.filter((m) => m.status === 'AWAITING_VALIDATION').length > 0 && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
              <p className="text-sm text-yellow-400">
                {matches.filter((m) => m.status === 'AWAITING_VALIDATION').length} match(es)
                awaiting your validation.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
