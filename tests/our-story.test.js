import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../our-story.html', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/marketing/story/styles.css', import.meta.url), 'utf8')

test('our story replaces the placeholder with the supplied story and no CTA', () => {
  assert.doesNotMatch(html, /Coming soon\./)
  assert.match(html, /<h1>Before I had a name<\/h1>/)
  assert.equal((html.match(/<p>/g) || []).length, 16)
  assert.match(html, /Before I had a name, I was a question passed between friends\./)
  assert.match(html, /I am not an AI, and there is no algorithm deciding who deserves whom\./)
  assert.match(html, /The rarer kindness is knowing when not to\./)
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

test('our story uses Donna’s burgundy public-page palette', () => {
  assert.match(html, /<meta name="theme-color" content="#26080d" \/>/)
  assert.match(styles, /--graphite: #26080d/)
  assert.match(styles, /--graphite-ink: #f0e4e0/)
  assert.match(styles, /--graphite-muted: #c9afab/)
  assert.match(styles, /linear-gradient\(160deg, #1c0509 0%, #26080d 55%, #34090d 100%\)/)
})
