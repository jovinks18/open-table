# donna

donna is a human-operated introduction service for people looking for a serious relationship or marriage. The product proposes one introduction at a time; it does not expose a browsable directory or use an applicant-facing matching algorithm. This repository contains the public marketing site and a browser-only application prototype.

## Technology

- Static multi-page HTML
- Vanilla JavaScript and CSS
- Vite 8 for local development and production builds
- Node's built-in test runner, with Playwright for the optional browser suites

There is no front-end framework and no backend in this repository.

## Routes

| Route | Source | Purpose |
| --- | --- | --- |
| `/` or `/index.html` | `index.html` | Homepage and session-aware opening transition |
| `/our-story.html` | `our-story.html` | Company story |
| `/faq.html` | `faq.html` | Product, process, safety, cost, and data questions |
| `/safety.html` | `safety.html` | Safety guidance, reporting, and emergency contacts |
| `/apply.html` | `apply.html` | Full-screen application prototype |

The marketing routes use the shared navigation, footer, scripts, and styles. `apply.html` is deliberately separate: it mounts a full-viewport journey and does not render the marketing navigation.

## Repository structure

```text
.
├── index.html, our-story.html, faq.html, safety.html
├── apply.html                     Application route shell
├── public/                        Images, video, and other static assets
├── src/
│   ├── application/
│   │   ├── journey/               Active apply-route implementation
│   │   ├── app.js                 Earlier application runtime; not imported by apply.html
│   │   ├── schema.js              Earlier schema; not imported by apply.html
│   │   └── validation.js          Earlier validation module
│   ├── config/site.js             Checked-in runtime configuration
│   ├── scripts/                   Shared marketing-page behaviour
│   └── styles/                    Shared tokens, components, and page styles
├── tests/                         Node regression tests and optional browser tests
├── vite.config.js                 Five-page Vite build configuration
└── package.json                   Scripts and development dependencies
```

### `src/application/journey/`

This directory owns the application currently mounted by `apply.html`.

| File | Responsibility |
| --- | --- |
| `template.html` | Markup for the entry screen, six displayed application chapters, the early exit, and the temporary submitted placeholder. |
| `controller.js` | Screen navigation, the single Roman-numeral chapter header, chapter transitions, shared control behaviour, age preferences, language/city inputs, height units, LinkedIn gating, and other DOM interactions. |
| `styles.css` | The full-screen journey's palette, typography, responsive layout, controls, mascot treatment, and reduced-motion rules. |
| `main.js` | Bootstrap: inserts `template.html`, loads journey CSS, registers field bindings, exposes the read-only `window.donnaJourney` interface, and imports the controller. |
| `chapter-one.js` | Validation and state handling specific to Chapter I, including intent gates and contact fields. |
| `fields.js` | Maps rendered controls to stable state paths. |
| `store.js` | Versioned, serializable state held in browser memory for the current page session. |
| `api.js` | Reserved backend boundary. Every method currently returns a `preview-only` result and the file is not wired into the journey runtime. |

The older modules directly under `src/application/` remain in the repository and have their own regression coverage, but `apply.html` imports `src/application/journey/main.js`, not the older `app.js` runtime.

## Run locally

Node is not pinned in the repository. Use a Node release compatible with Vite 8.

```bash
npm ci
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Tests

```bash
npm test
```

`npm test` runs every `tests/*.test.js` file with Node's test runner and then runs a production build.

Optional browser suites:

```bash
npm run test:e2e
npm run test:e2e:mascot
npm run test:e2e:mascot-image
```

The browser suites require Playwright's browser binaries. Install them separately if they are not already present.

## Production build and deployment

```bash
npm run build
npm run preview
```

The build writes five HTML entry points and their assets to `dist/`. There is no provider-specific deployment configuration or CI deployment workflow in the repository. Deploy the contents of `dist/` to a static host at the site root; the application uses root-relative asset and route URLs.

## Persistence and backend state

The active journey is a preview, not a data-collection system.

- `store.js` keeps answers in JavaScript memory only.
- Refreshing or closing the page loses the state.
- No journey code writes to local storage, cookies, IndexedDB, or a remote service.
- `api.js` performs no network, storage, submission, or upload work and is not imported by `main.js` or `controller.js`.

Do not treat `window.donnaJourney.serialize()` as persistence; it only returns the current in-memory state as JSON.

## Configuration and environment variables

The repository does not read environment variables and contains no `.env` contract. Checked-in site configuration lives in `src/config/site.js`:

```js
export const siteConfig = Object.freeze({
  contactEmail: 'thedonnapilot@gmail.com',
  pilotCity: '',
  applicationMode: 'preview',
  privacyNoticeUrl: '',
  pilotTermsUrl: '',
})
```

`privacyNoticeUrl`, `pilotTermsUrl`, and `pilotCity` are currently empty. The legal-document references live in the older application schema; the active journey does not currently render a legal consent step.

## Known incomplete areas

- No backend, authentication, draft saving, submission, photograph upload, reviewer interface, or durable storage.
- No implemented data-retention, deletion, or consent-record workflow.
- Privacy Notice and Pilot Terms URLs are not configured.
- The active journey has uneven validation: Chapter I enforces its gates and contact fields, while many later screens demonstrate controls without equivalent required-field validation.
- The submitted state is a temporary placeholder; submission is not wired.
- The active journey still contains employer and institution questions, has no income question, and contains verification and encouragement copy. These conflict with settled product rules recorded in `COMPANY_BRAIN.md`.
- The Chapter I and Chapter II screens repeat some intent, timeline, and readiness questions.
- No deployment provider or Node version is pinned.

## Future work (not current behaviour)

Before the site collects real applications, the inactive API boundary must be implemented alongside secure storage, authentication and reviewer access, legal documents, consent records, retention/deletion rules, and operational handling for the promises made on the FAQ and safety pages.
