import { siteConfig } from '../../config/site.js'
import {
  APPLICATION_GATEWAY,
  APPLICATION_STEPS,
  CONSENT_SCHEMA,
  DATA_FIELDS,
  PHOTO_SHARE_CONSENT,
  PHOTO_SLOTS,
} from '../schema.js'
import { buildProgressLabel } from './navigation.js'
import {
  deriveHeightCm,
  isAtLeast25,
  isFieldVisible,
  sanitizeText,
  UNDER_25_MESSAGE,
  validateAgeRange,
  validateField,
  validatePhoto,
} from '../validation.js'

const root = document.querySelector('#application-root')
if (!root) throw new Error('Application root was not found.')

const ARRAY_FIELDS = new Set(['languages', 'citiesConsidered', 'nonNegotiables'])
const applicationData = Object.fromEntries(DATA_FIELDS.map((name) => [name, ARRAY_FIELDS.has(name) ? [] : '']))
const uiState = { heightFeet: '', heightInches: '' }

const consentData = Object.fromEntries(CONSENT_SCHEMA.map(({ name }) => [name, false]))
const photoState = new Map()
const photoErrors = new Map()

const APPLICATION_EYEBROW = 'A note from your matchmaker'

// Chapters VII, Photographs and Review/Consent render one screen at a time
// (Part A2 of the conversation-mode spec). Order matches the schema.
const FOCUS_STEPS = APPLICATION_STEPS.filter((step) => step.chapterNumber === 7 || step.id === 'photographs' || step.id === 'review-and-consent')

// Each chapter opens with one donna message before any question (Part C4 of
// the conversation-refinement spec). Verbatim.
const CHAPTER_BRIEFS = Object.freeze({
  1: "Hi — I'm donna. Before I can think about who to introduce you to, I need to know who I'm talking to.",
  2: "Now the part that actually matters: what you're looking for, and when. I ask because there's no point introducing you to someone on a different timeline.",
  3: "Tell me about your days — work, study, the practical shape of your life. It's most of what I'll have to describe you with.",
  4: 'This next bit is about where your life is going. Geography and children are the two things people most often discover too late.',
  5: "Background and habits now. I don't filter anyone out on these — I just need to know what carries weight for you.",
  6: 'Now I get more direct. What would genuinely rule someone out?',
})

// Per-field donna message, verbatim (Part D3). Keyed by field name; the
// combined age-range exchange uses the 'ageRange' key.
const FIELD_MESSAGES = Object.freeze({
  fullName: "What's your name?",
  sharedFirstName: 'And what should I call you when I describe you to someone? Just a first name.',
  dateOfBirth: 'When were you born?',
  gender: 'How do you describe your gender?',
  genderSelfDescribe: 'How would you put it?',
  currentCity: 'Where are you living at the moment?',
  currentCityOther: 'Which one?',
  email: "What's the best email for you?",
  phone: 'And a number I can reach you on — WhatsApp is fine.',
  intent: 'What are you looking for?',
  timeline: 'If you met the right person, what feels like the right timeline?',
  availableWithinFourWeeks: 'Could you actually meet someone in the next four weeks?',
  ageRange: 'What age range are you comfortable with?',
  interestedIn: 'Who would you like to meet?',
  occupation: 'What do you do?',
  employer: 'Who do you work for?',
  industry: 'And which industry is that?',
  industryOther: 'Which one?',
  highestDegree: 'How far did you take your studies?',
  institution: "Where did you study? Skip this if you'd rather not say.",
  languages: 'Which languages are you comfortable in?',
  languagesOther: 'Which ones?',
  heightCm: 'How tall are you?',
  linkedinUrl: "Your LinkedIn. I look at it to confirm you're who you say you are — I don't contact you there, and I never share it without your permission.",
  livingSituation: 'Who do you live with?',
  citiesConsidered: "Which cities would you consider?",
  citiesConsideredOther: 'Which ones?',
  willingToRelocate: 'Would you move for the right person?',
  hasChildren: 'Do you have children?',
  wantsChildren: 'Do you want children?',
  childrenNonNegotiable: "Is that something you'd hold firm on?",
  maritalStatus: 'Have you been married before?',
  faithBackground: 'Is there a faith or community background that matters to you?',
  faithBackgroundOther: 'How would you describe it?',
  sharedBackgroundImportance: 'How much weight does sharing that carry for you?',
  diet: 'How do you eat?',
  drinking: 'Do you drink?',
  smoking: 'Do you smoke?',
  nonNegotiables: 'Up to three things that would genuinely rule someone out. Be specific — this is the one place I take a preference literally.',
})

// The last conversation-mode message, shown once Chapter VI is answered and
// before the transcript clears for Chapter VII (Part A3/D2). Verbatim; the
// applicant's first name is prepended when it can be derived.
const CHAPTER_TRANSITION_REST = 'enough of the basics. I have the practical picture now — tell me a little about the person behind it.'

function deriveFirstName(fullName) {
  const [first] = sanitizeText(fullName || '').split(/\s+/).filter(Boolean)
  return first || ''
}

function transitionMessageText() {
  const firstName = deriveFirstName(applicationData.fullName)
  return firstName ? `Okay, ${firstName} — ${CHAPTER_TRANSITION_REST}` : `Okay, ${CHAPTER_TRANSITION_REST}`
}

let mode = 'gateway' // 'gateway' | 'conversation' | 'focus'
let currentFocusStep = 0
let currentErrors = {}
let previewComplete = false
const attemptedFocusSteps = new Set()

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

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

function optionalLabel(field) {
  return field.required ? null : createElement('span', 'application-optional', ' Optional')
}

function addHelpText(container, field) {
  if (!field.helpText) return ''
  const help = createElement('p', 'application-field-help', field.helpText)
  help.id = fieldId(field.name, 'help')
  container.append(help)
  return help.id
}

function connectError(control, describedBy, hasError) {
  const ids = describedBy ? [describedBy] : []
  if (hasError) control.setAttribute('aria-invalid', 'true')
  if (ids.length) control.setAttribute('aria-describedby', ids.join(' '))
}

/* ---------------------------------------------------------------------- */
/* Mascot                                                                  */
/* ---------------------------------------------------------------------- */

// Focus mode (Chapter VII, photographs, review) rebuilds its whole screen
// per step regardless, so this mascot is rebuilt along with it — there is no
// travel/glide animation to preserve there. Conversation mode has its own
// persistent mascot below, since that one must survive re-renders.
let mascotElement = null
let mascotDesiredState = null

function buildMascotImg() {
  const img = document.createElement('img')
  img.className = 'application-mascot'
  img.src = '/images/application/donna-mascot.webp'
  img.alt = ''
  img.width = 40
  img.height = 40
  if (mascotDesiredState) img.classList.add(mascotDesiredState)
  mascotElement = img
  return img
}

function setMascotState(state) {
  mascotDesiredState = state
  if (mascotElement) {
    mascotElement.classList.remove('is-speaking', 'is-listening', 'is-attentive')
    if (state) mascotElement.classList.add(state)
  }
}

/* ---------------------------------------------------------------------- */
/* Conversation-mode mascot — one persistent wrapper and image for the     */
/* whole conversation. Recreating them on every render left CSS transitions*/
/* nothing to animate from (a brand-new element has no prior painted       */
/* transform), so the mascot teleported between questions instead of       */
/* gliding. Both nodes are now built once and only ever moved/mutated.     */
/* ---------------------------------------------------------------------- */

let conversationMascotColEl = null
let conversationMascotImgEl = null

// Bumped by anything that starts a new reveal sequence or navigation, so
// in-flight setTimeout callbacks from a superseded sequence can recognise
// they're stale and no-op instead of clobbering current state (#12).
let conversationActionToken = 0

