'use client';

import { useState } from 'react';
import { MatchCard } from './MatchCard';
import { ScoreReportModal } from './ScoreReportModal';
import type { PublicMatch } from '@/types/tournament';

interface Props {
  matches: PublicMatch[];
  isOrganizer: boolean;
  playerToken: string | undefined;
  onRefresh: () => void;
}

type BracketTab = 'WINNERS' | 'LOSERS' | 'GRAND_FINAL';

export function BracketView({ matches, isOrganizer, playerToken, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<BracketTab>('WINNERS');
  const [reportingMatch, setReportingMatch] = useState<PublicMatch | null>(null);
  const [validatingMatchId, setValidatingMatchId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleValidate(matchId: string) {
    setValidatingMatchId(matchId);
    setActionError(null);

    try {
      const res = await fetch(`/api/matches/${matchId}/validate`, { method: 'POST' });
      if (!res.ok) {
        throw new Error(((await res.json()) as { error: string }).error);
      }
      await onRefresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setValidatingMatchId(null);
    }
  }

  const tabs: { id: BracketTab; label: string }[] = [
    { id: 'WINNERS', label: 'Winners' },
    { id: 'LOSERS', label: 'Losers' },
    { id: 'GRAND_FINAL', label: 'Grand Final' },
  ];

  const filtered = matches.filter((m) => m.bracketSide === activeTab);
  const rounds = [...new Set(filtered.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div>
      {actionError && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-white/5 bg-white/[0.03] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex-1 rounded-md py-2 text-sm font-medium transition',
              activeTab === tab.id ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rounds */}
      {rounds.length === 0 ? (
        <p className="text-center text-gray-500">No matches yet.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {rounds.map((round) => {
            const roundMatches = filtered.filter((m) => m.round === round);
            return (
              <div key={round} className="flex min-w-[180px] flex-col gap-3">
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  {activeTab === 'GRAND_FINAL'
                    ? round === 1
                      ? 'Grand Final'
                      : 'Reset'
                    : `Round ${round}`}
                </h3>
                {roundMatches
                  .sort((a, b) => a.position - b.position)
                  .map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      isOrganizer={isOrganizer}
                      playerToken={playerToken}
                      onReport={(id) => {
                        const m = matches.find((x) => x.id === id);
                        if (m) setReportingMatch(m);
                      }}
                      onValidate={isOrganizer ? handleValidate : undefined}
                      validating={validatingMatchId === match.id}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Score report modal */}
      {reportingMatch && (
        <ScoreReportModal
          matchId={reportingMatch.id}
          playerAName={reportingMatch.playerA?.name ?? 'Player A'}
          playerBName={reportingMatch.playerB?.name ?? 'Player B'}
          token={playerToken}
          onClose={() => setReportingMatch(null)}
          onSuccess={() => {
            setReportingMatch(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
