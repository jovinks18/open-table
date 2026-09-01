# donna company brain

This document records durable product context for anyone changing donna's product, onboarding, public copy, or data model. It is separate from `README.md`, which documents how the repository is organized and run. The active code is the source of truth for current behavior. Settled decisions describe product constraints, including operational requirements that are not implemented in code.

## Product model

donna is a human-operated introduction service for people seeking a serious relationship or marriage.

The operating model is:

1. A person applies and donna reviews the application using human judgment, not algorithmic matching.
2. donna considers and proposes one introduction at a time. There is no directory to browse, swipe queue, or search experience.
3. Each person decides whether to accept the proposed introduction.
4. donna arranges an in-person first meeting in a public place.
5. Contact details are not exchanged until after that meeting, and only if the people want them.
6. Both people complete a private debrief after the meeting. The two-sided debrief is part of the service, not an optional rating feature.

The other person does not receive someone's private debrief. The purpose is to understand the meeting, improve later introductions, and identify behavior that should stop further introductions.

## Current product surface

- The marketing site consists of Home, Our story, FAQ, and Safety pages.
- `/apply.html` mounts the active browser journey from `src/application/journey/`.
- The journey starts at `signup-choice`, where the person chooses the applicant or nominator path.
- The journey persists version 3 state locally under `donna.journey`.
- The active runtime has no backend, accounts, remote storage, or transport. Nothing leaves the browser.
- The public FAQ says the pilot is free, based in Bangalore for now, and open to applicants outside Bangalore for future availability.

## Onboarding structure

`template.html` defines 23 routeable screen sections. Eighteen use the standard prompt-and-card layout. The other five are the applicant welcome, saved state, early exit, applicant submission confirmation, and nomination confirmation screens.

### Entry and path selection

The first screen is `signup-choice`. It asks whether the person is applying for themselves or nominating a friend.

The applicant path is:

1. `welcome`
2. Chapters I through VI
3. `submitted`

The nominator path is:

1. `friend-verification`
2. `write-note`
3. `seal-send`
4. `nomination-sent`

The applicant welcome heading is **Before you start.** It says there are six chapters and that the journey takes about twelve minutes.

### Applicant chapter counts

| Chapter | Panels |
| --- | ---: |
| I | 3 |
| II | 2 |
| III | 1 |
| IV | 1 |
| V | 4 |
| VI | 3 |

The chapter header displays one Roman numeral at a time.

### Chapter I

#### Let’s get to know you.

- Relationship intent, with the unsure answer routing to the Chapter I exit
- Marriage timeline
- Whether the applicant is available to meet someone in the next four weeks
- Gender, with woman, man, and non-binary options
- Whether the applicant is looking to meet men, women, or is open to all
- Date of birth
- Height

#### Can we go one step further?

- Preferred age range
- How much say the family has in the marriage decision

#### How can I contact you?

- Full name
- Phone number
- Email address

Date of birth accepts applicants from 21 through 70. The preferred age range is stored as absolute minimum and maximum ages from 21 through 70.

### Chapter II

#### Let’s talk about home base.

- Current city, with a conditional free-text city when Somewhere else is selected
- Willingness to relocate
- Conditional city choices when the applicant answers Yes to relocation
- Expected living arrangement after marriage

#### Beyond the basics.

- Previous marriage or engagement
- Whether the applicant has children
- Whether the applicant wants children

### Chapter III

#### Life, on paper.

- Occupation
- Highest completed education level
- Required annual income range, with no opt-out
- Languages
- LinkedIn profile

Employer, institution, and industry are not collected.

### Chapter IV

#### What feels important to you?

- Faith, community, or cultural background
- How present that background is in everyday life
- Openness to a different faith or community
- The family's view of the same question
- Whether caste preference exists
- Conditional free-text caste detail
- Diet

Caste is stored separately from faith and community background. The active control first records whether a preference exists, then collects the detail in the applicant's own words when the answer is Yes. It is matchmaker-only and is not automatically shown to a prospective match. It must be named and handled as sensitive personal data under DPDP.

### Chapter V

Chapter V has four one-question reflective panels:

1. **What does an ordinary Tuesday evening look like for you?**
2. **Imagine a regular weekday with your partner. What would you want to do together?**
3. **What have you learnt from a past relationship, or from looking for one?**
4. **If I asked the person who knows you best, what would they say takes some getting used to about you?**

Each answer has a 600-character limit and a live counter.

### Chapter VI

#### Let’s finish up with your non-negotiables.

- A free-text description of what would make an introduction unworkable, with examples shown as placeholder text
- Whether someone else involved has a requirement the applicant does not share
- A conditional free-text explanation when the applicant answers Yes

#### Three photographs that look like you now

- One clear face photograph
- One full-length photograph
- One ordinary-life photograph

All three photographs are required. There is no skip path.

#### Review your profile

- Answers grouped by chapter
- Edit controls
- Six required consent checkboxes
- Completion action

The applicant path ends at `submitted`. It is a browser-only confirmation, not evidence that an application reached donna.

## Nominator path

The nominator provides their name, email, and LinkedIn profile. They then provide the nominee's name, who the nominee might want to meet, their relationship to the nominee, and a written note.

The seal screen requires two acknowledgements before continuing. It says that the nominee receives the note privately, that the note is deleted if the nominee declines, and that the nominator is not told who declined. The code records only that the note was sealed. There is no backend or deletion lifecycle that enforces the promise. It is currently an operational commitment handled by people.

