import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const applyHtml = readFileSync(new URL('../apply.html', import.meta.url), 'utf8')
const journeyTemplate = readFileSync(new URL('../src/application/journey/template.html', import.meta.url), 'utf8')
const journeyStyles = readFileSync(new URL('../src/application/journey/styles.css', import.meta.url), 'utf8')
const journeyController = readFileSync(new URL('../src/application/journey/controller.js', import.meta.url), 'utf8')
const journeyMain = readFileSync(new URL('../src/application/journey/main.js', import.meta.url), 'utf8')
const journeyStore = readFileSync(new URL('../src/application/journey/store.js', import.meta.url), 'utf8')
const journeyApi = readFileSync(new URL('../src/application/journey/api.js', import.meta.url), 'utf8')
const journeyFields = readFileSync(new URL('../src/application/journey/fields.js', import.meta.url), 'utf8')
const chapterOneController = readFileSync(new URL('../src/application/journey/chapter-one.js', import.meta.url), 'utf8')
const sourceWithoutEmbeddedAssets = [applyHtml, journeyTemplate, journeyStyles, journeyController].join('\n')

const expectedScreens = [
  'landing',
  'ch1-1',
  'friend-verification',
  'welcome',
  'ch1-2',
  'ch1-3',
  'ch1-4',
  'ch1-5',
  'ch1-6',
  'chapter-one-exit',
  'ch2',
  'ch3-1',
  'ch3-2',
  'ch4-1',
  'ch4-2',
  'ch5-1',
  'ch5-2',
  'ch6',
  'ch7-1',
  'ch7-2',
  'ch7-3',
  'ch7-4',
  'ch7-5',
  'ch7-6',
  'ch7-friend-prompt',
  'final',
  'donna-pivot',
  'write-note',
  'seal-send',
  'nominee-consent',
  'introduction',
  'limited-chat',
  'scheduling',
  'invitations',
  'tree',
  'full-circle-reveal',
]

test('apply route contains the rebuilt Chapter I and the remaining journey', () => {
  const screenMatches = [...sourceWithoutEmbeddedAssets.matchAll(
    /<section class="[^"]*\bscreen\b[^"]*" id="([^"]+)"/g,
  )]
  assert.deepEqual(screenMatches.map(([, id]) => id), expectedScreens)
  assert.match(sourceWithoutEmbeddedAssets, /<section class="screen active chapter-one-screen" id="ch1-1"/)
})

