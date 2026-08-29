# donna company brain

This document records durable product context for anyone changing donna's product, onboarding, public copy, or data model. It is separate from `README.md`, which documents how the repository is organised and run. Code and public pages describe the current implementation; settled decisions below describe product constraints, including places where the implementation has not caught up.

## Product model

donna is a human-operated introduction service for people seeking a serious relationship or marriage.

The operating model is:

1. A person applies and donna reviews the application using human judgment, not algorithmic matching.
2. donna considers and proposes one introduction at a time. There is no directory to browse, swipe queue, or search experience.
3. Each person decides whether to accept the proposed introduction.
4. donna arranges an in-person first meeting in a public place.
5. Contact details are not exchanged until after that meeting, and only if the people want them.
6. Both people complete a private debrief after the meeting. The two-sided debrief is part of the service, not an optional rating feature.

The other person does not receive someone's private debrief. The purpose is to understand the meeting, improve later introductions, and identify behaviour that should stop further introductions.

## Current product surface

- The marketing site consists of home, Our story, FAQ, and Safety pages.
- `/apply.html` mounts the browser-only journey from `src/application/journey/`.
- The journey stores data in memory and does not submit or persist it.
- The journey ends at a temporary submitted placeholder; no post-application member experience is currently rendered.
- The public FAQ says the pilot is free, based in Bangalore for now, and open to applicants outside Bangalore for future availability.

## Onboarding structure

The applicant path starts on a separate entry screen. It has no mascot or chapter numeral and contains one action, **Start**. Its current heading is **Before you start.** and it tells applicants to expect six chapters and about fifteen minutes.

The header then shows only the current Roman numeral. The implementation uses six displayed chapters; internal template IDs named `ch7-*` remain under the displayed Chapter VI.

### Chapter I — intent, readiness, and contact

- What the applicant is looking for
- Marriage timeline
- Whether family is also looking and how much influence family has
- Whether the applicant can realistically meet in the next four weeks
- Name, date of birth, Indian mobile number, and email

Choosing **I'm not sure yet** on the first question takes the applicant to the early exit screen. The exit explains that the service is not the right fit at this time and links back to the marketing site.

### Chapter II — timing and age preferences

- Relationship intent
- Marriage timeline
- Four-week availability
- Preferred age range, entered as years younger and older than the age computed from date of birth

The first three topics currently repeat questions already asked in Chapter I.

### Chapter III — work, education, and practical profile details

- Occupation, employer, and industry
- Highest degree and institution
- Languages
- Height
- LinkedIn profile

Employer and institution are present in the code but conflict with settled product decisions below. Income is not present.

### Chapter IV — location and family plans

- Living situation
- Cities the applicant would consider moving to
- Willingness to relocate
- Whether the applicant has children
- Whether they want children and whether that is non-negotiable

### Chapter V — background and lifestyle

- Previous marriage
- Broad faith or community background
- Importance of shared faith, culture, or background
- Diet, drinking, and smoking

The pilot collects any caste preference or requirement in a dedicated free-entry field. The answer is available only to the matchmaker, is not automatically shown to a prospective match, and remains separate from general faith, community, or cultural-background data.

### Chapter VI — boundaries and personal context

- Non-negotiables and deal-breakers
- What the applicant wants a partnership to feel like
- How friends would describe and tease them
- An ordinary evening
- What they have learned from past relationships
- Anything else they want donna to know

The code splits this chapter across `ch6` and `ch7-*` screen IDs while keeping the displayed numeral at VI. After `ch7-6`, the journey renders a temporary submitted placeholder.

## Settled positioning decisions

These are product constraints and should not be reopened casually:

- **Caste is collected during the pilot.** Keep it as a dedicated free-entry field so applicants can state a preference or requirement in their own words. Store it separately from general faith, community, or cultural-background data. It is matchmaker-only and must not be automatically shown to a prospective match. Do not convert it into predefined caste options.
- **No employer or institution fields.** Work and education may be understood without collecting the names of an employer or school.
- **No verification claims.** Do not claim that donna verifies identity, employment, intentions, or that a member is “real.” Manual review and consistency checks must not be described as guarantees or verification.
- **No praise or reassurance copy.** Do not congratulate, encourage, soothe, or reward applicants for answering. donna asks the next question.
- **Income is required with no opt-out.** The application must collect it; “prefer not to say” is not an option. The exact control and placement remain to be specified.
- **Mascot per question.** Each question screen uses the donna mascot alongside the question. The entry and exit screens are exceptions because they are not question screens.
- **Human judgment is the product.** Do not frame selection as an algorithm, recommendation engine, compatibility score, or automated match.
- **One introduction at a time.** Do not add browsing, queues of profiles, or simultaneous candidate selection.
- **Meeting precedes contact exchange.** Do not move phone-number exchange or extended private messaging before the first in-person meeting.
- **Two-sided debrief is mandatory.** Do not reduce it to a star rating or optional feedback prompt.

## Current implementation mismatches

These are not open product questions. They are places where the repository contradicts the settled decisions:

- `template.html`, `fields.js`, and `store.js` still collect and store employer and institution.
- Neither the active journey nor its state model contains a required income field.
- The LinkedIn error copy says it helps “verify who you are,” and the FAQ claims government-ID and proof-of-work verification.
- The active journey contains praise and reassurance, including “Good,” “I promise,” “Keep going, you're doing great,” “don't worry,” and “Thank you for being honest with me.”
- The older schema under `src/application/` also contains employer and institution fields and no income field.

Resolve these by aligning implementation and public copy with the settled decisions, not by weakening the decisions in this document.

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

## Open decisions

These remain unresolved and should stay phrased as questions until a product owner answers them:

- What income format should be required: exact amount or range, monthly or annual, gross or take-home, and in which currency?
- Where should the required income question sit in the six-chapter flow?
- Should Chapter II continue to repeat intent, timeline, and four-week readiness after Chapter I already captures them?
- Is there an applicant age boundary, given that the FAQ says there is no age limit and the active date-of-birth validator only rejects invalid or future dates?
- Is the operating geography Bangalore only, Bangalore-first with a waitlist elsewhere, or multi-city from application day?
- How should manual review be described publicly once all verification language is removed?
- Which of the post-application prototype screens belong in the first operational release?
- What retention periods apply to applications, debriefs, contact details, and safety reports?
- What deletion exceptions, if any, apply to safety records?
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

## Future and launch work — not current behaviour

Real application collection requires a backend submission path, secure storage, authentication and reviewer access, consent records, retention and deletion rules, legal documents, and operational processes for debriefs and safety reports. The journey's `api.js` is only a stub today, so none of those capabilities should be described as implemented.
