import { describe, it, expect, vi } from 'vitest'
import { createDebouncer } from '../../app/composables/useAutosave'

describe('createDebouncer', () => {
  it('coalesces rapid calls into one after the delay', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = createDebouncer(fn, 1500)
    d.schedule(); d.schedule(); d.schedule()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1500)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
  it('flush runs immediately and cancels the pending timer', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = createDebouncer(fn, 1500)
    d.schedule()
    d.flush()
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1500)
    expect(fn).toHaveBeenCalledTimes(1) // not called again
    vi.useRealTimers()
  })
})
