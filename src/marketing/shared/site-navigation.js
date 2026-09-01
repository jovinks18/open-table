const DESKTOP_BREAKPOINT = '(min-width: 900px)'

function currentAttribute(page, item) {
  return page === item ? ' aria-current="page"' : ''
}

function navigationMarkup(page) {
  const howHref = page === 'home' ? '#how' : '/index.html#how'
  const solid = page !== 'home'

  return `
    <header class="site-header${solid ? ' is-solid' : ' is-hero'}" data-site-header>
      <div class="site-header__inner">
        <nav class="desktop-nav" aria-label="Primary navigation">
          <a href="/our-story.html"${currentAttribute(page, 'story')}>Our story</a>
          <a href="${howHref}">How it works</a>
          <a class="nav-wordmark" href="/index.html" aria-label="donna home"${currentAttribute(page, 'home')}>
            <span class="donna-wordmark" aria-hidden="true">donna</span>
          </a>
          <div class="questions-menu">
            <button class="questions-trigger" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="questions-dropdown">Questions</button>
            <ul class="questions-dropdown" id="questions-dropdown" hidden>
              <li><a href="/faq.html"${currentAttribute(page, 'faq')}>Common questions</a></li>
            </ul>
          </div>
          <a href="/safety.html"${currentAttribute(page, 'safety')}>Safety</a>
        </nav>
        <a class="header-cta" href="/apply.html" data-nav-apply${currentAttribute(page, 'apply')}>Apply to join</a>
        <a class="mobile-wordmark" href="/index.html" aria-label="donna home"${currentAttribute(page, 'home')}>
          <span class="donna-wordmark" aria-hidden="true">donna</span>
        </a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu">Menu</button>
      </div>
      <div class="mobile-menu" id="mobile-menu" hidden>
        <button class="mobile-menu__close" type="button" aria-label="Close menu">Close</button>
        <nav aria-label="Mobile navigation">
          <a href="/our-story.html"${currentAttribute(page, 'story')}>Our story</a>
          <a href="${howHref}">How it works</a>
          <a href="/faq.html"${currentAttribute(page, 'faq')}>Common questions</a>
          <a href="/safety.html"${currentAttribute(page, 'safety')}>Safety</a>
          <a href="/apply.html"${currentAttribute(page, 'apply')}>Apply to join</a>
        </nav>
      </div>
    </header>`
}

function initQuestionsDropdown(header) {
  const trigger = header.querySelector('.questions-trigger')
  const panel = header.querySelector('.questions-dropdown')
  if (!trigger || !panel) return

  const links = [...panel.querySelectorAll('a')]
  const isOpen = () => trigger.getAttribute('aria-expanded') === 'true'

  function open({ focusFirst = false } = {}) {
    panel.hidden = false
    trigger.setAttribute('aria-expanded', 'true')
    if (focusFirst) links[0]?.focus()
  }

  function close({ returnFocus = false } = {}) {
    if (!isOpen()) return
    panel.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
    if (returnFocus) trigger.focus({ preventScroll: true })
  }

  trigger.addEventListener('click', () => {
    if (isOpen()) close()
    else open()
  })

  trigger.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    open({ focusFirst: true })
    if (event.key === 'ArrowUp') links.at(-1)?.focus()
  })

  panel.addEventListener('keydown', (event) => {
    const index = links.indexOf(document.activeElement)
    if (event.key === 'Escape') {
      event.preventDefault()
      close({ returnFocus: true })
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') links[0]?.focus()
    else if (event.key === 'End') links.at(-1)?.focus()
    else {
      const direction = event.key === 'ArrowDown' ? 1 : -1
      links[(index + direction + links.length) % links.length]?.focus()
    }
  })

  links.forEach((link) => link.addEventListener('click', () => close()))
  document.addEventListener('click', (event) => {
    if (!header.querySelector('.questions-menu')?.contains(event.target)) close()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) close({ returnFocus: true })
  })
}

function initHeroScroll(header) {
  if (!header.classList.contains('is-hero')) return
  const hero = document.querySelector('.hero')
  if (!hero) return

  let scheduled = false
  let lastScrollY = window.scrollY
  function update() {
    scheduled = false
    const currentScrollY = window.scrollY
    const scrollDelta = currentScrollY - lastScrollY
    const pastHero = hero.getBoundingClientRect().bottom <= 0
    header.classList.toggle('is-solid', pastHero)
    header.classList.toggle('is-sticky', pastHero)

    if (!pastHero) {
      header.classList.remove('is-scroll-hidden')
    } else if (scrollDelta > 4) {
      header.classList.add('is-scroll-hidden')
    } else if (scrollDelta < -4) {
      header.classList.remove('is-scroll-hidden')
    }

    lastScrollY = currentScrollY
  }
  function schedule() {
    if (scheduled) return
    scheduled = true
    window.requestAnimationFrame(update)
  }
  update()
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  header.addEventListener('focusin', () => header.classList.remove('is-scroll-hidden'))
}

export function initSiteNavigation() {
  const host = document.querySelector('[data-site-navigation]')
  if (!host) return
  const page = host.dataset.page || 'home'
  host.replaceWith(document.createRange().createContextualFragment(navigationMarkup(page)))
  const header = document.querySelector('[data-site-header]')
  if (!header) return

  initQuestionsDropdown(header)
  initHeroScroll(header)

  const desktopQuery = window.matchMedia(DESKTOP_BREAKPOINT)
  desktopQuery.addEventListener('change', () => {
    const trigger = header.querySelector('.questions-trigger')
    const panel = header.querySelector('.questions-dropdown')
    if (!desktopQuery.matches && trigger && panel) {
      trigger.setAttribute('aria-expanded', 'false')
      panel.hidden = true
    }
  })
}