function beginConversationAction() {
  conversationActionToken += 1
  return conversationActionToken
}

function ensureConversationMascot() {
  if (conversationMascotColEl) return conversationMascotColEl
  conversationMascotColEl = createElement('div', 'application-conversation-mascot-col')
  conversationMascotImgEl = document.createElement('img')
  conversationMascotImgEl.className = 'application-mascot'
  conversationMascotImgEl.src = '/images/application/donna-mascot.webp'
  conversationMascotImgEl.alt = ''
  conversationMascotImgEl.width = 40
  conversationMascotImgEl.height = 40
  // The authoritative signal that the one-shot speak animation (#8/#9) has
  // finished — not a second, hand-tuned timer duplicating its 350ms
  // duration, which could drift out of sync with the CSS (#10).
  conversationMascotImgEl.addEventListener('animationend', (event) => {
    if (event.animationName !== 'application-mascot-speak') return
    if (conversationMascotImgEl.classList.contains('is-speaking')) setConversationMascotState('is-listening')
  })
  conversationMascotColEl.append(conversationMascotImgEl)
  return conversationMascotColEl
}

function setConversationMascotState(state) {
  if (!conversationMascotImgEl) return
  conversationMascotImgEl.classList.remove('is-speaking', 'is-listening', 'is-attentive')
  if (state) conversationMascotImgEl.classList.add(state)
}

function buildEyebrow() {
  return createElement('p', 'application-eyebrow', APPLICATION_EYEBROW)
}

/* ---------------------------------------------------------------------- */
/* Progress                                                                */
/* ---------------------------------------------------------------------- */

function conversationExchangeTotal() {
  return CONVERSATION_EXCHANGES.filter(isExchangeVisible).length
}

function computeProgress() {
  if (mode === 'conversation') {
    const total = conversationExchangeTotal() + FOCUS_STEPS.length
    const current = Math.min(globalRevealedCount, conversationExchangeTotal())
    return buildProgressLabel({ current: Math.max(current, 1), total })
  }
  if (mode === 'focus') {
    const total = conversationExchangeTotal() + FOCUS_STEPS.length
    const current = conversationExchangeTotal() + currentFocusStep + 1
    return buildProgressLabel({ current, total })
  }
  return null
}

function buildProgress() {
  const state = computeProgress()
  if (!state) return null
  const wrapper = createElement('div', 'application-progress')
  const progress = document.createElement('progress')
  progress.max = state.total
  progress.value = state.current
  progress.setAttribute('aria-label', state.ariaLabel)
  wrapper.append(progress)
  return wrapper
}

/* ---------------------------------------------------------------------- */
/* Field control builders — shared by conversation and focus modes        */
/* ---------------------------------------------------------------------- */

function buildChoiceCard(field, { checked, onChoose }) {
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
    input.checked = checked === value
    connectError(input, helpId, false)
    input.addEventListener('change', () => onChoose(value))
    label.append(input, createElement('span', '', labelText))
    choices.append(label)
  })
  fieldset.append(choices)
  return fieldset
}

function buildCheckboxCards(field, { selected, onToggle }) {
  const fieldset = createElement('fieldset', 'application-field application-fieldset')
  const legend = createElement('legend', 'application-label', field.label)
  fieldset.append(legend)
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
    input.addEventListener('change', () => onToggle(value, input.checked))
    label.append(input, createElement('span', '', labelText))
    choices.append(label)
  })
  fieldset.append(choices)
  return fieldset
}

function buildSelectedOptions(field, selected, onRemove) {
  const list = createElement('ul', 'application-entry-list')
  selected.forEach((value) => {
    const optionLabel = field.options.find(([key]) => key === value)?.[1] || value
    const item = document.createElement('li')
    item.append(createElement('span', '', optionLabel))
    const remove = createButton('Remove', 'application-inline-button')
    remove.setAttribute('aria-label', `Remove ${optionLabel}`)
    remove.addEventListener('click', () => onRemove(value))
    item.append(remove)
    list.append(item)
  })
  return list
}

function buildCombobox(field, { multiple, selectedValue, onChoose, onRemove }) {
  const container = createElement('div', 'application-field application-combobox-field')
  const label = createElement('label', 'application-label', field.label)
  label.htmlFor = fieldId(field.name)
  container.append(label)
  const helpId = addHelpText(container, field)

  const chipHost = createElement('div', '')
  if (multiple) container.append(chipHost)

  // onChoose/onRemove reassign applicationData[field.name] to a *new* array
  // and return it, so this local binding is kept in sync rather than going
  // stale after the first pick — the root cause of chips/menu/state
  // disagreeing with each other.
  function removeSelected(value) {
    selectedValue = onRemove(value) ?? selectedValue
    refreshChips()
    renderOptions()
  }

  function refreshChips() {
    chipHost.replaceChildren()
    if (multiple && selectedValue.length) chipHost.append(buildSelectedOptions(field, selectedValue, removeSelected))
  }
  refreshChips()

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
  const currentSingle = multiple ? null : selectedValue
  if (!multiple && currentSingle) input.value = field.options.find(([value]) => value === currentSingle)?.[1] || ''
  listbox.id = listboxId
  listbox.setAttribute('role', 'listbox')
  if (multiple) listbox.setAttribute('aria-multiselectable', 'true')
  listbox.hidden = true
  connectError(input, helpId, false)

  let visibleOptions = field.options
  let activeIndex = 0

  function isSelected(value) {
    return multiple ? selectedValue.includes(value) : selectedValue === value
  }

  function renderOptions() {
    listbox.replaceChildren()
    visibleOptions.forEach(([value, optionLabel], index) => {
      const option = createElement('button', 'application-combobox-option', optionLabel)
      option.type = 'button'
      option.id = fieldId(field.name, `option-${value}`)
      option.setAttribute('role', 'option')
      option.setAttribute('aria-selected', String(isSelected(value)))
      option.tabIndex = -1
      if (index === activeIndex) option.classList.add('is-active')
      option.addEventListener('mousedown', (event) => event.preventDefault())
      option.addEventListener('click', () => choose(value, optionLabel))
      listbox.append(option)
    })
    if (multiple) {
      const actions = createElement('div', 'application-combobox-actions')
      const clearButton = createButton('Clear', 'application-inline-button')
      clearButton.disabled = selectedValue.length === 0
      clearButton.addEventListener('mousedown', (event) => event.preventDefault())
      clearButton.addEventListener('click', () => {
        selectedValue.slice().forEach((value) => { selectedValue = onRemove(value) ?? selectedValue })
        refreshChips()
        renderOptions()
      })
      const doneButton = createButton('Done', 'application-inline-button')
      doneButton.addEventListener('mousedown', (event) => event.preventDefault())
      doneButton.addEventListener('click', () => close())
      actions.append(clearButton, doneButton)
      listbox.append(actions)
    }
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
      selectedValue = onChoose(value) ?? selectedValue
      input.value = ''
      refreshChips()
      renderOptions()
    } else {
      input.value = optionLabel
      close()
      onChoose(value)
    }
  }

  input.addEventListener('focus', () => {
    if (!multiple) input.select()
    visibleOptions = field.options
    activeIndex = 0
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
    if (!multiple) input.value = field.options.find(([value]) => value === selectedValue)?.[1] || ''
  })
  renderOptions()
  combobox.append(input, listbox)
  container.append(combobox)
  return container
}

function updateHeightOutput(output, cm) {
  const centimetres = Number(cm)
  if (!Number.isFinite(centimetres) || !cm) {
    output.textContent = ''
    return
  }
  const totalInches = Math.round(centimetres / 2.54)
  output.textContent = `${centimetres} cm · ${Math.floor(totalInches / 12)} ft ${totalInches % 12} in`
}

