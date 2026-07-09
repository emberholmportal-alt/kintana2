import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { MODELS, allModelUrls } from './assets.js'

// ============================================================
//  KINTANA2 — mundo prototipo con multi-mundo + portales
//  Ciudad (inicio) -> mundo Pirata (por el puerto) -> mundo Fantasy.
//  Movimiento WASD + click, cámara con botón derecho, edificios
//  que tapan al jugador se transparentan. Assets: Kenney (CC0).
// ============================================================

const TILE = 1, ROAD_TOP = 0.02, CHAR_H = 0.6
let GRID = 44, HALF = GRID / 2, COAST_Z = 30
function makeRng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
let rng = makeRng(7)

// ---------- Engine ----------
const canvas = document.getElementById('scene')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9fd3ef); scene.fog = new THREE.Fog(0x9fd3ef, 60, 150)
let viewSize = 13
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 320)
function setFrustum() { const a = window.innerWidth / window.innerHeight; camera.left = -viewSize * a; camera.right = viewSize * a; camera.top = viewSize; camera.bottom = -viewSize; camera.updateProjectionMatrix() }
setFrustum(); camera.position.set(40, 40, 40)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true; controls.dampingFactor = 0.1; controls.target.set(0, 1, 0)
controls.minZoom = 0.6; controls.maxZoom = 8; controls.maxPolarAngle = Math.PI / 2.2; controls.enablePan = false
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE }; controls.update()
scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x8a8f7a, 0.95))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.5); sun.position.set(30, 46, 24); sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.near = 1; sun.shadow.camera.far = 170
scene.add(sun, sun.target)

// ---------- Loader / assets ----------
const loaderEl = document.getElementById('loader'), barFill = document.getElementById('barFill'), loaderPct = document.getElementById('loaderPct'), loaderErr = document.getElementById('loaderErr')
const gltfLoader = new GLTFLoader(); const cache = new Map(), charAnims = new Map(), failed = []
const isChar = (u) => u.includes('character') || u.includes('/dungeon/character')
function loadGLB(url) { return new Promise((res) => gltfLoader.load(url, (g) => res(g), undefined, () => { failed.push(url); res(null) })) }
function normalize(obj, o = {}) {
  obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true } })
  const box = new THREE.Box3().setFromObject(obj), size = new THREE.Vector3(), center = new THREE.Vector3(); box.getSize(size); box.getCenter(center)
  let s = 1
  if (o.scale) s = o.scale; else if (o.footprint) s = o.footprint / Math.max(size.x, size.z); else if (o.length) s = o.length / Math.max(size.x, size.z)
  else if (o.height) { s = o.height / size.y; if (o.maxFootprint) s = Math.min(s, o.maxFootprint / Math.max(size.x, size.z)) }
  const w = new THREE.Group(); obj.scale.setScalar(s); obj.position.set(-center.x * s, -box.min.y * s, -center.z * s); w.add(obj); w.userData.h = size.y * s; return w
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
  if (u.includes('/suburban/')) return { height: 1.15, maxFootprint: 1.4 }
  if (u.includes('/market/floor') || u.includes('/market/wall') || u.includes('/arcade/floor') || u.includes('/arcade/wall')) return { footprint: 1.0 }
  if (u.includes('/market/') || u.includes('/arcade/')) return { height: 0.5 }
  if (u.includes('/skate/floor')) return { footprint: 1.0 }
  if (u.includes('half-pipe') || u.includes('/skate/bowl') || u.includes('/skate/structure')) return { footprint: 1.0 }
  if (u.includes('/skate/')) return { height: 0.4 }
  if (u.includes('/graveyard/pine')) return { height: 1.2 }
  if (u.includes('/graveyard/crypt')) return { footprint: 0.9 }
  if (u.includes('/graveyard/iron-fence') || u.includes('/graveyard/fence')) return { footprint: 0.9 }
  if (u.includes('/graveyard/lantern')) return { height: 0.6 }
  if (u.includes('/graveyard/bench')) return { footprint: 0.55 }
  if (u.includes('/graveyard/')) return { height: 0.5 }
  if (u.includes('ship-ocean-liner')) return { length: 9 }
  if (u.includes('ship-cargo')) return { length: 6 }
  if (u.includes('/port/boat')) return { length: 1.7 }
  if (u.includes('cargo-container')) return { length: 1.1 }
  if (u.includes('cargo-pile')) return { footprint: 1.1 }
  if (u.includes('/port/buoy')) return { height: 0.5 }
  if (u.includes('/nature/tree')) return { height: (u.includes('Tall') ? 1.9 : (u.includes('Small') || u.includes('small')) ? 1.0 : 1.5), maxFootprint: 1.3 }
  if (u.includes('/nature/rock')) return { footprint: u.includes('large') ? 1.1 : 0.6 }
  if (u.includes('/nature/statue')) return { height: 1.3 }
  if (u.includes('/nature/stump') || u.includes('/nature/log')) return { footprint: 0.6 }
  if (u.includes('/nature/')) return { height: 0.35 }
  if (u.includes('ship-pirate-large') || u.includes('/pirate/ship-large')) return { length: 6 }
  if (u.includes('ship-pirate-medium') || u.includes('/pirate/ship-medium')) return { length: 4.5 }
  if (u.includes('/pirate/ship')) return { length: 3 }
  if (u.includes('/pirate/palm')) return { height: 1.9 }
  if (u.includes('/pirate/tower')) return { height: 2.6 }
  if (u.includes('/pirate/flag')) return { height: 1.3 }
  if (u.includes('/pirate/structure') || u.includes('/pirate/platform') || u.includes('/pirate/patch') || u.includes('grass-patch')) return { footprint: 1.0 }
  if (u.includes('/pirate/rocks')) return { footprint: 0.7 }
  if (u.includes('/pirate/cannon')) return { footprint: 0.6 }
  if (u.includes('/pirate/')) return { height: 0.45 }
  if (u.includes('/survival/rock')) return { footprint: 0.6 }
  if (u.includes('/survival/grass')) return { footprint: 0.7 }
  if (u.includes('/survival/structure-canvas')) return { footprint: 1.3 }
  if (u.includes('/survival/')) return { height: 0.4 }
  // fantasy
  if (u.includes('fountain')) return { footprint: 1.6 }
  if (u.includes('/fantasy/hedge')) return { footprint: 1.0 }
  if (u.includes('/fantasy/wall') || u.includes('/fantasy/roof')) return { footprint: 1.0 }
  if (u.includes('/fantasy/cart')) return { footprint: 1.0 }
  if (u.includes('/fantasy/pillar') || u.includes('/fantasy/lantern') || u.includes('/fantasy/banner')) return { height: 1.1 }
  if (u.includes('/fantasy/fence')) return { footprint: 0.9 }
  if (u.includes('/fantasy/chimney')) return { height: 0.6 }
  // castle
  if (u.includes('/castle/tower')) return { footprint: 1.6 }
  if (u.includes('/castle/wall') || u.includes('/castle/gate')) return { footprint: 1.0 }
  if (u.includes('/castle/flag')) return { height: 1.6 }
  if (u.includes('/castle/bridge') || u.includes('/castle/stairs')) return { footprint: 1.0 }
  if (u.includes('/castle/rocks')) return { footprint: 0.9 }
  // dungeon
  if (u.includes('/dungeon/floor') || u.includes('/dungeon/wall') || u.includes('/dungeon/gate')) return { footprint: 1.0 }
  if (u.includes('/dungeon/character')) return { height: CHAR_H }
  if (u.includes('/dungeon/')) return { height: 0.45 }
  return { footprint: 0.9 }
}
async function preloadAll() {
  const urls = allModelUrls(); let done = 0
  const setBar = () => { const p = Math.round((done / urls.length) * 100); barFill.style.width = p + '%'; loaderPct.textContent = p + '%' }
  setBar(); const q = urls.slice()
  async function worker() { while (q.length) { const u = q.shift(); const g = await loadGLB(u); if (g) { cache.set(u, normalize(g.scene, optsFor(u))); if (isChar(u) && g.animations?.length) charAnims.set(u, g.animations) } done++; setBar() } }
  await Promise.all(Array.from({ length: 14 }, worker))
}
const inst = (url) => { const t = cache.get(url); if (!t) return null; return isChar(url) ? skeletonClone(t) : t.clone(true) }
const lastPick = new Map()
function pick(list, key = 'g') { const ok = (list || []).filter((u) => cache.has(u)); if (!ok.length) return null; if (ok.length === 1) return ok[0]; let u, t = 0; do { u = ok[Math.floor(rng() * ok.length)] } while (u === lastPick.get(key) && ++t < 5); lastPick.set(key, u); return u }

