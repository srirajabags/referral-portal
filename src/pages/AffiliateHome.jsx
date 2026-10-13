import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, FactoryPhoto, Shell, Spinner, WhatsAppIcon, useCooldown } from '../components.jsx'
import { fetchMe } from '../services/api.js'
import InstallCard from '../InstallCard.jsx'
import { track } from '../services/analytics.js'
import Earnings from './Earnings.jsx'
import Enquiries from './Enquiries.jsx'
import Withdrawals from './Withdrawals.jsx'
import Onboard from './Onboard.jsx'
import { firebaseConfigured, loadAuth } from '../services/firebase.js'
import {
  authErrorMessage, cleanOtp, formatMobile, normaliseIndianMobile, OTP_LENGTH,
  whatsappShareUrl, shareMessage, urlForView, viewFor, leadQualityText,
} from '../domain/referral.js'

const RESEND_AFTER_S = 30

// Signed out: phone + OTP. Signed in: the affiliate's link.
export default function AffiliateHome() {
  const [fb, setFb] = useState(null)
  const [user, setUser] = useState(undefined) // undefined = still finding out

  useEffect(() => {
    if (!firebaseConfigured) return
    let unsubscribe = () => {}
    loadAuth().then((loaded) => {
      setFb(loaded)
      unsubscribe = loaded.sdk.onAuthStateChanged(loaded.auth, (u) => setUser(u))
    })
    return () => unsubscribe()
  }, [])

  if (!firebaseConfigured) {
    return <Shell narrow><Alert>Sign-in is not set up yet. (Firebase settings are missing from this build.)</Alert></Shell>
  }
  if (!fb || user === undefined) return <Shell narrow><Spinner /></Shell>
  return user ? <Dashboard fb={fb} user={user} /> : <SignIn fb={fb} />
}

