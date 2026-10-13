import { describe, it, expect } from 'vitest'
import {
  normaliseCode, routeFor, normaliseIndianMobile, formatMobile, cleanOtp,
  shareMessage, whatsappShareUrl, whatsappEnquiryUrl, authErrorMessage, enquiryProblem, smsLanguage,
  formatEnquiryDate, formatRupees, formatPercent, normaliseUpiId, withdrawalProblem, viewFor, urlForView,
  onboardProblem, inviteWhatsappUrl, leadQualityText, validityText, expiryNotice, leadProblem, inviteNudge,
} from './referral.js'

describe('routeFor — a shared link lands on the right screen', () => {
  it('reads the code from /r/?c=CODE, the form links are shared in', () => {
    // A real file on Pages, so WhatsApp gets a 200 and draws a preview.
    expect(routeFor('/r/', '?c=K7M2QX9')).toEqual({ page: 'referral', code: 'K7M2QX9' })
    expect(routeFor('/r', '?c=k7m-2qx9&utm_source=whatsapp')).toEqual({ page: 'referral', code: 'K7M2QX9' })
  })
  it('still honours old /r/CODE links, however they were typed', () => {
    expect(routeFor('/r/K7M2QX9')).toEqual({ page: 'referral', code: 'K7M2QX9' })
    expect(routeFor('/r/k7m2qx9/')).toEqual({ page: 'referral', code: 'K7M2QX9' })
    expect(routeFor('/r/K7M-2QX9')).toEqual({ page: 'referral', code: 'K7M2QX9' })
  })
  it('says a mangled link is mangled instead of showing the sign-in page', () => {
    // A buyer who lands on "enter your phone to earn commission" would be lost.
    expect(routeFor('/r/K7M2Q')).toEqual({ page: 'bad-link' })
    expect(routeFor('/r/%E0%A4')).toEqual({ page: 'bad-link' })
    expect(routeFor('/r/', '?c=K7M2Q')).toEqual({ page: 'bad-link' })
    expect(routeFor('/r/', '')).toEqual({ page: 'bad-link' })
    expect(routeFor('/r/', '?c=%E0%A4')).toEqual({ page: 'bad-link' })
  })
  it('sends everything else home', () => {
    for (const p of ['/', '', '/anything', '/r/K7M2QX9/extra']) expect(routeFor(p).page).toBe('home')
  })
})

describe('codes and numbers match what the proxy accepts', () => {
  it('normaliseCode forgives O/0 and I/L/1 and nothing else', () => {
    expect(normaliseCode('o7i2lx9')).toBe('0712' + '1X9')
    expect(normaliseCode('U7M2QX9')).toBe(null)
  })
  it('normaliseIndianMobile takes the usual spellings of one number', () => {
    for (const raw of ['9876543210', '+91 98765 43210', '09876543210', '919876543210']) {
      expect(normaliseIndianMobile(raw)).toBe('+919876543210')
    }
    for (const raw of ['12345', '5876543210', '+14155550123']) expect(normaliseIndianMobile(raw)).toBe(null)
  })
  it('formats a number the way people read it out', () => {
    expect(formatMobile('+919876543210')).toBe('+91 98765 43210')
  })
  it('cleans a pasted OTP down to six digits', () => {
    expect(cleanOtp(' 123-456 ')).toBe('123456')
    expect(cleanOtp('1234567')).toBe('123456')
  })
})

describe('sharing', () => {
  const link = 'https://refer.srirajabags.in/r/K7M2QX9'
  it('puts the link in the message the buyer receives', () => {
    expect(shareMessage(link)).toContain(link)
    expect(decodeURIComponent(whatsappShareUrl(link).split('text=')[1])).toBe(shareMessage(link))
  })
  it('carries the code into a WhatsApp enquiry so staff can credit it', () => {
    const url = whatsappEnquiryUrl('K7M2QX9')
    expect(url.startsWith('https://wa.me/919177056061?text=')).toBe(true)
    expect(decodeURIComponent(url)).toContain('Referral code: K7M2QX9')
  })
  it('sends a plain enquiry when there is no code to carry', () => {
    expect(decodeURIComponent(whatsappEnquiryUrl(null))).not.toContain('Referral code')
  })
})

