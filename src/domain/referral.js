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

// Which screen a URL means. Links are shared as /r/?c=CODE: r/index.html is a
// real file on Pages, so a link preview crawler gets a 200. Older /r/CODE links
// still work in a browser, through the 404.html fallback.
const safeDecode = (s) => { try { return decodeURIComponent(s) } catch { return null } }

export const routeFor = (pathname, search = '') => {
  if (/^\/r\/?$/.test(pathname || '')) {
    const raw = new URLSearchParams(search).get('c')
    const code = raw === null ? null : normaliseCode(raw)
    return code ? { page: 'referral', code } : { page: 'bad-link' }
  }
  const m = /^\/r\/([^/]+)\/?$/.exec(pathname || '')
  if (m) {
    // A link cut short mid-escape ("%E0%A4") is a bad link, not a crash.
    const raw = safeDecode(m[1])
    const code = raw === null ? null : normaliseCode(raw)
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

// A lead an affiliate adds from their dashboard, checked before it is sent
// (the proxy checks again). ownPhone: the affiliate's own +91 number.
export const leadProblem = ({ businessName, phone, consent }, ownPhone) => {
  if (String(businessName ?? '').trim().length < 2) return 'Please enter the business name.'
  const mobile = normaliseIndianMobile(phone)
  if (!mobile) return 'Please enter their 10-digit Indian mobile number.'
  if (ownPhone && mobile === ownPhone) return "That is your own number. Add the buyer's number instead."
  if (consent !== true) return 'Please confirm they have agreed to be contacted by Sri Raja Bags.'
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

// When an enquiry came in, as an Indian reader writes a date: "10 Oct 2026".
// Always IST, whatever timezone the phone is set to.
const ENQUIRY_DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
export const formatEnquiryDate = (unixSeconds) =>
  Number.isFinite(unixSeconds) && unixSeconds > 0 ? ENQUIRY_DATE.format(new Date(unixSeconds * 1000)) : ''

// Rupees as an Indian reader writes them: "₹1,500", "₹1,23,456", and paise only
// when there are some ("₹34.50").
const RUPEES = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const RUPEES_PAISE = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const formatRupees = (amount) => {
  const n = Number(amount)
  if (!Number.isFinite(n)) return RUPEES.format(0)
  return Number.isInteger(Math.round(n * 100) / 100) ? RUPEES.format(n) : RUPEES_PAISE.format(n)
}

// A tier's time limit for withdrawing commission: 3 -> "3 months". None: "".
export const validityText = (months) => {
  const n = Math.floor(Number(months))
  return Number.isFinite(n) && n > 0 ? `${n} month${n === 1 ? '' : 's'}` : ''
}

// What the dashboard says about the next commission to expire (from the
// proxy's nextExpiry: { amount, at }). Within 30 days it is a warning.
const EXPIRY_WARNING_DAYS = 30
export const expiryNotice = (next, nowMs = Date.now()) => {
  if (!next || !(Number(next.amount) > 0) || !next.at) return null
  const date = formatEnquiryDate(next.at)
  const urgent = next.at * 1000 - nowMs <= EXPIRY_WARNING_DAYS * 86_400_000
  return urgent
    ? { urgent, text: `${formatRupees(next.amount)} of your balance expires on ${date}. Withdraw it before then, or it can no longer be withdrawn.` }
    : { urgent, text: `${formatRupees(next.amount)} expires on ${date} if not withdrawn by then.` }
}

// A tier rate as a person says it: 0.01 -> "1%", 0.005 -> "0.5%".
export const formatPercent = (rate) => {
  const n = Number(rate)
  if (!Number.isFinite(n)) return ''
  return `${Math.round(n * 10000) / 100}%`
}

// UPI IDs as the proxy accepts them (normaliseUpiId there): name@handle, one case.
export const normaliseUpiId = (raw) => {
  const v = String(raw ?? '').trim().toLowerCase()
  return /^[a-z0-9][a-z0-9._-]{0,255}@[a-z][a-z0-9]{1,63}$/.test(v) ? v : null
}

// The first thing wrong with a withdrawal request, or null. The proxy checks
// again; this is so the person hears about it before pressing anything twice.
export const withdrawalProblem = ({ upiId, amount, available }) => {
  if (!normaliseUpiId(upiId)) return 'Please enter a valid UPI ID, like name@okhdfcbank.'
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return 'Please enter an amount to withdraw.'
  if (Math.round(n * 100 + 1e-6) / 100 > available) return 'That is more than your current balance.'
  return null
}

// Which dashboard tab an address means, and the address of a tab. The tab lives
// in the URL so the back button and a refresh both keep the affiliate in place.
export const DASHBOARD_VIEWS = ['overview', 'enquiries', 'withdrawals', 'onboard']
export const viewFor = (search) => {
  const v = new URLSearchParams(search ?? '').get('view')
  return DASHBOARD_VIEWS.includes(v) ? v : 'overview'
}
export const urlForView = (view) => (DASHBOARD_VIEWS.includes(view) && view !== 'overview' ? `/?view=${view}` : '/')

// The first thing wrong with an onboarding form, or null. The proxy checks again.
export const onboardProblem = ({ name, phone, consent }) => {
  if (String(name ?? '').trim().length < 2) return 'Please enter their name.'
  if (!normaliseIndianMobile(phone)) return 'Please enter their 10-digit Indian mobile number.'
  if (consent !== true) return 'Please confirm they have agreed to join.'
  return null
}

// A WhatsApp message straight to the person just onboarded, telling them which
// number to sign in with, since that is what links them to whoever onboarded them.
export const inviteWhatsappUrl = ({ phone, name, portalUrl }) => {
  const e164 = normaliseIndianMobile(phone)
  if (!e164) return null
  const first = String(name ?? '').trim().split(/\s+/)[0]
  const text = `Hi${first ? ` ${first}` : ''}, I've added you to the Sri Raja Bags partner programme. ` +
    `You earn commission when businesses you introduce order custom-printed bags. Sign in at ${portalUrl} ` +
    `with this number (${formatMobile(e164)}) to get your own referral link.`
  return `https://wa.me/${e164.slice(1)}?text=${encodeURIComponent(text)}`
}

// A reminder beside someone onboarded who has not signed in after a few days.
const INVITE_NUDGE_DAYS = 3
export const inviteNudge = ({ joined, onboardedAt }, nowMs = Date.now()) => {
  if (joined || !onboardedAt) return null
  const days = Math.floor((nowMs - onboardedAt * 1000) / 86_400_000)
  return days >= INVITE_NUDGE_DAYS ? `Not joined yet, ${days} days after you added them. Send the invite again?` : null
}

// What an affiliate's lead-quality rating means, in one sentence.
export const leadQualityText = ({ label, good = 0, junk = 0 } = {}) => {
  const decided = good + junk
  if (label === 'Not rated yet' || decided < 3) {
    return 'We rate your leads once our team has decided on a few of them.'
  }
  const of = `${good} of your ${decided} decided lead${decided === 1 ? '' : 's'} turned into real business`
  if (label === 'Good') return `${of}. Your enquiries are handled first.`
  if (label === 'Fair') return `${of}. Better-qualified leads raise your rating.`
  return `${of}. Enquiries from low-rated accounts are handled last, and junk leads can lead to a block.`
}