function buildHeightControl(field, { onChange }) {
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
    onChange()
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
    select.addEventListener('change', () => {
      uiState[name] = select.value
      deriveHeight()
    })
    wrapper.append(select, createElement('span', '', suffix))
    row.append(wrapper)
  })
  output.textContent = applicationData.heightCm ? `${applicationData.heightCm} cm` : ''
  fieldset.append(row, output)
  return fieldset
}

function buildAgeRangeControl(fromField, toField, { onChange }) {
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
    select.addEventListener('change', () => {
      applicationData[field.name] = select.value
      onChange()
    })
    label.append(select)
    row.append(label)
  })
  fieldset.append(row)
  return fieldset
}

function buildSuggestionChips(field, { onPick }) {
  const wrap = createElement('div', 'application-chip-group')
  wrap.append(createElement('p', 'application-field-help', field.chipHelperText || ''))
  const row = createElement('div', 'application-chip-row')
  const values = applicationData[field.name]
  const hasEmptySlot = values.length < field.maxItems || values.slice(0, field.maxItems).some((value) => sanitizeText(value) === '')
  field.suggestionChips.forEach((chipText) => {
    const chip = createButton(chipText, 'application-chip')
    chip.disabled = !hasEmptySlot
    chip.addEventListener('click', () => onPick(chipText))
    row.append(chip)
  })
  wrap.append(row)
  return wrap
}

function buildStringArrayControl(field, { onInput }) {
  const fieldset = createElement('fieldset', 'application-field application-fieldset')
  const legend = createElement('legend', 'application-label', field.label)
  legend.append(createElement('span', 'application-optional', ' Optional'))
  fieldset.append(legend)
  addHelpText(fieldset, field)
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
    input.addEventListener('input', () => onInput(index, input.value))
    inputs.append(input)
  }
  fieldset.append(inputs)
  if (field.suggestionChips?.length) {
    fieldset.append(buildSuggestionChips(field, {
      onPick: (chipText) => {
        // Read applicationData fresh rather than closing over `values`: two
        // chip clicks can fire in the same tick (e.g. a fast double-tap)
        // before a re-render replaces this button, and a stale closure would
        // silently overwrite the first pick instead of filling the next slot.
        const current = applicationData[field.name]
        const padded = [...current, ...Array(Math.max(0, field.maxItems - current.length)).fill('')]
        const emptyIndex = padded.findIndex((value) => sanitizeText(value) === '')
        if (emptyIndex === -1) return
        onInput(emptyIndex, chipText)
        rerenderCurrent()
      },
    }))
  }
  return fieldset
}

function buildTextInput(field, { onInput }) {
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
  if (field.autocomplete) control.autocomplete = field.autocomplete
  if (field.placeholder) control.placeholder = field.placeholder

  container.append(label, control)
  const helpId = addHelpText(container, field)
  let counter
  if (field.type === 'textarea') {
    counter = createElement('p', 'application-counter', `${field.maxLength - control.value.length} characters remaining`)
    counter.id = fieldId(field.name, 'counter')
    container.append(counter)
  }
  connectError(control, [helpId, counter?.id].filter(Boolean).join(' '), false)
  control.addEventListener('input', () => {
    applicationData[field.name] = control.value
    if (counter) counter.textContent = `${field.maxLength - control.value.length} characters remaining`
    onInput()
  })
  return { container, control }
}

/* ---------------------------------------------------------------------- */
/* Conversation mode (Chapters I–VI) — Part A1/A2 of the spec              */
/* ---------------------------------------------------------------------- */

const CONVERSATION_EXCHANGES = buildConversationExchanges()

function buildConversationExchanges() {
  const list = []
  APPLICATION_STEPS.filter((step) => step.chapterNumber >= 1 && step.chapterNumber <= 6).forEach((screen) => {
    for (let index = 0; index < screen.fields.length; index += 1) {
      const field = screen.fields[index]
      if (field.group === 'ageRange') {
        if (field.name === 'ageRangeMax') continue
        list.push({ id: 'ageRange', kind: 'ageRange', fields: [field, screen.fields[index + 1]], screenId: screen.id })
        continue
      }
      list.push({ id: field.name, kind: 'field', fields: [field], screenId: screen.id })
    }
  })
  return list
}

function exchangeScreen(exchange) {
  return APPLICATION_STEPS.find((step) => step.id === exchange.screenId)
}

function isExchangeVisible(exchange) {
  if (exchange.kind === 'ageRange') return true
  return isFieldVisible(exchange.fields[0], applicationData)
}

// One bespoke, verbatim donna line per field (Part D3) — never the field's
// own label.
function getExchangeMessageLines(exchange) {
  if (exchange.kind === 'ageRange') return [FIELD_MESSAGES.ageRange]
  return [FIELD_MESSAGES[exchange.fields[0].name]]
}

