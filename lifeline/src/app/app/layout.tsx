'use client';
import { MeProvider } from '@/components/app-context';
import { AppShell } from '@/components/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <MeProvider><AppShell>{children}</AppShell></MeProvider>;
}
