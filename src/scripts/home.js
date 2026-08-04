import './shared.js'
import { initHeadingAnimation } from './modules/heading-animation.js'
import { initStoryCards } from './modules/story-cards.js'

document.addEventListener('DOMContentLoaded', () => {
  initStoryCards()
  initHeadingAnimation()
})
