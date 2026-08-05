import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const faqHtml = readFileSync(new URL('../faq.html', import.meta.url), 'utf8')

function positionOf(text) {
  return faqHtml.indexOf(text)
}

test('faq uses three ordered groups and the complete supplied question list', () => {
  const groupLabels = ['The basics', 'How introductions work', 'Cost and your data']
  const positions = groupLabels.map(positionOf)

  assert.equal(positions.every((position) => position >= 0), true)
  assert.deepEqual([...positions].sort((a, b) => a - b), positions)
  assert.equal((faqHtml.match(/<details class="faq-item">/g) || []).length, 23)
})

test('faq decisions match the application and homepage photo flow', () => {
  assert.match(faqHtml, /We ask\. For a lot of people it matters, and pretending it doesn't wastes everyone's time\./)
  assert.match(faqHtml, /Once you've both said yes to an introduction, photos are shared before we set a time\./)
  assert.doesNotMatch(faqHtml, /community isn't one of the things we ask about|You'll see each other at the meeting/)
})

test('faq removes the duplicate debrief entry and links footer contact', () => {
  assert.match(faqHtml, /Does the other person see my debrief\?/)
  assert.doesNotMatch(faqHtml, /What about what I say in a debrief\?/)
  assert.match(faqHtml, /href="mailto:thedonnapilot@gmail\.com">Contact<\/a>/)
})
