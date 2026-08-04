function revealCardsSimple(cards) {
  if (!('IntersectionObserver' in window)) {
    cards.forEach((card) => card.classList.add('is-visible'))
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    },
    { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
  )

  cards.forEach((card) => observer.observe(card))
}

export function initStoryCards() {
  const cards = document.querySelectorAll('.story-card')
  const stage = document.querySelector('.story-card-stage')

  if (!cards.length) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const enhancedQuery = window.matchMedia('(min-width: 961px)')
  const motion = window.gsap

  if (reducedMotion.matches || !motion || !stage || !enhancedQuery.matches) {
    revealCardsSimple(cards)
    return
  }

  const root = document.documentElement
  const cardElements = motion.utils.toArray(cards)
  const cardInners = motion.utils.toArray('.story-card-inner')
  const positions = [15, 38, 62, 85]
  const rotations = [-10, -4, 4, 10]

  root.classList.add('cards-enhanced')
  motion.set(cardElements, { zIndex: (index) => cardElements.length - index })

  const timeline = motion.timeline({ paused: true })

  timeline
    .to(
      cardElements,
      {
        left: (index) => `${positions[index]}%`,
        rotation: (index) => rotations[index],
        duration: 1,
        stagger: 0.035,
        ease: 'power3.out',
      },
      0,
    )
    .to(
      cardInners,
      {
        rotationY: 180,
        duration: 1.15,
        stagger: 0.07,
        ease: 'power2.inOut',
      },
      0.4,
    )

  if (!('IntersectionObserver' in window)) {
    timeline.progress(1)
    return
  }

  const stageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        timeline.play()
        stageObserver.disconnect()
      })
    },
    { threshold: 0.3 },
  )

  stageObserver.observe(stage)
}
