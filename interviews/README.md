# Interviews — AI-moderated research conversations

**What it is.** A tool for talking to many people one-on-one without doing the interviews yourself. You describe what you want to learn, an AI moderator interviews each person from a shareable link, every conversation is summarized, and all of them are synthesized into themes with quotes and counts. You can also ask questions across the whole set in plain language.

It is the same product shape as commercial "AI interview" research tools (Perspective AI and similar). Everything here — design, copy, prompts, templates, code — is original and written in the Dragon Phoenix voice; nothing was copied from any product.

**Where it lives.** `interviews/` (three pages, one stylesheet, one helper) + two serverless functions in `api/`. Vanilla HTML/CSS/JS, zero dependencies, no build step — it deploys with the root site exactly as `index.html` does.

```
interviews/
├── index.html      researcher app: studies, guide editor, share, responses, insights, ask, settings
├── join.html       participant app: welcome → chat with the moderator → thank-you (also served at /i/<id>)
├── shared.js       helpers both pages use: API calls, localStorage, link encoding, templates
├── style.css       site palette (ember/gold/cyan, Syne + JetBrains Mono), all colours via variables
└── README.md       this file
api/
├── interview-ai.js every model call (guide | turn | summarize | synthesize | ask), structured JSON out
└── interviews.js   storage (studies, responses, syntheses) on Vercel KV / Upstash, memory fallback
```

## How it works

1. **Create a study.** Pick a template (customer discovery, churn, product feedback, win/loss, employee experience, audience research, blank) or start from your own goal. Click *Draft guide with AI* to get an opening message, 3–12 open questions with optional probes, a closing and a time estimate. Edit anything. Set the moderator's name, tone (warm / neutral / direct), follow-ups per question (0–3), language, and whether to ask for name / email.
2. **Go live and share the link.** Each person who opens it gets a private conversation. The participant page tells them plainly that an AI moderator is asking on your behalf and that you read the answers. Optional voice mode uses the browser's Web Speech API (moderator speaks, participant can dictate) — no extra service.
3. **The moderator runs the interview.** One question per message, follows the guide in order, probes when an answer is thin (bounded by your follow-up setting), never leads, judges, advises or argues, steers back if the participant drifts, and wraps up when the guide is covered or the participant wants to stop. The system prompt is built **on the server** from the study, so nothing lives in page source.
4. **Every conversation is summarized** on completion (headline, summary, key points, sentiment, verbatim quotes, answer per question, tags). Partial and ended-early conversations are kept too, so completion rate is honest.
5. **Insights** synthesizes all conversations: executive summary, themes with prevalence (`n of N`, counted from the response ids the model cites) and quotes that link back to the conversation, sentiment overview, surprises, options to consider (framed as options, not orders), open questions.
6. **Ask** is a chat over the corpus; every answer carries citations (quote + participant) and a confidence level.
7. **Export**: CSV (one row per conversation with a column per question), JSON (everything), Markdown report.

## Accounts, keys and privacy

There are no accounts. Each browser generates a secret **owner key**; it is required for every read/write of a study's responses. Participants never see it — they get the *public* study (owner key stripped) and can only append their own response, which carries its own session secret so nobody else can overwrite it. The owner key can be copied from Settings and pasted into another browser to open the same studies there. It is a capability token: treat it like a password.

The share link exists in two forms. With durable storage configured it is short (`/i/<id>`, a rewrite in `vercel.json`). Without it the link is long: it carries a copy of the public guide in the `#hash`, so an interview still works even if the memory store was reset — the response is saved if the server has the study, and if saving fails the participant is offered a copy of their answers to send by hand.

## Storage

`api/interviews.js` talks to a Redis-compatible REST store over plain `fetch` when these env vars exist in Vercel: `KV_REST_API_URL` + `KV_REST_API_TOKEN` (what the Vercel KV integration injects) or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. Without them it falls back to **process memory**: fine for trying the product, but data lives only while the function instance is warm, and the UI shows a banner saying so. Studies are additionally cached in the researcher's browser.

Keys: `study:<id>`, `owner:<key>` (set of study ids), `resps:<studyId>` (set), `resp:<studyId>:<respId>`, `synth:<studyId>`. Size caps: study 64 KB, response 256 KB, synthesis 256 KB.

**Setting up durable storage is a founder action** (it is a new external service, free tier or not): create a Vercel KV / Upstash Redis database, link it to the `dragon-phoenix-command` project, redeploy. Nothing in the code changes.

## The model

`api/interview-ai.js` calls the Anthropic Messages API directly (same pattern as `api/chat.js`, no SDK, no dependency). Defaults: model `claude-opus-5` (override with `INTERVIEW_MODEL`), structured outputs (`output_config.format` with a JSON schema per op, so the client never parses free text), effort `low` for interviewer turns (fast) and `high` for synthesis, the system prompt marked cacheable, and the server-side refusal fallback (`fallbacks: "default"`) when the model is Opus 5 / Fable. `max_tokens` is 1 K for a turn, 4 K for guide/summary/ask, 16 K for synthesis. The function's Vercel timeout is raised to 60 s in `vercel.json` because synthesis over many interviews is not a 10-second job.

Input bounds (so an open endpoint cannot be abused for free): 160 messages × 4 000 chars per transcript, 25 questions, 300 responses per synthesis, 600 K chars of corpus (beyond that only summaries are sent).

Cost is real: an interview is roughly 5–15 short turns, each carrying the transcript so far; synthesis reads every transcript. If cost matters more than depth, set `INTERVIEW_MODEL=claude-sonnet-5` — the code needs no change.

## Running it locally

There is no build. Any static server plus something that mounts `api/*.js` works. The session that built this used a ~90-line Node harness (static files + a `req/res` shim around the handlers + a mock Messages API that answers each op's schema) and drove both pages with Playwright: 47 checks covering the API's validation and auth paths, template → AI draft → editor → create → go live → share, two full participant interviews (one ended early, one on a phone viewport), preview mode, the responses table and detail modal, re-summarize, synthesis (with server persistence across a reload), ask with citations, CSV export, owner-key restore into a fresh browser, and a no-horizontal-scroll check at 390 px. Screenshots were reviewed by eye.

**What that does not prove:** it never called the real model. The request shape (structured outputs, effort, fallbacks header) follows the current API documentation, but the first real run on a Vercel preview with `ANTHROPIC_API_KEY` set is the true test — do that before sharing a link with anyone.

## Known limits (honest list)

- No accounts; the owner key is the only credential. Losing it (cleared browser data, no copy) means the studies are unreachable, though nothing is deleted.
- CORS is `*` and there is no rate limiting, matching `api/chat.js`. Security-hardening scope is a founder decision (onboarding §8.7). The input bounds above limit damage, not intent.
- Voice mode depends on the browser: dictation works in Chrome and Safari, not Firefox; speech output works almost everywhere.
- No QR code generation, no email sending, no scheduling — share the link however you already share links.
- Memory storage is a demo. Anything real needs the KV store.
- Summaries and syntheses are model output. The UI says so where it matters ("options to consider … not decisions"), and every claim is tied to a quote you can open — check them.