function formatDateOfBirth(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return ''
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

function formatHeight(cm) {
  const centimetres = Number(cm)
  if (!Number.isFinite(centimetres) || !cm) return ''
  const totalInches = Math.round(centimetres / 2.54)
  return `${Math.floor(totalInches / 12)} ft ${totalInches % 12} in`
}

// Part B3 — each answer type collapses to a readable summary.
function buildAnswerSummary(exchange) {
  if (exchange.kind === 'ageRange') return `${applicationData.ageRangeMin} to ${applicationData.ageRangeMax}`
  const field = exchange.fields[0]
  const value = applicationData[field.name]
  if (field.type === 'height') return formatHeight(applicationData.heightCm)
  if (field.name === 'dateOfBirth') return formatDateOfBirth(value)
  if (field.type === 'string[]') return value.filter(Boolean).join('\n') || 'None given'
  if (field.type === 'multi_select') return value.map((item) => field.options.find(([key]) => key === item)?.[1] || item).join(', ')
  if (field.type === 'single_select') return field.options.find(([key]) => key === value)?.[1] || value
  return value
}

let revealedExchangeIds = []
const answeredExchangeIds = new Set()
let openExchangeId = null
let previousOpenExchangeId = null
let settledMessageIds = new Set()
let exchangeErrors = new Map()
let nextSequenceIndex = 0
let showTranscriptTransition = false
let currentChapterNumber = null
// Counts real field/ageRange exchanges revealed so far, across chapters —
// independent of revealedExchangeIds, which only holds the current
// chapter's transcript once chapters start clearing (Part C2).
let globalRevealedCount = 0

function findNextVisibleIndex(fromIndex) {
  for (let index = fromIndex; index < CONVERSATION_EXCHANGES.length; index += 1) {
    if (isExchangeVisible(CONVERSATION_EXCHANGES[index])) return index
  }
  return -1
}

function startConversation() {
  mode = 'conversation'
  revealedExchangeIds = []
  answeredExchangeIds.clear()
  settledMessageIds = new Set()
  exchangeErrors = new Map()
  nextSequenceIndex = 0
  openExchangeId = null
  previousOpenExchangeId = null
  showTranscriptTransition = false
  currentChapterNumber = null
  globalRevealedCount = 0
  beginConversationAction()
  ensureConversationMascot()
  setConversationMascotState(null)
  renderApplication()
  advanceConversation()
}

// Reveals the next question in sequence. When the sequence crosses into a
// new chapter, hands off to enterChapter() first (Part C2/C4) instead of
// revealing the field directly.
function advanceConversation() {
  const index = findNextVisibleIndex(nextSequenceIndex)
  if (index === -1) {
    beginChapterTransition()
    return
  }
  const exchange = CONVERSATION_EXCHANGES[index]
  const chapterNumber = exchangeScreen(exchange).chapterNumber
  if (chapterNumber !== currentChapterNumber) {
    enterChapter(chapterNumber, index)
    return
  }
  revealField(index)
}

// Opens a chapter with its brief (Part C4). Past the first chapter, the
// current transcript fades out first and the mascot resets to the top of
// the column before the brief appears (Part C2/F1).
function enterChapter(chapterNumber, index) {
  const openBrief = () => {
    currentChapterNumber = chapterNumber
    revealedExchangeIds = []
    openExchangeId = null
    revealSoloMessage(`__chapter-brief-${chapterNumber}__`, () => revealField(index))
  }
  if (currentChapterNumber === null) {
    openBrief()
    return
  }
  const token = beginConversationAction()
  showTranscriptTransition = true
  renderApplication()
  const fadeWait = prefersReducedMotion() ? 0 : 480
  setTimeout(() => {
    if (token !== conversationActionToken) return
    showTranscriptTransition = false
    setConversationMascotState(null)
    openBrief()
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, fadeWait)
}

function revealField(index) {
  const exchange = CONVERSATION_EXCHANGES[index]
  nextSequenceIndex = index + 1
  globalRevealedCount += 1
  revealedExchangeIds.push(exchange.id)
  openExchangeId = exchange.id
  const attentive = exchange.id === 'nonNegotiables'
  playDonnaReveal(exchange.id, { attentive }, () => {
    renderApplication()
    focusOpenExchangeInput()
    scrollToId(`exchange-${exchange.id}`)
  })
}

// A solo donna message with no question attached — used for chapter briefs
// and the one-time name acknowledgement (Part C4/D2).
function revealSoloMessage(id, onSettled) {
  revealedExchangeIds.push(id)
  playDonnaReveal(id, {}, () => {
    renderApplication()
    scrollToId(`exchange-${id}`)
    onSettled()
  })
}

// donna acknowledges the applicant's name exactly once here, and once more
// in the Chapter VII transition — nowhere else (Part D2/D4).
function continueAfterExchange(exchange) {
  if (exchange.id === 'fullName' && deriveFirstName(applicationData.fullName)) {
    revealSoloMessage('__name-ack__', () => advanceConversation())
    return
  }
  advanceConversation()
}

function beginChapterTransition() {
  const transitionId = '__chapter-transition__'
  revealedExchangeIds.push(transitionId)
  openExchangeId = null
  playDonnaReveal(transitionId, { attentive: true }, () => {
    const token = beginConversationAction()
    renderApplication()
    scrollToId(`exchange-${transitionId}`)
    const wait = prefersReducedMotion() ? 0 : 1100
    setTimeout(() => {
      if (token !== conversationActionToken) return
      showTranscriptTransition = true
      renderApplication()
      const fadeWait = prefersReducedMotion() ? 0 : 480
      setTimeout(() => {
        if (token !== conversationActionToken) return
        mode = 'focus'
        currentFocusStep = 0
        currentErrors = {}
        setConversationMascotState(null)
        renderApplication()
        window.scrollTo({ top: 0, behavior: 'auto' })
      }, fadeWait)
    }, wait)
  })
}

// The 350ms speak animation's end is what actually clears is-speaking (see
// the animationend listener in ensureConversationMascot) — this function
// only handles state/timing around it, not the class removal itself.
function playDonnaReveal(exchangeId, { attentive = false } = {}, onSettled) {
  const token = beginConversationAction()
  if (prefersReducedMotion()) {
    settledMessageIds.add(exchangeId)
    setConversationMascotState(attentive ? 'is-attentive' : null)
    onSettled()
    return
  }
  setConversationMascotState(attentive ? 'is-attentive' : null)
  renderApplication()
  const delay = attentive ? 900 : 480
  setTimeout(() => {
    if (token !== conversationActionToken) return
    settledMessageIds.add(exchangeId)
    setConversationMascotState('is-speaking')
    renderApplication()
    scrollToId(`exchange-${exchangeId}`)
    setTimeout(() => {
      if (token !== conversationActionToken) return
      onSettled()
    }, 260)
  }, delay)
}

function scrollToId(id) {
  window.requestAnimationFrame(() => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'end' })
  })
}

function focusOpenExchangeInput() {
  window.requestAnimationFrame(() => {
    const host = document.getElementById(`exchange-${openExchangeId}-input`)
    const focusable = host?.querySelector('input, select, textarea, button')
    focusable?.focus({ preventScroll: true })
  })
}

function rerenderCurrent() {
  const scrollY = window.scrollY
  renderApplication()
  window.scrollTo({ top: scrollY, behavior: 'auto' })
}

function validateExchange(exchange) {
  if (exchange.kind === 'ageRange') return validateAgeRange(applicationData.ageRangeMin, applicationData.ageRangeMax)
  const field = exchange.fields[0]
  const error = validateField(field, applicationData[field.name])
  if (!error && exchange.id === 'dateOfBirth' && !isAtLeast25(applicationData.dateOfBirth)) return UNDER_25_MESSAGE
  return error
}

function commitExchange(exchange) {
  const error = validateExchange(exchange)
  if (error) {
    exchangeErrors.set(exchange.id, error)
    rerenderCurrent()
    window.requestAnimationFrame(() => document.getElementById(`exchange-${exchange.id}-input`)?.querySelector('input, select, textarea')?.focus({ preventScroll: true }))
    return false
  }
  exchangeErrors.delete(exchange.id)
  exchange.fields.forEach((field) => {
    if (typeof applicationData[field.name] === 'string') applicationData[field.name] = sanitizeText(applicationData[field.name])
    else if (Array.isArray(applicationData[field.name])) applicationData[field.name] = applicationData[field.name].map(sanitizeText).filter(Boolean)
  })
  answeredExchangeIds.add(exchange.id)

  const wasEditingPast = previousOpenExchangeId !== null
  const restoreTarget = previousOpenExchangeId
  previousOpenExchangeId = null
  openExchangeId = null

  const editedFieldName = exchange.kind === 'field' ? exchange.fields[0].name : null
  if (editedFieldName) syncConditionalDependents(editedFieldName) // may set openExchangeId to a newly-visible dependent

  if (openExchangeId) {
    // A dependent exchange became visible and needs answering before we
    // return to wherever we were (Part B4).
    if (wasEditingPast) previousOpenExchangeId = restoreTarget
    renderApplication()
    focusOpenExchangeInput()
    return true
  }

  if (wasEditingPast) {
    if (!revealedExchangeIds.includes(restoreTarget)) {
      // The exchange we were going to return to no longer exists — this
      // edit removed it (Part B4/#6). Continue forward instead.
      renderApplication()
      advanceConversation()
      return true
    }
    openExchangeId = restoreTarget
    renderApplication()
    return true
  }

  renderApplication()
  continueAfterExchange(exchange)
  return true
}

// Part D2 — errors clear on change/blur, not only on submit.
function attachLiveErrorClear(form, exchange) {
  const revalidate = () => {
    if (!exchangeErrors.has(exchange.id)) return
    if (!validateExchange(exchange)) {
      exchangeErrors.delete(exchange.id)
      rerenderCurrent()
    }
  }
  form.querySelectorAll('input, select, textarea').forEach((control) => {
    control.addEventListener('blur', revalidate)
    control.addEventListener('change', revalidate)
  })
}

