import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const logoPath = new URL('../public/images/donna-logo-transparent.png', import.meta.url)
const homeBackgroundPath = new URL('../public/images/donna-home-background.png', import.meta.url)
const journeyTemplate = readFileSync(new URL('../src/application/journey/template.html', import.meta.url), 'utf8')
const journeyMain = readFileSync(new URL('../src/application/journey/main.js', import.meta.url), 'utf8')
const navigation = readFileSync(new URL('../src/marketing/shared/site-navigation.js', import.meta.url), 'utf8')
test('the journey header uses the centred transparent donna wordmark', () => {
  assert.equal(existsSync(logoPath), true)
  assert.match(journeyMain, /<img class="brand" src="\/images\/donna-logo-transparent\.png" alt="donna">/)
  assert.doesNotMatch(journeyMain, /src="\/images\/donna-logo\.png"/)
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

test('the homepage retains its content, intro and live background', () => {
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/marketing/home/styles.css', import.meta.url), 'utf8')

  assert.match(home, /data-experience-title/)
  assert.doesNotMatch(home, /data-experience-counter/)
  assert.match(home, /We started making introductions for our friends\. Then their friends asked\./)
  assert.match(home, /Between Bangalore and Berkeley/)
  assert.match(home, /How donna works/)
  assert.equal(existsSync(homeBackgroundPath), true)
  assert.match(styles, /url\("\/images\/donna-home-background\.png"\)/)
  assert.match(styles, /linear-gradient\(180deg, rgb\(20 4 6 \/ 55%\), rgb\(20 4 6 \/ 75%\)\)/)
})

test('apply links enter the signup fork, then the onboarding brief', () => {
  assert.doesNotMatch(journeyTemplate, /<section class="screen" id="landing">/)
  assert.match(journeyTemplate, /<section class="screen grouped-screen" id="signup-choice" data-show-header>/)
  assert.match(journeyTemplate, /<section class="screen entry-screen" id="welcome" data-show-header>/)
  assert.match(journeyTemplate, /<h1>Before you start\.<\/h1>/)
  assert.match(journeyTemplate, /<button class="next-btn" type="button" data-next="ch1-intent">Start<\/button>/)
  assert.match(journeyTemplate, /<legend>What are you looking for\?<\/legend>/)
  assert.doesNotMatch(journeyTemplate, /Let's start with the obvious one/)
})

test('homepage offers applicant and friend entry links side by side', () => {
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.match(home, /class="hero-actions"[\s\S]*href="\/apply\.html\?for=me"[^>]*>Apply to join<\/a>[\s\S]*href="\/apply\.html\?for=friend"[^>]*>Introduce a friend<\/a>/)
})
