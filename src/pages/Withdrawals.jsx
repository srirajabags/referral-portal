import { useCallback, useEffect, useState } from 'react'
import { Alert, Spinner, useCooldown } from '../components.jsx'
import { fetchPaymentScreenshot, fetchWithdrawals } from '../services/api.js'
import { formatEnquiryDate, formatRupees } from '../domain/referral.js'

// The Withdrawals tab: every request and what became of it, a page at a time.
// Staff mark each Paid (with the UTR and a screenshot) or Rejected (with a note).
export default function Withdrawals({ getToken, onSignedOut }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [screenshot, setScreenshot] = useState(null) // { ref, loading } | { ref, url } | { ref, error }
  // The server keeps an affiliate's data for a minute; refreshing sooner adds load, not news.
  const [canRefresh, startCooldown] = useCooldown(60_000)

  const load = useCallback(async (p) => {
    setLoading(true)
    setError('')
    try {
      const next = await fetchWithdrawals(await getToken(), p)
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
  useEffect(() => () => { if (screenshot?.url) URL.revokeObjectURL(screenshot.url) }, [screenshot])

  const go = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showScreenshot = async (ref) => {
    setScreenshot({ ref, loading: true })
    try {
      const blob = await fetchPaymentScreenshot(await getToken(), ref)
      setScreenshot({ ref, url: URL.createObjectURL(blob) })
    } catch (err) {
      setScreenshot({ ref, error: err.message })
    }
  }

  return (
    <section className="card space-y-3 lg:p-8" aria-label="Withdrawals">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-navy">
          Withdrawals{data?.total ? <span className="ml-2 text-sm font-normal text-ink-soft">({data.total})</span> : null}
        </h2>
        <button className="min-h-11 text-sm font-medium text-navy-soft disabled:opacity-50"
          disabled={loading || !canRefresh} onClick={() => { startCooldown(); load(page) }}>
          {loading ? 'Loading…' : canRefresh ? 'Refresh' : 'Up to date'}
        </button>
      </div>
      {error && <Alert>{error}</Alert>}

      {!data && !error ? <Spinner label="Loading withdrawals…" /> : data?.items.length ? (
        <>
          <ul className={`divide-y divide-rule transition-opacity ${loading ? 'opacity-50' : ''}`}>
            {data.items.map((w) => (
              <li key={w.ref} className="space-y-1.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{formatRupees(w.amount)}</p>
                    <p className="break-all text-xs text-ink-soft">
                      <span className="font-medium text-navy-soft">{w.ref}</span> · Requested {formatEnquiryDate(w.requestedAt)} · {w.upiId}
                    </p>
                  </div>
                  <WithdrawalPill status={w.status} />
                </div>
                {w.status === 'Paid' && (
                  <p className="text-xs text-ink-soft">
                    Paid{w.paidAt ? ` ${formatEnquiryDate(w.paidAt)}` : ''}
                    {w.paymentReference && <> · UTR <span className="font-mono text-ink">{w.paymentReference}</span></>}
                  </p>
                )}
                {w.hasScreenshot && (
                  <button className="min-h-11 text-sm font-medium text-navy-soft underline underline-offset-2" onClick={() => showScreenshot(w.ref)}>
                    View payment screenshot
                  </button>
                )}
                {w.note && <p className="rounded-lg bg-paper-alt px-3 py-2 text-xs text-ink-soft">Note from our team: {w.note}</p>}
              </li>
            ))}
          </ul>

          {data.pages > 1 && (
            <nav className="flex items-center justify-between gap-2 border-t border-rule pt-3" aria-label="Pages">
              <button className="btn-ghost w-auto px-4" disabled={loading || data.page <= 1} onClick={() => go(data.page - 1)}>← Newer</button>
              <span className="text-sm text-ink-soft">Page {data.page} of {data.pages}</span>
              <button className="btn-ghost w-auto px-4" disabled={loading || data.page >= data.pages} onClick={() => go(data.page + 1)}>Older →</button>
            </nav>
          )}
          <p className="text-xs text-ink-soft">
            Our team pays each request to the UPI ID shown and updates it here with the payment reference. Updates can
            take a minute or two to appear.
          </p>
        </>
      ) : data ? (
        <div className="rounded-xl bg-paper-alt px-4 py-6 text-center">
          <p className="font-medium">No withdrawals yet</p>
          <p className="mt-1 text-sm text-ink-soft">When you withdraw your balance to UPI, each request and its status shows here.</p>
        </div>
      ) : null}

      {screenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/70 p-4" role="dialog" aria-modal="true"
          aria-label={`Payment screenshot for ${screenshot.ref}`} onClick={() => setScreenshot(null)}>
          <div className="max-h-full w-full max-w-md overflow-auto rounded-2xl bg-paper p-4 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-navy">Payment for {screenshot.ref}</p>
              <button className="min-h-11 px-2 text-sm text-navy-soft" onClick={() => setScreenshot(null)} autoFocus>Close</button>
            </div>
            {screenshot.loading && <p className="py-10 text-center text-sm text-ink-soft">Loading…</p>}
            {screenshot.error && <Alert>{screenshot.error}</Alert>}
            {screenshot.url && <img src={screenshot.url} alt={`Payment screenshot for ${screenshot.ref}`} className="w-full rounded-xl" />}
          </div>
        </div>
      )}
    </section>
  )
}

const WITHDRAWAL_TONES = {
  Paid: 'bg-mint-pale text-navy-deep',
  Rejected: 'bg-red-50 text-red-800',
}
function WithdrawalPill({ status }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${WITHDRAWAL_TONES[status] ?? 'bg-navy/5 text-navy'}`}>
      {status === 'Requested' ? 'Processing' : status}
    </span>
  )
}
