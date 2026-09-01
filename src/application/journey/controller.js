import { JOURNEY_STATE_VERSION, initialJourneyState, journeyStore, valueAtPath } from './store.js'
import {
  APPLICANT_MAXIMUM_AGE,
  APPLICANT_MINIMUM_AGE,
  calculateAgeFromDateOfBirth,
  dateValueFromParts,
  isValidEmail,
  validateApplicantDateOfBirth,
} from './chapter-one.js'
import { isValidPhone } from '../validation.js'

const STORAGE_KEY = 'donna.journey'

const ROUTES = Object.freeze([
  'signup-choice',
  'welcome',
  'ch1-intent', 'ch1-decision', 'ch1-contact',
  'ch2-place', 'ch2-marriage',
  'ch3-facts',
  'ch4-background',
  'ch5-tuesday', 'ch5-week', 'ch5-learning', 'ch5-ease',
  'ch6-boundaries', 'ch6-photos', 'ch6-review',
  'submitted',
])

const CITY_OPTIONS = Object.freeze([
  'Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad',
  'Kochi', 'Coimbatore', 'Jaipur', 'Chandigarh', 'Gurugram', 'Noida', 'Dubai', 'Singapore',
  'London', 'New York', 'San Francisco', 'Toronto', 'Sydney', 'Melbourne', 'Berlin', 'Amsterdam',
])

const LANGUAGE_OPTIONS = Object.freeze([
  'English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Marathi', 'Bengali',
  'Gujarati', 'Punjabi', 'Urdu', 'Konkani', 'Tulu', 'Odia', 'Assamese', 'Other',
])

const NOMINATOR_ROUTES = Object.freeze(['friend-verification', 'write-note', 'seal-send', 'nomination-sent'])

const CHAPTER_NUMERALS = Object.freeze(['', 'I', 'II', 'III', 'IV', 'V', 'VI'])

const AGE_RANGE_MINIMUM = APPLICANT_MINIMUM_AGE
const AGE_RANGE_MAXIMUM = APPLICANT_MAXIMUM_AGE
const AGE_SPREAD_BELOW = 5
const AGE_SPREAD_ABOVE = 7

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const photoFiles = new Map()
let journeyRoot
let screenHost
let screenMarkup
let ageRangeTouched = false
let resumeTarget = 'signup-choice'
let savingSuspended = false

const REVIEW_SECTIONS = Object.freeze([
  {
    chapter: 'Chapter I',
    screen: 'ch1-intent',
    fields: ['relationshipIntent', 'marriageTimeline', 'meetingReadiness', 'gender', 'seeking', 'dateOfBirth', 'height', 'preferredAge', 'familyDecisionInfluence', 'fullName', 'phone', 'email'],
  },
  {
    chapter: 'Chapter II',
    screen: 'ch2-place',
    fields: ['currentCity', 'currentCityOther', 'willingToRelocate', 'relocationCities', 'postMarriageLiving', 'maritalStatus', 'hasChildren', 'wantsChildren'],
  },
  {
    chapter: 'Chapter III',
    screen: 'ch3-facts',
    fields: ['occupation', 'highestDegree', 'annualIncome', 'languages', 'linkedinUrl'],
  },
  {
    chapter: 'Chapter IV',
    screen: 'ch4-background',
    fields: ['faithBackground', 'faithPresence', 'interfaithOpenness', 'familyInterfaithView', 'castePreference', 'castePreferenceDetail', 'diet'],
  },
  {
    chapter: 'Chapter V',
    screen: 'ch5-tuesday',
    fields: ['reflectiveTuesday', 'reflectiveOrdinaryWeek', 'reflectiveLearning', 'reflectiveEase'],
  },
  {
    chapter: 'Chapter VI',
    screen: 'ch6-boundaries',
    fields: ['nonNegotiables', 'familyRequirement', 'familyRequirementDetail', 'photographs'],
  },
])

