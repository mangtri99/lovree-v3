export function createDebouncer(fn: () => void | Promise<void>, delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { timer = null; fn() }, delayMs)
  }
  // Returns the underlying call so callers can await an immediate save
  // (e.g. flush before publish so the latest edit is persisted first).
  function flush() {
    if (timer) { clearTimeout(timer); timer = null }
    return fn()
  }
  function cancel() { if (timer) { clearTimeout(timer); timer = null } }
  return { schedule, flush, cancel }
}
