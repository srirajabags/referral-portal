# Sri Raja Bags referral portal

`refer.srirajabags.in`: a mobile-first PWA where anyone signs in with their
phone number (OTP via Firebase Phone Auth) and gets one permanent referral link,
`refer.srirajabags.in/r/<CODE>`. A buyer who opens the link sees an enquiry
page, and their enquiry is recorded against the affiliate's code.

```
browser ──OTP──▶ Firebase Phone Auth ──ID token──▶ browser
browser ──ID token──▶ referral backend ──▶ affiliate record + referral code
buyer   ──enquiry──▶ referral backend ──▶ enquiry, credited to the code
```

The backend is a separate private service. It checks each Firebase ID token
itself and only answers requests from this site's origin.

## Develop

```
cp .env.example .env.local   # fill in
npm install
npm run dev                  # http://localhost:5173
npm test
```

Logic lives in `src/domain/` and is tested there. Pages are thin.

## Configuration

The build reads five values, set as GitHub Actions **repository variables**
(Settings → Secrets and variables → Actions → Variables). The names are in
`.env.example`. The Firebase values are a web app config, which is public by
design; there are no secrets in this repository.

Pages deploys from GitHub Actions on every push to `main`. The deploy only runs
if the tests pass.

## Forced updates

`get-version.js` runs before `dev`, `build` and `test`. It writes the commit ID
into `src/version.js` (the build that is **running**) and `public/version.json`
(the build that is **deployed**). Both are gitignored. `src/UpdateGate.jsx`
compares the two:

- **Affiliate pages** check on load, when the app comes back into view, and
  every 15 minutes. If the builds differ, a notice the user cannot dismiss blocks
  the app. "Update now" unregisters the service worker, clears the caches and
  reloads. If two reloads fail to fix it, the notice offers a way past.
- **Buyer pages** (`/r/…`) check once on arrival and quietly reload, at most
  twice, and only when the attempt can be recorded. A first-time buyer never
  sees a notice about versions.

`version.json` is kept out of the Workbox precache. If it were precached, the
app would compare against a stale copy and always think it was up to date.

## Known limits

- `/r/<CODE>` is served by Pages' 404 fallback, so its HTTP status is 404 even
  though the page renders. Browsers do not care. Check that WhatsApp still
  draws a link preview. If it does not, switch links to `/r/?c=<CODE>`.
- Phone sign-in shows an invisible reCAPTCHA. Google only turns it into a
  visible challenge when it is unsure.
