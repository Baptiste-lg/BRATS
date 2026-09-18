import type { Tournament, Player, Match, BracketSide, MatchStatus } from '@prisma/client';

// Tournament with all relations loaded
export type TournamentWithRelations = Tournament & {
  players: Player[];
  matches: MatchWithPlayers[];
  organizer: {
    id: string;
    name: string | null;
    email: string;
  };
};

// Match with player names resolved
export type MatchWithPlayers = Match & {
  playerA: Pick<Player, 'id' | 'name' | 'seed'> | null;
  playerB: Pick<Player, 'id' | 'name' | 'seed'> | null;
  winner: Pick<Player, 'id' | 'name'> | null;
};

// Public-safe tournament view (no internal IDs)
export type PublicTournament = {
  code: string;
  name: string;
  format: string;
  status: string;
  players: { name: string; seed: number | null }[];
  matches: PublicMatch[];
};

export type PublicMatch = {
  id: string;
  round: number;
  position: number;
  bracketSide: BracketSide;
  playerA: { name: string } | null;
  playerB: { name: string } | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: { name: string } | null;
  status: MatchStatus;
};

// Role enum for the /t/[code] page
export type TournamentRole = 'organizer' | 'player' | 'spectator';
