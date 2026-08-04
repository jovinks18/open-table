import { siteConfig } from '../config/site.js'
import {
  APPLICATION_GATEWAY,
  APPLICATION_STEPS,
  CONSENT_SCHEMA,
  DATA_FIELDS,
  PHOTO_SLOTS,
} from './schema.js'
import {
  clampApplicationStep,
  GATEWAY_STEP,
  getProgressState,
} from './navigation.js'
import {
  isAtLeast25,
  sanitizeText,
  validateAgeRange,
  validateField,
  validatePhoto,
} from './validation.js'

const root = document.querySelector('#application-root')

if (!root) throw new Error('Application root was not found.')

const applicationData = Object.fromEntries(DATA_FIELDS.map((name) => [name, name === 'interested_in' ? [] : '']))
const consentData = Object.fromEntries(CONSENT_SCHEMA.map(({ name }) => [name, false]))
const uiState = {
  age_confirmation: false,
  cultural_background_optout: false,
  gender_identity_choice: '',
  gender_identity_other: '',
  interested_in_choices: [],
  interested_in_other: '',
}
const photoState = new Map()
const photoErrors = new Map()

let currentStep = GATEWAY_STEP
let currentErrors = {}
let underAgeExit = false
let previewComplete = false

function createElement(tag, className, text) {
  const element = document.createElement(tag)
  if (className) element.className = className
  if (text !== undefined) element.textContent = text
  return element
}

function createButton(text, className = 'button button-primary', type = 'button') {
  const button = createElement('button', className, text)
  button.type = type
  return button
}

function getStepValue(field) {
  if (field.uiOnly) return uiState[field.name]
  return applicationData[field.name]
}

function setStepValue(field, value) {
  if (field.uiOnly) uiState[field.name] = value
  else applicationData[field.name] = value
}

function fieldId(name, suffix = '') {
  return `application-${name}${suffix ? `-${suffix}` : ''}`
}

function addFieldError(container, field) {
  const message = currentErrors[field.name]
  if (!message) return

  container.classList.add('has-error')
  const error = createElement('p', 'application-field-error', message)
  error.id = fieldId(field.name, 'error')
  container.append(error)
}

function connectErrorDescription(control, field, helpId = '') {
  const ids = []
  if (helpId) ids.push(helpId)
  if (currentErrors[field.name]) ids.push(fieldId(field.name, 'error'))
  if (ids.length) control.setAttribute('aria-describedby', ids.join(' '))
  if (currentErrors[field.name]) control.setAttribute('aria-invalid', 'true')
}

function addHelpText(container, field) {
  if (!field.helpText) return ''
  const help = createElement('p', 'application-field-help', field.helpText)
  help.id = fieldId(field.name, 'help')
  container.append(help)
  return help.id
}

function buildTextControl(field) {
  const container = createElement('div', 'application-field')
  if (field.group) container.dataset.group = field.group

  const label = createElement('label', 'application-label', field.label)
  label.htmlFor = fieldId(field.name)
  if (!field.required) label.append(createElement('span', 'application-optional', ' Optional'))

  const control = document.createElement(field.type === 'textarea' ? 'textarea' : 'input')
  control.id = fieldId(field.name)
  control.name = field.name
  control.value = getStepValue(field) || ''
  control.required = Boolean(field.required)

  if (field.type === 'textarea') control.rows = field.rows || 4
  else control.type = field.type
  if (field.maxLength) control.maxLength = field.maxLength
  if (field.min !== undefined) control.min = String(field.min)
  if (field.max !== undefined) control.max = String(field.max)
  if (field.autocomplete) control.autocomplete = field.autocomplete
  if (field.inputmode) control.inputMode = field.inputmode
  if (field.placeholder) control.placeholder = field.placeholder

  container.append(label, control)
  const helpId = addHelpText(container, field)

  let counter
  if (field.maxLength && field.type === 'textarea') {
    counter = createElement('p', 'application-counter')
    counter.textContent = `${control.value.length} / ${field.maxLength}`
    counter.id = fieldId(field.name, 'counter')
    container.append(counter)
  }

  connectErrorDescription(control, field, helpId || counter?.id)
  control.addEventListener('input', () => {
    setStepValue(field, control.value)
    if (counter) counter.textContent = `${control.value.length} / ${field.maxLength}`
  })

  addFieldError(container, field)
  return container
}

