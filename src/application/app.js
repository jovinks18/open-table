import { siteConfig } from '../config/site.js'
import {
  APPLICATION_GATEWAY,
  APPLICATION_STEPS,
  CONSENT_SCHEMA,
  DATA_FIELDS,
  PHOTO_SHARE_CONSENT,
  PHOTO_SLOTS,
} from './schema.js'
import { clampApplicationStep, GATEWAY_STEP, getProgressState } from './navigation.js'
import {
  deriveHeightCm,
  isAtLeast25,
  isFieldVisible,
  sanitizeText,
  UNDER_25_MESSAGE,
  validateAgeRange,
  validateField,
  validatePhoto,
} from './validation.js'

const root = document.querySelector('#application-root')
if (!root) throw new Error('Application root was not found.')

const ARRAY_FIELDS = new Set(['languages', 'citiesConsidered', 'nonNegotiables'])
const applicationData = Object.fromEntries(DATA_FIELDS.map((name) => [name, ARRAY_FIELDS.has(name) ? [] : '']))
const uiState = { heightFeet: '', heightInches: '' }

const consentData = Object.fromEntries(CONSENT_SCHEMA.map(({ name }) => [name, false]))
const photoState = new Map()
const photoErrors = new Map()

let currentStep = GATEWAY_STEP
let currentErrors = {}
let previewComplete = false
const attemptedSections = new Set()

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

function fieldId(name, suffix = '') {
  return `application-${name}${suffix ? `-${suffix}` : ''}`
}

function addFieldError(container, fieldName) {
  if (!currentErrors[fieldName]) return
  container.classList.add('has-error')
  const error = createElement('p', 'application-field-error', currentErrors[fieldName])
  error.id = fieldId(fieldName, 'error')
  container.append(error)
}

function connectError(control, fieldName, describedBy = '') {
  const ids = describedBy ? [describedBy] : []
  if (currentErrors[fieldName]) {
    ids.push(fieldId(fieldName, 'error'))
    control.setAttribute('aria-invalid', 'true')
  }
  if (ids.length) control.setAttribute('aria-describedby', ids.join(' '))
}

function addHelpText(container, field) {
  if (!field.helpText) return ''
  const help = createElement('p', 'application-field-help', field.helpText)
  help.id = fieldId(field.name, 'help')
  container.append(help)
  return help.id
}

function optionalLabel(field) {
  return field.required ? null : createElement('span', 'application-optional', ' Optional')
}

function refreshValidationAfterInteraction() {
  if (!attemptedSections.has(currentStep)) return
  validateCurrentStep({ focusErrors: false, refresh: true })
}

function attachDeferredValidation(control) {
  control.addEventListener('blur', refreshValidationAfterInteraction)
}

function buildTextControl(field) {
  const container = createElement('div', 'application-field')
  const label = createElement('label', 'application-label', field.label)
  label.htmlFor = fieldId(field.name)
  const optional = optionalLabel(field)
  if (optional) label.append(optional)

  const control = document.createElement(field.type === 'textarea' ? 'textarea' : 'input')
  control.id = fieldId(field.name)
  control.name = field.name
  control.value = applicationData[field.name] ?? ''
  control.required = Boolean(field.required)
  if (field.type !== 'textarea') control.type = field.type
  if (field.type === 'textarea') control.rows = field.rows || 4
  if (field.maxLength) control.maxLength = field.maxLength
  if (field.min !== undefined) control.min = field.min
  if (field.max !== undefined) control.max = field.max
  if (field.autocomplete) control.autocomplete = field.autocomplete
  if (field.inputmode) control.inputMode = field.inputmode
  if (field.placeholder) control.placeholder = field.placeholder

  container.append(label, control)
  const helpId = addHelpText(container, field)
  let counter
  if (field.type === 'textarea') {
    counter = createElement('p', 'application-counter', `${field.maxLength - control.value.length} characters remaining`)
    counter.id = fieldId(field.name, 'counter')
    container.append(counter)
  }

  let heightOutput
  if (field.displayHeight) {
    heightOutput = createElement('output', 'application-height-output')
    heightOutput.htmlFor = control.id
    container.append(heightOutput)
    updateHeightOutput(heightOutput, control.value)
  }

  connectError(control, field.name, [helpId, counter?.id].filter(Boolean).join(' '))
  control.addEventListener('input', () => {
    applicationData[field.name] = control.value
    if (counter) counter.textContent = `${field.maxLength - control.value.length} characters remaining`
    if (heightOutput) updateHeightOutput(heightOutput, control.value)
  })
  attachDeferredValidation(control)
  addFieldError(container, field.name)
  return container
}

