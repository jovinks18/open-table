import assert from 'node:assert/strict'
import test from 'node:test'

import { journeyApi } from '../src/application/journey/api.js'
import { applicationFieldPaths, fieldBindings, nominatorFieldPaths } from '../src/application/journey/fields.js'
import {
  JOURNEY_STATE_VERSION,
  createJourneyStore,
  initialJourneyState,
} from '../src/application/journey/store.js'

test('journey state is versioned, isolated per store, and serializable', () => {
  const first = createJourneyStore()
  const second = createJourneyStore()

  first.setField('applicant.fullName', 'Aanya Rao')
  first.setScreen('ch1-decision')

  assert.equal(JOURNEY_STATE_VERSION, 3)
  assert.equal(first.getState().applicant.fullName, 'Aanya Rao')
  assert.equal(first.getState().currentScreen, 'ch1-decision')
  assert.equal(second.getState().applicant.fullName, '')
  assert.deepEqual(JSON.parse(first.serialize()), first.getState())
  assert.equal(initialJourneyState.mode, 'preview')
})

test('every DOM binding has a unique stable state path', () => {
  assert.equal(fieldBindings.length, 42)
  assert.equal(new Set(applicationFieldPaths).size, applicationFieldPaths.length)
  assert.ok(applicationFieldPaths.every((path) => /^applicant\./.test(path)))
  assert.ok(nominatorFieldPaths.every((path) => /^nominator\./.test(path)))
  assert.equal(new Set(nominatorFieldPaths).size, nominatorFieldPaths.length)
  assert.equal(initialJourneyState.path, '')
  assert.equal(initialJourneyState.nominator.sealed, false)
  assert.ok(!('referrer' in initialJourneyState))
  assert.ok(!('friendPerspectiveChoice' in initialJourneyState.applicant))
  assert.ok(!('chapterOne' in initialJourneyState.applicant))
  assert.ok(!('employer' in initialJourneyState.applicant))
  assert.ok(!('intent' in initialJourneyState.applicant))
  assert.ok(!('drinking' in initialJourneyState.applicant))
  assert.ok(!('smoking' in initialJourneyState.applicant))
  assert.ok(!('bothWorking' in initialJourneyState.applicant))
  assert.ok(!applicationFieldPaths.includes('applicant.bothWorking'))
  assert.ok(!('familySearchInvolvement' in initialJourneyState.applicant))
  assert.ok(!('livingSituation' in initialJourneyState.applicant))
  assert.deepEqual(initialJourneyState.applicant.relocationCities, [])
  assert.ok(!('reflectiveConflict' in initialJourneyState.applicant))
  assert.ok(!('oneThingToKnow' in initialJourneyState.applicant))
  assert.equal(initialJourneyState.applicant.nonNegotiables, '')
  assert.equal(initialJourneyState.applicant.familyRequirementDetail, '')
  assert.ok(!('boundariesConfirmed' in initialJourneyState.applicant))
  assert.ok(!('institution' in initialJourneyState.applicant))
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