// Part B4 — editing a bubble may reveal or remove a conditional exchange
// without disturbing anything else in the transcript.
function syncConditionalDependents(editedFieldName) {
  CONVERSATION_EXCHANGES.forEach((exchange) => {
    if (exchange.kind !== 'field') return
    const condition = exchange.fields[0].condition
    if (!condition || condition.field !== editedFieldName) return
    const visible = isFieldVisible(exchange.fields[0], applicationData)
    const isRevealed = revealedExchangeIds.includes(exchange.id)
    if (!visible && isRevealed) {
      revealedExchangeIds = revealedExchangeIds.filter((id) => id !== exchange.id)
      answeredExchangeIds.delete(exchange.id)
      settledMessageIds.delete(exchange.id)
      exchangeErrors.delete(exchange.id)
      applicationData[exchange.fields[0].name] = ''
      if (openExchangeId === exchange.id) openExchangeId = null
    } else if (visible && !isRevealed) {
      const editedIndex = revealedExchangeIds.indexOf(editedFieldName)
      revealedExchangeIds.splice(editedIndex + 1, 0, exchange.id)
      settledMessageIds.add(exchange.id)
      openExchangeId = exchange.id
    }
  })
}

function openExchangeForEdit(exchangeId) {
  // Invalidates any in-flight playDonnaReveal timers so a fast Back/Forward
  // or edit click can't be clobbered by a stale sequence firing later (#12).
  // That invalidation can itself leave the target exchange stuck on its
  // typing indicator if the user navigated to it before its own reveal ever
  // reached settledMessageIds — settle it directly instead, since the user
  // is now actively engaging with it and there's nothing left to wait for.
  beginConversationAction()
  settledMessageIds.add(exchangeId)
  setConversationMascotState('is-listening')
  if (openExchangeId && openExchangeId !== exchangeId) previousOpenExchangeId = openExchangeId
  openExchangeId = exchangeId
  rerenderCurrent()
  focusOpenExchangeInput()
}

// Part G1 — move backward/forward through the current chapter's already-
// revealed exchanges without disturbing anything or crossing the chapter
// boundary (the previous chapter's transcript has already been cleared).
function currentChapterFieldIds() {
  return revealedExchangeIds.filter((id) => !id.startsWith('__'))
}

function currentChapterPositionIndex(ids) {
  if (openExchangeId) return ids.indexOf(openExchangeId)
  return ids.length - 1
}

function goToPreviousExchange() {
  const ids = currentChapterFieldIds()
  const index = currentChapterPositionIndex(ids)
  if (index <= 0) return
  openExchangeForEdit(ids[index - 1])
}

function goToNextExchange() {
  const ids = currentChapterFieldIds()
  const index = currentChapterPositionIndex(ids)
  if (index === -1 || index >= ids.length - 1) return
  openExchangeForEdit(ids[index + 1])
}

function buildExchangeErrorNode(exchangeId) {
  const message = exchangeErrors.get(exchangeId)
  if (!message) return null
  const error = createElement('p', 'application-field-error', message)
  error.id = fieldId(exchangeId, 'error')
  return error
}

function buildExplicitSubmit(form) {
  const actions = createElement('div', 'application-exchange-actions')
  actions.append(createButton('Continue', 'button application-button-secondary', 'submit'))
  form.append(actions)
}

// Single-choice fields (plain pills or the >5-option combobox) answer
// instantly on choice — a click is already a complete, unambiguous answer.
// Everything else needs an explicit "Continue" so a composed or multi-part
// answer can be reviewed before it collapses to a bubble (Part B1).
function suppressRedundantLabel(node) {
  node.querySelectorAll('.application-label').forEach((label) => label.classList.add('sr-only'))
  return node
}

function buildExchangeControl(exchange) {
  if (exchange.kind === 'ageRange') {
    const form = createElement('form', 'application-exchange-form')
    form.append(buildAgeRangeControl(exchange.fields[0], exchange.fields[1], { onChange: () => {} }))
    const error = buildExchangeErrorNode(exchange.id)
    if (error) form.append(error)
    buildExplicitSubmit(form)
    form.addEventListener('submit', (event) => { event.preventDefault(); commitExchange(exchange) })
    attachLiveErrorClear(form, exchange)
    return form
  }

  const field = exchange.fields[0]

  if (field.type === 'single_select') {
    if (field.options.length > 5) {
      const container = buildCombobox(field, {
        multiple: false,
        selectedValue: applicationData[field.name],
        onChoose: (value) => { applicationData[field.name] = value; commitExchange(exchange) },
      })
      const error = buildExchangeErrorNode(exchange.id)
      if (error) container.append(error)
      return container
    }
    const container = buildChoiceCard(field, {
      checked: applicationData[field.name],
      onChoose: (value) => { applicationData[field.name] = value; commitExchange(exchange) },
    })
    const error = buildExchangeErrorNode(exchange.id)
    if (error) container.append(error)
    return container
  }

  if (field.type === 'multi_select') {
    const form = createElement('form', 'application-exchange-form')
    if (field.options.length > 5) {
      form.append(buildCombobox(field, {
        multiple: true,
        selectedValue: applicationData[field.name],
        onChoose: (value) => {
          const selected = applicationData[field.name]
          applicationData[field.name] = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
          return applicationData[field.name]
        },
        onRemove: (value) => {
          applicationData[field.name] = applicationData[field.name].filter((item) => item !== value)
          return applicationData[field.name]
        },
      }))
    } else {
      form.append(buildCheckboxCards(field, {
        selected: applicationData[field.name],
        onToggle: (value, checked) => {
          const selected = applicationData[field.name]
          applicationData[field.name] = checked ? [...selected, value] : selected.filter((item) => item !== value)
        },
      }))
    }
    const error = buildExchangeErrorNode(exchange.id)
    if (error) form.append(error)
    buildExplicitSubmit(form)
    form.addEventListener('submit', (event) => { event.preventDefault(); commitExchange(exchange) })
    attachLiveErrorClear(form, exchange)
    return form
  }

  if (field.type === 'height') {
    const form = createElement('form', 'application-exchange-form')
    form.append(buildHeightControl(field, { onChange: () => {} }))
    const error = buildExchangeErrorNode(exchange.id)
    if (error) form.append(error)
    buildExplicitSubmit(form)
    form.addEventListener('submit', (event) => { event.preventDefault(); commitExchange(exchange) })
    attachLiveErrorClear(form, exchange)
    return form
  }

  if (field.type === 'string[]') {
    const form = createElement('form', 'application-exchange-form')
    form.append(buildStringArrayControl(field, {
      onInput: (index, value) => {
        const next = [...applicationData[field.name]]
        next[index] = value
        applicationData[field.name] = next
      },
    }))
    const error = buildExchangeErrorNode(exchange.id)
    if (error) form.append(error)
    buildExplicitSubmit(form)
    form.addEventListener('submit', (event) => { event.preventDefault(); commitExchange(exchange) })
    attachLiveErrorClear(form, exchange)
    return form
  }

  // text, email, tel, url, date
  const form = createElement('form', 'application-exchange-form')
  // buildTextInput sets the control's native `required` attribute. Without
  // noValidate, the browser's own constraint validation silently blocks the
  // 'submit' event on an empty required field (phone included) before our
  // handler — and therefore our custom error message — ever runs.
  form.noValidate = true
  const { container } = buildTextInput(field, { onInput: () => {} })
  form.append(container)
  const error = buildExchangeErrorNode(exchange.id)
  if (error) form.append(error)
  buildExplicitSubmit(form)
  form.addEventListener('submit', (event) => { event.preventDefault(); commitExchange(exchange) })
  attachLiveErrorClear(form, exchange)
  return form
}

function buildDonnaMessage(lines, { settled }) {
  const bubble = createElement('div', 'application-message-donna')
  bubble.append(createElement('span', 'application-message-donna-tag', 'donna'))
  if (settled) lines.forEach((line) => bubble.append(createElement('p', '', line)))
  return bubble
}

function buildTypingIndicator() {
  const typing = createElement('div', 'application-typing')
  typing.setAttribute('aria-hidden', 'true')
  typing.append(document.createElement('span'), document.createElement('span'), document.createElement('span'))
  return typing
}

