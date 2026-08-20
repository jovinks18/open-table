import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

import { buildProgressLabel, clampApplicationStep, GATEWAY_STEP } from '../src/application/navigation.js'
import {
  APPLICATION_CHAPTERS,
  APPLICATION_GATEWAY,
  APPLICATION_STEPS,
  CONSENT_SCHEMA,
  DATA_FIELDS,
  PHOTO_SHARE_CONSENT,
  PHOTO_SLOTS,
} from '../src/application/schema.js'

const allFields = APPLICATION_STEPS.flatMap(({ fields }) => fields)
const field = (name) => allFields.find((item) => item.name === name)
const screen = (id) => APPLICATION_STEPS.find((item) => item.id === id)
const fieldNames = (id) => screen(id).fields.map(({ name }) => name)

const appSource = readFileSync(new URL('../src/application/app.js', import.meta.url), 'utf8')
const schemaSource = readFileSync(new URL('../src/application/schema.js', import.meta.url), 'utf8')
const styleSource = readFileSync(new URL('../src/styles/pages/apply.css', import.meta.url), 'utf8')

function extractObjectLiteral(source, constName) {
  const match = source.match(new RegExp(`const ${constName} = Object\\.freeze\\((\\{[\\s\\S]*?\\n\\})\\)`))
  if (!match) throw new Error(`${constName} not found in app.js`)
  return new Function(`return ${match[1]}`)()
}

const fieldMessages = extractObjectLiteral(appSource, 'FIELD_MESSAGES')
const chapterBriefs = extractObjectLiteral(appSource, 'CHAPTER_BRIEFS')

/* ---- Schema is untouched by the conversation-refinement rewrite (hard constraint) ---- */

test('defines seven chapters, each broken into short screens, followed by photographs and consent', () => {
  assert.equal(GATEWAY_STEP, -1)
  assert.deepEqual(
    APPLICATION_CHAPTERS.map(({ roman, title }) => `${roman} — ${title}`),
    [
      "I — Let's start with you",
      'II — Why are you here?',
      'III — Your world',
      "IV — The life you're building",
      'V — What matters to you',
      'VI — Your boundaries',
      "VII — The part donna can't put in a dropdown",
    ],
  )
  assert.equal(APPLICATION_STEPS.length, 18)
  assert.equal(APPLICATION_STEPS.at(-2).id, 'photographs')
  assert.equal(APPLICATION_STEPS.at(-1).id, 'review-and-consent')
  assert.equal(APPLICATION_STEPS.at(-2).chapterNumber, undefined)
  assert.equal(APPLICATION_STEPS.at(-1).chapterNumber, undefined)
})

test('groups fields into screens exactly as specified (unchanged)', () => {
  assert.deepEqual(fieldNames('ch1-s1'), ['fullName', 'sharedFirstName', 'dateOfBirth', 'gender', 'genderSelfDescribe', 'interestedIn'])
  assert.deepEqual(fieldNames('ch1-s2'), ['currentCity', 'currentCityOther', 'email', 'phone'])
  assert.deepEqual(fieldNames('ch2-s1'), ['intent', 'timeline', 'availableWithinFourWeeks', 'ageRangeMin', 'ageRangeMax'])
  assert.deepEqual(fieldNames('ch3-s1'), ['occupation', 'employer', 'industry', 'industryOther', 'highestDegree', 'institution'])
  assert.deepEqual(fieldNames('ch3-s2'), ['languages', 'languagesOther', 'heightCm', 'linkedinUrl'])
  assert.deepEqual(fieldNames('ch4-s1'), ['livingSituation', 'citiesConsidered', 'citiesConsideredOther', 'willingToRelocate'])
  assert.deepEqual(fieldNames('ch4-s2'), ['hasChildren', 'wantsChildren', 'childrenNonNegotiable'])
  assert.deepEqual(fieldNames('ch5-s1'), ['maritalStatus', 'faithBackground', 'faithBackgroundOther', 'sharedBackgroundImportance'])
  assert.deepEqual(fieldNames('ch5-s2'), ['diet', 'drinking', 'smoking'])
  assert.deepEqual(fieldNames('ch6-s1'), ['nonNegotiables'])
  assert.deepEqual(fieldNames('ch7-s1'), ['partnerRole'])
  assert.deepEqual(fieldNames('ch7-s2'), ['friendsDescribe'])
  assert.deepEqual(fieldNames('ch7-s3'), ['friendsTease'])
  assert.deepEqual(fieldNames('ch7-s4'), ['tuesdayEvening'])
  assert.deepEqual(fieldNames('ch7-s5'), ['learnedAboutSelf'])
  assert.deepEqual(fieldNames('ch7-s6'), ['anythingElse'])
  assert.equal(APPLICATION_STEPS.filter((step) => step.chapterNumber === 7).length, 6)
})

