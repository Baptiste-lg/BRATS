'use client';

import type { PublicMatch } from '@/types/tournament';

interface Props {
  match: PublicMatch;
  isOrganizer: boolean;
  playerToken: string | undefined;
  onReport?: (matchId: string) => void;
  onValidate: ((matchId: string) => void) | undefined;
  validating?: boolean;
}

export function MatchCard({
  match,
  isOrganizer,
  playerToken,
  onReport,
  onValidate,
  validating = false,
}: Props) {
  const playerA = match.playerA?.name ?? 'TBD';
  const playerB = match.playerB?.name ?? 'TBD';
  const isDone = match.status === 'DONE';
  const isPending = match.status === 'PENDING';
  const isAwaiting = match.status === 'AWAITING_VALIDATION';

  const canReport =
    (isOrganizer || (playerToken !== undefined && match.canPlayerReport)) &&
    isPending &&
    match.playerA !== null &&
    match.playerB !== null;
  const canValidate = isOrganizer && isAwaiting && onValidate !== undefined;

  return (
    <div
      className={[
        'flex flex-col rounded-lg border p-3 text-sm transition',
        isDone
          ? 'border-green-500/20 bg-green-500/5'
          : isAwaiting
            ? 'border-yellow-500/20 bg-yellow-500/5'
            : 'border-white/5 bg-white/[0.03]',
      ].join(' ')}
    >
      {/* Player A */}
      <div
        className={[
          'flex items-center justify-between py-1',
          isDone && match.winner?.name === playerA ? 'text-white' : 'text-gray-400',
        ].join(' ')}
      >
        <span className={isDone && match.winner?.name === playerA ? 'font-semibold' : ''}>
          {playerA}
        </span>
        {match.scoreA !== null && <span className="tabular-nums">{match.scoreA}</span>}
      </div>

      <div className="my-1 h-px bg-white/5" />

      {/* Player B */}
      <div
        className={[
          'flex items-center justify-between py-1',
          isDone && match.winner?.name === playerB ? 'text-white' : 'text-gray-400',
        ].join(' ')}
      >
        <span className={isDone && match.winner?.name === playerB ? 'font-semibold' : ''}>
          {playerB}
        </span>
        {match.scoreB !== null && <span className="tabular-nums">{match.scoreB}</span>}
      </div>

      {/* Status / action */}
      <div className="mt-2 flex items-center justify-between">
        <span
          className={[
            'text-xs',
            isDone ? 'text-green-500' : isAwaiting ? 'text-yellow-500' : 'text-gray-600',
          ].join(' ')}
        >
          {isDone ? 'Done' : isAwaiting ? 'Awaiting validation' : isPending ? 'Pending' : ''}
        </span>
        <div className="flex items-center gap-2">
          {canReport && onReport && (
            <button
              onClick={() => onReport(match.id)}
              className="rounded bg-brand-500/20 px-2 py-0.5 text-xs text-brand-500 transition hover:bg-brand-500/30"
            >
              Report score
            </button>
          )}
          {canValidate && (
            <button
              onClick={() => onValidate?.(match.id)}
              disabled={validating}
              className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400 transition hover:bg-green-500/30"
            >
              {validating ? 'Validating…' : 'Validate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
