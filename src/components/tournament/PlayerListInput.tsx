'use client';

import { useState } from 'react';

interface Props {
  onPlayersChange: (players: string[]) => void;
}

/**
 * Textarea input that accepts a newline-separated list of player names.
 * Parses and deduplicates them on change.
 */
export function PlayerListInput({ onPlayersChange }: Props) {
  const [raw, setRaw] = useState('');

  function handleChange(value: string) {
    setRaw(value);
    const players = value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    // Deduplicate while preserving order
    const seen = new Set<string>();
    const unique = players.filter((p) => {
      if (seen.has(p.toLowerCase())) return false;
      seen.add(p.toLowerCase());
      return true;
    });
    onPlayersChange(unique);
  }

  const count = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-300">
        Players{' '}
        <span className="text-gray-500">
          ({count} entered{count !== 0 && count !== 1 ? '' : ''})
        </span>
      </label>
      <textarea
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={'Alice\nBob\nCarol\nDave\n…'}
        rows={8}
        className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-gray-600 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
      <p className="text-xs text-gray-500">One player name per line. Duplicates are ignored.</p>
    </div>
  );
}