// ============================================================
//  Estado de mundo
// ============================================================
let blocked, roadTile
let worldGroup = null
const occluders = [], cars = [], watercraft = [], portals = [], groundMeshes = []
let currentWorld = 'city'
const worldX = (gx) => gx * TILE - HALF + TILE / 2
const worldZ = (gz) => gz * TILE - HALF + TILE / 2
const idx = (x, z) => z * GRID + x
const inGrid = (x, z) => x >= 0 && z >= 0 && x < GRID && z < GRID
const worldToTile = (p) => ({ x: Math.round((p.x + HALF - TILE / 2) / TILE), z: Math.round((p.z + HALF - TILE / 2) / TILE) })

function resetWorld(size, seed) {
  GRID = size; HALF = GRID / 2; rng = makeRng(seed)
  blocked = new Uint8Array(GRID * GRID); roadTile = new Uint8Array(GRID * GRID)
  occluders.length = 0; cars.length = 0; watercraft.length = 0; portals.length = 0; groundMeshes.length = 0; lastPick.clear()
  for (const m of faded) if (m.userData.origMat) m.material = m.userData.origMat; faded.clear()
  if (worldGroup) scene.remove(worldGroup)
  worldGroup = new THREE.Group(); scene.add(worldGroup)
  const S = HALF + 16; Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S }); sun.shadow.camera.updateProjectionMatrix?.()
}
function place(url, gx, gz, { rotY = 0, y = 0, block = false, jitter = 0, occ = false } = {}) {
  if (!url) return null; const o = inst(url); if (!o) return null
  o.position.set(worldX(gx), y, worldZ(gz)); o.rotation.y = rotY + (jitter ? (rng() - 0.5) * jitter : 0)
  worldGroup.add(o); if (occ) occluders.push(o); if (block && inGrid(gx, gz)) blocked[idx(gx, gz)] = 1; return o
}
function placeW(url, wx, wz, { rotY = 0, y = 0, occ = false } = {}) { if (!url) return null; const o = inst(url); if (!o) return null; o.position.set(wx, y, wz); o.rotation.y = rotY; worldGroup.add(o); if (occ) occluders.push(o); return o }
function groundPatch(x0, x1, z0, z1, color, y = 0, pickable = false) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry((x1 - x0 + 1) * TILE, (z1 - z0 + 1) * TILE), new THREE.MeshStandardMaterial({ color, roughness: 1 }))
  m.rotation.x = -Math.PI / 2; m.position.set((worldX(x0) + worldX(x1)) / 2, y, (worldZ(z0) + worldZ(z1)) / 2); m.receiveShadow = true; worldGroup.add(m); if (pickable) groundMeshes.push(m); return m
}
function bigPlane(size, color, y, pickable) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color, roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; worldGroup.add(m); if (pickable) groundMeshes.push(m); return m }

// portal (pad brillante); al pisarlo se viaja
function addPortal(gx, gz, to, color) {
  const g = new THREE.Group()
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 24), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.4 })); pad.position.y = 0.05
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 12, 28), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 1.2 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.5
  g.add(pad, ring); g.position.set(worldX(gx), 0, worldZ(gz)); worldGroup.add(g)
  portals.push({ x: gx, z: gz, to, ring })
  if (inGrid(gx, gz)) blocked[idx(gx, gz)] = 0
}