test('contains every data key including friendsTease, and none of the removed keys (unchanged)', () => {
  const requiredKeys = [
    'dateOfBirth', 'currentCity', 'currentCityOther', 'gender', 'genderSelfDescribe', 'interestedIn', 'intent', 'timeline',
    'maritalStatus', 'availableWithinFourWeeks', 'fullName', 'sharedFirstName', 'email', 'phone', 'linkedinUrl',
    'occupation', 'employer', 'industry', 'industryOther', 'highestDegree', 'institution', 'languages',
    'languagesOther', 'heightCm', 'faithBackground', 'faithBackgroundOther', 'sharedBackgroundImportance',
    'diet', 'drinking', 'smoking', 'livingSituation', 'ageRangeMin', 'ageRangeMax', 'citiesConsidered',
    'citiesConsideredOther', 'willingToRelocate', 'hasChildren', 'wantsChildren', 'childrenNonNegotiable', 'nonNegotiables', 'partnerRole', 'friendsDescribe',
    'friendsTease', 'tuesdayEvening', 'learnedAboutSelf', 'anythingElse',
  ]
  requiredKeys.forEach((key) => assert.ok(DATA_FIELDS.includes(key), `${key} is missing`))
  assert.equal(DATA_FIELDS.length, requiredKeys.length)
})

test('uses supplied select values and conditional fields, unchanged from the prior redesign', () => {
  assert.deepEqual(field('genderSelfDescribe').condition, { field: 'gender', equals: 'self_describe' })
  assert.deepEqual(field('industryOther').condition, { field: 'industry', equals: 'other' })
  assert.deepEqual(field('languagesOther').condition, { field: 'languages', includes: 'other' })
  assert.deepEqual(field('currentCityOther').condition, { field: 'currentCity', equals: 'other' })
  assert.deepEqual(field('citiesConsideredOther').condition, { field: 'citiesConsidered', includes: 'other' })
  assert.deepEqual(field('faithBackgroundOther').condition, { field: 'faithBackground', equals: 'other' })
  const screenOf = (name) => APPLICATION_STEPS.find((step) => step.fields.some((f) => f.name === name))?.id
  assert.equal(screenOf('genderSelfDescribe'), screenOf('gender'))
  assert.equal(screenOf('industryOther'), screenOf('industry'))
  assert.equal(screenOf('languagesOther'), screenOf('languages'))
  assert.equal(screenOf('currentCityOther'), screenOf('currentCity'))
  assert.equal(screenOf('citiesConsideredOther'), screenOf('citiesConsidered'))
  assert.equal(screenOf('faithBackgroundOther'), screenOf('faithBackground'))
})

test('offers seven non-negotiable suggestion chips, excluding financial independence (unchanged)', () => {
  const nonNegotiables = field('nonNegotiables')
  assert.deepEqual(nonNegotiables.suggestionChips, [
    'Smoking', 'Heavy drinking', 'Unwillingness to relocate', "Doesn't want children",
    'Different views on marriage timeline', 'Long-distance', 'Different faith background',
  ])
  assert.equal(nonNegotiables.suggestionChips.includes('Not financially independent'), false)
  assert.equal(nonNegotiables.maxItems, 3)
  assert.match(appSource, /suggestionChips/)
  assert.match(appSource, /application-chip\b/)
})

test('defines two required and two optional photographs, seven required consents (unchanged)', () => {
  assert.equal(PHOTO_SLOTS.length, 4)
  assert.equal(PHOTO_SLOTS.filter(({ required }) => required).length, 2)
  assert.equal(PHOTO_SLOTS.filter(({ required }) => !required).length, 2)
  assert.equal(PHOTO_SHARE_CONSENT, 'donna may share this photograph with a person it is considering introducing you to.')
  assert.equal(CONSENT_SCHEMA.filter(({ required }) => required).length, 7)
  assert.equal(CONSENT_SCHEMA.filter(({ optional }) => optional).length, 1)
})

test('uses the simplified gateway copy, unchanged', () => {
  assert.equal(APPLICATION_GATEWAY.eyebrow, 'Private application · 25+')
  assert.deepEqual(APPLICATION_GATEWAY.nextSteps.map(({ title }) => title), ['donna reviews', 'donna asks', 'You decide'])
})