function updateHeightOutput(output, rawValue) {
  const centimetres = Number(rawValue)
  if (!Number.isFinite(centimetres) || !rawValue) {
    output.textContent = ''
    return
  }
  const totalInches = Math.round(centimetres / 2.54)
  output.textContent = `${centimetres} cm · ${Math.floor(totalInches / 12)} ft ${totalInches % 12} in`
}

function buildSingleSelect(field) {
  if (field.options.length > 5) return buildSearchableCombobox(field)
  const fieldset = createElement('fieldset', 'application-field application-fieldset')
  const legend = createElement('legend', 'application-label', field.label)
  const optional = optionalLabel(field)
  if (optional) legend.append(optional)
  fieldset.append(legend)
  const helpId = addHelpText(fieldset, field)
  const choices = createElement('div', 'application-choices')
  choices.dataset.optionCount = String(field.options.length)
  if (field.options.length >= 5) choices.classList.add('application-choices-many')

  field.options.forEach(([value, labelText]) => {
    const label = createElement('label', 'application-choice')
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = field.name
    input.value = value
    input.id = fieldId(field.name, value)
    input.checked = applicationData[field.name] === value
    connectError(input, field.name, helpId)
    input.addEventListener('change', () => {
      applicationData[field.name] = value
      handleChoiceChange(field)
    })
    label.append(input, createElement('span', '', labelText))
    choices.append(label)
  })
  fieldset.append(choices)
  addFieldError(fieldset, field.name)
  return fieldset
}

function buildMultiSelect(field) {
  if (field.options.length > 5) return buildSearchableCombobox(field, { multiple: true })
  const fieldset = createElement('fieldset', 'application-field application-fieldset')
  const legend = createElement('legend', 'application-label', field.label)
  fieldset.append(legend)
  const selected = applicationData[field.name]
  const choices = createElement('div', 'application-choices')
  choices.dataset.optionCount = String(field.options.length)
  if (field.options.length >= 5) choices.classList.add('application-choices-many')

  field.options.forEach(([value, labelText]) => {
    const label = createElement('label', 'application-choice')
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.name = field.name
    input.value = value
    input.id = fieldId(field.name, value)
    input.checked = selected.includes(value)
    connectError(input, field.name)
    input.addEventListener('change', () => {
      applicationData[field.name] = input.checked
        ? [...selected, value]
        : selected.filter((item) => item !== value)
      handleChoiceChange(field)
    })
    label.append(input, createElement('span', '', labelText))
    choices.append(label)
  })
  if (field.options.length) fieldset.append(choices)

  addFieldError(fieldset, field.name)
  return fieldset
}

function handleChoiceChange(field) {
  const hasConditional = APPLICATION_STEPS[currentStep].fields.some(({ condition }) => condition?.field === field.name)
  if (attemptedSections.has(currentStep)) validateCurrentStep({ focusErrors: false, refresh: true })
  else if (hasConditional) renderApplication({ focusHeading: false })
}

