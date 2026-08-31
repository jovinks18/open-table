import '../shared/index.js'
import { initExperienceIntro } from './experience-intro.js'
import { initHeadingAnimation } from './heading-animation.js'
import { initStoryCards } from './story-cards.js'

document.addEventListener('DOMContentLoaded', () => {
  initExperienceIntro()
  initStoryCards()
  initHeadingAnimation()
})
