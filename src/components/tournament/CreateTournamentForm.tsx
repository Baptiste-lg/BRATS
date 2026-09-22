'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayerListInput } from './PlayerListInput';

export function CreateTournamentForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [players, setPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tournament name is required');
      return;
    }
    if (players.length < 2) {
      setError('Need at least 2 players');
      return;
    }

    setLoading(true);
    setError(null);

    let tournamentId: string | undefined;
    let bracketRequested = false;
    try {
      // 1. Create tournament
      const tRes = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!tRes.ok) throw new Error(((await tRes.json()) as { error: string }).error);
      const { data: tournament } = (await tRes.json()) as { data: { id: string; code: string } };
      tournamentId = tournament.id;

      // 2. Add players
      const pRes = await fetch(`/api/tournaments/${tournament.id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: players.map((name_) => ({ name: name_ })) }),
      });
      if (!pRes.ok) throw new Error(((await pRes.json()) as { error: string }).error);

      // 3. Generate bracket
      bracketRequested = true;
      const bRes = await fetch(`/api/tournaments/${tournament.id}/bracket`, {
        method: 'POST',
      });
      if (!bRes.ok) throw new Error(((await bRes.json()) as { error: string }).error);

      // 4. Redirect to the public bracket page
      router.push(`/t/${tournament.code}`);
    } catch (err) {
      // Before bracket generation, cleanup is safe because the tournament is
      // still a draft. Once generation was requested, keep the record: the
      // server may have committed successfully while the response was lost.
      if (tournamentId && !bracketRequested) {
        await fetch(`/api/tournaments/${tournamentId}`, { method: 'DELETE' }).catch(
          () => undefined,
        );
      }
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-gray-300">
          Tournament name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friday Night Smash — Week 3"
          className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <PlayerListInput onPlayersChange={setPlayers} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {players.length > 0 && `${players.length} players · Double elimination`}
        </p>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-500 px-6 py-2.5 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Generate bracket →'}
        </button>
      </div>
    </form>
  );
}
