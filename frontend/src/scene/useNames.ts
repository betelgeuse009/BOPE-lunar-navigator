import { useEffect, useState } from 'react'
import { parseNames, type FeatureName, type NamesFile } from './labels'

// Loaded once, the first time the labels are switched on.
let names: Promise<FeatureName[]> | null = null
export function useNames(on: boolean): FeatureName[] | null {
  const [list, setList] = useState<FeatureName[] | null>(null)
  useEffect(() => {
    if (!on) return
    names ??= fetch(`${import.meta.env.BASE_URL}labels/moon_names.json`).then((r) => r.json() as Promise<NamesFile>).then(parseNames)
    let live = true
    names.then((n) => live && setList(n)).catch(() => { names = null })
    return () => { live = false }
  }, [on])
  return on ? list : null
}