// ============================================================
//  Autotiling de calles (compartido)
// ============================================================
const BASE = { straight: [[1, 0], [-1, 0]], bend: [[-1, 0], [0, 1]], tee: [[-1, 0], [1, 0], [0, 1]], end: [[0, 1]] }
const rotDir = ([dx, dz], k) => { for (let i = 0; i < k; i++)[dx, dz] = [dz, -dx]; return [dx, dz] }
function matchK(base, need) { for (let k = 0; k < 4; k++) { const set = new Set(BASE[base].map((d) => rotDir(d, k).join(','))); if (set.size === need.length && need.every((d) => set.has(d.join(',')))) return k } return 0 }
function roadPiece(nb) { const n = nb.length; if (n >= 4) return { url: MODELS.road.crossroad, k: 0 }; let base = n === 3 ? 'tee' : n === 2 ? ((nb[0][0] === -nb[1][0] && nb[0][1] === -nb[1][1]) ? 'straight' : 'bend') : n === 1 ? 'end' : 'straight'; const map = { straight: MODELS.road.straight, bend: MODELS.road.bend, tee: MODELS.road.tee, end: MODELS.road.end }; return { url: map[base], k: n === 0 ? 0 : matchK(base, nb) } }

// ============================================================
//  MUNDO: CIUDAD  (avenidas 2 tiles, manzanas grandes y abiertas)
// ============================================================
const AVX = new Set([6, 7, 17, 18, 28, 29, 39, 40])
const AVZ = new Set([6, 7, 17, 18, 28, 29])
function buildCity() {
  resetWorld(44, 7); COAST_Z = 30; currentWorld = 'city'
  scene.background.set(0x9fd3ef)
  // agua alrededor (bordes) + isla
  bigPlane(360, 0x3a9ad0, -0.22, true)
  const landS = worldZ(COAST_Z) - 0.5
  const lm = new THREE.Mesh(new THREE.PlaneGeometry(GRID + 2, landS - (worldZ(0) - 1)), new THREE.MeshStandardMaterial({ color: 0x9a9a90, roughness: 1 }))
  lm.rotation.x = -Math.PI / 2; lm.position.set(0, -0.01, (worldZ(0) - 1 + landS) / 2); lm.receiveShadow = true; worldGroup.add(lm); groundMeshes.push(lm)
  const isRoad = (x, z) => inGrid(x, z) && z < COAST_Z && (AVX.has(x) || AVZ.has(z))
  // avenidas 2-wide (deterministico)
  for (let x = 0; x < GRID; x++) for (let z = 0; z < COAST_Z; z++) {
    if (!isRoad(x, z)) continue; roadTile[idx(x, z)] = 1
    const cx = AVX.has(x), cz = AVZ.has(z)
    if (cx && cz) place(MODELS.road.crossroad, x, z, {})
    else if (cx) place(MODELS.road.straight, x, z, { rotY: Math.PI / 2 })
    else place(MODELS.road.straight, x, z, { rotY: 0 })
  }
  // bordes del mapa: rocas/barandas en la costa
  for (let x = 2; x < GRID - 2; x += 2) place(pick(MODELS.nature.rock, 'br'), x, COAST_Z - 1, { rotY: rng() * 6.28 })
  // manzanas
  const BX = [[0, 5], [8, 16], [19, 27], [30, 38], [41, 43]], BZ = [[0, 5], [8, 16], [19, 27]]
  const PLAN = [
    ['resid', 'park', 'downtown', 'arcade', 'cemetery'],
    ['forest', 'commercial', 'plaza', 'market', 'resid'],
    ['resid', 'industrial', 'downtown', 'resid', 'skate'],
  ]
  cityCarSpawn()
  for (let bz = 0; bz < BZ.length; bz++) for (let bx = 0; bx < BX.length; bx++) cityBlock(BX[bx], BZ[bz], PLAN[bz][bx])
  cityCoast()
  return { x: 23, z: 22 } // spawn en la plaza (abierta)
}
function ring2(x, z, lo, hi, lz, hz) { if (x === lo || x === hi || z === lz || z === hz) return 'edge'; return 'in' }
function faceOut(x, z, lo, hi, lz, hz) { const dl = x - lo, dr = hi - x, dt = z - lz, db = hz - z, m = Math.min(dl, dr, dt, db); if (m === dl) return Math.PI / 2; if (m === dr) return -Math.PI / 2; if (m === dt) return Math.PI; return 0 }
function cityBlock(bx, bz, dist) {
  const [lo, hi] = bx, [lz, hz] = bz
  const green = { resid: 0x86b165, forest: 0x5f8f43, park: 0x74b356 }[dist]; if (green) groundPatch(lo, hi, lz, hz, green, 0)
  if (dist === 'plaza') cityPlaza(lo, hi, lz, hz)
  else if (dist === 'park') cityPark(lo, hi, lz, hz)
  else if (dist === 'forest') cityForest(lo, hi, lz, hz)
  else if (dist === 'cemetery') cityCemetery(lo, hi, lz, hz)
  else if (dist === 'market') buildShop(lo, hi, lz, hz, MODELS.market, false)
  else if (dist === 'arcade') buildShop(lo, hi, lz, hz, MODELS.arcade, true)
  else if (dist === 'skate') citySkate(lo, hi, lz, hz)
  else { // downtown / commercial / industrial / resid: edificios en el borde, interior abierto
    const pool = { downtown: MODELS.skyscraper, commercial: MODELS.commercial, industrial: MODELS.industrial, resid: MODELS.house }[dist]
    const dens = { downtown: 0.85, commercial: 0.7, industrial: 0.65, resid: 0.7 }[dist]
    for (let x = lo; x <= hi; x++) for (let z = lz; z <= hz; z++) {
      if (ring2(x, z, lo, hi, lz, hz) === 'edge') { if (rng() < dens) place(pick(pool, dist), x, z, { rotY: faceOut(x, z, lo, hi, lz, hz), block: true, jitter: 0.04, occ: true }) }
      else if (dist === 'resid' && rng() < 0.12) place(pick(MODELS.suburbTree, 'rt'), x, z, { rotY: rng() * 6.28, block: true })
    }
  }
}
function cityPlaza(lo, hi, lz, hz) {
  const cx = (lo + hi) / 2 | 0, cz = (lz + hz) / 2 | 0
  groundPatch(lo, hi, lz, hz, 0xb9b4a3, 0.005)
  placeW((() => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.18, 28), new THREE.MeshStandardMaterial({ color: 0xc7ccd1 })).translateY(0.09), new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.16, 28), new THREE.MeshStandardMaterial({ color: 0x4aa3d8, roughness: 0.3 })).translateY(0.15), new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xc7ccd1 })).translateY(0.45)); g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true } }); worldGroup.add(g); g.position.set(worldX(cx), 0, worldZ(cz)); return null })(), cx, cz)
  blocked[idx(cx, cz)] = 1
  // ruleta de premios (como en Kintara) a un lado
  place(MODELS.arcade.wheel, cx, cz - 2, { block: true })
  // estatuas + bancos + flores simetricos en el borde interior
  for (const [x, z, i] of [[lo + 1, lz + 1, 0], [hi - 1, lz + 1, 1], [lo + 1, hz - 1, 2], [hi - 1, hz - 1, 3]]) place(MODELS.nature.statue[i % MODELS.nature.statue.length], x, z, { block: true })
  for (let d = 2; d <= 3; d++) for (const [x, z] of [[cx - d, cz], [cx + d, cz], [cx, cz + d]]) if (inGrid(x, z)) place(MODELS.graveyard.bench, x, z, { rotY: (z === cz ? Math.PI / 2 : 0), block: true })
  for (const [x, z] of [[lo + 2, lz + 2], [hi - 2, lz + 2], [lo + 2, hz - 2], [hi - 2, hz - 2]]) place(pick(MODELS.nature.flower, 'pf'), x, z, {})
}
function cityPark(lo, hi, lz, hz) { // parque MUY verde con arboles/flores, caminable
  for (let x = lo; x <= hi; x++) for (let z = lz; z <= hz; z++) { const r = rng(); if ((x === lo || x === hi || z === lz || z === hz) && r < 0.35) place(pick(MODELS.nature.tree, 'pkt'), x, z, { rotY: rng() * 6.28, block: true }); else if (r < 0.12) place(pick([...MODELS.nature.flower, ...MODELS.nature.plant], 'pkf'), x, z, {}); else if (r < 0.16) place(pick(MODELS.nature.tree, 'pkt'), x, z, { rotY: rng() * 6.28, block: true }) }
  place(MODELS.graveyard.bench, (lo + hi) / 2 | 0, (lz + hz) / 2 | 0, { block: true })
}
function cityForest(lo, hi, lz, hz) {
  const cx = (lo + hi) / 2 | 0, cz = (lz + hz) / 2 | 0
  for (let x = lo; x <= hi; x++) for (let z = lz; z <= hz; z++) { if (Math.abs(x - cx) <= 1 && Math.abs(z - cz) <= 1) continue; const r = rng(); if (r < 0.5) place(pick(MODELS.nature.tree, 'ft'), x, z, { rotY: rng() * 6.28, block: true }); else if (r < 0.6) place(pick(MODELS.nature.rock, 'fr'), x, z, { rotY: rng() * 6.28, block: true }); else if (r < 0.75) place(pick([...MODELS.nature.plant, ...MODELS.nature.mushroom], 'fp'), x, z, {}) }
  place(MODELS.survival.camp[0], cx, cz, { block: true }); place(pick(MODELS.survival.tent, 'tt'), cx - 1, cz - 1, { rotY: Math.PI / 4, block: true }); place('assets/survival/chest.glb', cx + 1, cz, { block: true })
}
function cityCemetery(lo, hi, lz, hz) { // con CESPED + muchos elementos
  groundPatch(lo, hi, lz, hz, 0x6f9a4e, 0.004)
  const gate = (lo + hi) / 2 | 0
  for (let x = lo; x <= hi; x++) for (let z = lz; z <= hz; z++) {
    const edge = x === lo || x === hi || z === lz || z === hz
    if (edge) { if (z === hz && x === gate) place(MODELS.graveyard.gate, x, z, { rotY: 0 }); else place(MODELS.graveyard.fence, x, z, { rotY: (z === lz || z === hz) ? Math.PI / 2 : 0, block: true }); continue }
    if (z === lz + 1) { if ((x - lo) % 2 === 0) place(pick(MODELS.graveyard.crypt, 'cy'), x, z, { rotY: Math.PI, block: true }) }
    else if (x === gate && z > lz) { if (z % 2 === 0) place(MODELS.graveyard.lantern, x, z, {}) } // camino central con faroles
    else if ((z - lz) % 2 === 0) place(pick(MODELS.graveyard.props, 'gr'), x, z, { rotY: Math.PI, block: true })
    else if (rng() < 0.25) place(MODELS.graveyard.tree, x, z, { block: true })
    else if (rng() < 0.15) place(MODELS.graveyard.bench, x, z, { rotY: Math.PI / 2, block: true })
  }
}
function citySkate(lo, hi, lz, hz) {
  groundPatch(lo, hi, lz, hz, 0x9a9a90, 0.004)
  for (let x = lo + 1; x <= hi - 1; x++) for (let z = lz + 1; z <= hz - 1; z++) place(MODELS.skate.floor, x, z, { y: 0.01 })
  place(MODELS.skate.halfpipe, lo + 1, (lz + hz) / 2 | 0, { rotY: Math.PI / 2, block: true }); place(MODELS.skate.halfpipe, lo + 1, ((lz + hz) / 2 | 0) + 1, { rotY: Math.PI / 2, block: true })
  for (let z = lz + 1; z <= hz - 1; z += 2) place(pick(MODELS.skate.rail, 'sr'), (lo + hi) / 2 | 0, z, { block: true })
  place(MODELS.skate.bowl, hi - 1, lz + 1, { block: true }); place(pick(MODELS.skate.obstacle, 'so'), hi - 1, hz - 1, { block: true })
}
// tienda/arcade con paredes, puerta, ventanilla, interior — se ENTRA
function buildShop(lo, hi, lz, hz, kit, isArcade) {
  groundPatch(lo, hi, lz, hz, 0xb8b3a2, 0.004)
  const x0 = lo + 1, x1 = hi - 1, z0 = lz + 1, z1 = hz - 1, doorX = (x0 + x1) / 2 | 0, winX = doorX + 1
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    place(kit.floor, x, z, { y: 0.01 })
    const perim = x === x0 || x === x1 || z === z0 || z === z1
    if (!perim) continue
    if (z === z1 && x === doorX) { place(kit.wallDoor, x, z, {}); continue }
    if (z === z1 && x === winX) { place(kit.wallWindow, x, z, { block: true }); continue }
    const corner = (x === x0 || x === x1) && (z === z0 || z === z1)
    const rotY = z === z0 ? Math.PI : z === z1 ? 0 : x === x0 ? Math.PI / 2 : -Math.PI / 2
    place(corner ? kit.wallCorner : kit.wall, x, z, { rotY, block: true, occ: true })
  }
  place(kit.cash, winX, z1 - 1, { rotY: Math.PI, block: true })
  if (isArcade) { for (let z = z0 + 1; z <= z1 - 1; z += 2) for (let x = x0 + 1; x <= x1 - 1; x++) place(pick(kit.machine, 'am'), x, z, { rotY: Math.PI, block: true }) }
  else { for (let z = z0 + 1; z <= z1 - 2; z += 2) for (let x = x0 + 1; x <= x1 - 1; x++) place(pick(kit.shelf, 'sh'), x, z, { rotY: Math.PI / 2, block: true }); for (let x = x0 + 1; x <= x1 - 1; x++) place(kit.freezer, x, z0 + 1, { rotY: Math.PI, block: true }) }
}
function cityCarSpawn() { spawnCars(24) }
function cityCoast() { // puerto + portal al mundo pirata
  const promZ = COAST_Z - 1
  for (let x = 8; x < 30; x++) if (rng() < 0.16) { const st = 1 + Math.floor(rng() * 2); for (let s = 0; s < st; s++) place(pick(MODELS.port.container, 'ct'), x, promZ - 1, { y: s * 0.42, rotY: rng() < 0.5 ? 0 : Math.PI / 2, block: s === 0, occ: s === 0 }) }
  for (const px of [12, 22]) { for (let d = 0; d < 4; d++) { const gz = COAST_Z + d; const pl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.02), new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 1 })); pl.position.set(worldX(px), -0.02, worldZ(gz)); pl.castShadow = pl.receiveShadow = true; worldGroup.add(pl); if (inGrid(px, gz)) blocked[idx(px, gz)] = 0 } }
  const s1 = placeW(MODELS.port.ships[0], worldX(4), worldZ(GRID + 4), { y: -0.15, rotY: Math.PI / 2 }); if (s1) watercraft.push({ o: s1, vx: 0.5 })
  const b1 = placeW(pick(MODELS.port.boats, 'pb'), worldX(24), worldZ(COAST_Z + 2), { y: -0.12, rotY: -Math.PI / 2 }); if (b1) watercraft.push({ o: b1, vx: -0.3 })
  // PORTAL al mundo pirata (en el muelle)
  addPortal(12, COAST_Z + 3, 'pirate', 0x7a5cff)
  // PORTAL al mundo fantasy (en el bosque, esquina NO)
  addPortal(2, 8, 'fantasy', 0x2fbf6a)
}

