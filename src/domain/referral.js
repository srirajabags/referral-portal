// Rules the portal applies before anything reaches the network. The proxy
// applies the same rules again -- these exist so a person gets told at once,
// not after a round trip, and so the two sides spell things the same way.

export const BUSINESS_WHATSAPP = '919177056061'

// Crockford base32, seven characters. Mirrors normaliseCode in the proxy.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const CODE_LENGTH = 7

export const normaliseCode = (raw) => {
  const clean = String(raw ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0').replace(/[IL]/g, '1')
  if (clean.length !== CODE_LENGTH) return null
  for (const ch of clean) if (!ALPHABET.includes(ch)) return null
  return clean
}

// Which screen a URL means. GitHub Pages serves every unknown path from
// 404.html, so /r/K7M2QX9 arrives here as a path to read, not a file.
export const routeFor = (pathname) => {
  const m = /^\/r\/([^/]+)\/?$/.exec(pathname || '')
  if (m) {
    // A link cut short mid-escape ("%E0%A4") makes decodeURIComponent throw;
    // that is a bad link, not a crash.
    let raw
    try { raw = decodeURIComponent(m[1]) } catch { return { page: 'bad-link' } }
    const code = normaliseCode(raw)
    return code ? { page: 'referral', code } : { page: 'bad-link' }
  }
  return { page: 'home' }
}

// Indian mobiles only, stored as +91XXXXXXXXXX. Mirrors the proxy.
export const normaliseIndianMobile = (raw) => {
  let digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null
}

// "+919876543210" -> "+91 98765 43210", the way people say it aloud.
export const formatMobile = (e164) => {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164 || '')
  return m ? `+91 ${m[1]} ${m[2]}` : (e164 || '')
}

export const OTP_LENGTH = 6
export const cleanOtp = (raw) => String(raw ?? '').replace(/\D/g, '').slice(0, OTP_LENGTH)

// What an affiliate sends to a buyer. Written for the buyer, not the affiliate:
// it is the first thing they will read about us.
export const shareMessage = (link) =>
  `Need custom-printed non-woven bags for your business? Sri Raja Bags manufactures them in bulk, ` +
  `printed with your shop name and logo. Send them an enquiry here: ${link}`

export const whatsappShareUrl = (link) =>
  `https://wa.me/?text=${encodeURIComponent(shareMessage(link))}`

// A buyer who would rather just message us. The code rides along in the text
// so staff can credit the right affiliate when the chat comes in.
// Without a code (a broken link) it is just an enquiry.
export const whatsappEnquiryUrl = (code) =>
  `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(
    `Hi, I'd like a quote for custom non-woven bags.${code ? ` Referral code: ${code}` : ''}`,
  )}`

// Firebase error codes -> something a person can act on. Anything unlisted gets
// the generic line rather than Firebase's own wording, which reads like a stack trace.
const AUTH_ERRORS = {
  'auth/invalid-phone-number': 'That mobile number does not look right.',
  'auth/missing-phone-number': 'Please enter your mobile number.',
  'auth/too-many-requests': 'Too many attempts. Please wait a while and try again.',
  'auth/quota-exceeded': 'We cannot send more codes right now. Please try again later.',
  'auth/invalid-verification-code': 'That code is not correct. Please check the SMS and try again.',
  'auth/code-expired': 'That code has expired. Please ask for a new one.',
  'auth/session-expired': 'That code has expired. Please ask for a new one.',
  'auth/captcha-check-failed': 'The security check failed. Please reload the page and try again.',
  'auth/network-request-failed': 'No connection. Please check your internet and try again.',
  'auth/operation-not-allowed': 'Sign-in is not switched on yet. Please contact Sri Raja Bags.',
}
// An unlisted error carries its code (or, failing that, the start of its message)
// in brackets: a person can read it out or screenshot it, and without it a
// report of "something went wrong" cannot be told apart from any other.
export const authErrorMessage = (err) => {
  if (AUTH_ERRORS[err?.code]) return AUTH_ERRORS[err.code]
  const ref = err?.code || String(err?.message ?? '').replace(/^Firebase:\s*/, '').slice(0, 60)
  return `Something went wrong. Please try again.${ref ? ` (${ref})` : ''}`
}

// What the enquiry form checks before sending. Returns the first problem, or null.
export const enquiryProblem = ({ businessName, phone, consent }) => {
  if (String(businessName ?? '').trim().length < 2) return 'Please enter your business name.'
  if (!normaliseIndianMobile(phone)) return 'Please enter a 10-digit Indian mobile number.'
  if (consent !== true) return 'Please agree to be contacted about your enquiry.'
  return null
}

// The language Firebase sends the SMS in. Firebase's own useDeviceLanguage()
// hands the browser's tag straight to reCAPTCHA, which refuses anything over six
// characters -- so a browser reporting "zh-Hant-TW", or a Linux one reporting
// "en-US@posix", could never sign in at all. Keep "te-IN" / "hi-IN" as they are,
// fall back to the bare language when the full tag is too long, and to Firebase's
// default (null) when there is nothing usable.
export const smsLanguage = (tag) => {
  const parts = String(tag ?? '').split(/[@.]/)[0].split(/[-_]/).filter(Boolean)
  if (!parts.length || !/^[a-zA-Z]{2,3}$/.test(parts[0])) return null
  const full = parts.join('-')
  if (full.length <= 6 && /^[a-zA-Z0-9-]+$/.test(full)) return full
  return parts[0].toLowerCase()
}
