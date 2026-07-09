import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { MODELS, allModelUrls } from './assets.js'

// ============================================================
//  KINTANA2 — mundo prototipo (ciudad-isla diseñada)
//  Movimiento WASD + click. Camara separada (der=rotar).
//  Edificios que tapan al jugador se transparentan.
//  Zonas con diseño ordenado. Assets: Kenney (CC0).
// ============================================================

const GRID = 46, TILE = 1, HALF = GRID / 2
const COAST_Z = 38
const ROAD_TOP = 0.02
const CHAR_H = 0.6

function makeRng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const rng = makeRng(2026)

// ---------- Renderer / escena / camara ----------
const canvas = document.getElementById('scene')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x9fd3ef)
scene.fog = new THREE.Fog(0x9fd3ef, 62, 140)

let viewSize = 13
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300)
function setCameraFrustum() { const a = window.innerWidth / window.innerHeight; camera.left = -viewSize * a; camera.right = viewSize * a; camera.top = viewSize; camera.bottom = -viewSize; camera.updateProjectionMatrix() }
setCameraFrustum()
camera.position.set(40, 40, 40)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.1
controls.target.set(0, 1, 0)
controls.minZoom = 0.6
controls.maxZoom = 8
controls.maxPolarAngle = Math.PI / 2.2
controls.enablePan = false
// separar movimiento de camara: izquierdo NO rota (es para caminar); rota con derecho
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE }
controls.update()

// ---------- Luces ----------
scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x8a8f7a, 0.95))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.5)
sun.position.set(28, 44, 22); sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.near = 1; sun.shadow.camera.far = 160
const S = HALF + 14; Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S }); sun.shadow.bias = -0.0004
scene.add(sun, sun.target)

// coords
const worldX = (gx) => gx * TILE - HALF + TILE / 2
const worldZ = (gz) => gz * TILE - HALF + TILE / 2
const idx = (x, z) => z * GRID + x
const inGrid = (x, z) => x >= 0 && z >= 0 && x < GRID && z < GRID

// ---------- Agua + isla ----------
const water = new THREE.Mesh(new THREE.PlaneGeometry(340, 340), new THREE.MeshStandardMaterial({ color: 0x3a9ad0, roughness: 0.7, metalness: 0 }))
water.rotation.x = -Math.PI / 2; water.position.y = -0.22; water.receiveShadow = true; scene.add(water)
const landN = worldZ(0) - 1, landS = worldZ(COAST_Z) - 0.5
const land = new THREE.Mesh(new THREE.PlaneGeometry(GRID + 2, landS - landN), new THREE.MeshStandardMaterial({ color: 0x9a9a90, roughness: 1 }))
land.rotation.x = -Math.PI / 2; land.position.set(0, -0.01, (landN + landS) / 2); land.receiveShadow = true; scene.add(land)
function groundPatch(x0, x1, z0, z1, color, y = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry((x1 - x0 + 1) * TILE, (z1 - z0 + 1) * TILE), new THREE.MeshStandardMaterial({ color, roughness: 1 }))
  m.rotation.x = -Math.PI / 2; m.position.set((worldX(x0) + worldX(x1)) / 2, y, (worldZ(z0) + worldZ(z1)) / 2); m.receiveShadow = true; scene.add(m)
}

