// Within one landing day the score moves only a little (the Sun moves ~0.5° per hour on the Moon), so the
// time-of-day strip is coloured relative to that day, and the UI prints the range it was stretched over.
export function relativeToDay(values: (number | null)[]): { scaled: (number | null)[]; min: number | null; max: number | null } {
  const known = values.filter((v): v is number => v !== null)
  if (!known.length) return { scaled: values.map(() => null), min: null, max: null }
  const min = Math.min(...known), max = Math.max(...known)
  const scaled = values.map((v) => (v === null ? null : max > min ? (v - min) / (max - min) : 0.5))
  return { scaled, min, max }
}

export const STRIP_STEP_MIN = 10   // colour samples every 10 min (the matrix computes at a 10 min step anyway)
export const fmtClock = (minuteUtc: number) =>
  `${String(Math.floor(minuteUtc / 60)).padStart(2, '0')}:${String(minuteUtc % 60).padStart(2, '0')}`