function buildSearchableCombobox(field, { multiple = false } = {}) {
  const container = createElement('div', 'application-field application-combobox-field')
  const label = createElement('label', 'application-label', field.label)
  label.htmlFor = fieldId(field.name)
  container.append(label)
  const helpId = addHelpText(container, field)

  const selected = multiple ? applicationData[field.name] : [applicationData[field.name]].filter(Boolean)
  if (multiple && selected.length) container.append(buildSelectedOptions(field, selected))

  const combobox = createElement('div', 'application-combobox')
  const input = document.createElement('input')
  const listbox = createElement('div', 'application-combobox-list')
  const listboxId = fieldId(field.name, 'listbox')
  input.type = 'text'
  input.id = fieldId(field.name)
  input.name = `${field.name}Search`
  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-autocomplete', 'list')
  input.setAttribute('aria-controls', listboxId)
  input.setAttribute('aria-expanded', 'false')
  input.autocomplete = 'off'
  if (!multiple && selected.length) input.value = field.options.find(([value]) => value === selected[0])?.[1] || ''
  listbox.id = listboxId
  listbox.setAttribute('role', 'listbox')
  if (multiple) listbox.setAttribute('aria-multiselectable', 'true')
  listbox.hidden = true
  connectError(input, field.name, helpId)

  let visibleOptions = field.options
  let activeIndex = 0

  function renderOptions() {
    listbox.replaceChildren()
    visibleOptions.forEach(([value, optionLabel], index) => {
      const option = createElement('button', 'application-combobox-option', optionLabel)
      option.type = 'button'
      option.id = fieldId(field.name, `option-${value}`)
      option.setAttribute('role', 'option')
      option.setAttribute('aria-selected', String(selected.includes(value)))
      option.tabIndex = -1
      if (index === activeIndex) option.classList.add('is-active')
      option.addEventListener('mousedown', (event) => event.preventDefault())
      option.addEventListener('click', () => choose(value, optionLabel))
      listbox.append(option)
    })
    const active = listbox.children[activeIndex]
    if (active) input.setAttribute('aria-activedescendant', active.id)
    else input.removeAttribute('aria-activedescendant')
  }

  function open() {
    listbox.hidden = false
    input.setAttribute('aria-expanded', 'true')
    renderOptions()
  }

  function close() {
    listbox.hidden = true
    input.setAttribute('aria-expanded', 'false')
    input.removeAttribute('aria-activedescendant')
  }

  function choose(value, optionLabel) {
    if (multiple) {
      applicationData[field.name] = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
      input.value = ''
    } else {
      applicationData[field.name] = value
      input.value = optionLabel
    }
    handleChoiceChange(field)
    if (!multiple && !attemptedSections.has(currentStep)) close()
    else if (!APPLICATION_STEPS[currentStep].fields.some(({ condition }) => condition?.field === field.name)) renderApplication({ focusHeading: false })
  }

  input.addEventListener('focus', () => {
    if (!multiple) input.select()
    visibleOptions = field.options
    activeIndex = Math.max(0, visibleOptions.findIndex(([value]) => value === selected[0]))
    open()
  })
  input.addEventListener('input', () => {
    const query = input.value.toLocaleLowerCase()
    visibleOptions = field.options.filter(([, optionLabel]) => optionLabel.toLocaleLowerCase().includes(query))
    activeIndex = 0
    open()
  })
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (listbox.hidden) open()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      activeIndex = Math.max(0, Math.min(visibleOptions.length - 1, activeIndex + direction))
      renderOptions()
    } else if (event.key === 'Enter' && !listbox.hidden && visibleOptions[activeIndex]) {
      event.preventDefault()
      choose(...visibleOptions[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  })
  input.addEventListener('blur', () => {
    close()
    if (!multiple) input.value = field.options.find(([value]) => value === applicationData[field.name])?.[1] || ''
    refreshValidationAfterInteraction()
  })
  renderOptions()
  combobox.append(input, listbox)
  container.append(combobox)
  addFieldError(container, field.name)
  return container
}

function buildSelectedOptions(field, selected) {
  const list = createElement('ul', 'application-entry-list')
  selected.forEach((value) => {
    const optionLabel = field.options.find(([key]) => key === value)?.[1] || value
    const item = document.createElement('li')
    item.append(createElement('span', '', optionLabel))
    const remove = createButton('Remove', 'application-inline-button')
    remove.setAttribute('aria-label', `Remove ${optionLabel}`)
    remove.addEventListener('click', () => {
      applicationData[field.name] = applicationData[field.name].filter((itemValue) => itemValue !== value)
      handleChoiceChange(field)
      if (!attemptedSections.has(currentStep)) renderApplication({ focusHeading: false })
    })
    item.append(remove)
    list.append(item)
  })
  return list
}

