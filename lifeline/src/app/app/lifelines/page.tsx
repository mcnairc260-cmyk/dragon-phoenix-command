'use client';
import { PageTitle } from '@/components/app-shell';
import { LifelineEditor } from '@/components/editors';

export default function Lifelines() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Lifelines" lead="The people Lifeline tells when you miss a check-in. Each one must accept, and can opt out at any time." />
      <LifelineEditor />
    </div>
  );
}
