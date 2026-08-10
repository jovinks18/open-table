import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { clampApplicationStep, GATEWAY_STEP, getProgressState } from '../src/application/navigation.js'
import {
  APPLICATION_GATEWAY,
  APPLICATION_STEPS,
  CONSENT_SCHEMA,
  DATA_FIELDS,
  PHOTO_SHARE_CONSENT,
  PHOTO_SLOTS,
} from '../src/application/schema.js'

const allFields = APPLICATION_STEPS.flatMap(({ fields }) => fields)

test('defines exactly seven ordered application sections', () => {
  assert.equal(GATEWAY_STEP, -1)
  assert.equal(APPLICATION_STEPS.length, 7)
  assert.deepEqual(
    APPLICATION_STEPS.map(({ title }) => title),
    ['Eligibility', 'About you', 'Your life', "What wouldn't work", 'In your words', 'Photographs', 'Review and consent'],
  )
})

test('reports all seven section progress states with titles', () => {
  assert.equal(getProgressState(GATEWAY_STEP, APPLICATION_STEPS), null)
  APPLICATION_STEPS.forEach(({ title }, index) => {
    const progress = getProgressState(index, APPLICATION_STEPS)
    assert.equal(progress.current, index + 1)
    assert.equal(progress.total, 7)
    assert.equal(progress.label, `Section ${index + 1} of 7 — ${title}`)
    assert.equal(progress.ariaLabel, `Application progress: section ${index + 1} of 7, ${title}`)
  })
})

test('clamps navigation to the seven-section sequence', () => {
  assert.equal(clampApplicationStep(0, APPLICATION_STEPS.length), 0)
  assert.equal(clampApplicationStep(-1, APPLICATION_STEPS.length), GATEWAY_STEP)
  assert.equal(clampApplicationStep(-2, APPLICATION_STEPS.length), GATEWAY_STEP)
  assert.equal(clampApplicationStep(99, APPLICATION_STEPS.length), 6)
})

test('contains every v2 data key and none of the removed keys', () => {
  const requiredKeys = [
    'dateOfBirth', 'currentCity', 'currentCityOther', 'gender', 'genderSelfDescribe', 'interestedIn', 'intent', 'timeline',
    'maritalStatus', 'availableWithinFourWeeks', 'fullName', 'sharedFirstName', 'email', 'phone', 'linkedinUrl',
    'occupation', 'employer', 'industry', 'industryOther', 'highestDegree', 'institution', 'languages',
    'languagesOther', 'heightCm', 'faithBackground', 'faithBackgroundOther', 'sharedBackgroundImportance',
    'diet', 'drinking', 'smoking', 'livingSituation', 'ageRangeMin', 'ageRangeMax', 'citiesConsidered',
    'citiesConsideredOther', 'willingToRelocate', 'hasChildren', 'wantsChildren', 'childrenNonNegotiable', 'nonNegotiables', 'partnerRole', 'friendsDescribe',
    'tuesdayEvening', 'learnedAboutSelf', 'anythingElse',
  ]
  requiredKeys.forEach((key) => assert.ok(DATA_FIELDS.includes(key), `${key} is missing`))

  const removedKeys = [
    'age_confirmation', 'relationship_intent', 'relationship_goal', 'pronouns', 'smoking_preference',
    'drinking_preference', 'dietary_preference', 'about', 'weekend_prompt', 'values_prompt',
  ]
  removedKeys.forEach((key) => assert.equal(DATA_FIELDS.includes(key), false, `${key} must be removed`))
})

test('uses supplied select values and conditional fields', () => {
  const field = (name) => allFields.find((item) => item.name === name)
  assert.deepEqual(field('genderSelfDescribe').condition, { field: 'gender', equals: 'self_describe' })
  assert.deepEqual(field('industryOther').condition, { field: 'industry', equals: 'other' })
  assert.deepEqual(field('languagesOther').condition, { field: 'languages', includes: 'other' })
  assert.deepEqual(field('currentCityOther').condition, { field: 'currentCity', equals: 'other' })
  assert.deepEqual(field('citiesConsideredOther').condition, { field: 'citiesConsidered', includes: 'other' })
  assert.deepEqual(field('faithBackgroundOther').condition, { field: 'faithBackground', equals: 'other' })
  assert.equal(field('faithBackgroundOther').required, false)
  assert.equal(field('languages').type, 'multi_select')
  assert.equal(field('ageRangeMin').type, 'single_select')
  assert.equal(field('ageRangeMax').type, 'single_select')
  assert.equal(field('heightCm').type, 'height')
  assert.equal(field('faithBackground').options.at(-1)[0], 'prefer_not_to_say')
  assert.equal(field('industry').options.at(-1)[0], 'other')
})

