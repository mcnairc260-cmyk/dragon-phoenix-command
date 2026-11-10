# STATE — read this first in every session

Last updated: 2026-11-10. This file is the memory of the project. Update it before each session ends.

## Usage rules (from the founder, 2026-11-10)

1. The founder has **Claude Pro, not Max**. Stay inside the included usage.
2. Use **Sonnet 5.5** for building and routine work. Use a stronger model only for a hard decision or a hard bug.
3. **No parallel agents.** At most one subagent, on Sonnet, and only when it is needed.
4. **Do not repeat research.** Read `research/` first.
5. No long extended reasoning for routine tasks.
6. **Never** turn on paid API billing or usage credits without explicit founder approval.
7. Save work and decisions in this folder before stopping. Commit and push.
8. **One service only.** No new products until a customer has paid or the kill rule below is met.

## Decisions

| Date | Decision | Reason |
|---|---|---|
| 2026-11-10 | Primary service: **demo-first website fix for local businesses**, sold first to owners the founder knows, in person or by phone. | Research 02: workable as a warm-contact play. Research 03: products, SaaS, and content are too slow with no audience. |
| 2026-11-10 | Backup: a fixed-price AI service sold online (for example an AI-visibility check). | Research 03 rates it the only online option with a plausible first $500 in 30 days (agent estimate 15–25%). |
| 2026-11-10 | Target: owners with an old or broken site, or a site rented from Hibu or Thryv. Not owners with no site. | Research 02: no-site owners mostly say a site is not relevant to them. |
| 2026-11-10 | Working price: $497 setup + $49 per month. First 3 clients: $297 + $39 per month. **Estimate — founder must confirm.** | Research 02 range: $300–$800 + $39–$99 per month. |
| 2026-11-10 | Host client sites on Cloudflare Pages. Not Vercel Hobby, not GitHub Pages. | Research 02: both forbid commercial use. Re-check before the first client. |
| 2026-11-10 | **Cancelled:** research 01 (AI lead follow-up) and both automated Birmingham prospect lists. | Too costly on Pro. Lead follow-up needs phone-number registration and has legal risk, so it is a later add-on. The founder's own contact list replaces the cold list for the first test. |
| 2026-11-10 | The formal five-way weighted score was not made. | Only two of five options have finished research. The choice above rests on those two files. |

All research figures came from search extracts, not opened pages. Check a link before you quote a number to a customer.

## Validation test (smallest version)

- Founder lists 10 local owners who would answer a call.
- Claude builds a preview site for up to 5 of them (one at a time).
- Founder shows each preview in person or by phone and asks for $297.
- **Pass:** 1 paid client, or 2 clear "yes, send the invoice", from 10 conversations.
- **Kill:** 0 of 10 after real conversations. Then test the backup.

## Next actions

1. **Founder:** write 10 owner names with business name and web address (or "none"). Do not commit this list — the repo is public.
2. **Claude (Sonnet):** for the first name, run `tools/site-audit.mjs`, build a preview with `tools/lib/site.mjs`, and write a 5-line talk script.
3. Not yet built, build only when needed: command-line wrapper and tests for the page builder, invoice and onboarding checklist, money tracker.

## Money

Spent: $0. Earned: $0.
