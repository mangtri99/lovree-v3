export function createDebouncer(fn: () => void, delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { timer = null; fn() }, delayMs)
  }
  function flush() {
    if (timer) { clearTimeout(timer); timer = null }
    fn()
  }
  function cancel() { if (timer) { clearTimeout(timer); timer = null } }
  return { schedule, flush, cancel }
}
