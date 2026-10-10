import { useEffect, useState } from 'react'
import { Alert } from '../components.jsx'
import { requestWithdrawal } from '../services/api.js'
import { formatPercent, formatRupees, withdrawalProblem } from '../domain/referral.js'

// Tier, what has been earned and paid, and asking for the rest by UPI. The
// history of requests, and what became of each, is the Withdrawals tab.
export default function Earnings({ me, getToken, onChanged, onShowHistory }) {
  const balance = { earned: 0, paid: 0, pending: 0, available: 0, ...me.balance }
  const inProgress = me.openWithdrawal

  const [upiId, setUpiId] = useState(me.upiId || '')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  // Offer the whole balance; refreshed when the balance itself changes.
  useEffect(() => { setAmount(balance.available > 0 ? String(balance.available) : '') }, [balance.available])

  const submit = async (e) => {
    e.preventDefault()
    const problem = withdrawalProblem({ upiId, amount, available: balance.available })
    if (problem) return setError(problem)
    setError('')
    setBusy(true)
    try {
      await requestWithdrawal(await getToken(), { upiId, amount })
      setSent(true)
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card space-y-4" aria-label="Earnings">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-navy">Earnings</h2>
          {me.tier && (
            <span className="rounded-full bg-mint-pale px-2.5 py-0.5 text-xs font-medium text-navy">{me.tier.name}</span>
          )}
        </div>
        {me.tier && (
          <p className="text-xs text-ink-soft">
            {formatPercent(me.tier.firstOrderRate)} of a customer's first order · {formatPercent(me.tier.repeatOrderRate)} of
            each repeat order
          </p>
        )}
      </div>

      <dl className="space-y-2">
        <Figure label="Total commission earned" value={balance.earned} />
        <Figure label="Withdrawn" value={balance.paid} />
        <Figure label="Current balance" value={balance.available} highlight />
      </dl>
      {balance.pending > 0 && (
        <p className="text-xs text-ink-soft">{formatRupees(balance.pending)} requested and being processed.</p>
      )}

      {inProgress ? (
        <p role="status" className="rounded-xl bg-navy/5 px-4 py-3 text-sm text-navy">
          {sent ? 'Request sent. ' : ''}Your withdrawal {inProgress.ref} of {formatRupees(inProgress.amount)} to{' '}
          <span className="font-medium">{inProgress.upiId}</span> is being processed. It will show as paid, with the
          payment reference, in your withdrawal history.
        </p>
      ) : balance.available > 0 ? (
        <form onSubmit={submit} className="space-y-3" noValidate>
          <h3 className="text-sm font-semibold text-navy">Withdraw to UPI</h3>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">UPI ID</span>
            <input className="field" type="text" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck="false"
              placeholder="name@okhdfcbank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
          </label>
          <label className="block space-y-1.5">
            <span className="flex items-baseline justify-between text-sm font-medium">
              Amount (₹)
              <button type="button" className="text-xs font-medium text-navy-soft" onClick={() => setAmount(String(balance.available))}>
                Max {formatRupees(balance.available)}
              </button>
            </span>
            <input className="field" type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          {error && <Alert>{error}</Alert>}
          <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Request withdrawal'}</button>
          <p className="text-xs text-ink-soft">Our team pays it to this UPI ID and updates your withdrawal history.</p>
        </form>
      ) : (
        <p className="rounded-xl bg-paper-alt px-4 py-3 text-sm text-ink-soft">
          Once a referred order is confirmed, your commission shows here and you can withdraw it to UPI.
        </p>
      )}

      {me.withdrawalCount > 0 && (
        <button className="min-h-11 w-full text-sm font-medium text-navy-soft" onClick={onShowHistory}>
          See withdrawal history ({me.withdrawalCount}) →
        </button>
      )}
    </section>
  )
}

function Figure({ label, value, highlight }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 rounded-xl px-3 py-2 ${highlight ? 'bg-mint-pale' : 'bg-paper-alt'}`}>
      <dt className={`text-sm ${highlight ? 'font-semibold text-navy-deep' : 'text-ink-soft'}`}>{label}</dt>
      <dd className={`font-bold text-navy ${highlight ? 'text-2xl' : 'text-lg'}`}>{formatRupees(value)}</dd>
    </div>
  )
}