function buildReplyBubble(exchange) {
  const button = createElement('button', 'application-reply')
  button.type = 'button'
  const summary = buildAnswerSummary(exchange)
  button.setAttribute('aria-label', `Your answer: ${summary}. Activate to edit.`)
  const tag = createElement('span', 'application-reply-tag', 'Tap to edit')
  tag.setAttribute('aria-hidden', 'true')
  button.append(tag)
  const text = createElement('p')
  summary.split('\n').forEach((line, index) => {
    if (index > 0) text.append(document.createElement('br'))
    text.append(document.createTextNode(line))
  })
  button.append(text)
  button.addEventListener('click', () => openExchangeForEdit(exchange.id))
  return button
}

// Solo donna messages have no field of their own — chapter briefs, the
// one-time name acknowledgement, and the Chapter VI→VII transition (Part
// C4/D2). Matched by id prefix so callers don't need to enumerate them.
function soloMessageText(exchangeId) {
  if (exchangeId === '__chapter-transition__') return transitionMessageText()
  if (exchangeId === '__name-ack__') return `Good to meet you, ${deriveFirstName(applicationData.fullName)}.`
  const briefMatch = exchangeId.match(/^__chapter-brief-(\d)__$/)
  if (briefMatch) return CHAPTER_BRIEFS[Number(briefMatch[1])]
  return ''
}

function isSoloMessageId(exchangeId) {
  return exchangeId.startsWith('__')
}

function renderExchangeRow(exchangeId) {
  const row = createElement('div', 'application-exchange')
  row.id = `exchange-${exchangeId}`

  if (isSoloMessageId(exchangeId)) {
    const settled = settledMessageIds.has(exchangeId)
    row.append(settled ? buildDonnaMessage([soloMessageText(exchangeId)], { settled: true }) : buildTypingIndicator())
    return row
  }

  const exchange = CONVERSATION_EXCHANGES.find((item) => item.id === exchangeId)
  const settled = settledMessageIds.has(exchangeId)
  row.append(settled ? buildDonnaMessage(getExchangeMessageLines(exchange), { settled: true }) : buildTypingIndicator())
  if (!settled) return row

  if (exchangeId === openExchangeId) {
    const inputHost = createElement('div', 'application-exchange-input')
    inputHost.id = `exchange-${exchangeId}-input`
    inputHost.append(buildExchangeControl(exchange))
    row.append(inputHost)
  } else if (answeredExchangeIds.has(exchangeId)) {
    row.append(buildReplyBubble(exchange))
  }

  return row
}

// Part G1 — step backward/forward through the current chapter's revealed
// exchanges without disturbing anything else. Unavailable at the first
// exchange (no crossing the chapter boundary) or already at the furthest
// point reached.
function buildConversationNav() {
  const ids = currentChapterFieldIds()
  if (!ids.length) return null
  const index = currentChapterPositionIndex(ids)
  const nav = createElement('div', 'application-conversation-nav')
  const back = createButton('Back', 'application-inline-button')
  back.setAttribute('aria-label', 'Previous question')
  back.disabled = index <= 0
  back.addEventListener('click', goToPreviousExchange)
  const forward = createButton('Forward', 'application-inline-button')
  forward.setAttribute('aria-label', 'Next question')
  forward.disabled = index === -1 || index >= ids.length - 1
  forward.addEventListener('click', goToNextExchange)
  nav.append(back, forward)
  return nav
}

// Conversation mode mounts this shell exactly once and mutates it in place
// on every subsequent render (progress/nav content replaced, transcript rows
// replaced) rather than rebuilding the screen from scratch. The mascot
// wrapper and image live outside anything this touches, so their node
// identity — and the CSS transition riding on it — survives every exchange.
let conversationScreenEl = null
let conversationHeadingEl = null
let conversationProgressHost = null
let conversationNavHost = null
let conversationLayoutEl = null
let conversationTranscriptEl = null

function ensureConversationShell() {
  if (conversationScreenEl) return conversationScreenEl

  conversationScreenEl = createElement('section', 'application-screen application-conversation')
  conversationHeadingEl = createElement('h1', 'sr-only', 'Application conversation')
  conversationHeadingEl.id = 'application-heading'
  conversationHeadingEl.tabIndex = -1
  conversationProgressHost = createElement('div')
  conversationNavHost = createElement('div')
  conversationLayoutEl = createElement('div', 'application-conversation-layout')
  conversationTranscriptEl = createElement('div', 'application-transcript')
  conversationTranscriptEl.setAttribute('aria-live', 'polite')

  conversationLayoutEl.append(ensureConversationMascot(), conversationTranscriptEl)
  conversationScreenEl.append(conversationHeadingEl, conversationProgressHost, conversationNavHost, conversationLayoutEl)
  return conversationScreenEl
}

// Called on every conversation-mode render. Updates the persistent shell's
// contents in place — replaceChildren() here only ever targets the progress/
// nav hosts or the transcript, none of which is an ancestor of the mascot.
function renderConversationScreen() {
  ensureConversationShell()

  conversationProgressHost.replaceChildren()
  const progress = buildProgress()
  if (progress) conversationProgressHost.append(progress)

  conversationNavHost.replaceChildren()
  const nav = buildConversationNav()
  if (nav) conversationNavHost.append(nav)

  conversationTranscriptEl.classList.toggle('is-transitioning', showTranscriptTransition)
  conversationTranscriptEl.replaceChildren(...revealedExchangeIds.map(renderExchangeRow))

  return conversationScreenEl
}

// Part F1 — donna travels down the column to sit beside the newest message
// and settles there while its input is open, instead of staying sticky.
// Reads the persistent wrapper directly (not a query) since it's never torn
// down; the offset is measured after the transcript above has rendered, and
// applied on the render's next animation frame so the browser has a prior
// painted transform to animate from rather than a fresh mount (#11).
function positionMascot() {
  if (mode !== 'conversation' || !conversationMascotColEl) return
  if (prefersReducedMotion()) {
    conversationMascotColEl.style.transform = ''
    return
  }
  const targetId = openExchangeId || revealedExchangeIds[revealedExchangeIds.length - 1]
  const targetRow = targetId && document.getElementById(`exchange-${targetId}`)
  // targetRow's offsetParent is .application-conversation-layout (the
  // nearest positioned ancestor, which the mascot wrapper shares), so its
  // offsetTop is already layout-relative — no further subtraction needed.
  const offset = targetRow ? targetRow.offsetTop : 0
  conversationMascotColEl.style.transform = `translateY(${offset}px)`
}

/* ---------------------------------------------------------------------- */
/* Focus mode — Chapter VII, Photographs, Consent (Part A2/D9)             */
/* ---------------------------------------------------------------------- */

function focusScreenHeading() {
  window.requestAnimationFrame(() => root.querySelector('h1')?.focus({ preventScroll: true }))
}

function focusFirstFocusError() {
  const firstName = Object.keys(currentErrors)[0]
  window.requestAnimationFrame(() => {
    const targetName = firstName === 'ageRange' ? 'ageRangeMin' : firstName
    const control = root.querySelector(`#${CSS.escape(fieldId(targetName))}, [name^="${CSS.escape(targetName)}"]`)
    control?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    control?.focus({ preventScroll: true })
  })
}

function addFocusFieldError(container, fieldName) {
  if (!currentErrors[fieldName]) return
  const error = createElement('p', 'application-field-error', currentErrors[fieldName])
  error.id = fieldId(fieldName, 'error')
  container.append(error)
}