test("schema still carries the Chapter I interstitial data (unused by the UI, but the field itself is untouched)", () => {
  const withInterstitial = APPLICATION_STEPS.filter((step) => step.interstitial)
  assert.equal(withInterstitial.length, 1)
  assert.equal(withInterstitial[0].id, 'ch1-s2')
  assert.equal(withInterstitial[0].interstitial.heading, 'Chapter one, done.')
})

test('never claims to verify member identity, and reuses the real LinkedIn review copy', () => {
  assert.doesNotMatch(schemaSource, /verified/i)
  assert.doesNotMatch(styleSource, /verified/i)
  assert.equal(field('linkedinUrl').helpText, 'donna reviews your LinkedIn to confirm you are who you say you are. It is never shared without your permission.')
})

test('never praises, reassures, or gives permission — no acknowledgement anywhere but the two D2 name lines', () => {
  // schemaSource is untouched and out of scope: it still carries a stray
  // 'take your time' in an old ch4-s2 donnaLine, but that field is never
  // read for Chapters I–VI any more (getExchangeMessageLines only reads
  // FIELD_MESSAGES) — it's dead data, not applicant-facing.
  ;[/doing great/i, /better than most/i, /no wrong answer/i, /take your time/i, /you're doing/i].forEach((pattern) => {
    assert.doesNotMatch(appSource, pattern)
  })
  ;[/doing great/i, /better than most/i].forEach((pattern) => assert.doesNotMatch(schemaSource, pattern))
})

test('writes donna in lowercase everywhere', () => {
  assert.doesNotMatch(schemaSource, /\bDonna\b/)
  assert.doesNotMatch(appSource, /\bDonna\b/)
})

test('uses a real optimised mascot image asset', () => {
  assert.match(appSource, /img\.src = '\/images\/application\/donna-mascot\.webp'/)
  assert.match(appSource, /img\.alt = ''/)
  const { size } = statSync(new URL('../public/images/application/donna-mascot.webp', import.meta.url))
  assert.ok(size > 0, 'mascot asset must exist and be non-empty')
  assert.ok(size < 30 * 1024, `mascot asset should stay well under 30KB, was ${size} bytes`)
})

/* ---- Part C1 — chapter numbering is internal only ---- */

test('no roman numerals, "Chapter N —" prefix, or NN/07 counter reach applicant-facing UI', () => {
  assert.doesNotMatch(appSource, /chapterRoman/)
  assert.doesNotMatch(appSource, /`Chapter \$\{/)
  assert.doesNotMatch(appSource, /\d+\s*\/\s*\d+/)
})

test('the header renders a progress bar and nothing else', () => {
  const fn = appSource.match(/function buildProgress\(\)[\s\S]*?\n}/)[0]
  assert.doesNotMatch(fn, /createElement\('p'/)
  assert.doesNotMatch(fn, /createElement\('h1'/)
  assert.match(fn, /document\.createElement\('progress'\)/)
})

test('review groups by chapter title only, with no roman numeral prefix', () => {
  assert.match(appSource, /label: step\.chapterTitle/)
  assert.doesNotMatch(appSource, /label: `Chapter/)
})

/* ---- Part C3 — the Chapter I interstitial is deleted, not fixed ---- */

test('the interstitial component and its insertion logic are gone from the app', () => {
  assert.doesNotMatch(appSource, /Chapter one, done/)
  assert.doesNotMatch(appSource, /buildInterstitialInline/)
  assert.doesNotMatch(appSource, /screen\.interstitial/)
  assert.doesNotMatch(styleSource, /application-interstitial/)
})

/* ---- Part C4 — every chapter opens with a brief ---- */

test('each of Chapters I–VI opens with its verbatim brief before any question', () => {
  assert.deepEqual(chapterBriefs, {
    1: "Hi — I'm donna. Before I can think about who to introduce you to, I need to know who I'm talking to.",
    2: "Now the part that actually matters: what you're looking for, and when. I ask because there's no point introducing you to someone on a different timeline.",
    3: "Tell me about your days — work, study, the practical shape of your life. It's most of what I'll have to describe you with.",
    4: 'This next bit is about where your life is going. Geography and children are the two things people most often discover too late.',
    5: "Background and habits now. I don't filter anyone out on these — I just need to know what carries weight for you.",
    6: 'Now I get more direct. What would genuinely rule someone out?',
  })
  assert.match(appSource, /function enterChapter/)
  assert.match(appSource, /__chapter-brief-/)
})