// ============================================================
//  Carga
// ============================================================
const loaderEl = document.getElementById('loader'), barFill = document.getElementById('barFill'), loaderPct = document.getElementById('loaderPct'), loaderErr = document.getElementById('loaderErr')
const gltfLoader = new GLTFLoader()
const cache = new Map(), charAnims = new Map(), failed = []
const isChar = (u) => u.includes('character')
function loadGLB(url) { return new Promise((res) => gltfLoader.load(url, (g) => res(g), undefined, () => { failed.push(url); res(null) })) }
function normalize(obj, o = {}) {
  obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true } })
  const box = new THREE.Box3().setFromObject(obj), size = new THREE.Vector3(), center = new THREE.Vector3()
  box.getSize(size); box.getCenter(center)
  let s = 1
  if (o.scale) s = o.scale
  else if (o.footprint) s = o.footprint / Math.max(size.x, size.z)
  else if (o.length) s = o.length / Math.max(size.x, size.z)
  else if (o.height) { s = o.height / size.y; if (o.maxFootprint) s = Math.min(s, o.maxFootprint / Math.max(size.x, size.z)) }
  const w = new THREE.Group(); obj.scale.setScalar(s); obj.position.set(-center.x * s, -box.min.y * s, -center.z * s); w.add(obj)
  w.userData.h = size.y * s
  return w
}
function optsFor(u) {
  if (u.includes('/roads/')) return { footprint: TILE }
  if (u.includes('/cars/')) return { length: 0.92 }
  if (isChar(u)) return { height: CHAR_H }
  if (u.includes('skyscraper')) return { height: 3.2, maxFootprint: 1.35 }
  if (u.includes('/commercial/')) return { height: 1.7, maxFootprint: 1.2 }
  if (u.includes('/industrial/chimney') || u.includes('detail-tank')) return { height: 2.0, maxFootprint: 1.0 }
  if (u.includes('/industrial/')) return { height: 1.5, maxFootprint: 1.35 }
  if (u.includes('/suburban/tree')) return { height: u.includes('large') ? 1.25 : 0.8 }
  if (u.includes('/suburban/fence')) return { footprint: 0.9 }
  if (u.includes('/suburban/driveway') || u.includes('/suburban/path')) return { footprint: 0.95 }
  if (u.includes('/suburban/')) return { height: 1.15, maxFootprint: 1.4 }
  // minimarket
  if (u.includes('/market/floor')) return { footprint: 1.0 }
  if (u.includes('/market/wall')) return { footprint: 1.0 }
  if (u.includes('/market/')) return { height: 0.5 }
  // skate
  if (u.includes('/skate/floor')) return { footprint: 1.0 }
  if (u.includes('half-pipe') || u.includes('/skate/bowl') || u.includes('/skate/structure')) return { footprint: 1.0 }
  if (u.includes('/skate/')) return { height: 0.4 }
  // cementerio
  if (u.includes('/graveyard/pine')) return { height: 1.2 }
  if (u.includes('/graveyard/crypt')) return { footprint: 0.9 }
  if (u.includes('/graveyard/iron-fence') || u.includes('/graveyard/fence')) return { footprint: 0.9 }
  if (u.includes('/graveyard/lantern')) return { height: 0.6 }
  if (u.includes('/graveyard/bench')) return { footprint: 0.55 }
  if (u.includes('/graveyard/')) return { height: 0.5 }
  // puerto
  if (u.includes('ship-ocean-liner')) return { length: 9 }
  if (u.includes('ship-cargo')) return { length: 6 }
  if (u.includes('/port/boat')) return { length: 1.7 }
  if (u.includes('cargo-container')) return { length: 1.1 }
  if (u.includes('cargo-pile')) return { footprint: 1.1 }
  if (u.includes('/port/buoy')) return { height: 0.5 }
  // naturaleza
  if (u.includes('/nature/tree')) return { height: (u.includes('Tall') ? 1.9 : u.includes('Small') || u.includes('small')) ? 1.0 : 1.5, maxFootprint: 1.3 }
  if (u.includes('/nature/rock')) return { footprint: u.includes('large') ? 1.1 : 0.6 }
  if (u.includes('/nature/statue')) return { height: 1.3 }
  if (u.includes('/nature/stump') || u.includes('/nature/log')) return { footprint: 0.6 }
  if (u.includes('/nature/')) return { height: 0.35 } // plantas/flores/hongos
  // pirata
  if (u.includes('ship-pirate-large') || u.includes('/pirate/ship-large')) return { length: 6 }
  if (u.includes('ship-pirate-medium') || u.includes('/pirate/ship-medium')) return { length: 4.5 }
  if (u.includes('/pirate/ship')) return { length: 3 }
  if (u.includes('/pirate/palm')) return { height: 1.9 }
  if (u.includes('/pirate/tower')) return { height: 2.6 }
  if (u.includes('/pirate/flag')) return { height: 1.3 }
  if (u.includes('/pirate/structure') || u.includes('/pirate/platform')) return { footprint: 1.0 }
  if (u.includes('/pirate/patch') || u.includes('/pirate/grass-patch')) return { footprint: 1.0 }
  if (u.includes('/pirate/rocks')) return { footprint: 0.7 }
  if (u.includes('/pirate/cannon')) return { footprint: 0.6 }
  if (u.includes('/pirate/')) return { height: 0.45 }
  // survival
  if (u.includes('/survival/rock')) return { footprint: 0.6 }
  if (u.includes('/survival/grass')) return { footprint: 0.7 }
  if (u.includes('/survival/structure-canvas')) return { footprint: 1.3 }
  if (u.includes('/survival/')) return { height: 0.4 }
  return { footprint: 0.9 }
}
async function preloadAll() {
  const urls = allModelUrls(); let done = 0
  const setBar = () => { const p = Math.round((done / urls.length) * 100); barFill.style.width = p + '%'; loaderPct.textContent = p + '%' }
  setBar(); const q = urls.slice()
  async function worker() { while (q.length) { const u = q.shift(); const g = await loadGLB(u); if (g) { cache.set(u, normalize(g.scene, optsFor(u))); if (isChar(u) && g.animations?.length) charAnims.set(u, g.animations) } done++; setBar() } }
  await Promise.all(Array.from({ length: 12 }, worker))
}
const inst = (url) => { const t = cache.get(url); if (!t) return null; return isChar(url) ? skeletonClone(t) : t.clone(true) }
const lastPick = new Map()
function pickVaried(list, key = 'g') { const ok = (list || []).filter((u) => cache.has(u)); if (!ok.length) return null; if (ok.length === 1) return ok[0]; let u, t = 0; do { u = ok[Math.floor(rng() * ok.length)] } while (u === lastPick.get(key) && ++t < 5); lastPick.set(key, u); return u }

// ============================================================
//  Ocupacion + grupos
// ============================================================
const blocked = new Uint8Array(GRID * GRID)
const roadTile = new Uint8Array(GRID * GRID)
const cityGroup = new THREE.Group()      // props no-ocluyentes
const buildingsGroup = new THREE.Group() // edificios (para transparencia)
const occluders = []
for (let x = 0; x < GRID; x++) for (let z = COAST_Z; z < GRID; z++) blocked[idx(x, z)] = 1

function place(url, gx, gz, { rotY = 0, y = 0, block = false, jitter = 0, occ = false } = {}) {
  if (!url) return null
  const o = inst(url); if (!o) return null
  o.position.set(worldX(gx), y, worldZ(gz)); o.rotation.y = rotY + (jitter ? (rng() - 0.5) * jitter : 0)
  if (occ) { buildingsGroup.add(o); occluders.push(o) } else cityGroup.add(o)
  if (block && inGrid(gx, gz)) blocked[idx(gx, gz)] = 1
  return o
}
// version en coords de mundo (para piezas fuera de grilla)
function placeWorld(url, wx, wz, { rotY = 0, y = 0, occ = false } = {}) {
  if (!url) return null
  const o = inst(url); if (!o) return null
  o.position.set(wx, y, wz); o.rotation.y = rotY
  if (occ) { buildingsGroup.add(o); occluders.push(o) } else cityGroup.add(o)
  return o
}

