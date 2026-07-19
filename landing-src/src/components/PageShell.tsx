import type { ReactNode } from 'react';
import Nav from './Nav';

export default function PageShell({
  children,
  maxWidth = 'max-w-3xl'
}: {
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="min-h-screen bg-[#f0f0ee]">
      <Nav sticky />
      <main className={`${maxWidth} mx-auto px-5 sm:px-10 pt-8 sm:pt-16 pb-20`}>{children}</main>
    </div>
  );
}
