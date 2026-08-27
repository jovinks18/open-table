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
  assert.match(sourceWithoutEmbeddedAssets, /<section class="screen active" id="welcome"/)
  assert.match(sourceWithoutEmbeddedAssets, /<section class="screen chapter-one-screen" id="ch1-1"/)
})

test('entry screen uses the verbatim six-chapter brief and one Start action', () => {
  const start = journeyTemplate.indexOf('<section class="screen active" id="welcome">')
  const entry = journeyTemplate.slice(start, journeyTemplate.indexOf('</section>', start))
  assert.match(entry, /<h1 class="headline">Before you start\.<\/h1>/)
  for (const copy of [
    'Six chapters. About fifteen minutes.',
    "Some of the questions are blunt. That's on purpose — it's how we avoid wasting your evening on someone who was never going to work.",
    "You'll get one introduction at a time. You'll meet in a public place before anyone has a phone number. Afterwards you both write down how it went.",
    'Not everyone who applies gets an introduction.',
  ]) assert.ok(entry.includes(`<p class="sub">${copy}</p>`))
  assert.equal((entry.match(/<button/g) || []).length, 1)
  assert.match(entry, /<button class="next-btn" onclick="goTo\('ch1-1'\)">Start<\/button>/)
  assert.doesNotMatch(entry, /donna-icon|progress-wrap|chapter-numeral|eyebrow/)
  assert.match(journeyStore, /currentScreen: 'welcome'/)
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

test('chapter progress renders only the current Roman numeral and age preference uses accessible anchored steppers', () => {
  assert.match(sourceWithoutEmbeddedAssets, /const CHAPTERS = Object\.freeze\(\['I', 'II', 'III', 'IV', 'V', 'VI'\]\)/)
  assert.match(sourceWithoutEmbeddedAssets, /className = 'chapter-numeral'/)
  assert.match(sourceWithoutEmbeddedAssets, /textContent = CHAPTERS\[currentChapter - 1\]/)
  assert.match(sourceWithoutEmbeddedAssets, /aria-current', 'step'/)
  assert.doesNotMatch(sourceWithoutEmbeddedAssets, /chapter-sequence|is-complete|is-upcoming|CHAPTERS\.forEach/)
  assert.match(sourceWithoutEmbeddedAssets, /transition:opacity 180ms ease-out/)
  assert.match(sourceWithoutEmbeddedAssets, /currentChapter !== targetChapter/)
  assert.match(sourceWithoutEmbeddedAssets, /\.topbar\{ display:flex; justify-content:center;/)
  assert.doesNotMatch(journeyTemplate, /chapter-label|chapter-count|substep-dots/)
  assert.match(sourceWithoutEmbeddedAssets, /id="agePreferenceAnchor" hidden>You’re <span id="applicantAge">31<\/span>\. How far either side\?/)
  for (const label of ['Fewer years younger', 'More years younger', 'Fewer years older', 'More years older']) {
    assert.match(sourceWithoutEmbeddedAssets, new RegExp(`aria-label="${label}"`))
  }
  assert.match(sourceWithoutEmbeddedAssets, /id="ageRangeOutput" aria-live="polite"/)
  assert.match(sourceWithoutEmbeddedAssets, /let younger = 3;/)
  assert.match(sourceWithoutEmbeddedAssets, /let older = 7;/)
  assert.match(sourceWithoutEmbeddedAssets, /Math\.max\(22,age - younger\)/)
  assert.match(sourceWithoutEmbeddedAssets, /journeyStore\.setField\('applicant\.preferredAge\.minimum',minimum\)/)
  assert.match(sourceWithoutEmbeddedAssets, /journeyStore\.setField\('applicant\.preferredAge\.maximum',maximum\)/)
  assert.match(sourceWithoutEmbeddedAssets, /'Minimum age' : 'Maximum age'|anchored \? 'Younger by' : 'Minimum age'/)
  assert.match(sourceWithoutEmbeddedAssets, /\.age-stepper button\{ min-width:44px; min-height:44px;/)
  assert.match(sourceWithoutEmbeddedAssets, /\.age-preference__steppers\{ display:flex; align-items:flex-start; justify-content:flex-start; gap:18px; \}/)
  assert.match(sourceWithoutEmbeddedAssets, /\.age-stepper-group\{[^}]*flex:0 0 130px; width:130px;/)
  assert.match(sourceWithoutEmbeddedAssets, /\.age-stepper\{ display:grid; width:130px; grid-template-columns:44px 40px 44px;/)
  assert.doesNotMatch(sourceWithoutEmbeddedAssets, /@media \(max-width:374px\)/)
  assert.doesNotMatch(sourceWithoutEmbeddedAssets, /type="range"|age-range__track|age-range__fill|slider-thumb|ageMinOutput|ageMaxOutput/)
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