// ============================================================
//  RED VIAL (autotiling) + veredas
// ============================================================
const STREETS_X = [7, 15, 23, 31, 39]
const STREETS_Z = [7, 15, 23, 31]
const isSX = (x) => STREETS_X.includes(x), isSZ = (z) => STREETS_Z.includes(z)
const isRoad = (x, z) => inGrid(x, z) && z < COAST_Z && (isSX(x) || isSZ(z))
const BASE = { straight: [[1, 0], [-1, 0]], bend: [[-1, 0], [0, 1]], tee: [[-1, 0], [1, 0], [0, 1]], end: [[0, 1]] }
const rotDir = ([dx, dz], k) => { for (let i = 0; i < k; i++)[dx, dz] = [dz, -dx]; return [dx, dz] }
function matchK(base, need) { for (let k = 0; k < 4; k++) { const set = new Set(BASE[base].map((d) => rotDir(d, k).join(','))); if (set.size === need.length && need.every((d) => set.has(d.join(',')))) return k } return 0 }
function roadPiece(nb) {
  const n = nb.length
  if (n >= 4) return { url: MODELS.road.crossroad, k: 0 }
  let base = n === 3 ? 'tee' : n === 2 ? ((nb[0][0] === -nb[1][0] && nb[0][1] === -nb[1][1]) ? 'straight' : 'bend') : n === 1 ? 'end' : 'straight'
  const map = { straight: MODELS.road.straight, bend: MODELS.road.bend, tee: MODELS.road.tee, end: MODELS.road.end }
  return { url: map[base], k: n === 0 ? 0 : matchK(base, nb) }
}
function buildRoads() {
  for (let x = 0; x < GRID; x++) for (let z = 0; z < COAST_Z; z++) {
    if (!isRoad(x, z)) continue
    roadTile[idx(x, z)] = 1
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => isRoad(x + dx, z + dz))
    const { url, k } = roadPiece(nb); place(url, x, z, { rotY: k * Math.PI / 2 })
  }
}

// ============================================================
//  PLANO / DISTRITOS
// ============================================================
// bandas de manzana entre calles (X: 6 cols, Z: 5 filas, ultima costera)
const BX = [[0, 6], [8, 14], [16, 22], [24, 30], [32, 38], [40, 45]]
const BZ = [[0, 6], [8, 14], [16, 22], [24, 30], [32, 37]]
const PLAN = [
  ['forest', 'resid', 'resid', 'resid', 'resid', 'cemetery'],
  ['resid', 'commercial', 'downtown', 'downtown', 'market', 'resid'],
  ['resid', 'commercial', 'downtown', 'plaza', 'commercial', 'resid'],
  ['resid', 'resid', 'industrial', 'industrial', 'resid', 'skate'],
  ['pirate', 'port', 'port', 'port', 'port', 'beach'],
]
const spawn = { x: 27, z: 20 } // plaza

// clasifica tiles de una manzana
function ring(x, z, lo, hi, lz, hz) {
  if (x === lo || x === hi || z === lz || z === hz) return 'sidewalk'
  if (x === lo + 1 || x === hi - 1 || z === lz + 1 || z === hz - 1) return 'front'
  return 'inner'
}
function faceOut(x, z, lo, hi, lz, hz) { const dl = x - lo, dr = hi - x, dt = z - lz, db = hz - z, m = Math.min(dl, dr, dt, db); if (m === dl) return Math.PI / 2; if (m === dr) return -Math.PI / 2; if (m === dt) return Math.PI; return 0 }

function fillBlock(bx, bz) {
  const [lo, hi] = BX[bx], [lz, hz] = BZ[bz], dist = PLAN[bz][bx]
  const green = { resid: 0x86b165, forest: 0x5f8f43, park: 0x7cb45a }[dist]
  if (green) groundPatch(lo + 1, hi - 1, lz + 1, hz - 1, green)
  if (dist === 'plaza') groundPatch(lo + 1, hi - 1, lz + 1, hz - 1, 0xb8b3a2)
  switch (dist) {
    case 'resid': fillResidential(lo, hi, lz, hz); break
    case 'forest': fillForest(lo, hi, lz, hz); break
    case 'downtown': fillPerimeter(lo, hi, lz, hz, MODELS.skyscraper, 'dt', 0.95, MODELS.commercial); break
    case 'commercial': fillPerimeter(lo, hi, lz, hz, MODELS.commercial, 'cm', 0.85); break
    case 'industrial': fillIndustrial(lo, hi, lz, hz); break
    case 'plaza': fillPlaza(lo, hi, lz, hz); break
    case 'market': fillMarket(lo, hi, lz, hz); break
    case 'skate': fillSkate(lo, hi, lz, hz); break
    case 'cemetery': fillCemetery(lo, hi, lz, hz); break
    case 'pirate': fillPirate(lo, hi, lz, hz); break
    case 'beach': fillBeach(lo, hi, lz, hz); break
  }
}

// edificios en el anillo "front" mirando a la calle; interior denso opcional
function fillPerimeter(lo, hi, lz, hz, pool, key, dens, innerPool) {
  for (let x = lo; x <= hi; x++) for (let z = lz; z <= hz; z++) {
    const r = ring(x, z, lo, hi, lz, hz)
    if (r === 'front') { if (rng() < dens) place(pickVaried(pool, key), x, z, { rotY: faceOut(x, z, lo, hi, lz, hz), block: true, jitter: 0.04, occ: true }) }
    else if (r === 'inner' && innerPool && rng() < 0.5) place(pickVaried(innerPool, key + 'i'), x, z, { block: true, occ: true })
  }
}

// residencial ORDENADO: hileras de casas mirando a la calle, patios atras
function fillResidential(lo, hi, lz, hz) {
  for (let x = lo; x <= hi; x++) for (let z = lz; z <= hz; z++) {
    const r = ring(x, z, lo, hi, lz, hz)
    if (r === 'front') {
      // hilera continua de casas (con algun hueco para entrada)
      if (rng() < 0.82) place(pickVaried(MODELS.house, 'res'), x, z, { rotY: faceOut(x, z, lo, hi, lz, hz), block: true, occ: true })
    } else if (r === 'inner') {
      if (rng() < 0.28) place(pickVaried(MODELS.suburbTree, 'rest'), x, z, { rotY: rng() * 6.28, block: true })
    }
  }
}

