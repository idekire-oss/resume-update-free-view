# Resume view (public)

**Display-only** companion for [Resume Update Free](https://github.com/idekire-oss/resume-update-free).

Live site: **https://idekire-oss.github.io/resume-update-free-view/**

## What this is

A static page that renders a resume sheet on **your device** — the way a recruiter would skim it. No account, no upload to GitHub, no backend.

| Included | Not included |
| --- | --- |
| Open a share link (`#v1z.…`) from Resume Update Free on your PC | Resume generation or editing |
| Open a `.view.json` or PDF you already have (max 10 MB) | Local AI / LLM features (those stay in the desktop app only) |
| ATS-style layout from a small template catalog | API calls, analytics, or third-party fonts |

## Privacy

- The URL **hash** (`#v1z.…`) is processed in your browser. GitHub Pages serves only the HTML/JS/CSS; it does **not** receive the hash or your resume text.
- Opening a file uses the **File** picker — bytes stay on your device unless you choose to share them elsewhere.
- `connect-src` is disabled (no network from this page). See [SECURITY.md](SECURITY.md).

## For recruiters

If someone sent you a view link or PDF, you are looking at a **snapshot** they chose to share. This site does not verify employers, dates, or credentials.

## For builders

Source for the main app’s public-view encoder lives in `resume-update-free` (`src/lib/publicView.ts`). Keep `catalog.js` in sync when templates change.

## License

MIT — same family as Resume Update Free.
