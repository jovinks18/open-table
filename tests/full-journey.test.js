import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { resolveEntryRoute } from '../src/application/journey/controller.js'

const template = readFileSync(new URL('../src/application/journey/template.html', import.meta.url), 'utf8')
const controller = readFileSync(new URL('../src/application/journey/controller.js', import.meta.url), 'utf8')
const main = readFileSync(new URL('../src/application/journey/main.js', import.meta.url), 'utf8')
const store = readFileSync(new URL('../src/application/journey/store.js', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/application/journey/styles.css', import.meta.url), 'utf8')

const screens = [...template.matchAll(/<section class="[^"]*screen[^"]*" id="([^"]+)"/g)].map(([, id]) => id)

test('the journey uses six chapters in the requested card order', () => {
  assert.deepEqual(screens, [
    'introduce', 'nomination-sent',
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
    'Can we have three recent photographs?', 'Review your profile',
  ]) assert.match(template, new RegExp(`<h1>${heading.replace(/[?]/g, '\\?')}</h1>`))
  assert.equal((template.match(/class="journey-prompt-row"/g) || []).length, 15)
  assert.equal((template.match(/class="answer-card journey-answer-panel/g) || []).length, 15)
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
    'Six chapters. <strong>About 10 to 12 minutes.</strong>',
    'Some questions are blunt. I want the real you, quirks and non-negotiables included.',
    '<strong>No AI, no bestie, no polished answers.</strong> Be honest, especially about your height. No rounding up.',
    'You may not get a match right away. <strong>If I do not have the right person, I will wait.</strong>',
    'That’s with me now.',
    'I’ll read it properly, not skim it. If I’ve got someone, you’ll hear from me. If I haven’t, you’ll hear that too.',
  ]) assert.ok(template.includes(copy))
  assert.doesNotMatch(template, /submitted-video|sealed-note\.webm/)
  assert.match(template, /id="submitted"[\s\S]*data-start-nomination>Refer someone<\/button>/)
  assert.match(controller, /setField\('path', 'nominator'\)[\s\S]*goTo\('introduce'\)/)
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
  for (const id of ['q-tuesday', 'q-week', 'q-learning', 'q-ease']) {
    assert.match(template, new RegExp(`<label class="sr-only" id="${id}"`))
  }
  assert.doesNotMatch(template, /<h1>The part donna can’t put into words\.<\/h1>/)
  assert.match(template, /takes some <strong>“getting used”<\/strong> to about you\?/)
})

test('journey completion and photograph consent use the updated copy', () => {
  assert.doesNotMatch(template, /Finish chapter/)
  assert.match(template, /Your photographs are shared only with your consent\./)
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

test('both city questions use the shared branded dropdown surface', () => {
  assert.match(template, /data-city-combobox="applicant\.currentCity"/)
  assert.match(template, /data-tags-field="applicant\.relocationCities"/)
  assert.doesNotMatch(template, /data-city-select/)
  assert.match(controller, /function initCityCombobox\(control\)/)
  assert.match(controller, /Use “\$\{option\.label\}”/)
  assert.match(controller, /Use “\$\{option\}”/)
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

test('the onboarding header blends into the page without a divider', () => {
  assert.match(styles, /\.journey-header\{[^}]*background:linear-gradient\([^}]*transparent 100%\)[^}]*border:0/)
  assert.doesNotMatch(styles, /\.journey-header\{[^}]*border-bottom/)
})

test('the welcome card centres the decorative donna mascot above it', () => {
  assert.match(styles, /#welcome\{[^}]*flex-direction:column[^}]*gap:18px/)
  assert.match(styles, /#welcome::before\{[^}]*flex:0 0 auto[^}]*width:96px[^}]*height:72px[^}]*donna-mascot\.png/)
  assert.doesNotMatch(styles, /#welcome \.center-card::before/)
  assert.doesNotMatch(template, /id="welcome" data-show-header/)
})

test('the journey is memory-only and exposes no saved-progress interface', () => {
  assert.doesNotMatch(controller, /localStorage|STORAGE_KEY|readSavedState|writeSavedState|clearSavedState/)
  assert.doesNotMatch(main, /data-save-exit|Save &amp; exit/)
  assert.doesNotMatch(template, /data-saveable|data-resume|data-clear-saved|id="saved"/)
})

test('the nominator path is one required form followed by confirmation', () => {
  assert.doesNotMatch(template, /id="signup-choice"|data-value="applicant"|data-value="nominator"/)
  assert.doesNotMatch(template, /id="friend-verification"|id="write-note"|id="seal-send"|data-consent-nominator/)
  const start = template.indexOf('id="introduce"')
  const introduce = template.slice(start, template.indexOf('</section>', start))
  assert.equal((introduce.match(/data-required-field=/g) || []).length, 5)
  assert.match(introduce, /nominator\.nomineeName[\s\S]*nominator\.nomineeContact[\s\S]*nominator\.nomineeReason[\s\S]*nominator\.fullName[\s\S]*nominator\.contact/)
  assert.equal((introduce.match(/type="submit"/g) || []).length, 1)
  assert.match(controller, /advance\.disabled = !screenIsComplete\(screen\)/)
})

test('entry routing defaults to applicants and preserves the friend route on refresh', () => {
  assert.deepEqual(resolveEntryRoute('?for=me'), { path: 'applicant', screen: 'welcome' })
  assert.deepEqual(resolveEntryRoute('?for=friend'), { path: 'nominator', screen: 'introduce' })
  assert.deepEqual(resolveEntryRoute(''), { path: 'applicant', screen: 'welcome' })
  assert.doesNotMatch(controller, /stripEntryParameter|searchParams\.delete\('for'\)/)
})

test('backend behavior remains preview-only', () => {
  const api = readFileSync(new URL('../src/application/journey/api.js', import.meta.url), 'utf8')
  assert.match(api, /configured: false/)
  assert.doesNotMatch(`${controller}\n${main}\n${store}`, /fetch\(|XMLHttpRequest|sessionStorage/)
})
