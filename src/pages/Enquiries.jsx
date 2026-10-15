import { useCallback, useEffect, useState } from 'react'
import { Alert, Spinner, useCooldown } from '../components.jsx'
import { addLead, fetchEnquiries } from '../services/api.js'
import { track } from '../services/analytics.js'
import { formatEnquiryDate, formatMobile, formatRupees, leadProblem } from '../domain/referral.js'
import { EarnedChip } from './Onboard.jsx'

// The Enquiries tab: adding a lead, then the list a page at a time, newest
// first. A link enquiry is a masked phone and the affiliate's own reference,
// nothing else that identifies the buyer; a lead they added shows the number
// they gave.
export default function Enquiries({ getToken, onSignedOut, earned = 0, ownPhone = '', onHold = false, viewOnly = false, onChanged = () => {} }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // The server keeps an affiliate's data for a minute, so refreshing sooner
  // cannot show anything new; the button waits as long.
  const [canRefresh, startCooldown] = useCooldown(60_000)

  const load = useCallback(async (p) => {
    setLoading(true)
    setError('')
    try {
      const next = await fetchEnquiries(await getToken(), p)
      setData(next)
      if (next.page !== p) setPage(next.page)
    } catch (err) {
      if (err.status === 401) return onSignedOut()
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [getToken, onSignedOut])

  useEffect(() => { load(page) }, [load, page])

  const go = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="card space-y-3 lg:p-8" aria-label="Your enquiries">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-navy">
          Your enquiries{data?.total ? <span className="ml-2 text-sm font-normal text-ink-soft">({data.total})</span> : null}
        </h2>
        <button className="min-h-11 text-sm font-medium text-navy-soft disabled:opacity-50"
          disabled={loading || !canRefresh} onClick={() => { startCooldown(); load(page) }}>
          {loading ? 'Loading…' : canRefresh ? 'Refresh' : 'Up to date'}
        </button>
      </div>
      {/* What all of these enquiries have earned, before reading the rows. */}
      <EarnedChip label="Total commission earned" amount={earned} />
      <AddLead getToken={getToken} onSignedOut={onSignedOut} ownPhone={ownPhone} onHold={onHold} viewOnly={viewOnly}
        onAdded={() => { if (page === 1) load(1); else setPage(1); onChanged() }} />
      {error && <Alert>{error}</Alert>}

      {!data && !error ? <Spinner label="Loading enquiries…" /> : data?.items.length ? (
        <>
          <ul className={`divide-y divide-rule transition-opacity ${loading ? 'opacity-50' : ''}`}>
            {data.items.map((e) => (
              // Phone: stage under the number, so neither gets cut short. Wider: side by side.
              <li key={e.ref || `${e.submittedAt}-${e.phone}`} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  {/* The ref tells two buyers with the same last four digits apart, and is
                      what to quote to our team when asking about this enquiry. */}
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono font-medium tracking-wide">{(e.addedByYou ? formatMobile(e.phone) : e.phone) || 'Enquiry'}</span>
                    {e.ref && <span className="text-xs font-medium text-navy-soft">{e.ref}</span>}
                    {e.addedByYou && <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs font-medium text-navy">Added by you</span>}
                  </p>
                  <p className="text-xs text-ink-soft">{formatEnquiryDate(e.submittedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StagePill stage={e.stage} label={e.stageLabel} />
                  <Commission amount={e.commission} expired={e.expired} />
                </div>
              </li>
            ))}
          </ul>

          {data.pages > 1 && (
            <nav className="flex items-center justify-between gap-2 border-t border-rule pt-3" aria-label="Pages">
              <button className="btn-ghost w-auto px-4" disabled={loading || data.page <= 1} onClick={() => go(data.page - 1)}>
                ← Newer
              </button>
              <span className="text-sm text-ink-soft">Page {data.page} of {data.pages}</span>
              <button className="btn-ghost w-auto px-4" disabled={loading || data.page >= data.pages} onClick={() => go(data.page + 1)}>
                Older →
              </button>
            </nav>
          )}
          <p className="text-xs text-ink-soft">
            Enquiries through your link show the last four digits of the buyer's mobile, to protect their privacy. Leads you
            added show the number you gave. Stages update as our team works on each enquiry, and can take a minute or two
            to appear here.
          </p>
        </>
      ) : data ? (
        <div className="rounded-xl bg-paper-alt px-4 py-6 text-center">
          <p className="font-medium">No enquiries yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            When a business sends an enquiry through your link, it appears here and you can follow its progress.
          </p>
        </div>
      ) : null}
    </section>
  )
}

// Colour carries the gist (moving, done, closed); the label carries the meaning,
// so nothing depends on telling the colours apart.
const STAGE_TONES = {
  ordered: 'bg-mint-pale text-navy-deep',
  closed: 'bg-paper-alt text-ink-soft',
}
function StagePill({ stage, label }) {
  return (
    <span className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STAGE_TONES[stage] ?? 'bg-navy/5 text-navy'}`}>
      {label}
    </span>
  )
}

// What an enquiry earned. Expired money (not withdrawn in time) is struck through.
function Commission({ amount, expired = 0 }) {
  if (!(amount > 0)) return null
  if (expired >= amount) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-red-800/70 line-through">{formatRupees(amount)}</span>
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800">Expired</span>
      </span>
    )
  }
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className="text-sm font-semibold text-navy-deep">{formatRupees(amount)}</span>
      {expired > 0 && <span className="text-xs text-red-800">{formatRupees(expired)} expired</span>}
    </span>
  )
}

// "Add a lead": for someone the affiliate knows who needs bags and has agreed to
// be contacted. It goes to our team like an enquiry through their link.
const EMPTY_LEAD = { businessName: '', contactName: '', phone: '', city: '', requirement: '', consent: false }
function AddLead({ getToken, onSignedOut, ownPhone, onHold, viewOnly, onAdded }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_LEAD)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const problem = leadProblem(form, ownPhone)
    if (problem) return setError(problem)
    setError('')
    setBusy(true)
    try {
      await addLead(await getToken(), form)
      track('generate_lead', { method: 'affiliate_dashboard' })
      setForm(EMPTY_LEAD)
      setAdded(true)
      setOpen(false)
      onAdded()
    } catch (err) {
      if (err.status === 401) return onSignedOut()
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (onHold) {
    return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{viewOnly ? "View only: you are viewing someone else's account." : 'Adding leads is paused while your account is on hold.'}</p>
  }
  if (!open) {
    return (
      <div className="space-y-2">
        {added && <p role="status" className="rounded-xl bg-mint-pale px-4 py-3 text-sm text-navy-deep">Lead added. Our team will contact them, and you can follow it below.</p>}
        <button className="btn-ghost" onClick={() => { setOpen(true); setAdded(false) }}>+ Add a lead yourself</button>
      </div>
    )
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-rule p-4" noValidate aria-label="Add a lead">
      <div>
        <h3 className="font-semibold text-navy">Add a lead</h3>
        <p className="text-sm text-ink-soft">Know a business that needs bags? Add their details and our team will contact them. It counts as your referral.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Business name <span className="text-red-700">*</span></span>
          <input className="field" autoComplete="off" value={form.businessName} onChange={set('businessName')} placeholder="e.g. Lakshmi Textiles" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Contact person</span>
          <input className="field" autoComplete="off" value={form.contactName} onChange={set('contactName')} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Their mobile number <span className="text-red-700">*</span></span>
          <input className="field" type="tel" inputMode="numeric" autoComplete="off" value={form.phone} onChange={set('phone')} placeholder="98765 43210" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">City</span>
          <input className="field" autoComplete="off" value={form.city} onChange={set('city')} />
        </label>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">What do they need?</span>
        <textarea className="field min-h-24 py-3" rows={3} value={form.requirement} onChange={set('requirement')}
          placeholder="e.g. 2,000 W-cut bags, 12×16, one-colour print" />
      </label>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-navy" checked={form.consent} onChange={set('consent')} />
        <span>They have agreed to Sri Raja Bags calling or WhatsApping them about bags.</span>
      </label>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button className="btn-primary sm:w-auto sm:px-8" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add lead'}</button>
        <button type="button" className="btn-ghost sm:w-auto sm:px-6" onClick={() => { setOpen(false); setError('') }}>Cancel</button>
      </div>
      <p className="text-xs text-ink-soft">Only add people who know you are passing on their details. Up to 20 leads a day.</p>
    </form>
  )
}