const FIELD_LABELS = Object.freeze({
  relationshipIntent: 'Looking for', marriageTimeline: 'Marriage timeline', meetingReadiness: 'Available in the next four weeks', preferredAge: 'Age range',
  gender: 'Gender', seeking: 'Interested in meeting', familyDecisionInfluence: 'Family’s say in the final decision',
  fullName: 'Full name', dateOfBirth: 'Date of birth', phone: 'Phone number', email: 'Email address',
  currentCity: 'Current city', currentCityOther: 'Current city detail', willingToRelocate: 'Could relocate', relocationCities: 'Cities considered', postMarriageLiving: 'Expected living arrangement',
  maritalStatus: 'Previous marriage or engagement', hasChildren: 'Has children', wantsChildren: 'Wants children',
  occupation: 'Work', highestDegree: 'Education', annualIncome: 'Annual income', languages: 'Languages', height: 'Height', linkedinUrl: 'LinkedIn profile',
  faithBackground: 'Faith, community or cultural background', faithPresence: 'Presence in everyday life', interfaithOpenness: 'Different faith or community', familyInterfaithView: 'Family’s answer', castePreference: 'Caste preference', castePreferenceDetail: 'Caste preference detail',
  diet: 'Diet',
  reflectiveTuesday: 'An ordinary Tuesday evening', reflectiveOrdinaryWeek: 'A regular weekday together', reflectiveLearning: 'What past relationships taught you', reflectiveEase: 'What takes getting used to',
  nonNegotiables: 'Non-negotiables', familyRequirement: 'Another person’s requirement', familyRequirementDetail: 'Their requirement', photographs: 'Photographs',
})

// Save and exit keeps a paused application in this browser only. There is no
// transport yet, so nothing leaves the device, and the applicant is told so.
function readSavedState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== JOURNEY_STATE_VERSION) return null
    if (parsed.applicant.marriageTimeline === 'two_to_three_years') parsed.applicant.marriageTimeline = ''
    parsed.applicant.relationshipIntent ||= ''
    if (parsed.applicant.seeking === 'both') parsed.applicant.seeking = 'all'
    if (parsed.applicant.interfaithOpenness === 'depends') parsed.applicant.interfaithOpenness = ''
    parsed.applicant.reflectiveLearning ||= ''
    delete parsed.applicant.familySearchInvolvement
    delete parsed.applicant.livingSituation
    parsed.applicant.relocationCities ||= []
    if (parsed.applicant.willingToRelocate === 'certain_places') parsed.applicant.willingToRelocate = ''
    if (parsed.applicant.postMarriageLiving === 'undecided') parsed.applicant.postMarriageLiving = ''
    delete parsed.applicant.reflectiveConflict
    delete parsed.applicant.oneThingToKnow
    delete parsed.applicant.bothWorking
    parsed.applicant.familyRequirementDetail ||= ''
    if (Array.isArray(parsed.applicant.nonNegotiables)) {
      parsed.applicant.nonNegotiables = parsed.applicant.nonNegotiables
        .map((entry) => `${entry.topic ? `${entry.topic}: ` : ''}${entry.detail || ''}`.trim())
        .filter(Boolean)
        .join('\n')
    }
    // Photograph files cannot survive a reload, so their metadata is dropped
    // rather than leaving the review page claiming photographs that are gone.
    parsed.applicant.photographs = { face: null, fullLength: null, ordinaryLife: null }
    return parsed
  } catch {
    return null
  }
}

function writeSavedState() {
  if (savingSuspended) return false
  try {
    window.localStorage.setItem(STORAGE_KEY, journeyStore.serialize())
    return true
  } catch {
    return false
  }
}

function clearSavedState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do: a browser that refuses storage never held anything.
  }
}

function createScreen(id) {
  const markup = screenMarkup.get(id)
  if (!markup) throw new Error(`Unknown journey screen: ${id}`)
  const template = document.createElement('template')
  template.innerHTML = markup
  return template.content.firstElementChild
}

function setError(container, message) {
  const error = container.querySelector(':scope > .field-error') || container.querySelector('.field-error')
  if (!error) return
  error.textContent = message
  error.hidden = !message
  container.classList.toggle('has-error', Boolean(message))
}

function clearErrorFor(control) {
  const field = control.closest('.field, .photo-slot, .consents')
  if (field) setError(field, '')
}

function fieldValue(path) {
  return valueAtPath(journeyStore.getState(), path)
}

function setField(path, value) {
  journeyStore.setField(path, value)
}

function conditionMatches(element) {
  if (!element.dataset.conditionField) return true
  const values = element.dataset.conditionValues.split(',')
  return values.includes(String(fieldValue(element.dataset.conditionField)))
}

