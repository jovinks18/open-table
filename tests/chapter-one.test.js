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

test('Chapter I contains three grouped cards with canonical intent fields', () => {
  for (const id of ['ch1-intent', 'ch1-decision', 'ch1-contact']) assert.match(template, new RegExp(`id="${id}" data-chapter="1"`))
  for (const path of ['applicant.intent', 'applicant.marriageTimeline', 'applicant.meetingReadiness']) {
    assert.equal((template.match(new RegExp(`data-field="${path.replaceAll('.', '\\.')}"`, 'g')) || []).length > 0, true)
    assert.equal((store.match(new RegExp(path.split('.').at(-1) + ':', 'g')) || []).length, 1)
  }
  assert.doesNotMatch(store, /chapterOne:/)
})

test('Chapter I copy and exit behavior match the rebuilt journey', () => {
  for (const copy of [
    'What are you looking for?',
    'If you met the right person, when would you want to be married?',
    'Could you realistically meet someone in the next four weeks?',
    'Who else is involved in your search?',
    'When it comes to the final decision, how much say will your family have?',
    'How can I reach you?',
  ]) assert.ok(template.includes(copy))
  assert.match(controller, /path === 'applicant\.intent' && value === 'not_sure'/)
  assert.match(controller, /goTo\('chapter-one-exit'\)/)
  assert.doesNotMatch(template, /No need to overthink|Keep going|Almost through|Take your time/)
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
  assert.match(controller, /dateInput\.min = bounds\.min/)
  assert.match(controller, /dateInput\.max = bounds\.max/)
})

test('age preference stores absolute bounds and never uses offset wording', () => {
  assert.match(template, />Minimum age</)
  assert.match(template, />Maximum age</)
  assert.match(template, /data-stepper="applicant\.preferredAge\.minimum"/)
  assert.match(template, /data-stepper="applicant\.preferredAge\.maximum"/)
  assert.doesNotMatch(template, /Younger by|Older by/)
})
