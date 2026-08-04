const EXPERIENCE_STORAGE_KEY = 'donnaExperienceSeen'

const desktopPositions = [
  { x: -39, y: -31, rotation: -7 },
  { x: -15, y: -34, rotation: 5 },
  { x: 16, y: -31, rotation: -4 },
  { x: 39, y: -28, rotation: 7 },
  { x: -39, y: 20, rotation: 5 },
  { x: -14, y: 28, rotation: -6 },
  { x: 16, y: 27, rotation: 5 },
  { x: 39, y: 19, rotation: -5 },
]

const mobilePositions = [
  { x: -27, y: -28, rotation: -6 },
  { x: 27, y: -25, rotation: 5 },
  { x: -28, y: 27, rotation: 5 },
  { x: 28, y: 29, rotation: -4 },
]

function shouldShowExperienceIntro() {
  const forceIntro = new URLSearchParams(window.location.search).get('intro') === '1'

  try {
    return forceIntro || window.sessionStorage.getItem(EXPERIENCE_STORAGE_KEY) !== '1'
  } catch {
    return true
  }
}

function markExperienceSeen() {
  try {
    window.sessionStorage.setItem(EXPERIENCE_STORAGE_KEY, '1')
  } catch {
    // The intro still works when storage is unavailable.
  }
}

function hydrateImages(tiles) {
  tiles.forEach((tile) => {
    const image = tile.querySelector('img[data-src]')
    if (!image) return

    image.src = image.dataset.src
    image.removeAttribute('data-src')
  })
}

export function initExperienceIntro() {
  const root = document.documentElement
  const overlay = document.querySelector('[data-experience-intro]')
  const page = document.querySelector('.donna-page')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!overlay || !page || !shouldShowExperienceIntro() || reducedMotion) {
    root.classList.remove('experience-pending')
    overlay?.remove()
    return
  }

  const motion = window.gsap
  const skipButton = overlay.querySelector('[data-experience-skip]')
  const arrival = overlay.querySelector('[data-experience-arrival]')
  const tiles = [...overlay.querySelectorAll('.experience-intro__image')]
  const isMobile = window.matchMedia('(max-width: 640px)').matches
  const positions = isMobile ? mobilePositions : desktopPositions
  const activeTiles = isMobile ? tiles.slice(0, positions.length) : tiles
  let timeline
  let complete = false

  hydrateImages(activeTiles)
  markExperienceSeen()
  overlay.classList.add('is-running')
  root.classList.add('experience-active')
  page.setAttribute('inert', '')
  page.setAttribute('aria-hidden', 'true')

  function cleanup({ focusPage = false } = {}) {
    if (complete) return
    complete = true
    timeline?.kill()

    const finishCleanup = () => {
      root.classList.remove('experience-active', 'experience-pending')
      page.removeAttribute('inert')
      page.removeAttribute('aria-hidden')
      overlay.remove()

      if (focusPage) {
        document.querySelector('#hero-title')?.focus({ preventScroll: true })
      }
    }

    if (!motion) {
      overlay.classList.add('is-leaving')
      window.setTimeout(finishCleanup, 650)
      return
    }

    motion.timeline({ onComplete: finishCleanup })
      .to(overlay, { opacity: 0, duration: 0.85, ease: 'power2.inOut' })
      .fromTo(
        '.hero-copy',
        { opacity: 0.45, y: 18, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: 'power2.out' },
        '<0.08',
      )
  }

  skipButton?.addEventListener('click', () => cleanup({ focusPage: true }), { once: true })

  if (!motion || !arrival || !activeTiles.length) {
    window.setTimeout(() => cleanup(), 1200)
    return
  }

  motion.set(arrival, { opacity: 0, y: 18 })
  motion.set(tiles, {
    top: '50%',
    left: '50%',
    xPercent: -50,
    yPercent: -50,
    scale: 0.04,
    opacity: 0,
  })

  timeline = motion.timeline({ defaults: { overwrite: 'auto' } })
    .to(activeTiles, {
      opacity: 1,
      scale: 1,
      duration: 0.62,
      stagger: 0.07,
      ease: 'power3.out',
    }, 0.55)
    .to(activeTiles, {
      x: (index) => `${positions[index].x}vw`,
      y: (index) => `${positions[index].y}vh`,
      rotation: (index) => positions[index].rotation,
      scale: isMobile ? 0.42 : 0.4,
      duration: 1.15,
      stagger: 0.04,
      ease: 'power3.inOut',
    }, 1.6)
    .to(arrival, { opacity: 1, y: 0, duration: 0.72, ease: 'power3.out' }, 3.1)
    .add(() => cleanup(), '+=2')
}
