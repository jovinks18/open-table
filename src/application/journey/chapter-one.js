import { journeyStore } from './store.js'

export const APPLICANT_MINIMUM_AGE = 21
export const APPLICANT_MAXIMUM_AGE = 70

const REQUIRED_SINGLE_FIELDS = Object.freeze({
  'ch1-1': ['applicant.chapterOne.intent'],
  'ch1-2': ['applicant.gender', 'applicant.seeking'],
  'ch1-3': ['applicant.chapterOne.marriageTimeline'],
  'ch1-4': ['applicant.chapterOne.familySearchInvolvement'],
  'ch1-5': ['applicant.chapterOne.familyDecisionInfluence'],
  'ch1-6': ['applicant.chapterOne.meetingReadiness'],
})

function valueAtPath(target, path) {
  return path.split('.').reduce((value, part) => value?.[part], target)
}

export function normalizeIndianMobile(value) {
  let digits = String(value).replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits) ? digits : ''
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
}

export function datePartsFromValue(value, today = new Date()) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  const todayStart = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  if (date.getTime() > todayStart) return null
  return { day, month, year }
}

export function dateValueFromParts(parts) {
  if (!parts?.year || !parts?.month || !parts?.day) return ''
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

export function calculateAgeFromDateOfBirth(value, today = new Date()) {
  const parts = datePartsFromValue(value, today)
  if (!parts) return null
  let age = today.getFullYear() - parts.year
  if (today.getMonth() + 1 < parts.month || (today.getMonth() + 1 === parts.month && today.getDate() < parts.day)) age -= 1
  return age
}

function calendarDateYearsAgo(today, years) {
  const year = today.getFullYear() - years
  const month = today.getMonth()
  const day = Math.min(today.getDate(), new Date(year, month + 1, 0).getDate())
  return new Date(year, month, day)
}

function dateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function dateOfBirthBounds(today = new Date()) {
  const earliestDateOfBirth = calendarDateYearsAgo(today, APPLICANT_MAXIMUM_AGE + 1)
  earliestDateOfBirth.setDate(earliestDateOfBirth.getDate() + 1)
  return {
    min: dateInputValue(earliestDateOfBirth),
    max: dateInputValue(calendarDateYearsAgo(today, APPLICANT_MINIMUM_AGE)),
  }
}

export function validateApplicantDateOfBirth(value, today = new Date()) {
  const age = calculateAgeFromDateOfBirth(value, today)
  if (age === null) return { valid: false, message: 'Enter a valid date of birth.' }
  if (age < APPLICANT_MINIMUM_AGE) return { valid: false, message: 'You need to be 21 or older to apply.' }
  if (age > APPLICANT_MAXIMUM_AGE) return { valid: false, message: 'This pilot is for applicants up to 70.' }
  return { valid: true, message: '' }
}

function setPressed(button, pressed) {
  button.setAttribute('aria-pressed', String(pressed))
  button.classList.toggle('selected', pressed)
}

function syncContinue(screen) {
  const continueButton = screen.querySelector('[data-chapter-one-continue]')
  if (!continueButton || screen.id === 'ch1-7') return

  const state = journeyStore.getState()
  const requiredPaths = REQUIRED_SINGLE_FIELDS[screen.id] || []
  const complete = requiredPaths.length > 0 && requiredPaths.every((path) => Boolean(valueAtPath(state, path)))

  continueButton.disabled = !complete
}

function validateContact(screen) {
  const nameInput = screen.querySelector('#chapterOneName')
  const dateOfBirthInput = screen.querySelector('#chapterOneDateOfBirth')
  const phoneInput = screen.querySelector('#chapterOnePhone')
  const emailInput = screen.querySelector('#chapterOneEmail')
  const normalizedPhone = normalizeIndianMobile(phoneInput.value)
  const dateOfBirth = datePartsFromValue(dateOfBirthInput.value)
  const dateOfBirthValidation = validateApplicantDateOfBirth(dateOfBirthInput.value)
  const dateOfBirthError = screen.querySelector('#chapterOneDateOfBirthError')
  dateOfBirthError.textContent = dateOfBirthValidation.message
  const checks = [
    [nameInput, nameInput.value.trim().length >= 2],
    [dateOfBirthInput, dateOfBirthValidation.valid],
    [phoneInput, Boolean(normalizedPhone)],
    [emailInput, isValidEmail(emailInput.value)],
  ]

  checks.forEach(([input, valid]) => {
    input.classList.toggle('error', !valid)
    input.setAttribute('aria-invalid', String(!valid))
    const error = screen.querySelector(`#${input.getAttribute('aria-describedby')}`)
    error.hidden = valid
  })

  const firstInvalid = checks.find(([, valid]) => !valid)
  if (firstInvalid) {
    firstInvalid[0].focus()
    return false
  }

  journeyStore.setField('applicant.fullName', nameInput.value.trim())
  journeyStore.setField('applicant.dateOfBirth', dateOfBirth)
  journeyStore.setField('applicant.phone', normalizedPhone)
  journeyStore.setField('applicant.email', emailInput.value.trim())
  return true
}

function canAdvance(screen) {
  const state = journeyStore.getState()
  const requiredPaths = REQUIRED_SINGLE_FIELDS[screen.id] || []
  if (requiredPaths.length > 0) {
    return requiredPaths.every((path) => {
      const answer = valueAtPath(state, path)
      return Boolean(answer) && answer !== 'not_sure'
    })
  }
  if (screen.id === 'ch1-7') return validateContact(screen)
  return false
}

function restoreControls(screen) {
  const state = journeyStore.getState()
  screen.querySelectorAll('[data-single-field], [data-multi-field]').forEach((group) => {
    const path = group.dataset.singleField || group.dataset.multiField
    const value = valueAtPath(state, path)
    group.querySelectorAll('.chapter-one-option').forEach((button) => {
      const pressed = Array.isArray(value) ? value.includes(button.dataset.value) : value === button.dataset.value
      setPressed(button, pressed)
    })
  })

  const contactValues = [
    ['chapterOneName', state.applicant.fullName],
    ['chapterOneDateOfBirth', dateValueFromParts(state.applicant.dateOfBirth)],
    ['chapterOnePhone', state.applicant.phone],
    ['chapterOneEmail', state.applicant.email],
  ]
  contactValues.forEach(([id, value]) => {
    const input = screen.querySelector(`#${id}`)
    if (input) input.value = value
  })
  syncContinue(screen)
}

export function initChapterOne(goTo, screen = document) {
  const dateOfBirthInput = screen.querySelector('#chapterOneDateOfBirth')
  if (dateOfBirthInput) {
    const bounds = dateOfBirthBounds()
    dateOfBirthInput.min = bounds.min
    dateOfBirthInput.max = bounds.max
  }

  screen.querySelectorAll('[data-single-field]').forEach((group) => {
    group.addEventListener('click', (event) => {
      const button = event.target.closest('.chapter-one-option')
      if (!button) return
      group.querySelectorAll('.chapter-one-option').forEach((option) => setPressed(option, option === button))
      journeyStore.setField(group.dataset.singleField, button.dataset.value)
      syncContinue(group.closest('.screen'))
      if (group.dataset.singleField === 'applicant.chapterOne.intent' && button.dataset.value === 'not_sure') {
        goTo('chapter-one-exit')
      }
    })
  })

  screen.querySelectorAll('[data-multi-field]').forEach((group) => {
    group.addEventListener('click', (event) => {
      const button = event.target.closest('.chapter-one-option')
      if (!button) return
      const selected = new Set(valueAtPath(journeyStore.getState(), group.dataset.multiField))
      if (selected.has(button.dataset.value)) selected.delete(button.dataset.value)
      else selected.add(button.dataset.value)
      journeyStore.setField(group.dataset.multiField, [...selected])
      setPressed(button, selected.has(button.dataset.value))
      syncContinue(group.closest('.screen'))
    })
  })

  const contactFields = [
    ['chapterOneName', 'applicant.fullName'],
    ['chapterOneDateOfBirth', 'applicant.dateOfBirth', datePartsFromValue],
    ['chapterOnePhone', 'applicant.phone'],
    ['chapterOneEmail', 'applicant.email'],
  ]
  contactFields.forEach(([id, path, transform]) => {
    const input = screen.querySelector(`#${id}`)
    if (!input) return
    input.addEventListener('input', () => {
      const value = transform
        ? transform(input.value) || { day: '', month: '', year: '' }
        : input.value
      journeyStore.setField(path, value)
      input.classList.remove('error')
      input.setAttribute('aria-invalid', 'false')
      const error = screen.querySelector(`#${input.getAttribute('aria-describedby')}`)
      if (error) error.hidden = true
    })
  })

  screen.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => goTo(button.dataset.back))
  })
  screen.querySelectorAll('[data-chapter-one-continue]').forEach((button) => {
    button.addEventListener('click', () => {
      const screen = button.closest('.screen')
      if (canAdvance(screen)) goTo(button.dataset.next)
    })
  })

  restoreControls(screen)
}