function clearConditionalFields(element) {
  element.querySelectorAll('[data-field]').forEach((control) => {
    const path = control.dataset.field
    const current = fieldValue(path)
    if (current && typeof current === 'object') return
    if (current !== '') setField(path, '')
    if ('value' in control) control.value = ''
  })
  const tags = element.querySelector('[data-tags-field]')
  if (tags && fieldValue(tags.dataset.tagsField).length) setField(tags.dataset.tagsField, [])
}

// Keeps the control the person just touched pinned to the same point on screen
// while conditional content is inserted or removed above or below it.
function preserveAnchor(anchor, mutate) {
  if (!anchor || !anchor.isConnected) {
    mutate()
    return
  }
  const before = anchor.getBoundingClientRect().top
  mutate()
  const after = anchor.getBoundingClientRect().top
  const drift = after - before
  if (Math.abs(drift) > 1) window.scrollBy({ top: drift, left: 0, behavior: 'auto' })
}

function syncConditions(screen, anchor) {
  preserveAnchor(anchor, () => {
    screen.querySelectorAll('[data-condition-field]').forEach((element) => {
      const visible = conditionMatches(element)
      if (!visible && !element.hidden) clearConditionalFields(element)
      element.hidden = !visible
    })
  })
}

function orderFieldDescriptions(container) {
  const error = container.querySelector(':scope > .field-error')
  if (!error) return
  const helper = container.querySelector(':scope > .hint, :scope > .reason, :scope > .counter')
  if (helper && error.compareDocumentPosition(helper) & Node.DOCUMENT_POSITION_PRECEDING) {
    container.insertBefore(error, helper)
  }
}

function populateCitySelect(select) {
  if (select.options.length > 1) return
  const options = [...CITY_OPTIONS.map((city) => [city, city]), ['somewhere_else', 'Somewhere else']]
  options.forEach(([value, label]) => {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    select.append(option)
  })
}

function populateDateOfBirthSelects(screen) {
  const day = screen.querySelector('[data-dob-day]')
  const year = screen.querySelector('[data-dob-year]')
  if (day && day.options.length === 1) {
    for (let value = 1; value <= 31; value += 1) {
      const option = document.createElement('option')
      option.value = String(value)
      option.textContent = String(value)
      day.append(option)
    }
  }
  if (year && year.options.length === 1) {
    const thisYear = new Date().getFullYear()
    for (let value = thisYear - APPLICANT_MINIMUM_AGE; value >= thisYear - APPLICANT_MAXIMUM_AGE; value -= 1) {
      const option = document.createElement('option')
      option.value = String(value)
      option.textContent = String(value)
      year.append(option)
    }
  }
}

function clampAgeInterval(minimum, maximum) {
  let low = minimum
  let high = maximum
  if (low < AGE_RANGE_MINIMUM) {
    const shift = AGE_RANGE_MINIMUM - low
    low += shift
    high += shift
  }
  if (high > AGE_RANGE_MAXIMUM) {
    const shift = high - AGE_RANGE_MAXIMUM
    high -= shift
    low -= shift
  }
  return {
    minimum: Math.max(AGE_RANGE_MINIMUM, Math.min(AGE_RANGE_MAXIMUM - 1, low)),
    maximum: Math.min(AGE_RANGE_MAXIMUM, Math.max(AGE_RANGE_MINIMUM + 1, high)),
  }
}

function derivedAgeRange() {
  const age = calculateAgeFromDateOfBirth(dateValueFromParts(fieldValue('applicant.dateOfBirth')))
  if (age === null) return null
  return clampAgeInterval(age - AGE_SPREAD_BELOW, age + AGE_SPREAD_ABOVE)
}

function renderAgeRange(slider) {
  const minimum = Number(fieldValue('applicant.preferredAge.minimum'))
  const maximum = Number(fieldValue('applicant.preferredAge.maximum'))
  slider.querySelector('[data-age-input="minimum"]').value = String(minimum)
  slider.querySelector('[data-age-input="maximum"]').value = String(maximum)
  slider.querySelector('[data-age-label="minimum"]').textContent = String(minimum)
  slider.querySelector('[data-age-label="maximum"]').textContent = String(maximum)
  const span = AGE_RANGE_MAXIMUM - AGE_RANGE_MINIMUM
  const fill = slider.querySelector('[data-age-fill]')
  fill.style.left = `${((minimum - AGE_RANGE_MINIMUM) / span) * 100}%`
  fill.style.right = `${100 - ((maximum - AGE_RANGE_MINIMUM) / span) * 100}%`
  slider.querySelectorAll('[data-age-label]').forEach((label) => {
    const value = Number(label.dataset.ageLabel === 'minimum' ? minimum : maximum)
    label.style.left = `${((value - AGE_RANGE_MINIMUM) / span) * 100}%`
  })
}