function buildFocusField(field) {
  if (field.type === 'single_select') {
    const container = buildChoiceCard(field, {
      checked: applicationData[field.name],
      onChoose: (value) => {
        applicationData[field.name] = value
        if (attemptedFocusSteps.has(currentFocusStep)) validateFocusStep({ focusErrors: false, refresh: true })
        else renderApplication({ focusHeading: false })
      },
    })
    addFocusFieldError(container, field.name)
    return container
  }
  const { container, control } = buildTextInput(field, {
    onInput: () => { if (attemptedFocusSteps.has(currentFocusStep)) validateFocusStep({ focusErrors: false, refresh: true }) },
  })
  control.addEventListener('blur', () => { if (attemptedFocusSteps.has(currentFocusStep)) validateFocusStep({ focusErrors: false, refresh: true }) })
  addFocusFieldError(container, field.name)
  return container
}

function buildFocusMascot(donnaLine) {
  const row = createElement('div', 'application-mascot-row')
  row.append(buildMascotImg())
  if (donnaLine) {
    const bubble = createElement('div', 'application-mascot-bubble')
    bubble.append(createElement('span', 'application-mascot-tag', 'donna'), createElement('p', '', donnaLine))
    row.append(bubble)
  }
  return row
}

// Chapter VII's donna line at the top of each focus screen: donnaLine when
// the prototype supplied one for this screen (Part C4), otherwise framing.
// ch7-s1's original donnaLine is now spoken as the Part A3 transition
// message, so it falls back to framing here.
function focusScreenDonnaLine(step) {
  if (step.id === 'ch7-s1') return step.framing
  return step.donnaLine || step.framing
}

function validateFocusStep({ focusErrors = true, refresh = false } = {}) {
  const step = FOCUS_STEPS[currentFocusStep]
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
  })
  currentErrors = errors
  const valid = Object.keys(errors).length === 0
  if (!valid || refresh) renderApplication({ focusHeading: false })
  if (!valid && focusErrors) focusFirstFocusError()
  return valid
}

