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
    'welcome', 'ch1-intent', 'ch1-decision', 'ch1-contact', 'chapter-one-exit',
    'ch2-place', 'ch2-marriage', 'ch3-facts-1', 'ch3-facts-2', 'ch4-background',
    'ch4-habits', 'ch5-ease', 'ch5-week', 'ch5-conflict', 'ch6-boundaries',
    'ch6-photos', 'ch6-review', 'submitted',
  ])
  for (let chapter = 1; chapter <= 6; chapter += 1) assert.match(template, new RegExp(`data-chapter="${chapter}"`))
  assert.match(controller, /`Chapter \$\{chapter\} of 6 · Step \$\{step\} of \$\{steps\}`/)
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
})

test('Chapters I through IV use grouped cards and Chapter V has only three reflective screens', () => {
  for (const id of ['ch1-intent', 'ch1-decision', 'ch1-contact', 'ch2-place', 'ch2-marriage', 'ch3-facts-1', 'ch3-facts-2', 'ch4-background', 'ch4-habits']) {
    const start = template.indexOf(`id="${id}"`)
    const section = template.slice(start, template.indexOf('</section>', start))
    assert.match(section, /class="answer-card"/)
    assert.equal((section.match(/type="submit"/g) || []).length, 1)
  }
  assert.deepEqual(screens.filter((id) => id.startsWith('ch5-')), ['ch5-ease', 'ch5-week', 'ch5-conflict'])
  assert.equal((template.match(/maxlength="400"/g) || []).length, 3)
  assert.equal((template.match(/data-counter-for=/g) || []).length, 3)
})

test('removed questions and fields are absent from the active journey and payload state', () => {
  const active = `${template}\n${store}`
  for (const removed of [
    'employer', 'institution', 'partnershipRole', 'friendsDescribe', 'friendsTease',
    'ordinaryEvening', 'relationshipLearning', 'anythingElse', 'sharedBackgroundImportance',
    'qualities are you looking for', 'Keep going', 'ask-a-friend',
  ]) assert.doesNotMatch(active, new RegExp(removed, 'i'))
})

test('conditional answers clear when their parent becomes irrelevant', () => {
  assert.match(controller, /function clearConditionalFields\(element\)/)
  assert.match(controller, /if \(!visible && !element\.hidden\) clearConditionalFields\(element\)/)
  for (const path of ['genderDescription', 'livingSituationOther', 'relocationCities', 'postMarriageLivingOther', 'priorRelationshipEnd', 'childrenCount', 'faithBackgroundOther', 'interfaithConditions', 'dietOther', 'familyRequirementDetail']) {
    assert.match(`${template}\n${store}`, new RegExp(path))
  }
})

test('the controller validates whole cards and focuses the first incomplete question', () => {
  assert.match(controller, /function validateScreen\(screen\)/)
  assert.match(controller, /if \(!validateScreen\(screen\)\) return/)
  assert.match(controller, /if \(!validateField\(container\) && !firstInvalid\) firstInvalid = container/)
  assert.match(controller, /firstInvalid\) focusInvalid\(firstInvalid\)/)
  assert.doesNotMatch(controller, /handleChoice[\s\S]{0,500}goTo\(nextFor/)
})

test('tags, boundaries, photographs, review and consent are implemented', () => {
  assert.match(controller, /function initTagControl\(control\)/)
  assert.match(controller, /function renderBoundaries\(screen\)/)
  assert.match(controller, /entries\.length >= 3/)
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
  assert.match(styles, /@media\(max-width:899px\)/)
  assert.match(styles, /\.photo-grid\{grid-template-columns:1fr;/)
  assert.match(styles, /overflow-x:hidden/)
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/)
})

test('backend behavior remains preview-only', () => {
  const api = readFileSync(new URL('../src/application/journey/api.js', import.meta.url), 'utf8')
  assert.match(api, /configured: false/)
  assert.doesNotMatch(`${controller}\n${main}\n${store}`, /fetch\(|XMLHttpRequest|localStorage|sessionStorage/)
})
