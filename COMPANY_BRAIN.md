# donna company brain

This document is the working source of context for product, copy, design, engineering, safety, and launch decisions in this repository. It describes what exists now, distinguishes implemented behaviour from public promises, and records conflicts instead of silently resolving them.

Verified against the working tree based on branch `application-conversation-mode` at commit `6ce94e7` on 2026-08-24.

## How to use this document

- Read this before changing product behaviour, application copy, trust claims, or the data model.
- Treat `src/application/schema.js`, `src/application/validation.js`, `src/config/site.js`, the rendered HTML, and tests as implementation sources of truth.
- Treat public page copy as a promise, even when the supporting operation is not implemented in this repository.
- Treat items under **Conflicts to resolve** and **Launch blockers** as open. Do not infer a resolution from nearby copy.
- Update this document in the same change whenever a verified fact, policy, route, application field, safety commitment, or launch blocker changes.

## Company

donna is a human-operated introduction service for people looking to marry. The current public pilot is in Bangalore.

The central product model is:

1. A person applies and describes who they are, their life, preferences, boundaries, and relationship intent.
2. A person at donna reviews the application. The product explicitly says this is not algorithmic matching.
3. donna considers one introduction at a time and approaches each person separately.
4. Nothing is shared for an introduction until the applicant agrees.
5. If both people agree, donna arranges an in-person meeting in a public place.
6. donna follows up after the meeting and asks each person how it went.

This is not a browsable dating app. There is no directory, search, swipe interface, or matching algorithm in the repository.

## Positioning and audience

- Relationship intent: marriage, or a serious long-term relationship open to marriage.
- Pilot geography: Bangalore publicly; applications from other cities are accepted for future availability.
- Capacity: deliberately small and manually operated.
- Current application eligibility in code: age 25 or older.
- Casual dating is explicitly outside the intended use.
- The service is free during the pilot. Public copy says applicants will be told first if that changes.

## Product principles

- Human judgment over automated matching.
- One considered introduction over a large volume of profiles.
- Mutual permission before profile information is shared.
- Meeting in person over extended pre-meeting texting.
- Honest follow-up over ratings or public reviews.
- Clear safety limitations over guarantees.
- Applicant control: decline, leave, stop communicating, withdraw, or report a concern.

## Voice and brand rules

- Write the brand as **donna**, including at the start of a sentence. The lowercase form is enforced by tests.
- The supplied visual mark lives at `public/images/donna-logo-transparent.png` and is used for page wordmarks and application top bars. Ordinary written mentions remain lowercase text rather than being replaced with the image.
- Sound direct, warm, specific, and human. Avoid corporate or app-marketplace language.
- Describe donna as people doing the work, not software doing it.
- Do not imply certainty, guaranteed compatibility, guaranteed identity, or guaranteed safety.
- Prefer honest operational language such as “we review” and “we arrange.”
- The application deliberately avoids praise, reassurance, or performative acknowledgement after every answer.
- The application may use the applicant's first name only in the two intentional transition moments covered by tests.

## Current customer journey

### Marketing site

- `/` and `/index.html`: session-aware visual intro, origin-led hero, four-step explanation, and application CTA. The hero uses the exact photographic background and dark overlay extracted from the supplied onboarding landing screen; later sections retain the burgundy journey background.
- `/faq.html`: three FAQ groups with expandable answers.
- `/safety.html`: eight safety guidance cards, reporting contact, emergency contacts, and limitations.
- `/apply.html`: the complete client-side journey prototype, including application, referral, introduction, meeting, and matchmaker-tree screens.

The homepage intro runs once per browser session using `donnaExperienceSeen` in `sessionStorage`. `?intro=1` replays it. It is skippable and reduced-motion aware. Eight local city photographs on desktop, or four on mobile, use the scale-and-clip preloader choreography adapted from `code (4).zip`; the dark curtain then retracts directly into the existing photographic homepage hero.

### Application experience

`apply.html` now contains the supplied 33-screen full-journey prototype as a self-contained experience. Clicking any site “Apply to join” link skips its marketing landing screen and opens directly on `signup-choice`, beginning with “Hi, I'm donna. First things first — which brings you here today?” The supplied landing screen remains in the document for the journey's existing return-to-start actions.

