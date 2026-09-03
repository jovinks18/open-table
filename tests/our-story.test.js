import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../our-story.html', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/marketing/story/styles.css', import.meta.url), 'utf8')

test('our story replaces the placeholder with the supplied story and no CTA', () => {
  assert.doesNotMatch(html, /Coming soon\./)
  assert.match(html, /<h1>Our story<\/h1>/)
  assert.equal((html.match(/<p>/g) || []).length, 8)
  assert.match(html, /I have always been the friend people ask, “Do you know someone\?”/)
  assert.match(html, /Donna works the same way\./)
  assert.match(html, /Some weeks, I may not have anyone for you\./)
  assert.doesNotMatch(html, /story-signature|— Jo/)
  assert.doesNotMatch(html, /Apply to join|class="[^\"]*cta/)
})

test('our story uses a centred readable text column without a placeholder image', () => {
  assert.doesNotMatch(html, /story-media|story-media__placeholder/)
  assert.doesNotMatch(styles, /story-media|story-media__placeholder/)
  assert.match(styles, /width: min\(100%, 42rem\)/)
  assert.match(styles, /\.story-layout \{\s*display: block;/)
  assert.match(styles, /max-width: 42rem/)
  assert.match(styles, /\.story-copy p \+[\s\S]*margin-top: 2rem/)
})

test('our story preserves a readable text measure below 900px', () => {
  assert.match(styles, /@media \(max-width: 899px\)[\s\S]*\.story-copy \{[\s\S]*max-width: 38rem/)
})
