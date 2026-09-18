import type { Metadata } from 'next';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { getSession } from '@/lib/session';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'BRATS — Tournament Brackets',
    template: '%s | BRATS',
  },
  description:
    'Create and share tournament brackets in seconds. Double-elimination, mobile-first, no account needed for players.',
  keywords: ['tournament', 'bracket', 'double elimination', 'esports', 'smash', 'gaming'],
  authors: [{ name: 'Baptiste-lg' }],
  openGraph: {
    title: 'BRATS — Tournament Brackets',
    description: 'Create and share tournament brackets in seconds.',
    type: 'website',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