function initAgeRange(screen) {
  const slider = screen.querySelector('[data-age-slider]')
  if (!slider) return
  if (!ageRangeTouched) {
    const derived = derivedAgeRange()
    if (derived) {
      setField('applicant.preferredAge.minimum', derived.minimum)
      setField('applicant.preferredAge.maximum', derived.maximum)
    }
  }
  renderAgeRange(slider)
  slider.querySelectorAll('[data-age-input]').forEach((input) => {
    const commit = () => {
      ageRangeTouched = true
      const bound = input.dataset.ageInput
      let value = Number(input.value)
      if (bound === 'minimum') value = Math.min(value, Number(fieldValue('applicant.preferredAge.maximum')) - 1)
      else value = Math.max(value, Number(fieldValue('applicant.preferredAge.minimum')) + 1)
      value = Math.max(AGE_RANGE_MINIMUM, Math.min(AGE_RANGE_MAXIMUM, value))
      setField(`applicant.preferredAge.${bound}`, value)
      renderAgeRange(slider)
      clearErrorFor(input)
      refreshAdvanceState(screen)
    }
    input.addEventListener('input', commit)
    input.addEventListener('change', commit)
  })
}

function hydrateControls(screen) {
  screen.querySelectorAll('.pill[data-field], .segment[data-field], .choice-card[data-field]').forEach((button) => {
    const selected = fieldValue(button.dataset.field) === button.dataset.value
    button.classList.toggle('selected', selected)
    if (button.getAttribute('role') === 'radio') button.setAttribute('aria-checked', String(selected))
    else button.setAttribute('aria-pressed', String(selected))
  })

  screen.querySelectorAll('[data-city-select]').forEach(populateCitySelect)
  populateDateOfBirthSelects(screen)

  screen.querySelectorAll('input[data-field], textarea[data-field], select[data-field]').forEach((control) => {
    const value = fieldValue(control.dataset.field)
    if (control.type !== 'file') control.value = value ?? ''
  })

  const unit = fieldValue('applicant.height.unit') || 'ft'
  screen.querySelectorAll('[data-height-unit]').forEach((button) => {
    const selected = button.dataset.heightUnit === unit
    button.classList.toggle('selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  })
  screen.querySelectorAll('[data-height-fields]').forEach((fields) => { fields.hidden = fields.dataset.heightFields !== unit })

  screen.querySelectorAll('[data-counter-for]').forEach((counter) => {
    const textarea = screen.querySelector(`#${counter.dataset.counterFor}`)
    counter.textContent = `${textarea?.value.length || 0} / ${textarea?.maxLength || 600}`
  })

  screen.querySelectorAll('.field, .photo-slot').forEach((container, index) => {
    orderFieldDescriptions(container)
    const descriptions = [...container.querySelectorAll('.hint, .reason, .field-error')]
    if (!descriptions.length) return
    const ids = descriptions.map((description, descriptionIndex) => {
      description.id ||= `${screen.id}-description-${index}-${descriptionIndex}`
      return description.id
    })
    const target = container.matches('fieldset')
      ? container
      : container.querySelector('input, textarea, select, [role="combobox"]')
    if (target) target.setAttribute('aria-describedby', ids.join(' '))
  })

  syncConditions(screen)
}

function renderProgress(screen) {
  const header = journeyRoot.querySelector('[data-journey-header]')
  const mascot = journeyRoot.querySelector('[data-persistent-mascot]')
  const saveExit = journeyRoot.querySelector('[data-save-exit]')
  const chapter = Number(screen.dataset.chapter)
  const applicationScreen = Number.isInteger(chapter) && chapter > 0
  const saveable = screen.hasAttribute('data-saveable')
  header.hidden = !applicationScreen && !saveable
  mascot.hidden = !applicationScreen && !screen.classList.contains('grouped-screen')
  saveExit.hidden = !(applicationScreen || saveable)
  const status = journeyRoot.querySelector('[data-chapter-status]')
  if (!applicationScreen) {
    status.textContent = ''
    return
  }
  const numeral = CHAPTER_NUMERALS[chapter] || ''
  if (status.textContent === numeral) return
  status.classList.add('is-fading')
  window.setTimeout(() => {
    status.textContent = numeral
    status.classList.remove('is-fading')
  }, 140)
}

function renderTags(control) {
  const path = control.dataset.tagsField
  const values = fieldValue(path) || []
  const list = control.querySelector('[data-tag-list]')
  list.replaceChildren(...values.map((value) => {
    const chip = document.createElement('span')
    chip.className = 'tag-bubble'
    chip.append(value)
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.setAttribute('aria-label', `Remove ${value}`)
    remove.textContent = '×'
    remove.addEventListener('click', () => {
      setField(path, values.filter((item) => item !== value))
      renderTags(control)
      refreshAdvanceState(control.closest('.screen'))
    })
    chip.append(remove)
    return chip
  }))
}

function initTagControl(control) {
  const path = control.dataset.tagsField
  const input = control.querySelector('[data-tag-input]')
  const dropdown = control.querySelector('[data-tag-dropdown]')
  const options = path === 'applicant.languages' ? LANGUAGE_OPTIONS : CITY_OPTIONS

  const close = () => {
    dropdown.classList.remove('show')
    control.classList.remove('is-open')
  }

  const add = (value) => {
    const clean = value.trim()
    if (!clean) return
    const current = fieldValue(path) || []
    if (!current.some((item) => item.toLowerCase() === clean.toLowerCase())) setField(path, [...current, clean])
    input.value = ''
    close()
    renderTags(control)
    clearErrorFor(control)
    refreshAdvanceState(control.closest('.screen'))
  }

  const showOptions = () => {
    const query = input.value.trim().toLowerCase()
    const selected = fieldValue(path) || []
    const matches = options.filter((option) => !selected.includes(option) && (!query || option.toLowerCase().includes(query))).slice(0, 8)
    dropdown.replaceChildren(...matches.map((option) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'tag-option'
      button.textContent = option
      button.addEventListener('click', () => add(option))
      return button
    }))
    dropdown.classList.toggle('show', matches.length > 0)
    control.classList.toggle('is-open', matches.length > 0)
  }
  input.addEventListener('input', showOptions)
  input.addEventListener('focus', showOptions)
  input.addEventListener('blur', () => window.setTimeout(close, 120))
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      add(input.value)
    }
    if (event.key === 'Escape') close()
  })
  renderTags(control)
}

