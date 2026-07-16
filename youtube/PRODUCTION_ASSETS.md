# PRODUCTION ASSETS LOG

Tracks generated media assets for the DPA YouTube channel (Higgsfield generations, job IDs, and usage rights within the ecosystem).

---

## Generated 2026-07-05 (Higgsfield, free plan — 10 credits)

### 1. Brand Key Art — "The Command Center" (v1)
- **Type:** Image, 1376×768 (16:9), PNG
- **Model:** Nano Banana Pro · **Cost:** 2 credits
- **Job ID:** `49dd613a-071a-4444-8fa3-4573411e8f72`
- **URL:** https://d8j0ntlcm91z4.cloudfront.net/user_3EBystljmohKMm3qco5MDlkjHSE/hf_20260705_041731_49dd613a-071a-4444-8fa3-4573411e8f72.png
- **Content:** Dark command center, empty operator's chair, dragon of ember fire + phoenix of golden fire spiraling in a helix, cyan HUD lines, title lockup "DRAGON PHOENIX ASCENSION — FIRE WITHIN. POWER UNLEASHED."
- **Use for:** channel banner base, video end-card, trailer key frame, website hero. Re-upscale to 4K before print/banner use.

### 2. Brand Ident Video — 5s cinematic sting (v1)
- **Type:** Video, 5s, 16:9, silent (add music/VO in edit)
- **Model:** Cinema Studio Video (start frame = asset 1) · **Cost:** 5 credits
- **Job ID:** `61721354-dbb0-4322-a8bd-3801c20e4e64`
- **URL:** https://d8j0ntlcm91z4.cloudfront.net/user_3EBystljmohKMm3qco5MDlkjHSE/hf_20260705_042435_61721354-dbb0-4322-a8bd-3801c20e4e64.mp4 (1344×768)
- **Content:** Slow push-in on the command center; dragon and phoenix fire spiraling upward; embers drift; HUD pulses.
- **Use for:** channel intro/outro sting, trailer closing beat (beats 12–14 of `scripts/00-channel-trailer.md`), Shorts end-card, website hero loop.
- **Post:** add the ember-crackle audio signature + a low cinematic swell; fade from/to black.

> ⚠️ Generated asset URLs may expire — download and store originals in cloud storage (Drive/asset repo) promptly.

---

## Founder-supplied brand assets (2026-07-14)

Two images uploaded by the founder for the website (provenance/generator unknown — not from this project's Higgsfield account; no job IDs). Originals processed into repo `assets/`:

### 3. DPA Monogram Emblem ("trademark emblem")
- **Source:** founder upload (white-on-black monogram: dragon + phoenix heads flanking a spear, "DPA" letters, wordmark below)
- **Repo derivative:** `assets/dpa-emblem.png` — monogram cropped (wordmark excluded), black made transparent, tinted gold `#FFB347`, 160×160, ~7 KB
- **Use:** website header logo, chat header icon, favicon. Founder holds the original.

### 4. Amber Dragon-Phoenix Key Art
- **Source:** founder upload (black winged dragon-phoenix with molten amber cracks, rising from rocks)
- **Repo derivative:** `assets/dpa-keyart.jpg` — trimmed (top band + bottom-right watermark sparkle), 900px wide, q82, ~115 KB
- **Use:** website Deck hero visual; source for the YouTube banner (asset 5).

---

## Channel art (2026-07-14, built with Pillow — no credits spent)

Brand Bible packaging palette (Void `#0A0A0F`, Ember `#FF6B2C`, Gold `#FFB300`, Ghost White `#F4F4F5`); type = Space Grotesk (wordmark) + JetBrains Mono (labels). Delivered as the YouTube launch kit (`youtube/CHANNEL_SETUP.md`).

### 5. YouTube Banner
- **File:** `assets/youtube/dpa-banner.png` — 2560×1440 (YouTube channel-art spec). All text inside the centered 1546×423 safe area; key art (asset 4) screen-blended and mask-faded into the void on the right.
- **Use:** YouTube channel banner. Content: wordmark, `FIRE WITHIN. POWER UNLEASHED.`, and the CHANNEL_STRATEGY §1 one-liner.

### 6. YouTube Avatar
- **File:** `assets/youtube/dpa-avatar.png` — 800×800. Amber DPA emblem (asset 3) on a void disc with ember glow; sized to survive YouTube's circular crop and read at 48px.
- **Use:** YouTube profile picture; reusable as a general square brand mark.

---

## Rendering the full 90-second trailer (when credits allow)

The trailer script (`scripts/00-channel-trailer.md`) has 14 beats ≈ 9 × 10-second visual blocks + voiceover.

**Estimated cost at current Higgsfield pricing:**
- 9 video blocks (Cinema Studio / Seedance fast): ~45–90 credits
- Start-frame images for consistency (Nano Banana Pro): ~18 credits (9 × 2)
- Voiceover (seed_audio TTS) or record human VO (preferred per CHANNEL_STRATEGY §7): ~5–10 credits if AI
- **Total: ~70–120 credits** → requires a Basic plan or credit top-up. Note: some models (e.g. Kling 3.0 Turbo) are plan-gated regardless of credits.

**Recommended pipeline (uses the `video-explainer` workflow):**
1. Lock the style key from asset 1 (dark command center, ember/gold fire, cyan HUD).
2. Generate one start-frame image per beat group (7–9 images) for visual consistency.
3. Animate each with Cinema Studio or Seedance (silent), 16:9, 1080p where budget allows.
4. VO: record human read of the trailer script (~215 words) — human voice builds more trust for the flagship asset.
5. Assemble in Descript/CapCut: VO-led timing, ember-crackle transitions, title cards in Space Grotesk/Sora, end on asset 2 (the ident sting).

**Budget alternative (0 extra credits):** cut a 30s "teaser trailer" from assets 1–2 + kinetic typography of the script's strongest lines (beats 1, 6, 7, 14) in CapCut/Canva.

---

## Asset request queue (next generations, in priority order)

1. Channel banner (2560×1440 safe-area composition) — variant of asset 1 without title text, logo added in Canva
2. Profile avatar — dragon/phoenix fire mark, circular crop friendly, reads at 98px
3. Thumbnail background plates ×3 (Void Black + ember gradient corners, per BRAND_BIBLE §5)
4. Trailer beats 5, 8, 9–11 start frames (HUD brain, montage plates, dragon/phoenix/helix)
5. End-screen template plate (two video slots + subscribe zone on command-center backdrop)