// bosque: arboles/rocas/plantas en grilla con jitter, con claro + campamento
function fillForest(lo, hi, lz, hz) {
  const cx = ((lo + hi) / 2) | 0, cz = ((lz + hz) / 2) | 0
  for (let x = lo + 1; x <= hi - 1; x++) for (let z = lz + 1; z <= hz - 1; z++) {
    if (Math.abs(x - cx) <= 1 && Math.abs(z - cz) <= 1) continue // claro central
    const r = rng()
    if (r < 0.6) place(pickVaried(MODELS.nature.tree, 'ft'), x, z, { rotY: rng() * 6.28, block: true })
    else if (r < 0.72) place(pickVaried(MODELS.nature.rock, 'fr'), x, z, { rotY: rng() * 6.28, block: true })
    else if (r < 0.85) place(pickVaried([...MODELS.nature.plant, ...MODELS.nature.mushroom, ...MODELS.nature.flower], 'fp'), x, z, { rotY: rng() * 6.28 })
  }
  // campamento en el claro (campfire-pit, carpa, cofre, leña)
  place(MODELS.survival.camp[0], cx, cz, { block: true })
  place(pickVaried(MODELS.survival.tent, 'tent'), cx - 1, cz - 1, { rotY: Math.PI / 4, block: true })
  place('assets/survival/chest.glb', cx + 1, cz, { block: true })
  place('assets/survival/resource-wood.glb', cx + 1, cz + 1, {})
}

// zona industrial ordenada
function fillIndustrial(lo, hi, lz, hz) {
  for (let x = lo; x <= hi; x++) for (let z = lz; z <= hz; z++) {
    const r = ring(x, z, lo, hi, lz, hz)
    if (r === 'front') { if (rng() < 0.8) place(pickVaried(MODELS.industrial, 'ind'), x, z, { rotY: faceOut(x, z, lo, hi, lz, hz), block: true, occ: true }) }
    else if (r === 'inner' && rng() < 0.3) place(pickVaried(MODELS.chimney, 'chi'), x, z, { block: true, occ: true })
  }
}

// ============================================================
//  Plaza central (diseño simetrico: fuente + cruces + bancos + estatuas)
// ============================================================
function buildFountain(wx, wz) {
  const grp = new THREE.Group()
  grp.add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.18, 28), new THREE.MeshStandardMaterial({ color: 0xc7ccd1, roughness: 0.9 })).translateY(0.09))
  grp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.16, 28), new THREE.MeshStandardMaterial({ color: 0x4aa3d8, roughness: 0.3 })).translateY(0.15))
  grp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xc7ccd1 })).translateY(0.45))
  grp.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true } })
  grp.position.set(wx, 0, wz); cityGroup.add(grp)
}
function fillPlaza(lo, hi, lz, hz) {
  const cx = (lo + hi) / 2, cz = (lz + hz) / 2
  buildFountain(worldX(cx), worldZ(cz))
  blocked[idx(Math.round(cx), Math.round(cz))] = 1
  // estatuas y arboles en las 4 esquinas del interior (simetrico)
  const corners = [[lo + 1, lz + 1], [hi - 1, lz + 1], [lo + 1, hz - 1], [hi - 1, hz - 1]]
  corners.forEach(([x, z], i) => { place(MODELS.nature.statue[i % MODELS.nature.statue.length], x, z, { block: true }); place(pickVaried(MODELS.nature.tree, 'pz'), x + (x < cx ? 1 : -1), z + (z < cz ? 1 : -1), { block: true }) })
  // bancos y flores a lo largo de los ejes N-S y E-O
  for (let d = 2; d <= (hi - lo) / 2; d++) {
    for (const [x, z] of [[cx - d, cz], [cx + d, cz], [cx, cz - d], [cx, cz + d]]) {
      const gx = Math.round(x), gz = Math.round(z)
      if (!inGrid(gx, gz)) continue
      if (d % 2 === 0) place(MODELS.graveyard.bench, gx, gz, { rotY: (z === cz ? Math.PI / 2 : 0), block: true })
      else place(pickVaried(MODELS.nature.flower, 'pf'), gx, gz, {})
    }
  }
}

// ============================================================
//  Minimarket (edificio con paredes, puerta y ventanilla) — se entra
// ============================================================
function fillMarket(lo, hi, lz, hz) {
  groundPatch(lo + 1, hi - 1, lz + 1, hz - 1, 0xb8b3a2)
  // rectangulo del local dentro de la manzana
  const x0 = lo + 1, x1 = hi - 1, z0 = lz + 1, z1 = hz - 1
  const doorX = Math.round((x0 + x1) / 2)      // puerta al frente (sur, z1)
  const winX = doorX + 1                         // ventanilla al lado
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const perim = x === x0 || x === x1 || z === z0 || z === z1
    // piso caminable en todo el local
    place(MODELS.market.floor, x, z, { y: 0.01 })
    if (perim) {
      const corner = (x === x0 || x === x1) && (z === z0 || z === z1)
      if (z === z1 && x === doorX) { place(MODELS.market.wallDoor, x, z, { rotY: 0, block: false }); continue } // puerta (caminable)
      if (z === z1 && x === winX) { place(MODELS.market.wallWindow, x, z, { rotY: 0, block: true }); continue } // ventanilla
      const rotY = z === z0 ? Math.PI : z === z1 ? 0 : x === x0 ? Math.PI / 2 : -Math.PI / 2
      place(corner ? MODELS.market.wallCorner : MODELS.market.wall, x, z, { rotY, block: true, occ: true })
    }
  }
  // interior ordenado: caja junto a la ventanilla, gondolas en hileras, heladeras al fondo
  place(MODELS.market.cash, winX, z1 - 1, { rotY: Math.PI, block: true })
  place(MODELS.market.employee, winX, z1 - 1.5 | 0, { rotY: 0 })
  for (let z = z0 + 1; z <= z1 - 2; z += 2)
    for (let x = x0 + 1; x <= x1 - 1; x++)
      place(pickVaried(MODELS.market.shelf, 'shf'), x, z, { rotY: Math.PI / 2, block: true })
  for (let x = x0 + 1; x <= x1 - 1; x++) place(MODELS.market.freezer, x, z0 + 1, { rotY: Math.PI, block: true })
  // carritos afuera
  place(MODELS.market.cart, doorX, z1 + 1, { rotY: rng() * 6.28 })
}

