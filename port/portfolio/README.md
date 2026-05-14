# Portfolio UI Kit

A high-fidelity recreation of **Chahel Paatur's portfolio site** as reusable React (JSX) components. Faithful to the original visual design — same CSS, same layout, same animations — but split into small modular pieces you can lift into a new page, deck, or microsite.

## What's here

- `index.html` — entry, wires React + Babel + all scripts.
- `styles.css` — copied verbatim from the source. Don't fork this; treat it as the design-system stylesheet and only add to it from a sibling file when you're extending.
- `animations.jsx` — `<Letters>`, `<Scramble>`, `<Counter>` + `useScrollProgress`, `useInView` hooks.
- `three-scenes.jsx` — CSS-3D scenes (`<DroneScene>`, `<AetherScene>`, `<HumanoidScene>`). WebGL-free.
- `Primitives.jsx` — small reusable atoms:
  - `<DotMark>` · the 45° brand mark
  - `<ArrowGlyph>` · `<ArrowRight>` · `<DownloadGlyph>`
  - `<Eyebrow>` · `<BlockHeader>`
  - `<StatusPill>` · `<RoleChip>` · `<TagChip>`
  - `<Button variant="primary|ghost" glyph="arrow|download">`
  - `<CornerBrackets>` · `<LogoChip>`
- `Sections.jsx` — full-section components:
  - `<Nav>` · `<Hero>` (+ `<Portrait>`) · `<Marquee>`
  - `<Work>` (composes `<Project>` with `<VizSauron>` / `<VizGauss>` / `<VizFDIR>`)
  - `<Research>` · `<Patents>` · `<HireMe>`
  - `<Education>` · `<Certifications>` · `<Leadership>` · `<About>`
  - `<Contact>` · `<Footer>`
- `App.jsx` — the entry component, composes a full page and wires the IntersectionObserver reveals.

## How to use

**As a page** — open `index.html`; this IS the portfolio.

**As pickable parts** — pull any section into a new HTML file. They all rely on:
1. The Google Fonts `<link>` (Geist, Geist Mono, Instrument Serif).
2. `styles.css` (or a subset).
3. The `Primitives` file if you use any small atoms or section components.

**Examples of recombination:**
- Press kit: `<Nav>` + `<Hero>` + `<Marquee>` + `<HireMe>` + `<Footer>`.
- Research microsite: `<Nav>` + `<BlockHeader>` + `<Research>` + `<Patents>` + `<Contact>`.
- Project case-study page: `<Nav>` + a single `<Project>` blown up to span-12 + custom long-form body.

## Things I cut from the live site (to keep the kit pure)

- The `tweaks-panel.jsx` accent-color toggle. The CSS variables still drive every accent — set `--accent`, `--accent-soft`, `--accent-line` at the `:root` to retheme.
- The `<CursorOrb>`. It's optional flair.

## Coverage

| Component / pattern              | Status |
|---|---|
| Nav (fixed, blurred)              | ✅ |
| Hero (split + portrait + parallax)| ✅ |
| Marquee strip                     | ✅ |
| Project card (6 variants + themes)| ✅ |
| CSS-3D scenes (drone, aether, humanoid) | ✅ |
| Research list rows                | ✅ |
| Patents inset grid                | ✅ |
| HireMe + animated counters        | ✅ |
| Education / Certs / Leadership    | ✅ |
| About meta grid                   | ✅ |
| Contact + live clock              | ✅ |
| Footer + social icons             | ✅ |
| Tweaks panel (accent toggle)      | ⬜ (intentionally omitted) |
| Cursor orb                        | ⬜ (intentionally omitted) |
