export const APPLICANT_MINIMUM_AGE = 21
export const APPLICANT_MAXIMUM_AGE = 70

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
  if (date.getTime() > Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) return null
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
  const earliest = calendarDateYearsAgo(today, APPLICANT_MAXIMUM_AGE + 1)
  earliest.setDate(earliest.getDate() + 1)
  return {
    min: dateInputValue(earliest),
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