// ============================================================
//  MUNDO: PIRATA (océano + islas + barcos + portal de vuelta)
// ============================================================
function buildPirate() {
  resetWorld(40, 21); COAST_Z = GRID; currentWorld = 'pirate'
  scene.background.set(0x7fc8ea)
  bigPlane(400, 0x2f83b8, -0.2, true)
  // isla central de arena (caminable)
  const cx = 20, cz = 20
  for (let x = 0; x < GRID; x++) for (let z = 0; z < GRID; z++) { const d = Math.hypot(x - cx, z - cz); blocked[idx(x, z)] = d < 13 ? 0 : 1 }
  const island = groundPatch(cx - 13, cx + 13, cz - 13, cz + 13, 0xe0cf94, 0, true)
  island.geometry = new THREE.CircleGeometry(13, 40); island.rotation.x = -Math.PI / 2
  // palmeras/rocas en el borde de la isla, props pirata
  for (let a = 0; a < 40; a++) { const ang = a / 40 * Math.PI * 2, x = Math.round(cx + Math.cos(ang) * 11), z = Math.round(cz + Math.sin(ang) * 11); if (inGrid(x, z)) place(pick(MODELS.pirate.palm, 'pp'), x, z, { rotY: rng() * 6.28, block: true }) }
  for (let i = 0; i < 24; i++) { const x = cx - 8 + Math.floor(rng() * 16), z = cz - 8 + Math.floor(rng() * 16); if (inGrid(x, z) && !blocked[idx(x, z)]) { const r = rng(); if (r < 0.4) place(pick(MODELS.pirate.prop, 'pr'), x, z, { rotY: rng() * 6.28, block: true }); else if (r < 0.5) place(pick(MODELS.pirate.sand, 'ps'), x, z, {}) } }
  place(MODELS.pirate.tower, cx + 4, cz - 4, { block: true, occ: true }); place(MODELS.pirate.flag[0], cx - 4, cz - 4, { block: true })
  // muelle + barcos pirata moviles alrededor
  for (let d = 0; d < 5; d++) { const gz = cz + 13 + d; const pl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.02), new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 1 })); pl.position.set(worldX(cx), -0.02, worldZ(gz)); pl.castShadow = pl.receiveShadow = true; worldGroup.add(pl); if (inGrid(cx, gz)) blocked[idx(cx, gz)] = 0 }
  for (let i = 0; i < 5; i++) { const ship = placeW(pick(MODELS.pirate.ship, 'psh'), worldX(3 + i * 8), worldZ(4 + (i % 2) * 30), { y: -0.15, rotY: Math.PI / 2 }); if (ship) watercraft.push({ o: ship, vx: 0.4 + rng() * 0.4 }) }
  addPortal(cx, cz, 'city', 0x7a5cff) // portal de vuelta en el centro
  return { x: cx, z: cz + 15 } // spawn en el muelle
}

