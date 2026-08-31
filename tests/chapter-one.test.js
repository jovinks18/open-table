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
  for (const path of ['applicant.marriageTimeline', 'applicant.meetingReadiness']) {
    assert.equal((template.match(new RegExp(`data-field="${path.replaceAll('.', '\\.')}"`, 'g')) || []).length > 0, true)
    assert.equal((store.match(new RegExp(path.split('.').at(-1) + ':', 'g')) || []).length, 1)
  }
  assert.doesNotMatch(store, /chapterOne:/)
  assert.doesNotMatch(template, /applicant\.intent/)
})

test('Chapter I copy matches the rebuilt journey', () => {
  for (const copy of [
    'Where you’re starting from.',
    'If you met the right person, when would you want to be married?',
    'Could you realistically meet someone in the next four weeks?',
    'I’m a ',
    'Who’s in the room.',
    'Who else is involved in your search?',
    'When it comes to the final decision, how much say will your family have?',
    'How to find you.',
  ]) assert.ok(template.includes(copy))
  assert.doesNotMatch(template, /No need to overthink|Keep going|Almost through|Take your time/)
  assert.doesNotMatch(template, /Open to either|Non-binary|Prefer to describe myself/)
})

test('the marriage timeline offers the four rebuilt options', () => {
  assert.match(template, /data-value="no_timeline"[^>]*>I don’t have a timeline<\/button>/)
  assert.doesNotMatch(template, /when_right|When the time is right/)
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
  assert.deepEqual(validateApplicantDateOfBirth('1955-08-29', today), { valid: false, message: 'This pilot is for applicants up to 70.' })
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

test('Chapter I keeps gender and seeking in panel 1 and preferred age in panel 2', () => {
  const intent = chapterOneSection('ch1-intent', 'ch1-decision')
  const decision = chapterOneSection('ch1-decision', 'ch1-contact')
  const contact = chapterOneSection('ch1-contact', 'chapter-one-exit')

  assert.match(intent, /data-field="applicant\.gender"/)
  assert.match(intent, /data-field="applicant\.seeking"/)
  assert.match(intent, /data-required-field="applicant\.dateOfBirth"/)
  assert.doesNotMatch(intent, /data-required-field="applicant\.preferredAge"/)
  assert.match(decision, /data-required-field="applicant\.preferredAge"[\s\S]*data-required-field="applicant\.familySearchInvolvement"/)
  assert.match(contact, /data-required-field="applicant\.fullName"[\s\S]*data-required-field="applicant\.email"/)
  assert.doesNotMatch(contact, /data-required-field="applicant\.dateOfBirth"/)

  assert.equal((template.match(/data-required-field="applicant\.preferredAge"/g) || []).length, 1)
  assert.equal((store.match(/\bseeking:/g) || []).length, 1)
  assert.equal((store.match(/\bpreferredAge:/g) || []).length, 1)
})
