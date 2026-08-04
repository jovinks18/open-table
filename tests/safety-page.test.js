import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildMailtoHref,
  isConfiguredHttpUrl,
} from '../src/scripts/modules/site-links.js'

const safetyHtml = readFileSync(new URL('../safety.html', import.meta.url), 'utf8')
const safetyCss = readFileSync(new URL('../src/styles/pages/safety.css', import.meta.url), 'utf8')

function visibleText(value) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

test('safety guidance is organized into six semantic category cards', () => {
  const articles = [...safetyHtml.matchAll(/<article\b[^>]*class="[^"]*safety-category-card[^"]*"/g)]

  assert.equal(articles.length, 6)
  assert.match(safetyHtml, /id="review"/)
  assert.match(safetyHtml, /id="meeting"/)
  assert.match(safetyHtml, /id="support"/)
  assert.doesNotMatch(safetyHtml, /safety-hero|Private pilot\s*·\s*25\+\s*·\s*Manual review/)
})

test('safety page maintains one h1 and logical section-heading order', () => {
  const headings = [...safetyHtml.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(([, level, content]) => ({ level: level.toLowerCase(), text: visibleText(content) }))

  assert.equal(headings.filter(({ level }) => level === 'h1').length, 1)
  assert.equal(headings.find(({ level }) => level === 'h1')?.text, 'Safety at donna')

  const requiredH2s = [
    'Every application is reviewed',
    'Nothing is shared without permission',
    'Meet somewhere public',
    'You stay in control',
    'Money requests are a warning sign',
    'Tell us when something feels wrong',
    'Report a concern',
  ]
  const h2Text = headings.filter(({ level }) => level === 'h2').map(({ text }) => text)
  const positions = requiredH2s.map((heading) => h2Text.indexOf(heading))
  assert.equal(positions.every((position) => position >= 0), true)
  assert.deepEqual([...positions].sort((a, b) => a - b), positions)
})

test('missing safety contact uses an honest non-interactive placeholder', () => {
  assert.match(safetyHtml, /data-contact-fallback[^>]*aria-disabled="true">donna’s safety contact is being configured\.<\/span>/)
  assert.doesNotMatch(safetyHtml, /href="#"/)
  assert.doesNotMatch(safetyHtml, /mailto:\s*["']/)
})

test('configured contact and privacy values produce usable links', () => {
  assert.equal(buildMailtoHref('', 'Safety concern'), '')
  assert.equal(buildMailtoHref('care@example.com', 'Safety concern'), 'mailto:care@example.com?subject=Safety%20concern')
  assert.equal(isConfiguredHttpUrl(''), false)
  assert.equal(isConfiguredHttpUrl('not-a-url'), false)
  assert.equal(isConfiguredHttpUrl('https://example.com/privacy'), true)
})

test('card copy stays concise and avoids unsupported safety claims', () => {
  const cards = [...safetyHtml.matchAll(/<article\b[^>]*class="safety-category-card"[^>]*>([\s\S]*?)<\/article>/g)]

  assert.equal(cards.length, 6)
  cards.forEach(([, content]) => {
    assert.equal((content.match(/<h2\b/g) || []).length, 1)
    assert.equal((content.match(/<p\b/g) || []).length, 2)
  })
  assert.doesNotMatch(safetyHtml, /LinkedIn verified|identity verified|background checked|approved for safety/i)
})

test('keeps the essential safety guidance and honest limitation', () => {
  assert.match(safetyHtml, /Your profile is only shared for a specific introduction, and only after you agree\./)
  assert.match(safetyHtml, /Never send money or financial information to someone donna introduces you to\./)
  assert.match(safetyHtml, /You do not need to prove it was serious before reporting a concern\./)
  assert.match(safetyHtml, /cannot guarantee another person’s identity, intentions or behaviour/)
  assert.match(safetyHtml, /donna is not an emergency-response service\./)
})

test('category grid preserves readable card layouts across breakpoints', () => {
  assert.match(safetyCss, /\.safety-category-grid\s*{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(safetyCss, /grid-auto-rows:\s*1fr/)
  assert.match(safetyCss, /\.safety-category-card\s*{[\s\S]*min-height:\s*17rem/)
  assert.match(safetyCss, /scroll-margin-top:\s*5rem/)
  assert.match(safetyCss, /@media \(max-width: 900px\)/)
  assert.match(safetyCss, /@media \(max-width: 640px\)/)
  assert.match(safetyCss, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(safetyCss, /\.safety-category-grid\s*{\s*grid-template-columns:\s*1fr;/)
  assert.match(safetyCss, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(safetyCss, /scroll-behavior:\s*auto/)
})
