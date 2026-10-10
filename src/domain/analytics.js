// What may be sent to Google Analytics with an event. An allow-list rather than
// a block-list: GA must never receive a phone number, a name, a UPI ID or a
// referral code, and a new field added to a call by mistake is dropped here
// instead of reaching Google.
const ALLOWED = new Set(['method', 'page_type', 'value', 'currency'])

export const analyticsParams = (params = {}) => {
  const out = {}
  for (const [key, value] of Object.entries(params || {})) {
    if (!ALLOWED.has(key)) continue
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value
    else if (typeof value === 'string' && value.length <= 40 && !/\d{6,}|@/.test(value)) out[key] = value
  }
  return out
}