function buildCheckbox(field) {
  const container = createElement('div', 'application-field application-field-checkbox')
  const label = createElement('label', 'application-choice application-choice-single')
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.name = field.name
  input.id = fieldId(field.name)
  input.checked = Boolean(getStepValue(field))
  input.required = Boolean(field.required)
  connectErrorDescription(input, field)
  input.addEventListener('change', () => setStepValue(field, input.checked))
  label.append(input, createElement('span', '', field.label))
  container.append(label)
  addFieldError(container, field)
  return container
}

function buildChoiceGroup(field, { multiple = false } = {}) {
  const fieldset = createElement('fieldset', 'application-field application-fieldset')
  const legend = createElement('legend', 'application-label', field.label)
  if (!field.required) legend.append(createElement('span', 'application-optional', ' Optional'))
  fieldset.append(legend)

  const choices = createElement('div', 'application-choices')
  const stored = getStepValue(field)

  field.options.forEach(([value, labelText]) => {
    const label = createElement('label', 'application-choice')
    const input = document.createElement('input')
    input.type = multiple ? 'checkbox' : 'radio'
    input.name = field.name
    input.value = value
    input.id = fieldId(field.name, value)
    input.checked = multiple ? (stored || []).includes(value) : stored === value
    connectErrorDescription(input, field)
    input.addEventListener('change', () => {
      if (multiple) {
        const selected = [...choices.querySelectorAll(`input[name="${field.name}"]:checked`)].map((item) => item.value)
        setStepValue(field, selected)
      } else {
        setStepValue(field, input.value)
      }
    })
    label.append(input, createElement('span', '', labelText))
    choices.append(label)
  })

  fieldset.append(choices)
  addFieldError(fieldset, field)
  return fieldset
}

function buildSelect(field) {
  const container = createElement('div', 'application-field')
  const label = createElement('label', 'application-label', field.label)
  label.htmlFor = fieldId(field.name)
  if (!field.required) label.append(createElement('span', 'application-optional', ' Optional'))

  const select = document.createElement('select')
  select.id = fieldId(field.name)
  select.name = field.name
  select.required = Boolean(field.required)

  const prompt = document.createElement('option')
  prompt.value = ''
  prompt.textContent = field.required ? 'Select an option' : 'Prefer not to answer'
  select.append(prompt)

  field.options.forEach(([value, text]) => {
    const option = document.createElement('option')
    option.value = value
    option.textContent = text
    option.selected = getStepValue(field) === value
    select.append(option)
  })

  connectErrorDescription(select, field)
  select.addEventListener('change', () => setStepValue(field, select.value))
  container.append(label, select)
  addFieldError(container, field)
  return container
}

function buildTextWithOptOut(field) {
  const container = buildTextControl(field)
  const input = container.querySelector('input')
  const option = createElement('label', 'application-choice application-choice-inline')
  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.checked = uiState.cultural_background_optout
  checkbox.addEventListener('change', () => {
    uiState.cultural_background_optout = checkbox.checked
    input.disabled = checkbox.checked
    if (checkbox.checked) {
      applicationData.cultural_background = 'Prefer not to say'
      input.value = ''
    } else {
      applicationData.cultural_background = ''
      input.focus()
    }
  })
  input.disabled = checkbox.checked
  option.append(checkbox, createElement('span', '', field.optOutLabel))
  container.append(option)
  return container
}

