// Copies AERO's data into public/data/ so the app serves it as static files.
// Uses data/processed/ once AERO publishes real files there, otherwise data/samples/.
import { cpSync, existsSync, rmSync } from 'node:fs'

const processed = new URL('../../data/processed/', import.meta.url)
const samples = new URL('../../data/samples/', import.meta.url)
const src = existsSync(new URL('manifest.json', processed)) ? processed : samples
const dst = new URL('../public/data/', import.meta.url)

rmSync(dst, { recursive: true, force: true })
cpSync(src, dst, { recursive: true })
// AERO publishes the real site catalogue (data/processed/sites.json, T05) before the rest of data/processed/.
const sites = new URL('sites.json', processed)
if (src === samples && existsSync(sites)) { cpSync(sites, new URL('sites.json', dst)); console.log('sites:', sites.pathname) }
console.log('data:', src.pathname, '->', dst.pathname)
