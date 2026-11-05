import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hostelizer Partner Studio | PG & Hostel Management Operating System',
  description: 'Enterprise PG & Hostel Discovery Marketplace, Property Management System & Media Asset Pipeline',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}

