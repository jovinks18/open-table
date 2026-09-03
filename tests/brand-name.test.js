import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const lowercaseApplicationFiles = [
  '../apply.html',
  '../src/application/legacy/app.js',
  '../src/application/schema.js',
]

test('application and legacy copy retain the lowercase donna brand treatment', () => {
  lowercaseApplicationFiles.forEach((relativePath) => {
    const content = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
    assert.doesNotMatch(content, /\bDonna(?:’s|'s)?\b/, `${relativePath} contains a capitalized brand name`)
  })
})
