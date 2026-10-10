import { useCallback, useEffect, useState } from 'react'
import { Alert, Spinner, WhatsAppIcon, useCooldown } from '../components.jsx'
import { fetchOnboarded, onboardAffiliate } from '../services/api.js'
import { formatEnquiryDate, formatPercent, formatRupees, inviteWhatsappUrl, onboardProblem } from '../domain/referral.js'

// The Onboard tab: bring someone else into the programme and earn a share, on
// top, of everything they earn, for life. They are added with their own code and
// join the moment they first sign in with the number given here.
export default function Onboard({ me, getToken, onSignedOut, onChanged }) {
  const share = me.tier?.onboardingShare ?? 0
  const earned = me.summary?.onboardingEarned ?? 0

  const [form, setForm] = useState({ name: '', phone: '', city: '', consent: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(null) // { name, phone } just onboarded

  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [listError, setListError] = useState('')
  const [loading, setLoading] = useState(false)
  // The server keeps an affiliate's data for a minute; refreshing sooner adds load, not news.
  const [canRefresh, startCooldown] = useCooldown(60_000)

  const load = useCallback(async (p) => {
    setLoading(true)
    setListError('')
    try {
      const next = await fetchOnboarded(await getToken(), p)
      setData(next)
      if (next.page !== p) setPage(next.page)
    } catch (err) {
      if (err.status === 401) return onSignedOut()
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [getToken, onSignedOut])
  useEffect(() => { load(page) }, [load, page])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const problem = onboardProblem(form)
    if (problem) return setError(problem)
    setError('')
    setBusy(true)
    try {
      await onboardAffiliate(await getToken(), form)
      setAdded({ name: form.name.trim(), phone: form.phone })
      setForm({ name: '', phone: '', city: '', consent: false })
      if (page === 1) load(1); else setPage(1)
      onChanged()
    } catch (err) {
      if (err.status === 401) return onSignedOut()
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const invite = added && inviteWhatsappUrl({ phone: added.phone, name: added.name, portalUrl: window.location.origin })

  return (
    <div className="space-y-4">
      <section className="card space-y-4 lg:p-8" aria-label="Onboard an affiliate">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-navy">Bring in another affiliate</h2>
          <p className="text-sm text-ink-soft">
            Know someone who meets shop owners and buyers? Add them here.
            {share > 0 && <> You earn <span className="font-semibold text-navy-deep">{formatPercent(share)}</span> on top of everything they earn, for as long as they are with us. They keep all of their own commission.</>}
          </p>
          {earned > 0 && <EarnedChip label="Earned from people you onboarded" amount={earned} />}
        </div>

        {added ? (
          <div className="space-y-3 rounded-xl bg-mint-pale px-4 py-4" role="status">
            <p className="font-medium text-navy-deep">{added.name} has been added.</p>
            <p className="text-sm text-navy">
              Send them the invite. They join when they sign in with the number you entered, and their link is ready for them.
            </p>
            {invite && (
              <a className="btn-whatsapp" href={invite} target="_blank" rel="noopener"><WhatsAppIcon /> Send the invite on WhatsApp</a>
            )}
            <button className="min-h-11 w-full text-sm font-medium text-navy-soft" onClick={() => setAdded(null)}>Onboard someone else</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Their name <span className="text-red-700">*</span></span>
                <input className="field" autoComplete="off" value={form.name} onChange={set('name')} placeholder="e.g. Ravi Kumar" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Their mobile number <span className="text-red-700">*</span></span>
                <input className="field" type="tel" inputMode="numeric" autoComplete="off" value={form.phone} onChange={set('phone')} placeholder="98765 43210" />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">City</span>
              <input className="field" autoComplete="off" value={form.city} onChange={set('city')} />
            </label>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-navy" checked={form.consent} onChange={set('consent')} />
              <span>They have agreed to join, and to me sharing their number with Sri Raja Bags.</span>
            </label>
            {error && <Alert>{error}</Alert>}
            <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add affiliate'}</button>
            <p className="text-xs text-ink-soft">
              Someone already in the programme cannot be added again. You can add up to 10 people a day.
            </p>
          </form>
        )}
      </section>

      <section className="card space-y-3 lg:p-8" aria-label="People you onboarded">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">
            People you onboarded{data?.total ? <span className="ml-2 text-sm font-normal text-ink-soft">({data.total})</span> : null}
          </h2>
          <button className="min-h-11 text-sm font-medium text-navy-soft disabled:opacity-50"
            disabled={loading || !canRefresh} onClick={() => { startCooldown(); load(page) }}>
            {loading ? 'Loading…' : canRefresh ? 'Refresh' : 'Up to date'}
          </button>
        </div>
        {listError && <Alert>{listError}</Alert>}
        {!data && !listError ? <Spinner label="Loading…" /> : data?.items.length ? (
          <>
            <ul className={`divide-y divide-rule transition-opacity ${loading ? 'opacity-50' : ''}`}>
              {data.items.map((p, i) => (
                <li key={`${p.phone}-${i}`} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{p.name}</p>
                    <p className="text-xs text-ink-soft">
                      <span className="font-mono">{p.phone}</span> · Added {formatEnquiryDate(p.onboardedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${p.joined ? 'bg-mint-pale text-navy-deep' : 'bg-navy/5 text-navy'}`}>
                      {p.joined ? 'Joined' : 'Invited'}
                    </span>
                    {p.earnedForYou > 0 && <span className="text-sm font-semibold text-navy-deep">{formatRupees(p.earnedForYou)}</span>}
                  </div>
                </li>
              ))}
            </ul>
            {data.pages > 1 && (
              <nav className="flex items-center justify-between gap-2 border-t border-rule pt-3" aria-label="Pages">
                <button className="btn-ghost w-auto px-4" disabled={loading || data.page <= 1} onClick={() => setPage(data.page - 1)}>← Newer</button>
                <span className="text-sm text-ink-soft">Page {data.page} of {data.pages}</span>
                <button className="btn-ghost w-auto px-4" disabled={loading || data.page >= data.pages} onClick={() => setPage(data.page + 1)}>Older →</button>
              </nav>
            )}
            <p className="text-xs text-ink-soft">The amount beside each person is what they have earned for you so far.</p>
          </>
        ) : data ? (
          <div className="rounded-xl bg-paper-alt px-4 py-6 text-center">
            <p className="font-medium">Nobody yet</p>
            <p className="mt-1 text-sm text-ink-soft">People you add show here, with what they earn for you.</p>
          </div>
        ) : null}
      </section>
    </div>
  )
}

// A "rich chip": the total, prominent, with a coin mark, for the top of a list.
export function EarnedChip({ label, amount }) {
  return (
    <p className="inline-flex items-center gap-2.5 rounded-full bg-mint-pale py-1.5 pl-1.5 pr-4 ring-1 ring-mint/40">
      <span className="flex size-7 items-center justify-center rounded-full bg-mint text-sm font-bold text-navy-deep" aria-hidden="true">₹</span>
      <span className="text-sm text-navy-deep">
        {label} <span className="ml-1 text-base font-bold">{formatRupees(amount)}</span>
      </span>
    </p>
  )
}