function SignIn({ fb }) {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const confirmation = useRef(null)
  const verifier = useRef(null)
  const otpInput = useRef(null)

  // reCAPTCHA is invisible unless Google is unsure. Each attempt gets a brand-new
  // element: Firebase's clear() leaves an invisible widget in its element, and
  // Google refuses to render a second one there ("already rendered"), so reusing
  // one element broke every retry and resend. clear() also throws if called
  // twice, hence the guard.
  const recaptchaHost = useRef(null)
  const dropVerifier = useCallback(() => {
    const old = verifier.current
    verifier.current = null
    if (!old) return
    try { old.verifier.clear() } catch { /* already cleared */ }
    old.el.remove()
  }, [])
  const freshVerifier = useCallback(() => {
    dropVerifier()
    const el = document.createElement('div')
    recaptchaHost.current.appendChild(el)
    verifier.current = { el, verifier: new fb.sdk.RecaptchaVerifier(fb.auth, el, { size: 'invisible' }) }
    return verifier.current.verifier
  }, [fb, dropVerifier])
  useEffect(() => dropVerifier, [dropVerifier])

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const sendCode = async (e) => {
    e?.preventDefault()
    setError('')
    const e164 = normaliseIndianMobile(phone)
    if (!e164) return setError('Please enter a 10-digit Indian mobile number.')
    setBusy(true)
    try {
      confirmation.current = await fb.sdk.signInWithPhoneNumber(fb.auth, e164, freshVerifier())
      setStep('code')
      setOtp('')
      setResendIn(RESEND_AFTER_S)
      setTimeout(() => otpInput.current?.focus(), 50)
    } catch (err) {
      // The person sees plain words; the console keeps Firebase's code for whoever debugs it.
      console.warn('send OTP failed:', err?.code, err?.message)
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (code) => {
    if (busy || code.length !== OTP_LENGTH) return
    setError('')
    setBusy(true)
    try {
      // On success onAuthStateChanged takes over and the dashboard replaces this.
      await confirmation.current.confirm(code)
      track('login', { method: 'phone_otp' })
    } catch (err) {
      console.warn('OTP check failed:', err?.code, err?.message)
      setError(authErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Shell>
      {/* Phone: pitch, form, how it works, top to bottom. Desktop: the pitch and
          how it works read down the left while the form waits on the right. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-x-16 lg:gap-y-10">
        <section className="space-y-2 lg:col-start-1 lg:space-y-5">
          <h1 className="text-2xl font-bold leading-tight text-navy md:text-3xl lg:text-5xl lg:leading-[1.1] lg:tracking-tight">
            Earn by connecting businesses to our factory
          </h1>
          <p className="text-ink-soft lg:max-w-xl lg:text-lg">
            Know a shop that needs custom-printed bags? Share your link, and earn commission when they order.
            No investment, no stock to hold.
          </p>
        </section>

        <div className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="card space-y-4 lg:p-7 lg:shadow-[0_8px_30px_rgb(5_56_107_/_0.08)]">
            <div className="hidden lg:block">
              <h2 className="text-xl font-semibold text-navy">Get your referral link</h2>
              <p className="mt-1 text-sm text-ink-soft">New or returning, sign in with your mobile number.</p>
            </div>
            {step === 'phone' ? (
              <form onSubmit={sendCode} className="space-y-4" noValidate>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Your mobile number</span>
                  <div className="flex items-stretch gap-2">
                    <span className="flex min-h-12 items-center rounded-xl border border-rule bg-paper-alt px-3 text-base text-ink-soft">+91</span>
                    <input
                      className="field" type="tel" inputMode="numeric" autoComplete="tel-national"
                      placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus
                    />
                  </div>
                </label>
                <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send OTP'}</button>
                <p className="text-xs text-ink-soft">
                  We'll send a 6-digit code by SMS. Standard SMS rates may apply. By signing in, you agree to the
                  programme terms below.
                </p>
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); confirm(otp) }} className="space-y-4" noValidate>
                <p className="text-sm">
                  Enter the code sent to <span className="font-semibold">{formatMobile(normaliseIndianMobile(phone))}</span>
                </p>
                <input
                  ref={otpInput}
                  className="field text-center text-2xl tracking-[0.5em]" type="text" inputMode="numeric"
                  autoComplete="one-time-code" maxLength={OTP_LENGTH + 2} placeholder="••••••" aria-label="OTP"
                  value={otp}
                  onChange={(e) => {
                    const code = cleanOtp(e.target.value)
                    setOtp(code)
                    // SMS autofill drops all six digits in at once; no need to make them tap.
                    if (code.length === OTP_LENGTH) confirm(code)
                  }}
                />
                <button className="btn-primary" type="submit" disabled={busy || otp.length !== OTP_LENGTH}>
                  {busy ? 'Checking…' : 'Verify and continue'}
                </button>
                <div className="flex justify-between text-sm">
                  <button type="button" className="min-h-11 text-navy-soft" onClick={() => { setStep('phone'); setError('') }}>
                    Change number
                  </button>
                  <button type="button" className="min-h-11 font-medium text-navy disabled:text-ink-soft"
                    disabled={resendIn > 0 || busy} onClick={sendCode}>
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}
            {error && <Alert>{error}</Alert>}
          </div>
        </div>

        <div className="lg:col-start-1">
          <FactoryPhoto className="mb-10 hidden lg:block" />
          <HowItWorks />
        </div>
      </div>
      <div ref={recaptchaHost} />
    </Shell>
  )
}

function Dashboard({ fb, user }) {
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  const [view, setView] = useState(() => viewFor(window.location.search))
  // The server keeps an affiliate's data for a minute; refreshing sooner adds load, not news.
  const [canRefresh, startCooldown] = useCooldown(60_000)

  const signOut = useCallback(() => fb.sdk.signOut(fb.auth), [fb])
  const getToken = useCallback(() => user.getIdToken(), [user])

  const load = useCallback(async () => {
    setError('')
    try {
      setMe(await fetchMe(await user.getIdToken()))
    } catch (err) {
      // A token the proxy will not take is no use to keep; start sign-in again.
      if (err.status === 401) return signOut()
      setError(err.message)
    }
  }, [user, signOut])

  // A failed refresh keeps what is on screen and says so, rather than blanking it.
  const refresh = useCallback(async () => {
    setRefreshing(true)
    setRefreshError('')
    try {
      setMe(await fetchMe(await user.getIdToken()))
    } catch (err) {
      if (err.status === 401) return signOut()
      setRefreshError(err.message)
    } finally {
      setRefreshing(false)
    }
  }, [user, signOut])
  useEffect(() => { load() }, [load])

  // The tab is in the address, so the back button and a reload keep it.
  useEffect(() => {
    const onPop = () => setView(viewFor(window.location.search))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const go = (next) => {
    if (next === view) return
    window.history.pushState(null, '', urlForView(next))
    setView(next)
    window.scrollTo({ top: 0 })
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(me.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Older in-app browsers refuse the clipboard; the link is on screen to long-press.
    }
  }
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const signOutButton = (
    <button className="text-sm text-navy-soft underline underline-offset-2" onClick={signOut}>Sign out</button>
  )

  if (error) {
    return (
      <Shell narrow>
        <div className="space-y-4">
          <Alert>{error}</Alert>
          <button className="btn-primary" onClick={load}>Try again</button>
          <div className="text-center">{signOutButton}</div>
        </div>
      </Shell>
    )
  }
  if (!me) return <Shell narrow><Spinner label="Getting your link…" /></Shell>
  const summary = { enquiries: 0, inProgress: 0, ordersConfirmed: 0, commissionEarned: 0, ...me.summary }
  // On hold: still signed in, read-only. The link, withdrawals and onboarding pause.
  const onHold = me.status === 'Blocked'

  const shareButtons = (
    <>
      <a className="btn-whatsapp" href={whatsappShareUrl(me.link)} target="_blank" rel="noopener" onClick={() => track('share', { method: 'whatsapp' })}>
        <WhatsAppIcon /> Share on WhatsApp
      </a>
      {canShare ? (
        <button className="btn-ghost w-auto" aria-label="More ways to share"
          onClick={() => navigator.share({ title: 'Sri Raja Bags', text: shareMessage(me.link) }).catch(() => {})}>
          More
        </button>
      ) : (
        <button className="btn-ghost w-auto" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      )}
    </>
  )

  const tabs = [
    ['overview', 'Overview'],
    ['enquiries', `Enquiries${summary.enquiries ? ` (${summary.enquiries})` : ''}`],
    ['withdrawals', `Withdrawals${me.withdrawalCount ? ` (${me.withdrawalCount})` : ''}`],
    ['onboard', 'Onboard'],
  ]

  return (
    <Shell
      // Within thumb's reach on a phone. On a desktop the same buttons sit in
      // the link card instead, where the eye already is.
      footer={onHold ? null : (
        <div className="sticky bottom-0 border-t border-rule bg-paper/95 backdrop-blur safe-bottom lg:hidden">
          <div className="mx-auto grid w-full max-w-md grid-cols-[1fr_auto] gap-2 px-4 pt-3 md:max-w-2xl">{shareButtons}</div>
        </div>
      )}
    >
      <div className="mb-4 flex items-center justify-between text-sm text-ink-soft">
        <span>Signed in as <span className="font-medium text-ink">{formatMobile(me.phone)}</span></span>
        {signOutButton}
      </div>

      {onHold && (
        <div role="alert" className="mb-5 space-y-1.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
          <p className="font-semibold">Your account is on hold</p>
          {me.noteToAffiliate && <p>{me.noteToAffiliate}</p>}
          <p>
            Your referral link is paused, and you cannot request withdrawals or onboard anyone. You can still see your
            enquiries and earnings. Please message us on WhatsApp at +91 91770 56061 if you think this is a mistake.
          </p>
        </div>
      )}

      <div className="mb-5 flex items-center justify-between gap-3 lg:mb-8">
        <div role="tablist" aria-label="Dashboard" className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-paper-alt p-1 ring-1 ring-rule min-[420px]:grid-cols-4 sm:flex-none">
          {tabs.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={view === key} onClick={() => go(key)}
              className={`min-h-11 rounded-lg px-2 text-sm font-medium transition sm:px-5 ${view === key ? 'bg-paper text-navy shadow-sm ring-1 ring-rule' : 'text-ink-soft hover:text-navy'}`}>
              {label}
            </button>
          ))}
        </div>
        {view === 'overview' && (
          <button className="hidden min-h-11 text-sm font-medium text-navy-soft disabled:opacity-50 sm:block"
            disabled={refreshing || !canRefresh} onClick={() => { startCooldown(); refresh() }}>
            {refreshing ? 'Refreshing…' : canRefresh ? 'Refresh' : 'Up to date'}
          </button>
        )}
      </div>
      {refreshError && <div className="mb-4"><Alert>{refreshError}</Alert></div>}

      {view === 'enquiries' ? (
        <div className="lg:max-w-3xl">
          <Enquiries getToken={getToken} onSignedOut={signOut} earned={summary.commissionEarned}
            ownPhone={me.phone} onHold={onHold} onChanged={refresh} />
        </div>
      ) : view === 'onboard' ? (
        <div className="lg:max-w-3xl">
          <Onboard me={me} getToken={getToken} onSignedOut={signOut} onChanged={refresh} onHold={onHold} />
        </div>
      ) : view === 'withdrawals' ? (
        <div className="lg:max-w-3xl">
          <Withdrawals getToken={getToken} onSignedOut={signOut} />
        </div>
      ) : (
        <>
          <div className="mb-4 lg:mb-8 lg:max-w-[calc(100%-360px-3rem)]"><InstallCard /></div>

          {/* Phone: link, counts, earnings, how it works. Desktop: the link and how it
              works down the left; counts, earnings and help on the right. */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-12 lg:gap-y-8">
            <section className="card space-y-4 lg:col-start-1 lg:self-start lg:space-y-6 lg:p-8">
              <div>
                <p className="text-sm text-ink-soft">Your referral code</p>
                <p className="font-mono text-3xl font-bold tracking-widest text-navy lg:text-5xl">{me.code}</p>
              </div>
              <button onClick={copy} disabled={onHold} className="w-full rounded-xl border border-dashed border-navy-soft/50 bg-paper-alt px-4 py-3 text-left hover:border-navy-soft">
                {/* A zero-width space before "?" gives the line one place to break, so a
                    narrow phone never splits the code itself. Copying uses me.link as is. */}
                <span className={`block break-words font-mono text-sm text-navy lg:text-base ${onHold ? 'line-through opacity-50' : ''}`}>{me.link.replace('?', '\u200B?')}</span>
                <span className="mt-1 block text-xs font-medium text-navy-soft">{onHold ? 'Paused while your account is on hold' : copied ? 'Copied ✓' : 'Copy link'}</span>
              </button>
              {!onHold && <div className="hidden max-w-md grid-cols-[1fr_auto] gap-2 lg:grid">{shareButtons}</div>}
              <p className="text-sm text-ink-soft">
                Send this link to shop owners and buyers you know. When they enquire through it, the enquiry is recorded
                against your code. It is yours for good: the same link every time you sign in.
              </p>
            </section>

            <aside className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <Counts summary={summary} onShowEnquiries={() => go('enquiries')} />
              <LeadQuality quality={me.leadQuality} />
              <Earnings me={me} getToken={getToken} onChanged={refresh} onShowHistory={() => go('withdrawals')} onHold={onHold} />
              <section className="card hidden space-y-3 lg:block">
                <h2 className="font-semibold text-navy">Questions?</h2>
                <p className="text-sm text-ink-soft">Message us about the programme or a referral you have made.</p>
                <a className="btn-ghost" href="https://wa.me/919177056061" target="_blank" rel="noopener">
                  <WhatsAppIcon /> WhatsApp us
                </a>
              </section>
            </aside>

            <div className="lg:col-start-1">
              <HowItWorks />
            </div>
          </div>
        </>
      )}
    </Shell>
  )
}

// How the affiliate's leads have turned out, as Grist rates it, and what follows.
const QUALITY_TONES = {
  Good: 'bg-mint-pale text-navy-deep',
  Fair: 'bg-amber-50 text-amber-900',
  Poor: 'bg-red-50 text-red-800',
}
function LeadQuality({ quality }) {
  const q = { label: 'Not rated yet', good: 0, junk: 0, ...quality }
  return (
    <section className="card space-y-2" aria-label="Lead quality">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-navy">Lead quality</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${QUALITY_TONES[q.label] ?? 'bg-paper-alt text-ink-soft'}`}>{q.label}</span>
      </div>
      <p className="text-sm text-ink-soft">{leadQualityText(q)}</p>
      <p className="text-xs text-ink-soft">
        Send genuine buyers only. Fake, junk or bulk enquiries lower your rating and can get your account put on hold.
      </p>
    </section>
  )
}

function Counts({ summary, onShowEnquiries }) {
  const tiles = [
    ['Enquiries', summary.enquiries],
    ['In progress', summary.inProgress],
    ['Orders confirmed', summary.ordersConfirmed],
  ]
  return (
    <div className="space-y-2">
    <dl className="grid grid-cols-3 gap-2">
      {tiles.map(([label, value]) => (
        // column-reverse puts the number above the label; justify-end then packs both
        // to the top, so the numbers line up even when one label wraps to two lines.
        <div key={label} className="flex flex-col-reverse justify-end gap-0.5 rounded-2xl border border-rule bg-paper px-3 py-3 text-center">
          <dt className="text-xs leading-tight text-ink-soft">{label}</dt>
          <dd className="text-2xl font-bold text-navy">{value}</dd>
        </div>
      ))}
    </dl>
    {summary.enquiries > 0 && (
      <button className="min-h-11 w-full text-sm font-medium text-navy-soft" onClick={onShowEnquiries}>See all enquiries →</button>
    )}
    </div>
  )
}

// The programme's terms, shown before sign-in and on the dashboard. Plain words,
// and clear that the programme is Sri Raja Bags' to run as it sees fit.
function HowItWorks() {
  const steps = [
    ['Share your link', 'Send it to businesses that use carry bags: shops, supermarkets, restaurants, jewellers, event organisers.'],
    ['They enquire', 'They fill a short form or message us on WhatsApp. We take it from there.'],
    ['They order, you earn', 'When their order is confirmed, you earn commission on the order value, and can withdraw it to UPI.'],
  ]
  return (
    <section className="mt-6 space-y-4 pb-4 lg:mt-0">
      <h2 className="text-lg font-semibold text-navy lg:text-2xl">How it works</h2>
      <ol className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-3 lg:flex-col lg:rounded-2xl lg:border lg:border-rule lg:bg-paper lg:p-5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mint-pale font-semibold text-navy">{i + 1}</span>
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-ink-soft">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <details className="card text-sm">
        <summary className="min-h-6 cursor-pointer font-medium text-navy">Programme terms</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
          <li>
            The partner programme is offered entirely at the discretion of Sri Raja Bags. Joining it creates no employment,
            agency or partnership, and puts Sri Raja Bags under no obligation to accept any lead, complete any sale or keep
            the programme running.
          </li>
          <li>Sri Raja Bags may change commission rates, tiers or these terms, or pause or end the programme or any account, at any time.</li>
          <li>Commission is a share of the order value of each confirmed order our team links to your referral: one rate for the customer's first order, another for repeat orders. Your tier and its rates are shown on your dashboard.</li>
          <li>Commission is earned on confirmed orders, not on clicks or enquiries alone. Businesses that are already our customers, or that someone else introduced first, may not qualify.</li>
          <li>Withdraw your current balance to UPI whenever you like. Our team pays each request and updates it with the payment reference.</li>
          <li>
            Commission must be withdrawn within your tier's time limit, shown on your dashboard, counted from when it is added
            to your balance. Commission not withdrawn or requested by then expires and can no longer be withdrawn. Each
            withdrawal uses the commission closest to expiring first. If a request is rejected, that amount goes back to
            your balance with its original expiry date.
          </li>
          <li>Your lead-quality rating reflects how many of your leads turn into real business. Enquiries from low-rated accounts may be handled later.</li>
          <li>
            Fake, junk or bulk enquiries, onboarding people without their agreement, or any other misuse can get your account
            put on hold or closed. On hold, your referral link stops working and you cannot request withdrawals or onboard
            anyone, though you can still see your account. Sri Raja Bags decides whether, and when, earnings on a held or
            closed account are paid.
          </li>
          <li>Only share a buyer's or a new affiliate's details with their permission.</li>
          <li>Questions? Message us on WhatsApp at +91 91770 56061.</li>
        </ul>
      </details>
    </section>
  )
}
