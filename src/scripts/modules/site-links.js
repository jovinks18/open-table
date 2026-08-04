export function buildMailtoHref(contactEmail, subject = '') {
  const email = String(contactEmail || '').trim()
  if (!email) return ''
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : ''
  return `mailto:${email}${query}`
}

export function isConfiguredHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim())
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
