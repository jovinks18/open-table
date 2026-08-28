import journeyMarkup from './template.html?raw'
import './styles.css'
import { fieldBindings } from './fields.js'
import { journeyStore } from './store.js'

const root = document.querySelector('#journey-root')

if (!root) throw new Error('Journey root was not found.')

const source = document.createElement('template')
source.innerHTML = journeyMarkup
const screenMarkup = new Map(
  [...source.content.children].filter((screen) => screen.classList.contains('screen')).map((screen) => [screen.id, screen.outerHTML]),
)
source.innerHTML = ''

function valueAtPath(target, path) {
  return path.split('.').reduce((value, part) => value?.[part], target)
}

function readChoiceValue(container) {
  return container.querySelector('.pill.selected')?.textContent.trim() || ''
}

function registerField(screen, { path, selector, index = 0, type = 'value' }) {
  const element = root.querySelectorAll(selector)[index]
  if (!element) return

  element.dataset.field = path
  if ('name' in element && !element.name) element.name = path

  if (type === 'choice') {
    const storedValue = valueAtPath(journeyStore.getState(), path)
    element.querySelectorAll('.pill').forEach((pill) => {
      const selected = pill.textContent.trim() === storedValue
      pill.classList.toggle('selected', selected)
      pill.setAttribute('aria-pressed', String(selected))
    })
    element.addEventListener('click', (event) => {
      if (!event.target.closest('.pill')) return
      queueMicrotask(() => journeyStore.setField(path, readChoiceValue(element)))
    })
    return
  }

  const storedValue = valueAtPath(journeyStore.getState(), path)
  if (storedValue !== undefined && storedValue !== null) element.value = storedValue

  const update = () => {
    const value = type === 'number' ? Number(element.value) : element.value
    journeyStore.setField(path, value)
  }
  element.addEventListener('input', update)
  element.addEventListener('change', update)
}

function mountFieldBindings(screen) {
  fieldBindings.forEach((binding) => registerField(screen, binding))
}

root.addEventListener('journey:navigate', ({ detail }) => journeyStore.setScreen(detail.screenId))

window.donnaJourney = Object.freeze({
  getState: journeyStore.getState,
  subscribe: journeyStore.subscribe,
  serialize: journeyStore.serialize,
})

const { initializeJourney } = await import('./controller.js')
initializeJourney({ root, screenMarkup, mountFieldBindings })