function buildHeightControl(field) {
  const fieldset = createElement('fieldset', 'application-field application-fieldset application-paired-field')
  fieldset.append(createElement('legend', 'application-label', field.label))
  const row = createElement('div', 'application-paired-controls')
  const output = createElement('output', 'application-height-output')
  const controls = [
    ['heightFeet', ['4', '5', '6', '7'], 'ft'],
    ['heightInches', Array.from({ length: 12 }, (_, index) => String(index)), 'in'],
  ]

  function deriveHeight() {
    applicationData.heightCm = deriveHeightCm(uiState.heightFeet, uiState.heightInches) ?? ''
    output.textContent = applicationData.heightCm ? `${applicationData.heightCm} cm` : ''
    refreshValidationAfterInteraction()
  }

  controls.forEach(([name, options, suffix]) => {
    const wrapper = createElement('label', 'application-suffixed-select')
    const select = document.createElement('select')
    select.id = fieldId(name)
    select.name = name
    select.setAttribute('aria-label', `Height ${suffix}`)
    const prompt = document.createElement('option')
    prompt.value = ''
    prompt.textContent = ''
    select.append(prompt)
    options.forEach((value) => {
      const option = document.createElement('option')
      option.value = value
      option.textContent = value
      option.selected = uiState[name] === value
      select.append(option)
    })
    connectError(select, field.name)
    select.addEventListener('change', () => {
      uiState[name] = select.value
      deriveHeight()
    })
    wrapper.append(select, createElement('span', '', suffix))
    row.append(wrapper)
  })
  output.textContent = applicationData.heightCm ? `${applicationData.heightCm} cm` : ''
  fieldset.append(row, output)
  addFieldError(fieldset, field.name)
  return fieldset
}

function buildAgeSelectPair(fromField, toField) {
  const fieldset = createElement('fieldset', 'application-field application-fieldset application-paired-field')
  fieldset.append(createElement('legend', 'application-label', fromField.groupLabel))
  const row = createElement('div', 'application-paired-controls')
  ;[fromField, toField].forEach((field) => {
    const label = createElement('label', 'application-paired-select', field.label)
    label.htmlFor = fieldId(field.name)
    const select = document.createElement('select')
    select.id = fieldId(field.name)
    select.name = field.name
    const prompt = document.createElement('option')
    prompt.value = ''
    prompt.textContent = ''
    select.append(prompt)
    field.options.forEach(([value, optionLabel]) => {
      const option = document.createElement('option')
      option.value = value
      option.textContent = optionLabel
      option.selected = applicationData[field.name] === value
      select.append(option)
    })
    connectError(select, 'ageRange')
    select.addEventListener('change', () => {
      applicationData[field.name] = select.value
      refreshValidationAfterInteraction()
    })
    label.append(select)
    row.append(label)
  })
  fieldset.append(row)
  addFieldError(fieldset, 'ageRange')
  return fieldset
}

function buildStringArray(field) {
  const fieldset = createElement('fieldset', 'application-field application-fieldset')
  const legend = createElement('legend', 'application-label', field.label)
  legend.append(createElement('span', 'application-optional', ' Optional'))
  fieldset.append(legend)
  const helpId = addHelpText(fieldset, field)
  const values = applicationData[field.name]
  const inputs = createElement('div', 'application-array-inputs')
  for (let index = 0; index < field.maxItems; index += 1) {
    const input = document.createElement('input')
    input.type = 'text'
    input.name = `${field.name}[${index}]`
    input.id = fieldId(field.name, index + 1)
    input.maxLength = field.maxLength
    input.value = values[index] || ''
    input.setAttribute('aria-label', `${field.label} ${index + 1}`)
    connectError(input, field.name, helpId)
    input.addEventListener('input', () => {
      const next = [...applicationData[field.name]]
      next[index] = input.value
      applicationData[field.name] = next
    })
    attachDeferredValidation(input)
    inputs.append(input)
  }
  fieldset.append(inputs)
  addFieldError(fieldset, field.name)
  return fieldset
}

function buildField(field) {
  if (field.type === 'single_select') return buildSingleSelect(field)
  if (field.type === 'multi_select') return buildMultiSelect(field)
  if (field.type === 'height') return buildHeightControl(field)
  if (field.type === 'string[]') return buildStringArray(field)
  return buildTextControl(field)
}