test('applies the v2.1 section placement and exact Part C copy', () => {
  const eligibility = APPLICATION_STEPS[0]
  const life = APPLICATION_STEPS[2]
  const preferences = APPLICATION_STEPS[3]
  const names = (step) => step.fields.map(({ name }) => name)
  assert.equal(eligibility.framing, 'Before anything else — a few quick questions to make sure donna can actually help you right now. Under a minute.')
  assert.equal(eligibility.fields.find(({ name }) => name === 'timeline').label, 'If you met the right person, what feels like the right timeline?')
  assert.equal(names(eligibility).includes('maritalStatus'), false)
  assert.equal(names(life).indexOf('maritalStatus'), names(life).indexOf('livingSituation') + 1)
  assert.equal(life.fields.find(({ name }) => name === 'institution').required, false)
  assert.equal(life.fields.find(({ name }) => name === 'faithBackground').helpText, "donna doesn't filter anyone out on background. Your answer below tells us how much weight it carries for you.")
  assert.deepEqual(preferences.fields.find(({ name }) => name === 'childrenNonNegotiable').options, [['yes', 'Yes, this would rule someone out'], ['no', "No, I'd stay open"]])
})

test('uses the shared city list and no additional structured hard filters', () => {
  const field = (name) => allFields.find((item) => item.name === name)
  assert.deepEqual(field('currentCity').options, field('citiesConsidered').options)
  assert.equal(field('currentCity').options.length, 12)
  assert.deepEqual(field('currentCity').options.at(-1), ['other', 'Other'])
  const prohibited = ['faithNonNegotiable', 'backgroundNonNegotiable', 'communityNonNegotiable', 'heightNonNegotiable']
  prohibited.forEach((name) => assert.equal(DATA_FIELDS.includes(name), false))
})