// ============================================================
//  Skate ORDENADO (layout fijo: half-pipe, riel, bowl, cajon, bancos, reja)
// ============================================================
function fillSkate(lo, hi, lz, hz) {
  groundPatch(lo, hi, lz, hz, 0x9a9a90)
  const x0 = lo + 1, x1 = hi - 1, z0 = lz + 1, z1 = hz - 1
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) place(MODELS.skate.floor, x, z, { y: 0.01 })
  // reja perimetral con entrada
  for (let x = lo; x <= hi; x++) { if (x !== (lo + hi) / 2 | 0) { place(MODELS.graveyard.fence, x, lz, { rotY: Math.PI / 2, block: true }); place(MODELS.graveyard.fence, x, hz, { rotY: Math.PI / 2, block: true }) } }
  // half-pipe a la izquierda
  place(MODELS.skate.halfpipe, x0, (z0 + z1) / 2 | 0, { rotY: Math.PI / 2, block: true })
  place(MODELS.skate.halfpipe, x0, ((z0 + z1) / 2 | 0) + 1, { rotY: Math.PI / 2, block: true })
  // hilera de rieles al centro
  for (let z = z0; z <= z1; z += 2) place(pickVaried(MODELS.skate.rail, 'srail'), (x0 + x1) / 2 | 0, z, { rotY: 0, block: true })
  // bowl / cajon a la derecha
  place(MODELS.skate.bowl, x1, z0, { block: true })
  place(pickVaried(MODELS.skate.obstacle, 'sob'), x1, z1, { block: true })
  place(MODELS.skate.steps, x1 - 1, z1, { rotY: Math.PI, block: true })
}

// ============================================================
//  Cementerio ordenado (hileras de lapidas + criptas + reja + porton)
// ============================================================
function fillCemetery(lo, hi, lz, hz) {
  const cxDoor = (lo + hi) / 2 | 0
  for (let x = lo; x <= hi; x++) for (let z = lz; z <= hz; z++) {
    const edge = x === lo || x === hi || z === lz || z === hz
    if (edge) { if (z === hz && x === cxDoor) place(MODELS.graveyard.gate, x, z, { rotY: 0 }); else place(MODELS.graveyard.fence, x, z, { rotY: (z === lz || z === hz) ? Math.PI / 2 : 0, block: true }); continue }
    // criptas en la fila de arriba, lapidas en hileras ordenadas
    if (z === lz + 1) { if ((x - lo) % 2 === 0) place(pickVaried(MODELS.graveyard.crypt, 'cry'), x, z, { rotY: Math.PI, block: true }) }
    else if ((z - lz) % 2 === 0 && (x - lo) % 1 === 0) place(pickVaried(MODELS.graveyard.props, 'grv'), x, z, { rotY: Math.PI, block: true })
    else if (x === lo + 1 || x === hi - 1) place(MODELS.graveyard.tree, x, z, { block: true })
  }
}

