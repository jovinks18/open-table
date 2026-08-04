import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  clampApplicationStep,
  GATEWAY_STEP,
  getProgressState,
} from '../src/application/navigation.js'
import {
  APPLICATION_GATEWAY,
  APPLICATION_STEPS,
} from '../src/application/schema.js'

test('keeps the gateway outside the six application steps', () => {
  assert.equal(GATEWAY_STEP, -1)
  assert.equal(APPLICATION_STEPS.length, 6)
  assert.deepEqual(
    APPLICATION_STEPS.map(({ id }) => id),
    ['eligibility', 'basics', 'about', 'preferences', 'photographs', 'review'],
  )
})

test('reports all six progress states accurately', () => {
  assert.equal(getProgressState(GATEWAY_STEP, APPLICATION_STEPS.length), null)

  APPLICATION_STEPS.forEach((_, index) => {
    const progress = getProgressState(index, APPLICATION_STEPS.length)
    assert.equal(progress.current, index + 1)
    assert.equal(progress.total, 6)
    assert.equal(progress.label, `Step ${index + 1} of 6`)
    assert.equal(progress.ariaLabel, `Application progress: step ${index + 1} of 6`)
  })
})

test('allows eligibility to return to the gateway without inventing another step', () => {
  assert.equal(clampApplicationStep(0, APPLICATION_STEPS.length), 0)
  assert.equal(clampApplicationStep(-1, APPLICATION_STEPS.length), GATEWAY_STEP)
  assert.equal(clampApplicationStep(-2, APPLICATION_STEPS.length), GATEWAY_STEP)
  assert.equal(clampApplicationStep(99, APPLICATION_STEPS.length), 5)
})

test('centralizes the required gateway content', () => {
  assert.equal(APPLICATION_GATEWAY.eyebrow, 'PRIVATE APPLICATION · 25+')
  assert.equal(APPLICATION_GATEWAY.title, 'A thoughtful introduction starts with being known.')
  assert.equal(APPLICATION_GATEWAY.checklist.length, 4)
  assert.deepEqual(APPLICATION_GATEWAY.nextSteps.map(({ title }) => title), ['Donna reviews', 'Donna asks', 'You decide'])
  assert.deepEqual(APPLICATION_GATEWAY.controls.map(({ title }) => title), ['Private by default', 'Permission each time', 'Decline quietly'])
})

test('application code contains no persistence or submission transport APIs', () => {
  const source = readFileSync(new URL('../src/application/app.js', import.meta.url), 'utf8')
  const forbidden = ['localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'XMLHttpRequest', 'sendBeacon']
  forbidden.forEach((token) => assert.equal(source.includes(token), false, `${token} must not be used`))
})

test('application transitions honour reduced-motion preferences', () => {
  const styles = readFileSync(new URL('../src/styles/pages/apply.css', import.meta.url), 'utf8')
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(styles, /\.application-screen\s*{\s*animation: none;/)
})