function renderPhotoSlot(slot) {
  const id = slot.dataset.photoSlot
  const preview = slot.querySelector('[data-photo-preview]')
  const stored = photoFiles.get(id)
  preview.replaceChildren()
  if (!stored) return
  const image = document.createElement('img')
  image.src = stored.url
  image.alt = `Local preview of ${stored.file.name}`
  const name = document.createElement('span')
  name.textContent = stored.file.name
  const remove = document.createElement('button')
  remove.type = 'button'
  remove.textContent = 'Remove'
  remove.addEventListener('click', () => {
    URL.revokeObjectURL(stored.url)
    photoFiles.delete(id)
    setField(`applicant.photographs.${id}`, null)
    renderPhotoSlot(slot)
    refreshAdvanceState(slot.closest('.screen'))
  })
  preview.append(image, name, remove)
}

function initPhotos(screen) {
  screen.querySelectorAll('[data-photo-slot]').forEach((slot) => {
    const id = slot.dataset.photoSlot
    renderPhotoSlot(slot)
    slot.querySelector('input[type="file"]').addEventListener('change', (event) => {
      const [file] = event.target.files
      if (!file) return
      if (!PHOTO_TYPES.has(file.type) || file.size > MAX_PHOTO_BYTES) {
        setError(slot, 'Choose a JPEG, PNG or WebP image up to 10 MB.')
        return
      }
      const previous = photoFiles.get(id)
      if (previous) URL.revokeObjectURL(previous.url)
      photoFiles.set(id, { file, url: URL.createObjectURL(file) })
      setField(`applicant.photographs.${id}`, { name: file.name, type: file.type, size: file.size })
      setError(slot, '')
      renderPhotoSlot(slot)
      refreshAdvanceState(screen)
    })
  })
}

