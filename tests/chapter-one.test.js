import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  calculateAgeFromDateOfBirth,
  dateOfBirthBounds,
  datePartsFromValue,
  dateValueFromParts,
  isValidEmail,
  validateApplicantDateOfBirth,
} from '../src/application/journey/chapter-one.js'
import { isValidPhone } from '../src/application/validation.js'

const template = readFileSync(new URL('../src/application/journey/template.html', import.meta.url), 'utf8')
const controller = readFileSync(new URL('../src/application/journey/controller.js', import.meta.url), 'utf8')
const store = readFileSync(new URL('../src/application/journey/store.js', import.meta.url), 'utf8')

function chapterOneSection(id, nextId) {
  const start = template.indexOf(`id="${id}"`)
  const end = template.indexOf(`id="${nextId}"`, start)
  return template.slice(start, end)
}

test('Chapter I contains three grouped cards with canonical intent fields', () => {
  for (const id of ['ch1-intent', 'ch1-decision', 'ch1-contact']) assert.match(template, new RegExp(`id="${id}" data-chapter="1"`))
  for (const path of ['applicant.relationshipIntent', 'applicant.marriageTimeline', 'applicant.meetingReadiness']) {
    assert.equal((template.match(new RegExp(`data-field="${path.replaceAll('.', '\\.')}"`, 'g')) || []).length > 0, true)
    assert.equal((store.match(new RegExp(path.split('.').at(-1) + ':', 'g')) || []).length, 1)
  }
  assert.doesNotMatch(store, /chapterOne:/)
  assert.doesNotMatch(template, /data-field="applicant\.intent"/)
})

test('Chapter I copy matches the rebuilt journey', () => {
  for (const copy of [
    'Let’s get to know you.',
    'What are you looking for?',
    'If you met the right person, when would you want to be married?',
    'If we found someone for you, could you meet them in the next four weeks?',
    'Gender',
    'Who are you looking to meet?',
    'Can we go one step further?',
    'When it comes to marriage, how much say will your family have?',
    'How can I contact you?',
  ]) assert.ok(template.includes(copy))
  assert.doesNotMatch(template, /No need to overthink|Keep going|Almost through|Take your time/)
  assert.doesNotMatch(template, /Probably, I’d need to arrange it/)
  assert.doesNotMatch(template, /Open to either|Open to both|Prefer to describe myself/)
})

test('the marriage timeline offers the three requested options', () => {
  const intent = chapterOneSection('ch1-intent', 'ch1-decision')
  assert.match(template, /data-value="no_timeline"[^>]*>I don’t have a timeline<\/button>/)
  assert.equal((intent.match(/data-field="applicant\.marriageTimeline"/g) || []).length, 3)
  assert.doesNotMatch(template, /two_to_three_years|Two to three years/)
  assert.doesNotMatch(template, /when_right|When the time is right/)
  assert.match(intent, /data-value="marriage"[^>]*>Marriage<\/button>/)
  assert.match(intent, /data-value="serious_relationship"[^>]*>A serious relationship that could become marriage<\/button>/)
  assert.match(intent, /data-value="not_sure"[^>]*>I’m not sure yet<\/button>/)
  assert.match(controller, /path === 'applicant\.relationshipIntent' && value === 'not_sure'\) goTo\('chapter-one-exit'\)/)
})

test('date of birth uses three selects rather than a native date input', () => {
  assert.doesNotMatch(template, /type="date"/)
  for (const path of ['applicant.dateOfBirth.day', 'applicant.dateOfBirth.month', 'applicant.dateOfBirth.year']) {
    assert.match(template, new RegExp(`data-field="${path.replaceAll('.', '\\.')}"`))
  }
  assert.match(controller, /function populateDateOfBirthSelects\(screen\)/)
})

