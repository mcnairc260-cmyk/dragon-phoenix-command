# DPA TEASER TRAILER — 30s CUT SPEC (v1 draft)

The "budget alternative" teaser from `youtube/PRODUCTION_ASSETS.md` (0 Higgsfield credits): existing assets 1–2 + kinetic typography of the channel-trailer script's strongest beats (1, 6, 7, 14 of `youtube/scripts/00-channel-trailer.md`).

Two deliverables live in this folder:

1. **`dpa-teaser-30s.html`** — a self-contained animatic that plays the full 30s cut in any browser. It is the motion reference *and* a zero-tool export path (screen-record it at 1080p). No dependencies, no build step. If the Higgsfield CDN links have expired, scenes 4–5 fall back to CSS stand-ins and the page still plays (the fallback is a signal to re-archive the assets, not a shipping look).
2. **This spec** — the edit decision list for rebuilding the same cut in CapCut / Canva / Descript at final quality.

All on-screen copy is verbatim from the approved trailer script — no new claims, no new lore.

---

## Edit decision list

| # | Time | Source | Picture | Type on screen | Motion |
|---|---|---|---|---|---|
| 1 | 0.0–4.0 | typography | Void Black; 3–4 ember particles drifting up | `You're not lazy.` (Ghost White, sentence case) | Text fades/rises in at ~1.0s; embers loop |
| 2 | 4.0–10.0 | typography | Void Black. Hard cut in (no cross-fade — this is the script's beat-6 "glitch") | `TRY HARDER` (mono, alarm red `#FF3B30`) flickers 0–2.2s and dissolves → `Trying harder isn't a strategy.` (Ghost White) → `It's what you do when you don't understand the machine.` (Steel) | Glitch/flicker on TRY HARDER; the two real lines rise in calmly after it dies |
| 3 | 10.0–14.0 | typography | Void Black; cyan mono HUD label lower-left: `DRAGON PHOENIX ASCENSION // SYSTEM ONLINE` | `UNDERSTAND FIRST.` (fire gradient, display weight) + `This channel is the manual.` (Steel) | Title rises in; HUD label resolves 1.2s later |
| 4 | 14.0–19.0 | **Asset 2** (5s ident video, silent) | Command-center push-in, dragon/phoenix fire helix | none | Play the full 5s clip as-is; 0.8s cross-fade in |
| 5 | 19.0–25.0 | **Asset 1** (key art PNG) | Command center + title lockup (this *is* the beat-14 logo lockup) | (lockup is baked into the art) | Slow zoom 104%→114% over 6s |
| 6 | 25.0–30.0 | typography | Void Black | `Welcome to the command center.` (Ghost White) → `FIRE WITHIN. POWER UNLEASHED.` (fire gradient) → `DRAGON PHOENIX ASCENSION` (mono, Steel, wide tracking) | Three staggered rises (0s / 1.4s / 2.4s); hold to end |

Asset URLs + job IDs: `youtube/PRODUCTION_ASSETS.md` §"Generated 2026-07-05". Archive-first: if the CDN links are dead, the originals must be recovered/regenerated **by the founder** (regeneration costs credits — Tier 3).

## Design system (YouTube-packaging surface → Brand Bible §5 palette, per AI_ONBOARDING §6)

- Colors: Void Black `#0A0A0F` · Ember Orange `#FF6B2C` · Rebirth Gold `#FFB300` · Signal Cyan `#22D3EE` · Ghost White `#F4F4F5` · Steel `#8B8B99`. Fire gradient = Ember→Gold, reserved for the title card and motto only.
- Type: Space Grotesk (display/lines) + JetBrains Mono (HUD labels). If CapCut/Canva lacks Space Grotesk, Sora or Rajdhani per Brand Bible §5.
- Motion grammar: rises and resolves, never bounces. Hard cut only at scene 2 (intentional). Everything else cross-fades ≤0.8s.

## Audio (unresolved — ships silent until then)

- **No VO**: voiceover strategy is a founder-reserved decision (AI_ONBOARDING §8.5). The typography carries the lines instead.
- **No music yet**: music licensing is unaddressed (PROJECT_CONTEXT §10.3). Add a licensed dark-ambient pulse + the ember-crackle transition motif in the edit once a source is chosen. Do not use unlicensed tracks.

## Export

- From the animatic: open `dpa-teaser-30s.html` in a browser, fullscreen, screen-record at 1920×1080/30fps (macOS: Cmd-Shift-5; Windows: Xbox Game Bar). Delete the `.draft` watermark line in the HTML before a final-quality capture.
- Or rebuild in CapCut/Canva from the EDL above for clean 1080p rendering (preferred for the version that actually ships).

## Gates before this goes anywhere public (all founder-only)

- [ ] Assets 1–2 visually QA'd — the AI-rendered title text in the key art has **never been human-verified** (PROJECT_CONTEXT §8.5)
- [ ] Assets archived to Drive/repo (CDN links expire — active priority #1)
- [ ] Licensed music added, or a deliberate silent/minimal sound decision made
- [ ] Pre-publish checklist passed (BRAND_BIBLE §9)
- [ ] Founder explicitly approves the upload — publishing is Tier 3, no exceptions
