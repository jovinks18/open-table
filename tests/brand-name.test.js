import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const brandCopyFiles = [
  '../index.html',
  '../safety.html',
  '../faq.html',
  '../apply.html',
  '../src/application/legacy/app.js',
  '../src/application/schema.js',
]

test('uses lowercase donna consistently in user-facing copy', () => {
  brandCopyFiles.forEach((relativePath) => {
    let content = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
    if (relativePath === '../index.html') {
      content = content
        .replace('Donna started with us introducing friends to people we thought they would genuinely like.', '')
        .replace('So Donna stays small and personal.', '')
        .replace('Tell Donna about yourself', '')
        .replace('Donna looks for the right fit', '')
        .replace('When Donna has an introduction', '')
        .replace('Donna makes the introduction', '')
    }
    assert.doesNotMatch(content, /\bDonna(?:’s|'s)?\b/, `${relativePath} contains a capitalized brand name`)
  })
})