function buildChoiceWithOther(field) {
  const fieldset = createElement('fieldset', 'application-field application-fieldset')
  const legend = createElement('legend', 'application-label', field.label)
  fieldset.append(legend)
  const choices = createElement('div', 'application-choices')
  const selectedChoice = uiState.gender_identity_choice || (applicationData.gender_identity.startsWith('Self-described:') ? 'self_describe' : applicationData.gender_identity)

  const otherWrap = createElement('div', 'application-other-field')
  const otherLabel = createElement('label', 'application-label', 'Describe your gender identity')
  otherLabel.htmlFor = fieldId(field.name, 'other')
  const otherInput = document.createElement('input')
  otherInput.type = 'text'
  otherInput.id = fieldId(field.name, 'other')
  otherInput.maxLength = 100
  otherInput.value = uiState.gender_identity_other
  otherInput.addEventListener('input', () => {
    uiState.gender_identity_other = otherInput.value
    applicationData.gender_identity = `Self-described: ${otherInput.value}`
  })
  otherWrap.append(otherLabel, otherInput)

  field.options.forEach(([value, labelText]) => {
    const label = createElement('label', 'application-choice')
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = field.name
    input.value = value
    input.id = fieldId(field.name, value)
    input.checked = selectedChoice === value
    connectErrorDescription(input, field)
    input.addEventListener('change', () => {
      uiState.gender_identity_choice = value
      const isOther = value === 'self_describe'
      otherWrap.hidden = !isOther
      otherInput.disabled = !isOther
      applicationData.gender_identity = isOther ? `Self-described: ${uiState.gender_identity_other}` : value
      if (isOther) otherInput.focus()
    })
    label.append(input, createElement('span', '', labelText))
    choices.append(label)
  })

  const showOther = selectedChoice === 'self_describe'
  otherWrap.hidden = !showOther
  otherInput.disabled = !showOther
  fieldset.append(choices, otherWrap)
  addFieldError(fieldset, field)
  return fieldset
}

function buildCheckboxGroupWithOther(field) {
  const fieldset = createElement('fieldset', 'application-field application-fieldset')
  fieldset.append(createElement('legend', 'application-label', field.label))
  const choices = createElement('div', 'application-choices')
  const selected = uiState.interested_in_choices.length ? uiState.interested_in_choices : applicationData.interested_in.filter((value) => !value.startsWith('Self-described:'))

  const otherWrap = createElement('div', 'application-other-field')
  const otherLabel = createElement('label', 'application-label', 'Describe who you are interested in meeting')
  otherLabel.htmlFor = fieldId(field.name, 'other')
  const otherInput = document.createElement('input')
  otherInput.type = 'text'
  otherInput.id = fieldId(field.name, 'other')
  otherInput.maxLength = 100
  otherInput.value = uiState.interested_in_other

  function syncInterestedIn() {
    const values = [...uiState.interested_in_choices]
    if (values.includes('self_describe') && sanitizeText(uiState.interested_in_other)) {
      values.push(`Self-described: ${sanitizeText(uiState.interested_in_other)}`)
    }
    applicationData.interested_in = values.filter((value) => value !== 'self_describe')
  }

  otherInput.addEventListener('input', () => {
    uiState.interested_in_other = otherInput.value
    syncInterestedIn()
  })
  otherWrap.append(otherLabel, otherInput)

  field.options.forEach(([value, labelText]) => {
    const label = createElement('label', 'application-choice')
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.name = field.name
    input.value = value
    input.id = fieldId(field.name, value)
    input.checked = selected.includes(value)
    connectErrorDescription(input, field)
    input.addEventListener('change', () => {
      uiState.interested_in_choices = [...choices.querySelectorAll(`input[name="${field.name}"]:checked`)].map((item) => item.value)
      const showOther = uiState.interested_in_choices.includes('self_describe')
      otherWrap.hidden = !showOther
      otherInput.disabled = !showOther
      syncInterestedIn()
      if (showOther) otherInput.focus()
    })
    label.append(input, createElement('span', '', labelText))
    choices.append(label)
  })

  const showOther = selected.includes('self_describe')
  otherWrap.hidden = !showOther
  otherInput.disabled = !showOther
  fieldset.append(choices, otherWrap)
  addFieldError(fieldset, field)
  return fieldset
}

