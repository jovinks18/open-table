import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_SIZE_BYTES } from './schema.js'

export function sanitizeText(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
}

export function calculateAge(dateOfBirth, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth || '')) return null

  const [year, month, day] = dateOfBirth.split('-').map(Number)
  const birthDate = new Date(Date.UTC(year, month - 1, day))
  if (
    birthDate.getUTCFullYear() !== year
    || birthDate.getUTCMonth() !== month - 1
    || birthDate.getUTCDate() !== day
  ) return null

  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  const currentDay = today.getDate()
  let age = currentYear - year

  if (currentMonth < month || (currentMonth === month && currentDay < day)) age -= 1
  return age
}

export function isAtLeast25(dateOfBirth, today = new Date()) {
  const age = calculateAge(dateOfBirth, today)
  return age !== null && age >= 25
}

export function isValidEmail(value) {
  const email = sanitizeText(value)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPhone(value) {
  const phone = sanitizeText(value)
  if (!/^\+[\d\s()-]+$/.test(phone)) return false
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}

export function isValidLinkedInUrl(value) {
  try {
    const url = new URL(sanitizeText(value))
    const validHost = url.hostname === 'linkedin.com' || url.hostname === 'www.linkedin.com'
    return url.protocol === 'https:' && validHost && url.pathname.startsWith('/in/')
  } catch {
    return false
  }
}

export function validateAgeRange(minimum, maximum) {
  const min = Number(minimum)
  const max = Number(maximum)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 'Enter both a minimum and maximum age.'
  if (max < min) return 'Preferred maximum age cannot be lower than preferred minimum age.'
  return ''
}

export function validatePhoto(file) {
  if (!file) return ''
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) return 'Choose a JPEG, PNG or WebP image.'
  if (file.size > MAX_PHOTO_SIZE_BYTES) return 'Choose an image that is 10 MB or smaller.'
  return ''
}

function isEmpty(value) {
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'boolean') return !value
  return sanitizeText(value) === ''
}

export function validateField(field, value) {
  if (field.required && isEmpty(value)) {
    if (field.type === 'checkbox') return 'Confirm that you are at least 25 years old.'
    if (['radio', 'select', 'choice-with-other', 'checkbox-group-with-other'].includes(field.type)) {
      return `Choose an option for ${field.label.replace(/[?.]$/, '').toLowerCase()}.`
    }
    return `${field.label} is required.`
  }
  if (isEmpty(value)) return ''

  const text = sanitizeText(value)
  if (field.maxLength && text.length > field.maxLength) return `${field.label} must be ${field.maxLength} characters or fewer.`
  if (field.type === 'email' && !isValidEmail(text)) return 'Enter a valid email address.'
  if (field.type === 'tel' && !isValidPhone(text)) return 'Enter a valid phone number including country code.'
  if (field.name === 'linkedin_url' && !isValidLinkedInUrl(text)) return 'Enter a valid LinkedIn profile URL beginning with https://www.linkedin.com/in/.'

  if (field.type === 'number') {
    const number = Number(value)
    if (!Number.isFinite(number)) return `Enter a valid ${field.label.toLowerCase()}.`
    if (field.min !== undefined && number < field.min) return `${field.label} must be at least ${field.min}.`
    if (field.max !== undefined && number > field.max) return `${field.label} must be ${field.max} or lower.`
  }

  return ''
}
