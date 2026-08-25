import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const homeHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const introScript = readFileSync(new URL('../src/scripts/modules/experience-intro.js', import.meta.url), 'utf8')
const introCss = readFileSync(new URL('../src/styles/components/experience-intro.css', import.meta.url), 'utf8')

test('homepage includes a skippable city-image experience intro', () => {
  assert.match(homeHtml, /data-experience-intro/)
  assert.match(homeHtml, /data-experience-skip>Skip intro<\/button>/)
  assert.match(homeHtml, /data-experience-title/)
  assert.match(homeHtml, /<h2 aria-label="donna">donna<\/h2>/)
  assert.doesNotMatch(homeHtml, /data-experience-counter/)
  assert.doesNotMatch(introScript, /counterState|data-experience-counter/)
  assert.doesNotMatch(homeHtml, /Every good introduction has three people in it\./)
  assert.match(introScript, /clipPath: 'polygon\(0% 0%, 100% 0%, 100% 0%, 0% 0%\)'/)
  assert.match(introScript, /stagger: -0\.075/)

  const imagePaths = [...homeHtml.matchAll(/data-src="(\/images\/intro\/[^"]+)"/g)]
    .map(([, imagePath]) => imagePath)

  assert.equal(imagePaths.length, 8)
  imagePaths.forEach((imagePath) => {
    assert.equal(existsSync(new URL(`../public${imagePath}`, import.meta.url)), true, `${imagePath} is missing`)
  })
})

test('intro is session-aware, accessible and safe for reduced motion', () => {
  assert.match(homeHtml, /sessionStorage\.getItem\('donnaExperienceSeen'\)/)
  assert.match(homeHtml, /get\('intro'\) === '1'/)
  assert.match(introScript, /sessionStorage\.setItem\(EXPERIENCE_STORAGE_KEY, '1'\)/)
  assert.match(introScript, /setAttribute\('inert', ''\)/)
  assert.match(introScript, /removeAttribute\('inert'\)/)
  assert.match(introScript, /prefers-reduced-motion: reduce/)
  assert.match(introCss, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(introCss, /\.experience-intro__image:nth-child\(n \+ 5\)/)
  assert.match(introCss, /clip-path: polygon\(20% 20%, 80% 20%, 80% 80%, 20% 80%\)/)
})
