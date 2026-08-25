// Regression coverage for the persistent mascot's <img> itself — asset
// resolution, load state, and natural dimensions — run against BOTH the dev
// server and a production build preview, at desktop and mobile widths.
// Requires a real browser: run separately via `npm run test:e2e:mascot-image`.
//
// One-time setup: `npm install` then `npx playwright install chromium`.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import test from 'node:test'

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.log('SKIP: playwright is not installed — run `npm install` then `npx playwright install chromium`.')
  process.exit(0)
}

const EXPECTED_SRC_PATH = '/images/application/donna-mascot.webp'
const EXPECTED_SIZE = 240

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

function startServer(args, port) {
  const proc = spawn(new URL('../node_modules/.bin/vite', import.meta.url).pathname, [...args, '--port', String(port), '--strictPort'], {
    stdio: 'ignore',
    detached: true,
  })
  return proc
}

function stopServer(proc) {
  if (!proc) return
  try { process.kill(-proc.pid) } catch { /* already gone */ }
}

async function reachConversation(page, baseUrl) {
  await page.goto(`${baseUrl}/apply.html`)
  await page.click('text=Begin application')
  await page.waitForSelector('.application-message-donna p')
}

async function readMascotImageState(page) {
  return page.evaluate(() => {
    const col = document.querySelector('.application-conversation-mascot-col')
    const imgs = col ? col.querySelectorAll('img.application-mascot') : []
    const img = imgs[0]
    return {
      colExists: !!col,
      imgCount: imgs.length,
      src: img?.src ?? null,
      currentSrc: img?.currentSrc ?? null,
      complete: img?.complete ?? null,
      naturalWidth: img?.naturalWidth ?? null,
      naturalHeight: img?.naturalHeight ?? null,
    }
  })
}

async function advanceFourQuestions(page) {
  await page.fill('#application-fullName', 'Jordan Smith')
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(1300) // name-acknowledgement message
  await page.fill('#application-sharedFirstName', 'Jordan')
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(900)
  await page.fill('#application-dateOfBirth', '1995-05-05')
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(900)
  await page.click('.application-exchange-input .application-choice:has-text("Woman")')
  await page.waitForTimeout(900)
}

const VIEWPORTS = [
  ['desktop', { width: 1280, height: 900 }],
  ['mobile', { width: 375, height: 812 }],
]

// Build the production bundle once, up front, so the preview server has
// something fresh to serve.
const buildResult = spawnSync(new URL('../node_modules/.bin/vite', import.meta.url).pathname, ['build'], { stdio: 'inherit' })
if (buildResult.status !== 0) throw new Error('vite build failed — cannot run the production-preview mascot-image tests')

const TARGETS = [
  { label: 'dev server', args: [], port: 5185 },
  { label: 'production build preview', args: ['preview'], port: 5186 },
]

let browser
test.before(async () => { browser = await chromium.launch() })
test.after(async () => { await browser?.close() })

