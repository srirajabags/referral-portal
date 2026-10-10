// Noticing that the deployed build has moved on, and getting this tab onto it.
// The service worker's `autoUpdate` only
// picks up a new build on the next navigation, and an installed PWA can sit on
// one screen for days, so the app compares itself against the server directly.
import { APP_VERSION, BUILD_TIMESTAMP_IST_READABLE } from '../version.js'

// Written by get-version.js and served unhashed, next to index.html.
const VERSION_URL = '/version.json'

export const RUNNING_BUILD = { version: APP_VERSION, buildTimestampIstReadable: BUILD_TIMESTAMP_IST_READABLE }

// The deployed build, straight from the network. A cached answer would report the
// running build as the newest for as long as the cache lived -- hence both
// `no-store` and the cache-busting parameter, since caches honour them unevenly
// (GitHub Pages sends max-age=600).
export const fetchDeployedBuild = async () => {
  const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`version.json returned ${res.status}`)
  const data = await res.json()
  if (!data || typeof data.version !== 'string' || !data.version) throw new Error('version.json is not a build record')
  return data
}

// Reload onto the deployed build. The service worker owns the asset cache, so it
// goes first -- a plain reload would be served the very build we are leaving.
export const applyUpdate = async () => {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || []
    await Promise.all(regs.map((r) => r.unregister().catch(() => {})))
  } catch { /* no service worker here -- the reload alone does the job */ }
  try {
    const keys = (await globalThis.caches?.keys?.()) || []
    await Promise.all(keys.map((k) => globalThis.caches.delete(k).catch(() => {})))
  } catch { /* ditto */ }
  window.location.reload()
}

// Attempts per target build, so a deploy the server has not finished serving
// cannot trap anyone in a reload loop.
const attemptKey = (version) => `appUpdate.attempts.${version}`
export const updateAttempts = (version) => {
  try { return Number(sessionStorage.getItem(attemptKey(version))) || 0 } catch { return 0 }
}
// Says whether the attempt really was recorded: a page that reloads itself must
// not do so when it cannot count (see shouldReloadOnArrival).
export const noteUpdateAttempt = (version) => {
  const next = updateAttempts(version) + 1
  try { sessionStorage.setItem(attemptKey(version), String(next)) } catch { /* storage blocked */ }
  return updateAttempts(version) === next
}
