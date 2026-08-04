# donna website

Multi-page website and frontend-only application preview for donna, a private, manually operated matchmaking pilot for people aged 25 and above.

This repository uses vanilla HTML, CSS and JavaScript with Vite as the development server and production bundler. There is no framework, backend, database, authentication system or deployment integration.

## Checkpoint status

Checkpoint date: 2026-08-03

The current checkpoint includes:

- A homepage at `/` and `/index.html`, preceded once per browser session by a skippable city-image experience intro.
- A safety page at `/safety.html`.
- A two-column disclosure FAQ page at `/faq.html`.
- An application gateway and six-step application preview at `/apply.html`.
- Shared responsive navigation and footer behaviour.
- Automated application schema, progress, privacy and validation tests.
- Responsive browser verification at 1440×900, 768px, 390×844 and 320×700.

The application is intentionally a UI preview. It does not submit, upload or persist applicant information.

## Non-goals at this checkpoint

The following are deliberately not implemented:

- Supabase or another database.
- API endpoints or server-side processing.
- Authentication or applicant accounts.
- Email delivery.
- Photograph uploads.
- Applicant data in local or session storage. The homepage intro stores only the `donnaExperienceSeen` presentation flag in `sessionStorage`.
- Analytics or advertising trackers.
- Live application submission.
- Production legal policies.
- Deployment configuration.

Do not infer that these features exist from consent language describing a future live application. The preview completion message is the authoritative current behaviour.

## Requirements

- Node.js 20.19 or newer, or Node.js 22.12 or newer.
- npm.

The Node.js requirement follows Vite 8's supported runtime versions.

## Install and run

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Vite normally starts at `http://localhost:5173`. If that port is occupied, it selects the next available port. Use the URL printed in the terminal instead of assuming a fixed port.

Run the complete automated verification:

```sh
npm test
```

`npm test` runs the Node test suite and then creates a production build. A successful test run therefore verifies both application rules and bundling.

Create only the production build:

```sh
npm run build
```

Preview an existing production build:

```sh
npm run preview
```

Generated output is written to `dist/`. Both `dist/` and `node_modules/` are intentionally excluded from Git.

## Routes

| Route | Entry file | Purpose | JavaScript entry |
| --- | --- | --- | --- |
| `/`, `/index.html` | `index.html` | Session-aware experience intro, homepage hero and how-it-works story | `src/scripts/home.js` |
| `/safety.html` | `safety.html` | Categorized review limits, safer-meeting guidance, applicant control and reporting | `src/scripts/shared.js` |
| `/faq.html` | `faq.html` | FAQ content and disclosure behaviour | `src/scripts/shared.js` plus page-local FAQ script |
| `/apply.html` | `apply.html` | Application gateway and six-step preview | `src/scripts/shared.js` and `src/application/app.js` |

All four HTML files are explicit Vite entries in `vite.config.js`.

## Repository structure

```text
.
├── index.html
├── safety.html
├── faq.html
├── apply.html
├── package.json
├── vite.config.js
├── public/
│   └── images/
│       └── intro/             # Optimized Bengaluru, Mumbai, Delhi and Hyderabad photographs
├── src/
│   ├── application/
│   │   ├── app.js             # Application rendering and in-memory interaction state
│   │   ├── navigation.js      # Gateway and six-step progress calculations
│   │   ├── schema.js          # Gateway copy, questions, photos and consents
│   │   └── validation.js      # Pure validation and sanitization helpers
│   ├── config/
│   │   └── site.js            # Launch-sensitive site configuration
│   ├── scripts/
│   │   ├── home.js            # Homepage entry
│   │   ├── shared.js          # Shared menu and contact behaviour
│   │   └── modules/
│   │       ├── experience-intro.js
│   │       ├── heading-animation.js
│   │       ├── mobile-menu.js
│   │       ├── site-links.js
│   │       └── story-cards.js
│   └── styles/
│       ├── main.css           # Stylesheet import order
│       ├── tokens.css         # Existing colours and font stacks
│       ├── base.css           # Global element and navigation rules
│       ├── responsive.css     # Shared responsive rules
│       ├── components/
│       │   ├── call-to-action.css
│       │   ├── cards.css
│       │   ├── experience-intro.css
│       │   └── footer.css
│       └── pages/
│           ├── home.css
│           ├── safety.css
│           ├── faq.css
│           └── apply.css
└── tests/
    ├── application-experience.test.js
    ├── application-validation.test.js
    ├── brand-name.test.js
    ├── experience-intro.test.js
    └── safety-page.test.js
```