## Persistence and data flow

- The state schema version is `3`.
- The storage key is `donna.journey`.
- State changes are written to `localStorage` automatically.
- Save & exit captures mounted fields, writes state, and opens the saved screen.
- Resume accepts only state with the current version.
- Delete my answers from this device clears local storage, resets journey state, and revokes in-tab photograph object URLs.
- Photograph files exist only in the current tab. Photograph metadata may be serialized, but all photograph entries are reset to `null` on resume.
- `api.js` exports `configured: false` and preview-only methods.
- `api.js` is not imported by `main.js` or `controller.js`.
- There is no submission transport, remote draft storage, photo upload, authentication, or account system.

## Settled positioning decisions

These are product constraints and should not be reopened casually:

- **Caste is collected during the pilot.** Keep the detail in the applicant's own words. Store it separately from general faith, community, or cultural-background data. It is matchmaker-only and must not be automatically shown to a prospective match. Do not convert the detail into predefined caste options.
- **Caste data is sensitive.** Name and handle caste preference and detail as sensitive personal data under DPDP.
- **No employer, institution, or industry fields.** Work and education may be understood without collecting employer, school, or industry names.
- **Income is required with no opt-out.** The active journey uses annual India-appropriate ranges.
- **No verification claims.** Do not claim that donna verifies identity, employment, intentions, or that a member is real. Manual review and consistency checks must not be described as guarantees or verification.
- **No praise or reassurance copy.** Do not congratulate, encourage, soothe, or reward applicants for answering. donna asks the next question.
- **Human judgment is the product.** Do not frame selection as an algorithm, recommendation engine, compatibility score, or automated match.
- **One introduction at a time.** Do not add browsing, queues of profiles, or simultaneous candidate selection.
- **Meeting precedes contact exchange.** Do not move phone-number exchange or extended private messaging before the first in-person meeting.
- **Two-sided debrief is mandatory.** Do not reduce it to a star rating or optional feedback prompt.

## Removed from earlier versions

The active journey and version 3 state no longer contain:

- employer;
- institution;
- industry;
- alcohol;
- smoking;
- the living-situation Other follow-up;
- prior relationship end date;
- children count;
- faith Other follow-up;
- interfaith condition detail;
- diet Other follow-up;
- family search involvement;
- current living situation;
- the earlier relationship-conflict reflection;
- the earlier one-thing-to-know response.

Older modules under `src/application/` still describe an earlier form. They are not the source of truth for the journey mounted by `/apply.html`.

## Voice rules

donna's voice is:

- direct;
- unhurried;
- unembarrassed about asking clear questions;
- specific rather than euphemistic;
- lowercase when writing the brand name.

Writing rules:

- Ask the question plainly.
- Give a reason only when the question is intrusive or the use of the answer would not be obvious.
- Keep the reason short and operational: what donna needs to understand or decide.
- Do not praise, reassure, encourage, congratulate, or give permission to answer honestly.
- Do not add filler acknowledgements between questions.
- Do not imply certainty about identity, compatibility, intentions, safety, or outcomes.
- Describe people doing the work: “we read,” “we decide,” and “we arrange,” not software processing matches.
- Preserve the applicant's agency without turning every screen into reassurance copy.

## Legal and production blockers

- Privacy Notice and Pilot Terms links are empty in `src/config/site.js`.
- The active review screen still requires consent to both missing documents.
- The legal entity name is not recorded.
- The grievance officer is not recorded.
- The registered address is not recorded.
- The retention period is not defined.
- Caste collection has not yet been supported by documented sensitive-data handling under DPDP.
- The nominator note-deletion and decline-confidentiality promises are not enforced by code.

Real application or nomination collection must not be described as operational while these blockers and the inactive transport remain.

## Open decisions

These remain unresolved and should stay phrased as questions until a product owner answers them:

- What is donna's legal entity name?
- Who is the grievance officer, and how can applicants contact them?
- What registered address belongs in the legal documents?
- What retention periods apply to applications, nominations, photographs, caste data, debriefs, contact details, and safety reports?
- What deletion exceptions, if any, apply to safety records?
- What access, purpose-limitation, deletion, and audit controls will apply to caste data?
- How will nominee declines trigger note deletion without revealing the decision to the nominator?
- Is the operating geography Bangalore only, Bangalore-first with a waitlist elsewhere, or multi-city from application day?
- How should manual review be described publicly without implying verification?
- What will the service cost after the pilot, and when must applicants be told?

## Public commitments that need operational support

The current FAQ and Safety pages say or imply that donna:

- asks both people for a private debrief;
- does not sell application data or use it for advertising;
- limits access to people who need it;
- accepts deletion requests, with a safety-report exception;
- arranges public first meetings and follows up afterwards;
- responds to safety reports within two hours;
- stops introducing someone who behaved badly.

These are public commitments even though the repository does not implement the required backend or operating processes.

## Current build state

`npm test` runs `node --test tests/*.test.js` and then `npm run build`. The build runs only if all Node tests pass.

The current checkout discovers 132 tests. The latest local run passed 131 and failed one stale assertion in `tests/brand-logo.test.js`, which still expects `welcome` to be the first journey screen instead of `signup-choice`. Because the command is chained, that failing assertion prevents the production build step from running through `npm test`.

## Future and launch work

The repository does not currently contain a backend submission path, secure remote storage, authentication, reviewer access, consent records outside local state, or server-side retention and deletion workflows. `api.js` is only a stub, so none of those capabilities should be described as implemented.
