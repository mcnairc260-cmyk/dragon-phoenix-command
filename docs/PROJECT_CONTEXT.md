# PROJECT CONTEXT & HANDOFF — DRAGON PHOENIX ASCENSION

**Written 2026-07-07.** This document captures everything that existed only in the working memory of the AI session that produced the brand/YouTube package — decisions, rationale, assumptions, tool intelligence, risks, and open questions — so any person or AI can continue the project without loss.

Source-of-truth order when documents conflict:
1. `docs/founding/DPA_CONSTITUTION.md` (values, guardrails — highest authority)
2. `docs/founding/DPA_BLUEPRINT.md` (strategy, architecture)
3. `brand/BRAND_BIBLE.md` (brand execution rules)
4. Everything else (strategy docs, scripts, this file)

---

## 1. Project snapshot

- **Repo:** `mcnairc260-cmyk/dragon-phoenix-command` (GitHub), deployed on Vercel. Default branch `main`.
- **Founder:** Courtney McNair (this is already public in `index.html`'s embedded system prompt — see §7 privacy flag). Context from that prompt: Birmingham, AL entrepreneur; 20+ years hospitality (craft beer / fine dining); current projects include kawaii clip-art on Etsy, React apps, the "AutoPilot Digest" newsletter, a "Voice Bridge" startup, and a children's graphic novel; $1M annual revenue goal; visual learner; self-identified struggle with project completion.
- **What exists:** founding docs (Constitution v1.0, Blueprint v1.0), a single-page AI-mentor web app (`index.html` + `api/chat.js` on Vercel), and the brand/YouTube package produced in the July 2026 session (`brand/`, `youtube/`).
- **What does not exist yet:** an actual YouTube channel (assumed unlaunched), a vector logo mark, a newsletter, any recorded/edited video, a community space.

## 2. Session timeline (what was done, in order)

1. Read `DPA_Constitution.docx` and `DPA_Blueprint_v1.docx` (user uploads; full text now preserved in `docs/founding/`).
2. Wrote `brand/BRAND_BIBLE.md`, `brand/STORY.md`, `brand/LORE.md`.
3. Wrote `youtube/CHANNEL_STRATEGY.md`, `youtube/VIDEO_BACKLOG.md`, and four scripts (`youtube/scripts/00–03`).
4. Generated two media assets with Higgsfield (key art image + 5s ident video) and logged them in `youtube/PRODUCTION_ASSETS.md`.
5. Expanded `README.md`; merged everything to `main` via PR #1 (merge commit `f5607d8`).
6. Wrote this handoff document after inspecting the existing web app for the first time.

## 3. Git / GitHub state

- PR #1 ("Add brand foundation and YouTube content package") is **merged**. The working branch `claude/youtube-brand-story-videos-ppjf9n` was recreated from `main` for this handoff commit; any prior checkout of it is stale.
- Repo history before this work: `83f67e5` initial commit → `fc7fdc2` Create chat.js → `16ff7ba`/`090b35e` "Add files via upload" (the web app).
- GitHub operations in AI sessions go through the GitHub MCP tools (no `gh` CLI).

## 4. Decision log — what was invented vs. what was mandated

The founding docs mandate values, pillars, metaphors, and philosophy. **Everything else in the brand package is an invention of the AI session, approved only implicitly by the founder merging PR #1.** A successor should treat inventions as v1 proposals the founder may overrule. Complete registry:

**Mandated by founding docs (not negotiable without amending them):** mission/vision, Seven Laws, motto "Fire Within. Power Unleashed.", Dragon/Phoenix/Ascension meanings, content pillars, communication standards (no clickbait/fear/false urgency, ADHD = educational never medical), dark-mode-first command-center design language, AI-as-amplifier stance, "Dragon Phoenix Command" as the website name, YouTube as primary discovery platform.

**Invented in the AI session (v1 proposals):**
- The exact **color hexes** in BRAND_BIBLE (`#FF6B2C`, `#FFB300`, `#22D3EE`, `#0A0A0F`, `#14141C`, `#F4F4F5`, `#8B8B99`) — the founding docs only say "dark theme with vibrant accent colors." ⚠️ See §6: the live website uses *different* hexes.
- **Font suggestions** (Space Grotesk / Sora / Rajdhani, Inter, JetBrains Mono) — placeholders, not decisions. ⚠️ The live site already uses **Syne + JetBrains Mono**.
- **"The Ascension Loop"** as a named framework (derived from the Blueprint's understanding→awareness→decisions→action→transformation chain — the chain is mandated, the name is invented).
- **Community name "Operators"**, the **"rooms"** (Observatory, Forge, Archive, Aviary, Engine Room), the **adversaries** (The Static, The Siren of Sparks, The Anchor, The Mimic, The Fog), **"a Rising"**, the **rank ladder** (Ember → Kindled → Wingborn → Ascendant → Dragonlord/Firekeeper), and the closing **Creed** — all lore inventions in LORE.md.
- **Series names** = room names; the **5-part video formula** (Hook → Fog → Machine → System → Rising); the **90-day launch plan**; all 30 backlog concepts; every line of every script; all named systems inside scripts (Ignition Protocol, 10-Minute Contract, Fortress Hour, Evidence Ledger, Phoenix Protocol, Default Day, etc.).
- Supporting taglines ("Understand the mind. Command the outcome." etc.).
- The first-person **origin story in STORY.md is a template written before the founder's real biography was known** (see §5). It should be rewritten with Courtney's actual story — hospitality career, the pivot to entrepreneurship, ADHD/executive-function lived experience if applicable.

**Rationale for key creative choices (not recorded elsewhere):**
- Videos 1→2→3 form a deliberate narrative chain (procrastination → motivation → focus): each outro sets up the next video's question, building a binge loop; video 3's outro tees up video 10 (learning). Preserve these hand-offs if reordering.
- The lore is deliberately "mythic language, scientific content" because the Constitution demands Truth Over Hype while the Blueprint demands cinematic storytelling — the lore never makes claims, it names things (LORE.md §6 maps every myth term to a real referent).
- Villains are patterns-not-people so the viewer is never blamed (Constitution: respectful; Story Rule 2).
- Thumbnail rules (no shocked faces/red arrows) are an interpretation of the anti-clickbait clause, not an explicit mandate.

## 5. The founder-context gap (most important thing a successor should fix)

The brand package was written **before** discovering the founder details embedded in `index.html`. Consequences:

1. **STORY.md's origin story is generic.** It should be rewritten in Courtney's real voice: 48, Birmingham AL, 20+ years hospitality, multiple in-flight projects, visual learner, completion struggles. The "you're not lazy, you're running default settings" thesis fits this biography perfectly — make it autobiographical and it becomes far more credible.
2. **The web app and the Blueprint describe two different products.** The live site is a *personal* AI business mentor for Courtney ("Built for Courtney. Built to win.", $1M dashboard, Etsy/hospitality pillars). The Blueprint describes a *public* Cognitive Command Center for a community. Both are valid; they cannot share one homepage forever. Open decision for the founder: evolve the current page into the public platform and move the personal mentor elsewhere (e.g., an authenticated `/mentor` view), or keep the site personal and let YouTube be the public front until the platform is built.
3. The site's tone ("Million-Dollar Operating System", "$1M Target", "72hrs window before your brain rationalizes inaction") **conflicts with the Constitution's ban on hype/false urgency and unverified stats**. The three "Daily Intelligence" stats and the 72-hour claim have no cited source. If the page becomes public-facing brand surface, it needs a Constitution pass.

## 6. Brand inconsistency alert — two palettes exist

| Role | Live website (`index.html` `:root`) | BRAND_BIBLE.md (proposed) |
|---|---|---|
| Ember/primary | `#FF4D00` | `#FF6B2C` |
| Gold/secondary | `#FFB347` | `#FFB300` |
| Cyan/tertiary | `#00E5FF` | `#22D3EE` |
| Background | `#0A0A0F` (same) | `#0A0A0F` |
| Surface | `#13131F` / `#1C1C2E` | `#14141C` |
| Text | `#E8E4DC` ("ash") | `#F4F4F5` ("Ghost White") |
| Muted | `#6B6B7A` ("smoke") | `#8B8B99` ("Steel") |
| Display font | **Syne** | Space Grotesk / Sora / Rajdhani (proposed) |
| Mono | JetBrains Mono (same) | JetBrains Mono |

**Founder must pick one palette** and update the loser (BRAND_BIBLE §5 or the site CSS). Recommendation from the session that discovered this: keep the site's `#FF4D00` ember (hotter, more distinctive) and **Syne** (already live, has character), port them into BRAND_BIBLE, and keep BRAND_BIBLE's naming system (Void/Carbon/Ember/Gold/Cyan/Ghost/Steel). The generated key art used the BRAND_BIBLE hexes — close enough that regeneration is not required.

## 7. Web app technical observations (read-only findings, nothing changed)

- Stack: single static `index.html` + one Vercel serverless function `api/chat.js` proxying the Anthropic Messages API. `ANTHROPIC_API_KEY` lives in Vercel env vars (correctly server-side). `vercel.json` only rewrites `/` → `/index.html`. No framework, no build step, no dependencies.
- ⚠️ **Privacy:** the client-side `SYSTEM` prompt in `index.html` exposes the founder's full name, age, city, projects, and personal struggles to anyone who views source. If the repo/site is public and this bothers the founder, move the system prompt server-side into `api/chat.js`.
- ⚠️ **Security posture:** `Access-Control-Allow-Origin: *` + no rate limiting means anyone who finds the endpoint can spend the Anthropic API budget. Acceptable for a personal toy; fix before publicizing (lock CORS to the site origin, add basic rate limiting).
- ⚠️ **Model ID:** `api/chat.js` calls `claude-sonnet-4-6`, which does not match current Anthropic model naming (current: `claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5-20251001`). If chat requests fail with a model-not-found error, this is why.
- The welcome message is hardcoded and the chat has no persistence; `history` is in-page memory only.

## 8. Higgsfield operational intelligence (hard-won, not written anywhere else)

**Account state (as of 2026-07-05):** free plan; started with 10 credits; spent 7 (2 image + 5 video); **~3 credits remain**.

**Costs learned by preflight (`get_cost:true` is free — always preflight):**
| Generation | Cost |
|---|---|
| `nano_banana_pro` image, 1k | 2 credits |
| `cinematic_studio_video` 5s, sound off | 5 credits |
| `seedance_2_0` fast 480p 4s, no audio | 6 credits |
| `kling3_0_turbo` 5s | 7.5 credits (but see gating below) |
| `seedance_2_0` fast 720p 4s | 14 credits |
| `seedance_2_0` fast 720p 5s | 17.5 credits |
| `grok_video_v15` 720p 5s | 22.5 credits |

**Gotchas that cost real time:**
1. **Plan gating is separate from credits.** `kling3_0_turbo` returned `403 job_minimum_basic_plan_required` on the free plan even with sufficient credits. `cinematic_studio_video` and `nano_banana_pro` work on free.
2. **Preset interception:** dark/cinematic prompts trigger a `preset_recommendation` notice (ours matched "IN THE DARK", preset id `24bae836-2c4a-48e0-89b6-49fcc0b21612`) and the generation does NOT run. Retry with `declined_preset_id: "<that id>"` to force literal generation.
3. `nano_banana_pro` resolves internally to model `nano_banana_2`.
4. Higgsfield job IDs are reusable as media references in later generations (we passed the image job id as `start_image` for the video). Job IDs on record: image `49dd613a-071a-4444-8fa3-4573411e8f72`, video `61721354-dbb0-4322-a8bd-3801c20e4e64` (1344×768, 5s, silent).
5. The remote-execution proxy **blocks direct downloads from Higgsfield's CDN** (curl 403 on the CONNECT). Consequence: **the generated assets were never visually verified by the AI** — text rendering in the key art (titles are AI-rendered type) and video motion quality are unconfirmed. The founder should review both before using them publicly, and download/archive them (links can expire): URLs are in `youtube/PRODUCTION_ASSETS.md`.
6. For the full trailer, the Higgsfield MCP has a `video-explainer` workflow (load via `get_workflow_instructions("video-explainer")`) — the catalog described it as: one narrator over N stylized 10-second blocks with a single style key. Budget estimate and pipeline are in `PRODUCTION_ASSETS.md` (~70–120 credits + likely Basic plan).

## 9. Unverified content register (must be checked before anything renders)

All research claims in the scripts came from the AI's training knowledge, **not** from checked sources. Each script lists its intended sources under "Description sources section (verify before render)". Specific flags:

- Script 01: "procrastination as short-term mood repair" (Sirois & Pychyl) is solid; the amygdala–prefrontal framing is a simplification — keep it clearly metaphorical.
- Script 02: dopamine reward-prediction-error (Schultz) is solid; the formula `DRIVE ≈ VALUE × CONFIDENCE ÷ DELAY` is a deliberate simplification of temporal motivation theory (Steel & König) — present as a model, not a law.
- Script 03: "~20 minutes to re-enter deep work" derives from Gloria Mark's interruption research (often quoted as ~23 min) — verify the number and phrasing; "Brain Drain" phone-presence study is Ward et al. 2017 — solid but check effect-size honesty; "ten thousand engineers" in the hook is rhetorical, not literal — fine per brand voice, but keep it obviously rhetorical.
- Backlog video 20 deliberately treats ego depletion as **contested** science — do not present it as settled in either direction.
- The channel's own Constitution (Art. V) makes human fact-verification before render **mandatory**, and this is codified in CHANNEL_STRATEGY §7.

## 10. Assumptions register (unconfirmed — challenge freely)

1. YouTube channel does not exist yet; name will be "Dragon Phoenix Ascension".
2. Founder is solo; no team, no editor, no designer.
3. Budget is minimal (free Higgsfield tier; presumably no paid stock/music yet). Music licensing for videos is completely unaddressed.
4. English-language, primarily US audience.
5. Founder's voiceover is preferred over AI VO for flagship videos (CHANNEL_STRATEGY §7 says human VO preferred "for trust" — this was an AI judgment call, not a founder decision; AI VO of the founder's cloned voice is a legitimate alternative given Higgsfield/Descript tooling).
6. The ADHD content pillar assumes the founder has lived experience to draw on (Blueprint says "experience-based") — unconfirmed.
7. No trademark search has been done on "Dragon Phoenix Ascension", "Dragon Phoenix Command", or any invented term (Operators, Fortress Hour, etc.).
8. The uploaded .docx founding documents were assumed final v1.0s; any later revisions supersede the copies in `docs/founding/`.

## 11. Connected tooling & intended pipeline mapping

MCP servers connected to the AI session (availability may vary by session): **Higgsfield** (image/video/audio gen), **Descript** (edit-by-text video editing), **Canva** (thumbnails/banner from brand system), **Figma** (design system/UI), **Google Drive** (asset archive), **Notion** (knowledge base/Archive), **Vercel** (deploy/logs), **GitHub**. The Blueprint also names **n8n** (not connected). Intended mapping (from CHANNEL_STRATEGY §7): research→Notion/AI, scripts→Claude + human verification, visuals→Higgsfield, edit→Descript, packaging→Canva, publish→n8n, archive→Drive.

## 12. Open decisions for the founder (prioritized)

1. **Palette & font reconciliation** (§6) — blocks thumbnail templates, banner, and any new design work.
2. **Personal-mentor site vs. public platform** (§5.2) — determines the website's next iteration.
3. **Rewrite STORY.md origin story autobiographically** (§5.1) — blocks the "why I started this" video and About-page authenticity.
4. **Approve or revise the lore vocabulary** (Operators, room names, adversaries, ranks) before it ships in public video scripts.
5. **VO strategy:** record own voice vs. clone it (Higgsfield `create_voice`) vs. generic AI voice for Shorts only.
6. **Higgsfield plan:** stay free (images only, ~3 credits left) vs. Basic+credits to render the trailer (~70–120 credits, per `PRODUCTION_ASSETS.md`).
7. Whether to harden `api/chat.js` (CORS, rate limit, model ID, server-side system prompt) — recommended before any traffic arrives from YouTube.

## 13. Immediate next-actions queue

1. **Download and archive the two generated assets** (URLs in `PRODUCTION_ASSETS.md`) — CDN links may expire. Put them in Drive or a repo `assets/` folder (mind repo size for video).
2. Visually QA the key art (AI-rendered title text is the likely defect) and the ident video.
3. Create the YouTube channel; paste STORY.md's 150-word version into About; upload key art derivative as banner (asset queue in `PRODUCTION_ASSETS.md` item 1).
4. Decide open decisions 1–3 above.
5. Produce video 01 end-to-end as the pipeline pilot (script is render-ready after fact-verification pass).
6. Fix `api/chat.js` model ID whenever the chat is next touched (it may currently be broken).

## 14. The Notion operations layer (discovered 2026-07-08)

A full Notion workspace ("🐉 Dragon Phoenix Command Center", built 2026-07-07/08 by another AI session, likely ChatGPT per the AI Charter) exists alongside this repo: 19 databases (Projects hub, Tasks, Content Ideas, Knowledge Base, AI Agents, Automation Dashboard, Finance Ledger, etc.), an Operating Manual, and its own phased roadmap whose Phase 1 is **CLIPFORGE** (the kawaii clip-art Etsy business) — first Etsy sale as the success metric. The repo and workspace initially had zero cross-references (split-brain); the 2026-07-08 audit (`docs/architecture/AUDIT_2026-07.md`) defines the doctrine/operations split and the reconciliation plan. Key facts: Content Ideas held only 3 rows (30-video backlog not imported); the workspace bans secrets in Notion; its "Future Ideas" parking lot is the idea holding pen. Successors: read `docs/architecture/SYSTEM_OVERVIEW.md` §1 before touching either system.

### 14a. n8n (as of 2026-07-11)
A live n8n instance is MCP-connected (founder's personal project) holding one Notion API credential (full-workspace access) and one active workflow: `DPA — Content Idea → Pipeline Tasks` (`XRCkhfHlZ5H4cLQr`), registered and verified in the Notion Automation Dashboard. Design rows exist there for A3/A4/A6. AI-session authority in n8n: read/test = Tier 1, create/update = Tier 2, publish/activate or money/external sends = Tier 3 (SOP 13). See `docs/architecture/AUDIT_2026-07_ADDENDUM.md`.

## 15. Guide for a successor AI

- Load, in order: `docs/founding/DPA_CONSTITUTION.md` → `docs/founding/DPA_BLUEPRINT.md` → `brand/BRAND_BIBLE.md` → `brand/LORE.md` → this file. That is the full context; nothing else is hidden.
- Honor the guardrails as hard constraints: no medical advice (ADHD content especially), no fear/urgency/clickbait, no unverified factual claims in published content, AI never presented as replacing human judgment, dark-mode-first design.
- Everything labeled "invented" in §4 is negotiable with the founder; everything "mandated" is not.
- Write in the brand voice defined in BRAND_BIBLE §4 (precise, honest, practical, cinematic, respectful). The lore is seasoning, not the meal — heavy in trailers/branding, light inside educational content.
- The founder is a visual learner who struggles with completion (his own words in the site prompt): prefer showing over telling, and prefer shipping one finished thing over proposing five new ones. That is also, not coincidentally, the brand's philosophy.

## 16. Opportunity Radar MVP (2026-07-29)

A founder-directed session built **Opportunity Radar** ("Your AI Opportunity Intelligence Platform") as a self-contained sub-application in `opportunity-radar/` — branch `claude/opportunity-radar-mvp-y37490`. Full product/engineering record: `docs/OPPORTUNITY_RADAR_MVP.md` + `opportunity-radar/README.md`.

**Decisions made (flag-worthy):**
1. **Framework exception.** The founder's task prompt explicitly authorized React/TypeScript/Vite/Tailwind "if the repository does not yet contain a usable application framework." This is the recorded founder approval required by Onboarding §3.1 / Protocol Tier 3. The exception is scoped to `opportunity-radar/` only — the root site remains vanilla, zero-dependency, and untouched (`index.html`, `api/`, `vercel.json` unchanged).
2. **Missing Stitch assets.** The task prompt described Google Stitch-generated screens and a DESIGN.md in the repo; none exist in git history. The visual foundation was instead derived from the live-site palette (ember/gold/cyan on void, Syne + JetBrains Mono — the "site surface" per §6, palette conflict left untouched) plus the prompt's stated aesthetic (dark premium intelligence platform, gold/amber opportunity accents). If the founder has the Stitch files, a follow-up session should reconcile them.
3. **Placeholder pricing** ($0/$29/$99, labeled "placeholder" in the UI) — invented, not a founder pricing decision.
4. **Demo-data integrity rule.** All 12 seed opportunities carry `isDemo: true` / `sourceStatus: 'demo'`, badges throughout the UI, and unverified-signal labels; a test enforces score = computeScore(components). Nothing may be promoted past `demo` without human-verified citations.
5. **Nothing external happened**: no deploy, no spend, no publishing. Deployment options are documented in `opportunity-radar/README.md` and remain Tier 3.

**Assumptions added to the register:** (a) the task prompt's authorizations came from the founder; (b) Opportunity Radar will eventually deploy as its own Vercel project rather than a subpath; (c) auth provider choice (Supabase/Clerk/Auth.js) is still open — an adapter seam ships instead.

## 17. The Legend of Little Chi — graphic novel (2026-08-04)

`graphic-novel/The Legend of Little Chi.epub` is the Collector's Edition of the founder's all-ages graphic novel: 14 square (1707×1707) full-page images in a hand-built EPUB. Until this session the book existed in the repo with **no written record at all** — the only trace was PR #2's commit messages. This section is that record.

**Provenance.** The artwork is AI-generated; the lettering inside it is *rendered pixels imitating type*, not a real typeface, which is why the original pages are internally inconsistent (pages 7/10/11/12 look like a humanist sans, pages 3/4 like a rounded comic face) and why several balloons had garbled or overflowing words. PR #2 (merged 2026-07-30) rebuilt the container, re-lettered pages 3/5/6/8 and page 9's sound effect; the founder then replaced pages 5 and 6 with his own corrected artwork.

**The book's lettering face is Comic Neue Bold.** Established by the PR #2 repair pass, confirmed this session by scoring 16 candidate fonts against the artwork: pages 3 and 8 match Comic Neue Bold at **0.85 / 0.74 IoU**, far ahead of any alternative, while the untouched original pages score diffusely against everything (0.45–0.55) because no font underlies them. **Any future re-lettering must use Comic Neue Bold** (OFL, fetched from Google Fonts) or the book will fragment again.

**Fixed 2026-08-04** (branch `claude/book-fixes-continued-5t65eh`):
| Page | Defect | Fix |
|---|---|---|
| 8 | A stray cut-out of Chi's **head floating inside the balloon**, colliding with "Time"; patch seams in the white | Balloon wiped to its fitted body ellipse and re-lettered |
| 9 | The "GIGGLE!" repair left a **visible rectangular glow patch** with hard edges | Bamboo rebuilt by per-column inpainting; effect redrawn at the original 190×45px |
| 4 | "power. More… oomph!" **overran the balloon outline** | Re-fitted to 2 balanced lines inside the ellipse |
| 5, 6 | Founder's replacement art was set in a **condensed grotesque**, unlike the rest of the book | All five balloons re-lettered in Comic Neue Bold |
| 6 | "A forest spirit!…" is **Chi's** line but the tail pointed at the elder monk | Tail erased (wall cloned horizontally to preserve its ledge) and redrawn to Chi |
| 10 | Balloon sat in a panel **Chi is not in**; pointed tail aimed at nothing | Converted to a **thought balloon** with trailing bubbles |
| 5 | "Whispers?" is Chi's echo but the tail pointed at the **master** | **Fallback taken:** tail redrawn along the bearing to Chi, balloon *not* relocated — see below |
| 5, 10 | Removing a tail leaves the balloon's outline **open across the old mouth** | Gap sealed by redrawing that arc on the fitted ellipse in sampled ink |

**Why "Whispers?" was not moved.** Chi is clear across the panel; relocating the balloon meant reconstructing ~320×150px of diagonal plank flooring, which produced worse artifacts than the defect. The founder confirmed 2026-08-05 that the position is fine and only the pointer was at fault. If the balloon ever must sit beside Chi, that needs redrawn art, not a pixel repair.

**Tail geometry — the rule that was missing (2026-08-05).** The first attempt aimed the tail at a point only ~35px beyond the balloon edge while its mouth was 80px wide, producing a **63px-long tail behind an 80px mouth** — a blunt bracket, not a pointer. A tail must be **clearly longer than its mouth is wide** (page 5 now runs 125px long behind a 52px mouth, ~2.4:1). Two further rules learned the hard way: place both mouth points *on* the ellipse (at parametric angles either side of the tail bearing) rather than on the ray through the centre, or the side strokes end inside the white interior and read as ink spilled into the bubble; and **truncate the tip by a couple of pixels**, because a mitred joint at so acute an angle throws a long spike past the point.

**Technique notes for a successor** (tooling lives in the session scratchpad, not the repo — rebuild it from here if needed):
- Derive balloon geometry from the art: flood-fill the interior, then fit the **body ellipse from image moments**, iteratively rejecting the tail. Do *not* rely on the flood mask alone — glyphs that collided with the outline are fused to it and survive an interior-only wipe.
- The outline stroke sits at **r ≈ 1.02–1.06** of that ellipse; wiping to r ≤ 0.99 clears the interior without thinning the stroke.
- Fit text by searching point size **and** line count together, checking each line's *ink* extents against the ellipse (not the font's line box, which is far too conservative).
- Background repair: clone **along** the structure's grain (horizontal for a wall ledge) and inpaint **per column** where structure is vertical (bamboo, posts). A horizontal clone across bamboo leaves an obvious block.
- After removing a tail, **close the outline where its mouth was**. `heal_outline` does this by morphological closing of nearby ink, but it silently fails where the backdrop behind the gap is itself dark (page 5's mouth sits against dark furniture) — its test cannot tell outline from background. Use `seal_outline` there, which redraws the arc explicitly. Seal at **r ≈ 1.06**, not r = 1: `body_ellipse` fits the white *interior*, so the stroke straddles r ≈ 1.06, and sealing at r = 1 lays a bar across the balloon instead of continuing its edge. Sample the ink at a tight threshold (L < 45) or the dark backdrop washes the colour out to a visible grey patch.

**Format.** Reissued as **fixed-layout EPUB 3** (`rendition:layout: pre-paginated`, 1707×1707 viewport per page, EPUB 3 nav document) so it paginates one page per screen instead of being reflowed; `toc.ncx`, `<guide>` and the legacy `<meta name="cover">` are retained for EPUB 2 readers. **epubcheck: valid, zero messages** (validator sanity-checked against a deliberately broken copy). The **7** unmodified pages (2, 3, 7, 11–14) are byte-identical to the original release; only the **7** changed pages (cover, 4, 5, 6, 8, 9, 10) were re-encoded (quality 95, 4:4:4). Size 17318 KB → 16749 KB.

The whole repair is reproducible from the pre-session baseline by running `run_all.sh` (`fix_a` re-letters, `fix_b` fixes tails, `fix_c` the sound effect, `fix_d` the cover byline), then `build_epub.py`, then `verify.py`. Nothing is applied by hand — a fix that only exists as a manual step is a fix the next session cannot reproduce.

**Byline — resolved by the founder 2026-08-04.** The cover previously credited **"MASTER CHI"** while the Creator Credits page, the About page and the EPUB metadata (including the "© Courtney McNair" rights line) all credited **Courtney McNair**. The founder directed that it be made consistent; the cover was the 3-to-1 outlier, so its byline now reads **COURTNEY McNAIR** and the cover's alt text follows. Set in Comic Neue Bold sheared 14.5° and emboldened with a black stroke to a stem/cap ratio of ~0.21, matching the original display italic's weight and slant; the old byline sat on a smooth sky gradient and was removed by per-column inpainting.

Page 14's "Master Chi's adventures are just beginning…" was **left as written** — it is the author's own line about the series, and with the cover corrected it reads unambiguously as the character rather than as an author credit. If the founder wants the character called Little Chi there for consistency with the title, that is a one-line prose change, not an attribution fix.

## 18. EMBERLOOP — mobile browser game (2026-08-16)

A founder-directed session built **EMBERLOOP**, a portrait-mode survival game, as a self-contained sub-application in `games/emberloop/` — branch `claude/emberloop-mobile-game-qr1d70`. Full product/engineering record: `games/emberloop/README.md` + `games/emberloop/GAME_DESIGN.md`.

**What it is.** You fly a phoenix around a collapsing volcanic caldera by dragging anywhere on the screen. Passing close to danger builds "Heat" (the score multiplier); releasing the finger fires a Phoenix Burst. Levelling up pauses the run and offers three upgrade cards. Six enemy archetypes, elites every three levels, a three-stage boss at 2:50, 21 upgrades, 12 achievements, 6 cosmetic palettes, PWA-installable, all progression in `localStorage`.

**Decisions made (flag-worthy):**
1. **Second framework exception.** The founder's task prompt explicitly specified Vite + TypeScript + Phaser 3 + PWA. That is the recorded founder approval required by Onboarding §3.1 / Protocol Tier 3. Scoped to `games/emberloop/` only — the root site remains vanilla, zero-dependency and untouched (`index.html`, `api/`, `vercel.json`, root `package.json` all unchanged). This is now the **second** precedent after `opportunity-radar/`; the pattern is "sub-apps may carry their own toolchain, the root site may not."
2. **Palette follows the site surface** (§6): ember `#FF4D00`, gold `#FFB347`, cyan `#00E5FF` on void black, declared as CSS custom properties in `src/style.css`. The Brand Bible palette was deliberately not used and the §6 conflict was not resolved.
3. **System fonts, not Syne.** The site uses Google Fonts; the game uses a system stack instead so it works offline as an installed PWA and ships no third-party font. This is a deliberate divergence from the site surface, limited to the game.
4. **Zero external assets.** Every texture is drawn with Phaser `Graphics`/canvas gradients at boot, every sound is synthesised from oscillators + a noise buffer, and the PWA icons are generated by a dependency-free Node script (`scripts/make-icons.mjs`). Nothing to license, nothing to attribute, no CDN dependency.
5. **Not deployed.** No Vercel project was created, nothing was published, no money or credits were spent. Two deployment options (separate Vercel project with root `games/emberloop`, or adding a build step to the root project) are written up in the game's README and both remain **Tier 3 — founder's call**. The second option would convert the root deploy from "no build" to "build", which is exactly the kind of change Onboarding §3.1 reserves.
6. **A `?debug=1` bridge exists** (`window.__EMBERLOOP__` + FPS counter). It is off in production builds unless the flag is passed, and it exposes only game state — no secrets, no personal data.

**Verification performed** (Protocol §7.1 — exercised, not eyeballed): 80 Vitest unit tests over the pure logic (scoring/combo, difficulty scaling, XP curve, upgrade drafting and stat folding, save/achievement/cosmetic progression); strict `tsc -b` clean; production build clean; and a 42-check Playwright playtest at iPhone-14 dimensions driving the real build end-to-end — title → tutorial → upgrade draft → burst → 90 s of play → boss through all three stages → pause/settings → death → results → progression screen → restart → reload, plus scroll/zoom/selection safety, landscape overlay, desktop mouse and save persistence across a refresh. All 42 pass with zero console errors. Screenshots were reviewed at each screen; three real bugs were found and fixed that way (a packed-hex `Phaser.Display.Color` constructor call that rendered the whole arena solid red, inline `<span>`s dropping card/swatch layout, and the boss name overlapping the Heat bar).

**Known limitations (honest list):** the bundle is ~1.31 MB / 363 KB gzipped, essentially all Phaser; the automated playtest runs under SwiftShader software rendering at ~9 FPS so it proves correctness, not the 60 FPS target — that needs a real device; iOS Safari ignores `navigator.vibrate`, so haptics are a no-op there; and installability (`Add to Home Screen` prompt) needs HTTPS and so was not verified in this session.

**Assumption added to the register:** the task prompt's tech-stack authorization came from the founder, consistent with §16's precedent.

**Deployment (added 2026-08-16, founder-authorized in-session).** The founder asked for the game to be playable on an iPhone without a laptop, which is the explicit approval the deployment decision was waiting on. A **second Vercel project, `emberloop`** (`prj_TIUO6um0DuPcWQzi9gN7B03HxT7X`, team `team_EYuglnMdeL4wK09oYZFOW0u9`), is now linked to this repository with **Root Directory `games/emberloop`**. The root `dragon-phoenix-command` project is untouched and still zero-build; the two deploy independently. The `emberloop` project's production branch is `main`, so until `games/emberloop/` is merged to `main` the game is served by **preview** deployments of the feature branch. **Merging to `main` was not done** — it remains the founder's call, and nothing about the deployment requires it.

**Palette decision — EMBERLOOP follows the Brand Bible (2026-08-20, founder-directed).** Asked to make the game "polished and eye-catching while adhering to DPA branding", the founder was shown the two-palette conflict (§6, and `AI_ONBOARDING.md` §8.1 which reserves it) and answered **"Follow brand Bible."** EMBERLOOP therefore now uses Void Black `#0A0A0F`, Carbon `#14141C`, Ember Orange `#FF6B2C`, Rebirth Gold `#FFB300`, Signal Cyan `#22D3EE`, Ghost White `#F4F4F5` and Steel `#8B8B99`.

**Scope of that decision, stated precisely so it is not over-read:** it settles the palette **for the game surface only**. `index.html` and the live site are untouched and still use ember `#FF4D00` / gold `#FFB347` / cyan `#00E5FF`. The global reconciliation in §8.1 — whether the site migrates too — remains open and founder-only. A successor should not treat this as having resolved it.

Implementation: all colours now come from `games/emberloop/src/config/brand.ts` (and the matching CSS custom properties in `src/style.css`); no other file hard-codes a brand hex. Two documented deviations, both in that file: (a) three **functional signal hues** (violet, magenta, crimson) for enemy archetypes the brand's three accents cannot distinguish — readable telegraphs are a hard gameplay requirement; (b) cosmetic unlock palettes vary from the trinity by design, while the default "Ember" palette is the brand trinity exactly.

Also applied from the Bible in the same pass: the player sprite was rebuilt as **elemental fire** (§5 imagery direction: the Phoenix "rendered as elemental energy … rather than cartoon creatures"), which reversed the direction of the earlier Codex patch that aimed for a literal bird; the fast wing-beat was removed as "bouncy" per the motion rule; and two HUD label collisions introduced by that patch (HEAT drawn over the XP bar, ASCENSION over the multiplier readout) were fixed by moving the gauge labels into a left-hand column centred on their bars.

**Pacing and controls rework (2026-08-20, founder-directed).** Three pieces of founder playtest feedback, all acted on:

1. **Difficulty no longer scales with player level.** `threatAt` used to be `elapsed/60 + (level-1)*0.34`. Because levelling is driven by collecting shards, that meant *collecting fast made the game harder* — more enemies, faster, tougher — so the optimal play was to ignore the game's central verb. Threat is now a function of elapsed time alone, and a unit test asserts `threatAt.length === 1` and `difficultyAt.length === 1` so player progress cannot leak back into enemy pressure. Elite spawns moved off level-up onto their own clock for the same reason. **If a future session is tempted to re-add a skill term to threat, this is why it must not.**
2. **Fast collection is now rewarded**, via the **Ember Chain**: shards gathered within 2.8 s of each other build a streak paying +1 XP per shard every 4 chained (capped +3), plus more ambient shards on the floor (every 1.9 s, up to 16).
3. **Boss/level pacing for retention.** First boss moved 2:50 → **1:20**, repeating every 1:40 (was 2:30). At 2:50 most runs ended without ever meeting the headline encounter. Boss kills now pay **+1 health**, 24 XP and 40 shards on top of the 1,500 score, so fighting one beats kiting it. Each boss cycle is announced as a named **Phase**, giving legible progress through a run.
4. **Three control modes** (`ControlMode` in `Progression.ts`, persisted): **`relative` (new default)** — the phoenix mirrors the finger's delta from where it already was, ×1.75, so the thumb can rest low and never covers the character; **`joystick`** — touch plants a stick, direction/distance set heading/throttle; **`absolute`** — the original fly-to-finger. The founder's report was that holding a finger on the screen hid the phoenix behind their hand, which is a genuine flaw of absolute steering on a phone. All three resolve to a target point, so the movement physics are shared and only the target's origin differs. Switchable live from the pause menu.

**Assumption flagged:** the pacing numbers above are reasoned, not measured against real players — the automated playtest proves the systems fire, not that the curve *feels* right. They are all in `GameConfig.ts` and are meant to be tuned by playing.

**Still open (not built, deliberately):** the Ember currency is still cosmetic-only — `totalEmbers` unlocks palettes and nothing else. A between-run sink for it (permanent upgrades, starting bonuses) is the strongest remaining lever for "incentive to keep playing" across sessions, and it is a real feature rather than a tuning change, so it was not started without direction.
