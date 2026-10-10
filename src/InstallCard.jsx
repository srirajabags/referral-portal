import { useEffect, useState } from 'react'
import { installOptionFor, isIOSDevice } from './domain/install.js'
import {
  canPromptInstall, isStandalone, onInstallChange, promptInstall, rememberDismissed, wasDismissed,
} from './services/install.js'

// "Install the app", for affiliates. Buyers on referral links never see it.
export default function InstallCard() {
  const [, rerender] = useState(0)
  const [dismissed, setDismissed] = useState(wasDismissed)
  useEffect(() => onInstallChange(() => rerender((n) => n + 1)), [])

  const option = installOptionFor({
    standalone: isStandalone(),
    canPrompt: canPromptInstall(),
    ios: isIOSDevice(navigator),
    dismissed,
  })
  if (option === 'none') return null

  const notNow = () => { rememberDismissed(); setDismissed(true) }

  return (
    <section className="card flex items-start gap-4" aria-label="Install the app">
      <img src="/pwa-192x192.png" alt="" width="48" height="48" className="size-12 shrink-0 rounded-xl border border-rule" />
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h2 className="font-semibold text-navy">Install the app</h2>
          {option === 'prompt' ? (
            <p className="text-sm text-ink-soft">Open your link and enquiries straight from your home screen, like any other app.</p>
          ) : (
            <p className="text-sm text-ink-soft">
              Tap <ShareIcon /> <span className="font-medium text-ink">Share</span> in your browser, then{' '}
              <span className="font-medium text-ink">Add to Home Screen</span>. You'll sign in once more in the app.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {option === 'prompt' && (
            <button className="btn-primary w-auto px-6" onClick={() => promptInstall()}>Install</button>
          )}
          <button className="min-h-11 text-sm text-ink-soft hover:text-ink" onClick={notNow}>Not now</button>
        </div>
      </div>
    </section>
  )
}

// The iOS Share glyph, so the instruction matches what is on screen.
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="inline size-4 -translate-y-px fill-none stroke-current text-navy" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  )
}