// ============================================================
//  Costa: puerto (industrial), caleta pirata, playa — con barcos moviles
// ============================================================
const watercraft = []
function moveCraft(o, vx, vz, wrap) { watercraft.push({ o, vx, vz, wrap }) }
function buildDock(px, fromZ, len, small) {
  for (let d = 0; d < len; d++) {
    const gz = fromZ + d
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.02), new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 1 }))
    plank.position.set(worldX(px), -0.02, worldZ(gz)); plank.castShadow = plank.receiveShadow = true; cityGroup.add(plank)
    if (inGrid(px, gz)) blocked[idx(px, gz)] = 0
  }
}
function fillPort(lo, hi, lz, hz) {
  const promZ = COAST_Z - 1
  for (let x = lo; x <= hi; x++) {
    if (rng() < 0.18) { const st = 1 + Math.floor(rng() * 2); for (let s = 0; s < st; s++) place(pickVaried(MODELS.port.container, 'cont'), x, promZ, { y: s * 0.42, rotY: rng() < 0.5 ? 0 : Math.PI / 2, block: s === 0, occ: s === 0 }) }
    else if (rng() < 0.1) place(pickVaried(MODELS.port.pile, 'pil'), x, promZ, { block: true })
  }
  const px = (lo + hi) / 2 | 0
  buildDock(px, COAST_Z, 4)
  // barcos moviles
  const s1 = placeWorld(MODELS.port.ships[0], worldX(lo), worldZ(GRID + 4), { y: -0.15, rotY: Math.PI / 2 }); if (s1) moveCraft(s1, 0.5, 0)
  const b1 = placeWorld(pickVaried(MODELS.port.boats, 'pb'), worldX(px + 2), worldZ(COAST_Z + 2), { y: -0.12, rotY: -Math.PI / 2 }); if (b1) moveCraft(b1, -0.35, 0)
  for (let i = 0; i < 4; i++) place(pickVaried(MODELS.port.buoy, 'bu'), lo + 1 + i * 2, COAST_Z + 3, { y: -0.08 })
}
function fillPirate(lo, hi, lz, hz) {
  groundPatch(lo, hi, lz, COAST_Z - 1, 0xd8c98f) // arena
  for (let x = lo; x <= hi; x++) for (let z = lz; z <= COAST_Z - 1; z++) {
    const r = rng()
    if ((x === lo + 1 || x === hi - 1) && z === lz + 1) place(pickVaried(MODELS.pirate.palm, 'pal'), x, z, { rotY: rng() * 6.28, block: true })
    else if (r < 0.12) place(pickVaried(MODELS.pirate.prop, 'pir'), x, z, { rotY: rng() * 6.28, block: true })
    else if (r < 0.2) place(pickVaried(MODELS.pirate.sand, 'psa'), x, z, {})
  }
  place(MODELS.pirate.tower, lo + 1, lz + 1, { block: true, occ: true })
  place(MODELS.pirate.flag[0], hi - 1, lz + 1, { block: true })
  place(pickVaried(MODELS.pirate.prop.slice(0, 3), 'pbar'), (lo + hi) / 2 | 0, lz + 2, { block: true })
  // muelle + barco pirata movil
  const px = (lo + hi) / 2 | 0
  buildDock(px, COAST_Z, 3)
  const ship = placeWorld(MODELS.pirate.ship[2], worldX(px + 2), worldZ(GRID + 3), { y: -0.15, rotY: Math.PI / 2 }); if (ship) moveCraft(ship, 0.4, 0)
  const boat = placeWorld(pickVaried(MODELS.pirate.ship.slice(3), 'ps'), worldX(px - 2), worldZ(COAST_Z + 2), { y: -0.12, rotY: Math.PI / 2 }); if (boat) moveCraft(boat, 0.3, 0)
}
function fillBeach(lo, hi, lz, hz) {
  groundPatch(lo, hi, lz, COAST_Z - 1, 0xe4d6a0)
  for (let x = lo; x <= hi; x++) for (let z = lz; z <= COAST_Z - 1; z++) {
    const r = rng()
    if (r < 0.1) place(pickVaried(MODELS.pirate.palm, 'bpal'), x, z, { rotY: rng() * 6.28, block: true })
    else if (r < 0.16) place(pickVaried(MODELS.pirate.sand, 'bsa'), x, z, {})
  }
  const boat = placeWorld(pickVaried(MODELS.port.boats, 'bb'), worldX((lo + hi) / 2 | 0), worldZ(COAST_Z + 3), { y: -0.12, rotY: Math.PI / 2 }); if (boat) moveCraft(boat, 0.28, 0)
}
function updateWatercraft(dt) {
  const lim = HALF + 26
  for (const c of watercraft) {
    c.o.position.x += c.vx * dt; c.o.position.z += c.vz * dt
    if (c.o.position.x > lim) c.o.position.x = -lim
    if (c.o.position.x < -lim) c.o.position.x = lim
  }
}

// ============================================================
//  Autos (recorren la grilla vial)
// ============================================================
const cars = []
const DIRV = [[1, 0], [0, 1], [-1, 0], [0, -1]]
const rOff = ([dx, dz]) => [-dz * 0.22, dx * 0.22]
function spawnCars(n) {
  const cells = []; for (let x = 0; x < GRID; x++) for (let z = 0; z < COAST_Z; z++) if (roadTile[idx(x, z)]) cells.push([x, z])
  for (let i = 0; i < n; i++) {
    const [x, z] = cells[Math.floor(rng() * cells.length)]
    const dirs = [0, 1, 2, 3].filter((d) => isRoad(x + DIRV[d][0], z + DIRV[d][1])); if (!dirs.length) continue
    const d = dirs[Math.floor(rng() * dirs.length)], o = inst(pickVaried(MODELS.car, 'car')); if (!o) continue
    cityGroup.add(o); cars.push({ o, dir: d, t: 0, from: { x, z }, to: { x: x + DIRV[d][0], z: z + DIRV[d][1] }, spd: 1.8 + rng() * 1.4 })
  }
}
function nextDir(c) { const { x, z } = c.to, back = (c.dir + 2) % 4; const opts = [0, 1, 2, 3].filter((d) => d !== back && isRoad(x + DIRV[d][0], z + DIRV[d][1])); let d = (opts.includes(c.dir) && rng() < 0.72) ? c.dir : opts.length ? opts[Math.floor(rng() * opts.length)] : back; c.dir = d; c.from = { x, z }; c.to = { x: x + DIRV[d][0], z: z + DIRV[d][1] }; c.t = 0 }
function updateCars(dt) {
  for (const c of cars) {
    c.t += c.spd * dt / TILE; while (c.t >= 1) { c.t -= 1; nextDir(c) }
    const [ox, oz] = rOff(DIRV[c.dir])
    c.o.position.set(worldX(c.from.x) + (worldX(c.to.x) - worldX(c.from.x)) * c.t + ox, ROAD_TOP, worldZ(c.from.z) + (worldZ(c.to.z) - worldZ(c.from.z)) * c.t + oz)
    c.o.rotation.y = Math.atan2(DIRV[c.dir][0], DIRV[c.dir][1])
  }
}

// ============================================================
//  Transparencia de edificios que tapan al jugador
// ============================================================
const occRay = new THREE.Raycaster()
const faded = new Set()
function setFade(mesh, on) {
  if (on) {
    if (!mesh.userData.fadeMat) { mesh.userData.origMat = mesh.material; const f = mesh.material.clone(); f.transparent = true; f.opacity = 0.22; f.depthWrite = false; mesh.userData.fadeMat = f }
    mesh.material = mesh.userData.fadeMat
  } else if (mesh.userData.origMat) mesh.material = mesh.userData.origMat
}
let occTick = 0
function updateOcclusion() {
  if (!character) return
  if ((occTick++ % 2) !== 0) return // cada 2 frames
  const target = character.position.clone(); target.y += 0.35
  const from = camera.position.clone()
  const dir = target.clone().sub(from); const dist = dir.length(); dir.normalize()
  occRay.set(from, dir); occRay.far = dist - 0.4
  const hits = occRay.intersectObjects(occluders, true)
  const now = new Set()
  for (const h of hits) { let m = h.object; if (m.isMesh) { setFade(m, true); faded.add(m); now.add(m) } }
  for (const m of faded) if (!now.has(m)) { setFade(m, false); faded.delete(m) }
}

