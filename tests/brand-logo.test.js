import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const logoPath = new URL('../public/images/donna-logo-transparent.png', import.meta.url)
const homeBackgroundPath = new URL('../public/images/donna-home-background.png', import.meta.url)
const journeyBackgroundPath = new URL('../public/images/application/landing-background.png', import.meta.url)
const journeyTemplate = readFileSync(new URL('../src/application/journey/template.html', import.meta.url), 'utf8')
const navigation = readFileSync(new URL('../src/scripts/modules/site-navigation.js', import.meta.url), 'utf8')
test('the legacy image mark remains available to the application prototype', () => {
  assert.equal(existsSync(logoPath), true)
  assert.match(journeyTemplate, /src="\/images\/donna-logo-transparent\.png"/)
  assert.doesNotMatch(journeyTemplate, /src="\/images\/donna-logo\.png"/)
})

test('marketing-page header and footer wordmarks use the transition text treatment', () => {
  assert.match(navigation, /class="nav-wordmark"[\s\S]*?<span class="donna-wordmark"[^>]*>donna<\/span>/)
  assert.match(navigation, /class="mobile-wordmark"[\s\S]*?<span class="donna-wordmark"[^>]*>donna<\/span>/)
  assert.doesNotMatch(navigation, /donna-logo-transparent\.png/)
  for (const page of ['index.html', 'faq.html', 'safety.html']) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8')
    const wordmarks = [...html.matchAll(/<a class="wordmark"[\s\S]*?<\/a>/g)]

    assert.equal(wordmarks.length, 1, `${page} should keep its footer wordmark`)
    wordmarks.forEach(([markup]) => assert.match(markup, /<span class="donna-wordmark"[^>]*>donna<\/span>/))
  }
})

test('the homepage retains its content and intro while using the onboarding background', () => {
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/styles/pages/home.css', import.meta.url), 'utf8')

  assert.match(home, /data-experience-title/)
  assert.doesNotMatch(home, /data-experience-counter/)
  assert.match(home, /We started making introductions for our friends\. Then their friends asked\./)
  assert.match(home, /Between Bangalore and Berkeley/)
  assert.match(home, /How donna works/)
  assert.equal(existsSync(homeBackgroundPath), true)
  assert.equal(existsSync(journeyBackgroundPath), true)
  assert.deepEqual(readFileSync(homeBackgroundPath), readFileSync(journeyBackgroundPath))
  assert.match(styles, /url\("\/images\/donna-home-background\.png"\)/)
  assert.match(styles, /linear-gradient\(180deg, rgb\(20 4 6 \/ 55%\), rgb\(20 4 6 \/ 75%\)\)/)
})

test('apply links enter the onboarding brief instead of its marketing landing screen', () => {
  assert.match(journeyTemplate, /<section class="screen" id="landing">/)
  assert.match(journeyTemplate, /<section class="screen active" id="welcome">/)
  assert.match(journeyTemplate, /<h1 class="headline">Before you start\.<\/h1>/)
  assert.match(journeyTemplate, /<button class="next-btn" onclick="goTo\('ch1-1'\)">Start<\/button>/)
  assert.match(journeyTemplate, />What are you looking for\?<\/h1>/)
  assert.doesNotMatch(journeyTemplate, /Let's start with the obvious one/)
})
