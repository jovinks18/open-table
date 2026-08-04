import { siteConfig } from '../config/site.js'
import { initMobileMenu } from './modules/mobile-menu.js'

function initContactLink() {
  const contactLinks = document.querySelectorAll('[data-contact-link]')
  const contactFallbacks = document.querySelectorAll('[data-contact-fallback]')

  if (!siteConfig.contactEmail || !contactLinks.length) return

  contactLinks.forEach((contactLink) => {
    const subject = contactLink.dataset.contactSubject
    const query = subject ? `?subject=${encodeURIComponent(subject)}` : ''
    contactLink.href = `mailto:${siteConfig.contactEmail}${query}`
    contactLink.hidden = false
  })

  contactFallbacks.forEach((contactFallback) => {
    contactFallback.setAttribute('hidden', '')
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initContactLink()
  initMobileMenu()
})
