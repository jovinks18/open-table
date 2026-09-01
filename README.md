# donna

donna is a human-operated introduction service for people seeking a serious relationship or marriage. This repository contains its static marketing site and a browser-based application and nomination journey. There is no backend, account system, or application transport in this codebase.

## Technology

- Static multi-page HTML
- Vanilla JavaScript and CSS
- Vite 8 for development and production builds
- Node's built-in test runner

There is no front-end framework.

## Routes

| Route | Source | Purpose |
| --- | --- | --- |
| `/` or `/index.html` | `index.html` | Homepage and session-aware opening transition |
| `/our-story.html` | `our-story.html` | Company story |
| `/faq.html` | `faq.html` | Product, process, safety, cost, and data questions |
| `/safety.html` | `safety.html` | Safety guidance, reporting, and emergency contacts |
| `/apply.html` | `apply.html` | Full-screen application and nomination journey |

The marketing routes share navigation, footer, scripts, and styles. `apply.html` is a separate full-screen experience without the marketing navigation.

## Repository structure

```text
.
├── index.html
├── our-story.html
├── faq.html
├── safety.html
├── apply.html
├── public/                         Static images and video
├── src/
│   ├── application/
│   │   ├── journey/                Active apply route
│   │   ├── legacy/                 Earlier unmounted runtime and its styles
│   │   ├── schema.js               Legacy schema loaded by shared validation
│   │   └── validation.js           Shared validation helpers
│   ├── config/site.js               Checked-in site configuration
│   └── marketing/
│       ├── styles.css               Marketing stylesheet entry
│       ├── shared/                  Navigation, links, common behavior and styles
│       ├── home/                    Homepage behavior and styles
│       ├── faq/                     FAQ styles
│       ├── safety/                  Safety styles
│       └── story/                   Our story styles
├── tests/                           Node regression tests
├── vite.config.js                  Multi-page Vite build configuration
└── package.json                    Scripts and development dependencies
```

## Active journey architecture

`apply.html` mounts `src/application/journey/main.js`. The active implementation lives in `src/application/journey/`.

| File | Responsibility |
| --- | --- |
| `template.html` | Owns the markup for every routeable journey screen, including the applicant and nominator fork, six applicant chapters, save and exit, early exit, and terminal screens. |
| `controller.js` | Owns routing, validation, control hydration, conditional fields, photographs, review rendering, chapter status, local persistence, resume, and delete behavior. Only the active screen is mounted in the DOM. |
| `store.js` | Defines state version 3, applicant and nominator state, serialization, hydration, and subscriptions. |
| `fields.js` | Lists the stable applicant and nominator field paths used by the journey. |
| `main.js` | Loads the raw screen template and journey CSS, creates persistent shell elements, mounts the screen host, starts the controller, and exposes the read-only `window.donnaJourney` interface. |
| `styles.css` | Defines the full-screen journey palette, layout, controls, mascot placement, responsive rules, and reduced-motion behavior. |
| `api.js` | Defines the future backend boundary. It is not imported by the active runtime and every method returns `preview-only`. |
| `chapter-one.js` | Provides date-of-birth parsing, age bounds, age calculation, and Chapter I validation helpers. |

`src/application/validation.js` contains shared validation helpers. The active controller imports its phone validator. The module imports photograph constants from the earlier `src/application/schema.js`, so that schema is loaded transitively even though it does not define the active journey's fields.

## Journey shape

The first screen is `signup-choice`. It branches to one of two paths:

- Applicant: `welcome`, then Chapters I through VI, then `submitted`.
- Nominator: `friend-verification`, `write-note`, `seal-send`, then `nomination-sent`.

The applicant chapter panel counts are:

| Chapter | Panels |
| --- | ---: |
| I | 3 |
| II | 2 |
| III | 1 |
| IV | 1 |
| V | 4 |
| VI | 3 |

`template.html` currently contains 23 routeable `<section>` screens in total. Eighteen use the standard prompt-and-card layout. The other five are `welcome`, `saved`, `chapter-one-exit`, `nomination-sent`, and `submitted`.

## Run locally

Node is not pinned in this repository. Use a Node release compatible with Vite 8.

```bash
npm ci
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Tests

```bash
npm test
```

The script runs:

```text
node --test tests/*.test.js
npm run build
```

The build runs only if the Node test command succeeds. The current suite contains 132 tests and all 132 pass.

## Build and deployment

```bash
npm run build
npm run preview
```

Vite writes the static site to `dist/`. The repository has no provider-specific deployment configuration or CI deployment workflow. Deploy `dist/` at the site root because routes and assets use root-relative URLs.

## Persistence and transport

The active journey is browser-only, but it is not memory-only.

- State is versioned at `3` and written to `localStorage` under `donna.journey`.
- State changes are saved automatically. The Save & exit control writes the current state and opens the saved screen.
- Resume accepts only a record with the current state version.
- Delete my answers from this device clears the local record and resets the in-memory store.
- Photograph files and object URLs are held only in the current tab. Photograph metadata may enter serialized state, but all three photograph entries are reset to `null` when a saved record is resumed.
- `api.js` has `configured: false`, is not wired into `main.js` or `controller.js`, and performs no request, upload, or remote storage operation.
- There are no accounts. Nothing in the active journey leaves the browser.

The nominator seal screen says that a nominee's note will be deleted if they decline and that the nominator will not be told who declined. The repository has no backend or lifecycle code that enforces those promises. They are operational commitments handled outside this code.

## Configuration and environment variables

The repository has no environment-variable contract and does not read `.env` values. Checked-in site configuration lives in `src/config/site.js`.

`privacyNoticeUrl` and `pilotTermsUrl` are empty. The application still requires consent to both documents, so the missing documents and URLs block production data collection.

## Known incomplete areas

- `api.js` is an inactive boundary. Submission, draft transport, and photograph upload are not implemented.
- There is no authentication, account management, reviewer interface, server-side storage, or server-side deletion workflow.
- All three photographs are required. There is no skip path.
- Privacy Notice and Pilot Terms links are not configured.
- Legal and operating details are unresolved, including the legal entity name, grievance officer, registered address, and retention period.
- The journey collects caste preference and conditional caste detail separately from faith and community background. This data needs to be identified and handled as sensitive personal data under DPDP before production use.
- The seal-and-send confidentiality and deletion promises are not enforced by code.
- No deployment provider or Node version is pinned.

## Current data-model removals

The active journey and state no longer contain employer, institution, industry, alcohol, smoking, family-search involvement, current living situation, or the expectation that both partners continue working. They also no longer contain conditional follow-ups for living-situation Other, prior relationship end date, children count, faith Other, interfaith conditions, or diet Other.

The earlier runtime under `src/application/legacy/` and the older `src/application/schema.js` describe a previous form. They are retained for legacy regression coverage and are not the source of truth for the journey mounted by `apply.html`.
