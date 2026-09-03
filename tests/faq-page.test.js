import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const faqHtml = readFileSync(new URL('../faq.html', import.meta.url), 'utf8')
const faqCss = readFileSync(new URL('../src/marketing/faq/styles.css', import.meta.url), 'utf8')

const questions = [
  'What is Donna?',
  'Who can apply?',
  'How does an introduction work?',
  'What will the other person see about me?',
  'Do you consider family, religion, community or caste?',
  'How long might I wait?',
  'What does Donna cost?',
  'How is my information used?',
]

test('faq is a standalone page with eight questions', () => {
  assert.match(faqHtml, /<section class="faq-section" id="faq"/)
  assert.doesNotMatch(faqHtml, /<section class="safety-section"|id="safety"/)
  assert.equal((faqHtml.match(/<details class="faq-item">/g) || []).length, 8)
})

test('faq contains only the eight supplied questions in order', () => {
  const summaries = [...faqHtml.matchAll(/<summary><h2><span>([^<]+)<\/span>/g)].map((match) => match[1])
  assert.deepEqual(summaries, questions)
  assert.doesNotMatch(faqHtml, /Who is Donna, exactly\?|Who is this not for\?|How many introductions will I get\?|How do you check people are real\?/)
})

test('faq uses the restrained burgundy layout and accessible accordions', () => {
  assert.match(faqCss, /\.faq-page\s*\{[\s\S]*--graphite: #26080d/)
  assert.match(faqCss, /\.faq-layout\s*\{[\s\S]*width: min\(100%, 68rem\)/)
  assert.doesNotMatch(faqCss, /\.safety-items|\.safety-section/)
  assert.match(faqCss, /\.faq-item summary:focus-visible/)
  assert.match(faqCss, /@media \(prefers-reduced-motion: reduce\)/)
})

test('public copy does not describe Donna as a pilot', () => {
  const withoutContactAddress = faqHtml.replaceAll('thedonnapilot@gmail.com', '')
  assert.doesNotMatch(withoutContactAddress, /\bpilot(?:ing)?\b/i)
})