// ============================================================
//  MUNDO: FANTASY (aldea + castillo + bosque + mazmorra + portal)
// ============================================================
function cottage(gx, gz, rotY) {
  place(MODELS.fantasy.wall, gx, gz, { rotY, block: true, occ: true })
  place(MODELS.fantasy.roofTop, gx, gz, { rotY, y: (cache.get(MODELS.fantasy.wall)?.userData.h || 1) * 0.9, occ: true })
}
function buildFantasy() {
  resetWorld(40, 33); COAST_Z = GRID; currentWorld = 'fantasy'
  scene.background.set(0xa7d8b0)
  bigPlane(400, 0x74a352, -0.02, true) // pasto
  // caminos de tierra
  for (let x = 4; x < GRID - 4; x++) place(MODELS.road.straight, x, 20, { rotY: 0, y: 0.005 })
  for (let z = 4; z < GRID - 4; z++) place(MODELS.road.straight, 20, z, { rotY: Math.PI / 2, y: 0.005 })
  // plaza de aldea con fuente medieval (centro)
  place(MODELS.fantasy.fountainCenter, 20, 20, { block: true })
  for (const [x, z] of [[18, 18], [22, 18], [18, 22], [22, 22]]) place(pick(MODELS.fantasy.cart, 'fc'), x, z, { rotY: rng() * 6.28, block: true })
  for (const [x, z] of [[19, 17], [21, 17], [19, 23], [21, 23]]) place(MODELS.fantasy.lantern, x, z, {})
  // hilera de casas (aldea) al oeste
  for (let z = 12; z <= 28; z += 2) { cottage(12, z, Math.PI / 2); place(pick(MODELS.fantasy.hedge, 'fh'), 13, z, { block: true }) }
  for (let z = 12; z <= 28; z += 2) cottage(28, z, -Math.PI / 2)
  // castillo al norte (torres + muros + porton)
  const cxs = [10, 14, 24, 28], cz0 = 5
  for (const x of cxs) { place(MODELS.castle.towerBase, x, cz0, { block: true, occ: true }); place(MODELS.castle.towerMid, x, cz0, { y: 1.2, occ: true }); place(MODELS.castle.towerTop, x, cz0, { y: 2.4, occ: true }); place(MODELS.castle.flag[0], x, cz0, { y: 3.4 }) }
  for (let x = 10; x <= 28; x++) if (!cxs.includes(x)) place(x === 19 ? MODELS.castle.gate : MODELS.castle.wall, x, cz0 + 1, { block: x !== 19, occ: true })
  // bosque denso al este
  for (let x = 30; x < GRID - 2; x++) for (let z = 8; z < GRID - 8; z++) { const r = rng(); if (r < 0.5) place(pick(MODELS.nature.tree, 'ff'), x, z, { rotY: rng() * 6.28, block: true }); else if (r < 0.6) place(pick(MODELS.nature.rock, 'fr'), x, z, { block: true }) }
  // entrada a mazmorra al sur (props dungeon)
  groundPatch(15, 25, 30, 36, 0x5a5148, 0.004)
  place(MODELS.dungeon.gate, 20, 31, { block: true, occ: true })
  for (const [x, z] of [[18, 33], [22, 33], [17, 35], [23, 35]]) place(pick([MODELS.dungeon.barrel, MODELS.dungeon.chest, MODELS.dungeon.column, MODELS.dungeon.rocks], 'dg'), x, z, { block: true })
  place(MODELS.dungeon.orc, 20, 34, {})
  // rocas de borde
  for (let a = 0; a < 30; a++) { const ang = a / 30 * Math.PI * 2, x = Math.round(20 + Math.cos(ang) * 18), z = Math.round(20 + Math.sin(ang) * 18); if (inGrid(x, z)) place(pick(MODELS.castle.rocks, 'cr'), x, z, { block: true }) }
  addPortal(20, 26, 'city', 0x2fbf6a)
  return { x: 20, z: 24 }
}