function buildFocusStep() {
  const step = FOCUS_STEPS[currentFocusStep]
  const form = createElement('form', 'application-screen application-form')
  form.noValidate = true
  form.append(buildProgress(), buildFocusMascot(focusScreenDonnaLine(step)), buildEyebrow())
  const heading = createElement('h1', '', step.headline)
  heading.id = 'application-heading'
  heading.tabIndex = -1
  form.append(heading)
  const fields = createElement('div', 'application-fields')
  step.fields.forEach((field) => fields.append(buildFocusField(field)))
  form.append(fields)
  const actions = createElement('div', 'application-navigation')
  if (currentFocusStep > 0) {
    const back = createButton('Back', 'button application-button-secondary')
    back.addEventListener('click', () => goToFocusStep(currentFocusStep - 1))
    actions.append(back)
  }
  const status = createElement('p', 'application-navigation-status')
  status.setAttribute('aria-live', 'polite')
  if (Object.keys(currentErrors).length) status.textContent = 'A few answers are still needed below.'
  const isLastScreenInChapter = step.screenInChapter === step.screensInChapter
  const next = createButton(isLastScreenInChapter ? 'Finish chapter' : 'Continue', 'button button-primary', 'submit')
  actions.append(status, next)
  form.append(actions)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    attemptedFocusSteps.add(currentFocusStep)
    if (validateFocusStep()) goToFocusStep(currentFocusStep + 1)
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
  item.append(createElement('h2', '', presentation.label))
  const stored = photoState.get(slot.id)
  if (stored) {
    const preview = createElement('div', 'application-photo-preview')
    const image = document.createElement('img')
    image.src = stored.url
    image.alt = `Local preview of ${slot.label.toLowerCase()}`
    const details = createElement('div', 'application-photo-details')
    details.append(createElement('p', '', stored.file.name))
    const remove = createButton('Remove', 'application-inline-button')
    remove.addEventListener('click', () => { releasePhoto(slot.id); renderApplication({ focusHeading: false }) })
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
    if (attemptedFocusSteps.has(currentFocusStep)) validatePhotographs({ focusErrors: false, refresh: true })
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
  if (!valid && focusErrors) focusFirstFocusError()
  return valid
}

function buildPhotographs() {
  const step = FOCUS_STEPS[currentFocusStep]
  const screen = createElement('section', 'application-screen application-form')
  screen.append(buildProgress(), buildFocusMascot(''), buildEyebrow())
  const heading = createElement('h1', '', step.title)
  heading.tabIndex = -1
  screen.append(heading, createElement('p', 'application-lead', step.description))
  screen.append(createElement('p', 'application-photo-guidance', 'JPEG, PNG or WebP, up to 10 MB each. Kept in this browser tab only.'))
  const grid = createElement('div', 'application-photo-grid')
  PHOTO_SLOTS.forEach((slot) => grid.append(buildPhotoSlot(slot)))
  screen.append(grid)
  const actions = createElement('div', 'application-navigation')
  const back = createButton('Back', 'button application-button-secondary')
  back.addEventListener('click', () => goToFocusStep(currentFocusStep - 1))
  const status = createElement('p', 'application-navigation-status')
  status.setAttribute('aria-live', 'polite')
  if (Object.keys(currentErrors).length) status.textContent = 'A few answers are still needed below.'
  const next = createButton('Continue')
  next.addEventListener('click', () => {
    attemptedFocusSteps.add(currentFocusStep)
    if (validatePhotographs()) goToFocusStep(currentFocusStep + 1)
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

// Chapters I–VI no longer have their own screen to return to (Part A3: no
// returning to conversation mode). Their review rows are inline-editable in
// place instead, reusing the same field controls conversation mode uses.
// Chapter VII's row still edits by jumping to its focus screen — that
// navigation is unaffected by the conversation-mode rule.
const reviewEditingField = { current: null }

function buildInlineReviewValue(field) {
  const dd = document.createElement('dd')
  if (reviewEditingField.current === field.name) {
    const host = createElement('div', 'application-review-edit')
    if (field.type === 'single_select') {
      host.append(buildChoiceCard(field, {
        checked: applicationData[field.name],
        onChoose: (value) => { applicationData[field.name] = value; reviewEditingField.current = null; renderApplication({ focusHeading: false }) },
      }))
    } else if (field.type === 'multi_select') {
      const form = createElement('form', 'application-exchange-form')
      form.append(field.options.length > 5
        ? buildCombobox(field, {
          multiple: true,
          selectedValue: applicationData[field.name],
          onChoose: (value) => {
            const selected = applicationData[field.name]
            applicationData[field.name] = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
            return applicationData[field.name]
          },
          onRemove: (value) => {
            applicationData[field.name] = applicationData[field.name].filter((item) => item !== value)
            return applicationData[field.name]
          },
        })
        : buildCheckboxCards(field, {
          selected: applicationData[field.name],
          onToggle: (value, checked) => {
            const selected = applicationData[field.name]
            applicationData[field.name] = checked ? [...selected, value] : selected.filter((item) => item !== value)
          },
        }))
      const done = createButton('Done', 'button application-button-secondary', 'submit')
      const actions = createElement('div', 'application-exchange-actions')
      actions.append(done)
      form.append(actions)
      form.addEventListener('submit', (event) => { event.preventDefault(); reviewEditingField.current = null; renderApplication({ focusHeading: false }) })
      host.append(form)
    } else if (field.type === 'height') {
      host.append(buildHeightControl(field, { onChange: () => {} }))
      const done = createButton('Done', 'button application-button-secondary')
      done.addEventListener('click', () => { reviewEditingField.current = null; renderApplication({ focusHeading: false }) })
      host.append(done)
    } else if (field.type === 'string[]') {
      host.append(buildStringArrayControl(field, {
        onInput: (index, value) => {
          const next = [...applicationData[field.name]]
          next[index] = value
          applicationData[field.name] = next
        },
      }))
      const done = createButton('Done', 'button application-button-secondary')
      done.addEventListener('click', () => { reviewEditingField.current = null; renderApplication({ focusHeading: false }) })
      host.append(done)
    } else {
      const { container, control } = buildTextInput(field, { onInput: () => {} })
      host.append(container)
      control.addEventListener('blur', () => { reviewEditingField.current = null; renderApplication({ focusHeading: false }) })
      window.requestAnimationFrame(() => control.focus({ preventScroll: true }))
    }
    dd.append(suppressRedundantLabel(host)) // the <dt> beside it already names the field
    return dd
  }
  const button = createElement('button', 'application-reply application-review-inline-edit')
  button.type = 'button'
  const displayText = displayValue(field, applicationData[field.name])
  button.setAttribute('aria-label', `${field.label}: ${displayText}. Activate to edit.`)
  button.textContent = displayText
  button.addEventListener('click', () => { reviewEditingField.current = field.name; renderApplication({ focusHeading: false }) })
  dd.append(button)
  return dd
}

function buildReviewGroup(chapterNumber, chapterLabel, fields, focusStepIndex) {
  const section = createElement('section', 'application-review-group')
  const header = createElement('div', 'application-review-header')
  header.append(createElement('h2', '', chapterLabel))
  if (chapterNumber === 7) {
    const edit = createButton('Edit', 'application-inline-button')
    edit.addEventListener('click', () => goToFocusStep(focusStepIndex))
    header.append(edit)
  }
  section.append(header)
  const list = document.createElement('dl')
  fields.filter((field) => isFieldVisible(field, applicationData)).forEach((field, index, visibleFields) => {
    if (field.group === 'ageRange') {
      if (index > 0 && visibleFields[index - 1].group === 'ageRange') return
      list.append(createElement('dt', '', field.groupLabel), createElement('dd', '', `${applicationData.ageRangeMin}–${applicationData.ageRangeMax}`))
      return
    }
    list.append(createElement('dt', '', field.label))
    if (chapterNumber === 7) list.append(createElement('dd', '', displayValue(field, applicationData[field.name])))
    else list.append(buildInlineReviewValue(field))
  })
  if (fields.some((field) => field.name === 'availableWithinFourWeeks') && applicationData.availableWithinFourWeeks === 'not_right_now') {
    list.append(createElement('dt', '', 'Review flag'), createElement('dd', 'application-review-flag', 'Not right now'))
  }
  section.append(list)
  return section
}

function buildChapterReviewGroups() {
  const chapters = new Map()
  APPLICATION_STEPS.forEach((step) => {
    if (!step.chapterNumber) return
    if (!chapters.has(step.chapterNumber)) {
      chapters.set(step.chapterNumber, { label: step.chapterTitle, fields: [] })
    }
    chapters.get(step.chapterNumber).fields.push(...step.fields)
  })
  const chapter7FocusIndex = FOCUS_STEPS.findIndex((step) => step.chapterNumber === 7)
  return [...chapters.entries()].map(([chapterNumber, { label, fields }]) => buildReviewGroup(chapterNumber, label, fields, chapter7FocusIndex))
}

function buildPhotoReview() {
  const section = createElement('section', 'application-review-group')
  const header = createElement('div', 'application-review-header')
  header.append(createElement('h2', '', 'Photographs'))
  const edit = createButton('Edit', 'application-inline-button')
  edit.addEventListener('click', () => goToFocusStep(FOCUS_STEPS.findIndex((step) => step.id === 'photographs')))
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
  ;[['Privacy Notice', siteConfig.privacyNoticeUrl], ['Terms', siteConfig.pilotTermsUrl]].forEach(([label, url], index) => {
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
      if (attemptedFocusSteps.has(currentFocusStep)) validateConsents({ refresh: true })
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

function buildGatewayItems(items, className, ordered = false) {
  const list = createElement(ordered ? 'ol' : 'ul', className)
  items.forEach(({ title, copy }) => {
    const item = document.createElement('li')
    item.append(createElement('h3', '', title), createElement('p', '', copy))
    list.append(item)
  })
  return list
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
  const step = FOCUS_STEPS[currentFocusStep]
  const form = createElement('form', 'application-screen application-review')
  form.noValidate = true
  form.append(buildProgress(), buildFocusMascot(''), buildEyebrow())
  const heading = createElement('h1', '', step.title)
  heading.tabIndex = -1
  form.append(heading)
  const summary = createElement('div', 'application-review-sections')
  buildChapterReviewGroups().forEach((group) => summary.append(group))
  summary.append(buildPhotoReview())
  form.append(summary, buildConsentList())
  const actions = createElement('div', 'application-navigation')
  const back = createButton('Back', 'button application-button-secondary')
  back.addEventListener('click', () => goToFocusStep(currentFocusStep - 1))
  const status = createElement('p', 'application-navigation-status')
  status.setAttribute('aria-live', 'polite')
  if (Object.keys(currentErrors).length) status.textContent = 'A few answers are still needed below.'
  const submit = createButton(siteConfig.applicationMode === 'preview' ? 'Test application' : 'Submission unavailable', 'button button-primary', 'submit')
  if (siteConfig.applicationMode !== 'preview') submit.disabled = true
  actions.append(back, status, submit)
  form.append(actions)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    attemptedFocusSteps.add(currentFocusStep)
    if (!validateConsents()) {
      renderApplication({ focusHeading: false })
      focusFirstFocusError()
      return
    }
    if (siteConfig.applicationMode !== 'preview') return
    previewComplete = true
    currentErrors = {}
    renderApplication()
  })
  return form
}

function goToFocusStep(stepIndex) {
  currentFocusStep = Math.max(0, Math.min(stepIndex, FOCUS_STEPS.length - 1))
  currentErrors = {}
  previewComplete = false
  renderApplication()
  window.scrollTo({ top: 0, behavior: 'auto' })
}

/* ---------------------------------------------------------------------- */
/* Gateway                                                                 */
/* ---------------------------------------------------------------------- */

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
  begin.addEventListener('click', () => startConversation())
  screen.append(begin)
  screen.append(createElement('p', 'application-gateway-privacy', APPLICATION_GATEWAY.privacyCopy))
  screen.append(createElement('p', 'application-gateway-disclaimer', APPLICATION_GATEWAY.pilotDisclaimer))
  const back = createElement('a', 'application-gateway-back', 'Back to donna')
  back.href = '/index.html'
  screen.append(back)
  return screen
}

/* ---------------------------------------------------------------------- */
/* Top-level render                                                        */
/* ---------------------------------------------------------------------- */

function renderApplication({ focusHeading = true } = {}) {
  let screen
  if (mode === 'gateway') screen = buildGateway()
  else if (mode === 'conversation') screen = renderConversationScreen()
  else if (FOCUS_STEPS[currentFocusStep]?.id === 'photographs') screen = buildPhotographs()
  else if (FOCUS_STEPS[currentFocusStep]?.id === 'review-and-consent') screen = buildReview()
  else screen = buildFocusStep()
  // Every other mode rebuilds `screen` fresh each call, so this is always
  // true for them. Conversation mode returns the same persistent element on
  // every render, so once mounted this is a no-op — the mascot's ancestor
  // chain is never touched by root again (#4).
  if (root.firstElementChild !== screen) root.replaceChildren(screen)
  root.classList.toggle('is-gateway', mode === 'gateway')
  if (focusHeading && mode !== 'conversation') focusScreenHeading()
  if (mode === 'conversation') window.requestAnimationFrame(positionMascot)
}

window.addEventListener('beforeunload', () => photoState.forEach(({ url }) => URL.revokeObjectURL(url)))
// Keeps the mascot aligned with its target row if the viewport is resized
// mid-conversation (#14) — reflowed text can move a row's offsetTop.
window.addEventListener('resize', () => {
  if (mode === 'conversation') window.requestAnimationFrame(positionMascot)
})
renderApplication()
window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