function buildField(field) {
  if (field.type === 'checkbox') return buildCheckbox(field)
  if (field.type === 'radio') return buildChoiceGroup(field)
  if (field.type === 'select') return buildSelect(field)
  if (field.type === 'text-with-optout') return buildTextWithOptOut(field)
  if (field.type === 'choice-with-other') return buildChoiceWithOther(field)
  if (field.type === 'checkbox-group-with-other') return buildCheckboxGroupWithOther(field)
  return buildTextControl(field)
}

function buildProgress() {
  const state = getProgressState(currentStep, APPLICATION_STEPS.length)
  if (!state) return null

  const wrapper = createElement('div', 'application-progress')
  const label = createElement('p', '', state.label)
  const progress = document.createElement('progress')
  progress.max = state.total
  progress.value = state.current
  progress.setAttribute('aria-label', state.ariaLabel)
  wrapper.append(label, progress)
  return wrapper
}

function buildErrorSummary() {
  const messages = Object.values(currentErrors)
  if (!messages.length) return null
  const summary = createElement('div', 'application-error-summary')
  summary.setAttribute('role', 'alert')
  summary.tabIndex = -1
  summary.append(createElement('h2', '', 'Please check the following.'))
  const list = document.createElement('ul')
  messages.forEach((message) => list.append(createElement('li', '', message)))
  summary.append(list)
  return summary
}

function focusScreenHeading() {
  window.requestAnimationFrame(() => root.querySelector('h1')?.focus({ preventScroll: true }))
}

function focusFirstError() {
  const firstName = Object.keys(currentErrors)[0]
  window.requestAnimationFrame(() => {
    const control = root.querySelector(`#${CSS.escape(fieldId(firstName))}, [name="${CSS.escape(firstName)}"]`)
    control?.focus({ preventScroll: false })
  })
}

function buildGatewayLinks() {
  const links = createElement('p', 'application-gateway-links')

  if (siteConfig.contactEmail) {
    const contact = createElement('a', '', 'Contact donna')
    contact.href = `mailto:${siteConfig.contactEmail}`
    links.append(contact)
  } else {
    const contactPlaceholder = createElement('span', 'application-legal-placeholder', 'Contact method pending launch')
    contactPlaceholder.setAttribute('aria-disabled', 'true')
    links.append(contactPlaceholder)
  }

  links.append(document.createTextNode(' · '))

  if (siteConfig.privacyNoticeUrl) {
    const privacy = createElement('a', '', 'Privacy Notice')
    privacy.href = siteConfig.privacyNoticeUrl
    links.append(privacy)
  } else {
    const privacyPlaceholder = createElement('span', 'application-legal-placeholder', 'Privacy Notice (placeholder)')
    privacyPlaceholder.setAttribute('aria-disabled', 'true')
    links.append(privacyPlaceholder)
  }

  return links
}

function buildGatewayItems(items, className, ordered = false) {
  const list = createElement(ordered ? 'ol' : 'ul', className)
  items.forEach(({ title, copy }) => {
    const item = document.createElement('li')
    item.append(createElement('h3', '', title), createElement('p', '', copy))
    list.append(item)
  })
  return list
}