describe('messages a person sees', () => {
  it('turns known Firebase codes into plain words', () => {
    expect(authErrorMessage({ code: 'auth/invalid-verification-code' })).toMatch(/not correct/)
  })
  it('shows the code of an unknown error, so a screenshot says what failed', () => {
    // Found in testing: a failed resend showed only "Something went wrong" and
    // nothing on screen said why.
    expect(authErrorMessage({ code: 'auth/internal-error', message: 'Firebase: Error (auth/internal-error).' }))
      .toBe('Something went wrong. Please try again. (auth/internal-error)')
    expect(authErrorMessage(new Error('reCAPTCHA has already been rendered in this element')))
      .toBe('Something went wrong. Please try again. (reCAPTCHA has already been rendered in this element)')
    expect(authErrorMessage(undefined)).toBe('Something went wrong. Please try again.')
  })
  it('enquiryProblem names the first thing to fix', () => {
    const good = { businessName: 'Ravi Traders', phone: '9876543210', consent: true }
    expect(enquiryProblem(good)).toBe(null)
    expect(enquiryProblem({ ...good, businessName: ' ' })).toMatch(/business name/)
    expect(enquiryProblem({ ...good, phone: '123' })).toMatch(/mobile/)
    expect(enquiryProblem({ ...good, consent: false })).toMatch(/agree/)
  })
})

describe('smsLanguage — a browser language must never block sign-in', () => {
  it('keeps the tags Indian phones actually report', () => {
    for (const tag of ['en-IN', 'te-IN', 'hi-IN', 'ta', 'en']) expect(smsLanguage(tag)).toBe(tag)
  })
  it('strips what Firebase rejects, instead of failing with auth/argument-error', () => {
    // Found in testing: a Linux browser reports "en-US@posix" and sign-in died before any SMS.
    expect(smsLanguage('en-US@posix')).toBe('en-US')
    expect(smsLanguage('zh-Hant-TW')).toBe('zh')
    expect(smsLanguage('en_IN.UTF-8')).toBe('en-IN')
  })
  it('falls back to Firebase\'s default when there is nothing usable', () => {
    for (const tag of ['', null, undefined, 'C', 'POSIX', '*']) expect(smsLanguage(tag)).toBe(null)
  })
})

describe('formatEnquiryDate — dates as an Indian affiliate reads them', () => {
  it('shows the IST date, even when UTC has not reached that day yet', () => {
    // 10 Oct 2026, 00:30 IST is still 9 Oct in UTC.
    expect(formatEnquiryDate(Date.UTC(2026, 9, 9, 19, 0) / 1000)).toBe('10 Oct 2026')
  })
  it('shows nothing rather than a nonsense date when there is none', () => {
    for (const v of [null, undefined, 0, NaN, 'x']) expect(formatEnquiryDate(v)).toBe('')
  })
})

describe('formatRupees — commission as an Indian affiliate reads it', () => {
  it('groups digits the Indian way and drops paise when there are none', () => {
    expect(formatRupees(1500)).toBe('₹1,500')
    expect(formatRupees(123456)).toBe('₹1,23,456')
    expect(formatRupees(0)).toBe('₹0')
  })
  it('shows paise when the 1% leaves some', () => {
    expect(formatRupees(34.5)).toBe('₹34.50')
    expect(formatRupees(1534.49999999)).toBe('₹1,534.50')
  })
  it('never prints NaN', () => {
    for (const v of [null, undefined, 'x', NaN]) expect(formatRupees(v)).toBe('₹0')
  })
})

describe('formatPercent — tier rates as people say them', () => {
  it('drops needless decimals', () => {
    expect(formatPercent(0.01)).toBe('1%')
    expect(formatPercent(0.005)).toBe('0.5%')
    expect(formatPercent(0.0125)).toBe('1.25%')
  })
})

describe('withdrawal requests — told at once, checked again by the proxy', () => {
  it('accepts a UPI ID in any case, as the proxy does', () => {
    expect(normaliseUpiId(' Ravi@OKSBI ')).toBe('ravi@oksbi')
    expect(normaliseUpiId('ravi')).toBe(null)
  })
  it('names the first thing to fix', () => {
    const ok = { upiId: 'a@ybl', amount: '100', available: 263 }
    expect(withdrawalProblem(ok)).toBe(null)
    expect(withdrawalProblem({ ...ok, upiId: 'nope' })).toMatch(/UPI ID/)
    expect(withdrawalProblem({ ...ok, amount: '' })).toMatch(/amount/)
    expect(withdrawalProblem({ ...ok, amount: '263.01' })).toMatch(/more than/)
    expect(withdrawalProblem({ ...ok, amount: '263' })).toBe(null)
  })
})

describe('dashboard tabs live in the address', () => {
  it('reads the tab, defaulting to the overview for anything unknown', () => {
    expect(viewFor('?view=enquiries')).toBe('enquiries')
    expect(viewFor('?view=withdrawals')).toBe('withdrawals')
    expect(viewFor('?view=onboard')).toBe('onboard')
    for (const q of ['', '?view=nope', '?x=1', undefined]) expect(viewFor(q)).toBe('overview')
  })
  it('round-trips, so back and refresh land on the same tab', () => {
    for (const v of ['overview', 'enquiries', 'withdrawals', 'onboard']) expect(viewFor(urlForView(v).split('/')[1])).toBe(v)
    expect(urlForView('nonsense')).toBe('/')
    expect(routeFor('/', '?view=enquiries').page).toBe('home')
  })
})

