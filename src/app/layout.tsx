import type { Metadata } from 'next';
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