function buildProgress() {
  const state = getProgressState(currentStep, APPLICATION_STEPS)
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

function focusScreenHeading() {
  window.requestAnimationFrame(() => root.querySelector('h1')?.focus({ preventScroll: true }))
}

function focusFirstError() {
  const firstName = Object.keys(currentErrors)[0]
  window.requestAnimationFrame(() => {
    const targetName = firstName === 'ageRange' ? 'ageRangeMin' : firstName
    const control = root.querySelector(`#${CSS.escape(fieldId(targetName))}, [name^="${CSS.escape(targetName)}"]`)
    control?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    control?.focus({ preventScroll: true })
  })
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
  screen.append(createElement('p', 'eyebrow', APPLICATION_GATEWAY.eyebrow))
  const heading = createElement('h1', '', APPLICATION_GATEWAY.title)
  heading.id = 'application-heading'
  heading.tabIndex = -1
  screen.append(heading, createElement('p', 'application-lead', APPLICATION_GATEWAY.supportingCopy))

  const before = createElement('section', 'application-gateway-before')
  before.append(createElement('h2', '', 'Before you begin'))
  APPLICATION_GATEWAY.beforeBegin.forEach((line) => before.append(createElement('p', '', line)))
  screen.append(before)

  const begin = createButton('Begin application')
  begin.addEventListener('click', () => goToStep(0))
  screen.append(begin)
  screen.append(createElement('p', 'application-gateway-privacy', APPLICATION_GATEWAY.privacyCopy))
  screen.append(createElement('p', 'application-gateway-disclaimer', APPLICATION_GATEWAY.pilotDisclaimer))
  const back = createElement('a', 'application-gateway-back', 'Back to donna')
  back.href = '/index.html'
  screen.append(back)
  return screen
}

function validateCurrentStep({ focusErrors = true, refresh = false } = {}) {
  const step = APPLICATION_STEPS[currentStep]
  const errors = {}
  let ageRangeChecked = false
  step.fields.filter((field) => isFieldVisible(field, applicationData)).forEach((field) => {
    if (field.group === 'ageRange') {
      if (ageRangeChecked) return
      ageRangeChecked = true
      const error = validateAgeRange(applicationData.ageRangeMin, applicationData.ageRangeMax)
      if (error) errors.ageRange = error
      return
    }
    const error = validateField(field, applicationData[field.name])
    if (error) errors[field.name] = error
    else if (typeof applicationData[field.name] === 'string') applicationData[field.name] = sanitizeText(applicationData[field.name])
    else if (Array.isArray(applicationData[field.name])) applicationData[field.name] = applicationData[field.name].map(sanitizeText).filter(Boolean)
  })
  if (step.id === 'eligibility' && !errors.dateOfBirth && !isAtLeast25(applicationData.dateOfBirth)) errors.dateOfBirth = UNDER_25_MESSAGE
  currentErrors = errors
  const valid = Object.keys(errors).length === 0
  if (!valid || refresh) renderApplication({ focusHeading: false })
  if (!valid && focusErrors) focusFirstError()
  return valid
}

function buildStandardStep() {
  const step = APPLICATION_STEPS[currentStep]
  const form = createElement('form', 'application-screen application-form')
  form.noValidate = true
  form.append(buildProgress())
  const heading = createElement('h1', '', step.title)
  heading.id = 'application-heading'
  heading.tabIndex = -1
  form.append(heading, createElement('p', 'application-lead', step.description))
  if (step.framing) form.append(createElement('p', 'application-lead', step.framing))
  if (step.durationNote) form.append(createElement('p', 'application-lead', step.durationNote))
  const fields = createElement('div', 'application-fields')
  const visibleFields = step.fields.filter((field) => isFieldVisible(field, applicationData))
  visibleFields.forEach((field, index) => {
    if (field.group === 'ageRange') {
      if (index === 0 || visibleFields[index - 1].group !== 'ageRange') fields.append(buildAgeSelectPair(field, visibleFields[index + 1]))
      return
    }
    fields.append(buildField(field))
  })
  form.append(fields)
  const actions = createElement('div', 'application-navigation')
  const back = createButton('Back', 'button application-button-secondary')
  back.addEventListener('click', () => goToStep(currentStep - 1))
  const status = createElement('p', 'application-navigation-status')
  status.setAttribute('aria-live', 'polite')
  if (Object.keys(currentErrors).length) status.textContent = 'A few answers are still needed below.'
  const next = createButton('Continue', 'button button-primary', 'submit')
  actions.append(back, status, next)
  form.append(actions)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    attemptedSections.add(currentStep)
    if (validateCurrentStep()) goToStep(currentStep + 1)
  })
  return form
}

