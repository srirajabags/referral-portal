import { useEffect, useState } from 'react'
import { Alert, FactoryPhoto, Shell, WhatsAppIcon } from '../components.jsx'
import { checkCode, sendEnquiry } from '../services/api.js'
import { enquiryProblem, whatsappEnquiryUrl } from '../domain/referral.js'
import { track } from '../services/analytics.js'
import BadLink from './BadLink.jsx'

// What a buyer sees when an affiliate's link is opened. Written for them: who
// we are, and the two quickest ways to ask for a quote. Nothing here says who
// referred them -- that is between us and the affiliate.
export default function ReferralLanding({ code }) {
  const [valid, setValid] = useState(true)
  const [form, setForm] = useState({ businessName: '', contactName: '', phone: '', city: '', requirement: '', consent: false, website: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  // The page shows straight away; a dead code swaps it out when the answer comes.
  // Only a definite "no such code" does that -- a network blip should not.
  useEffect(() => {
    checkCode(code).catch((err) => { if (err.status === 404) setValid(false) })
  }, [code])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const problem = enquiryProblem(form)
    if (problem) return setError(problem)
    setError('')
    setBusy(true)
    try {
      await sendEnquiry({ ...form, code })
      track('generate_lead', { method: 'referral_form' })
      setSent(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (err.status === 404) setValid(false)
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!valid) return <BadLink />

  if (sent) {
    return (
      <Shell narrow subtitle="Custom non-woven bags">
        <div className="card space-y-4 text-center lg:p-8">
          <p className="mx-auto flex size-14 items-center justify-center rounded-full bg-mint-pale text-3xl text-navy">✓</p>
          <h1 className="text-xl font-semibold text-navy">Thank you, we have your enquiry</h1>
          <p className="text-ink-soft">Our team will call you on the number you gave us. If it's urgent, message us on WhatsApp.</p>
          <a className="btn-whatsapp" href={whatsappEnquiryUrl(code)}><WhatsAppIcon /> Message us on WhatsApp</a>
          <a className="btn-ghost" href="https://www.srirajabags.in/catalog/">See our bags</a>
        </div>
      </Shell>
    )
  }

  return (
    <Shell subtitle="Custom non-woven bags">
      {/* Phone: pitch, WhatsApp, form, photo, top to bottom. Desktop: pitch,
          WhatsApp and photo on the left, the form on the right. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-x-16 lg:gap-y-10">
        <section className="space-y-3 lg:col-start-1 lg:space-y-6">
          <p className="inline-block rounded-full bg-mint-pale px-3 py-1 text-xs font-medium text-navy lg:text-sm">Recommended by one of our partners</p>
          <h1 className="text-2xl font-bold leading-tight text-navy md:text-3xl lg:text-5xl lg:leading-[1.1] lg:tracking-tight">
            Custom-printed non-woven bags, made in our own factory
          </h1>
          <ul className="list-disc space-y-1.5 pl-5 text-ink-soft marker:text-mint lg:text-lg">
            <li>Printed with your shop name and logo</li>
            <li>W-cut, D-cut and loop-handle bags in many sizes and colours</li>
            <li>Bulk orders for shops, supermarkets, restaurants and events</li>
          </ul>
          <a className="btn-whatsapp mt-2 lg:w-auto lg:px-8" href={whatsappEnquiryUrl(code)} target="_blank" rel="noopener"
            onClick={() => track('generate_lead', { method: 'referral_whatsapp' })}>
            <WhatsAppIcon /> Get a quote on WhatsApp
          </a>
        </section>

        <div className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-wide text-ink-soft lg:hidden">
            <span className="h-px flex-1 bg-rule" /> or send an enquiry <span className="h-px flex-1 bg-rule" />
          </div>
          <form onSubmit={submit} className="card space-y-4 lg:p-7 lg:shadow-[0_8px_30px_rgb(5_56_107_/_0.08)]" noValidate>
            <div className="hidden lg:block">
              <h2 className="text-xl font-semibold text-navy">Send an enquiry</h2>
              <p className="mt-1 text-sm text-ink-soft">Tell us what you need and we'll call you back with a quote.</p>
            </div>
            <Field label="Business name" required>
              <input className="field" autoComplete="organization" value={form.businessName} onChange={set('businessName')} placeholder="e.g. Lakshmi Textiles" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name">
                <input className="field" autoComplete="name" value={form.contactName} onChange={set('contactName')} />
              </Field>
              <Field label="City">
                <input className="field" autoComplete="address-level2" value={form.city} onChange={set('city')} />
              </Field>
            </div>
            <Field label="Mobile number" required>
              <input className="field" type="tel" inputMode="numeric" autoComplete="tel-national" value={form.phone} onChange={set('phone')} placeholder="98765 43210" />
            </Field>
            <Field label="What do you need?">
              <textarea className="field min-h-24 py-3" rows={3} value={form.requirement} onChange={set('requirement')}
                placeholder="e.g. 2,000 W-cut bags, 12×16, one-colour print" />
            </Field>
            {/* Hidden from people; bots fill it in and are quietly ignored. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0" value={form.website} onChange={set('website')} />
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-navy" checked={form.consent} onChange={set('consent')} />
              <span>Sri Raja Bags may call or WhatsApp me about this enquiry.</span>
            </label>
            {error && <Alert>{error}</Alert>}
            <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send enquiry'}</button>
          </form>
        </div>

        <div className="lg:col-start-1">
          <FactoryPhoto />
          <p className="py-6 text-center text-sm text-ink-soft lg:hidden">
            <a className="underline underline-offset-2" href="https://www.srirajabags.in/">www.srirajabags.in</a>
          </p>
        </div>
      </div>
    </Shell>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}{required && <span className="text-red-700"> *</span>}</span>
      {children}
    </label>
  )
}
