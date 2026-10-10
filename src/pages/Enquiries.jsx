import { useCallback, useEffect, useState } from 'react'
import { Alert, Spinner, useCooldown } from '../components.jsx'
import { fetchEnquiries } from '../services/api.js'
import { formatEnquiryDate, formatRupees } from '../domain/referral.js'
import { EarnedChip } from './Onboard.jsx'

// The Enquiries tab: a page at a time, newest first. Each enquiry is a masked
// phone and the affiliate's own reference; nothing else that identifies the buyer.
export default function Enquiries({ getToken, onSignedOut, earned = 0 }) {
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
                    <span className="font-mono font-medium tracking-wide">{e.phone || 'Enquiry'}</span>
                    {e.ref && <span className="text-xs font-medium text-navy-soft">{e.ref}</span>}
                  </p>
                  <p className="text-xs text-ink-soft">{formatEnquiryDate(e.submittedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StagePill stage={e.stage} label={e.stageLabel} />
                  {e.commission > 0 && <span className="text-sm font-semibold text-navy-deep">{formatRupees(e.commission)}</span>}
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
            Each enquiry shows the last four digits of the buyer's mobile, to protect their privacy. Stages update as our
            team works on each enquiry, and can take a minute or two to appear here.
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
