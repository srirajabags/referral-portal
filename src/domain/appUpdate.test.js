import { describe, it, expect } from 'vitest'
import { isDifferentBuild, mayStillForce, updateModeFor, shouldReloadOnArrival, MAX_FORCED_ATTEMPTS } from './appUpdate.js'

describe('isDifferentBuild — is this tab behind the server', () => {
  it('says yes to a newer deploy, and to a rollback', () => {
    expect(isDifferentBuild({ version: 'bbb' }, 'aaa')).toBe(true)
  })
  it('says no when the server is serving this very build', () => {
    expect(isDifferentBuild({ version: 'aaa' }, 'aaa')).toBe(false)
  })
  it('never calls a failed or garbled check a new build', () => {
    // An offline phone or a half-written file must not trigger a forced reload loop.
    for (const deployed of [null, undefined, {}, { version: '' }, { version: 42 }]) {
      expect(isDifferentBuild(deployed, 'aaa')).toBe(false)
    }
  })
})

describe('mayStillForce — stop insisting when reloading does not help', () => {
  it('forces for the first attempts, then lets the person carry on', () => {
    expect(mayStillForce(0)).toBe(true)
    expect(mayStillForce(MAX_FORCED_ATTEMPTS - 1)).toBe(true)
    expect(mayStillForce(MAX_FORCED_ATTEMPTS)).toBe(false)
  })
})

describe('updateModeFor — who gets a blocking notice', () => {
  it('blocks the affiliate app', () => {
    expect(updateModeFor('/')).toBe('block')
  })
  it('never puts a version notice in front of a buyer on a referral link', () => {
    expect(updateModeFor('/r/K7M2QX9')).toBe('on-arrival')
    expect(updateModeFor('/r/broken')).toBe('on-arrival')
    expect(updateModeFor('/r/')).toBe('on-arrival')
  })
})

describe('shouldReloadOnArrival — a buyer page reloads itself, so it must not loop', () => {
  it('reloads a stale page once the attempt is on record', () => {
    expect(shouldReloadOnArrival({ stale: true, attempts: 0, recorded: true })).toBe(true)
  })
  it('leaves a current page alone', () => {
    expect(shouldReloadOnArrival({ stale: false, attempts: 0, recorded: true })).toBe(false)
  })
  it('gives up after the allowed attempts', () => {
    expect(shouldReloadOnArrival({ stale: true, attempts: MAX_FORCED_ATTEMPTS, recorded: true })).toBe(false)
  })
  it('never reloads when storage is blocked and the attempt could not be counted', () => {
    // Without this, blocked sessionStorage means attempts stay 0 and the page reloads forever.
    expect(shouldReloadOnArrival({ stale: true, attempts: 0, recorded: false })).toBe(false)
  })
})
