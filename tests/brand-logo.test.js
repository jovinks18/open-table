import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const homeBackgroundPath = new URL('../public/images/donna-home-background.png', import.meta.url)
const siteIconPath = new URL('../public/images/donna-icon.png', import.meta.url)
const journeyTemplate = readFileSync(new URL('../src/application/journey/template.html', import.meta.url), 'utf8')
const journeyMain = readFileSync(new URL('../src/application/journey/main.js', import.meta.url), 'utf8')
const journeyStyles = readFileSync(new URL('../src/application/journey/styles.css', import.meta.url), 'utf8')
const navigation = readFileSync(new URL('../src/marketing/shared/site-navigation.js', import.meta.url), 'utf8')
const marketingTokens = readFileSync(new URL('../src/marketing/shared/tokens.css', import.meta.url), 'utf8')
test('the journey header uses the centred bold lowercase donna wordmark', () => {
  assert.match(journeyMain, /<a class="brand" href="\/index\.html" aria-label="donna home">donna<\/a>/)
  assert.match(journeyStyles, /\.brand\{[^}]*text-decoration:none[^}]*\}/)
  assert.doesNotMatch(journeyMain, /donna-logo(?:-transparent)?\.png/)
})

test('marketing-page header and footer wordmarks reuse the journey wordmark', () => {
  assert.match(navigation, /class="nav-wordmark"[\s\S]*?<span class="donna-wordmark"[^>]*>donna<\/span>/)
  assert.match(navigation, /class="mobile-wordmark"[\s\S]*?<span class="donna-wordmark"[^>]*>donna<\/span>/)
  assert.doesNotMatch(navigation, /donna-logo(?:-transparent)?\.png/)
  for (const page of ['index.html', 'faq.html', 'safety.html']) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8')
    const wordmarks = [...html.matchAll(/<a class="wordmark"[\s\S]*?<\/a>/g)]

    assert.equal(wordmarks.length, 1, `${page} should keep its footer wordmark`)
    wordmarks.forEach(([markup]) => assert.match(markup, /<span class="donna-wordmark"[^>]*>donna<\/span>/))
  }
})

test('every entry point uses the cleaned Donna site icon', () => {
  assert.equal(existsSync(siteIconPath), true)
  for (const page of ['index.html', 'faq.html', 'safety.html', 'our-story.html', 'apply.html']) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8')
    assert.match(html, /<title>donna<\/title>/)
    assert.match(html, /<link rel="icon" type="image\/png" sizes="512x512" href="\/images\/donna-icon\.png"\s*\/?>/)
    assert.match(html, /<link rel="apple-touch-icon" href="\/images\/donna-icon\.png"\s*\/?>/)
  }
})

test('interface typography and large journey prompts use Switzer', () => {
  assert.match(marketingTokens, /--sans: "Switzer", "Helvetica Neue", Helvetica, Arial, sans-serif/)
  assert.match(marketingTokens, /--serif: "Cormorant"/)
  assert.match(journeyStyles, /--sans:'Switzer','Helvetica Neue',Helvetica,Arial,sans-serif/)
  assert.match(journeyStyles, /--prompt:var\(--sans\)/)
  assert.match(journeyStyles, /--serif:'Cormorant'/)
  for (const page of ['index.html', 'faq.html', 'safety.html', 'our-story.html', 'apply.html']) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8')
    assert.match(html, /api\.fontshare\.com\/v2\/css\?f\[\]=switzer@400,500,600,700/, `${page} should load Switzer`)
  }
  assert.match(journeyStyles, /\.bubble h1\{font:500 clamp\(24px,2\.4vw,30px\)\/1\.12 var\(--prompt\)/)
})

test('the homepage retains its content, intro and live background', () => {
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/marketing/home/styles.css', import.meta.url), 'utf8')

  assert.match(home, /data-experience-title/)
  assert.doesNotMatch(home, /data-experience-counter/)
  assert.match(home, /We started making introductions for our friends\. Then their friends asked\./)
  assert.match(home, /<p class="hero-supporting-line" id="hero-supporting-line">One introduction at a time, chosen by someone who has paid attention\.<\/p>/)
  assert.match(home, /family=Cormorant\+Garamond:ital,wght@0,400;1,500/)
  assert.doesNotMatch(home, /family=Coming\+Soon/)
  assert.doesNotMatch(home, /family=Beth\+Ellen/)
  assert.match(home, /family=Instrument\+Sans:wght@400;600/)
  assert.doesNotMatch(home, /family=Parisienne/)
  assert.doesNotMatch(home, /fonts\.cdnfonts\.com\/css\/erratic-cursive/)
  assert.match(styles, /\.hero h1 \{[\s\S]*?font-family: "Cormorant Garamond"[\s\S]*?font-style: normal;[\s\S]*?font-weight: 400;/)
  assert.doesNotMatch(home, /Why donna exists|id="why-title"|class="why-donna"/)
  assert.doesNotMatch(home, /<strong>One introduction at a time/)
  assert.doesNotMatch(home, /Some introductions became relationships/)
  assert.match(home, /How donna works/)
  assert.match(home, /<section class="card-story"[\s\S]*<section class="final-cta"/)
  assert.doesNotMatch(home, /class="home-trust|The essentials|What stays private|Read our safety approach/)
  assert.doesNotMatch(styles, /\.home-trust/)
  assert.equal(existsSync(homeBackgroundPath), true)
  assert.match(styles, /url\("\/images\/donna-home-background\.png"\)/)
  assert.match(styles, /linear-gradient\(180deg, rgb\(20 4 6 \/ 20%\), rgb\(20 4 6 \/ 35%\)\)/)
})

test('apply links enter the applicant onboarding brief directly', () => {
  assert.doesNotMatch(journeyTemplate, /<section class="screen" id="landing">/)
  assert.doesNotMatch(journeyTemplate, /id="signup-choice"|Which brings you here\?/)
  assert.match(journeyTemplate, /<section class="screen entry-screen" id="welcome">/)
  assert.match(journeyTemplate, /<h1>Before we begin<\/h1>/)
  assert.match(journeyTemplate, /<button class="next-btn" type="button" data-next="ch1-intent">Start<\/button>/)
  assert.match(journeyTemplate, /<legend>What are you looking for\?<\/legend>/)
  assert.doesNotMatch(journeyTemplate, /Let's start with the obvious one/)
})

test('homepage offers applicant and friend entry links side by side', () => {
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.match(home, /class="hero-actions"[\s\S]*href="\/apply\.html\?for=me"[^>]*>Apply to join<\/a>[\s\S]*href="\/apply\.html\?for=friend"[^>]*>Introduce a friend<\/a>/)
})