test('wires inline errors to clear after valid field interaction without another submit', () => {
  const source = readFileSync(new URL('../src/application/app.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /Please check the following/)
  assert.match(source, /addEventListener\('blur', refreshValidationAfterInteraction\)/)
  assert.match(source, /attemptedSections\.has\(currentStep\).*validateCurrentStep/)
  assert.match(source, /A few answers are still needed below\./)
  assert.match(source, /setAttribute\('aria-live', 'polite'\)/)
  assert.match(source, /scrollIntoView/)
  assert.match(source, /setAttribute\('aria-invalid', 'true'\)/)
})

test('renders long lists as native searchable comboboxes and short lists as cards', () => {
  const source = readFileSync(new URL('../src/application/app.js', import.meta.url), 'utf8')
  assert.match(source, /field\.options\.length > 5.*buildSearchableCombobox/)
  assert.match(source, /setAttribute\('role', 'combobox'\)/)
  assert.match(source, /event\.key === 'ArrowDown'/)
  assert.match(source, /event\.key === 'Enter'/)
  assert.match(source, /event\.key === 'Escape'/)
  ;['industry', 'languages', 'faithBackground', 'currentCity', 'citiesConsidered'].forEach((name) => {
    assert.ok(allFields.find((item) => item.name === name).options.length > 5)
  })
  ;['gender', 'interestedIn', 'intent', 'timeline', 'maritalStatus', 'availableWithinFourWeeks', 'sharedBackgroundImportance', 'diet', 'drinking', 'smoking', 'livingSituation', 'willingToRelocate', 'hasChildren', 'wantsChildren', 'highestDegree'].forEach((name) => {
    assert.ok(allFields.find((item) => item.name === name).options.length <= 5)
  })
})

test('uses the simplified gateway copy and moves the unchanged process to confirmation', () => {
  assert.equal(APPLICATION_GATEWAY.eyebrow, 'Private application · 25+')
  assert.deepEqual(APPLICATION_GATEWAY.beforeBegin, [
    'About twelve minutes, in one sitting.',
    'Your LinkedIn profile URL.',
    'Two recent photographs — one clear photo of your face, one from everyday life.',
  ])
  assert.equal(APPLICATION_GATEWAY.privacyCopy, 'Your details stay private, you approve every introduction, and you can withdraw at any time.')
  assert.deepEqual(APPLICATION_GATEWAY.nextSteps.map(({ title }) => title), ['donna reviews', 'donna asks', 'You decide'])
  const source = readFileSync(new URL('../src/application/app.js', import.meta.url), 'utf8')
  assert.match(source, /application-confirmation-process/)
  assert.doesNotMatch(source, /application-gateway-process|application-gateway-assurances|application-gateway-checklist/)
  assert.doesNotMatch(source, /Honest preferences about what you are looking for\./)
  assert.doesNotMatch(source, /application-gateway-withdrawal/)
})

test('gateway styles use one plain reading column without containment treatments', () => {
  const styles = readFileSync(new URL('../src/styles/pages/apply.css', import.meta.url), 'utf8')
  assert.doesNotMatch(styles, /application-gateway-(?:checklist|process|assurances|control|section|withdrawal|preparation)/)
  assert.match(styles, /#application-root\.is-gateway\s*{[^}]*44rem/s)
  assert.match(styles, /\.application-gateway-before h2\s*{[^}]*font-family: var\(--sans\)/s)
  assert.doesNotMatch(styles, /\.application-gateway[^}]*var\(--dusty-rose\)/s)
})

test('defines two required and two optional photographs with independent consent copy', () => {
  assert.equal(PHOTO_SLOTS.length, 4)
  assert.equal(PHOTO_SLOTS.filter(({ required }) => required).length, 2)
  assert.equal(PHOTO_SLOTS.filter(({ required }) => !required).length, 2)
  assert.equal(PHOTO_SHARE_CONSENT, 'donna may share this photograph with a person it is considering introducing you to.')
  const source = readFileSync(new URL('../src/application/app.js', import.meta.url), 'utf8')
  assert.match(source, /shareConsent: false/)
  assert.match(source, /stored\.shareConsent = consent\.checked/)
})

test('photograph cards use concise labels and one shared format line', () => {
  const source = readFileSync(new URL('../src/application/app.js', import.meta.url), 'utf8')
  const guidance = 'JPEG, PNG or WebP, up to 10 MB each. Kept in this browser tab only.'
  assert.equal(source.split(guidance).length - 1, 1)
  assert.equal(source.includes('JPEG, PNG or WebP. Maximum 10 MB. Kept in this browser tab only.'), false)
  assert.match(source, /photoFace: Object\.freeze\(\{ label: 'Your face', accessibleName: 'A recent, clear photograph of your face' \}\)/)
  assert.match(source, /photoEveryday: Object\.freeze\(\{ label: 'Everyday life', accessibleName: 'A recent photograph from everyday life' \}\)/)
  assert.equal(source.split("label: 'Optional', accessibleName: 'An additional photograph, optional'").length - 1, 2)
  assert.match(source, /input\.setAttribute\('aria-label', presentation\.accessibleName\)/)
  assert.doesNotMatch(source, /!slot\.required.*application-optional/)
})

test('card option grids use count-aware equal-width responsive columns', () => {
  const source = readFileSync(new URL('../src/application/app.js', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/styles/pages/apply.css', import.meta.url), 'utf8')
  assert.match(source, /choices\.dataset\.optionCount = String\(field\.options\.length\)/)
  assert.match(source, /field\.options\.length >= 5.*application-choices-many/)
  assert.match(styles, /@media \(min-width: 768px\)/)
  assert.match(styles, /data-option-count='2'[\s\S]*data-option-count='4'[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(styles, /data-option-count='3'[\s\S]*application-choices-many[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(styles, /\.application-choices\s*{[^}]*grid-template-columns: minmax\(0, 1fr\)[^}]*align-items: stretch/s)
  assert.match(styles, /\.application-choice\s*{[^}]*height: 100%/s)
})

test('defines seven required consents and one optional update consent', () => {
  assert.equal(CONSENT_SCHEMA.filter(({ required }) => required).length, 7)
  assert.equal(CONSENT_SCHEMA.filter(({ optional }) => optional).length, 1)
  assert.equal(CONSENT_SCHEMA[4].label, "I understand my written answers are read by donna's team and are used to consider and describe potential introductions.")
})

test('application code contains no persistence, cookie or submission transport APIs', () => {
  const source = readFileSync(new URL('../src/application/app.js', import.meta.url), 'utf8')
  const forbidden = ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'fetch(', 'XMLHttpRequest', 'sendBeacon']
  forbidden.forEach((token) => assert.equal(source.includes(token), false, `${token} must not be used`))
})

test('application transitions honour reduced-motion preferences', () => {
  const styles = readFileSync(new URL('../src/styles/pages/apply.css', import.meta.url), 'utf8')
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(styles, /\.application-screen\s*{\s*animation: none;/)
})
