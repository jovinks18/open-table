import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const brandCopyFiles = [
  '../index.html',
  '../safety.html',
  '../faq.html',
  '../apply.html',
  '../src/application/app.js',
  '../src/application/schema.js',
]

test('uses lowercase donna consistently in user-facing copy', () => {
  brandCopyFiles.forEach((relativePath) => {
    const content = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
    assert.doesNotMatch(content, /\bDonna(?:’s|'s)?\b/, `${relativePath} contains a capitalized brand name`)
  })
})