## Homepage experience intro

The homepage intro is a fixed overlay rendered inside `index.html`; it is not a separate route. Keeping the existing homepage mounted underneath allows the overlay and hero to crossfade without a navigation or loading flash.

- `src/scripts/modules/experience-intro.js` controls the GSAP sequence, Skip action, focus restoration and cleanup.
- `src/styles/components/experience-intro.css` controls the overlay, scattered image layout and reduced-motion fallback.
- The sequence runs once per browser session using the non-sensitive `sessionStorage` key `donnaExperienceSeen`.
- Add `?intro=1` to the homepage URL to replay it during design review.
- Selecting Skip fades directly to the homepage and focuses `#hero-title`.
- With `prefers-reduced-motion: reduce`, the overlay is removed without playing the sequence.
- The underlying `.donna-page` is inert and hidden from assistive technology while the intro is active.
- Desktop uses eight photographs. Screens up to 640px use four to reduce crowding and rendering work.
- The photographs enter and move into their final positions before the single intro message appears, so text never competes with moving imagery.

The local photographs in `public/images/intro/` were selected from the free image collections on Unsplash for [Bengaluru](https://unsplash.com/s/photos/bengaluru-city), [Mumbai](https://unsplash.com/s/photos/mumbai-india), [Delhi](https://unsplash.com/s/photos/delhi%2C-india) and [Hyderabad](https://unsplash.com/s/photos/hyderabad). The selected photographers are zablanca_clicks, Mahadev Ittina, Anshu Aditya, Nishith Parikh, Atharva Tulsi, Shubham Sharan, Raghu Nayyar and Shiv Prasad.

## Shared design system

`src/styles/main.css` is the only stylesheet loaded by the pages. It imports tokens, base styles, component styles, page styles and shared responsive rules in a deliberate cascade order.

The existing design tokens live in `src/styles/tokens.css`. Future work should reuse these tokens rather than adding inline colours, page-specific font imports or duplicate CSS variables.

Important visual constraints:

- The homepage composition, circular introduction, story cards and typography are established designs.
- Application and content pages should look related to the homepage rather than becoming independent design systems.
- Use the existing serif and sans-serif stacks.
- Maintain 44px minimum interactive targets.
- Avoid horizontal overflow at 320px.
- Use only opacity and vertical-position transitions, and preserve the reduced-motion override.

## Application architecture

### Gateway and progress

The application gateway is deliberately outside application progress.

```text
Gateway
  └── Begin application
      ├── Step 1 of 6: Eligibility
      ├── Step 2 of 6: Basics
      ├── Step 3 of 6: About you
      ├── Step 4 of 6: What you are looking for
      ├── Step 5 of 6: Photographs
      └── Step 6 of 6: Review and consent
```

`GATEWAY_STEP` is `-1`. The six real steps occupy indexes `0` through `5`. This keeps the gateway out of progress calculations and makes Eligibility naturally render as Step 1 of 6.

Navigation rules:

- Gateway Begin opens Eligibility.
- Eligibility Back returns to the gateway.
- Returning to the gateway does not erase current in-memory answers.
- Beginning again returns to Eligibility with those answers intact.
- Reloading the browser recreates the module and clears all answers and photographs.
- Every screen transition moves focus to the new H1.
- Validation failures focus the first invalid control.

Do not reinsert the gateway into `APPLICATION_STEPS`. Doing so would recreate a seven-step progress model and break this contract.

### Centralized content and schema

`src/application/schema.js` owns:

- `APPLICATION_GATEWAY`: all visible gateway copy, checklist items, process steps and privacy assurances.
- `APPLICATION_STEPS`: the six application steps and their fields.
- `PHOTO_SLOTS`: the three required photographs and one optional photograph.
- `CONSENT_SCHEMA`: six required acknowledgements and one optional product-updates consent.
- `DATA_FIELDS`: the backend-ready field names derived from the step schema.

Keep gateway copy in `APPLICATION_GATEWAY`. Do not scatter it across event handlers or HTML fragments.

### Stable application field names

These names are intended to remain stable for future backend integration:

```text
date_of_birth
current_city
relationship_intent
available_to_meet
full_name
display_first_name
email
phone
linkedin_url
occupation
industry
about
weekend_prompt
values_prompt
languages
cultural_background
cultural_compatibility_importance
gender_identity
pronouns
interested_in
preferred_age_min
preferred_age_max
preferred_locations
relationship_goal
smoking_preference
drinking_preference
dietary_preference
has_children
wants_children
non_negotiables
additional_context
```

`age_confirmation` is UI-only and is intentionally excluded from `DATA_FIELDS`.

### Photograph slot names

```text
face_photo          required
body_photo          required
everyday_photo      required
additional_photo    optional
```

Photographs accept JPEG, PNG and WebP files up to 10 MB each.

### Consent names

```text
age_and_accuracy     required
manual_review        required
linkedin_review      required
photograph_review    required
no_guarantee         required
legal_documents      required
product_updates      optional
```

Each consent is stored as an independent boolean. Do not collapse the required acknowledgements into one checkbox.

## In-memory state and privacy contract

`src/application/app.js` creates four forms of session-only state:

| State | Contents |
| --- | --- |
| `applicationData` | Values for backend-ready application fields |
| `uiState` | UI-only choices such as age confirmation and self-described options |
| `consentData` | Separate consent booleans |
| `photoState` | Browser `File` objects and local object-preview URLs |

Privacy invariants at this checkpoint:

- No application data is written to `localStorage`, `sessionStorage`, IndexedDB or cookies.
- No application data or photograph is sent over the network.
- Files remain in memory for the current page session only.
- Photograph previews use `URL.createObjectURL`.
- Object URLs are revoked when a photograph is replaced, removed or the page unloads.
- A browser reload clears answers, consents and photographs.
- Preview completion states exactly that information and photographs were not submitted or stored.

Any future backend integration must treat changes to these invariants as a separate, explicitly reviewed project. Do not add a network request as a small extension of the current preview handler.

## Validation rules

Pure validation helpers live in `src/application/validation.js`.

Current rules include:

- Date of birth uses a precise calendar calculation for the 25th-birthday boundary.
- Applicants under 25 receive a respectful exit before the remainder of the application is collected.
- Email addresses require a conventional address shape.
- Phone numbers require a leading country code and 8 to 15 digits.
- LinkedIn URLs must use HTTPS, the LinkedIn hostname and an `/in/` profile path.
- Preferred maximum age cannot be lower than preferred minimum age.
- Numeric age preferences remain between the schema limits.
- Text fields enforce their schema character limits.
- Photograph type and 10 MB size rules are enforced before preview creation.
- Control characters are removed from text while ordinary punctuation is preserved.

Forms use `noValidate` so the application can present consistent error summaries and field-level messages. Do not remove the custom validation path without replacing its error-summary and focus behaviour.

## Site configuration

Launch-sensitive settings are centralized in `src/config/site.js`:

| Setting | Current value | Effect |
| --- | --- | --- |
| `contactEmail` | Empty | Shows a non-interactive contact placeholder |
| `pilotCity` | Empty | No pilot city is announced |
| `applicationMode` | `preview` | Enables the non-submitting Test application flow |
| `privacyNoticeUrl` | Empty | Shows `Privacy Notice (placeholder)` |
| `pilotTermsUrl` | Empty | Shows `Pilot Terms (placeholder)` |

Do not invent contact details, legal URLs or a pilot city. Configure verified values only.

Live submission must remain unavailable until, at minimum:

- A real Privacy Notice URL is configured.
- Real Pilot Terms are configured.
- A monitored contact and safety-reporting address is configured.
- A backend and secure photograph-storage design exist.
- Consent copy is reviewed against actual data handling.
- Retention, deletion and incident-response procedures are defined.

Changing `applicationMode` alone does not create a backend. The current code deliberately disables non-preview submission.

## Accessibility behaviour

The application currently provides:

- A skip link.
- Semantic headings, forms, fieldsets, legends and lists.
- A real HTML `progress` element for the six application steps.
- Accurate progress accessible names such as `Application progress: step 1 of 6`.
- No progress element on the gateway.
- Programmatic focus on the H1 after screen transitions.
- Error summaries using `role="alert"`.
- Focus on the first invalid field after validation.
- Labels and descriptions connected with `for`, `id` and `aria-describedby`.
- `aria-invalid` on invalid controls.
- Minimum 44px interaction targets.
- A `prefers-reduced-motion: reduce` override.

Avoid adding broad `aria-live` regions around the application. Focus movement and the existing targeted alert behaviour already communicate state changes.

## Automated tests

`tests/application-validation.test.js` covers:

- The exact 25th-birthday boundary.
- Invalid calendar dates.
- Email and international phone validation.
- LinkedIn profile URL validation.
- Preferred age ordering.
- Photograph type and size validation.
- Text sanitization.

`tests/application-experience.test.js` covers:

- The gateway being excluded from the six steps.
- All six visible and accessible progress states.
- Eligibility Back resolving to the gateway.
- Centralized gateway content.
- Absence of browser persistence and submission transport APIs.
- The reduced-motion styling contract.

Run the full suite before every checkpoint:

```sh
npm test
```

## Manual regression checklist

Automated tests do not replace browser interaction checks. Before a release or major workflow change, verify:

### Gateway

- No progress indicator is visible.
- The heading and Begin button appear without automatic scrolling.
- Begin moves to Eligibility and focuses its heading.
- Eligibility reads Step 1 of 6.
- Eligibility Back returns to the gateway and focuses its heading.
- Answers survive Gateway → Eligibility → Gateway → Eligibility within one page session.
- Reload clears the answers.

### Validation and review

- Empty submission shows an error summary and focuses the first invalid field.
- The exact 25th birthday is accepted.
- One day younger than 25 triggers the underage exit.
- Invalid email, phone and LinkedIn values are rejected.
- Preferred age maximum below minimum is rejected.
- Review Edit returns to the intended step with values intact.
- All six required consent errors appear independently.
- Optional product-updates consent remains optional.

### Photographs

- Each required photograph can be selected and previewed.
- Unsupported file types are rejected.
- Files larger than 10 MB are rejected.
- A photograph can be replaced.
- A photograph can be removed.
- Three required photographs are necessary to continue.
- Reload removes all previews.
- Browser developer tools show no upload request.

### Responsive and accessibility

- Test approximately 1440×900, 768px, 390×844 and 320×700.
- Confirm `document.documentElement.scrollWidth` does not exceed the viewport width.
- Check the mobile navigation at 390px and 320px.
- Navigate the gateway and form with the keyboard.
- Confirm visible focus styles on interactive controls.
- Test with reduced motion enabled.
- Check the browser console for errors.

## Safe workflow for future changes

Use this sequence to keep changes reviewable:

1. Read the relevant HTML entry, page stylesheet and owning JavaScript module.
2. Identify the invariant the change may affect, especially field names, progress, privacy or consent.
3. Keep content in schema/config files and behaviour in focused modules.
4. Make the smallest scoped change.
5. Add or update a pure automated test when possible.
6. Run `npm test`.
7. Perform the relevant items from the manual regression checklist.
8. Inspect `git diff` and `git status` before committing.
9. Record remaining placeholders or intentionally deferred work in the checkpoint summary.

Suggested checkpoint commands:

```sh
git status --short
git diff --check
npm test
git add README.md apply.html faq.html index.html safety.html package.json package-lock.json vite.config.js src tests .gitignore .claude/launch.json
git commit -m "Checkpoint donna application gateway"
```

Do not stage `.claude/settings.local.json`; it contains machine-specific permissions and is already ignored.

## Known configuration placeholders

The current repository intentionally displays honest placeholders for:

- General contact.
- Safety reporting contact.
- Privacy Notice.
- Pilot Terms.
- Pilot city.
- A verified locale-specific emergency-resource directory; the Safety page currently directs people to appropriate local emergency services.

These are launch blockers, not cosmetic cleanup. Keep preview mode enabled until they and the backend/data-handling requirements are resolved.

## Checkpoint acceptance criteria

A future checkpoint should not be considered complete unless:

- `npm test` passes.
- The production build succeeds.
- No unrelated landing-page design changed.
- No field name changed accidentally.
- No persistence or network submission was introduced unintentionally.
- Progress remains six steps with the gateway outside it.
- Required consents remain separate.
- Photograph object URLs are cleaned up.
- Required responsive widths have no horizontal overflow.
- Console errors are resolved or explicitly documented.
- Configuration placeholders and launch blockers are reported honestly.