// ============================================================
//  Personaje: WASD + click-to-move + animacion
// ============================================================
const CHAR_Y = ROAD_TOP
let character = null, avatarRing = null
let charTile = { ...spawn }
let path = [], moveTarget = null
const SPEED = 3.6
const tileCenter = (x, z) => new THREE.Vector3(worldX(x), CHAR_Y, worldZ(z))
const worldToTile = (p) => ({ x: Math.round((p.x + HALF - TILE / 2) / TILE), z: Math.round((p.z + HALF - TILE / 2) / TILE) })
const walkableWorld = (wx, wz) => { const t = worldToTile({ x: wx, z: wz }); return inGrid(t.x, t.z) && !blocked[idx(t.x, t.z)] }
function nearestWalkable(x, z) { if (inGrid(x, z) && !blocked[idx(x, z)]) return { x, z }; for (let r = 1; r < GRID; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; const nx = x + dx, nz = z + dz; if (inGrid(nx, nz) && !blocked[idx(nx, nz)]) return { x: nx, z: nz } } return { x, z } }
function findPath(start, goal) {
  if (blocked[idx(goal.x, goal.z)]) return []
  const key = (a) => idx(a.x, a.z), open = [start], came = new Map(), gs = new Map([[key(start), 0]]), h = (a) => Math.abs(a.x - goal.x) + Math.abs(a.z - goal.z), fs = new Map([[key(start), h(start)]])
  let guard = 0
  while (open.length && guard++ < 40000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if ((fs.get(key(open[i])) ?? 1e9) < (fs.get(key(open[bi])) ?? 1e9)) bi = i
    const cur = open.splice(bi, 1)[0]
    if (cur.x === goal.x && cur.z === goal.z) { const out = []; let c = cur, k = key(c); while (came.has(k)) { out.unshift(c); c = came.get(k); k = key(c) } return out }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cur.x + dx, nz = cur.z + dz; if (!inGrid(nx, nz) || blocked[idx(nx, nz)]) continue; const nk = idx(nx, nz), tg = (gs.get(key(cur)) ?? 1e9) + 1; if (tg < (gs.get(nk) ?? 1e9)) { came.set(nk, cur); gs.set(nk, tg); fs.set(nk, tg + h({ x: nx, z: nz })); if (!open.some((o) => idx(o.x, o.z) === nk)) open.push({ x: nx, z: nz }) } }
  }
  return []
}
let mixer = null, actions = {}, curAction = null
function playAction(n) { const nx = actions[n]; if (!nx || nx === curAction) return; nx.reset().fadeIn(0.15).play(); if (curAction) curAction.fadeOut(0.15); curAction = nx }
function spawnCharacter() {
  const s = nearestWalkable(charTile.x, charTile.z); charTile = s
  const url = pickVaried(MODELS.character, 'char'); character = url ? inst(url) : null
  if (!character) { character = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.24, 4, 8), new THREE.MeshStandardMaterial({ color: 0x2f6fd0 })); character.castShadow = true }
  else if (charAnims.has(url)) { mixer = new THREE.AnimationMixer(character); const cl = charAnims.get(url); for (const n of ['idle', 'walk']) { const c = THREE.AnimationClip.findByName(cl, n); if (c) actions[n] = mixer.clipAction(c) } playAction('idle') }
  character.position.copy(tileCenter(s.x, s.z)); scene.add(character)
  avatarRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 28), new THREE.MeshBasicMaterial({ color: 0x66c2ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }))
  avatarRing.rotation.x = -Math.PI / 2; scene.add(avatarRing)
  controls.target.copy(character.position).setY(0.5); controls.update()
}
// camara: follow con zona muerta (no se mueve por cambios chicos)
const camTmp = new THREE.Vector3()
function updateCameraFollow() {
  if (!character) return
  camTmp.set(character.position.x, 0.5, character.position.z)
  const d = Math.hypot(controls.target.x - camTmp.x, controls.target.z - camTmp.z)
  if (d > 1.4) controls.target.lerp(camTmp, 0.06)
}

