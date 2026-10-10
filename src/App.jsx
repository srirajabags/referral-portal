import { lazy, Suspense } from 'react'
import { routeFor } from './domain/referral.js'
import { Shell, Spinner } from './components.jsx'
import BadLink from './pages/BadLink.jsx'

// Split so a buyer opening a referral link never downloads the sign-in code
// (and Firebase with it) on a phone's mobile data.
const AffiliateHome = lazy(() => import('./pages/AffiliateHome.jsx'))
const ReferralLanding = lazy(() => import('./pages/ReferralLanding.jsx'))

export default function App() {
  const route = routeFor(window.location.pathname, window.location.search)
  return (
    <Suspense fallback={<Shell><Spinner /></Shell>}>
      {route.page === 'referral' && <ReferralLanding code={route.code} />}
      {route.page === 'bad-link' && <BadLink />}
      {route.page === 'home' && <AffiliateHome />}
    </Suspense>
  )
}
