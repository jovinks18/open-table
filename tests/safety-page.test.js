import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const safetyHtml = readFileSync(new URL('../safety.html', import.meta.url), 'utf8')
const safetyCss = readFileSync(new URL('../src/marketing/safety/styles.css', import.meta.url), 'utf8')

test('safety is a standalone marketing page', () => {
  assert.match(safetyHtml, /data-site-navigation data-page="safety"/)
  assert.match(safetyHtml, /<section class="safety-section" id="safety"/)
  assert.doesNotMatch(safetyHtml, /http-equiv="refresh"|location\.replace/)
  assert.equal((safetyHtml.match(/<article class="safety-item">/g) || []).length, 4)
})

test('safety keeps the four current protections visible', () => {
  assert.match(safetyHtml, /Every application is reviewed/)
  assert.match(safetyHtml, /Your profile is not public/)
  assert.match(safetyHtml, /First meetings happen in public/)
  assert.match(safetyHtml, /You stay in control/)
})

test('reporting and emergency contacts are direct and make no timing promise', () => {
  assert.match(safetyHtml, /href="https:\/\/wa\.me\/13413338019">WhatsApp: \+1 341-333-8019/)
  assert.match(safetyHtml, /href="mailto:thedonnapilot@gmail\.com">Email: thedonnapilot@gmail\.com/)
  for (const number of ['112', '181', '1930']) assert.match(safetyHtml, new RegExp(`href="tel:${number}"`))
  assert.doesNotMatch(safetyHtml, /Jovin reads these|within 2 hours|government ID|proof of where you work/i)
})

test('safety states its limitation once', () => {
  assert.equal((safetyHtml.match(/cannot guarantee another person’s identity, intentions or behaviour/g) || []).length, 1)
})

test('safety uses the restrained burgundy layout and responsive grid', () => {
  assert.match(safetyCss, /\.safety-page\s*\{[\s\S]*--graphite: #26080d/)
  assert.match(safetyCss, /\.safety-layout\s*\{[\s\S]*width: min\(100%, 68rem\)/)
  assert.match(safetyCss, /\.safety-items\s*\{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(safetyCss, /@media \(max-width: 640px\)[\s\S]*grid-template-columns: 1fr/)
})

test('public safety copy does not describe Donna as a pilot', () => {
  const withoutContactAddress = safetyHtml.replaceAll('thedonnapilot@gmail.com', '')
  assert.doesNotMatch(withoutContactAddress, /\bpilot(?:ing)?\b/i)
})