describe('onboarding another affiliate', () => {
  it('names the first thing to fix, with the phone number required', () => {
    const ok = { name: 'Ravi Kumar', phone: '98111 22233', consent: true }
    expect(onboardProblem(ok)).toBe(null)
    expect(onboardProblem({ ...ok, name: ' ' })).toMatch(/name/)
    expect(onboardProblem({ ...ok, phone: '' })).toMatch(/mobile/)
    expect(onboardProblem({ ...ok, consent: false })).toMatch(/agreed/)
  })
  it('invites them on WhatsApp, at their own number, saying which number to sign in with', () => {
    const url = inviteWhatsappUrl({ phone: '98111 22233', name: 'Ravi Kumar', portalUrl: 'https://refer.srirajabags.in' })
    expect(url.startsWith('https://wa.me/919811122233?text=')).toBe(true)
    const text = decodeURIComponent(url.split('text=')[1])
    expect(text).toContain('Hi Ravi,')
    expect(text).toContain('https://refer.srirajabags.in')
    expect(text).toContain('+91 98111 22233')
    expect(inviteWhatsappUrl({ phone: '123', name: 'x', portalUrl: 'u' })).toBe(null)
  })
})

describe('leadQualityText — the rating, in words an affiliate can act on', () => {
  it('waits until a few leads are decided', () => {
    expect(leadQualityText({ label: 'Not rated yet', good: 1, junk: 0 })).toMatch(/once our team has decided/)
  })
  it('says what the numbers were and what follows from them', () => {
    expect(leadQualityText({ label: 'Good', good: 5, junk: 1 })).toBe('5 of your 6 decided leads turned into real business. Your enquiries are handled first.')
    expect(leadQualityText({ label: 'Poor', good: 0, junk: 4 })).toMatch(/handled last.*block/)
  })
})

describe('commission expiry, in words', () => {
  it('names the time limit as a person says it', () => {
    expect(validityText(3)).toBe('3 months')
    expect(validityText(1)).toBe('1 month')
    for (const v of [0, null, undefined, -2]) expect(validityText(v)).toBe('')
  })

  const NOW = Date.UTC(2026, 9, 10, 12, 0) // 10 Oct 2026, 5:30 pm IST
  const at = (days) => Math.floor(NOW / 1000) + days * 86400

  it('warns plainly when money expires within 30 days', () => {
    expect(expiryNotice({ amount: 150, at: at(20) }, NOW)).toEqual({
      urgent: true, text: '₹150 of your balance expires on 30 Oct 2026. Withdraw it before then, or it can no longer be withdrawn.',
    })
  })

  it('mentions a later expiry quietly', () => {
    expect(expiryNotice({ amount: 34.5, at: at(80) }, NOW)).toEqual({
      urgent: false, text: '₹34.50 expires on 29 Dec 2026 if not withdrawn by then.',
    })
  })

  it('says nothing when nothing is due to expire', () => {
    expect(expiryNotice(null, NOW)).toBeNull()
    expect(expiryNotice({ amount: 0, at: at(5) }, NOW)).toBeNull()
  })
})

describe('leadProblem — a lead an affiliate adds, checked before it is sent', () => {
  const ok = { businessName: 'Ravi Traders', phone: '91234 56780', consent: true }
  it('accepts a complete lead', () => {
    expect(leadProblem(ok, '+919876543210')).toBeNull()
  })
  it('asks for what is missing, in their terms', () => {
    expect(leadProblem({ ...ok, businessName: ' ' })).toBe("Please enter the business name.")
    expect(leadProblem({ ...ok, phone: '12345' })).toBe('Please enter their 10-digit Indian mobile number.')
    expect(leadProblem({ ...ok, consent: false })).toBe('Please confirm they have agreed to be contacted by Sri Raja Bags.')
  })
  it('turns away their own number', () => {
    expect(leadProblem({ ...ok, phone: '98765 43210' }, '+919876543210')).toBe('That is your own number. Add the buyer\'s number instead.')
  })
})

describe('inviteNudge — someone onboarded who has not signed in yet', () => {
  const NOW = Date.UTC(2026, 9, 13, 12, 0)
  const daysAgo = (d) => Math.floor(NOW / 1000) - d * 86400
  it('says nothing for the first couple of days, or once they have joined', () => {
    expect(inviteNudge({ joined: false, onboardedAt: daysAgo(2) }, NOW)).toBeNull()
    expect(inviteNudge({ joined: true, onboardedAt: daysAgo(30) }, NOW)).toBeNull()
    expect(inviteNudge({ joined: false, onboardedAt: null }, NOW)).toBeNull()
  })
  it('prompts a reminder after three days', () => {
    expect(inviteNudge({ joined: false, onboardedAt: daysAgo(5) }, NOW)).toBe('Not joined yet, 5 days after you added them. Send the invite again?')
  })
})
