import type { ReactNode } from 'react';
import Nav from './Nav';
import Footer from './Footer';
import WhatsAppFloatButton from './WhatsAppFloatButton';

export default function PageShell({
  children,
  maxWidth = 'max-w-3xl'
}: {
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Nav sticky />
      <main className={`${maxWidth} mx-auto px-5 sm:px-10 pt-8 sm:pt-16 pb-20 flex-1 w-full`}>
        {children}
      </main>
      <Footer />
      <WhatsAppFloatButton />
    </div>
  );
}
