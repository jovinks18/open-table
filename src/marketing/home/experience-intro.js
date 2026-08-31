const EXPERIENCE_STORAGE_KEY = 'donnaExperienceSeen'

const tileRotations = [7.5, -2.5, -10, 12.5, -5, 5, -8, 9]

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

function splitTitle(title) {
  if (!title) return []

  const text = title.textContent.trim()
  title.textContent = ''
  title.setAttribute('aria-label', text)

  return [...text].map((character) => {
    const span = document.createElement('span')
    span.className = 'experience-intro__char'
    span.setAttribute('aria-hidden', 'true')
    span.textContent = character
    title.append(span)
    return span
  })
}

function getWordmarkTarget() {
  const selector = window.matchMedia('(max-width: 899px)').matches
    ? '.mobile-wordmark .donna-wordmark'
    : '.nav-wordmark .donna-wordmark'
  const wordmark = document.querySelector(selector)
  const header = document.querySelector('[data-site-header]')

  if (!wordmark || !header) return null

  const wordmarkRect = wordmark.getBoundingClientRect()
  const headerRect = header.getBoundingClientRect()

  return {
    centerX: wordmarkRect.left + (wordmarkRect.width / 2),
    centerY: wordmarkRect.height
      ? wordmarkRect.top + (wordmarkRect.height / 2)
      : headerRect.top + (headerRect.height / 2),
    width: wordmarkRect.width,
  }
}

export function initExperienceIntro() {
  const root = document.documentElement
  const overlay = document.querySelector('[data-experience-intro]')
  const curtain = overlay?.querySelector('[data-experience-curtain]')
  const page = document.querySelector('.donna-page')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!overlay || !curtain || !page || !shouldShowExperienceIntro() || reducedMotion) {
    root.classList.remove('experience-pending')
    overlay?.remove()
    return
  }

  const motion = window.gsap
  const skipButton = overlay.querySelector('[data-experience-skip]')
  const title = overlay.querySelector('[data-experience-title] h2')
  const titleCharacters = splitTitle(title)
  const tiles = [...overlay.querySelectorAll('.experience-intro__image')]
  const isMobile = window.matchMedia('(max-width: 640px)').matches
  const activeTiles = isMobile ? tiles.slice(0, 4) : tiles
  let timeline
  let complete = false

  hydrateImages(activeTiles)
  markExperienceSeen()
  overlay.classList.add('is-running')
  root.classList.add('experience-active')
  page.setAttribute('inert', '')
  page.setAttribute('aria-hidden', 'true')

  function finishCleanup({ focusPage = false } = {}) {
    if (complete) return
    complete = true
    timeline?.kill()
    root.classList.remove('experience-active', 'experience-pending')
    page.removeAttribute('inert')
    page.removeAttribute('aria-hidden')
    overlay.remove()

    if (focusPage) {
      document.querySelector('#hero-title')?.focus({ preventScroll: true })
    }
  }

  function revealPage({ focusPage = false } = {}) {
    if (complete) return
    timeline?.kill()

    if (!motion) {
      overlay.classList.add('is-leaving')
      window.setTimeout(() => finishCleanup({ focusPage }), 650)
      return
    }

    motion.timeline({ onComplete: () => finishCleanup({ focusPage }) })
      .to(curtain, {
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
        duration: 0.7,
        ease: 'power3.inOut',
      })
      .fromTo(
        '.hero-copy',
        { opacity: 0.7, y: 18 },
        { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' },
        '<0.18',
      )
  }

  skipButton?.addEventListener('click', () => revealPage({ focusPage: true }), { once: true })

  if (!motion || !titleCharacters.length || !activeTiles.length) {
    window.setTimeout(() => revealPage(), 1200)
    return
  }

  const titleRect = title.getBoundingClientRect()
  const wordmarkTarget = getWordmarkTarget()
  const titleDestination = wordmarkTarget
    ? {
        x: wordmarkTarget.centerX - (titleRect.left + (titleRect.width / 2)),
        y: wordmarkTarget.centerY - (titleRect.top + (titleRect.height / 2)),
        scale: Math.min(1, wordmarkTarget.width / titleRect.width),
      }
    : { yPercent: -110 }

  motion.set(activeTiles, {
    xPercent: -50,
    yPercent: -50,
    scale: 0,
    rotation: (index) => tileRotations[index],
    clipPath: 'polygon(20% 20%, 80% 20%, 80% 80%, 20% 80%)',
  })
  motion.set(titleCharacters, { yPercent: 110 })

  timeline = motion.timeline({
    delay: 0.5,
    onComplete: finishCleanup,
  })
    .to(activeTiles, {
      scale: 1,
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      duration: 1,
      ease: 'power3.inOut',
      stagger: 0.16,
    }, 0)
    .to(titleCharacters, {
      yPercent: 0,
      duration: 1,
      ease: 'power4.inOut',
      stagger: { each: 0.1, from: 'random' },
    }, 0.35)
    .to(activeTiles, {
      scale: 0,
      clipPath: 'polygon(20% 20%, 80% 20%, 80% 80%, 20% 80%)',
      duration: 1,
      ease: 'power4.inOut',
      stagger: -0.075,
    }, 3.5)
    .to(title, {
      ...titleDestination,
      duration: 1.15,
      ease: 'power4.inOut',
    }, 3.5)
    .to(curtain, {
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
      duration: 1.2,
      ease: 'power4.inOut',
    }, 3.62)
    .fromTo(
      '.hero-copy',
      { opacity: 0.7, y: 18 },
      { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' },
      3.9,
    )
}
