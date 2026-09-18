import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { requireAuth } from '@/lib/session';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { applyEloUpdate } from '@/lib/elo/service';

interface Params {
  params: Promise<{ id: string }>;
}

type SlotPosition = 'A' | 'B';

interface MutableMatch {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  bracketSide: string;
  playerAId: string | null;
  playerBId: string | null;
  playerAIsBye: boolean;
  playerBIsBye: boolean;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  status: 'PENDING' | 'AWAITING_VALIDATION' | 'DONE';
  validatedById: string | null;
  nextMatchId: string | null;
  nextMatchPosition: SlotPosition | null;
  loserMatchId: string | null;
  loserMatchPosition: SlotPosition | null;
}

function hasKnownSlot(match: MutableMatch, position: SlotPosition): boolean {
  return position === 'A'
    ? match.playerAId !== null || match.playerAIsBye
    : match.playerBId !== null || match.playerBIsBye;
}

function assignSlot(
  match: MutableMatch,
  position: SlotPosition,
  playerId: string | null,
  isBye: boolean,
): boolean {
  const currentPlayerId = position === 'A' ? match.playerAId : match.playerBId;
  const currentIsBye = position === 'A' ? match.playerAIsBye : match.playerBIsBye;

  if (hasKnownSlot(match, position) && (currentPlayerId !== playerId || currentIsBye !== isBye)) {
    throw new ValidationError(`Bracket slot ${match.id}-${position} is already occupied`);
  }

  if (position === 'A') {
    match.playerAId = playerId;
    match.playerAIsBye = isBye;
  } else {
    match.playerBId = playerId;
    match.playerBIsBye = isBye;
  }

  return currentPlayerId !== playerId || currentIsBye !== isBye;
}

function assignLinkedSlot(
  matches: Map<string, MutableMatch>,
  matchId: string | null,
  position: SlotPosition | null,
  playerId: string | null,
  isBye: boolean,
  changed: Set<string>,
): void {
  if (matchId === null || position === null) return;

  const target = matches.get(matchId);
  if (target === undefined) {
    throw new ValidationError(`Bracket points to missing match ${matchId}`);
  }

  if (assignSlot(target, position, playerId, isBye)) {
    changed.add(target.id);
  }
}

function resolveAutomaticMatches(matches: Map<string, MutableMatch>, changed: Set<string>): void {
  let didChange = true;

  while (didChange) {
    didChange = false;

    for (const match of matches.values()) {
      if (match.status !== 'PENDING' || !hasKnownSlot(match, 'A') || !hasKnownSlot(match, 'B')) {
        continue;
      }

      const hasPlayerA = match.playerAId !== null;
      const hasPlayerB = match.playerBId !== null;
      if (hasPlayerA && hasPlayerB) continue;

      match.status = 'DONE';
      match.winnerId = match.playerAId ?? match.playerBId;
      changed.add(match.id);
      didChange = true;

      assignLinkedSlot(
        matches,
        match.nextMatchId,
        match.nextMatchPosition,
        match.winnerId,
        match.winnerId === null,
        changed,
      );
      assignLinkedSlot(matches, match.loserMatchId, match.loserMatchPosition, null, true, changed);
    }
  }
}

// POST /api/matches/[id]/validate — organizer validates the reported score
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const match = await db.match.findUnique({
      where: { id },
      include: { tournament: true },
    });

    if (!match) throw new NotFoundError('Match not found');
    if (match.tournament.organizerId !== user.id) {
      throw new ForbiddenError('Only the organizer can validate scores');
    }
    if (match.status !== 'AWAITING_VALIDATION') {
      throw new ValidationError('Match is not awaiting validation');
    }
    if (
      match.scoreA === null ||
      match.scoreB === null ||
      match.playerAId === null ||
      match.playerBId === null
    ) {
      throw new ValidationError('Match is missing players or scores');
    }

    const winnerId = match.scoreA > match.scoreB ? match.playerAId : match.playerBId;
    const loserId = match.scoreA > match.scoreB ? match.playerBId : match.playerAId;

    await db.$transaction(async (tx) => {
      // Claim the result conditionally so two organizer requests cannot both
      // award Elo or advance the same match.
      const claimed = await tx.match.updateMany({
        where: {
          id,
          status: 'AWAITING_VALIDATION',
          scoreA: match.scoreA,
          scoreB: match.scoreB,
        },
        data: {
          status: 'DONE',
          winnerId,
          validatedById: user.id,
        },
      });

      if (claimed.count !== 1) {
        throw new ValidationError('Match was already validated');
      }

      await applyEloUpdate(tx, winnerId, loserId, match.tournamentId);

      const persistedMatches = (await tx.match.findMany({
        where: { tournamentId: match.tournamentId },
      })) as MutableMatch[];
      const mutableMatches = new Map<string, MutableMatch>(
        persistedMatches.map((candidate) => [candidate.id, candidate]),
      );
      const current = mutableMatches.get(id);
      if (current === undefined) {
        throw new ValidationError(`Match not found: ${id}`);
      }

      current.status = 'DONE';
      current.winnerId = winnerId;
      current.validatedById = user.id;
      const changed = new Set<string>([current.id]);

      assignLinkedSlot(
        mutableMatches,
        current.nextMatchId,
        current.nextMatchPosition,
        winnerId,
        false,
        changed,
      );
      assignLinkedSlot(
        mutableMatches,
        current.loserMatchId,
        current.loserMatchPosition,
        loserId,
        false,
        changed,
      );

      // Grand-final reset is conditional — branch on who wins GF1.
      if (
        current.bracketSide === 'GRAND_FINAL' &&
        current.round === 1 &&
        current.nextMatchId !== null
      ) {
        if (winnerId === current.playerBId) {
          // LB champion upset the WB champion: activate the reset
          assignLinkedSlot(
            mutableMatches,
            current.nextMatchId,
            'A',
            current.playerAId,
            false,
            changed,
          );
          assignLinkedSlot(
            mutableMatches,
            current.nextMatchId,
            'B',
            current.playerBId,
            false,
            changed,
          );
        } else {
          // WB champion wins cleanly: reset is never played
          const resetMatch = mutableMatches.get(current.nextMatchId);
          if (resetMatch !== undefined) {
            resetMatch.status = 'DONE';
            changed.add(resetMatch.id);
          }
        }
      }

      resolveAutomaticMatches(mutableMatches, changed);

      for (const changedId of changed) {
        const candidate = mutableMatches.get(changedId);
        if (candidate === undefined) continue;

        await tx.match.update({
          where: { id: candidate.id },
          data: {
            playerAId: candidate.playerAId,
            playerBId: candidate.playerBId,
            playerAIsBye: candidate.playerAIsBye,
            playerBIsBye: candidate.playerBIsBye,
            winnerId: candidate.winnerId,
            status: candidate.status,
            validatedById: candidate.validatedById,
          },
        });
      }

      const hasUnresolvedMatches = [...mutableMatches.values()].some(
        (candidate) => candidate.status !== 'DONE',
      );
      if (!hasUnresolvedMatches) {
        await tx.tournament.update({
          where: { id: match.tournamentId },
          data: { status: 'DONE' },
        });
      }
    });

    const updated = await db.match.findUnique({
      where: { id },
      include: {
        playerA: { select: { id: true, name: true } },
        playerB: { select: { id: true, name: true } },
        winner: { select: { id: true, name: true } },
      },
    });

    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}