function buildGateway() {
  const screen = createElement('section', 'application-screen application-gateway')
  screen.setAttribute('aria-labelledby', 'application-heading')

  const top = createElement('div', 'application-gateway-top')
  const introduction = createElement('div', 'application-gateway-introduction')
  introduction.append(createElement('p', 'eyebrow', APPLICATION_GATEWAY.eyebrow))
  const heading = createElement('h1', '', APPLICATION_GATEWAY.title)
  heading.id = 'application-heading'
  heading.tabIndex = -1
  introduction.append(heading)
  introduction.append(createElement('p', 'application-lead', APPLICATION_GATEWAY.supportingCopy))
  introduction.append(createElement('p', 'application-gateway-preparation', APPLICATION_GATEWAY.preparation))

  const actions = createElement('div', 'application-actions')
  const begin = createButton('Begin application')
  begin.addEventListener('click', () => goToStep(0))
  const back = createElement('a', 'text-link', 'Back to donna')
  back.href = '/index.html'
  actions.append(begin, back)
  introduction.append(actions)
  introduction.append(createElement('p', 'application-gateway-disclaimer', APPLICATION_GATEWAY.pilotDisclaimer))

  const checklist = createElement('aside', 'application-gateway-checklist')
  checklist.setAttribute('aria-labelledby', 'before-you-begin-title')
  const checklistTitle = createElement('h2', '', 'Before you begin')
  checklistTitle.id = 'before-you-begin-title'
  checklist.append(checklistTitle, createElement('p', '', 'Please have ready:'))
  const checklistItems = createElement('ul', '')
  APPLICATION_GATEWAY.checklist.forEach((item) => checklistItems.append(createElement('li', '', item)))
  checklist.append(checklistItems)
  top.append(introduction, checklist)
  screen.append(top)

  const next = createElement('section', 'application-gateway-section application-gateway-next')
  next.append(createElement('h2', 'application-gateway-label', 'WHAT HAPPENS NEXT'))
  next.append(buildGatewayItems(APPLICATION_GATEWAY.nextSteps, 'application-gateway-process', true))
  screen.append(next)

  const control = createElement('section', 'application-gateway-section application-gateway-control')
  control.append(createElement('h2', 'application-gateway-label', 'YOU STAY IN CONTROL'))
  control.append(buildGatewayItems(APPLICATION_GATEWAY.controls, 'application-gateway-assurances'))
  control.append(createElement('p', 'application-gateway-withdrawal', APPLICATION_GATEWAY.withdrawalCopy))
  control.append(buildGatewayLinks())
  screen.append(control)
  return screen
}

function validateCurrentStep() {
  const step = APPLICATION_STEPS[currentStep]
  const errors = {}

  step.fields.forEach((field) => {
    const value = getStepValue(field)
    const error = validateField(field, value)
    if (error) errors[field.name] = error
    else if (!field.uiOnly && typeof value === 'string') applicationData[field.name] = sanitizeText(value)
  })

  if (step.id === 'eligibility' && !errors.date_of_birth && !isAtLeast25(applicationData.date_of_birth)) {
    currentErrors = {}
    underAgeExit = true
    renderApplication()
    return false
  }

  if (step.id === 'preferences') {
    const ageError = validateAgeRange(applicationData.preferred_age_min, applicationData.preferred_age_max)
    if (ageError) errors.preferred_age_max = ageError

    if (uiState.gender_identity_choice === 'self_describe' && !sanitizeText(uiState.gender_identity_other)) {
      errors.gender_identity = 'Describe your gender identity or choose another option.'
    }
    if (uiState.interested_in_choices.includes('self_describe') && !sanitizeText(uiState.interested_in_other)) {
      errors.interested_in = 'Describe who you are interested in meeting or choose another option.'
    }
  }

  currentErrors = errors
  if (Object.keys(errors).length) {
    renderApplication({ focusHeading: false })
    focusFirstError()
    return false
  }

  return true
}

function buildStandardStep() {
  const step = APPLICATION_STEPS[currentStep]
  const form = createElement('form', 'application-screen application-form')
  form.noValidate = true
  form.setAttribute('aria-labelledby', 'application-heading')
  form.append(buildProgress())
  const heading = createElement('h1', '', step.title)
  heading.id = 'application-heading'
  heading.tabIndex = -1
  form.append(heading)
  if (step.description) form.append(createElement('p', 'application-lead', step.description))

  const errorSummary = buildErrorSummary()
  if (errorSummary) form.append(errorSummary)

  const fields = createElement('div', 'application-fields')
  step.fields.forEach((field) => fields.append(buildField(field)))
  form.append(fields)

  const actions = createElement('div', 'application-navigation')
  const back = createButton('Back', 'button application-button-secondary')
  back.addEventListener('click', () => goToStep(currentStep - 1))
  const next = createButton('Continue', 'button button-primary', 'submit')
  actions.append(back, next)
  form.append(actions)

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (validateCurrentStep()) goToStep(currentStep + 1)
  })
  return form
}

