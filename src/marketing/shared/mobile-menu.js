export function initMobileMenu() {
  const root = document.documentElement
  const menuButton = document.querySelector('.menu-toggle')
  const menu = document.querySelector('.mobile-menu')
  const closeButton = menu?.querySelector('.mobile-menu__close')
  const main = document.querySelector('main')
  const footer = document.querySelector('.site-footer')

  if (!menuButton || !menu) return

  const menuLinks = [...menu.querySelectorAll('a')]
  const menuFocusables = [closeButton, ...menuLinks].filter(Boolean)

  function setBackgroundInert(inert) {
    ;[main, footer].forEach((element) => {
      if (!element) return
      if (inert) element.setAttribute('inert', '')
      else element.removeAttribute('inert')
    })
  }

  function openMenu() {
    menu.hidden = false
    menuButton.setAttribute('aria-expanded', 'true')
    root.classList.add('menu-open')
    setBackgroundInert(true)
    window.requestAnimationFrame(() => closeButton?.focus())
  }

  function closeMenu({ returnFocus = true } = {}) {
    if (menu.hidden) return
    menu.hidden = true
    menuButton.setAttribute('aria-expanded', 'false')
    root.classList.remove('menu-open')
    setBackgroundInert(false)
    if (returnFocus) menuButton.focus({ preventScroll: true })
  }

  menuButton.addEventListener('click', () => {
    if (menu.hidden) openMenu()
    else closeMenu()
  })

  closeButton?.addEventListener('click', () => closeMenu())

  menuLinks.forEach((link) => {
    link.addEventListener('click', () => closeMenu({ returnFocus: false }))
  })

  document.addEventListener('keydown', (event) => {
    if (menu.hidden) return

    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
      return
    }

    if (event.key !== 'Tab') return
    const currentIndex = menuFocusables.indexOf(document.activeElement)
    const nextIndex = event.shiftKey
      ? (currentIndex - 1 + menuFocusables.length) % menuFocusables.length
      : (currentIndex + 1) % menuFocusables.length
    event.preventDefault()
    menuFocusables[nextIndex].focus()
  })

  window.matchMedia('(min-width: 900px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu({ returnFocus: false })
  })
}
