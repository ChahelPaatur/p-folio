# chahel.tech

Static site, no build step. Vercel serves this folder as-is (`vercel.json` at the repo root points here). React 18 and Babel load from unpkg and compile the `.jsx` files in the browser.

Run it locally from this folder:

```sh
python3 -m http.server 5173
```

## Files

| File | What's in it |
|---|---|
| `index.html` | Fonts, CDN scripts, load order |
| `styles.css` | Everything visual. Colour tokens live at the top in `:root` |
| `motion.jsx` | The single rAF loop (`onFrame`), Lenis smooth scroll, the lock-on cursor, scroll-stretched titles, dot-matrix counters, telemetry tape |
| `swarm.jsx` | Hero: the drone light show. Formations are built by `swName`, `swQuad`, `swGauss`, `swLand`; `SW_STOPS` sets where each one holds on the scroll |
| `three-scenes.jsx` | STL viewers with the LIDAR scan reveal |
| `Sections.jsx` | Nav, hangar (projects), numbers, papers, logbook, about, contact. All copy and links live here |
| `App.jsx` | Page order |

Helpers defined in `motion.jsx` (`clamp`, `lerp`, `onFrame`, `StretchTitle`, ...) are globals, so the other files use them directly.

## Editing content

- **Projects:** the `PROJECTS` array in `Sections.jsx`.
- **Papers:** the newest paper is written out in `Papers()`. Older ones are in `BIB`, patents in `FILINGS`. Update the count in `Numbers()` if you add one.
- **Education, certificates, network:** `LOG_EDU`, `LOG_CERT`, `LOG_NET`.
- **Hero captions:** `SW_FORMS` in `swarm.jsx`.

## Models

`models/*-mesh.stl` are rebuilt from the full-resolution GLBs in git history using vertex clustering (about 70k to 110k triangles each). The older `*-web.stl` files are unused: they were triangle subsets with gaps, which is why they rendered speckled.

## Keyboard

`1` to `5` jump to sections, `0` goes back to the top.
