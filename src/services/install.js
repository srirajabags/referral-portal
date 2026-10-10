// The browser's half of installing. Chrome fires `beforeinstallprompt` once,
// early -- usually before the affiliate pages (a lazy chunk) have loaded -- so it
// is caught here at startup and held until the install card asks for it.
let deferred = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Stop Chrome's own mini-infobar; the card offers the same thing in context.
    e.preventDefault()
    deferred = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export const canPromptInstall = () => deferred !== null
export const onInstallChange = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Shows the system dialog. The event is single-use whatever the answer.
export const promptInstall = async () => {
  if (!deferred) return 'unavailable'
  const e = deferred
  deferred = null
  notify()
  await e.prompt()
  return (await e.userChoice)?.outcome ?? 'dismissed'
}

// Android/desktop report display-mode; iOS home-screen apps set navigator.standalone.
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

const DISMISSED_KEY = 'install.dismissed'
export const wasDismissed = () => {
  try { return localStorage.getItem(DISMISSED_KEY) === '1' } catch { return false }
}
export const rememberDismissed = () => {
  try { localStorage.setItem(DISMISSED_KEY, '1') } catch { /* storage blocked: it just shows again */ }
}
