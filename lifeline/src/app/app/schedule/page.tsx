'use client';
import { PageTitle } from '@/components/app-shell';
import { ScheduleEditor } from '@/components/editors';
import { Card } from '@/components/ui';

export default function Schedule() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Schedule" lead="How often you check in, when you are reminded, and how your Lifelines are notified." />
      <Card><ScheduleEditor /></Card>
    </div>
  );
}