function releasePhoto(slotId) {
  const current = photoState.get(slotId)
  if (current?.url) URL.revokeObjectURL(current.url)
  photoState.delete(slotId)
}

const PHOTO_PRESENTATION = Object.freeze({
  photoFace: Object.freeze({ label: 'Your face', accessibleName: 'A recent, clear photograph of your face' }),
  photoEveryday: Object.freeze({ label: 'Everyday life', accessibleName: 'A recent photograph from everyday life' }),
  photoOptionalOne: Object.freeze({ label: 'Optional', accessibleName: 'An additional photograph, optional' }),
  photoOptionalTwo: Object.freeze({ label: 'Optional', accessibleName: 'An additional photograph, optional' }),
})

function buildPhotoSlot(slot) {
  const item = createElement('div', 'application-photo-slot')
  const presentation = PHOTO_PRESENTATION[slot.id]
  const heading = createElement('h2', '', presentation.label)
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

    const consentLabel = createElement('label', 'application-choice application-photo-consent')
    const consent = document.createElement('input')
    consent.type = 'checkbox'
    consent.checked = stored.shareConsent
    consent.addEventListener('change', () => { stored.shareConsent = consent.checked })
    consentLabel.append(consent, createElement('span', '', PHOTO_SHARE_CONSENT))
    item.append(consentLabel)
  }
  const input = document.createElement('input')
  input.type = 'file'
  input.id = fieldId(slot.id)
  input.name = slot.id
  input.accept = 'image/jpeg,image/png,image/webp'
  input.setAttribute('aria-label', presentation.accessibleName)
  const label = createElement('label', 'button application-button-secondary application-file-label', stored ? 'Replace photograph' : 'Choose photograph')
  label.htmlFor = input.id
  item.append(input, label)
  const error = photoErrors.get(slot.id) || currentErrors[slot.id]
  if (error) {
    const errorElement = createElement('p', 'application-field-error', error)
    errorElement.id = fieldId(slot.id, 'error')
    input.setAttribute('aria-invalid', 'true')
    input.setAttribute('aria-describedby', errorElement.id)
    item.append(errorElement)
  }
  input.addEventListener('change', () => {
    const [file] = input.files
    if (!file) return
    const errorMessage = validatePhoto(file)
    if (errorMessage) {
      photoErrors.set(slot.id, errorMessage)
      currentErrors[slot.id] = errorMessage
      renderApplication({ focusHeading: false })
      return
    }
    photoErrors.delete(slot.id)
    releasePhoto(slot.id)
    photoState.set(slot.id, { file, url: URL.createObjectURL(file), shareConsent: false })
    if (attemptedSections.has(currentStep)) validatePhotographs({ focusErrors: false, refresh: true })
    else renderApplication({ focusHeading: false })
  })
  return item
}

function validatePhotographs({ focusErrors = true, refresh = false } = {}) {
  const errors = {}
  PHOTO_SLOTS.filter(({ required }) => required).forEach((slot) => {
    if (photoErrors.has(slot.id)) errors[slot.id] = photoErrors.get(slot.id)
    else if (!photoState.has(slot.id)) errors[slot.id] = `${slot.label} is required.`
  })
  currentErrors = errors
  const valid = Object.keys(errors).length === 0
  if (!valid || refresh) renderApplication({ focusHeading: false })
  if (!valid && focusErrors) focusFirstError()
  return valid
}

