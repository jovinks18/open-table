# donna

Static Vite site for **donna**, a manually operated matchmaking pilot. The site uses vanilla HTML, CSS and JavaScript; there is no frontend framework or backend.

Checkpoint: 4 August 2026.

## Run locally

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm test          # Node tests, then production build
npm run build     # Writes the static site to dist/
npm run preview   # Serves the production build locally
```

## Pages

| Route | Purpose |
| --- | --- |
| `/` or `/index.html` | Experience intro, homepage and how donna works |
| `/safety.html` | Safety guidance and reporting contact |
| `/faq.html` | Two-column FAQ with expandable answers |
| `/apply.html` | Six-step application preview |

Every page uses the same warm-ivory background, shared navigation and footer. User-facing references to **donna** remain lowercase.

## Project map

```text
index.html, safety.html, faq.html, apply.html
public/images/intro/             Local city photographs
src/config/site.js               Contact and launch configuration
src/application/                 Application schema, validation and UI
src/scripts/modules/             Intro, menu, links and homepage motion
src/styles/tokens.css            Shared colours and font stacks
src/styles/components/           Reusable component styles
src/styles/pages/                Page-specific styles
tests/                            Node regression tests
vite.config.js                   Multi-page production build
```

`src/styles/main.css` is the single stylesheet entry point. Keep shared values in `tokens.css`; avoid inline styles and page-specific font imports.

## Homepage intro

- Runs once per browser session using `donnaExperienceSeen` in `sessionStorage`.
- Add `?intro=1` to replay it during review.
- Images appear and scatter before the message fades into the clear centre.
- Skip restores the homepage and moves focus to `#hero-title`.
- Reduced-motion users bypass the sequence.
- Desktop loads eight photographs; screens up to 640px load four.

The photographs in `public/images/intro/` are local copies selected from Unsplash city collections for Bengaluru, Mumbai, Delhi and Hyderabad. Replace or confirm production usage before launch.

## Application status

The application is a **client-side preview**. It validates and reviews answers in memory, but does not submit, upload, persist or transmit applicant data. Refreshing the page clears the form.

The gateway is separate from the six application steps:

1. Eligibility
2. Basics
3. About you
4. Preferences
5. Photographs
6. Review and consent

Do not add the gateway to `APPLICATION_STEPS`; progress calculations depend on the six-step model.

## Configuration

Edit `src/config/site.js`:

```js
export const siteConfig = Object.freeze({
  contactEmail: 'thedonnapilot@gmail.com',
  pilotCity: '',
  applicationMode: 'preview',
  privacyNoticeUrl: '',
  pilotTermsUrl: '',
})
```

Current launch gaps:

- No application submission endpoint or secure file storage.
- No configured Privacy Notice or pilot terms URLs.
- `pilotCity` is not configured.
- Safety reports currently open the configured contact email.

Do not switch `applicationMode` from `preview` until secure submission, storage, consent records and required policies exist.

## Verification

Run `npm test` before each checkpoint. The suite covers:

- Application navigation and validation
- Preview-only data handling
- Intro accessibility and session behavior
- Safety page structure and claims
- Lowercase donna brand usage
- Production build integrity

The static output in `dist/` can be deployed to any host that serves HTML files and assets from the site root.