test('contact validation preserves the age and phone boundaries', () => {
  const today = new Date(2026, 7, 29)
  assert.deepEqual(dateOfBirthBounds(today), { min: '1955-08-30', max: '2005-08-29' })
  assert.deepEqual(datePartsFromValue('1995-08-29', today), { day: 29, month: 8, year: 1995 })
  assert.equal(dateValueFromParts({ day: 29, month: 8, year: 1995 }), '1995-08-29')
  assert.equal(calculateAgeFromDateOfBirth('1995-08-29', today), 31)
  assert.deepEqual(validateApplicantDateOfBirth('2005-08-30', today), { valid: false, message: 'You need to be 21 or older to apply.' })
  assert.deepEqual(validateApplicantDateOfBirth('1955-08-29', today), { valid: false, message: 'Applications are open to people up to 70.' })
  assert.equal(isValidPhone('+91 98765 43210'), true)
  assert.equal(isValidPhone('+1 (415) 555-0136'), true)
  assert.equal(isValidPhone('123'), false)
  assert.equal(isValidEmail('person@example.com'), true)
  assert.equal(isValidEmail('person@invalid'), false)
})

test('age preference is a two-handle range with derived defaults', () => {
  assert.match(template, /data-age-input="minimum"/)
  assert.match(template, /data-age-input="maximum"/)
  assert.doesNotMatch(template, /data-stepper=/)
  assert.match(template, /min="21" max="70"/)
  assert.match(controller, /function clampAgeInterval\(minimum, maximum\)/)
  assert.match(controller, /function derivedAgeRange\(\)/)
  assert.match(controller, /AGE_SPREAD_BELOW = 5/)
  assert.match(controller, /AGE_SPREAD_ABOVE = 7/)
})

test('Chapter I uses the requested gender and seeking pills and starts panel 2 with date of birth and height', () => {
  const intent = chapterOneSection('ch1-intent', 'ch1-decision')
  const decision = chapterOneSection('ch1-decision', 'ch1-contact')
  const contact = chapterOneSection('ch1-contact', 'chapter-one-exit')

  assert.match(intent, /data-field="applicant\.gender"/)
  assert.match(intent, /data-field="applicant\.seeking"/)
  assert.match(intent, /<legend>Gender<\/legend>[\s\S]*>Woman<\/button>[\s\S]*>Man<\/button>[\s\S]*>Non-binary<\/button>/)
  assert.match(intent, /<legend>Who are you looking to meet\?<\/legend>[\s\S]*>Men<\/button>[\s\S]*>Women<\/button>[\s\S]*>Open to all<\/button>/)
  assert.doesNotMatch(intent, /data-required-field="applicant\.dateOfBirth"|data-required-field="applicant\.height"/)
  assert.doesNotMatch(intent, /data-required-field="applicant\.preferredAge"/)
  assert.match(decision, /data-required-field="applicant\.dateOfBirth"[\s\S]*data-required-field="applicant\.height"[\s\S]*data-required-field="applicant\.preferredAge"[\s\S]*data-required-field="applicant\.familyDecisionInfluence"/)
  assert.doesNotMatch(decision, /applicant\.familySearchInvolvement/)
  assert.match(contact, /data-required-field="applicant\.fullName"[\s\S]*data-required-field="applicant\.email"/)
  assert.match(contact, /Your contact details stay private, are never shared with other members, and are only used by donna to reach you\./)
  assert.match(template, /id="chapter-one-exit"[\s\S]*Email address \(optional\)[\s\S]*data-field="applicant\.email"/)
  assert.doesNotMatch(contact, /data-required-field="applicant\.dateOfBirth"/)

  assert.equal((template.match(/data-required-field="applicant\.preferredAge"/g) || []).length, 1)
  assert.equal((template.match(/data-required-field="applicant\.height"/g) || []).length, 1)
  assert.equal((store.match(/\bseeking:/g) || []).length, 1)
  assert.equal((store.match(/\bpreferredAge:/g) || []).length, 1)
})

test('height and contact fields use the requested defaults and examples', () => {
  assert.match(store, /height: \{ unit: 'cm'/)
  assert.match(controller, /fieldValue\('applicant\.height\.unit'\) \|\| 'cm'/)
  assert.match(template, /data-height-unit="cm"[\s\S]*data-height-unit="ft"/)
  assert.match(template, /placeholder="e\.g\. Lana Del Rey"/)
  assert.match(template, /placeholder="yourname@email\.com"/)
})
