import Link from 'next/link';
import { CountdownDemo, WaitlistForm } from '@/components/marketing-client';
import { PlanCards, PREVIEW_NOTE, SiteFooter, SiteHeader } from '@/components/marketing';
import { plans } from '@/server/billing';

const HOW = [
  ['Choose your Lifelines', 'Add the people you trust. Each one gets a request and must accept before Lifeline will ever contact them. They can opt out at any time.'],
  ['Set your schedule', 'Pick how often you check in: every 12 hours, every day, every 10 days, or your own interval. Add reminders and a grace period.'],
  ['Check in', 'Tap “Verify I’m OK”. Your device confirms it is you, and you enter a passphrase only you know. The countdown starts again.'],
  ['If you miss one', 'You get reminders and a final warning first. If the deadline and grace period both pass, your Lifelines are told that you missed a check-in.'],
];
const USES = [
  ['Living alone', 'A simple daily or weekly signal that someone would notice if it stopped.'],
  ['Solo travel and outdoor trips', 'Set a shorter schedule while you are away. Go back to normal when you return.'],
  ['Family peace of mind', 'Adult children and parents who live apart can keep a routine that does not need a daily phone call.'],
  ['Working alone', 'Freelancers and owner-operators whose absence might otherwise go unseen for days.'],
];
const FAQ = [
  ['Does a missed check-in mean something bad happened?', 'No. It means only that the check-in was not completed. Phones break and people forget. Every message Lifeline sends says this plainly, and tells your Lifelines to try to reach you directly.'],
  ['Does Lifeline call emergency services?', 'No. Lifeline does not contact police, ambulance or fire services. It tells the people you chose. If someone is in danger, call your local emergency number.'],
  ['What if my phone is lost, broken or switched off?', 'The countdown runs on our servers, not on your phone. A lost or dead phone does not stop it. You can check in from another device you enrolled.'],
  ['Is it really my face that is checked?', 'Your phone checks you, not us. Lifeline uses passkeys: your device confirms you with Face ID, a fingerprint, or your device PIN, and tells us only “confirmed”. We never receive or store a face image or fingerprint. A passkey can accept the device PIN, so we do not describe this as face-only.'],
  ['What is VaultLock?', 'An optional seal. Once on, your Lifelines, messages, schedule and sign-in devices cannot be changed from a normal signed-in session — not by someone holding your unlocked phone, and not through an email password reset. It can only be released with a separate recovery key and a waiting period.'],
  ['What do my Lifelines need to do?', 'Accept the request once. If they ever receive an alert, it has a link to confirm they received it. They do not need an account.'],
  ['What happens if my payment fails?', 'An active countdown is never switched off silently because of a payment problem. We will tell you clearly before any service ends.'],
  ['Can I rely on this today?', `Not yet. ${PREVIEW_NOTE} Messages in the demo are simulated and reach nobody.`],
];

export default function Home() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pt-24">
          <p className="rise inline-flex rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">Pre-launch preview · demo available</p>
          <h1 className="rise mt-6 max-w-4xl text-[2.6rem] font-semibold leading-[1.05] sm:text-7xl">If something happened to you, how long would it take someone to notice?</h1>
          <p className="rise mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
            Lifeline is a quiet check-in service. You confirm you are OK on a schedule you choose. If a check-in is missed, the people you trust are told. Your silence shouldn’t go unnoticed.
          </p>
          <div className="rise mt-9 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex min-h-13 items-center rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-accent-ink hover:bg-accent-strong">Try the demo</Link>
            <Link href="#how" className="inline-flex min-h-13 items-center rounded-xl border border-line bg-surface px-6 py-3.5 text-base font-medium hover:border-muted">See how it works</Link>
          </div>
          <p className="mt-5 text-sm text-muted">Your Lifeline. Your Rules. Your Peace of Mind.</p>
        </section>

        <section aria-labelledby="demo-h" className="mx-auto max-w-4xl px-5">
          <h2 id="demo-h" className="sr-only">Countdown demonstration</h2>
          <CountdownDemo />
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-24">
          <h2 className="text-3xl font-semibold sm:text-4xl">How it works</h2>
          <p className="mt-3 max-w-2xl text-muted">Life is unpredictable. Your safety plan shouldn’t be.</p>
          <ol className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW.map(([t, d], i) => (
              <li key={t} className="rounded-2xl border border-line bg-surface p-6">
                <span className="tnum text-sm font-semibold text-accent">Step {i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-5 pt-24 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-7">
            <h2 className="text-2xl font-semibold">Your Lifelines</h2>
            <p className="mt-3 leading-relaxed text-muted">Lifelines are people, not a call centre: a partner, a sibling, a close friend. You choose who is told first and who is told next. Nobody is contacted unless they agreed, and an alert never claims to know what happened.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-7">
            <h2 className="text-2xl font-semibold">Two proofs that it is you</h2>
            <p className="mt-3 leading-relaxed text-muted">A check-in needs your device’s own check (Face ID, fingerprint or device PIN, through a passkey) and a separate passphrase. Your sign-in password alone cannot check in for you.</p>
          </div>
          <div className="rounded-2xl border border-accent/50 bg-surface p-7">
            <h2 className="text-2xl font-semibold">VaultLock</h2>
            <p className="mt-3 leading-relaxed text-muted">Seal your plan. After that, a person who has your phone, your password or your email still cannot remove a Lifeline, change a number, or switch protection off. Included in every plan.</p>
            <Link href="/security" className="mt-4 inline-block font-medium text-accent hover:text-accent-strong">How VaultLock works →</Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pt-24">
          <h2 className="text-3xl font-semibold sm:text-4xl">Who it is for</h2>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {USES.map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 pt-24">
          <h2 className="text-3xl font-semibold sm:text-4xl">Simple pricing</h2>
          <p className="mb-8 mt-3 text-muted">Prices are provisional. Nothing is charged in this preview.</p>
          <PlanCards plans={Object.values(plans())} />
        </section>

        <section className="mx-auto max-w-3xl px-5 pt-24">
          <h2 className="text-3xl font-semibold sm:text-4xl">Questions</h2>
          <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-surface">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium">{q}<span aria-hidden className="text-muted transition group-open:rotate-45">+</span></summary>
                <p className="mt-3 leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pt-24">
          <div className="rounded-3xl border border-line bg-surface p-7 sm:p-10">
            <h2 className="text-2xl font-semibold sm:text-3xl">Be told when Lifeline opens</h2>
            <p className="mb-6 mt-3 text-muted">One email at launch. No marketing list, no sharing.</p>
            <WaitlistForm />
          </div>
        </section>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
