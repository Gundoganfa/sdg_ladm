// app/layout.tsx
import '../globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SDG–LADM Demo',
  description: 'Parcel-Centric Linking of SDG Indicators to LADM',
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
