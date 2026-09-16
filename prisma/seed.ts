import { PrismaClient, TournamentFormat, TournamentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.warn('Seeding database...');

  // Cleanup
  await prisma.eloRecord.deleteMany();
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create demo organizer
  const organizer = await prisma.user.create({
    data: {
      email: 'demo@brats.gg',
      name: 'Demo Organizer',
    },
  });

  // Create a demo tournament in DRAFT state
  const draft = await prisma.tournament.create({
    data: {
      code: 'demo01',
      name: 'Demo Tournament — 8 Players',
      format: TournamentFormat.DOUBLE_ELIMINATION,
      status: TournamentStatus.DRAFT,
      organizerId: organizer.id,
      players: {
        create: [
          { name: 'Alice', seed: 1 },
          { name: 'Bob', seed: 2 },
          { name: 'Carol', seed: 3 },
          { name: 'Dave', seed: 4 },
          { name: 'Eve', seed: 5 },
          { name: 'Frank', seed: 6 },
          { name: 'Grace', seed: 7 },
          { name: 'Heidi', seed: 8 },
        ],
      },
    },
  });

  // Create a demo tournament with an odd number of players (5) to test byes
  await prisma.tournament.create({
    data: {
      code: 'demo05',
      name: 'Demo Tournament — 5 Players (with byes)',
      format: TournamentFormat.DOUBLE_ELIMINATION,
      status: TournamentStatus.DRAFT,
      organizerId: organizer.id,
      players: {
        create: [
          { name: 'Player 1', seed: 1 },
          { name: 'Player 2', seed: 2 },
          { name: 'Player 3', seed: 3 },
          { name: 'Player 4', seed: 4 },
          { name: 'Player 5', seed: 5 },
        ],
      },
    },
  });

  console.warn(`Seeded:`);
  console.warn(`  User: ${organizer.email}`);
  console.warn(`  Tournament: ${draft.code} (${draft.name})`);
  console.warn('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
