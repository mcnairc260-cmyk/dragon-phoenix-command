import type { Metadata } from 'next';
import { Page } from '@/components/marketing';

export const metadata: Metadata = { title: 'Privacy Policy', robots: { index: false } };

export default function Legal() {
  return (
    <Page title="Privacy Policy" lead="Placeholder. This page must be written and approved by a qualified lawyer before Lifeline accepts real customers.">
      <section>
        <h2>Status</h2>
        <p>Lifeline is a pre-launch preview. No real service is offered, no payment is taken, and demo messages reach nobody.</p>
      </section>
      <section>
        <h2>Points the final document must cover</h2>
        <ul>
          <li>What data is collected about members and about Lifelines, and the lawful basis for each.</li>
          <li>Consent records for email, text message and automated calls (for example TCPA in the United States), and how consent is withdrawn.</li>
          <li>Retention periods for audit records, delivery history and consent evidence.</li>
          <li>Access, export and deletion rights (for example GDPR and CCPA), including how deletion interacts with VaultLock and security records.</li>
          <li>Sub-processors: hosting, database, email, text message and voice, and payment providers.</li>
          <li>Breach notification and contact details for privacy requests.</li>
        </ul>
      </section>
    </Page>
  );
}