function buildUnderAgeExit() {
  const screen = createElement('section', 'application-screen application-exit-state')
  screen.append(buildProgress())
  const heading = createElement('h1', '', 'donna’s current pilot is limited to people aged 25 and above.')
  heading.tabIndex = -1
  screen.append(heading)
  screen.append(createElement('p', 'application-lead', 'We have not collected the remainder of your application information.'))
  const actions = createElement('div', 'application-actions')
  const edit = createButton('Correct date of birth', 'button application-button-secondary')
  edit.addEventListener('click', () => {
    underAgeExit = false
    renderApplication()
  })
  const leave = createElement('a', 'button button-primary', 'Return to donna')
  leave.href = '/index.html'
  actions.append(edit, leave)
  screen.append(actions)
  return screen
}

function releasePhoto(slotId) {
  const current = photoState.get(slotId)
  if (current?.url) URL.revokeObjectURL(current.url)
  photoState.delete(slotId)
}

function buildPhotoSlot(slot) {
  const item = createElement('div', 'application-photo-slot')
  const heading = createElement('h2', '', slot.label)
  if (!slot.required) heading.append(createElement('span', 'application-optional', ' Optional'))
  item.append(heading)

  const stored = photoState.get(slot.id)
  if (stored) {
    const preview = createElement('div', 'application-photo-preview')
    const image = document.createElement('img')
    image.src = stored.url
    image.alt = `Local preview of ${slot.label.toLowerCase()}`
    const details = createElement('div', 'application-photo-details')
    details.append(createElement('p', '', stored.file.name))
    const remove = createButton('Remove', 'application-inline-button')
    remove.addEventListener('click', () => {
      releasePhoto(slot.id)
      renderApplication({ focusHeading: false })
    })
    details.append(remove)
    preview.append(image, details)
    item.append(preview)
  }

  const input = document.createElement('input')
  input.type = 'file'
  input.id = fieldId(slot.id)
  input.name = slot.id
  input.accept = 'image/jpeg,image/png,image/webp'
  const label = createElement('label', 'button application-button-secondary application-file-label', stored ? 'Replace photograph' : 'Choose photograph')
  label.htmlFor = input.id
  item.append(input, label)
  item.append(createElement('p', 'application-field-help', 'JPEG, PNG or WebP. Maximum 10 MB. Kept in this browser tab only.'))

  const error = photoErrors.get(slot.id) || currentErrors[slot.id]
  if (error) {
    const errorElement = createElement('p', 'application-field-error', error)
    errorElement.id = fieldId(slot.id, 'error')
    input.setAttribute('aria-describedby', errorElement.id)
    input.setAttribute('aria-invalid', 'true')
    item.append(errorElement)
  }

  input.addEventListener('change', () => {
    const [file] = input.files
    if (!file) return
    const fileError = validatePhoto(file)
    if (fileError) {
      photoErrors.set(slot.id, fileError)
      input.value = ''
      renderApplication({ focusHeading: false })
      return
    }

    photoErrors.delete(slot.id)
    releasePhoto(slot.id)
    photoState.set(slot.id, { file, url: URL.createObjectURL(file) })
    renderApplication({ focusHeading: false })
  })
  return item
}

function validatePhotographs() {
  const errors = {}
  PHOTO_SLOTS.forEach((slot) => {
    if (slot.required && !photoState.has(slot.id)) errors[slot.id] = `${slot.label} is required.`
  })
  currentErrors = errors
  if (Object.keys(errors).length) {
    renderApplication({ focusHeading: false })
    focusFirstError()
    return false
  }
  return true
}

