// The only network the portal does besides Firebase: the referral backend.
// It answers this site's origin alone, so local development goes through the
// dev server's /api proxy (see vite.config.js).
const BASE = (import.meta.env.VITE_REFERRAL_API_URL || '').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

const call = async (path, { method = 'GET', token, body } = {}) => {
  if (!BASE) throw new ApiError('The portal is not connected yet.', 0)
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError('No connection. Please check your internet and try again.', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong. Please try again.', res.status)
  return data
}

// Creates the affiliate (and their code) on first call; the same answer after.
export const fetchMe = (idToken) => call('/me', { method: 'POST', token: idToken })
export const checkCode = (code) => call(`/public/r/${encodeURIComponent(code)}`)
export const sendEnquiry = (enquiry) => call('/public/enquiry', { method: 'POST', body: enquiry })

export const requestWithdrawal = (idToken, { upiId, amount }) =>
  call('/me/withdrawals', { method: 'POST', token: idToken, body: { upiId, amount: Number(amount) } })

// The payment screenshot staff attached. Fetched with the sign-in token (an <img>
// cannot send one) and handed back as a blob for an object URL.
export const fetchPaymentScreenshot = async (idToken, ref) => {
  if (!BASE) throw new ApiError('The portal is not connected yet.', 0)
  let res
  try {
    res = await fetch(`${BASE}/me/withdrawals/${encodeURIComponent(ref)}/screenshot`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
  } catch {
    throw new ApiError('No connection. Please check your internet and try again.', 0)
  }
  if (!res.ok) throw new ApiError((await res.json().catch(() => ({}))).error || 'Could not load the screenshot.', res.status)
  return res.blob()
}

// One page of the signed-in affiliate's enquiries: { items, page, pages, pageSize, total }.
export const fetchEnquiries = (idToken, page) => call(`/me/enquiries?page=${encodeURIComponent(page)}`, { token: idToken })

// One page of the signed-in affiliate's withdrawal history: { items, page, pages, pageSize, total }.
export const fetchWithdrawals = (idToken, page) => call(`/me/withdrawals?page=${encodeURIComponent(page)}`, { token: idToken })

// Bring another affiliate in: { name, phone, city, consent }.
export const onboardAffiliate = (idToken, person) => call('/me/onboard', { method: 'POST', token: idToken, body: person })
// One page of the people this affiliate onboarded: { items, page, pages, pageSize, total }.
export const fetchOnboarded = (idToken, page) => call(`/me/onboarded?page=${encodeURIComponent(page)}`, { token: idToken })