// ============================================================
//  Autos / barcos
// ============================================================
const DIRV = [[1, 0], [0, 1], [-1, 0], [0, -1]]
const rOff = ([dx, dz]) => [-dz * 0.22, dx * 0.22]
function spawnCars(n) {
  const cells = []; for (let x = 0; x < GRID; x++) for (let z = 0; z < COAST_Z; z++) if (roadTile[idx(x, z)]) cells.push([x, z])
  for (let i = 0; i < n && cells.length; i++) { const [x, z] = cells[Math.floor(rng() * cells.length)]; const dirs = [0, 1, 2, 3].filter((d) => isRoadC(x + DIRV[d][0], z + DIRV[d][1])); if (!dirs.length) continue; const d = dirs[Math.floor(rng() * dirs.length)], o = inst(pick(MODELS.car, 'car')); if (!o) continue; worldGroup.add(o); cars.push({ o, dir: d, t: 0, from: { x, z }, to: { x: x + DIRV[d][0], z: z + DIRV[d][1] }, spd: 2 + rng() * 1.5 }) }
}
const isRoadC = (x, z) => inGrid(x, z) && z < COAST_Z && roadTile[idx(x, z)]
function nextDir(c) { const { x, z } = c.to, back = (c.dir + 2) % 4; const opts = [0, 1, 2, 3].filter((d) => d !== back && isRoadC(x + DIRV[d][0], z + DIRV[d][1])); let d = (opts.includes(c.dir) && rng() < 0.72) ? c.dir : opts.length ? opts[Math.floor(rng() * opts.length)] : back; c.dir = d; c.from = { x, z }; c.to = { x: x + DIRV[d][0], z: z + DIRV[d][1] }; c.t = 0 }
function updateCars(dt) { for (const c of cars) { c.t += c.spd * dt / TILE; while (c.t >= 1) { c.t -= 1; nextDir(c) } const [ox, oz] = rOff(DIRV[c.dir]); c.o.position.set(worldX(c.from.x) + (worldX(c.to.x) - worldX(c.from.x)) * c.t + ox, ROAD_TOP, worldZ(c.from.z) + (worldZ(c.to.z) - worldZ(c.from.z)) * c.t + oz); c.o.rotation.y = Math.atan2(DIRV[c.dir][0], DIRV[c.dir][1]) } }
function updateWatercraft(dt) { const lim = HALF + 30; for (const c of watercraft) { c.o.position.x += (c.vx || 0) * dt; if (c.o.position.x > lim) c.o.position.x = -lim; if (c.o.position.x < -lim) c.o.position.x = lim } }