function buildPhotographs() {
  const step = APPLICATION_STEPS[currentStep]
  const screen = createElement('section', 'application-screen application-form')
  screen.append(buildProgress())
  const heading = createElement('h1', '', step.title)
  heading.tabIndex = -1
  screen.append(heading, createElement('p', 'application-lead', step.description))
  const errorSummary = buildErrorSummary()
  if (errorSummary) screen.append(errorSummary)
  const grid = createElement('div', 'application-photo-grid')
  PHOTO_SLOTS.forEach((slot) => grid.append(buildPhotoSlot(slot)))
  screen.append(grid)

  const actions = createElement('div', 'application-navigation')
  const back = createButton('Back', 'button application-button-secondary')
  back.addEventListener('click', () => goToStep(currentStep - 1))
  const next = createButton('Continue')
  next.addEventListener('click', () => {
    if (validatePhotographs()) goToStep(currentStep + 1)
  })
  actions.append(back, next)
  screen.append(actions)
  return screen
}

function displayValue(field, value) {
  if (Array.isArray(value)) {
    if (!value.length) return 'Not provided'
    return value.map((item) => field.options?.find(([option]) => option === item)?.[1] || item).join(', ')
  }
  if (value === '' || value === null || value === undefined) return 'Not provided'
  if (field.options) return field.options.find(([option]) => option === value)?.[1] || value
  return value
}

function buildReviewGroup(step, stepIndex) {
  const section = createElement('section', 'application-review-group')
  const header = createElement('div', 'application-review-header')
  header.append(createElement('h2', '', step.title.replace(/[.]$/, '')))
  const edit = createButton('Edit', 'application-inline-button')
  edit.setAttribute('aria-label', `Edit ${step.title}`)
  edit.addEventListener('click', () => goToStep(stepIndex))
  header.append(edit)
  section.append(header)

  const list = document.createElement('dl')
  step.fields.filter((field) => !field.uiOnly).forEach((field) => {
    list.append(createElement('dt', '', field.label), createElement('dd', '', displayValue(field, applicationData[field.name])))
  })
  section.append(list)
  return section
}

function buildPhotoReview() {
  const section = createElement('section', 'application-review-group')
  const header = createElement('div', 'application-review-header')
  header.append(createElement('h2', '', 'Photographs'))
  const edit = createButton('Edit', 'application-inline-button')
  edit.setAttribute('aria-label', 'Edit photographs')
  edit.addEventListener('click', () => goToStep(4))
  header.append(edit)
  section.append(header)
  const list = document.createElement('ul')
  PHOTO_SLOTS.forEach((slot) => {
    const stored = photoState.get(slot.id)
    list.append(createElement('li', '', `${slot.label}: ${stored?.file.name || 'Not provided'}`))
  })
  section.append(list)
  return section
}

function buildLegalLinks() {
  const row = createElement('p', 'application-legal-links')
  const documents = [
    ['Privacy Notice', siteConfig.privacyNoticeUrl],
    ['Pilot Terms', siteConfig.pilotTermsUrl],
  ]
  documents.forEach(([label, url], index) => {
    if (index) row.append(document.createTextNode(' · '))
    if (url) {
      const link = createElement('a', '', label)
      link.href = url
      row.append(link)
    } else {
      const placeholder = createElement('span', 'application-legal-placeholder', `${label} (placeholder)`)
      placeholder.setAttribute('aria-disabled', 'true')
      row.append(placeholder)
    }
  })
  return row
}

function validateConsents() {
  const errors = {}
  CONSENT_SCHEMA.forEach((consent) => {
    if (consent.required && !consentData[consent.name]) errors[`consent_${consent.name}`] = consent.label
  })
  currentErrors = errors
  return Object.keys(errors).length === 0
}

function buildConsentList() {
  const wrapper = createElement('fieldset', 'application-consents')
  wrapper.append(createElement('legend', '', 'Consent and acknowledgements'))
  CONSENT_SCHEMA.forEach((consent) => {
    if (consent.optional) wrapper.append(createElement('p', 'application-consent-separator', 'Optional'))
    const label = createElement('label', 'application-choice application-consent')
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.name = `consent_${consent.name}`
    checkbox.id = fieldId(`consent_${consent.name}`)
    checkbox.checked = consentData[consent.name]
    checkbox.addEventListener('change', () => { consentData[consent.name] = checkbox.checked })
    label.append(checkbox, createElement('span', '', consent.label))
    wrapper.append(label)
    if (currentErrors[`consent_${consent.name}`]) wrapper.append(createElement('p', 'application-field-error', 'This acknowledgement is required.'))
    if (consent.legal) wrapper.append(buildLegalLinks())
  })
  return wrapper
}

