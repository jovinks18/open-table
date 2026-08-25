// End-to-end regression coverage for the mascot persistence fix (node
// identity across renders, transform continuity, one-shot speak animation,
// stale-timer safety on rapid navigation, reduced motion). Requires a real
// browser, so it's kept out of the default `npm test` chain and run
// separately via `npm run test:e2e:mascot`.
//
// One-time setup: `npm install` then `npx playwright install chromium`.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test from 'node:test'

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.log('SKIP: playwright is not installed — run `npm install` then `npx playwright install chromium`.')
  process.exit(0)
}

const PORT = 5184
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

async function choose(page, labelText) {
  await page.click(`.application-exchange-input .application-choice:has-text("${labelText}")`)
  await page.waitForTimeout(900)
}

// Tags the current mascot wrapper/image nodes with a random id in a data-
// attribute we control (not something the app ever reads), so identity can
// be checked across renders purely by re-reading that tag.
async function tagMascotNodes(page) {
  return page.evaluate(() => {
    const wrapper = document.querySelector('.application-conversation-mascot-col')
    const img = document.querySelector('.application-mascot')
    const tag = Math.random().toString(36).slice(2)
    wrapper.dataset.testTag = tag
    img.dataset.testTag = tag
    return tag
  })
}

async function readMascotTags(page) {
  return page.evaluate(() => ({
    wrapper: document.querySelector('.application-conversation-mascot-col')?.dataset.testTag ?? null,
    img: document.querySelector('.application-mascot')?.dataset.testTag ?? null,
  }))
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

async function newConversationPage(context) {
  const page = await context.newPage()
  await page.goto(`${BASE_URL}/apply.html`)
  await page.click('text=Begin application')
  await page.waitForSelector('.application-message-donna p')
  return page
}

test('the mascot wrapper and image keep the same node identity across at least four question transitions, at 1280px and 375px', async () => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
    const context = await browser.newContext({ viewport })
    const page = await newConversationPage(context)

    const tag = await tagMascotNodes(page)
    let seen = await readMascotTags(page)
    assert.deepEqual(seen, { wrapper: tag, img: tag }, `tag lost immediately after tagging at ${viewport.width}px`)

    await page.fill('#application-fullName', 'Jordan Smith')
    await page.click('button:has-text("Continue")')
    await page.waitForTimeout(1300) // name-acknowledgement message
    seen = await readMascotTags(page)
    assert.deepEqual(seen, { wrapper: tag, img: tag }, `identity lost after question 1 at ${viewport.width}px`)

    await page.fill('#application-sharedFirstName', 'Jordan')
    await page.click('button:has-text("Continue")')
    await page.waitForTimeout(900)
    seen = await readMascotTags(page)
    assert.deepEqual(seen, { wrapper: tag, img: tag }, `identity lost after question 2 at ${viewport.width}px`)

    await page.fill('#application-dateOfBirth', '1995-05-05')
    await page.click('button:has-text("Continue")')
    await page.waitForTimeout(900)
    seen = await readMascotTags(page)
    assert.deepEqual(seen, { wrapper: tag, img: tag }, `identity lost after question 3 at ${viewport.width}px`)

    await choose(page, 'Woman')
    seen = await readMascotTags(page)
    assert.deepEqual(seen, { wrapper: tag, img: tag }, `identity lost after question 4 at ${viewport.width}px`)

    await context.close()
  }
})

test('the wrapper transform changes on the same node, and the transition is active in normal-motion mode', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await newConversationPage(context)

  const transitionBefore = await page.$eval('.application-conversation-mascot-col', (el) => getComputedStyle(el).transitionProperty)
  assert.match(transitionBefore, /transform/)

  const transformBefore = await page.$eval('.application-conversation-mascot-col', (el) => getComputedStyle(el).transform)
  await page.fill('#application-fullName', 'Jordan Smith')
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(1300)
  await page.fill('#application-sharedFirstName', 'Jordan')
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(900)

  const afterTag = await tagMascotNodes(page)
  const transformAfter = await page.$eval('.application-conversation-mascot-col', (el) => getComputedStyle(el).transform)
  assert.notEqual(transformAfter, transformBefore, 'transform did not change as the conversation advanced')
  const stillSameNode = await readMascotTags(page)
  assert.equal(stillSameNode.wrapper, afterTag, 'transform changed on a different node than the one tagged')

  await context.close()
})

