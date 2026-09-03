import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_SIZE_BYTES } from './schema.js'

export const UNDER_25_MESSAGE = "donna is open to people 25 and over."

export function sanitizeText(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
}

export function calculateAge(dateOfBirth, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth || '')) return null
  const [year, month, day] = dateOfBirth.split('-').map(Number)
  const birthDate = new Date(Date.UTC(year, month - 1, day))
  if (birthDate.getUTCFullYear() !== year || birthDate.getUTCMonth() !== month - 1 || birthDate.getUTCDate() !== day) return null

  let age = today.getFullYear() - year
  const monthNow = today.getMonth() + 1
  if (monthNow < month || (monthNow === month && today.getDate() < day)) age -= 1
  return age
}

export function isAtLeast25(dateOfBirth, today = new Date()) {
  const age = calculateAge(dateOfBirth, today)
  return age !== null && age >= 25
}

export function deriveHeightCm(feet, inches) {
  if (sanitizeText(feet) === '' || sanitizeText(inches) === '') return null
  return Math.round((Number(feet) * 12 + Number(inches)) * 2.54)
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizeText(value))
}

export function isValidPhone(value) {
  const phone = sanitizeText(value)
  if (!/^\+?[\d\s()-]+$/.test(phone)) return false
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}

export function isValidLinkedInUrl(value) {
  try {
    const url = new URL(sanitizeText(value))
    return url.protocol === 'https:'
      && (url.hostname === 'linkedin.com' || url.hostname === 'www.linkedin.com')
      && url.pathname.startsWith('/in/')
  } catch {
    return false
  }
}

export function validateAgeRange(minimum, maximum) {
  if (sanitizeText(minimum) === '' || sanitizeText(maximum) === '') return 'Choose an age range.'
  const min = Number(minimum)
  const max = Number(maximum)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 'Choose an age range.'
  if (min < 25 || max < 25) return 'Age range cannot go below 25.'
  if (min > 70 || max > 70) return 'Age range cannot go above 70.'
  if (max < min) return 'Minimum age cannot exceed maximum age.'
  return ''
}

export function validatePhoto(file) {
  if (!file) return ''
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) return 'Choose a JPEG, PNG or WebP image.'
  if (file.size > MAX_PHOTO_SIZE_BYTES) return 'Choose an image that is 10 MB or smaller.'
  return ''
}

export function isFieldVisible(field, data) {
  if (!field.condition) return true
  const value = data[field.condition.field]
  if ('equals' in field.condition) return value === field.condition.equals
  if ('includes' in field.condition) return Array.isArray(value) && value.includes(field.condition.includes)
  return true
}

function isEmpty(value) {
  if (Array.isArray(value)) return value.filter((item) => sanitizeText(item)).length === 0
  return sanitizeText(value) === ''
}

export function validateField(field, value) {
  if (field.required && isEmpty(value)) {
    if (field.type === 'single_select' || field.type === 'multi_select') return `Choose an option for ${field.label.replace(/[?.]$/, '').toLowerCase()}.`
    return `${field.label} is required.`
  }
  if (isEmpty(value)) return ''

  if (field.type === 'string[]') {
    if (value.length > field.maxItems) return `${field.label} accepts no more than ${field.maxItems} entries.`
    if (value.some((item) => sanitizeText(item).length > field.maxLength)) return `Each entry must be ${field.maxLength} characters or fewer.`
    return ''
  }

  if (field.type === 'multi_select' && field.minSelections && value.length < field.minSelections) {
    return `Choose at least ${field.minSelections} option for ${field.label.toLowerCase()}.`
  }

  const text = sanitizeText(value)
  if (field.maxLength && text.length > field.maxLength) return `${field.label} must be ${field.maxLength} characters or fewer.`
  if (field.type === 'email' && !isValidEmail(text)) return 'Enter a valid email address.'
  if (field.type === 'tel' && !isValidPhone(text)) return 'Enter a valid phone number including country code.'
  if (field.name === 'linkedinUrl' && !isValidLinkedInUrl(text)) return 'Enter a valid LinkedIn profile URL beginning with https://www.linkedin.com/in/.'

  if (field.type === 'number') {
    const number = Number(value)
    if (!Number.isFinite(number)) return `Enter a valid ${field.label.toLowerCase()}.`
    if (field.integer && !Number.isInteger(number)) return `${field.label} must be a whole number.`
    if (field.min !== undefined && number < field.min) return `${field.label} must be at least ${field.min}.`
    if (field.max !== undefined && number > field.max) return `${field.label} must be ${field.max} or lower.`
  }
  return ''
}
