# Security — resume-update-free-view

This repository is a **static, display-only** GitHub Pages site. There is no server, database, authentication, or local AI runtime here.

## Threat model

| Asset | Risk | Mitigation |
| --- | --- | --- |
| Visitor opens a malicious view link | XSS via resume text | All resume text is inserted with `textContent`, not `innerHTML`. No `eval`, no dynamic `import()`. |
| Visitor opens a malicious file | XSS / prototype pollution | JSON size-capped; payload schema validated; unknown templates rejected. PDF/images use blob URLs in a sandboxed iframe or `<img>`. |
| Network exfiltration | Resume sent to a third party | **Content-Security-Policy:** `connect-src 'none'`. No `fetch`, XHR, or WebSocket in app code. |
| Clickjacking | Page embedded in attacker frame | CSP `frame-ancestors 'none'`. |
| Referrer leakage | Hash sent to another site | `referrer: no-referrer`. Hash is not sent to GitHub on static load. |
| Oversized inputs | DoS in browser tab | 10 MB file cap; hash length cap; JSON text cap. |

## What we do not expose

- No API keys, pairing tokens, or engine endpoints
- No references to local LLM runtimes, model names, or desktop-only services
- No personal developer paths or internal repo mechanics in user-facing copy

## Reporting

Open a [GitHub Security Advisory](https://github.com/idekire-oss/resume-update-free-view/security/advisories/new) on this repository. For issues in the main Resume Update Free app, use the [main repo advisory page](https://github.com/idekire-oss/resume-update-free/security/advisories/new).

## Operator checklist (before each publish)

1. Grep `view/` for `localhost`, `api/`, `ollama`, tokens, or real PII fixtures — must be clean.
2. Confirm CSP in `index.html` is intact.
3. Open the Pages URL with a sample `#v1z.…` link and a small PDF; confirm no network requests in DevTools.
4. Confirm `catalog.js` matches the main app’s public template IDs.
