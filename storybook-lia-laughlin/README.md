# Princess Lia and the Littlest Knight

A personalized children's picture book starring Lia (4) and Laughlin (2).
Personal project — not part of the Dragon Phoenix Ascension site content.

## Files

- `Princess-Lia-and-the-Littlest-Knight.pdf` — print-ready book (8×10 in, 17 pages: cover, dedication, 14 story pages, back cover). Print at home or upload to any photo-book service.
- `book.html` — interactive page-turning storybook. Open in any browser (works great on a phone or tablet); tap the sides, swipe, or use arrow keys. `#p3` in the URL jumps to a page.
- `story.md` — the full manuscript, plus locked character sheets and a detailed illustration brief for every page (usable as AI art prompts).
- `images/` — the 15 scene illustrations (SVG vector art).
- `print.html` — the print layout used to render the PDF. Regenerate with:
  `chromium --headless --no-pdf-header-footer --print-to-pdf=out.pdf print.html`

## Swapping in AI-painted artwork later

The illustrations are hand-built vector art in a flat storybook style. To swap
any page for AI-generated art in the style of the animated reference portraits,
generate an image from that page's brief in `story.md` (portrait 4:5, e.g.
1200×1500), save it as `images/page-NN.png`, and update the matching
`images/page-NN.svg` reference in `book.html` and `print.html`, then re-render
the PDF.