The journey includes:

- a donna landing page and applicant/friend entry choice;
- a friend-verification branch;
- welcome and seven application chapters;
- the completion and “introduce a friend” pivot;
- note writing, sealing, and nominee consent;
- a sample introduction and limited chat;
- meeting scheduling and invitations;
- a matchmaker tree and full-circle outcome screen.

The application chapters collect identity and contact details, gender and interest, relationship intent and timeline, work and education, languages, height, LinkedIn, geography, children, background, lifestyle, boundaries, and long-form personal answers.

The supplied interface uses screen-to-screen client-side navigation. Most controls demonstrate interaction but do not enforce the former schema validation. LinkedIn is the only field that blocks its Continue action when empty. The date-of-birth control currently offers ages 18–75 and does not enforce the former 25+ boundary.

The previous schema-driven application remains under `src/application/`, but `apply.html` no longer imports it. Its 18-step schema, validation, photograph consent, conversational mascot runtime, and related tests are legacy code until they are deliberately removed or reconciled with the new journey.

## Current technical state

- Stack: static multi-page HTML, vanilla JavaScript, CSS, and Vite.
- There is no front-end framework and no backend in this repository.
- `src/styles/main.css` is the shared stylesheet entry point.
- Shared tokens live in `src/styles/tokens.css`; new page work should reuse them.
- Body type is Instrument Sans with system fallbacks. Display and wordmark type uses the Iowan Old Style/Palatino/Georgia serif stack.
- Vite builds four HTML entry points to `dist/`.
- The new `apply.html` is intentionally self-contained and uses its supplied Cormorant/Inter typography, dark-red palette, inline CSS and JavaScript, five embedded images, and one embedded video. Its production HTML is approximately 3.15 MB before compression.

The full journey is **prototype-only**:

- field state exists only in the current page DOM;
- refresh clears entered information and returns to the landing screen;
- there is no local storage, cookie, IndexedDB, submission request, upload, chat service, scheduling service, or analytics transport;
- “Save & exit,” sign-in, chat, scheduling, invitations, and the matchmaker tree are visual prototype affordances, not implemented services;
- `siteConfig.applicationMode` is `preview`.

## Configuration and contacts

`src/config/site.js` currently contains:

- contact email: `thedonnapilot@gmail.com`;
- pilot city: empty;
- application mode: `preview`;
- Privacy Notice URL: empty;
- Pilot Terms URL: empty.

Safety reporting copy also offers WhatsApp at `+1 3413338019`. It says Jovin reads reports and donna replies within two hours.

Emergency information on the safety page:

- immediate danger: `112`;
- women's helpline: `1091`;
- women in distress: `181`;
- cyber and financial fraud: `1930`.

donna is explicitly not an emergency service.

## Safety model and limits

Current safety guidance says donna:

- reads every application and checks whether what the applicant says is consistent;
- shares a profile only for a specific introduction and only with permission;
- arranges public first meetings and knows their time and place;
- follows up after the meeting unless the member opts out;
- warns against money requests and sharing financial information;
- accepts reports without requiring the member to first prove seriousness;
- stops introductions when someone has behaved badly.

The non-negotiable limitation is that manual review can reduce avoidable risk but cannot guarantee another person's identity, intentions, judgment, future behaviour, or safety.

## Public data promises

The FAQ currently promises that:

- applications are not sold or used for advertising;
- only team members who need the information can see it;
- introduction candidates learn only information the applicant is comfortable sharing;
- government ID and proof of work are checked before an introduction;
- verification documents are deleted after checking;
- applicants may request deletion of held data;
- a safety-report note may be retained when other applicant data is deleted;
- private debriefs are not shown to the other person.

These are public operational commitments. The current preview does not collect government ID or proof-of-work documents and does not implement storage or deletion. A production system must turn these promises into explicit data handling rules before collecting real data.

## Explicit product boundaries in the legacy schema

These boundaries remain encoded and tested under `src/application/`, but the active `apply.html` journey does not import that schema.

- No salary or income field exists.
- Faith is collected at a broad self-described level. There is no caste, sub-community, denomination, sect, gotra, or mother-tongue field.
- The non-negotiables helper is the only place where donna says it takes a preference literally.
- Non-negotiable suggestions intentionally exclude financial independence.
- Background answers are described as context, not an automatic donna filter.

