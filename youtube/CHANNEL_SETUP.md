# YouTube Channel Setup Kit — Dragon Phoenix Ascension

**Everything needed to stand up the channel shell, in the order YouTube Studio asks for it.** Copy-paste the text, upload the two images, work down the checklist. Nothing here has been published — creating the channel and going public are yours to do (see the "Founder-only" box at the end).

Last prepared: 2026-07-14. Sources: `brand/STORY.md` (About copy), `youtube/CHANNEL_STRATEGY.md` (positioning, keywords), `assets/youtube/` (art).

---

## 1. Identity

- **Channel name:** `Dragon Phoenix Ascension`
- **Handle** (pick the first that's available — this becomes youtube.com/@handle):
  1. `@DragonPhoenixAscension`
  2. `@DragonPhoenixAsc`
  3. `@DPAscension`
  4. `@DPA_Ascension`

## 2. Channel art (files in `assets/youtube/`)

- **Profile picture:** `dpa-avatar.png` — 800×800, the amber DPA emblem. (YouTube crops it to a circle; the emblem is inside the safe circle.)
- **Banner:** `dpa-banner.png` — 2560×1440. All text sits inside the 1546×423 "safe area" visible on phones; the phoenix bleeds into the wide TV/desktop zone. Upload as-is.

## 3. Description (paste-ready)

> The keyword-loaded first two lines are deliberate — YouTube indexes them and shows them in search. This is the `brand/STORY.md` **Medium Version** (brand narrative, not your personal biography — the autobiographical origin story is still yours to write when you're ready).

```
Dragon Phoenix Ascension — cinematic, science-informed videos on how your mind actually works: attention, motivation, focus, habits, decisions, confidence, and using AI to think better (not less).

Most self-improvement fails for a simple reason: it asks you to optimize a machine you've never been shown the manual for.

Dragon Phoenix Ascension is the manual — and the workshop.

We combine psychology, neuroscience, behavioral science, systems thinking, and AI into cinematic, practical education about how your mind actually works: why intelligent people procrastinate, why motivation vanishes, why focus feels random, how confidence really develops — and how to build systems that don't depend on willpower.

The Dragon is your drive: courage, focus, disciplined action.
The Phoenix is your resilience: learning, recovery, reinvention.
Ascension is what happens when they work together — the lifelong process of becoming more capable through understanding and intentional action.

No hype. No hacks. No empty motivation. Just how the mind works, and what to build with that knowledge.

Fire Within. Power Unleashed.

→ The Cognitive Command Center: https://dragon-phoenix-command.vercel.app

Note: Content on attention, ADHD, and mental health is educational and experience-based — not medical advice.
```

*(Swap the URL if you connect a custom domain. Confirm the production URL in your Vercel dashboard before pasting.)*

## 4. Links & contact (Settings → Channel → Basic info)

- **Website / primary link:** `Dragon Phoenix Command` → your production Command Center URL.
- **Business email:** add your own (Studio → Customization → Basic info → Email for business inquiries). **Left blank here on purpose** — I don't put your personal email in the repo.

## 5. Channel keywords (Settings → Channel → Basic info → Keywords)

```
psychology, neuroscience, behavioral science, focus, attention, motivation, habits, executive function, ADHD education, decision making, productivity systems, AI tools, systems thinking, self improvement, learning how to learn
```

## 6. Trailer / featured video

- The **90-second trailer is not rendered yet** — it needs Higgsfield budget (~70–120 credits + a paid plan; plan in `PRODUCTION_ASSETS.md`). That's a spend decision only you can make.
- **Optional teaser now:** the existing 5-second brand ident (`PRODUCTION_ASSETS.md` asset 2) can serve as a "Channel trailer" *if that CDN link is still live and you've visually QA'd it*. Otherwise, leave the trailer slot empty until the first real video ships — an empty trailer slot is better than a shaky one.

## 7. Do-this-in-Studio checklist

- [ ] Create the channel (Brand Account: "Dragon Phoenix Ascension").
- [ ] Set the **handle** (§1).
- [ ] Upload **profile picture** (`dpa-avatar.png`).
- [ ] Upload **banner** (`dpa-banner.png`).
- [ ] Paste the **description** (§3); fix the website URL.
- [ ] Add the **website link** and **business email** (§4).
- [ ] Add **channel keywords** (§5).
- [ ] Leave the **trailer** slot empty for now (§6).
- [ ] Set channel to your audience default; confirm **"not made for kids"** at the channel level.
- [ ] Keep the channel **unlisted/quiet** until the first video is ready — the shell can exist before you promote it.

---

## Founder-only (I can't and won't do these)

Creating the Google/Brand account, uploading the art, publishing the description, rendering or uploading a trailer, and making the channel public are all **external publishing / spending** — Tier 3. This kit gets you to a one-sitting setup; the buttons are yours to press.

## What's next after the shell is up

Per `CHANNEL_STRATEGY.md` §8, the launch spine is **The Observatory** (weekly cinematic explainer) + Shorts. Video 01 (`youtube/scripts/01-why-smart-people-procrastinate.md`) is the pipeline pilot — render-ready **after a human fact-verification pass** (`PROJECT_CONTEXT.md` §9). Standing up the shell doesn't commit you to publishing; it just means the front door exists when the first video is ready.
