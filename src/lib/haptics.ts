export const triggerHaptic = (pattern: number | number[] = 20) => {
  if (typeof window === 'undefined') return
  if (!('vibrate' in navigator)) return

  try {
    navigator.vibrate(pattern)
  } catch {
    // Silently ignore unsupported or blocked vibration calls.
  }
}