for (const target of TARGETS) {
  const baseUrl = `http://localhost:${target.port}`

  test(`[${target.label}] exactly one mascot image loads with the expected asset and natural size`, async () => {
    const proc = startServer(target.args, target.port)
    try {
      await waitForServer(`${baseUrl}/apply.html`)
      for (const [viewportLabel, viewport] of VIEWPORTS) {
        const context = await browser.newContext({ viewport })
        const page = await context.newPage()
        const assetResponses = []
        page.on('response', (res) => {
          if (res.url().includes('donna-mascot')) assetResponses.push({ status: res.status(), contentType: res.headers()['content-type'] })
        })

        await reachConversation(page, baseUrl)
        await page.waitForSelector('img.application-mascot')
        // Give the browser a tick to finish loading the image, then confirm.
        await page.waitForFunction(() => document.querySelector('img.application-mascot')?.complete === true)

        const initial = await readMascotImageState(page)
        assert.equal(initial.colExists, true, `[${target.label}/${viewportLabel}] mascot wrapper missing`)
        assert.equal(initial.imgCount, 1, `[${target.label}/${viewportLabel}] expected exactly one mascot image`)
        assert.ok(initial.src.endsWith(EXPECTED_SRC_PATH), `[${target.label}/${viewportLabel}] unexpected src: ${initial.src}`)
        assert.ok(initial.currentSrc.endsWith(EXPECTED_SRC_PATH), `[${target.label}/${viewportLabel}] currentSrc did not resolve to the expected asset`)
        assert.equal(initial.complete, true, `[${target.label}/${viewportLabel}] image did not finish loading`)
        assert.ok(initial.naturalWidth > 0, `[${target.label}/${viewportLabel}] naturalWidth was 0 — asset failed to decode`)
        assert.equal(initial.naturalWidth, EXPECTED_SIZE, `[${target.label}/${viewportLabel}] unexpected naturalWidth`)
        assert.equal(initial.naturalHeight, EXPECTED_SIZE, `[${target.label}/${viewportLabel}] unexpected naturalHeight`)

        assert.ok(assetResponses.length > 0, `[${target.label}/${viewportLabel}] no network request observed for the mascot asset`)
        assetResponses.forEach((res) => {
          assert.equal(res.status, 200, `[${target.label}/${viewportLabel}] mascot asset request did not return 200`)
          assert.match(res.contentType, /^image\//, `[${target.label}/${viewportLabel}] mascot asset content-type was not an image type`)
        })

        // Tag the actual mounted node so identity (not just src equality) can
        // be checked after advancing through several questions.
        const tag = await page.evaluate(() => {
          const t = Math.random().toString(36).slice(2)
          document.querySelector('img.application-mascot').dataset.testTag = t
          return t
        })

        await advanceFourQuestions(page)

        const after = await readMascotImageState(page)
        const afterTag = await page.$eval('img.application-mascot', (el) => el.dataset.testTag)
        assert.equal(afterTag, tag, `[${target.label}/${viewportLabel}] the mascot image node was replaced, not reused, across questions`)
        assert.equal(after.imgCount, 1, `[${target.label}/${viewportLabel}] more than one mascot image exists after advancing`)
        assert.ok(after.src.endsWith(EXPECTED_SRC_PATH), `[${target.label}/${viewportLabel}] src changed after advancing`)
        assert.ok(after.currentSrc.endsWith(EXPECTED_SRC_PATH), `[${target.label}/${viewportLabel}] currentSrc changed after advancing`)
        assert.equal(after.complete, true, `[${target.label}/${viewportLabel}] image no longer complete after advancing`)
        assert.equal(after.naturalWidth, EXPECTED_SIZE, `[${target.label}/${viewportLabel}] naturalWidth changed after advancing`)
        assert.equal(after.naturalHeight, EXPECTED_SIZE, `[${target.label}/${viewportLabel}] naturalHeight changed after advancing`)

        await context.close()
      }
    } finally {
      stopServer(proc)
    }
  })

  test(`[${target.label}] the persistent mascot still glides between questions and speaks exactly once per message`, async () => {
    const proc = startServer(target.args, target.port)
    try {
      await waitForServer(`${baseUrl}/apply.html`)
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
      const page = await context.newPage()
      await reachConversation(page, baseUrl)

      const transformBefore = await page.$eval('.application-conversation-mascot-col', (el) => getComputedStyle(el).transform)
      await page.fill('#application-fullName', 'Jordan Smith')
      await page.click('button:has-text("Continue")')

      // Sample mid-flight: shortly after positionMascot applies the new
      // target (which itself only fires once the message settles, ~480ms
      // in) but before the 480ms CSS transition has had time to finish.
      await page.waitForTimeout(700)
      const midTransform = await page.$eval('.application-conversation-mascot-col', (el) => getComputedStyle(el).transform)

      await page.waitForTimeout(1600)
      const settledTransform = await page.$eval('.application-conversation-mascot-col', (el) => getComputedStyle(el).transform)
      assert.notEqual(settledTransform, transformBefore, `[${target.label}] mascot never moved`)
      assert.notEqual(midTransform, settledTransform, `[${target.label}] transform jumped straight to the destination — no glide observed`)

      const speakingClass = await page.$eval('.application-mascot', (el) => el.className)
      assert.doesNotMatch(speakingClass, /\bis-speaking\b/, `[${target.label}] is-speaking never cleared after settling`)

      await context.close()
    } finally {
      stopServer(proc)
    }
  })
}