test('every scripted screen destination exists', () => {
  const destinations = new Set(
    [...sourceWithoutEmbeddedAssets.matchAll(/goTo\('([^']+)'\)/g)].map(([, id]) => id),
  )
  const screenIds = new Set(expectedScreens)
  assert.deepEqual([...destinations].filter((id) => !screenIds.has(id) && id !== 'signup-choice'), [])
})

test('the replacement uses the homepage type families and extracted media assets', () => {
  assert.match(sourceWithoutEmbeddedAssets, /family=Instrument\+Sans:/)
  assert.match(sourceWithoutEmbeddedAssets, /--serif:'Iowan Old Style'/)
  assert.match(sourceWithoutEmbeddedAssets, /\.bubble p\{ font-family:var\(--sans\); font-style:normal;/)
  assert.doesNotMatch(sourceWithoutEmbeddedAssets, /Cormorant|family=Inter:/)
  assert.match(sourceWithoutEmbeddedAssets, /--rose:#F29985/)
  assert.match(sourceWithoutEmbeddedAssets, /--terracotta:#BF5349/)
  assert.match(sourceWithoutEmbeddedAssets, /\.donna-icon/)
  assert.doesNotMatch(sourceWithoutEmbeddedAssets, /data:(?:image|video)\/[^;]+;base64,/)
  for (const asset of [
    '../public/images/application/donna-mascot.png',
    '../public/images/application/cupid.png',
    '../public/images/application/landing-background.png',
    '../public/images/application/landing-badge.png',
    '../public/images/application/landing-closing.png',
    '../public/video/application/sealed-note.webm',
  ]) assert.equal(existsSync(new URL(asset, import.meta.url)), true, `${asset} is missing`)
})

test('chapter progress shows only the current Roman numeral and age preference uses an accessible range', () => {
  assert.match(sourceWithoutEmbeddedAssets, /const CHAPTERS = Object\.freeze\(\['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'\]\)/)
  assert.match(sourceWithoutEmbeddedAssets, /className = 'chapter-indicator'/)
  assert.match(sourceWithoutEmbeddedAssets, /setAttribute\('role', 'progressbar'\)/)
  assert.match(sourceWithoutEmbeddedAssets, /numeral\.textContent = CHAPTERS\[currentChapter - 1\]/)
  assert.doesNotMatch(sourceWithoutEmbeddedAssets, /CHAPTERS\.forEach|is-current|is-complete|is-upcoming/)
  assert.match(sourceWithoutEmbeddedAssets, /\.topbar\{ display:flex; justify-content:center;/)
  assert.doesNotMatch(journeyTemplate, /chapter-label|chapter-count|substep-dots/)
  assert.match(sourceWithoutEmbeddedAssets, /id="ageMin" type="range" min="25" max="60"/)
  assert.match(sourceWithoutEmbeddedAssets, /id="ageMax" type="range" min="25" max="60"/)
  assert.match(sourceWithoutEmbeddedAssets, /aria-label="Minimum preferred age"/)
  assert.match(sourceWithoutEmbeddedAssets, /aria-label="Maximum preferred age"/)
  assert.doesNotMatch(sourceWithoutEmbeddedAssets, /placeholder="Min age"|placeholder="Max age"/)
})

test('user-facing journey branding stays lowercase donna', () => {
  assert.doesNotMatch(sourceWithoutEmbeddedAssets, /\bDonna\b|\bDONNA\b/)
  assert.doesNotMatch(sourceWithoutEmbeddedAssets, /introduction society/i)
  assert.match(sourceWithoutEmbeddedAssets, /<title>donna — Full Journey<\/title>/)
})

test('the active journey remains a local prototype with no submission transport or persistence', () => {
  for (const forbidden of [
    'fetch(',
    'XMLHttpRequest',
    'sendBeacon',
    'localStorage',
    'sessionStorage',
    'indexedDB',
  ]) {
    assert.doesNotMatch([sourceWithoutEmbeddedAssets, journeyMain, journeyStore, journeyApi].join('\n'), new RegExp(forbidden.replace('(', '\\(')))
  }
})

test('apply.html is a small shell around a separately owned journey template', () => {
  assert.ok(applyHtml.split('\n').length < 30)
  assert.match(applyHtml, /id="journey-root"/)
  assert.match(applyHtml, /src="\/src\/application\/journey\/main\.js"/)
  assert.match(journeyMain, /template\.html\?raw/)
  assert.match(journeyMain, /await import\('\.\/controller\.js'\)/)
})

test('backend readiness uses versioned state, stable field paths, and an inactive adapter', () => {
  assert.match(journeyStore, /JOURNEY_STATE_VERSION = 1/)
  assert.match(journeyStore, /mode: 'preview'/)
  assert.match(journeyStore, /serialize:/)
  assert.match(journeyMain, /dataset\.field = path/)
  assert.match(chapterOneController, /applicant\.fullName/)
  assert.match(journeyFields, /applicant\.nonNegotiables/)
  assert.match(journeyApi, /configured: false/)
  assert.match(journeyApi, /saveDraft:/)
  assert.match(journeyApi, /submitApplication:/)
  assert.doesNotMatch(journeyApi, /fetch|XMLHttpRequest|localStorage|sessionStorage/)
})

test('the supplied dashboard screens include narrow-screen layout protection', () => {
  assert.match(sourceWithoutEmbeddedAssets, /@media \(max-width:760px\)/)
  assert.match(sourceWithoutEmbeddedAssets, /#scheduling \.dash-main > div\[style\*="grid-template-columns"\]/)
  assert.match(sourceWithoutEmbeddedAssets, /#invitations \.dash-card\[style\*="justify-content:space-between"\]/)
  assert.match(sourceWithoutEmbeddedAssets, /#tree \.dash-main > div\[style\*="justify-content:space-between"\]/)
})

test('every marketing-page application CTA still enters apply.html', () => {
  const navigation = readFileSync(new URL('../src/scripts/modules/site-navigation.js', import.meta.url), 'utf8')
  assert.match(navigation, /href="\/apply\.html"/)
  for (const page of ['index.html', 'faq.html', 'safety.html', 'our-story.html']) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8')
    assert.match(html, /data-site-navigation/, `${page} does not mount the shared navigation`)
  }
})
