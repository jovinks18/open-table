import journeyMarkup from './template.html?raw'
import './styles.css'
import { journeyStore } from './store.js'

const root = document.querySelector('#journey-root')
if (!root) throw new Error('Journey root was not found.')

const source = document.createElement('template')
source.innerHTML = journeyMarkup
const screenMarkup = new Map(
  [...source.content.children].filter((screen) => screen.classList.contains('screen')).map((screen) => [screen.id, screen.outerHTML]),
)
source.innerHTML = ''

root.innerHTML = `
  <div class="journey-shell">
    <header class="journey-header" data-journey-header hidden>
      <div class="journey-header__mark">
        <span class="brand">donna</span>
        <p class="chapter-status" data-chapter-status aria-live="polite"></p>
      </div>
    </header>
    <main class="journey-main">
      <div class="journey-stage">
        <div class="persistent-mascot" data-persistent-mascot aria-hidden="true"></div>
        <div class="screen-host" data-screen-host></div>
      </div>
    </main>
  </div>`

const screenHost = root.querySelector('[data-screen-host]')
const { initializeJourney } = await import('./controller.js')
initializeJourney({ root, screenHost, screenMarkup })

window.donnaJourney = Object.freeze({
  getState: journeyStore.getState,
  subscribe: journeyStore.subscribe,
  serialize: journeyStore.serialize,
})
