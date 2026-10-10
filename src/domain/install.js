// Whether, and how, to offer installing the portal as an app.
//
// Android and desktop Chrome hand the page a `beforeinstallprompt` event that
// can show the system install dialog; iOS has no such event, and only "Add to
// Home Screen" from the Share sheet installs a web app there. Once the app is
// running standalone there is nothing left to offer.

// iPadOS reports itself as a Mac, so a Mac with a touch screen is an iPad.
export const isIOSDevice = ({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) =>
  /iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)

// 'prompt' (a button that opens the system dialog), 'ios' (Share-sheet steps) or 'none'.
export const installOptionFor = ({ standalone, canPrompt, ios, dismissed }) => {
  if (standalone || dismissed) return 'none'
  if (canPrompt) return 'prompt'
  if (ios) return 'ios'
  return 'none'
}
