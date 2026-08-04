import './shared.js'
import { initExperienceIntro } from './modules/experience-intro.js'
import { initHeadingAnimation } from './modules/heading-animation.js'
import { initStoryCards } from './modules/story-cards.js'

document.addEventListener('DOMContentLoaded', () => {
  initExperienceIntro()
  initStoryCards()
  initHeadingAnimation()
})
