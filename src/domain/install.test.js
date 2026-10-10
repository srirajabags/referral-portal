import { describe, it, expect } from 'vitest'
import { installOptionFor, isIOSDevice } from './install.js'

describe('installOptionFor — offer the install the device can actually do', () => {
  const base = { standalone: false, canPrompt: false, ios: false, dismissed: false }
  it('offers the system dialog when the browser has handed us one', () => {
    expect(installOptionFor({ ...base, canPrompt: true })).toBe('prompt')
  })
  it('explains the Share sheet on iOS, where no dialog exists', () => {
    expect(installOptionFor({ ...base, ios: true })).toBe('ios')
  })
  it('offers nothing once running as an installed app', () => {
    expect(installOptionFor({ ...base, standalone: true, canPrompt: true, ios: true })).toBe('none')
  })
  it('respects "Not now"', () => {
    expect(installOptionFor({ ...base, canPrompt: true, dismissed: true })).toBe('none')
  })
  it('stays quiet where installing is not possible (e.g. Firefox on Android, or already installed in Chrome)', () => {
    expect(installOptionFor(base)).toBe('none')
  })
})

describe('isIOSDevice', () => {
  it('knows iPhones, and iPads that claim to be Macs', () => {
    expect(isIOSDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' })).toBe(true)
    expect(isIOSDevice({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true)
  })
  it('does not mistake a real Mac or an Android phone for iOS', () => {
    expect(isIOSDevice({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false)
    expect(isIOSDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14)', platform: 'Linux armv8l', maxTouchPoints: 5 })).toBe(false)
  })
})
