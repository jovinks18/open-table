import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const logoPath = new URL('../public/images/donna-logo-transparent.png', import.meta.url)
const homeBackgroundPath = new URL('../public/images/donna-home-background.png', import.meta.url)
const journeyBackgroundPath = new URL('../public/images/application/landing-background.png', import.meta.url)
const journeyTemplate = readFileSync(new URL('../src/application/journey/template.html', import.meta.url), 'utf8')
const pages = ['index.html', 'faq.html', 'safety.html', 'apply.html']

test('the supplied company logo is available to every public page', () => {
  assert.equal(existsSync(logoPath), true)

  pages.forEach((page) => {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8')
    const renderedSource = page === 'apply.html' ? `${html}\n${journeyTemplate}` : html
    assert.match(renderedSource, /src="\/images\/donna-logo-transparent\.png"/)
    assert.doesNotMatch(renderedSource, /src="\/images\/donna-logo\.png"/)
  })
})

test('marketing-page header and footer wordmarks use the supplied logo', () => {
  for (const page of ['index.html', 'faq.html', 'safety.html']) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8')
    const wordmarks = [...html.matchAll(/<a class="wordmark"[\s\S]*?<\/a>/g)]

    assert.equal(wordmarks.length, 2, `${page} should have header and footer wordmarks`)
    wordmarks.forEach(([markup]) => assert.match(markup, /donna-logo-transparent\.png/))
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

test('apply links enter the first onboarding question instead of its marketing landing screen', () => {
  assert.match(journeyTemplate, /<section class="screen" id="landing">/)
  assert.match(journeyTemplate, /<section class="screen active" id="signup-choice">/)
  assert.match(journeyTemplate, /Hi, I'm donna\. First things first — which brings you here today\?/)
})
