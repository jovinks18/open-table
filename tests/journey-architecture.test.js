import assert from 'node:assert/strict'
import test from 'node:test'

import { journeyApi } from '../src/application/journey/api.js'
import { applicationFieldPaths, fieldBindings } from '../src/application/journey/fields.js'
import {
  JOURNEY_STATE_VERSION,
  createJourneyStore,
  initialJourneyState,
} from '../src/application/journey/store.js'

test('journey state is versioned, isolated per store, and serializable', () => {
  const first = createJourneyStore()
  const second = createJourneyStore()

  first.setField('applicant.fullName', 'Aanya Rao')
  first.setScreen('ch1-2')

  assert.equal(JOURNEY_STATE_VERSION, 1)
  assert.equal(first.getState().applicant.fullName, 'Aanya Rao')
  assert.equal(first.getState().currentScreen, 'ch1-2')
  assert.equal(second.getState().applicant.fullName, '')
  assert.deepEqual(JSON.parse(first.serialize()), first.getState())
  assert.equal(initialJourneyState.mode, 'preview')
})

test('every DOM binding has a unique stable state path', () => {
  assert.ok(fieldBindings.length >= 45)
  assert.equal(new Set(applicationFieldPaths).size, applicationFieldPaths.length)
  assert.ok(applicationFieldPaths.every((path) => /^(applicant|referrer)\./.test(path)))
})

test('the backend adapter is explicit and safely inactive', async () => {
  assert.equal(journeyApi.configured, false)
  assert.deepEqual(await journeyApi.saveDraft({}), {
    ok: false,
    status: 'preview-only',
    message: 'Application transport is not configured.',
  })
  assert.deepEqual(await journeyApi.submitApplication({}), await journeyApi.createPhotoUpload({}))
})
