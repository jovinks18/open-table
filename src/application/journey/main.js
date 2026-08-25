import journeyMarkup from './template.html?raw'
import './styles.css'
import { fieldBindings } from './fields.js'
import { journeyStore } from './store.js'

const root = document.querySelector('#journey-root')

if (!root) throw new Error('Journey root was not found.')

root.innerHTML = journeyMarkup

function readChoiceValue(container) {
  const selected = container.querySelector('.pill.selected, .choice-card.selected')
  return selected?.querySelector('h3')?.textContent.trim() || selected?.textContent.trim() || ''
}

function registerField({ path, selector, index = 0, type = 'value' }) {
  const element = root.querySelectorAll(selector)[index]
  if (!element) return

  element.dataset.field = path
  if ('name' in element && !element.name) element.name = path

  if (type === 'choice' || type === 'choice-card') {
    element.addEventListener('click', (event) => {
      if (!event.target.closest('.pill, .choice-card')) return
      queueMicrotask(() => journeyStore.setField(path, readChoiceValue(element)))
    })
    return
  }

  const update = () => {
    const value = type === 'number' ? Number(element.value) : element.value
    journeyStore.setField(path, value)
  }
  element.addEventListener('input', update)
  element.addEventListener('change', update)
}

fieldBindings.forEach(registerField)

root.addEventListener('journey:navigate', ({ detail }) => journeyStore.setScreen(detail.screenId))

window.donnaJourney = Object.freeze({
  getState: journeyStore.getState,
  subscribe: journeyStore.subscribe,
  serialize: journeyStore.serialize,
})

await import('./controller.js')
