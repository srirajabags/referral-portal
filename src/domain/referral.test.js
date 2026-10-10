import { describe, it, expect } from 'vitest'
import {
  normaliseCode, routeFor, normaliseIndianMobile, formatMobile, cleanOtp,
  shareMessage, whatsappShareUrl, whatsappEnquiryUrl, authErrorMessage, enquiryProblem, smsLanguage,
} from './referral.js'

describe('routeFor — a shared link lands on the right screen', () => {
  it('reads the code out of /r/CODE, however it was typed', () => {
    expect(routeFor('/r/K7M2QX9')).toEqual({ page: 'referral', code: 'K7M2QX9' })
    expect(routeFor('/r/k7m2qx9/')).toEqual({ page: 'referral', code: 'K7M2QX9' })
    expect(routeFor('/r/K7M-2QX9')).toEqual({ page: 'referral', code: 'K7M2QX9' })
  })
  it('says a mangled link is mangled instead of showing the sign-in page', () => {
    // A buyer who lands on "enter your phone to earn commission" would be lost.
    expect(routeFor('/r/K7M2Q')).toEqual({ page: 'bad-link' })
    expect(routeFor('/r/%E0%A4')).toEqual({ page: 'bad-link' })
  })
  it('sends everything else home', () => {
    for (const p of ['/', '', '/anything', '/r/', '/r/K7M2QX9/extra']) expect(routeFor(p).page).toBe('home')
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
