import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Runopis — Valheim sign editor',
  description:
    'Create your own Valheim sign. Colors, sizes, rich text tags, live preview and copy to game.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
