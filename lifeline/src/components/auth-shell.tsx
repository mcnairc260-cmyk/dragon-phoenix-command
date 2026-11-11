import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from './ui';

export function AuthShell({ title, lead, children, footer }: { title: string; lead?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <Link href="/" aria-label="Lifeline home"><Logo className="text-lg" /></Link>
      <div className="rise my-auto py-10">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {lead && <p className="mt-3 leading-relaxed text-muted">{lead}</p>}
        <div className="mt-8 space-y-5">{children}</div>
        {footer && <div className="mt-8 text-sm text-muted">{footer}</div>}
      </div>
      <p className="text-xs leading-relaxed text-muted">Pre-launch preview. Not an emergency service. In an emergency, call your local emergency number.</p>
    </main>
  );
}