function displayValue(key, value) {
  if (key === 'dateOfBirth') return dateValueFromParts(value)
  if (key === 'preferredAge') return `${value.minimum} to ${value.maximum}`
  if (key === 'height') return value.unit === 'cm' ? `${value.centimeters} cm` : `${value.feet} ft ${value.inches} in`
  if (key === 'photographs') return Object.values(value).filter(Boolean).map((photo) => photo.name).join(', ')
  if (Array.isArray(value)) return value.join(', ')
  return String(value ?? '').replaceAll('_', ' ')
}

function renderReview(screen) {
  const host = screen.querySelector('[data-review]')
  if (!host) return
  const applicant = journeyStore.getState().applicant
  host.replaceChildren(...REVIEW_SECTIONS.map((section) => {
    const wrapper = document.createElement('section')
    wrapper.className = 'review-section'
    const header = document.createElement('div')
    const heading = document.createElement('h2')
    heading.textContent = section.chapter
    const edit = document.createElement('button')
    edit.type = 'button'
    edit.textContent = 'Edit'
    edit.addEventListener('click', () => goTo(section.screen))
    header.append(heading, edit)
    const list = document.createElement('dl')
    section.fields.forEach((key) => {
      const value = applicant[key]
      if (value === '' || value === null || value === undefined || (Array.isArray(value) && !value.length)) return
      const term = document.createElement('dt')
      term.textContent = FIELD_LABELS[key]
      const description = document.createElement('dd')
      description.textContent = displayValue(key, value) || 'Not provided'
      list.append(term, description)
    })
    wrapper.append(header, list)
    return wrapper
  }))

  screen.querySelectorAll('[data-consent]').forEach((checkbox) => {
    checkbox.checked = Boolean(fieldValue(`applicant.consents.${checkbox.dataset.consent}`))
  })
}

