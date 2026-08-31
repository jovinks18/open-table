import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../our-story.html', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/marketing/story/styles.css', import.meta.url), 'utf8')

test('our story replaces the placeholder with the supplied story and no CTA', () => {
  assert.doesNotMatch(html, /Coming soon\./)
  assert.match(html, /<h1>Our story<\/h1>/)
  assert.equal((html.match(/<p(?: class="story-signature")?>/g) || []).length, 9)
  assert.match(html, /My mother keeps the biodatas in a folder\./)
  assert.match(html, /donna is her method, pointed at the people instead of the families\./)
  assert.match(html, /<p class="story-signature">— Jo<\/p>/)
  assert.doesNotMatch(html, /Apply to join|class="[^\"]*cta/)
})

test('our story uses a sticky 45\/55 layout and a swappable clay placeholder', () => {
  assert.match(html, /class="story-media" aria-hidden="true">\s*<div class="story-media__placeholder"><\/div>/)
  assert.match(styles, /width: min\(100%, 70rem\)/)
  assert.match(styles, /grid-template-columns: minmax\(0, 45fr\) minmax\(0, 55fr\)/)
  assert.match(styles, /gap: 4rem/)
  assert.match(styles, /\.story-media \{[\s\S]*position: sticky[\s\S]*aspect-ratio: 4 \/ 5/)
  assert.match(styles, /background: var\(--terracotta\)/)
  assert.match(styles, /max-width: 35rem/)
  assert.match(styles, /\.story-copy p \+[\s\S]*margin-top: 2rem/)
})

test('our story becomes image-first single-column below 900px', () => {
  assert.match(styles, /@media \(max-width: 899px\)[\s\S]*grid-template-columns: 1fr/)
  assert.match(styles, /@media \(max-width: 899px\)[\s\S]*\.story-media \{[\s\S]*position: static[\s\S]*margin-bottom: 2\.5rem/)
})
