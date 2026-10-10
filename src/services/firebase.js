// Firebase is only ever loaded through here, and only by the affiliate side.
import { smsLanguage } from '../domain/referral.js'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)

let loaded
export const loadAuth = () => {
  loaded ??= Promise.all([import('firebase/app'), import('firebase/auth')]).then(([app, auth]) => {
    const instance = auth.getAuth(app.initializeApp(config))
    // The SMS arrives in the phone's language where Firebase has a translation.
    // Not useDeviceLanguage(): see smsLanguage for the tags that break it.
    instance.languageCode = smsLanguage(navigator.language)
    return { auth: instance, sdk: auth }
  })
  return loaded
}