test('Chapter VII still opens with the existing verbatim transition line, unchanged beyond the D2 name prefix', () => {
  assert.match(appSource, /const CHAPTER_TRANSITION_REST = 'enough of the basics\. I have the practical picture now — tell me a little about the person behind it\.'/)
  assert.match(appSource, /if \(step\.id === 'ch7-s1'\) return step\.framing/)
})

/* ---- Part C2 — the transcript clears at each chapter boundary ---- */

test('the transcript resets to the current chapter only, and progress is tracked separately (Part C2)', () => {
  assert.match(appSource, /revealedExchangeIds = \[\]/)
  assert.match(appSource, /let globalRevealedCount = 0/)
  assert.match(appSource, /const current = Math\.min\(globalRevealedCount, conversationExchangeTotal\(\)\)/)
})

test('the chapter clear uses a fade, not a slide, and is instant under reduced motion (shared with the VI→VII fade)', () => {
  assert.match(appSource, /showTranscriptTransition = true/)
  assert.match(styleSource, /\.application-transcript\.is-transitioning\s*{\s*animation: application-transcript-fade/)
  assert.match(styleSource, /@keyframes application-transcript-fade/)
  assert.match(styleSource, /\.application-transcript\.is-transitioning\s*{\s*animation: none;\s*opacity: 0;\s*}/)
})

/* ---- Part D — donna's voice ---- */

test('every Chapter I–VI field renders its own verbatim D3 message, never the field label', () => {
  const expected = {
    fullName: "What's your name?",
    sharedFirstName: 'And what should I call you when I describe you to someone? Just a first name.',
    dateOfBirth: 'When were you born?',
    gender: 'How do you describe your gender?',
    genderSelfDescribe: 'How would you put it?',
    currentCity: 'Where are you living at the moment?',
    currentCityOther: 'Which one?',
    email: "What's the best email for you?",
    phone: 'And a number I can reach you on — WhatsApp is fine.',
    intent: 'What are you looking for?',
    timeline: 'If you met the right person, what feels like the right timeline?',
    availableWithinFourWeeks: 'Could you actually meet someone in the next four weeks?',
    ageRange: 'What age range are you comfortable with?',
    interestedIn: 'Who would you like to meet?',
    occupation: 'What do you do?',
    employer: 'Who do you work for?',
    industry: 'And which industry is that?',
    industryOther: 'Which one?',
    highestDegree: 'How far did you take your studies?',
    institution: "Where did you study? Skip this if you'd rather not say.",
    languages: 'Which languages are you comfortable in?',
    languagesOther: 'Which ones?',
    heightCm: 'How tall are you?',
    linkedinUrl: "Your LinkedIn. I look at it to confirm you're who you say you are — I don't contact you there, and I never share it without your permission.",
    livingSituation: 'Who do you live with?',
    citiesConsidered: 'Which cities would you consider?',
    citiesConsideredOther: 'Which ones?',
    willingToRelocate: 'Would you move for the right person?',
    hasChildren: 'Do you have children?',
    wantsChildren: 'Do you want children?',
    childrenNonNegotiable: "Is that something you'd hold firm on?",
    maritalStatus: 'Have you been married before?',
    faithBackground: 'Is there a faith or community background that matters to you?',
    faithBackgroundOther: 'How would you describe it?',
    sharedBackgroundImportance: 'How much weight does sharing that carry for you?',
    diet: 'How do you eat?',
    drinking: 'Do you drink?',
    smoking: 'Do you smoke?',
    nonNegotiables: 'Up to three things that would genuinely rule someone out. Be specific — this is the one place I take a preference literally.',
  }
  assert.deepEqual(fieldMessages, expected)
  // These five fields are where the spec's verbatim D3 line happens to
  // coincide with the existing (untouched) schema label — kept verbatim per
  // instructions rather than paraphrased away from the given copy.
  const verbatimCoincidesWithLabel = new Set(['intent', 'timeline', 'hasChildren', 'maritalStatus', 'faithBackgroundOther'])
  Object.entries(expected).forEach(([name, message]) => {
    if (verbatimCoincidesWithLabel.has(name)) return
    const schemaField = field(name)
    if (schemaField) assert.notEqual(message, schemaField.label, `${name}'s donna message repeats its field label`)
  })
})

test('getExchangeMessageLines looks up FIELD_MESSAGES only — no fallback to donnaLine, framing or label', () => {
  const fn = appSource.match(/function getExchangeMessageLines[\s\S]*?\n}/)[0]
  assert.doesNotMatch(fn, /donnaLine/)
  assert.doesNotMatch(fn, /framing/)
  assert.doesNotMatch(fn, /\.label/)
  assert.match(fn, /FIELD_MESSAGES/)
})

