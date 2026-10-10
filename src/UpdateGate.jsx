import { useCallback, useEffect, useRef, useState } from 'react'
import { isDifferentBuild, mayStillForce, shouldReloadOnArrival, updateModeFor } from './domain/appUpdate.js'
import {
  RUNNING_BUILD, applyUpdate, fetchDeployedBuild, noteUpdateAttempt, updateAttempts,
} from './services/appUpdate.js'

// How often an open affiliate app looks for a newer deploy.
const POLL_MS = 15 * 60 * 1000

// Once per page load, not once per effect run: React runs effects twice in
// development, and two arrival checks would count two attempts for one visit.
let arrivalChecked = false

// Forces every tab onto the deployed build. Affiliates get a notice they cannot
// dismiss (until reloading has visibly failed to help); buyers on a referral
// link are reloaded quietly on arrival, before they have typed anything.
export default function UpdateGate({ children }) {
  const mode = updateModeFor(window.location.pathname)
  const [deployed, setDeployed] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  // Visibility and focus fire together when a phone is unlocked; check once.
  const inFlight = useRef(false)

  const check = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      setDeployed(await fetchDeployedBuild())
    } catch {
      // Offline, or not deployed yet. A failed check is not evidence of a new build.
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    if (mode === 'on-arrival') {
      if (arrivalChecked) return undefined
      arrivalChecked = true
      fetchDeployedBuild().then((d) => {
        const stale = isDifferentBuild(d, RUNNING_BUILD.version)
        const attempts = updateAttempts(d.version)
        if (!stale || !mayStillForce(attempts)) return
        if (shouldReloadOnArrival({ stale, attempts, recorded: noteUpdateAttempt(d.version) })) applyUpdate()
      }).catch(() => {})
      return undefined
    }
    check()
    const id = setInterval(check, POLL_MS)
    // Coming back to a backgrounded PWA is when a stale build is most likely
    // and the interval least likely to have run.
    const onWake = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [check, mode])

  const stale = mode === 'block' && isDifferentBuild(deployed, RUNNING_BUILD.version)
  // Only offer a way past once reloading has visibly failed to help.
  const canContinue = stale && !mayStillForce(updateAttempts(deployed.version))

  const onUpdate = async () => {
    setUpdating(true)
    noteUpdateAttempt(deployed.version)
    await applyUpdate()
  }

  return (
    <>
      {children}
      {stale && !dismissed && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-deep/60 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog" aria-modal="true" aria-labelledby="update-title">
          <div className="w-full overflow-hidden rounded-t-2xl bg-paper shadow-2xl safe-bottom sm:max-w-sm sm:rounded-2xl">
            <div className="space-y-4 px-5 pt-5">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mint-pale text-xl text-navy" aria-hidden="true">↻</span>
                <div>
                  <h2 id="update-title" className="font-semibold leading-tight text-navy">A new version is ready</h2>
                  <p className="text-sm text-ink-soft">Update to carry on</p>
                </div>
              </div>
              <p className="text-sm text-ink-soft">
                We've improved the partner portal. Update now to keep using it. It only takes a moment, and you
                stay signed in.
              </p>
              <dl className="divide-y divide-rule rounded-xl border border-rule bg-paper-alt text-xs">
                <div className="flex justify-between gap-3 px-3 py-2">
                  <dt className="text-ink-soft">This app</dt>
                  <dd className="text-right font-mono text-ink">{RUNNING_BUILD.buildTimestampIstReadable}</dd>
                </div>
                <div className="flex justify-between gap-3 px-3 py-2">
                  <dt className="text-ink-soft">Latest</dt>
                  <dd className="text-right font-mono font-semibold text-navy">
                    {deployed.buildTimestampIstReadable || deployed.version.slice(0, 12)}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="space-y-2 p-5">
              <button className="btn-primary" disabled={updating} onClick={onUpdate} autoFocus>
                {updating ? 'Updating…' : 'Update now'}
              </button>
              {canContinue && (
                <button className="min-h-11 w-full text-sm text-ink-soft hover:text-ink" onClick={() => setDismissed(true)}>
                  Updating did not help. Carry on for now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
