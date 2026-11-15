// Display helpers for the countdown banner (ui/results/Countdown.tsx). Values come from /api/evaluate.

// "3 d 4 h" from 48 h up, "11 h 20 min" from 1 h, "35 min" below.
export function fmtCountdown(h: number): string {
  if (h >= 48) { const d = Math.floor(h / 24); return `${d} d ${Math.round(h - d * 24)} h` }
  if (h >= 1) { const w = Math.floor(h); const m = Math.round((h - w) * 60); return m ? `${w} h ${m} min` : `${w} h` }
  return `${Math.max(1, Math.round(h * 60))} min`
}

// The sentence for one body. toLoss: hours to the first loss (0 = not in view at landing, null = never lost);
// toGain: hours to the first rise when not in view at landing (null = never during the stay).
export function countdownText(body: 'sun' | 'earth', toLoss: number | null, toGain: number | null | undefined, stayH: number): string {
  const [up, set, rise, name] = body === 'sun' ? ['Sun up', 'Sunset', 'sunrise', 'Sun'] : ['Earth in view', 'Earthset', 'Earthrise', 'Earth']
  if (toLoss === null) return `${up} for the whole stay (${fmtCountdown(stayH)})`
  if (toLoss > 0) return `${set} in ${fmtCountdown(toLoss)}`
  if (toGain == null) return `No ${name} during the stay`
  return `${body === 'sun' ? 'Dark' : 'No Earth'} at landing, ${rise} in ${fmtCountdown(toGain)}`
}
