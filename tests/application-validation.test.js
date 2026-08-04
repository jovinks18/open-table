import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateAge,
  isAtLeast25,
  isValidEmail,
  isValidLinkedInUrl,
  isValidPhone,
  sanitizeText,
  validateAgeRange,
  validatePhoto,
} from '../src/application/validation.js'

const referenceDate = new Date(2026, 7, 3)

test('calculates the exact 25th-birthday boundary', () => {
  assert.equal(calculateAge('2001-08-03', referenceDate), 25)
  assert.equal(isAtLeast25('2001-08-03', referenceDate), true)
  assert.equal(calculateAge('2001-08-04', referenceDate), 24)
  assert.equal(isAtLeast25('2001-08-04', referenceDate), false)
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

test('validates preferred age order', () => {
  assert.equal(validateAgeRange(28, 35), '')
  assert.equal(validateAgeRange(35, 28), 'Preferred maximum age cannot be lower than preferred minimum age.')
})

test('validates photograph type and size', () => {
  assert.equal(validatePhoto({ type: 'image/webp', size: 10 * 1024 * 1024 }), '')
  assert.equal(validatePhoto({ type: 'image/gif', size: 1000 }), 'Choose a JPEG, PNG or WebP image.')
  assert.equal(validatePhoto({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 }), 'Choose an image that is 10 MB or smaller.')
})

test('sanitizes control characters without changing ordinary punctuation', () => {
  assert.equal(sanitizeText('  Hello\u0000 — donna  '), 'Hello — donna')
})