test("donna uses the applicant's first name exactly twice, and degrades gracefully when it can't be derived (Part D2)", () => {
  assert.match(appSource, /function deriveFirstName/)
  assert.match(appSource, /Good to meet you, \$\{deriveFirstName\(applicationData\.fullName\)\}\.`/)
  assert.match(appSource, /firstName \? `Okay, \$\{firstName} — \$\{CHAPTER_TRANSITION_REST}` : `Okay, \$\{CHAPTER_TRANSITION_REST}`/)
  assert.match(appSource, /if \(exchange\.id === 'fullName' && deriveFirstName\(applicationData\.fullName\)\)/)
  assert.equal((appSource.match(/Good to meet you/g) || []).length, 1)
})

/* ---- Part B — conversation mode mechanics (retained) ---- */

test('every chapter I–VI field is modelled as its own conversational exchange', () => {
  assert.match(appSource, /function buildConversationExchanges/)
  assert.match(appSource, /chapterNumber >= 1 && step\.chapterNumber <= 6/)
  assert.match(appSource, /kind: 'ageRange'/)
  assert.match(appSource, /if \(field\.name === 'ageRangeMax'\) continue/)
})

test('donna message, then input, then a collapsed reply bubble — no card or panel wraps the input', () => {
  assert.match(appSource, /application-message-donna/)
  assert.match(appSource, /application-exchange-input/)
  assert.match(appSource, /application-reply/)
  assert.doesNotMatch(styleSource, /\.application-exchange-input\s*{[^}]*border/s)
})

test('there is no fixed composer bar', () => {
  assert.doesNotMatch(styleSource, /application-composer/)
  assert.doesNotMatch(styleSource, /\.application-exchange-input\s*{[^}]*position:\s*fixed/s)
  assert.doesNotMatch(styleSource, /\.application-transcript\s*{[^}]*position:\s*fixed/s)
})

test('answers collapse to readable summary formats: single choice, multi-select, height, age range, date of birth, non-negotiables', () => {
  assert.match(appSource, /function buildAnswerSummary/)
  assert.match(appSource, /function formatHeight/)
  assert.match(appSource, /Math\.floor\(totalInches \/ 12\)}\s*ft\s*\$\{totalInches % 12}\s*in/)
  assert.match(appSource, /\$\{applicationData\.ageRangeMin} to \$\{applicationData\.ageRangeMax}/)
  assert.match(appSource, /function formatDateOfBirth/)
  assert.match(appSource, /value\.filter\(Boolean\)\.join\('\\n'\)/)
})

test('every answer bubble is editable in place, reopening its input without disturbing anything below', () => {
  assert.match(appSource, /function openExchangeForEdit/)
  assert.match(appSource, /button\.addEventListener\('click', \(\) => openExchangeForEdit\(exchange\.id\)\)/)
  assert.match(appSource, /Activate to edit/)
  assert.match(appSource, /previousOpenExchangeId/)
  assert.match(appSource, /openExchangeId = restoreTarget/)
})

test('editing gender away from self_describe removes the dependent exchange', () => {
  assert.match(appSource, /function syncConditionalDependents/)
  assert.match(appSource, /if \(!visible && isRevealed\)/)
  assert.match(appSource, /answeredExchangeIds\.delete\(exchange\.id\)/)
  assert.match(appSource, /applicationData\[exchange\.fields\[0\]\.name\] = ''/)
})

test('shows a typing indicator and a short delay before each donna message, skipped under reduced motion', () => {
  assert.match(appSource, /function buildTypingIndicator/)
  assert.match(appSource, /function playDonnaReveal/)
  assert.match(appSource, /const delay = attentive \? 900 : 480/)
  assert.match(appSource, /function prefersReducedMotion/)
  assert.match(appSource, /if \(prefersReducedMotion\(\)\) {/)
  assert.match(styleSource, /\.application-typing\s*{[^}]*display:\s*none/s)
})

test('invalid conversation-mode answers show inline errors and do not collapse to a bubble', () => {
  assert.match(appSource, /function validateExchange/)
  assert.match(appSource, /exchangeErrors\.set\(exchange\.id, error\)/)
  assert.match(appSource, /if \(error\) {[\s\S]*?return false/)
})

test('errors clear on change/blur, not only on submit, in conversation mode', () => {
  assert.match(appSource, /function attachLiveErrorClear/)
  assert.match(appSource, /addEventListener\('blur', revalidate\)/)
  assert.match(appSource, /addEventListener\('change', revalidate\)/)
})

test('blocks progression past the dateOfBirth exchange for anyone under 25, with the existing verbatim error', () => {
  assert.match(appSource, /exchange\.id === 'dateOfBirth' && !isAtLeast25\(applicationData\.dateOfBirth\)/)
  assert.match(appSource, /UNDER_25_MESSAGE/)
})

test('non-negotiable chips read applicationData fresh, not a stale render closure', () => {
  assert.match(appSource, /const current = applicationData\[field\.name\]/)
  assert.doesNotMatch(appSource, /const padded = \[\.\.\.values,/)
})

test('single-choice fields answer instantly; everything else needs an explicit Continue', () => {
  assert.match(appSource, /field\.type === 'single_select'/)
  assert.match(appSource, /onChoose: \(value\) => { applicationData\[field\.name\] = value; commitExchange\(exchange\) }/)
  assert.match(appSource, /function buildExplicitSubmit/)
})

test('renders long lists as native searchable comboboxes, reused inline', () => {
  assert.match(appSource, /field\.options\.length > 5/)
  assert.match(appSource, /function buildCombobox/)
  assert.match(appSource, /setAttribute\('role', 'combobox'\)/)
  assert.match(appSource, /event\.key === 'ArrowDown'/)
  assert.match(appSource, /event\.key === 'Enter'/)
  assert.match(appSource, /event\.key === 'Escape'/)
  ;['industry', 'languages', 'faithBackground', 'currentCity', 'citiesConsidered'].forEach((name) => {
    assert.ok(field(name).options.length > 5)
  })
})

/* ---- Part A3/C4 — the Chapter VI→VII transition ---- */

test('the Chapter VI→VII transition never returns to conversation mode', () => {
  assert.match(appSource, /function beginChapterTransition/)
  assert.match(appSource, /mode = 'focus'/)
  assert.equal((appSource.match(/mode = 'conversation'/g) || []).length, 1)
  assert.match(appSource, /function startConversation\(\) {\s*mode = 'conversation'/)
})

/* ---- Part A2/D9 — focus mode ---- */

test('Chapter VII, photographs and consent render one screen at a time with no transcript above', () => {
  assert.match(appSource, /function buildFocusStep/)
  assert.match(appSource, /function buildPhotographs/)
  assert.match(appSource, /function buildReview/)
  const focusStepFn = appSource.match(/function buildFocusStep\(\)[\s\S]*?\n}/)[0]
  assert.doesNotMatch(focusStepFn, /application-transcript/)
})

test('focus mode keeps Back and Continue/Finish chapter as before', () => {
  assert.match(appSource, /isLastScreenInChapter \? 'Finish chapter' : 'Continue'/)
  assert.match(appSource, /if \(currentFocusStep > 0\) {/)
  assert.match(appSource, /attemptedFocusSteps\.add\(currentFocusStep\)/)
})

test('photographs and consent are styled to match the chapter chrome but are not numbered as chapters', () => {
  assert.equal(screen('photographs').chapterNumber, undefined)
  assert.equal(screen('review-and-consent').chapterNumber, undefined)
  assert.match(appSource, /buildFocusMascot\(/)
  assert.match(appSource, /buildEyebrow\(\)/)
})

test('review screen groups by chapter with Edit; Chapters I–VI edit inline, Chapter VII jumps to its focus screen', () => {
  assert.match(appSource, /function buildChapterReviewGroups/)
  assert.match(appSource, /function buildInlineReviewValue/)
  assert.match(appSource, /if \(chapterNumber === 7\) {\s*const edit = createButton\('Edit'/)
  assert.match(appSource, /reviewEditingField\.current = field\.name/)
})

/* ---- Part B1 — typography ---- */

test("donna's messages render in the site body face, roman, at the existing scale value — no italic serif", () => {
  const donnaBlock = styleSource.match(/\.application-message-donna p \{[^}]*\}/)[0]
  assert.match(donnaBlock, /font-family:\s*var\(--sans\)/)
  assert.doesNotMatch(donnaBlock, /font-style:\s*italic/)
  assert.match(donnaBlock, /font-size:\s*1\.05rem/)
  const mascotBlock = styleSource.match(/\.application-mascot-bubble p \{[^}]*\}/)[0]
  assert.match(mascotBlock, /font-family:\s*var\(--sans\)/)
  assert.doesNotMatch(mascotBlock, /font-style:\s*italic/)
})

/* ---- Part E — layout ---- */

test('the conversation column is centred with a max width around 640px', () => {
  assert.match(styleSource, /\.application-conversation-layout\s*{[^}]*max-width:\s*40rem/s)
  assert.match(styleSource, /\.application-conversation-layout\s*{[^}]*margin-inline:\s*auto/s)
})

test('bubbles respect a minimum width and a maximum around 80% of the column', () => {
  const donnaBlock = styleSource.match(/\.application-message-donna \{[^}]*\}/)[0]
  const replyBlock = styleSource.match(/\.application-reply \{[^}]*\}/)[0]
  ;[donnaBlock, replyBlock].forEach((block) => {
    assert.match(block, /min-width:\s*4\.5rem/)
    assert.match(block, /max-width:\s*32rem/)
  })
})

test('the gap between exchanges is visibly larger than the gap within one', () => {
  const transcriptGap = Number(styleSource.match(/\.application-transcript\s*{[^}]*gap:\s*([\d.]+)rem/s)[1])
  const exchangeGap = Number(styleSource.match(/\.application-exchange\s*{[^}]*gap:\s*([\d.]+)rem/s)[1])
  assert.ok(transcriptGap > exchangeGap * 2, `expected transcript gap (${transcriptGap}rem) to clearly exceed exchange gap (${exchangeGap}rem)`)
})

test('YOU is gone; the edit affordance shows on hover/focus only; the accessible name persists', () => {
  assert.doesNotMatch(appSource, /you · tap to edit/i)
  assert.doesNotMatch(appSource, />YOU</)
  assert.match(appSource, /Tap to edit/)
  assert.match(appSource, /setAttribute\('aria-label', `Your answer: \$\{summary}\. Activate to edit\.`\)/)
  assert.match(styleSource, /\.application-reply-tag\s*{[^}]*opacity:\s*0/s)
  assert.match(styleSource, /\.application-reply:hover \.application-reply-tag,\s*\n\.application-reply:focus-visible \.application-reply-tag\s*{\s*opacity:\s*1/)
})

/* ---- Part F — mascot motion ---- */

test('donna travels down the column instead of staying sticky, and settles beside the open input', () => {
  assert.doesNotMatch(styleSource, /\.application-conversation-mascot-col\s*{[^}]*position:\s*sticky/s)
  assert.match(styleSource, /\.application-conversation-mascot-col\s*{[^}]*position:\s*absolute/s)
  assert.match(appSource, /function positionMascot/)
  assert.match(appSource, /translateY\(\$\{offset}px\)/)
  assert.match(appSource, /window\.requestAnimationFrame\(positionMascot\)/)
})

test('mascot motion: rest float, speaking, listening, attentive — all as CSS transforms', () => {
  assert.match(styleSource, /@keyframes application-mascot-float/)
  assert.match(styleSource, /50% { transform: translateY\(-7px\); }/)
  assert.match(styleSource, /\.application-mascot\.is-speaking\s*{\s*animation: application-mascot-speak/)
  assert.match(styleSource, /\.application-mascot\.is-listening\s*{[^}]*animation: none/s)
  assert.match(styleSource, /\.application-mascot\.is-attentive\s*{[^}]*animation: none/s)
  assert.match(appSource, /exchange\.id === 'nonNegotiables'/)
  assert.match(appSource, /attentive: true/)
})

test('all mascot motion, including travel, is disabled under prefers-reduced-motion', () => {
  assert.match(styleSource, /@media \(prefers-reduced-motion: reduce\) {[\s\S]*\.application-mascot,[\s\S]*animation: none;[\s\S]*transform: none;/)
  assert.match(styleSource, /\.application-conversation-mascot-col\s*{\s*transition: none;\s*transform: none;\s*}/)
  const fn = appSource.match(/function positionMascot[\s\S]*?\n}/)[0]
  assert.match(fn, /if \(prefersReducedMotion\(\)\)/)
})

test('the mascot is one persistent instance in conversation mode, not one per message', () => {
  const conversationBuilder = appSource.match(/function buildConversationScreen[\s\S]*?\n}/)[0]
  assert.equal((conversationBuilder.match(/buildMascotImg\(\)/g) || []).length, 1)
  assert.doesNotMatch(appSource, /renderExchangeRow[\s\S]{0,400}buildMascotImg/)
})

/* ---- Part G — navigation within a chapter ---- */

test('back/forward move through the current chapter without clearing answers or crossing the chapter boundary', () => {
  assert.match(appSource, /function goToPreviousExchange/)
  assert.match(appSource, /function goToNextExchange/)
  assert.match(appSource, /function currentChapterFieldIds/)
  assert.match(appSource, /if \(index <= 0\) return/)
  assert.match(appSource, /if \(index === -1 \|\| index >= ids\.length - 1\) return/)
  assert.doesNotMatch(appSource, /function goToPreviousExchange[\s\S]*?revealedExchangeIds\.splice/)
})

test('back/forward controls are real buttons (native keyboard operability) and disable at the edges', () => {
  assert.match(appSource, /function buildConversationNav/)
  assert.match(appSource, /back\.disabled = index <= 0/)
  assert.match(appSource, /forward\.disabled = index === -1 \|\| index >= ids\.length - 1/)
})

/* ---- Part D — retained ---- */

test('application code contains no persistence, cookie, submission transport or save-and-exit control', () => {
  const forbidden = ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'fetch(', 'XMLHttpRequest', 'sendBeacon']
  forbidden.forEach((token) => assert.equal(appSource.includes(token), false, `${token} must not be used`))
  assert.doesNotMatch(appSource, /save\s*&\s*exit/i)
})

test('application transitions honour reduced-motion preferences generally', () => {
  assert.match(styleSource, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(styleSource, /\.application-screen\s*{\s*animation: none;/)
})

test('introduces no new colour value in the redesigned chrome, and only known typefaces', () => {
  const newBlockMatch = styleSource.match(/\.application-mascot-row[\s\S]*?\.application-chip:disabled[^}]*}/)
  assert.ok(newBlockMatch, 'expected the mascot/chip CSS block to be present')
  assert.doesNotMatch(newBlockMatch[0], /#[0-9a-fA-F]{3,8}\b/)
  const conversationBlock = styleSource.match(/\/\* Conversation mode[\s\S]*?(?=\n\/\*|\n\.application-noscript)/)
  assert.ok(conversationBlock, 'expected the conversation-mode CSS section to be present')
  assert.doesNotMatch(conversationBlock[0], /#[0-9a-fA-F]{3,8}\b/)
  const fontFamilyDeclarations = [...conversationBlock[0].matchAll(/font-family:\s*([^;]+);/g)].map(([, value]) => value.trim())
  fontFamilyDeclarations.forEach((value) => assert.ok(value === 'var(--sans)' || value === 'var(--serif)', `unexpected font-family value: ${value}`))
})

/* ---- Progress ---- */

test('buildProgressLabel never bakes a raw count or chapter name into the visible label', () => {
  const state = buildProgressLabel({ current: 4, total: 19 })
  assert.equal(state.current, 4)
  assert.equal(state.total, 19)
  assert.equal('chapterLabel' in state, false)
  assert.match(state.ariaLabel, /step 4 of 19/)
})

test('progress spans conversation and focus mode together (shared header)', () => {
  assert.match(appSource, /function computeProgress/)
  assert.match(appSource, /conversationExchangeTotal\(\) \+ FOCUS_STEPS\.length/)
  assert.doesNotMatch(appSource, /\d+\s*\/\s*\d+/)
})

test('clampApplicationStep still clamps a step index to a gateway floor (navigation.js retained)', () => {
  assert.equal(clampApplicationStep(0, 5), 0)
  assert.equal(clampApplicationStep(-2, 5), GATEWAY_STEP)
  assert.equal(clampApplicationStep(99, 5), 4)
})

test('card option grids use count-aware equal-width responsive columns (unchanged)', () => {
  assert.match(appSource, /choices\.dataset\.optionCount = String\(field\.options\.length\)/)
  assert.match(styleSource, /@media \(min-width: 768px\)/)
  assert.match(styleSource, /data-option-count='2'[\s\S]*data-option-count='4'[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/)
})

/* ---- A1 — the chapter-to-screen mismatch is fixed in state ---- */

test('the current chapter is tracked as explicit state, set only at verified chapter-entry transitions', () => {
  assert.match(appSource, /let currentChapterNumber = null/)
  assert.match(appSource, /if \(chapterNumber !== currentChapterNumber\) {/)
  assert.match(appSource, /currentChapterNumber = chapterNumber/)
  // The old bug read the open exchange's chapter back out of APPLICATION_STEPS
  // for display; that lookup (and the header label it fed) no longer exists.
  assert.doesNotMatch(appSource, /APPLICATION_STEPS\.find\(\(step\) => step\.id === openExchange\.screenId\)/)
})
