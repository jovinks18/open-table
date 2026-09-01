import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const template = readFileSync(new URL('../src/application/journey/template.html', import.meta.url), 'utf8')
const controller = readFileSync(new URL('../src/application/journey/controller.js', import.meta.url), 'utf8')
const main = readFileSync(new URL('../src/application/journey/main.js', import.meta.url), 'utf8')
const store = readFileSync(new URL('../src/application/journey/store.js', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/application/journey/styles.css', import.meta.url), 'utf8')

const screens = [...template.matchAll(/<section class="[^"]*screen[^"]*" id="([^"]+)"/g)].map(([, id]) => id)

test('the journey uses six chapters in the requested card order', () => {
  assert.deepEqual(screens, [
    'signup-choice', 'friend-verification', 'write-note', 'seal-send', 'nomination-sent', 'saved',
    'welcome', 'ch1-intent', 'ch1-decision', 'ch1-contact', 'chapter-one-exit',
    'ch2-place', 'ch2-marriage', 'ch3-facts', 'ch4-background',
    'ch5-tuesday', 'ch5-week', 'ch5-learning', 'ch5-ease', 'ch6-boundaries',
    'ch6-photos', 'ch6-review', 'submitted',
  ])
  for (let chapter = 1; chapter <= 6; chapter += 1) assert.match(template, new RegExp(`data-chapter="${chapter}"`))
  assert.match(controller, /CHAPTER_NUMERALS = Object\.freeze\(\['', 'I', 'II', 'III', 'IV', 'V', 'VI'\]\)/)
  assert.doesNotMatch(controller, /of 6|Step \$\{step\}/)
  assert.doesNotMatch(main, /chapter-progress|data-chapter-track|data-chapter-steps/)
})

test('every card uses one donna prompt headline without duplicated card headers', () => {
  for (const heading of [
    'Let’s get to know you.', 'Can we go one step further?', 'How can I contact you?',
    'Let’s talk about home base.', 'Beyond the basics.', 'Life, on paper.',
    'What feels important to you?', 'Let’s finish up with your non-negotiables.',
    'Three photographs that look like you now', 'Review your profile',
  ]) assert.match(template, new RegExp(`<h1>${heading.replace(/[?]/g, '\\?')}</h1>`))
  assert.equal((template.match(/class="journey-prompt-row"/g) || []).length, 18)
  assert.equal((template.match(/class="answer-card journey-answer-panel/g) || []).length, 18)
  assert.doesNotMatch(template, /card-header|card-eyebrow|card-subline|donna-message/)
  for (const message of [
    'Let’s begin with whether you’re ready—and who else is part of the decision.',
    'Now the practical part: whether two lives could actually fit.',
    'A few facts I only want to ask once.',
    'Background matters differently in different homes. I need to understand yours.',
    'The practical picture is done. This is the part I actually match on.',
    'Last thing: what would make an introduction impossible?',
  ]) assert.ok(!template.includes(message))
})

test('entry and confirmation use the supplied copy', () => {
  for (const copy of [
    'Six chapters. About twelve minutes.',
    'Some of the questions are blunt. That’s on purpose—it’s how we avoid wasting your evening on someone who was never going to work.',
    'You’ll get one introduction at a time. Some weeks, I may not have anyone for you. I’ll tell you that rather than send someone merely to keep you occupied.',
    'Not everyone who applies gets an introduction.',
    'That’s with me now.',
    'I’ll read it properly, not skim it. If I’ve got someone, you’ll hear from me. If I haven’t, you’ll hear that too.',
  ]) assert.ok(template.includes(copy))
  assert.doesNotMatch(template, /submitted-video|sealed-note\.webm/)
})

test('Chapters I through IV use grouped cards and Chapter V has four reflective screens', () => {
  for (const id of ['ch1-intent', 'ch1-decision', 'ch1-contact', 'ch2-place', 'ch2-marriage', 'ch3-facts', 'ch4-background']) {
    const start = template.indexOf(`id="${id}"`)
    const section = template.slice(start, template.indexOf('</section>', start))
    assert.match(section, /class="answer-card journey-answer-panel"/)
    assert.equal((section.match(/type="submit"/g) || []).length, 1)
  }
  assert.deepEqual(screens.filter((id) => id.startsWith('ch5-')), ['ch5-tuesday', 'ch5-week', 'ch5-learning', 'ch5-ease'])
  assert.equal((template.match(/maxlength="600"/g) || []).length, 6)
  assert.equal((template.match(/maxlength="300"/g) || []).length, 1)
  assert.equal((template.match(/data-counter-for=/g) || []).length, 5)
})

test('removed questions and fields are absent from the active journey and payload state', () => {
  const active = `${template}\n${store}`
  for (const removed of [
    'employer', 'institution', 'partnershipRole', 'friendsDescribe', 'friendsTease',
    'relationshipLearning', 'anythingElse', 'sharedBackgroundImportance',
    'qualities are you looking for', 'Keep going', 'ask-a-friend',
    'applicant.intent', 'genderDescription', 'industry', 'drinking', 'smoking',
    'bothWorking', 'After marriage, would you both expect to keep working?',
    'boundariesConfirmed', 'openToPartnerWithChildren', 'priorRelationshipEnd',
    'childrenCount', 'dietOther', 'interfaithConditions', 'faithBackgroundOther',
    'familySearchInvolvement', 'livingSituation',
    'reflectiveConflict', 'oneThingToKnow', 'livingSituationOther', 'postMarriageLivingOther',
  ]) assert.doesNotMatch(active, new RegExp(removed, 'i'))
})

test('conditional answers clear when their parent becomes irrelevant', () => {
  assert.match(controller, /function clearConditionalFields\(element\)/)
  assert.match(controller, /if \(!visible && !element\.hidden\) clearConditionalFields\(element\)/)
  for (const path of ['currentCityOther', 'relocationCities', 'castePreferenceDetail']) {
    assert.match(`${template}\n${store}`, new RegExp(path))
  }
  assert.match(template, /data-condition-field="applicant\.willingToRelocate" data-condition-values="yes" data-required-field="applicant\.relocationCities"/)
  assert.doesNotMatch(template, /data-value="undecided"[^>]*>I haven’t decided<\/button>/)
  assert.doesNotMatch(template, /data-value="certain_places"|Only to certain places/)
  assert.match(template, /data-value="either"[^>]*>I’m flexible<\/button>/)
})

test('the controller validates whole cards and focuses the first incomplete question', () => {
  assert.match(controller, /function validateScreen\(screen\)/)
  assert.match(controller, /if \(!validateScreen\(screen\)\) return/)
  assert.match(controller, /if \(!validateField\(container\) && !firstInvalid\) firstInvalid = container/)
  assert.match(controller, /firstInvalid\) focusInvalid\(firstInvalid\)/)
  assert.doesNotMatch(controller, /handleChoice[\s\S]{0,500}goTo\(nextFor/)
})

test('tags, free-text boundaries, photographs, review and consent are implemented', () => {
  assert.match(controller, /function initTagControl\(control\)/)
  assert.match(template, /data-field="applicant\.nonNegotiables" maxlength="600" placeholder="A few examples are/)
  assert.doesNotMatch(template, /data-topic=|data-boundary-list|data-boundary-prompts/)
  assert.doesNotMatch(controller, /renderBoundaries|toggleBoundary/)
  assert.match(template, /data-condition-field="applicant\.familyRequirement" data-condition-values="yes" data-required-field="applicant\.familyRequirementDetail"/)
  assert.match(controller, /function refreshAdvanceState\(screen\)/)
  assert.match(controller, /advance\.disabled = !screenIsComplete\(screen\)/)
  assert.match(controller, /function preserveAnchor\(anchor, mutate\)/)
  assert.equal((template.match(/data-photo-slot=/g) || []).length, 3)
  assert.match(controller, /URL\.createObjectURL\(file\)/)
  assert.match(controller, /URL\.revokeObjectURL/)
  assert.match(controller, /function renderReview\(screen\)/)
  assert.match(template, /data-consent="legalDocuments"/)
})

test('the mascot and chrome are persistent while only the active screen is mounted', () => {
  assert.equal((main.match(/data-persistent-mascot/g) || []).length, 1)
  assert.match(main, /aria-hidden="true"/)
  assert.match(controller, /screenHost\.replaceChildren\(screen\)/)
  assert.doesNotMatch(template, /donna-icon|persistent-mascot/)
  assert.match(styles, /\.persistent-mascot/)
  assert.equal(existsSync(new URL('../public/images/application/donna-mascot.png', import.meta.url)), true)
})

test('responsive and reduced-motion safeguards remain in place', () => {
  assert.match(styles, /@media\(max-width:760px\)/)
  assert.match(styles, /\.photo-grid\{grid-template-columns:1fr;/)
  assert.match(styles, /min-width:320px/)
  assert.match(styles, /\.journey-stage\{width:calc\(100% - 32px\);/)
  assert.match(styles, /\.answer-card\{width:100%;margin-left:0;/)
  assert.match(styles, /\.dob-row select\{/)
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/)
})

test('save and exit keeps a paused application on the device only', () => {
  assert.match(controller, /const STORAGE_KEY = 'donna\.journey'/)
  assert.match(controller, /function readSavedState\(\)/)
  assert.match(controller, /function writeSavedState\(\)/)
  assert.match(controller, /function clearSavedState\(\)/)
  assert.match(controller, /parsed\.version !== JOURNEY_STATE_VERSION/)
  assert.match(controller, /parsed\.applicant\.photographs = \{ face: null, fullLength: null, ordinaryLife: null \}/)
  assert.match(main, /data-save-exit/)
  assert.match(template, /data-clear-saved/)
  assert.match(template, /id="saved"/)
  assert.ok(template.includes('Your answers are kept in this browser only.'))
  assert.ok(template.includes('Delete my answers from this device'))
})

test('the nominator path forks at the start and ends at a sealed note', () => {
  assert.match(template, /id="signup-choice"/)
  assert.match(template, /data-value="applicant"/)
  assert.match(template, /data-value="nominator"/)
  assert.match(controller, /NOMINATOR_ROUTES = Object\.freeze\(\['friend-verification', 'write-note', 'seal-send', 'nomination-sent'\]\)/)
  assert.match(controller, /fieldValue\('path'\) === 'nominator' \? 'friend-verification' : 'welcome'/)
  assert.equal((template.match(/data-consent-nominator=/g) || []).length, 2)
  assert.ok(template.includes('If they say no, I delete the note and you will not be told who declined.'))
  assert.doesNotMatch(template, /data-chapter="[1-6]"[^>]*id="(friend-verification|write-note|seal-send)"/)
})

test('backend behavior remains preview-only', () => {
  const api = readFileSync(new URL('../src/application/journey/api.js', import.meta.url), 'utf8')
  assert.match(api, /configured: false/)
  assert.doesNotMatch(`${controller}\n${main}\n${store}`, /fetch\(|XMLHttpRequest|sessionStorage/)
})
