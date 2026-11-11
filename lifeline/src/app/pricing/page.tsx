import type { Metadata } from 'next';
import { Page, PlanCards } from '@/components/marketing';
import { plans } from '@/server/billing';

export const metadata: Metadata = { title: 'Pricing', description: 'Lifeline plans: Basic and Premium. VaultLock and core account security are in every plan.' };

export default function Pricing() {
  return (
    <Page title="Pricing" lead="Two plans. VaultLock and core account security are in both. Prices are provisional, and nothing is charged in this preview.">
      <div className="not-prose"><PlanCards plans={Object.values(plans())} /></div>
      <section>
        <h2>What you should know</h2>
        <ul>
          <li>Text messages and phone calls have a monthly limit on the Premium plan. When the limit is reached, email is still sent.</li>
          <li>A payment problem never silently switches off an active countdown. We tell you clearly before any service ends.</li>
          <li>Lifeline is not an emergency service and does not guarantee that a message reaches a person.</li>
        </ul>
      </section>
    </Page>
  );
}
