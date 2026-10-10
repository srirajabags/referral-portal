// Google Analytics events, through the gtag snippet in index.html (the same
// property as www.srirajabags.in). Every call goes through analyticsParams, so
// only the allowed, non-personal fields are ever sent.
import { analyticsParams } from '../domain/analytics.js'

export const track = (event, params) => {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event, analyticsParams(params))
    }
  } catch {
    // Analytics must never break the page.
  }
}
