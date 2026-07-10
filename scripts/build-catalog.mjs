// DEV: copia TODOS los GLB del pack Kenney a public/assets/kits/<slug>/
// y genera src/catalog.js dividido por kit (como en kenney.nl).
// Uso: node scripts/build-catalog.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, '_assets_raw', 'extracted', '3D assets')
const OUT = path.join(ROOT, 'public', 'assets', 'kits')

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function walkGlb(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walkGlb(p))
    else if (e.isFile() && e.name.toLowerCase().endsWith('.glb')) out.push(p)
  }
  return out
}

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const kits = fs.readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
const catalog = {}
let totalFiles = 0

for (const kit of kits) {
  const glbs = walkGlb(path.join(SRC, kit))
  if (!glbs.length) continue
  const kslug = slug(kit)
  const destDir = path.join(OUT, kslug)
  fs.mkdirSync(destDir, { recursive: true })
  const seen = new Set()
  const urls = []
  for (const src of glbs) {
    let base = path.basename(src)
    // colisiones de basename dentro del kit: prefijar con subcarpeta
    if (seen.has(base.toLowerCase())) {
      const parent = slug(path.basename(path.dirname(src)))
      base = parent + '__' + base
    }
    seen.add(base.toLowerCase())
    fs.copyFileSync(src, path.join(destDir, base))
    urls.push(`assets/kits/${kslug}/${base}`)
    totalFiles++
  }
  urls.sort()
  catalog[kit] = urls
}

const body = `// AUTO-GENERADO por scripts/build-catalog.mjs — NO editar a mano.
// Todos los GLB del pack Kenney, divididos por kit (como kenney.nl).
export const CATALOG = ${JSON.stringify(catalog, null, 0).replace(/\],/g, '],\n ')}
`
fs.writeFileSync(path.join(ROOT, 'src', 'catalog.js'), body)
console.log(`Kits: ${Object.keys(catalog).length}  GLB: ${totalFiles}`)
