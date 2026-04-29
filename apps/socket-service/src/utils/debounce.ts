type DebouncedFn = () => void;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function debounceByKey(key: string, fn: DebouncedFn, delayMs: number): void {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    fn();
  }, delayMs));
}

export function cancelDebounce(key: string): void {
  const existing = timers.get(key);
  if (existing) {
    clearTimeout(existing);
    timers.delete(key);
  }
}
