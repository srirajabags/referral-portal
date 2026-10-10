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
