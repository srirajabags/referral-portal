import { Shell } from '../components.jsx'
import { whatsappEnquiryUrl } from '../domain/referral.js'

// A buyer with a broken link still wants bags. Do not strand them.
export default function BadLink() {
  return (
    <Shell narrow subtitle="Custom non-woven bags">
      <div className="card space-y-4 text-center">
        <h1 className="text-xl font-semibold text-navy">This link isn't working</h1>
        <p className="text-ink-soft">It may have been cut short when it was copied. You can still reach us directly.</p>
        <a className="btn-whatsapp" href={whatsappEnquiryUrl(null)}>Message us on WhatsApp</a>
        <a className="btn-ghost" href="https://www.srirajabags.in/">Visit srirajabags.in</a>
      </div>
    </Shell>
  )
}
