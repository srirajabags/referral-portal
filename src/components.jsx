import { RUNNING_BUILD } from './services/appUpdate.js'

// Page frame shared by every screen. Phone width is the design baseline; from
// lg up, pages lay themselves out in two columns inside a wider frame, and
// short pages (`narrow`) sit as a centred card.
export function Shell({ children, footer, subtitle = 'Partner programme', narrow = false }) {
  const main = narrow ? 'max-w-md lg:py-16' : 'max-w-md md:max-w-2xl md:py-10 lg:max-w-6xl lg:px-8 lg:py-14'
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-navy text-white">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-3 md:max-w-2xl lg:max-w-6xl lg:px-8 lg:py-4">
          <img src="/pwa-192x192.png" alt="" width="40" height="40" className="size-9 rounded-lg bg-white p-0.5 lg:size-10" />
          <div className="leading-tight">
            <p className="text-base font-semibold lg:text-lg">Sri Raja Bags</p>
            <p className="text-xs text-white/70 lg:text-sm">{subtitle}</p>
          </div>
          <a href="https://www.srirajabags.in/" className="ml-auto hidden text-sm text-white/80 hover:text-white lg:block">
            srirajabags.in ↗
          </a>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-5 ${main}`}>{children}</main>
      {footer}
      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-md flex-col items-center gap-1 px-4 py-4 text-xs text-ink-soft md:max-w-2xl lg:max-w-6xl lg:flex-row lg:justify-between lg:px-8 lg:py-6 lg:text-sm">
          <span className="hidden lg:inline">Sri Raja Bags · Non-woven bag manufacturers, Dhone</span>
          {/* Which build is running, for when someone reports a problem. */}
          <span title={RUNNING_BUILD.version}>Version {RUNNING_BUILD.buildTimestampIstReadable}</span>
        </div>
      </footer>
    </div>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-ink-soft" role="status">
      <span className="size-8 animate-spin rounded-full border-4 border-rule border-t-navy" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function Alert({ children, tone = 'error' }) {
  const styles = tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-mint/40 bg-mint-pale text-navy-deep'
  return <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</p>
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44a9.4 9.4 0 0 1 6.68 2.77 9.38 9.38 0 0 1 2.76 6.68c0 5.21-4.24 9.44-9.45 9.44m8.04-17.49A11.3 11.3 0 0 0 12.04.67C5.77.67.67 5.77.67 12.03c0 2 .52 3.96 1.52 5.68L.57 23.33l5.75-1.5a11.3 11.3 0 0 0 5.72 1.46h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.04-1.18-5.89-3.32-8.03" />
    </svg>
  )
}

// Proof that "our own factory" is literal. Lazy, and sized up front so the page
// does not jump when it arrives.
export function FactoryPhoto({ className = '' }) {
  return (
    <figure className={className}>
      <img src="/factory.webp" alt="Bag-making machines on our factory floor" width="1200" height="537" loading="lazy"
        className="aspect-[1200/537] w-full rounded-2xl object-cover" />
      <figcaption className="mt-2 text-xs text-ink-soft">Our production line in Dhone, Andhra Pradesh</figcaption>
    </figure>
  )
}
