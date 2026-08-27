import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  calculateAgeFromDateOfBirth,
  datePartsFromValue,
  dateValueFromParts,
  isValidEmail,
  normalizeIndianMobile,
} from '../src/application/journey/chapter-one.js'

const template = readFileSync(new URL('../src/application/journey/template.html', import.meta.url), 'utf8')
const controller = readFileSync(new URL('../src/application/journey/chapter-one.js', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/application/journey/styles.css', import.meta.url), 'utf8')

test('Chapter I contains six screens, with date of birth only on its contact screen', () => {
  for (let screen = 1; screen <= 6; screen += 1) assert.match(template, new RegExp(`id="ch1-${screen}"`))
  assert.doesNotMatch(template, /id="ch1-7"/)
  assert.doesNotMatch(template, /id="ch1-complete"|id="dobDay"|id="currentCityInput"/)
  assert.equal((template.match(/id="chapterOneDateOfBirth"/g) || []).length, 1)
  assert.match(template, /id="chapter-one-exit"/)
})

test('Chapter I uses native buttons, disabled Continue controls, and no tick glyphs', () => {
  assert.doesNotMatch(template, /<div class="chapter-one-option"/)
  assert.match(template, /<button class="chapter-one-option" type="button"/)
  assert.match(template, /aria-pressed="false"/)
  assert.doesNotMatch(template, /chapter-one-option__mark|✓|&#10003;/)
  assert.match(template, /data-chapter-one-continue[^>]*disabled/)
  assert.match(styles, /min-height:48px/)
})

test('the controller enforces every Chapter I gate and persists answers in journey state', () => {
  assert.match(controller, /function canAdvance\(screen\)/)
  assert.match(controller, /journeyStore\.setField\(group\.dataset\.singleField/)
  assert.match(controller, /journeyStore\.setField\(group\.dataset\.multiField/)
  assert.match(controller, /'ch1-5': 'applicant\.chapterOne\.meetingReadiness'/)
  assert.match(controller, /goTo\('chapter-one-exit'\)/)
  assert.match(controller, /firstInvalid\[0\]\.focus\(\)/)
})

test('Indian phone and email validation accept intended formats and reject invalid values', () => {
  assert.equal(normalizeIndianMobile('98765 43210'), '9876543210')
  assert.equal(normalizeIndianMobile('+91 98765-43210'), '9876543210')
  assert.equal(normalizeIndianMobile('09876543210'), '9876543210')
  assert.equal(normalizeIndianMobile('5876543210'), '')
  assert.equal(normalizeIndianMobile('98765'), '')
  assert.equal(isValidEmail('person@example.com'), true)
  assert.equal(isValidEmail('person@invalid'), false)
})

test('date of birth is stored as parts and computes age at the birthday boundary', () => {
  const today = new Date(2026, 7, 26)
  assert.deepEqual(datePartsFromValue('1995-08-26', today), { day: 26, month: 8, year: 1995 })
  assert.equal(dateValueFromParts({ day: 26, month: 8, year: 1995 }), '1995-08-26')
  assert.equal(calculateAgeFromDateOfBirth('1995-08-26', today), 31)
  assert.equal(calculateAgeFromDateOfBirth('1995-08-27', today), 30)
  assert.equal(datePartsFromValue('2027-01-01', today), null)
})

test('question screens place one semantic question in the mascot bubble and no heading in the card', () => {
  const questionScreens = [
    'friend-verification',
    'ch1-1', 'ch1-2', 'ch1-3', 'ch1-4', 'ch1-5', 'ch1-6',
    'ch2', 'ch3-1', 'ch3-2', 'ch4-1', 'ch4-2', 'ch5-1', 'ch5-2', 'ch6',
    'ch7-1', 'ch7-2', 'ch7-3', 'ch7-4', 'ch7-5', 'ch7-6', 'ch7-friend-prompt',
    'write-note',
  ]

  questionScreens.forEach((screenId) => {
    const start = template.indexOf(`id="${screenId}"`)
    const end = template.indexOf('</section>', start)
    const screen = template.slice(start, end)
    assert.match(screen, /<h1 class="bubble-question" id="[^"]+">/)
    assert.doesNotMatch(screen, /class="headline"|class="eyebrow"|class="subline"/)
  })
})

test('I.2 keeps only its four answers and navigation without a card', () => {
  const start = template.indexOf('id="ch1-2"')
  const end = template.indexOf('</section>', start)
  const screen = template.slice(start, end)

  assert.match(screen, /<h1 class="bubble-question" id="question-ch1-2">If you met the right person, when would you want to be married\?<\/h1>/)
  assert.equal((screen.match(/class="chapter-one-option"/g) || []).length, 4)
  assert.doesNotMatch(screen, /class="card|class="answer-card"/)
  assert.match(screen, />Back<\/button>.*>Continue<\/button>/s)
})

test('the surviving bubble heading labels controls and retains required field labels', () => {
  assert.match(template, /role="group" aria-labelledby="question-ch1-2"/)
  for (const [id, label] of [
    ['chapterOneName', 'Your name'],
    ['chapterOneDateOfBirth', 'Date of birth'],
    ['chapterOnePhone', 'Phone number'],
    ['chapterOneEmail', 'Email'],
  ]) assert.match(template, new RegExp(`<label for="${id}">${label}</label>`))

  assert.match(styles, /\.bubble-question\{[\s\S]*font-family:var\(--serif\); font-size:36px; font-weight:500;[\s\S]*line-height:1\.08/)
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*\.bubble-question\{ font-size:25px; line-height:1\.12; \}/)
})

test('I.5 asks one four-week readiness question with three required single-select answers', () => {
  const start = template.indexOf('id="ch1-5"')
  const screen = template.slice(start, template.indexOf('</section>', start))

  assert.match(screen, /<h1 class="bubble-question" id="question-ch1-5">Could you realistically meet someone in the next four weeks\?<\/h1>/)
  assert.match(screen, /data-single-field="applicant\.chapterOne\.meetingReadiness"/)
  assert.doesNotMatch(screen, /data-multi-field|meeting-soon-label|And how soon\?|meetingAvailability|meetingTimeline/)
  assert.deepEqual(
    [...screen.matchAll(/data-value="([^"]+)" aria-pressed="false"><span>([^<]+)<\/span>/g)].map(([, value, label]) => [value, label]),
    [['yes', 'Yes'], ['probably', "Probably — I'd need to sort out when"], ['no', 'No']],
  )
  assert.match(screen, /data-chapter-one-continue data-next="ch1-6" disabled/)
})

test('the removed obstacle screen leaves I.5 and contact as adjacent screens', () => {
  assert.doesNotMatch(template, /datingObstacle/)
  const start = template.indexOf('id="ch1-6"')
  const contact = template.slice(start, template.indexOf('</section>', start))
  assert.match(contact, /data-back="ch1-5"/)
  assert.match(contact, /data-next="ch2"/)
  assert.match(contact, /id="chapterOneDateOfBirth" type="date" required/)
  assert.ok(template.indexOf('id="chapterOneDateOfBirth"') < template.indexOf('id="ch2"'))
})

test('option-only Chapter I screens are wrapperless and text-entry screens retain cards', () => {
  for (const screenId of ['ch1-1', 'ch1-2', 'ch1-3', 'ch1-4', 'ch1-5']) {
    const start = template.indexOf(`id="${screenId}"`)
    const screen = template.slice(start, template.indexOf('</section>', start))
    assert.doesNotMatch(screen, /class="card(?: |")|class="answer-card"/)
    assert.match(screen, /class="chapter-one-options[^"]*option-surface/)
  }

  for (const screenId of ['ch1-6']) {
    const start = template.indexOf(`id="${screenId}"`)
    const screen = template.slice(start, template.indexOf('</section>', start))
    assert.match(screen, /class="card answer-card"/)
  }
})

test('option visual states use bordered rows and clay inversion without broad transitions', () => {
  assert.match(styles, /\.chapter-one-option\{[\s\S]*border:1px solid rgba\(242,153,133,0\.28\); border-radius:12px;[\s\S]*background-color:transparent; color:rgba\(247,236,230,0\.72\);[\s\S]*transition:background-color 120ms, border-color 120ms, color 120ms;/)
  assert.match(styles, /\.chapter-one-option\[aria-pressed="true"\]\{ border-color:var\(--rose\); background-color:var\(--rose\); color:#26080D; font-weight:500; \}/)
  assert.match(styles, /\.chapter-one-option:hover\{ border-color:var\(--rose\); color:#fff; \}/)
  assert.match(styles, /\.chapter-one-option:focus-visible\{ outline:2px solid #fff; outline-offset:3px; \}/)
  assert.doesNotMatch(styles, /\.chapter-one-option[^}]*transition:all/s)
  assert.match(styles, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*\.chapter-one-option\{ transition:none; \}/)
})

test('the journey uses one fixed-top, content-sized stack at every breakpoint', () => {
  for (let screen = 1; screen <= 6; screen += 1) {
    const start = template.indexOf(`id="ch1-${screen}"`)
    const content = template.slice(start, template.indexOf('</section>', start))
    assert.match(content, /class="answer-zone"/)
  }

  assert.match(styles, /html,body,#journey-root\{height:100%; overflow:hidden;\}/)
  assert.match(styles, /\.journey-screen\.active\{[\s\S]*height:100dvh;[\s\S]*overflow:hidden;/)
  assert.match(styles, /top:max\(0px,calc\(24dvh - 108px\)\)/)
  assert.match(styles, /width:min\(620px,calc\(100% - 48px\)\);[\s\S]*max-width:620px;/)
  assert.match(styles, /grid-template-rows:96px auto 64px;[\s\S]*gap:6px;/)
  assert.match(styles, /right:calc\(100% \+ 16px\);[\s\S]*width:62px;[\s\S]*height:62px;/)
  assert.match(styles, /\.chapter-one-screen \.answer-card\{[\s\S]*padding:8px;[\s\S]*border-radius:12px;/)
  assert.match(styles, /@media \(max-width:899px\)[\s\S]*top:max\(0px,calc\(24dvh - 130px\)\)[\s\S]*grid-template-rows:150px auto 64px;[\s\S]*max-height:calc\(76dvh - 186px\);[\s\S]*overflow-y:auto;/)
  assert.doesNotMatch(styles, /height:367px|min-height:367px|34%|grid-template-columns:300px|max-width:1000px|border-right:/)
  assert.match(styles, /\.journey-screen \.next-btn:disabled\{[\s\S]*background:rgba\(247,236,230,0\.04\);[\s\S]*cursor:not-allowed;/)
  assert.match(styles, /\.journey-screen \.next-btn:not\(:disabled\)\{[\s\S]*background:var\(--rose\);[\s\S]*color:#26080D;/)
})

test('input autofill retains the journey palette in every WebKit autofill state', () => {
  for (const state of ['', ':hover', ':focus', ':active']) {
    assert.match(styles, new RegExp(`\\.field input:-webkit-autofill${state.replace(':', '\\:')}`))
  }
  assert.match(styles, /-webkit-box-shadow:0 0 0 1000px #26080D inset/)
  assert.match(styles, /-webkit-text-fill-color:var\(--cream\)/)
})