## Conflicts to resolve

Do not silently choose a side. A product owner must decide, then copy, schema, validation, tests, and this document must be aligned together.

1. **Age eligibility:** the legacy gateway and validation require 25+, the FAQ says “there's no age limit,” and the active journey offers birth years for applicants as young as 18 without enforcing a minimum.
2. **Verification scope:** the FAQ promises government-ID and proof-of-work checks; the active journey says LinkedIn helps verify that every member is real; the legacy application tests explicitly prevent identity-verification claims.
3. **Contact-detail timing:** the FAQ says both people receive details after meeting if they want them; the README says details are exchanged after both agree. The actual operating rule needs one precise statement.
4. **Matching language:** the company description says there is no matching algorithm, while homepage copy uses “match profiles,” “find your match,” and “matching service” language. Human matching may be intended, but the distinction is not consistently expressed.
5. **Pilot geography configuration:** public copy says Bangalore, but `siteConfig.pilotCity` is empty.
6. **Application structure documentation:** the README and most application tests describe the previous schema-driven experience, not the active 33-screen journey.
7. **Prototype versus product:** the active journey shows sign-in, Save & exit, chat, scheduling, invitations, a shareable matchmaker tree, and successful outcomes although none has supporting storage or services.

## Launch blockers

Real application collection must not begin until all of these are resolved:

- a secure submission endpoint and error/retry behaviour;
- secure photograph and application storage;
- implemented authentication, save-and-exit, chat, scheduling, invitation, and matchmaker-tree behaviour, or removal of those affordances before launch;
- authentication and access controls for reviewers;
- a documented retention and deletion process, including the safety-report exception;
- consent-record storage and versioning;
- a written and published Privacy Notice;
- written and published Pilot Terms;
- replacement of the legal placeholders and validation of both configured URLs;
- an operational review process for the public ID, employment, safety, and two-hour response commitments;
- a decision and aligned implementation for every conflict listed above;
- confirmation that production use of the intro photographs is permitted.

Do not switch `applicationMode` away from `preview` before these controls exist.

## Engineering map

- `index.html`, `faq.html`, `safety.html`, `apply.html`: routes and public promises.
- `apply.html`: active 33-screen journey, supplied visual system, embedded media, and client-side interactions.
- `src/application/schema.js`: legacy gateway copy, chapters, fields, options, photographs, and consent model; not imported by `apply.html`.
- `src/application/validation.js`: legacy applicant-data validation rules; not active on `apply.html`.
- `src/application/app.js`: legacy conversational/focused application runtime; not imported by `apply.html`.
- `src/application/navigation.js`: legacy progress and step-clamping utilities.
- `src/config/site.js`: launch-sensitive URLs, contact, pilot city, and application mode.
- `src/scripts/modules/`: homepage intro, navigation, links, heading motion, and story-card behaviour.
- `src/styles/`: tokens, shared components, page styles, and responsive rules.
- `tests/`: behavioural contracts, brand rules, copy assertions, build checks, and browser regressions.

## Verification baseline

Verified on 2026-08-24:

- `npm test`: 107 tests passed and the production build succeeded.
- The active journey was walked at 375 × 812 through all 32 screens on the main path, from `landing` to `full-circle-reveal`, with no horizontal overflow or capitalised brand text.
- The alternate friend-introduction branch was checked from `landing` through `friend-verification` to `write-note` at the same viewport.

The existing phone-flow and mascot browser scripts exercise the disconnected legacy runtime under `src/application/`. They are not verification of the active, self-contained `apply.html` journey and were not rerun for this replacement.

## Brain maintenance checklist

When the company or product changes:

1. Update the implementation and its tests.
2. Search all public pages for the affected promise or term.
3. Reconcile FAQ, safety, homepage, gateway, consent, and configuration copy.
4. Move resolved conflicts into the relevant factual section; do not merely delete them.
5. Add new legal, safety, privacy, pricing, geography, eligibility, or response commitments here.
6. Run the default suite and the relevant browser suite.
7. Update the verified commit and date at the top.