function fieldMessage(container) {
  if (container.hidden) return ''
  const path = container.dataset.requiredField
  const value = fieldValue(path)
  if (path.endsWith('.fullName')) return String(value).trim().length < 2 ? 'Enter your full name.' : ''
  if (path === 'applicant.dateOfBirth') return validateApplicantDateOfBirth(dateValueFromParts(value)).message
  if (path.endsWith('.phone')) return isValidPhone(value) ? '' : 'Enter a valid phone number including country code.'
  if (path.endsWith('.email')) return isValidEmail(value) ? '' : 'Enter a valid email address.'
  if (path.endsWith('.linkedinUrl')) {
    return /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[\w%+-]+\/?(?:[?#].*)?$/i.test(String(value).trim())
      ? '' : 'Enter a LinkedIn profile URL.'
  }
  if (path === 'applicant.preferredAge') {
    return (!value.minimum || !value.maximum || value.minimum < AGE_RANGE_MINIMUM || value.maximum <= value.minimum)
      ? 'Choose a valid minimum and maximum age.' : ''
  }
  if (path === 'applicant.height') {
    return (value.unit === 'cm' ? !value.centimeters : !value.feet || value.inches === '') ? 'Enter your height.' : ''
  }
  if (path === 'applicant.nonNegotiables') {
    return String(value).trim() ? '' : 'Describe what would make an introduction unworkable.'
  }
  if (Array.isArray(value) && value.length === 0) return 'Answer this question.'
  if (typeof value === 'string' && !value.trim()) return 'Answer this question.'
  return ''
}

function validateField(container) {
  const message = fieldMessage(container)
  setError(container, message)
  return !message
}

function screenIsComplete(screen) {
  const incomplete = [...screen.querySelectorAll('[data-required-field]')].some((container) => fieldMessage(container))
  if (incomplete) return false
  if (screen.id === 'ch6-photos') {
    return [...screen.querySelectorAll('[data-photo-slot]')].every((slot) => photoFiles.has(slot.dataset.photoSlot))
  }
  if (screen.id === 'ch6-review') {
    return [...screen.querySelectorAll('[data-consent]')].every((checkbox) => checkbox.checked)
  }
  if (screen.id === 'seal-send') {
    return [...screen.querySelectorAll('[data-consent-nominator]')].every((checkbox) => checkbox.checked)
  }
  return true
}

function refreshAdvanceState(screen) {
  if (!screen) return
  const advance = screen.querySelector('.actions .next-btn[type="submit"]')
  if (!advance) return
  advance.disabled = !screenIsComplete(screen)
}

function focusInvalid(container) {
  container.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
  const control = container.querySelector('input:not([type="hidden"]), textarea, select, button')
  control?.focus({ preventScroll: true })
}

function validateScreen(screen) {
  let firstInvalid = null
  screen.querySelectorAll('[data-required-field]').forEach((container) => {
    if (!validateField(container) && !firstInvalid) firstInvalid = container
  })

  if (screen.id === 'ch6-photos') {
    screen.querySelectorAll('[data-photo-slot]').forEach((slot) => {
      const valid = photoFiles.has(slot.dataset.photoSlot)
      setError(slot, valid ? '' : 'This photograph is required.')
      if (!valid && !firstInvalid) firstInvalid = slot
    })
  }

  if (screen.id === 'seal-send') {
    const missing = [...screen.querySelectorAll('[data-consent-nominator]')].filter((checkbox) => !checkbox.checked)
    const consentError = screen.querySelector('[data-consent-error]')
    consentError.textContent = missing.length ? 'Confirm both before sealing.' : ''
    consentError.hidden = missing.length === 0
    if (missing.length && !firstInvalid) firstInvalid = missing[0].closest('.consents')
  }

  if (screen.id === 'ch6-review') {
    const missing = [...screen.querySelectorAll('[data-consent]')].filter((checkbox) => !checkbox.checked)
    const consentError = screen.querySelector('[data-consent-error]')
    consentError.textContent = missing.length ? 'Accept each required consent before submitting.' : ''
    consentError.hidden = missing.length === 0
    if (missing.length && !firstInvalid) firstInvalid = missing[0].closest('.consents')
  }
  if (firstInvalid) focusInvalid(firstInvalid)
  return !firstInvalid
}

function nextFor(screen) {
  if (screen.id === 'signup-choice') {
    return fieldValue('path') === 'nominator' ? 'friend-verification' : 'welcome'
  }
  const declared = screen.querySelector('form[data-next-screen]')?.dataset.nextScreen
  if (declared) return declared
  const nominatorIndex = NOMINATOR_ROUTES.indexOf(screen.id)
  if (nominatorIndex >= 0) return NOMINATOR_ROUTES[nominatorIndex + 1]
  const index = ROUTES.indexOf(screen.id)
  return ROUTES[index + 1]
}

function mountScreen(id) {
  const screen = createScreen(id)
  screenHost.replaceChildren(screen)
  window.scrollTo({ top: 0, behavior: 'auto' })
  renderProgress(screen)
  hydrateControls(screen)
  initAgeRange(screen)
  screen.querySelectorAll('[data-tags-field]').forEach(initTagControl)
  initPhotos(screen)
  renderReview(screen)
  refreshAdvanceState(screen)
  journeyStore.setScreen(id)
  screen.querySelector('h1')?.focus?.({ preventScroll: true })
  return screen
}

function captureMountedFields() {
  const screen = screenHost.querySelector('.screen')
  if (!screen) return
  screen.querySelectorAll('input[data-field], textarea[data-field], select[data-field]').forEach((control) => {
    if (control.type === 'file' || control.type === 'range') return
    let value = control.value
    if (control.type === 'number' && value !== '') value = Number(value)
    setField(control.dataset.field, value)
  })
}

function goTo(id) {
  if (!screenMarkup.has(id)) throw new Error(`Unknown journey screen: ${id}`)
  captureMountedFields()
  mountScreen(id)
}

function handleChoice(button) {
  const path = button.dataset.field
  const value = button.dataset.value
  const screen = button.closest('.screen')
  setField(path, value)
  button.closest('.pill-group, .segmented, .choice-cards').querySelectorAll('[data-field]').forEach((option) => {
    const selected = option === button
    option.classList.toggle('selected', selected)
    if (option.getAttribute('role') === 'radio') option.setAttribute('aria-checked', String(selected))
    else option.setAttribute('aria-pressed', String(selected))
  })
  clearErrorFor(button)
  syncConditions(screen, button)
  refreshAdvanceState(screen)
  if (path === 'applicant.relationshipIntent' && value === 'not_sure') goTo('chapter-one-exit')
}

function handleInput(control) {
  let value = control.value
  if (control.type === 'number' && value !== '') value = Number(value)
  setField(control.dataset.field, value)
  clearErrorFor(control)
  const counter = control.id && screenHost.querySelector(`[data-counter-for="${control.id}"]`)
  if (counter) counter.textContent = `${control.value.length} / ${control.maxLength}`
  const screen = control.closest('.screen')
  syncConditions(screen, control)
  refreshAdvanceState(screen)
}

function bindEvents() {
  journeyRoot.addEventListener('click', (event) => {
    const choice = event.target.closest('.pill[data-field], .segment[data-field], .choice-card[data-field]')
    if (choice) return handleChoice(choice)
    const next = event.target.closest('[data-next]')
    if (next) return goTo(next.dataset.next)
    const back = event.target.closest('[data-back]')
    if (back) return goTo(back.dataset.back)
    const heightUnit = event.target.closest('[data-height-unit]')
    if (heightUnit) {
      const screen = heightUnit.closest('.screen')
      setField('applicant.height.unit', heightUnit.dataset.heightUnit)
      preserveAnchor(heightUnit, () => hydrateControls(screen))
      refreshAdvanceState(screen)
      return
    }
    if (event.target.closest('[data-save-exit]')) return saveAndExit()
    if (event.target.closest('[data-resume]')) return goTo(resumeTarget)
    if (event.target.closest('[data-clear-saved]')) return forgetEverything()
  })

  journeyRoot.addEventListener('input', (event) => {
    if (event.target.matches('[data-field]:not([type="range"])')) handleInput(event.target)
  })
  journeyRoot.addEventListener('change', (event) => {
    if (event.target.matches('input[type="checkbox"][data-consent]')) {
      setField(`applicant.consents.${event.target.dataset.consent}`, event.target.checked)
      clearErrorFor(event.target)
      refreshAdvanceState(event.target.closest('.screen'))
      return
    }
    if (event.target.matches('input[type="checkbox"][data-consent-nominator]')) {
      clearErrorFor(event.target)
      refreshAdvanceState(event.target.closest('.screen'))
      return
    }
    if (event.target.matches('input[data-field]:not([type="range"]), textarea[data-field], select[data-field]')) handleInput(event.target)
  })
  journeyRoot.addEventListener('submit', (event) => {
    event.preventDefault()
    const screen = event.target.closest('.screen')
    captureMountedFields()
    if (!screenIsComplete(screen)) {
      refreshAdvanceState(screen)
      validateScreen(screen)
      return
    }
    if (!validateScreen(screen)) return
    if (screen.id === 'seal-send') setField('nominator.sealed', true)
    goTo(nextFor(screen))
  })
}

function saveAndExit() {
  captureMountedFields()
  resumeTarget = journeyStore.getState().currentScreen
  const stored = writeSavedState()
  const screen = mountScreen('saved')
  if (!stored) {
    const card = screen.querySelector('.center-card p')
    if (card) card.textContent = 'This browser will not let me store anything, so your answers are only kept while this tab stays open.'
  }
}

function forgetEverything() {
  // Suspended while the store resets, so that resetting does not immediately
  // write a fresh record back into the storage the person just cleared.
  savingSuspended = true
  photoFiles.forEach((stored) => URL.revokeObjectURL(stored.url))
  photoFiles.clear()
  ageRangeTouched = false
  journeyStore.hydrate(initialJourneyState)
  resumeTarget = 'signup-choice'
  mountScreen('signup-choice')
  clearSavedState()
  savingSuspended = false
}

export function initializeJourney(options) {
  journeyRoot = options.root
  screenHost = options.screenHost
  screenMarkup = options.screenMarkup
  bindEvents()

  const saved = readSavedState()
  if (saved) journeyStore.hydrate(saved)
  journeyStore.subscribe((_snapshot, change) => {
    if (change.type === 'hydrate') return
    writeSavedState()
  })

  const current = journeyStore.getState().currentScreen
  const initial = screenMarkup.has(current) && current !== 'saved' ? current : 'signup-choice'
  resumeTarget = initial
  mountScreen(initial)
}