// ============================================================
//  Transparencia por oclusión
// ============================================================
const occRay = new THREE.Raycaster(), faded = new Set()
function setFade(mesh, on) { if (on) { if (!mesh.userData.fadeMat) { mesh.userData.origMat = mesh.material; const f = mesh.material.clone(); f.transparent = true; f.opacity = 0.22; f.depthWrite = false; mesh.userData.fadeMat = f } mesh.material = mesh.userData.fadeMat } else if (mesh.userData.origMat) mesh.material = mesh.userData.origMat }
let occTick = 0
function updateOcclusion() {
  if (!character || (occTick++ % 2)) return
  const target = character.position.clone(); target.y += 0.35; const from = camera.position.clone(); const dir = target.clone().sub(from); const dist = dir.length(); dir.normalize()
  occRay.set(from, dir); occRay.far = dist - 0.4
  const hits = occRay.intersectObjects(occluders, true), now = new Set()
  for (const h of hits) if (h.object.isMesh) { setFade(h.object, true); faded.add(h.object); now.add(h.object) }
  for (const m of faded) if (!now.has(m)) { setFade(m, false); faded.delete(m) }
}

// ============================================================
//  Personaje: WASD + click + colisión con deslizamiento
// ============================================================
let character = null, avatarRing = null, mixer = null, actions = {}, curAction = null
let charTile = { x: 0, z: 0 }, path = [], moveTarget = null
const SPEED = 4.0
const tileCenter = (x, z) => new THREE.Vector3(worldX(x), ROAD_TOP, worldZ(z))
function nearestWalkable(x, z) { if (inGrid(x, z) && !blocked[idx(x, z)]) return { x, z }; for (let r = 1; r < GRID; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; const nx = x + dx, nz = z + dz; if (inGrid(nx, nz) && !blocked[idx(nx, nz)]) return { x: nx, z: nz } } return { x, z } }
const CR = 0.24
function canBe(wx, wz) { for (const [ox, oz] of [[CR, 0], [-CR, 0], [0, CR], [0, -CR]]) { const t = worldToTile({ x: wx + ox, z: wz + oz }); if (!inGrid(t.x, t.z) || blocked[idx(t.x, t.z)]) return false } return true }
function findPath(start, goal) {
  if (blocked[idx(goal.x, goal.z)]) return []
  const key = (a) => idx(a.x, a.z), open = [start], came = new Map(), gs = new Map([[key(start), 0]]), h = (a) => Math.abs(a.x - goal.x) + Math.abs(a.z - goal.z), fs = new Map([[key(start), h(start)]]); let guard = 0
  while (open.length && guard++ < 60000) { let bi = 0; for (let i = 1; i < open.length; i++) if ((fs.get(key(open[i])) ?? 1e9) < (fs.get(key(open[bi])) ?? 1e9)) bi = i; const cur = open.splice(bi, 1)[0]; if (cur.x === goal.x && cur.z === goal.z) { const out = []; let c = cur, k = key(c); while (came.has(k)) { out.unshift(c); c = came.get(k); k = key(c) } return out } for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cur.x + dx, nz = cur.z + dz; if (!inGrid(nx, nz) || blocked[idx(nx, nz)]) continue; const nk = idx(nx, nz), tg = (gs.get(key(cur)) ?? 1e9) + 1; if (tg < (gs.get(nk) ?? 1e9)) { came.set(nk, cur); gs.set(nk, tg); fs.set(nk, tg + h({ x: nx, z: nz })); if (!open.some((o) => idx(o.x, o.z) === nk)) open.push({ x: nx, z: nz }) } } }
  return []
}
function playAction(n) { const nx = actions[n]; if (!nx || nx === curAction) return; nx.reset().fadeIn(0.15).play(); if (curAction) curAction.fadeOut(0.15); curAction = nx }
function ensureCharacter() {
  if (character) return
  const url = pick(MODELS.character, 'char'); character = url ? inst(url) : null
  if (!character) { character = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.24, 4, 8), new THREE.MeshStandardMaterial({ color: 0x2f6fd0 })); character.castShadow = true }
  else if (charAnims.has(url)) { mixer = new THREE.AnimationMixer(character); const cl = charAnims.get(url); for (const n of ['idle', 'walk']) { const c = THREE.AnimationClip.findByName(cl, n); if (c) actions[n] = mixer.clipAction(c) } playAction('idle') }
  scene.add(character)
  avatarRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 28), new THREE.MeshBasicMaterial({ color: 0x66c2ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })); avatarRing.rotation.x = -Math.PI / 2; scene.add(avatarRing)
}
function placeCharacter(sp) { const s = nearestWalkable(sp.x, sp.z); charTile = s; path = []; moveTarget = null; character.position.copy(tileCenter(s.x, s.z)); controls.target.set(worldX(s.x), 0.5, worldZ(s.z)); controls.update() }
const camTmp = new THREE.Vector3()
function updateCameraFollow() { if (!character) return; camTmp.set(character.position.x, 0.5, character.position.z); if (Math.hypot(controls.target.x - camTmp.x, controls.target.z - camTmp.z) > 1.3) controls.target.lerp(camTmp, 0.06) }
const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.26, 24), new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })); marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker)
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2()
function moveTo(cxp, cyp) { ndc.x = (cxp / window.innerWidth) * 2 - 1; ndc.y = -(cyp / window.innerHeight) * 2 + 1; raycaster.setFromCamera(ndc, camera); const hit = raycaster.intersectObjects(groundMeshes)[0]; if (!hit) return; let t = worldToTile(hit.point); if (!inGrid(t.x, t.z)) return; t = nearestWalkable(t.x, t.z); const p = findPath(charTile, t); if (p.length) { path = p; moveTarget = null; marker.position.copy(tileCenter(t.x, t.z)).setY(0.05); marker.visible = true } }
let downX = 0, downY = 0, downT = 0
canvas.addEventListener('pointerdown', (e) => { if (e.button === 0) { downX = e.clientX; downY = e.clientY; downT = performance.now() } })
canvas.addEventListener('pointerup', (e) => { if (e.button === 0 && Math.hypot(e.clientX - downX, e.clientY - downY) < 8 && performance.now() - downT < 500) moveTo(e.clientX, e.clientY) })
const keys = {}
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true }); window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false })
const fwd = new THREE.Vector3(), rightv = new THREE.Vector3(), moveV = new THREE.Vector3()
function keyboardMove(dt) {
  const up = keys['w'] || keys['arrowup'], dn = keys['s'] || keys['arrowdown'], lf = keys['a'] || keys['arrowleft'], rt = keys['d'] || keys['arrowright']
  if (!(up || dn || lf || rt)) return false
  path = []; moveTarget = null; marker.visible = false
  fwd.subVectors(controls.target, camera.position); fwd.y = 0; fwd.normalize()
  rightv.set(-fwd.z, 0, fwd.x) // pantalla-derecha (corrige A/D)
  moveV.set(0, 0, 0); if (up) moveV.add(fwd); if (dn) moveV.sub(fwd); if (rt) moveV.add(rightv); if (lf) moveV.sub(rightv)
  if (moveV.lengthSq() === 0) return false
  moveV.normalize(); const step = SPEED * dt, p = character.position
  const nx = p.x + moveV.x * step, nz = p.z + moveV.z * step
  if (canBe(nx, nz)) { p.x = nx; p.z = nz } else if (canBe(nx, p.z)) p.x = nx; else if (canBe(p.x, nz)) p.z = nz
  charTile = worldToTile(p); character.rotation.y = Math.atan2(moveV.x, moveV.z); playAction('walk'); return true
}
function updateCharacter(dt) {
  if (!character) return
  let moved = false
  if (keyboardMove(dt)) moved = true
  else {
    if (!moveTarget && path.length) { const n = path.shift(); moveTarget = tileCenter(n.x, n.z); charTile = n }
    if (moveTarget) { const dir = new THREE.Vector3().subVectors(moveTarget, character.position); dir.y = 0; const d = dir.length(); if (d < 0.03) { character.position.copy(moveTarget); moveTarget = null; if (!path.length) { marker.visible = false; playAction('idle') } } else { dir.normalize(); character.position.addScaledVector(dir, Math.min(SPEED * dt, d)); character.rotation.y = Math.atan2(dir.x, dir.z); playAction('walk'); moved = true } }
    else if (!path.length) playAction('idle')
  }
  if (avatarRing) avatarRing.position.set(character.position.x, 0.04, character.position.z)
  if (moved) checkPortals()
}
// portales: si el personaje pisa uno, viaja
let switching = false
function checkPortals() { if (switching) return; for (const pt of portals) { if (Math.hypot(character.position.x - worldX(pt.x), character.position.z - worldZ(pt.z)) < 0.6) { travel(pt.to); break } } }