const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.26, 24), new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }))
marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker)
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2()
function moveTo(cxp, cyp) {
  ndc.x = (cxp / window.innerWidth) * 2 - 1; ndc.y = -(cyp / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(ndc, camera)
  const hit = raycaster.intersectObjects([land, water])[0]; if (!hit) return
  let t = worldToTile(hit.point); if (!inGrid(t.x, t.z)) return
  t = nearestWalkable(t.x, t.z); const p = findPath(charTile, t)
  if (p.length) { path = p; moveTarget = null; marker.position.copy(tileCenter(t.x, t.z)).setY(0.05); marker.visible = true }
}
let downX = 0, downY = 0, downT = 0
canvas.addEventListener('pointerdown', (e) => { if (e.button === 0) { downX = e.clientX; downY = e.clientY; downT = performance.now() } })
canvas.addEventListener('pointerup', (e) => { if (e.button === 0 && Math.hypot(e.clientX - downX, e.clientY - downY) < 8 && performance.now() - downT < 500) moveTo(e.clientX, e.clientY) })

// teclado WASD / flechas (relativo a la camara)
const keys = {}
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true })
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false })
const fwd = new THREE.Vector3(), rightv = new THREE.Vector3(), moveV = new THREE.Vector3()
function keyboardMove(dt) {
  const up = keys['w'] || keys['arrowup'], dn = keys['s'] || keys['arrowdown'], lf = keys['a'] || keys['arrowleft'], rt = keys['d'] || keys['arrowright']
  if (!(up || dn || lf || rt)) return false
  path = []; moveTarget = null; marker.visible = false
  // direcciones en el plano segun la camara
  fwd.subVectors(controls.target, camera.position); fwd.y = 0; fwd.normalize()
  rightv.set(fwd.z, 0, -fwd.x)
  moveV.set(0, 0, 0)
  if (up) moveV.add(fwd); if (dn) moveV.sub(fwd); if (rt) moveV.add(rightv); if (lf) moveV.sub(rightv)
  if (moveV.lengthSq() === 0) return false
  moveV.normalize()
  const step = SPEED * dt, p = character.position
  const nx = p.x + moveV.x * step, nz = p.z + moveV.z * step
  if (walkableWorld(nx, p.z)) p.x = nx
  if (walkableWorld(p.x, nz)) p.z = nz
  charTile = worldToTile(p)
  character.rotation.y = Math.atan2(moveV.x, moveV.z)
  playAction('walk')
  return true
}
function updateCharacter(dt) {
  if (!character) return
  if (keyboardMove(dt)) { if (avatarRing) avatarRing.position.set(character.position.x, 0.04, character.position.z); return }
  if (!moveTarget && path.length) { const n = path.shift(); moveTarget = tileCenter(n.x, n.z); charTile = n }
  if (moveTarget) {
    const dir = new THREE.Vector3().subVectors(moveTarget, character.position); dir.y = 0; const d = dir.length()
    if (d < 0.02) { character.position.copy(moveTarget); moveTarget = null; if (!path.length) { marker.visible = false; playAction('idle') } }
    else { dir.normalize(); character.position.addScaledVector(dir, Math.min(SPEED * dt, d)); character.rotation.y = Math.atan2(dir.x, dir.z); playAction('walk') }
  } else if (!path.length) playAction('idle')
  if (avatarRing) avatarRing.position.set(character.position.x, 0.04, character.position.z)
}

// ---------- HUD ----------
function buildHud() {
  const skills = [{ name: 'Combat', emoji: '⚔️' }, { name: 'Wood', emoji: '🪓' }, { name: 'Mining', emoji: '⛏️' }, { name: 'Fishing', emoji: '🎣' }, { name: 'Cooking', emoji: '🍳' }]
  const wrap = document.getElementById('hudSkills'), btn = 'assets/ui/blue/button_square_depth_gloss.png'
  skills.forEach((s) => { const b = document.createElement('button'); b.className = 'skill'; b.style.backgroundImage = `url("${btn}")`; b.innerHTML = `<span class="emoji">${s.emoji}</span><span>${s.name}</span>`; wrap.appendChild(b) })
  const help = document.querySelector('.hud-help'); if (help) help.innerHTML = '<b>WASD</b> o <b>click</b> para caminar · <b>botón derecho</b> arrastra para rotar · rueda: zoom'
}

// ============================================================
//  Arranque
// ============================================================
let started = false
function showScene() { if (started) return; started = true; loaderEl.classList.add('hidden'); document.getElementById('hud').classList.remove('hidden') }
async function start() {
  buildHud()
  const wd = setTimeout(() => { if (!started) { loaderErr.textContent = 'Carga lenta…'; buildAndShow() } }, 25000)
  try { await preloadAll() } catch (e) { console.error(e); loaderErr.textContent = 'Error: ' + (e?.message || e) }
  clearTimeout(wd); buildAndShow()
}
let built = false
function buildAndShow() {
  if (built) return; built = true
  try {
    buildRoads()
    for (let bz = 0; bz < BZ.length; bz++) for (let bx = 0; bx < BX.length; bx++) fillBlock(bx, bz)
    spawnCars(28)
    scene.add(cityGroup, buildingsGroup)
    spawnCharacter()
  } catch (e) { console.error(e); loaderErr.textContent = 'Error armando: ' + (e?.message || e) }
  if (failed.length) console.warn('No cargaron:', failed)
  window.__kintana = {
    charPos: () => (character ? character.position.toArray().map((n) => +n.toFixed(2)) : null),
    moveToClient: (x, y) => moveTo(x, y), tick: (dt) => { if (mixer) mixer.update(dt); updateCharacter(dt); updateCars(dt); updateWatercraft(dt); updateOcclusion() },
    key: (k, v) => { keys[k] = v }, failed, blocked: blocked.reduce((a, b) => a + b, 0),
    zoom: (z) => { camera.zoom = z; camera.updateProjectionMatrix() },
    topdown: () => { controls.maxPolarAngle = Math.PI; camera.position.set(0, 90, 0.01); controls.target.set(0, 0, -2); camera.zoom = 0.6; camera.updateProjectionMatrix(); controls.update() },
    state: () => ({ pathLen: path.length, charTile: { ...charTile } }),
    warp: (tx, tz) => { const s = nearestWalkable(tx, tz); character.position.copy(tileCenter(s.x, s.z)); charTile = s; controls.target.set(worldX(s.x), 0.5, worldZ(s.z)); controls.update() },
    fadedCount: () => faded.size,
  }
  showScene(); if (!raf) animate()
}
let raf = 0, last = performance.now()
function animate() {
  raf = requestAnimationFrame(animate)
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now
  if (mixer) mixer.update(dt)
  updateCharacter(dt); updateCars(dt); updateWatercraft(dt); updateOcclusion(); updateCameraFollow(); controls.update()
  renderer.render(scene, camera)
}
window.addEventListener('resize', () => { setCameraFrustum(); renderer.setSize(window.innerWidth, window.innerHeight) })
start()
