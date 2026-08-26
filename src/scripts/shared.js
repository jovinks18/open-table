import { siteConfig } from '../config/site.js'
import { initMobileMenu } from './modules/mobile-menu.js'
import { initSiteNavigation } from './modules/site-navigation.js'
import { buildMailtoHref, isConfiguredHttpUrl } from './modules/site-links.js'

function initContactLink() {
  const contactLinks = document.querySelectorAll('[data-contact-link]')
  const contactFallbacks = document.querySelectorAll('[data-contact-fallback]')

  if (!siteConfig.contactEmail || !contactLinks.length) return

  contactLinks.forEach((contactLink) => {
    const subject = contactLink.dataset.contactSubject
    contactLink.href = buildMailtoHref(siteConfig.contactEmail, subject)
    contactLink.hidden = false
  })

  contactFallbacks.forEach((contactFallback) => {
    contactFallback.setAttribute('hidden', '')
  })
}

function initPrivacyLink() {
  const privacyLinks = document.querySelectorAll('[data-privacy-link]')
  const privacyFallbacks = document.querySelectorAll('[data-privacy-fallback]')

  if (!isConfiguredHttpUrl(siteConfig.privacyNoticeUrl) || !privacyLinks.length) return

  privacyLinks.forEach((privacyLink) => {
    privacyLink.href = siteConfig.privacyNoticeUrl
    privacyLink.hidden = false
  })

  privacyFallbacks.forEach((privacyFallback) => {
    privacyFallback.setAttribute('hidden', '')
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initSiteNavigation()
  initContactLink()
  initPrivacyLink()
  initMobileMenu()
})
