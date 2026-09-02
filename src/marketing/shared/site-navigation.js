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
          <a href="/faq.html"${currentAttribute(page, 'faq')}>FAQ</a>
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
          <a href="/faq.html"${currentAttribute(page, 'faq')}>FAQ</a>
          <a href="/safety.html"${currentAttribute(page, 'safety')}>Safety</a>
          <a href="/apply.html"${currentAttribute(page, 'apply')}>Apply to join</a>
        </nav>
      </div>
    </header>`
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

  initHeroScroll(header)
}
