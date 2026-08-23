// End-to-end regression coverage for the phone-input fix (typing, pasting,
// replacing, Back/Forward retention). Requires a real browser, so it's kept
// out of the default `npm test` chain (which stays dependency-light and
// browser-free) and run separately via `npm run test:e2e`.
//
// One-time setup: `npm install` then `npx playwright install chromium`.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test from 'node:test'

import { isValidPhone } from '../src/application/validation.js'

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.log('SKIP: playwright is not installed — run `npm install` then `npx playwright install chromium`.')
  process.exit(0)
}

const PORT = 5183
const BASE_URL = `http://localhost:${PORT}`

function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const response = await fetch(url)
        if (response.ok) return resolve()
      } catch { /* not up yet */ }
      if (Date.now() > deadline) return reject(new Error(`Server at ${url} did not start in time`))
      setTimeout(attempt, 300)
    }
    attempt()
  })
}

async function fillAndContinue(page, selector, value) {
  await page.fill(selector, value)
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(900)
}

async function choose(page, labelText) {
  await page.click(`.application-exchange-input .application-choice:has-text("${labelText}")`)
  await page.waitForTimeout(900)
}

async function reachPhoneQuestion(page) {
  await page.goto(`${BASE_URL}/apply.html`)
  await page.click('text=Begin application')
  await page.waitForSelector('.application-message-donna p')
  await fillAndContinue(page, '#application-fullName', 'Jordan Smith')
  await page.waitForTimeout(1200) // name-acknowledgement message
  await fillAndContinue(page, '#application-sharedFirstName', 'Jordan')
  await fillAndContinue(page, '#application-dateOfBirth', '1995-05-05')
  await choose(page, 'Woman')
  await choose(page, 'Both')
  await page.click('.application-exchange-input input[role="combobox"]')
  await page.fill('.application-exchange-input input[role="combobox"]', 'Bangalore')
  await page.click('.application-combobox-option:has-text("Bangalore")')
  await page.waitForTimeout(900)
  await fillAndContinue(page, '#application-email', 'jordan@example.com')
  await page.waitForTimeout(500)
}

let serverProcess
let browser

test.before(async () => {
  serverProcess = spawn(
    new URL('../node_modules/.bin/vite', import.meta.url).pathname,
    ['--port', String(PORT), '--strictPort'],
    { stdio: 'ignore', detached: true },
  )
  await waitForServer(`${BASE_URL}/apply.html`)
  browser = await chromium.launch()
})

test.after(async () => {
  await browser?.close()
  if (serverProcess) {
    try { process.kill(-serverProcess.pid) } catch { /* already gone */ }
  }
})

test('typing a phone number character by character produces exactly that value', async () => {
  const page = await browser.newPage()
  await reachPhoneQuestion(page)
  await page.click('#application-phone')
  await page.keyboard.type('+91 98765 43210', { delay: 10 })
  const value = await page.$eval('#application-phone', (el) => el.value)
  assert.equal(value, '+91 98765 43210')
  await page.close()
})

test('pasting a number into the field sets it exactly once — no duplication (regression for the reported bug)', async () => {
  const page = await browser.newPage()
  await reachPhoneQuestion(page)
  await page.click('#application-phone')
  // insertText mirrors a native OS paste: it inserts at the current
  // selection rather than typing key-by-key.
  await page.keyboard.insertText('+91 98765 43210')
  const value = await page.$eval('#application-phone', (el) => el.value)
  assert.equal(value, '+91 98765 43210')
  assert.notEqual(value, '+91 98765 43210+91 98765 43210')
  await page.close()
})

test('focusing an existing number does not auto-select it — the cursor can edit individual digits', async () => {
  const page = await browser.newPage()
  await reachPhoneQuestion(page)
  await page.click('#application-phone')
  await page.keyboard.insertText('+91 98765 43210')
  await page.keyboard.press('Tab') // blur
  await page.click('#application-phone') // refocus
  const selection = await page.$eval('#application-phone', (el) => el.selectionStart === el.selectionEnd)
  assert.ok(selection, 'focus must leave the cursor collapsed, not select the whole value')
  // With nothing selected, typing a single digit at the cursor edits in
  // place rather than replacing the number.
  await page.keyboard.press('End')
  await page.keyboard.type('9')
  const value = await page.$eval('#application-phone', (el) => el.value)
  assert.equal(value, '+91 98765 432109')
  await page.close()
})

test('replacing a number requires an explicit select-all before typing or pasting the replacement', async () => {
  const page = await browser.newPage()
  await reachPhoneQuestion(page)
  await page.click('#application-phone')
  await page.keyboard.insertText('+91 98765 43210')

  // Explicit replacement: focus, select all, then enter the new number.
  await page.click('#application-phone')
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.insertText('+1 (415) 555-0136')
  const value = await page.$eval('#application-phone', (el) => el.value)
  assert.equal(value, '+1 (415) 555-0136') // only the replacement remains
  assert.equal(isValidPhone(value), true) // passes validation

  // Survives Back/Forward navigation (still mid-chapter, nothing submitted yet).
  await page.click('button:has-text("Back")')
  await page.waitForTimeout(400)
  const emailValue = await page.$eval('#application-email', (el) => el.value)
  assert.equal(emailValue, 'jordan@example.com')

  await page.click('button:has-text("Forward")')
  await page.waitForTimeout(400)
  const retained = await page.$eval('#application-phone', (el) => el.value)
  assert.equal(retained, '+1 (415) 555-0136')
  await page.close()
})

test('empty input shows a required error only after an invalid submission, not before', async () => {
  const page = await browser.newPage()
  await reachPhoneQuestion(page)
  const errorBefore = await page.$('.application-field-error')
  assert.equal(errorBefore, null)
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(500)
  const errorText = await page.$eval('.application-field-error', (el) => el.textContent)
  assert.match(errorText, /is required/)
  await page.close()
})

test('an invalid short number is rejected with the validation message', async () => {
  const page = await browser.newPage()
  await reachPhoneQuestion(page)
  await page.click('#application-phone')
  await page.keyboard.insertText('12345')
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(500)
  const errorText = await page.$eval('.application-field-error', (el) => el.textContent)
  assert.match(errorText, /valid phone number/)
  const stillOpen = await page.$('#application-phone')
  assert.ok(stillOpen, 'an invalid number must not advance to the next question')
  await page.close()
})

test('a valid phone number advances to the next question', async () => {
  const page = await browser.newPage()
  await reachPhoneQuestion(page)
  await page.click('#application-phone')
  await page.keyboard.insertText('+91 98765 43210')
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(900)
  const stillOnPhone = await page.$('#application-phone')
  assert.equal(stillOnPhone, null)
  await page.close()
})

test('Back and Forward navigation preserve the phone value', async () => {
  const page = await browser.newPage()
  await reachPhoneQuestion(page)
  await page.click('#application-phone')
  await page.keyboard.insertText('+91 98765 43210')

  await page.click('button:has-text("Back")')
  await page.waitForTimeout(500)
  const emailValue = await page.$eval('#application-email', (el) => el.value)
  assert.equal(emailValue, 'jordan@example.com')

  await page.click('button:has-text("Forward")')
  await page.waitForTimeout(500)
  const phoneValue = await page.$eval('#application-phone', (el) => el.value)
  assert.equal(phoneValue, '+91 98765 43210')
  await page.close()
})