function buildPreviewComplete() {
  const screen = createElement('section', 'application-screen application-preview-state')
  screen.setAttribute('aria-live', 'polite')
  screen.append(createElement('p', 'eyebrow', 'Preview complete'))
  const heading = createElement('h1', '', 'This is a UI preview.')
  heading.tabIndex = -1
  screen.append(heading)
  screen.append(createElement('p', 'application-lead', 'Your information and photographs have not been submitted or stored.'))
  const review = createButton('Return to review', 'button application-button-secondary')
  review.addEventListener('click', () => {
    previewComplete = false
    renderApplication()
  })
  screen.append(review)
  return screen
}

function buildReview() {
  if (previewComplete) return buildPreviewComplete()

  const step = APPLICATION_STEPS[currentStep]
  const form = createElement('form', 'application-screen application-review')
  form.noValidate = true
  form.append(buildProgress())
  const heading = createElement('h1', '', step.title)
  heading.tabIndex = -1
  form.append(heading, createElement('p', 'application-lead', step.description))
  const errorSummary = buildErrorSummary()
  if (errorSummary) form.append(errorSummary)

  const summary = createElement('div', 'application-review-sections')
  APPLICATION_STEPS.slice(0, 4).forEach((reviewStep, index) => summary.append(buildReviewGroup(reviewStep, index)))
  summary.append(buildPhotoReview())
  form.append(summary)

  const permission = createElement('p', 'application-permission-notice', 'Submitting an application does not give donna permission to send your profile to another applicant. donna will request your permission before every proposed introduction.')
  form.append(permission, buildConsentList())

  if (siteConfig.applicationMode === 'live' && (!siteConfig.privacyNoticeUrl || !siteConfig.pilotTermsUrl)) {
    form.append(createElement('p', 'application-configuration-notice', 'Live submission is unavailable until the Privacy Notice and Pilot Terms are configured.'))
  }

  const actions = createElement('div', 'application-navigation')
  const back = createButton('Back', 'button application-button-secondary')
  back.addEventListener('click', () => goToStep(currentStep - 1))
  const submitLabel = siteConfig.applicationMode === 'preview' ? 'Test application' : 'Submission unavailable'
  const submit = createButton(submitLabel, 'button button-primary', 'submit')
  if (siteConfig.applicationMode !== 'preview') submit.disabled = true
  actions.append(back, submit)
  form.append(actions)

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (!validateConsents()) {
      renderApplication({ focusHeading: false })
      focusFirstError()
      return
    }
    if (siteConfig.applicationMode !== 'preview') return
    previewComplete = true
    currentErrors = {}
    renderApplication()
  })
  return form
}

function goToStep(stepIndex) {
  currentStep = clampApplicationStep(stepIndex, APPLICATION_STEPS.length)
  currentErrors = {}
  underAgeExit = false
  previewComplete = false
  renderApplication()
  window.scrollTo({ top: 0, behavior: 'auto' })
}

function renderApplication({ focusHeading = true } = {}) {
  let screen
  if (underAgeExit) screen = buildUnderAgeExit()
  else if (currentStep === GATEWAY_STEP) screen = buildGateway()
  else if (APPLICATION_STEPS[currentStep].id === 'photographs') screen = buildPhotographs()
  else if (APPLICATION_STEPS[currentStep].id === 'review') screen = buildReview()
  else screen = buildStandardStep()

  root.replaceChildren(screen)
  root.classList.toggle('is-gateway', currentStep === GATEWAY_STEP)
  if (focusHeading) focusScreenHeading()
}

window.addEventListener('beforeunload', () => {
  photoState.forEach(({ url }) => URL.revokeObjectURL(url))
})

renderApplication()
window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
