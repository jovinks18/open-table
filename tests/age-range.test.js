import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateAnchoredAgeRange } from '../src/application/journey/age-range.js'

test('age preference uses the requested offsets when the floor is not reached', () => {
  assert.deepEqual(calculateAnchoredAgeRange(31, 3, 7), { minimum: 28, maximum: 38 })
})

test('age preference truncates only its lower edge when it falls below 22', () => {
  assert.deepEqual(calculateAnchoredAgeRange(21, 3, 7), { minimum: 22, maximum: 28 })
})

test('age preference never returns an identical minimum and maximum', () => {
  assert.deepEqual(calculateAnchoredAgeRange(22, 0, 0), { minimum: 22, maximum: 23 })
})
