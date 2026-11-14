// Builds the mission cards shown when a known landing site is hovered: a short summary and one image per site.
// Text: the lead of the mission's English Wikipedia article (CC BY-SA 4.0). Image: the article's lead image, kept only
// when Wikimedia Commons states a free licence; author and licence are stored with it.
// Run by hand: `node scripts/fetch-missions.mjs` (needs the network). Output is committed, so the app works offline.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const ARTICLE = {
  'apollo-11': 'Apollo 11', 'apollo-12': 'Apollo 12', 'apollo-14': 'Apollo 14', 'apollo-15': 'Apollo 15',
  'apollo-16': 'Apollo 16', 'apollo-17': 'Apollo 17',
  'surveyor-1': 'Surveyor 1', 'surveyor-3': 'Surveyor 3', 'surveyor-5': 'Surveyor 5', 'surveyor-6': 'Surveyor 6', 'surveyor-7': 'Surveyor 7',
  'luna-9': 'Luna 9', 'luna-13': 'Luna 13', 'luna-16': 'Luna 16', 'luna-17': 'Luna 17', 'luna-20': 'Luna 20',
  'luna-21': 'Luna 21', 'luna-23': 'Luna 23', 'luna-24': 'Luna 24',
  'change-3': "Chang'e 3", 'change-4': "Chang'e 4", 'change-5': "Chang'e 5", 'change-6': "Chang'e 6",
  'chandrayaan-3': 'Chandrayaan-3', slim: 'Smart Lander for Investigating Moon',
  'im-1-odysseus': 'IM-1', 'im-2-athena': 'IM-2', 'blue-ghost-1': 'Blue Ghost Mission 1', 'im-3-reiner-gamma': 'IM-3',
  'hakuto-r-m1': 'Hakuto-R Mission 1', 'hakuto-r-m2': 'Hakuto-R Mission 2',
}
const UA = { 'User-Agent': 'lunar-navigator-build/0.1 (static site build script)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// Polite client: on "too many requests" wait and try again, a few times.
async function get(url) {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: UA })
    if (r.ok) return r
    if (r.status !== 429 || i === 5) throw new Error(`${r.status} ${url}`)
    await sleep(5000 * (i + 1))
  }
}
const api = async (params) => (await get(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&redirects=1&${new URLSearchParams(params)}`)).json()
const text = (html) => html?.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const FREE = /^(public domain|pd|cc0|cc by)/i

const sites = JSON.parse(readFileSync(new URL('../../data/processed/sites.json', import.meta.url))).sites
mkdirSync(new URL('../public/missions/', import.meta.url), { recursive: true })

// 1. Lead text and lead image name of every article (20 articles per request).
const titles = [...new Set(Object.values(ARTICLE))]
const pages = {}
for (let i = 0; i < titles.length; i += 20) {
  const r = await api({ action: 'query', prop: 'extracts|pageimages|info', exintro: '1', explaintext: '1', exsentences: '3', exlimit: '20',
    piprop: 'name', pilimit: '20', inprop: 'url', titles: titles.slice(i, i + 20).join('|') })
  const from = Object.fromEntries([...(r.query.normalized ?? []), ...(r.query.redirects ?? [])].map((x) => [x.to, x.from]))
  for (const p of r.query.pages) pages[from[p.title] ?? p.title] = p
  await sleep(1500)
}
// 2. Licence, author and a 480 px rendition of every lead image (one request).
const files = [...new Set(Object.values(pages).map((p) => p.pageimage).filter(Boolean))]
const infos = {}
for (let i = 0; i < files.length; i += 40) {
  const r = await api({ action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '480', titles: files.slice(i, i + 40).map((f) => 'File:' + f).join('|') })
  const from = Object.fromEntries((r.query.normalized ?? []).map((x) => [x.to, x.from]))
  for (const p of r.query.pages) infos[(from[p.title] ?? p.title).replace(/^File:/, '')] = p.imageinfo?.[0]
  await sleep(1500)
}
// 3. One entry per site; download the image when its licence is free.
const out = {}
for (const s of sites) {
  const p = pages[ARTICLE[s.id]]
  if (!p?.extract) { console.warn(s.id, 'no article text'); continue }
  const entry = { title: p.title, summary: p.extract.replace(/\s+/g, ' ').trim(), url: p.fullurl, text_licence: 'CC BY-SA 4.0' }
  const info = p.pageimage && infos[p.pageimage]
  const licence = info?.extmetadata?.LicenseShortName?.value
  if (info?.thumburl && licence && FREE.test(licence)) {
    const ext = info.thumburl.split('?')[0].split('.').pop().toLowerCase().replace('jpeg', 'jpg')
    try {
      writeFileSync(new URL(`../public/missions/${s.id}.${ext}`, import.meta.url), Buffer.from(await (await get(info.thumburl)).arrayBuffer()))
      entry.image = { file: `missions/${s.id}.${ext}`, credit: text(info.extmetadata.Artist?.value) || text(info.extmetadata.Credit?.value) || 'unknown author',
        licence, source: info.descriptionurl }
    } catch (e) { console.warn(s.id, 'image download failed:', e.message) }
    await sleep(1500)
  } else console.warn(s.id, 'image skipped:', p.pageimage ?? 'none', licence ?? 'no licence stated')
  out[s.id] = entry
  console.log(s.id, '->', p.title, entry.image ? entry.image.licence : '(no image)')
}
writeFileSync(new URL('../src/data/missions.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
