# Publishing notes — *Princess Lia and the Littlest Knight*

## The file

`build_epub.py` produces a **fixed-layout (pre-paginated) EPUB 3** — the format
every major children's-ebook store expects for a picture book. Reflowable EPUB
would let devices re-wrap the text away from the art, which breaks a picture
book, so don't use it here.

Specs of the generated file:

| | |
|---|---|
| Format | EPUB 3.0, `rendition:layout = pre-paginated` |
| Page box | 1200 × 1500 px (4:5 portrait), `rendition:orientation = portrait`, `spread = none` |
| Images | 1500 × 1875 JPEG (1.25× the page box, for retina), q84 progressive |
| Pages | 17 — cover, dedication, 14 story pages, back cover |
| Text | real selectable text in a cream panel, **not** baked into the images |
| Accessibility | alt text on all 15 images, `schema:accessMode`/`accessibilityFeature`/`accessibilitySummary`, semantic nav + landmarks |
| Size | ~5.7 MB |

Text is kept as live text on purpose: it's required for text-to-speech and
screen readers, it satisfies the accessibility metadata above, and stores like
Apple Books penalise image-only "text".

## Before you upload — fill these in

1. **Author name.** The build currently sets `AU = "Uncle Courtney"`. Change it
   in `build_epub.py` to the exact name or pen name you want printed and listed,
   then rebuild. This is the name that becomes the store's author page.
2. **ISBN.** Not required for Amazon KDP (they assign a free ASIN). Apple Books
   and most aggregators want one. If you plan to sell in more than one store,
   buy your own ISBN so you stay the publisher of record rather than using a
   store-issued free one.
3. **Rights / permissions.** The book stars two identifiable minors. Get the
   parents' written permission before selling — this is a likeness-release
   issue, not a technical one.
4. **AI disclosure.** The illustrations are AI-generated (Higgsfield
   `nano_banana_pro`). Amazon KDP asks directly whether the content is
   AI-generated; answer yes for images. Note that in the US purely AI-generated
   images generally cannot be copyrighted, though your text and the book as a
   compiled work can be.

## Where it can go

- **Amazon KDP** — accepts fixed-layout EPUB directly. Choose "Children's
  picture book" so it lands in Kindle Kids' Book Creator categories.
- **Apple Books** — strictest validator; the accessibility metadata already in
  the file is what it looks for.
- **Kobo Writing Life**, **Google Play Books** — both take FXL EPUB as-is.
- **Draft2Digital / IngramSpark** — use if you want one upload distributed to
  many stores, or a print edition (the 8×10 in PDF in the parent folder is
  already print-ready for that).

## Rebuilding

```bash
python3 build_epub.py          # expects cover.jpg + p01..p14.jpg beside it
python3 validate_epub.py       # structural check: mimetype, manifest, spine,
                               # well-formed XML, alt text, viewport metas
```

The illustrations are not committed here (they're large binaries); regenerate
or re-download them using the job IDs recorded in `../README.md`, or point the
script at rasterised versions of the SVGs in `../images/`.

`validate_epub.py` is a structural check, not a substitute for
[epubcheck](https://github.com/w3c/epubcheck) — run epubcheck too if you have
Java available, since some stores run it on ingest.
