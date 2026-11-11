import type { Metadata } from 'next';
import { Page } from '@/components/marketing';

export const metadata: Metadata = { title: 'Terms of Service', robots: { index: false } };

export default function Legal() {
  return (
    <Page title="Terms of Service" lead="Placeholder. This page must be written and approved by a qualified lawyer before Lifeline accepts real customers.">
      <section>
        <h2>Status</h2>
        <p>Lifeline is a pre-launch preview. No real service is offered, no payment is taken, and demo messages reach nobody.</p>
      </section>
      <section>
        <h2>Points the final document must cover</h2>
        <ul>
          <li>Lifeline is not an emergency service and does not contact emergency services.</li>
          <li>A missed check-in is not proof of harm; alerts are information only.</li>
          <li>No guarantee of message delivery, and the limits of liability that follow.</li>
          <li>What happens to an active countdown when payment fails or an account closes, and the notice given first.</li>
          <li>VaultLock: what is sealed, how release works, and how account deletion requests are handled while sealed.</li>
          <li>Acceptable use, including no use for monitoring another person without their knowledge.</li>
        </ul>
      </section>
    </Page>
  );
}
