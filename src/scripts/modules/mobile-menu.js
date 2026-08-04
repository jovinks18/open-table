export function initMobileMenu() {
  const root = document.documentElement
  const menuButton = document.querySelector('.menu-toggle')
  const menu = document.querySelector('.mobile-menu')
  const main = document.querySelector('main')
  const footer = document.querySelector('.site-footer')

  if (!menuButton || !menu) return

  const menuLinks = [...menu.querySelectorAll('a')]

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
    window.requestAnimationFrame(() => menuLinks[0]?.focus())
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
    const focusable = [menuButton, ...menuLinks]
    const currentIndex = focusable.indexOf(document.activeElement)
    const nextIndex = event.shiftKey
      ? (currentIndex - 1 + focusable.length) % focusable.length
      : (currentIndex + 1) % focusable.length
    event.preventDefault()
    focusable[nextIndex].focus()
  })

  window.matchMedia('(min-width: 641px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu({ returnFocus: false })
  })
}
