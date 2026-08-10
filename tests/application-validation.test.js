import assert from 'node:assert/strict'
import test from 'node:test'

import { APPLICATION_STEPS } from '../src/application/schema.js'
import {
  calculateAge,
  deriveHeightCm,
  isAtLeast25,
  isFieldVisible,
  isValidEmail,
  isValidLinkedInUrl,
  isValidPhone,
  sanitizeText,
  UNDER_25_MESSAGE,
  validateAgeRange,
  validateField,
  validatePhoto,
} from '../src/application/validation.js'

const referenceDate = new Date(2026, 7, 3)
const allFields = APPLICATION_STEPS.flatMap(({ fields }) => fields)
const field = (name) => allFields.find((item) => item.name === name)

test('calculates the exact 25th-birthday boundary', () => {
  assert.equal(calculateAge('2001-08-03', referenceDate), 25)
  assert.equal(isAtLeast25('2001-08-03', referenceDate), true)
  assert.equal(calculateAge('2001-08-04', referenceDate), 24)
  assert.equal(isAtLeast25('2001-08-04', referenceDate), false)
  assert.equal(UNDER_25_MESSAGE, "donna's pilot is open to people 25 and over.")
})

test('rejects invalid calendar dates', () => {
  assert.equal(calculateAge('2001-02-29', referenceDate), null)
  assert.equal(calculateAge('not-a-date', referenceDate), null)
})

test('validates contact fields', () => {
  assert.equal(isValidEmail('person@example.com'), true)
  assert.equal(isValidEmail('person@invalid'), false)
  assert.equal(isValidPhone('+91 98765 43210'), true)
  assert.equal(isValidPhone('98765 43210'), false)
})

test('accepts only LinkedIn profile URLs', () => {
  assert.equal(isValidLinkedInUrl('https://www.linkedin.com/in/example-person'), true)
  assert.equal(isValidLinkedInUrl('https://linkedin.com/company/example'), false)
  assert.equal(isValidLinkedInUrl('https://example.com/in/example-person'), false)
})

test('validates both age-range bounds and ordering', () => {
  assert.equal(validateAgeRange(28, 35), '')
  assert.equal(validateAgeRange(24, 35), 'Age range cannot go below 25.')
  assert.equal(validateAgeRange(35, 28), 'Minimum age cannot exceed maximum age.')
  assert.equal(validateAgeRange(30, 71), 'Age range cannot go above 70.')
})

test('conditional fields render only for their specified values', () => {
  assert.equal(isFieldVisible(field('genderSelfDescribe'), { gender: 'self_describe' }), true)
  assert.equal(isFieldVisible(field('genderSelfDescribe'), { gender: 'woman' }), false)
  assert.equal(isFieldVisible(field('languagesOther'), { languages: ['english', 'other'] }), true)
  assert.equal(isFieldVisible(field('languagesOther'), { languages: ['english'] }), false)
})

test('all four required long-form questions reject empty values and cap at 600', () => {
  ;['partnerRole', 'friendsDescribe', 'tuesdayEvening', 'learnedAboutSelf'].forEach((name) => {
    assert.match(validateField(field(name), ''), /required/)
    assert.equal(validateField(field(name), 'a'.repeat(600)), '')
    assert.match(validateField(field(name), 'a'.repeat(601)), /600 characters or fewer/)
  })
})

test('non-negotiables accept zero to three entries and reject a fourth', () => {
  assert.equal(validateField(field('nonNegotiables'), []), '')
  assert.equal(validateField(field('nonNegotiables'), ['one', 'two', 'three']), '')
  assert.match(validateField(field('nonNegotiables'), ['one', 'two', 'three', 'four']), /no more than 3/)
  assert.match(validateField(field('nonNegotiables'), ['a'.repeat(121)]), /120 characters or fewer/)
})

test('derives an integer height in centimetres from required feet and inches controls', () => {
  assert.equal(deriveHeightCm('', '8'), null)
  assert.equal(deriveHeightCm('5', ''), null)
  assert.equal(deriveHeightCm('5', '8'), 173)
  assert.equal(Number.isInteger(deriveHeightCm('6', '0')), true)
  assert.match(validateField(field('heightCm'), ''), /required/)
  assert.equal(validateField(field('heightCm'), 173), '')
})

test('validates photograph type and size', () => {
  assert.equal(validatePhoto({ type: 'image/webp', size: 10 * 1024 * 1024 }), '')
  assert.equal(validatePhoto({ type: 'image/gif', size: 1000 }), 'Choose a JPEG, PNG or WebP image.')
  assert.equal(validatePhoto({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 }), 'Choose an image that is 10 MB or smaller.')
})

test('sanitizes control characters without changing ordinary punctuation', () => {
  assert.equal(sanitizeText('  Hello\u0000 — donna  '), 'Hello — donna')
})
