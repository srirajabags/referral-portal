import { describe, it, expect } from 'vitest'
import { analyticsParams } from './analytics.js'

describe('analyticsParams — nothing personal ever reaches Google Analytics', () => {
  it('keeps the few harmless fields', () => {
    expect(analyticsParams({ method: 'whatsapp', value: 100, currency: 'INR', page_type: 'referral' }))
      .toEqual({ method: 'whatsapp', value: 100, currency: 'INR', page_type: 'referral' })
  })
  it('drops any field not on the list, whatever it holds', () => {
    expect(analyticsParams({ phone: '+919876543210', name: 'Ravi', code: 'CNT73JK', upi: 'a@ybl' })).toEqual({})
  })
  it('drops an allowed field carrying something that looks personal', () => {
    // A phone number or UPI ID slipped into an allowed field by mistake.
    expect(analyticsParams({ method: '9876543210', page_type: 'ravi@ybl' })).toEqual({})
  })
  it('copes with nothing', () => {
    expect(analyticsParams(undefined)).toEqual({})
  })
})