// ============================================================
//  Cambio de mundo
// ============================================================
const fade = document.getElementById('fade')
function build(name) { const sp = name === 'pirate' ? buildPirate() : name === 'fantasy' ? buildFantasy() : buildCity(); ensureCharacter(); placeCharacter(sp); updateWorldLabel() }
function travel(name) {
  switching = true
  if (fade) fade.classList.add('on')
  setTimeout(() => { build(name); if (fade) fade.classList.remove('on'); setTimeout(() => switching = false, 300) }, 260)
}
function updateWorldLabel() { const el = document.getElementById('worldName'); if (el) el.textContent = { city: 'Ciudad', pirate: 'Mundo Pirata', fantasy: 'Mundo Fantasy' }[currentWorld] }

// ---------- HUD ----------
function buildHud() {
  const skills = [{ name: 'Combat', emoji: '⚔️' }, { name: 'Wood', emoji: '🪓' }, { name: 'Mining', emoji: '⛏️' }, { name: 'Fishing', emoji: '🎣' }, { name: 'Cooking', emoji: '🍳' }]
  const wrap = document.getElementById('hudSkills'), btn = 'assets/ui/blue/button_square_depth_gloss.png'
  skills.forEach((s) => { const b = document.createElement('button'); b.className = 'skill'; b.style.backgroundImage = `url("${btn}")`; b.innerHTML = `<span class="emoji">${s.emoji}</span><span>${s.name}</span>`; wrap.appendChild(b) })
  const help = document.querySelector('.hud-help'); if (help) help.innerHTML = '<b>WASD</b>/click para caminar · <b>botón derecho</b>: rotar cámara · pisá un <b>portal</b> para viajar'
}

// ---------- Arranque ----------
let started = false
function showScene() { if (started) return; started = true; loaderEl.classList.add('hidden'); document.getElementById('hud').classList.remove('hidden') }
async function start() {
  buildHud()
  const wd = setTimeout(() => { if (!started) { loaderErr.textContent = 'Carga lenta…'; go() } }, 30000)
  try { await preloadAll() } catch (e) { console.error(e); loaderErr.textContent = 'Error: ' + (e?.message || e) }
  clearTimeout(wd); go()
}
let done = false
function go() {
  if (done) return; done = true
  try { build('city') } catch (e) { console.error(e); loaderErr.textContent = 'Error armando: ' + (e?.message || e) }
  if (failed.length) console.warn('No cargaron:', failed.slice(0, 20))
  window.__kintana = {
    charPos: () => (character ? character.position.toArray().map((n) => +n.toFixed(2)) : null), world: () => currentWorld,
    moveToClient: (x, y) => moveTo(x, y), travel: (n) => build(n), warp: (x, z) => placeCharacter({ x, z }),
    key: (k, v) => { keys[k] = v }, tick: (dt) => { if (mixer) mixer.update(dt); updateCharacter(dt); updateCars(dt); updateWatercraft(dt); updateOcclusion() },
    failed, zoom: (z) => { camera.zoom = z; camera.updateProjectionMatrix() }, fadedCount: () => faded.size, portals: () => portals.map(p => ({ x: p.x, z: p.z, to: p.to })),
    topdown: () => { controls.maxPolarAngle = Math.PI; camera.position.set(0, 95, 0.01); controls.target.set(0, 0, -2); camera.zoom = 0.62; camera.updateProjectionMatrix(); controls.update() },
  }
  showScene(); if (!raf) animate()
}
let raf = 0, last = performance.now()
function animate() {
  raf = requestAnimationFrame(animate); const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now
  if (mixer) mixer.update(dt); updateCharacter(dt); updateCars(dt); updateWatercraft(dt); updateOcclusion(); updateCameraFollow(); controls.update(); renderer.render(scene, camera)
}
window.addEventListener('resize', () => { setFrustum(); renderer.setSize(window.innerWidth, window.innerHeight) })
start()