function buildPhotographs() {
  const step = APPLICATION_STEPS[currentStep]
  const screen = createElement('section', 'application-screen application-form')
  screen.append(buildProgress())
  const heading = createElement('h1', '', step.title)
  heading.tabIndex = -1
  screen.append(heading, createElement('p', 'application-lead', step.description))
  screen.append(createElement('p', 'application-photo-guidance', 'JPEG, PNG or WebP, up to 10 MB each. Kept in this browser tab only.'))
  const grid = createElement('div', 'application-photo-grid')
  PHOTO_SLOTS.forEach((slot) => grid.append(buildPhotoSlot(slot)))
  screen.append(grid)
  const actions = createElement('div', 'application-navigation')
  const back = createButton('Back', 'button application-button-secondary')
  back.addEventListener('click', () => goToStep(currentStep - 1))
  const status = createElement('p', 'application-navigation-status')
  status.setAttribute('aria-live', 'polite')
  if (Object.keys(currentErrors).length) status.textContent = 'A few answers are still needed below.'
  const next = createButton('Continue')
  next.addEventListener('click', () => {
    attemptedSections.add(currentStep)
    if (validatePhotographs()) goToStep(currentStep + 1)
  })
  actions.append(back, status, next)
  screen.append(actions)
  return screen
}

function displayValue(field, value) {
  if (field.type === 'height') return value ? `${value} cm` : 'Not provided'
  if (Array.isArray(value)) return value.length ? value.map((item) => field.options?.find(([key]) => key === item)?.[1] || item).join(', ') : 'Not provided'
  if (value === '' || value === null || value === undefined) return 'Not provided'
  return field.options?.find(([key]) => key === value)?.[1] || value
}

function buildReviewGroup(step, stepIndex) {
  const section = createElement('section', 'application-review-group')
  const header = createElement('div', 'application-review-header')
  header.append(createElement('h2', '', step.title))
  const edit = createButton('Edit', 'application-inline-button')
  edit.addEventListener('click', () => goToStep(stepIndex))
  header.append(edit)
  section.append(header)
  const list = document.createElement('dl')
  step.fields.filter((field) => isFieldVisible(field, applicationData)).forEach((field, index, fields) => {
    if (field.group === 'ageRange') {
      if (index > 0 && fields[index - 1].group === 'ageRange') return
      list.append(createElement('dt', '', field.groupLabel), createElement('dd', '', `${applicationData.ageRangeMin}–${applicationData.ageRangeMax}`))
      return
    }
    list.append(createElement('dt', '', field.label), createElement('dd', '', displayValue(field, applicationData[field.name])))
  })
  if (step.id === 'eligibility' && applicationData.availableWithinFourWeeks === 'not_right_now') {
    list.append(createElement('dt', '', 'Review flag'), createElement('dd', 'application-review-flag', 'Not right now'))
  }
  section.append(list)
  return section
}

function buildPhotoReview(stepIndex) {
  const section = createElement('section', 'application-review-group')
  const header = createElement('div', 'application-review-header')
  header.append(createElement('h2', '', 'Photographs'))
  const edit = createButton('Edit', 'application-inline-button')
  edit.addEventListener('click', () => goToStep(stepIndex))
  header.append(edit)
  section.append(header)
  const list = document.createElement('dl')
  PHOTO_SLOTS.forEach((slot) => {
    const photo = photoState.get(slot.id)
    const summary = photo ? `${photo.file.name} · ${PHOTO_SHARE_CONSENT} ${photo.shareConsent ? 'Yes' : 'No'}` : 'Not provided'
    list.append(createElement('dt', '', slot.label), createElement('dd', '', summary))
  })
  section.append(list)
  return section
}

function buildLegalLinks() {
  const row = createElement('p', 'application-legal-links')
  ;[['Privacy Notice', siteConfig.privacyNoticeUrl], ['Pilot Terms', siteConfig.pilotTermsUrl]].forEach(([label, url], index) => {
    if (index) row.append(document.createTextNode(' · '))
    if (url) {
      const link = createElement('a', '', label)
      link.href = url
      row.append(link)
    } else row.append(createElement('span', 'application-legal-placeholder', `${label} (placeholder)`))
  })
  return row
}

