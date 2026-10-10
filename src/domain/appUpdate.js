// Deciding whether this tab is on the build the server is serving, and what to
// do about it. The network and cache work lives in src/services/appUpdate.js.
import { routeFor } from './referral.js'

// A deploy this tab is not on. A rollback counts as much as a new build: either
// way the assets held here no longer match what the server hands out.
export const isDifferentBuild = (deployed, runningVersion) =>
  !!deployed && typeof deployed.version === 'string' && !!deployed.version &&
  deployed.version !== runningVersion

// Reloading cannot fix a mismatch the server itself is serving (a half-finished
// deploy where version.json is new but index.html is not). After this many tries
// the app stops insisting rather than becoming unusable until Pages catches up.
export const MAX_FORCED_ATTEMPTS = 2
export const mayStillForce = (attempts) => attempts < MAX_FORCED_ATTEMPTS

// Affiliates are signed in and come back to an installed app: block them with a
// notice until they update, exactly as the internal app does. Buyers on a
// referral link are strangers seeing us for the first time; a modal about
// versions would only confuse them, and reloading mid-form would lose what they
// typed. So their page checks once on arrival and quietly reloads if stale.
export const updateModeFor = (pathname) =>
  routeFor(pathname).page === 'home' ? 'block' : 'on-arrival'

// A buyer page reloads on its own, with no button in between, so it may only do
// so when the attempt was actually written down. Where storage is blocked the
// count would never rise and the page would reload forever; better a buyer on
// last week's build than a buyer on a page that never stops loading.
export const shouldReloadOnArrival = ({ stale, attempts, recorded }) =>
  stale && mayStillForce(attempts) && recorded
