import type { Metadata } from 'next';
import { Page } from '@/components/marketing';

export const metadata: Metadata = { title: 'Security & privacy', description: 'How Lifeline protects your account, what VaultLock does, and the limits of what we can promise.' };

export default function Security() {
  return (
    <Page title="Security & privacy" lead="What Lifeline does to protect you, said plainly — including what it cannot do.">
      <section>
        <h2>The idea behind the design</h2>
        <p>If someone takes your phone, learns your password, or pressures you to open the app, that should not give them the power to switch your protection off or send your alerts somewhere else. This idea shapes every part of Lifeline.</p>
      </section>
      <section>
        <h2>Checking in</h2>
        <ul>
          <li>A check-in needs two things: a passkey check done by your own device (Face ID, fingerprint or device PIN), and a passphrase that is separate from your sign-in password.</li>
          <li>Your face or fingerprint never leaves your device. Lifeline never receives, sees or stores it.</li>
          <li>A passkey may accept your device PIN. We do not claim that a check-in is “face only”.</li>
          <li>The countdown runs on our servers and uses our clock. Your phone cannot move the deadline, and a phone that is off does not stop it.</li>
        </ul>
      </section>
      <section>
        <h2>VaultLock</h2>
        <p>VaultLock is optional. When you turn it on, Lifeline seals your plan: your Lifelines and their contact details, your messages, your schedule, your grace period, your check-in passphrase and your enrolled devices.</p>
        <ul>
          <li>A normal signed-in session cannot change sealed settings — the server refuses, and the database refuses a second time.</li>
          <li>An email password reset does not release VaultLock.</li>
          <li>Support staff have no button that releases VaultLock.</li>
          <li>Check-ins keep working as normal.</li>
          <li>A Lifeline can always opt out. Opting out cannot be used to redirect an alert.</li>
          <li>Every blocked attempt is recorded in a tamper-evident log that you can read.</li>
        </ul>
        <p>To release VaultLock you need your password and a recovery key that is shown once when you seal. The release then waits (72 hours by default). During the wait nothing changes, your protection keeps running, and you and your Lifelines are told that a release was requested. You can cancel it.</p>
      </section>
      <section>
        <h2>What we do not promise</h2>
        <ul>
          <li>No software is impossible to break. We do not claim that Lifeline is.</li>
          <li>We cannot prevent someone from forcing you to check in. A waiting period and notices reduce, but do not remove, the risk of coercion.</li>
          <li>Email, text and phone networks can delay or lose messages. “Sent” is not the same as “read”.</li>
          <li>A person with full control of our database and our server keys could defeat these protections. We limit and log that access; an independent security assessment is required before launch.</li>
        </ul>
      </section>
      <section>
        <h2>Privacy</h2>
        <ul>
          <li>We collect the minimum: your email, your settings, and the contact details of Lifelines who are asked for consent.</li>
          <li>We do not sell data and do not use advertising trackers. Site analytics, when enabled, are cookieless.</li>
          <li>Lifelines are contacted only after they accept, and can withdraw at any time.</li>
        </ul>
      </section>
    </Page>
  );
}