test('is-speaking is applied once per new donna message and removed once its animation finishes', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await newConversationPage(context)

  // fullName -> the one-time name-acknowledgement -> sharedFirstName is a
  // fast back-to-back double reveal with no settle window in between;
  // sharedFirstName -> dateOfBirth is a single, isolated reveal, so it's
  // used here to observe one clean speak -> listen cycle.
  await page.fill('#application-fullName', 'Jordan Smith')
  await page.click('button:has-text("Continue")')
  await page.waitForSelector('#application-sharedFirstName')
  await page.fill('#application-sharedFirstName', 'Jordan')
  await page.click('button:has-text("Continue")')

  // dateOfBirth's input appears the instant is-speaking begins (settling
  // and rendering the input happen in the same tick).
  await page.waitForSelector('#application-dateOfBirth')
  const duringSpeak = await page.$eval('.application-mascot', (el) => el.className)
  assert.match(duringSpeak, /\bis-speaking\b/)

  await page.waitForTimeout(500) // well past the 350ms animation
  const afterSpeak = await page.$eval('.application-mascot', (el) => el.className)
  assert.doesNotMatch(afterSpeak, /\bis-speaking\b/)
  assert.match(afterSpeak, /\bis-listening\b/)

  await context.close()
})

test('rapid Back/Forward navigation leaves no stale is-speaking class and settles at a correct, sane position', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await newConversationPage(context)

  await page.fill('#application-fullName', 'Jordan Smith')
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(1300)
  await page.fill('#application-sharedFirstName', 'Jordan')
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(900)
  await page.fill('#application-dateOfBirth', '1995-05-05')

  // Fire Continue then immediately hammer Back/Forward before the reveal
  // sequence's timers (typing delay, speak, settle) would naturally fire.
  await page.click('button:has-text("Continue")')
  await page.click('button:has-text("Back")')
  await page.click('button:has-text("Forward")')
  await page.click('button:has-text("Back")')
  await page.click('button:has-text("Forward")')

  await page.waitForTimeout(2500) // let everything that's going to fire, fire

  const finalClass = await page.$eval('.application-mascot', (el) => el.className)
  assert.doesNotMatch(finalClass, /\bis-speaking\b/, 'a stale timer left is-speaking applied after rapid navigation')

  const transform = await page.$eval('.application-conversation-mascot-col', (el) => getComputedStyle(el).transform)
  const openId = await page.evaluate(() => {
    const openInput = document.querySelector('.application-exchange-input')
    return openInput?.closest('.application-exchange')?.id ?? null
  })
  assert.ok(openId, 'expected some exchange to be open after settling')
  const expectedTop = await page.evaluate((id) => document.getElementById(id).offsetTop, openId)
  const matrix = transform.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*([\-\d.]+)\)/)
  const currentOffset = matrix ? Number(matrix[1]) : 0
  assert.equal(currentOffset, expectedTop, 'mascot did not settle at the currently open exchange after rapid nav')

  await context.close()
})

test('reduced motion repositions immediately with no transition and no speaking animation', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  const page = await newConversationPage(context)

  // transitionProperty: 'none' is the meaningful signal — no property is
  // eligible to transition at all, regardless of how the browser serializes
  // the (irrelevant, since nothing transitions) duration for `transition: none`.
  const transitionProperty = await page.$eval('.application-conversation-mascot-col', (el) => getComputedStyle(el).transitionProperty)
  assert.equal(transitionProperty, 'none')

  const t0 = Date.now()
  await page.fill('#application-fullName', 'Jordan Smith')
  await page.click('button:has-text("Continue")')
  await page.waitForSelector('#application-sharedFirstName')
  assert.ok(Date.now() - t0 < 300, 'reduced motion should reveal the next question without the normal-motion delay')

  const mascotClass = await page.$eval('.application-mascot', (el) => el.className)
  assert.doesNotMatch(mascotClass, /\bis-speaking\b/)

  await context.close()
})
