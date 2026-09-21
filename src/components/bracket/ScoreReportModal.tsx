'use client';

import { useState } from 'react';

interface Props {
  matchId: string;
  playerAName: string;
  playerBName: string;
  token: string | undefined;
  onClose: () => void;
  onSuccess: () => void;
}

export function ScoreReportModal({
  matchId,
  playerAName,
  playerBName,
  token,
  onClose,
  onSuccess,
}: Props) {
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sA = Number(scoreA);
    const sB = Number(scoreB);

    if (
      scoreA.trim() === '' ||
      scoreB.trim() === '' ||
      !Number.isSafeInteger(sA) ||
      !Number.isSafeInteger(sB)
    ) {
      setError('Enter valid scores');
      return;
    }
    if (sA < 0 || sB < 0 || sA > 2_147_483_647 || sB > 2_147_483_647) {
      setError('Scores must be between 0 and 2147483647');
      return;
    }
    if (sA === sB) {
      setError('Scores cannot be tied');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = token
        ? `/api/matches/${matchId}/report?token=${encodeURIComponent(token)}`
        : `/api/matches/${matchId}/report`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreA: sA, scoreB: sB }),
      });

      if (!res.ok) throw new Error(((await res.json()) as { error: string }).error);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-white/10 bg-gray-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Report score</h2>

        {error && <p className="mb-3 rounded bg-red-500/10 p-2 text-sm text-red-400">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-gray-400">{playerAName}</label>
              <input
                type="number"
                min={0}
                max={2147483647}
                step={1}
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value)}
                className="rounded border border-white/10 bg-white/5 px-3 py-2 text-center text-lg font-mono text-white outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex items-end pb-2 text-gray-600">vs</div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-gray-400">{playerBName}</label>
              <input
                type="number"
                min={0}
                max={2147483647}
                step={1}
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value)}
                className="rounded border border-white/10 bg-white/5 px-3 py-2 text-center text-lg font-mono text-white outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-gray-400 transition hover:border-white/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
