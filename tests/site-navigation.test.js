import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const navigation = readFileSync(new URL('../src/marketing/shared/site-navigation.js', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/marketing/shared/base.css', import.meta.url), 'utf8')
const responsive = readFileSync(new URL('../src/marketing/shared/responsive.css', import.meta.url), 'utf8')

test('marketing routes mount one shared navigation component and the journey does not', () => {
  for (const page of ['index.html', 'faq.html', 'safety.html', 'our-story.html']) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8')
    assert.match(html, /data-site-navigation/)
  }
  const journey = readFileSync(new URL('../apply.html', import.meta.url), 'utf8')
  assert.doesNotMatch(journey, /data-site-navigation|src\/marketing\/shared\/index\.js|src\/marketing\/styles\.css/)
})

test('desktop navigation centres the wordmark and links directly to FAQ', () => {
  assert.match(navigation, /Our story[\s\S]*How it works[\s\S]*nav-wordmark[\s\S]*href="\/faq\.html"[\s\S]*FAQ[\s\S]*Safety/)
  assert.doesNotMatch(navigation, /questions-(?:menu|trigger|dropdown)|Common questions|aria-haspopup/)
  assert.match(styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) auto repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(styles, /\.desktop-nav > a:not\(\.nav-wordmark\)\[aria-current='page'\][\s\S]*?border-bottom: 1px solid var\(--terracotta\)/)
})

test('apply appears only after the homepage hero and motion can be disabled', () => {
  assert.match(navigation, /getBoundingClientRect\(\)\.bottom <= 0/)
  assert.match(styles, /\.header-cta[\s\S]*opacity: 0[\s\S]*\.site-header\.is-solid \.header-cta[\s\S]*opacity: 1/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
})

test('homepage navigation hides on downward scroll and returns on upward scroll', () => {
  assert.match(navigation, /scrollDelta > 4[\s\S]*add\('is-scroll-hidden'\)/)
  assert.match(navigation, /scrollDelta < -4[\s\S]*remove\('is-scroll-hidden'\)/)
  assert.match(navigation, /focusin[\s\S]*remove\('is-scroll-hidden'\)/)
  assert.match(styles, /\.site-header\.is-scroll-hidden[\s\S]*opacity: 0[\s\S]*transform: translateY\(-100%\)/)
})

test('mobile navigation is flat, full-height, closable and focus-trapped below 900px', () => {
  assert.match(responsive, /@media \(max-width: 899px\)/)
  assert.match(responsive, /\.mobile-menu[\s\S]*position: fixed[\s\S]*inset: 0/)
  assert.match(navigation, /mobile-menu__close[\s\S]*Our story[\s\S]*How it works[\s\S]*FAQ[\s\S]*Safety[\s\S]*Apply to join/)
  const mobileMenu = readFileSync(new URL('../src/marketing/shared/mobile-menu.js', import.meta.url), 'utf8')
  assert.match(mobileMenu, /menuFocusables[\s\S]*event\.key !== 'Tab'/)
  assert.match(mobileMenu, /function closeMenu[\s\S]*menuButton\.focus/)
  assert.match(mobileMenu, /event\.key === 'Escape'[\s\S]*closeMenu\(\)/)
})
