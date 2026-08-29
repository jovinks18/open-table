import { journeyStore, valueAtPath } from './store.js'
import {
  dateOfBirthBounds,
  datePartsFromValue,
  dateValueFromParts,
  isValidEmail,
  validateApplicantDateOfBirth,
} from './chapter-one.js'
import { isValidPhone } from '../validation.js'

const ROUTES = Object.freeze([
  'welcome',
  'ch1-intent', 'ch1-decision', 'ch1-contact',
  'ch2-place', 'ch2-marriage',
  'ch3-facts-1', 'ch3-facts-2',
  'ch4-background', 'ch4-habits',
  'ch5-ease', 'ch5-week', 'ch5-conflict',
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

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const photoFiles = new Map()
let journeyRoot
let screenHost
let screenMarkup

const REVIEW_SECTIONS = Object.freeze([
  { chapter: 'Chapter I — What brings you here?', screen: 'ch1-intent', fields: ['intent', 'marriageTimeline', 'meetingReadiness', 'preferredAge'] },
  { chapter: 'Chapter I — You and the decision', screen: 'ch1-decision', fields: ['gender', 'genderDescription', 'seeking', 'familySearchInvolvement', 'familyDecisionInfluence'] },
  { chapter: 'Chapter I — Contact', screen: 'ch1-contact', fields: ['fullName', 'dateOfBirth', 'phone', 'email'] },
  { chapter: 'Chapter II — Place and home', screen: 'ch2-place', fields: ['currentCity', 'livingSituation', 'livingSituationOther', 'willingToRelocate', 'relocationCities', 'postMarriageLiving', 'postMarriageLivingOther'] },
  { chapter: 'Chapter II — Marriage and children', screen: 'ch2-marriage', fields: ['maritalStatus', 'priorRelationshipEnd', 'hasChildren', 'childrenCount', 'wantsChildren', 'openToPartnerWithChildren'] },
  { chapter: 'Chapter III — The facts', screen: 'ch3-facts-1', fields: ['occupation', 'industry', 'highestDegree', 'annualIncome'] },
  { chapter: 'Chapter III — More facts', screen: 'ch3-facts-2', fields: ['languages', 'height', 'linkedinUrl'] },
  { chapter: 'Chapter IV — Background', screen: 'ch4-background', fields: ['faithBackground', 'faithBackgroundOther', 'faithPresence', 'interfaithOpenness', 'interfaithConditions', 'familyInterfaithView', 'castePreference'] },
  { chapter: 'Chapter IV — Everyday habits', screen: 'ch4-habits', fields: ['diet', 'dietOther', 'drinking', 'smoking'] },
  { chapter: 'Chapter V — What it’s like to be with you', screen: 'ch5-ease', fields: ['reflectiveEase', 'reflectiveOrdinaryWeek', 'reflectiveConflict'] },
  { chapter: 'Chapter VI — What cannot work', screen: 'ch6-boundaries', fields: ['nonNegotiables', 'familyRequirement', 'familyRequirementDetail', 'boundariesConfirmed'] },
  { chapter: 'Chapter VI — Photographs', screen: 'ch6-photos', fields: ['photographs'] },
])

const FIELD_LABELS = Object.freeze({
  intent: 'What are you looking for?', marriageTimeline: 'Marriage timeline', meetingReadiness: 'Available in the next four weeks', preferredAge: 'Age range',
  gender: 'You are', genderDescription: 'Gender description', seeking: 'Looking to meet', familySearchInvolvement: 'Who else is involved', familyDecisionInfluence: 'Family’s say in the final decision',
  fullName: 'Full name', dateOfBirth: 'Date of birth', phone: 'Phone number', email: 'Email address',
  currentCity: 'Current city', livingSituation: 'Current living situation', livingSituationOther: 'Living situation detail', willingToRelocate: 'Could relocate', relocationCities: 'Cities considered', postMarriageLiving: 'Expected living arrangement', postMarriageLivingOther: 'Living arrangement detail',
  maritalStatus: 'Previous marriage or engagement', priorRelationshipEnd: 'Relationship ended', hasChildren: 'Has children', childrenCount: 'Number of children', wantsChildren: 'Wants children', openToPartnerWithChildren: 'Open to someone with children',
  occupation: 'Work', industry: 'Field', highestDegree: 'Education', annualIncome: 'Annual income', languages: 'Languages', height: 'Height', linkedinUrl: 'LinkedIn profile',
  faithBackground: 'Faith, community or cultural background', faithBackgroundOther: 'Background detail', faithPresence: 'Presence in everyday life', interfaithOpenness: 'Different faith or community', interfaithConditions: 'What would need to be true', familyInterfaithView: 'Family’s answer', castePreference: 'Caste preference or requirement',
  diet: 'Diet', dietOther: 'Diet detail', drinking: 'Alcohol', smoking: 'Smoking or nicotine',
  reflectiveEase: 'Easy and difficult parts of being close', reflectiveOrdinaryWeek: 'An ordinary week together', reflectiveConflict: 'What happens when something is bothering you',
  nonNegotiables: 'Non-negotiables', familyRequirement: 'Another person’s requirement', familyRequirementDetail: 'Requirement detail', boundariesConfirmed: 'Everything listed', photographs: 'Photographs',
})

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

function syncConditions(screen) {
  screen.querySelectorAll('[data-condition-field]').forEach((element) => {
    const visible = conditionMatches(element)
    if (!visible && !element.hidden) clearConditionalFields(element)
    element.hidden = !visible
  })
}

function hydrateControls(screen) {
  screen.querySelectorAll('.pill[data-field]').forEach((button) => {
    const selected = fieldValue(button.dataset.field) === button.dataset.value
    button.classList.toggle('selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  })

  screen.querySelectorAll('input[data-field], textarea[data-field], select[data-field]').forEach((control) => {
    const value = fieldValue(control.dataset.field)
    if (control.type === 'date') control.value = dateValueFromParts(value)
    else if (control.type !== 'file') control.value = value ?? ''
  })

  screen.querySelectorAll('[data-output]').forEach((output) => { output.value = String(fieldValue(output.dataset.output)) })
  const unit = fieldValue('applicant.height.unit') || 'ft'
  screen.querySelectorAll('[data-height-unit]').forEach((button) => {
    const selected = button.dataset.heightUnit === unit
    button.classList.toggle('selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  })
  screen.querySelectorAll('[data-height-fields]').forEach((fields) => { fields.hidden = fields.dataset.heightFields !== unit })

  screen.querySelectorAll('[data-counter-for]').forEach((counter) => {
    const textarea = screen.querySelector(`#${counter.dataset.counterFor}`)
    counter.textContent = `${textarea?.value.length || 0} / 400`
  })

  const dateInput = screen.querySelector('#dateOfBirth')
  if (dateInput) {
    const bounds = dateOfBirthBounds()
    dateInput.min = bounds.min
    dateInput.max = bounds.max
  }

  syncConditions(screen)
}

function renderProgress(screen) {
  const header = journeyRoot.querySelector('[data-journey-header]')
  const mascot = journeyRoot.querySelector('[data-persistent-mascot]')
  const chapter = Number(screen.dataset.chapter)
  const applicationScreen = Number.isInteger(chapter) && chapter > 0
  header.hidden = !applicationScreen
  mascot.hidden = !applicationScreen
  if (!applicationScreen) return
  const step = Number(screen.dataset.step)
  const steps = Number(screen.dataset.steps)
  journeyRoot.querySelector('.progress-wrap').textContent = steps > 1
    ? `Chapter ${chapter} of 6 · Step ${step} of ${steps}`
    : `Chapter ${chapter} of 6`
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

  const add = (value) => {
    const clean = value.trim()
    if (!clean) return
    const current = fieldValue(path) || []
    if (!current.some((item) => item.toLowerCase() === clean.toLowerCase())) setField(path, [...current, clean])
    input.value = ''
    dropdown.classList.remove('show')
    renderTags(control)
    clearErrorFor(control)
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
  }
  input.addEventListener('input', showOptions)
  input.addEventListener('focus', showOptions)
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      add(input.value)
    }
    if (event.key === 'Escape') dropdown.classList.remove('show')
  })
  renderTags(control)
}

function renderBoundaries(screen) {
  const host = screen.querySelector('[data-boundary-list]')
  if (!host) return
  const entries = fieldValue('applicant.nonNegotiables') || []
  host.replaceChildren(...entries.map((entry, index) => {
    const row = document.createElement('div')
    row.className = 'boundary-entry'
    const label = document.createElement('label')
    label.htmlFor = `boundary-${index}`
    label.textContent = entry.topic || `Custom non-negotiable ${index + 1}`
    const input = document.createElement('input')
    input.id = `boundary-${index}`
    input.type = 'text'
    input.value = entry.detail
    input.placeholder = 'Explain exactly where your boundary is'
    input.addEventListener('input', () => {
      const next = structuredClone(fieldValue('applicant.nonNegotiables'))
      next[index].detail = input.value
      setField('applicant.nonNegotiables', next)
      clearErrorFor(host)
    })
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'remove-boundary'
    remove.textContent = 'Remove'
    remove.addEventListener('click', () => {
      setField('applicant.nonNegotiables', entries.filter((_, itemIndex) => itemIndex !== index))
      renderBoundaries(screen)
    })
    row.append(label, input, remove)
    return row
  }))
  screen.querySelectorAll('[data-topic]').forEach((button) => {
    const selected = entries.some((entry) => entry.topic === button.dataset.topic)
    button.classList.toggle('selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  })
}

function addBoundary(screen, topic = '') {
  const entries = fieldValue('applicant.nonNegotiables') || []
  if (entries.length >= 3 || (topic && entries.some((entry) => entry.topic === topic))) return
  setField('applicant.nonNegotiables', [...entries, { topic, detail: '' }])
  renderBoundaries(screen)
  screen.querySelector('[data-boundary-list] input:last-of-type')?.focus()
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
    })
  })
}

function displayValue(key, value) {
  if (key === 'dateOfBirth') return dateValueFromParts(value)
  if (key === 'preferredAge') return `${value.minimum} to ${value.maximum}`
  if (key === 'height') return value.unit === 'cm' ? `${value.centimeters} cm` : `${value.feet} ft ${value.inches} in`
  if (key === 'priorRelationshipEnd') return value.month && value.year ? `${value.month}/${value.year}` : ''
  if (key === 'nonNegotiables') return value.map((entry) => `${entry.topic ? `${entry.topic}: ` : ''}${entry.detail}`).join('; ')
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
      if (value === '' || value === null || (Array.isArray(value) && !value.length)) return
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

function validateField(container) {
  if (container.hidden) return true
  const path = container.dataset.requiredField
  const value = fieldValue(path)
  let message = ''
  if (path === 'applicant.fullName' && String(value).trim().length < 2) message = 'Enter your full name.'
  else if (path === 'applicant.dateOfBirth') message = validateApplicantDateOfBirth(dateValueFromParts(value)).message
  else if (path === 'applicant.phone' && !isValidPhone(value)) message = 'Enter a valid phone number including country code.'
  else if (path === 'applicant.email' && !isValidEmail(value)) message = 'Enter a valid email address.'
  else if (path === 'applicant.linkedinUrl' && !/^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[\w%+-]+\/?(?:[?#].*)?$/i.test(String(value).trim())) message = 'Enter a LinkedIn profile URL.'
  else if (path === 'applicant.preferredAge' && (!value.minimum || !value.maximum || value.minimum < 22 || value.maximum <= value.minimum)) message = 'Choose a valid minimum and maximum age.'
  else if (path === 'applicant.height' && (value.unit === 'cm' ? !value.centimeters : !value.feet || value.inches === '')) message = 'Enter your height.'
  else if (path === 'applicant.priorRelationshipEnd' && (!value.month || !value.year)) message = 'Enter the month and year.'
  else if (path === 'applicant.nonNegotiables' && (!value.length || value.length > 3 || value.some((entry) => !entry.detail.trim()))) message = 'Add one to three boundaries and explain each one.'
  else if (Array.isArray(value) && value.length === 0) message = 'Answer this question.'
  else if (typeof value === 'string' && !value.trim()) message = 'Answer this question.'
  setError(container, message)
  return !message
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
  const index = ROUTES.indexOf(screen.id)
  return ROUTES[index + 1]
}

function mountScreen(id) {
  const screen = createScreen(id)
  screenHost.replaceChildren(screen)
  renderProgress(screen)
  hydrateControls(screen)
  screen.querySelectorAll('[data-tags-field]').forEach(initTagControl)
  renderBoundaries(screen)
  initPhotos(screen)
  renderReview(screen)
  journeyStore.setScreen(id)
  screen.querySelector('h1')?.focus?.({ preventScroll: true })
  return screen
}

function captureMountedFields() {
  const screen = screenHost.querySelector('.screen')
  if (!screen) return
  screen.querySelectorAll('input[data-field], textarea[data-field], select[data-field]').forEach((control) => {
    if (control.type === 'file') return
    let value = control.value
    if (control.type === 'date') value = datePartsFromValue(value) || { day: '', month: '', year: '' }
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
  setField(path, value)
  button.closest('.pill-group').querySelectorAll('.pill').forEach((option) => {
    const selected = option === button
    option.classList.toggle('selected', selected)
    option.setAttribute('aria-pressed', String(selected))
  })
  clearErrorFor(button)
  syncConditions(button.closest('.screen'))
  if (path === 'applicant.intent' && value === 'not_sure') goTo('chapter-one-exit')
}

function handleInput(control) {
  let value = control.value
  if (control.type === 'date') value = datePartsFromValue(value) || { day: '', month: '', year: '' }
  if (control.type === 'number' && value !== '') value = Number(value)
  setField(control.dataset.field, value)
  clearErrorFor(control)
  const counter = control.id && screenHost.querySelector(`[data-counter-for="${control.id}"]`)
  if (counter) counter.textContent = `${control.value.length} / 400`
  syncConditions(control.closest('.screen'))
}

function handleStepper(button) {
  const path = button.dataset.stepper
  const direction = Number(button.dataset.direction)
  const minimum = path.endsWith('minimum') ? 22 : fieldValue('applicant.preferredAge.minimum') + 1
  const maximum = path.endsWith('minimum') ? fieldValue('applicant.preferredAge.maximum') - 1 : 70
  const value = Math.max(minimum, Math.min(maximum, Number(fieldValue(path)) + direction))
  setField(path, value)
  const output = button.closest('.age-stepper').querySelector('output')
  output.value = String(value)
  clearErrorFor(button)
}

function bindEvents() {
  journeyRoot.addEventListener('click', (event) => {
    const choice = event.target.closest('.pill[data-field]')
    if (choice) return handleChoice(choice)
    const next = event.target.closest('[data-next]')
    if (next) return goTo(next.dataset.next)
    const back = event.target.closest('[data-back]')
    if (back) return goTo(back.dataset.back)
    const stepper = event.target.closest('[data-stepper]')
    if (stepper) return handleStepper(stepper)
    const heightUnit = event.target.closest('[data-height-unit]')
    if (heightUnit) {
      setField('applicant.height.unit', heightUnit.dataset.heightUnit)
      hydrateControls(heightUnit.closest('.screen'))
      return
    }
    const topic = event.target.closest('[data-topic]')
    if (topic) return addBoundary(topic.closest('.screen'), topic.dataset.topic)
    const addCustom = event.target.closest('[data-add-boundary]')
    if (addCustom) return addBoundary(addCustom.closest('.screen'))
  })

  journeyRoot.addEventListener('input', (event) => {
    if (event.target.matches('[data-field]')) handleInput(event.target)
  })
  journeyRoot.addEventListener('change', (event) => {
    if (event.target.matches('input[type="checkbox"][data-consent]')) {
      setField(`applicant.consents.${event.target.dataset.consent}`, event.target.checked)
      clearErrorFor(event.target)
      return
    }
    if (event.target.matches('input[data-field], textarea[data-field], select[data-field]')) handleInput(event.target)
  })
  journeyRoot.addEventListener('submit', (event) => {
    event.preventDefault()
    const screen = event.target.closest('.screen')
    captureMountedFields()
    if (!validateScreen(screen)) return
    if (screen.id === 'ch6-boundaries' && fieldValue('applicant.boundariesConfirmed') === 'change') {
      const field = screen.querySelector('[data-required-field="applicant.nonNegotiables"]')
      setError(field, 'Update the boundaries above, then choose Yes.')
      focusInvalid(field)
      return
    }
    goTo(nextFor(screen))
  })
}

export function initializeJourney(options) {
  journeyRoot = options.root
  screenHost = options.screenHost
  screenMarkup = options.screenMarkup
  bindEvents()
  const initial = screenMarkup.has(journeyStore.getState().currentScreen) ? journeyStore.getState().currentScreen : 'welcome'
  mountScreen(initial)
}