function validateConsents({ refresh = false } = {}) {
  currentErrors = Object.fromEntries(CONSENT_SCHEMA.filter(({ required, name }) => required && !consentData[name]).map(({ name, label }) => [`consent_${name}`, label]))
  const valid = Object.keys(currentErrors).length === 0
  if (refresh) renderApplication({ focusHeading: false })
  return valid
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
    const errorKey = `consent_${consent.name}`
    if (currentErrors[errorKey]) {
      checkbox.setAttribute('aria-invalid', 'true')
      checkbox.setAttribute('aria-describedby', fieldId(errorKey, 'error'))
    }
    checkbox.addEventListener('change', () => {
      consentData[consent.name] = checkbox.checked
      if (attemptedSections.has(currentStep)) validateConsents({ refresh: true })
    })
    label.append(checkbox, createElement('span', '', consent.label))
    wrapper.append(label)
    if (currentErrors[errorKey]) {
      const error = createElement('p', 'application-field-error', 'This acknowledgement is required.')
      error.id = fieldId(errorKey, 'error')
      wrapper.append(error)
    }
    if (consent.legal) wrapper.append(buildLegalLinks())
  })
  return wrapper
}

function buildPreviewComplete() {
  const screen = createElement('section', 'application-screen application-preview-state')
  screen.append(createElement('p', 'eyebrow', 'Preview complete'))
  const heading = createElement('h1', '', 'This is a UI preview.')
  heading.tabIndex = -1
  screen.append(heading, createElement('p', 'application-lead', 'Your information and photographs have not been submitted or stored.'))
  const next = createElement('section', 'application-confirmation-next')
  next.append(createElement('h2', '', 'WHAT HAPPENS NEXT'))
  next.append(buildGatewayItems(APPLICATION_GATEWAY.nextSteps, 'application-confirmation-process', true))
  screen.append(next)
  const review = createButton('Return to review', 'button application-button-secondary')
  review.addEventListener('click', () => { previewComplete = false; renderApplication() })
  screen.append(review)
  return screen
}

function buildReview() {
  if (previewComplete) return buildPreviewComplete()
  const form = createElement('form', 'application-screen application-review')
  form.noValidate = true
  form.append(buildProgress())
  const heading = createElement('h1', '', APPLICATION_STEPS[currentStep].title)
  heading.tabIndex = -1
  form.append(heading)
  const summary = createElement('div', 'application-review-sections')
  APPLICATION_STEPS.slice(0, 5).forEach((step, index) => summary.append(buildReviewGroup(step, index)))
  summary.append(buildPhotoReview(5))
  form.append(summary, buildConsentList())
  const actions = createElement('div', 'application-navigation')
  const back = createButton('Back', 'button application-button-secondary')
  back.addEventListener('click', () => goToStep(currentStep - 1))
  const status = createElement('p', 'application-navigation-status')
  status.setAttribute('aria-live', 'polite')
  if (Object.keys(currentErrors).length) status.textContent = 'A few answers are still needed below.'
  const submit = createButton(siteConfig.applicationMode === 'preview' ? 'Test application' : 'Submission unavailable', 'button button-primary', 'submit')
  if (siteConfig.applicationMode !== 'preview') submit.disabled = true
  actions.append(back, status, submit)
  form.append(actions)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    attemptedSections.add(currentStep)
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
  previewComplete = false
  renderApplication()
  window.scrollTo({ top: 0, behavior: 'auto' })
}

function renderApplication({ focusHeading = true } = {}) {
  let screen
  if (currentStep === GATEWAY_STEP) screen = buildGateway()
  else if (APPLICATION_STEPS[currentStep].id === 'photographs') screen = buildPhotographs()
  else if (APPLICATION_STEPS[currentStep].id === 'review-and-consent') screen = buildReview()
  else screen = buildStandardStep()
  root.replaceChildren(screen)
  root.classList.toggle('is-gateway', currentStep === GATEWAY_STEP)
  if (focusHeading) focusScreenHeading()
}

window.addEventListener('beforeunload', () => photoState.forEach(({ url }) => URL.revokeObjectURL(url)))
renderApplication()
window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
