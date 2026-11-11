# Financial model (estimates)

**Every number here is an estimate.** Vendor prices are from general knowledge and were **not verified** against current price lists in this session. Check each one before using this for a decision. Customer behaviour numbers are assumptions with no data behind them yet.

## Assumptions

| Item | Assumption | Type |
|---|---|---|
| Plan mix | 70 % Basic ($4.99), 30 % Premium ($9.99) | Speculation |
| Average revenue per paying user (ARPU) | 0.7 × 4.99 + 0.3 × 9.99 = **$6.49 / month** | Arithmetic on the above |
| Stripe fee | 2.9 % + $0.30 per charge → $0.44 on Basic (8.9 %), $0.59 on Premium (5.9 %) → **$0.49 average** | Informed estimate |
| Emails per user per month | 12 (reminders, warnings, notices) | Estimate |
| Missed-check-in incidents | 10 % of users per month | Speculation |
| SMS per incident (Premium only) | 2 messages × ~3 segments, ≈ $0.03 each with carrier fees | Informed estimate |
| Voice per incident (Premium only) | 1 call, ~1 minute, ≈ $0.02 | Informed estimate |

The fixed $0.30 Stripe fee takes 6 % of a $4.99 charge by itself. Annual billing ($49.90 once) would cut the fee share on Basic from 8.9 % to about 3.5 %. This is the cheapest margin improvement available.

## Monthly cost by scale

| | 100 users | 1,000 users | 10,000 users |
|---|---|---|---|
| **Revenue** | **$649** | **$6,490** | **$64,900** |
| Payment fees | $49 | $489 | $4,885 |
| Hosting (Vercel Pro, usage grows) | $20 | $20 | $60 |
| Database (Supabase Pro; larger compute + point-in-time recovery at 10k) | $25 | $25 | $210 |
| Email (Resend: free → Pro → Scale) | $0 | $20 | $90 |
| Twilio number + 10DLC campaign fees | $12 | $12 | $15 |
| SMS + voice usage | $1 | $5 | $30 |
| Monitoring, error reporting, uptime, status page | $0 | $46 | $130 |
| Domain, misc. | $2 | $2 | $5 |
| **Infrastructure + fees total** | **$109** | **$619** | **$5,425** |
| **Left after infrastructure and fees** | **$540 (83 %)** | **$5,871 (90 %)** | **$59,475 (92 %)** |

SMS and voice are a small cost because they are sent only on a missed check-in. The worst case is bounded by the plan caps: 60 texts + 20 calls ≈ $2.40 per Premium user per month, below the $9.99 price.

## Costs that are larger than infrastructure

These decide whether the business works. They are not in the table above.

| Cost | Estimate | Note |
|---|---|---|
| Independent security assessment / penetration test | $8,000 – $25,000 per round | Required before launch; repeat yearly and after major changes |
| Legal: terms, privacy policy, TCPA/consent review, liability wording | $3,000 – $10,000 first round | Required before launch |
| Insurance (cyber + errors and omissions) | $1,500 – $5,000 per year | Speculation; get quotes |
| On-call and support | Founder time at first. At 10,000 users: at least one support person and a second engineer for on-call | A safety service cannot have a single point of human failure |
| Native apps (if strict biometrics or ShadowMode are wanted) | Apple $99/year, Google $25 once, plus build cost | Future |

At 100 users, the product earns about $540 a month against a one-time pre-launch cost of roughly $11,000 – $35,000. **The pre-launch security and legal cost is the real barrier, not hosting.**

## Unit economics (speculative until there is real data)

- Contribution per user ≈ $6.49 − $0.49 − ~$0.05 = **~$5.95 / month**.
- If monthly churn is 4 %, average lifetime ≈ 25 months, lifetime value ≈ **$149**. If churn is 8 %, ≈ **$74**.
- A sustainable customer acquisition cost (CAC) is at most one third of lifetime value: about **$25 – $50**. Paid ads in the personal-safety category often cost more than this. Channels to test first: adult children buying for parents, solo-traveller and outdoor communities, partnerships.
- Fixed infrastructure at the 1,000-user tier is about $125 / month. About 21 paying users cover it. Covering that plus one modest salary ($6,000 / month) needs about 1,030 paying users.

## What to measure first

1. Do people who start the demo finish onboarding (activation)?
2. Do they still check in at week 4 (retention)? A check-in product that people stop using is churn with a false-alarm cost.
3. False-alarm rate: missed check-ins where the member was fine. This drives Lifeline opt-outs.
4. Willingness to pay: waitlist → paid conversion at $4.99 and at an annual price.
