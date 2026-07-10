import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { MODELS, allModelUrls } from './assets.js'
import { initEditor } from './editor.js'
let editor = null

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
  if (u.includes('/cars/cone')) return { height: 0.32 }
  if (u.includes('/cars/box')) return { footprint: 0.5 }
  if (u.includes('/cars/')) return { length: 1.5 }
  if (isChar(u)) return { height: CHAR_H }
  if (u.includes('skyscraper')) return { height: 3.2, maxFootprint: 1.35 }
  if (u.includes('/commercial/')) return { height: 1.7, maxFootprint: 1.2 }
  if (u.includes('/industrial/chimney') || u.includes('detail-tank')) return { height: 2.0, maxFootprint: 1.0 }
  if (u.includes('sample-house')) return { height: 1.2, maxFootprint: 1.5 }
  if (u.includes('sample-tower')) return { height: 2.3, maxFootprint: 1.3 }
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
  if (u.includes('/graveyard/stone-wall')) return { footprint: 0.95 }
  if (u.includes('/graveyard/iron-fence') || u.includes('/graveyard/fence')) return { footprint: 0.9 }
  if (u.includes('/graveyard/pillar') || u.includes('/graveyard/column')) return { height: (u.includes('small') || u.includes('square')) ? 0.7 : 1.3 }
  if (u.includes('/graveyard/urn')) return { height: 0.4 }
  if (u.includes('/graveyard/lightpost')) return { height: 0.95 }
  if (u.includes('/graveyard/fire')) return { height: 0.5 }
  if (u.includes('/graveyard/pumpkin')) return { footprint: 0.4 }
  if (u.includes('/graveyard/rocks')) return { footprint: 0.7 }
  if (u.includes('/graveyard/lantern')) return { height: 0.6 }
  if (u.includes('/graveyard/bench')) return { footprint: 0.55 }
  if (u.includes('/graveyard/')) return { height: 0.5 }
  // building kit (deposito)
  if (u.includes('/building/floor')) return { footprint: 1.0 }
  if (u.includes('/building/wall') || u.includes('/building/door') || u.includes('/building/window') || u.includes('/building/barricade')) return { footprint: 1.0 }
  if (u.includes('/building/column')) return { height: 1.0 }
  if (u.includes('/building/')) return { height: 0.8 }
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
const inst = (url) => { const t = cache.get(url); if (!t) return null; const o = isChar(url) ? skeletonClone(t) : t.clone(true); o.userData.url = url; return o }
// carga lazy: para assets del pack completo que no se precargan (editor)
async function loadOne(url) { if (cache.has(url)) return cache.get(url); const g = await loadGLB(url); if (!g) return null; const n = normalize(g.scene, optsFor(url)); cache.set(url, n); if (isChar(url) && g.animations?.length) charAnims.set(url, g.animations); return n }
async function ensureLoaded(urls) { const need = [...new Set(urls)].filter((u) => !cache.has(u)); for (let i = 0; i < need.length; i += 12) await Promise.all(need.slice(i, i + 12).map(loadOne)) }
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

// registro de objetos editables (para el editor sandbox / guardado)
const EDITABLE = []
function track(o, spec) { if (o) { o.userData.ed = spec; EDITABLE.push(o) } return o }
function resetWorld(size, seed) {
  GRID = size; HALF = GRID / 2; rng = makeRng(seed)
  blocked = new Uint8Array(GRID * GRID); roadTile = new Uint8Array(GRID * GRID)
  occluders.length = 0; cars.length = 0; watercraft.length = 0; portals.length = 0; groundMeshes.length = 0; lastPick.clear(); waterMesh = null; EDITABLE.length = 0
  for (const m of faded) if (m.userData.origMat) m.material = m.userData.origMat; faded.clear()
  if (worldGroup) scene.remove(worldGroup)
  worldGroup = new THREE.Group(); scene.add(worldGroup)
  const S = HALF + 16; Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S }); sun.shadow.camera.updateProjectionMatrix?.()
}
function place(url, gx, gz, { rotY = 0, y = 0, block = false, jitter = 0, occ = false } = {}) {
  if (!url) return null; const o = inst(url); if (!o) return null
  o.position.set(worldX(gx), y, worldZ(gz)); o.rotation.y = rotY + (jitter ? (rng() - 0.5) * jitter : 0)
  worldGroup.add(o); if (occ) occluders.push(o); if (block && inGrid(gx, gz)) blocked[idx(gx, gz)] = 1
  return track(o, { t: 'glb', u: url, x: o.position.x, y: o.position.y, z: o.position.z, r: o.rotation.y, occ, blk: block })
}
function placeW(url, wx, wz, { rotY = 0, y = 0, occ = false } = {}) { if (!url) return null; const o = inst(url); if (!o) return null; o.position.set(wx, y, wz); o.rotation.y = rotY; worldGroup.add(o); if (occ) occluders.push(o); return track(o, { t: 'glb', u: url, x: wx, y, z: wz, r: rotY, occ, blk: false }) }
function groundPatch(x0, x1, z0, z1, color, y = 0, pickable = false) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry((x1 - x0 + 1) * TILE, (z1 - z0 + 1) * TILE), new THREE.MeshStandardMaterial({ color, roughness: 1 }))
  m.rotation.x = -Math.PI / 2; m.position.set((worldX(x0) + worldX(x1)) / 2, y, (worldZ(z0) + worldZ(z1)) / 2); m.receiveShadow = true; worldGroup.add(m); if (pickable) groundMeshes.push(m)
  return track(m, { t: 'patch', c: color, w: (x1 - x0 + 1) * TILE, d: (z1 - z0 + 1) * TILE, x: m.position.x, y, z: m.position.z, pk: pickable })
}
function bigPlane(size, color, y, pickable) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color, roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; worldGroup.add(m); if (pickable) groundMeshes.push(m); return track(m, { t: 'grass', sz: size, c: color, x: 0, y, z: 0 }) }
let waterMesh = null
function addWater(size, color, y) {
  const geo = new THREE.PlaneGeometry(size, size, 44, 44)
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.08 }))
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true
  geo.userData.base = Float32Array.from(geo.attributes.position.array)
  worldGroup.add(m); groundMeshes.push(m); waterMesh = m
  return track(m, { t: 'water', sz: size, c: color, x: 0, y, z: 0 })
}
function mkPlank() { const m = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.12, 1.02), new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 1 })); m.castShadow = m.receiveShadow = true; m.userData.proto = 'plank'; return m }
function animateWater(t) {
  if (!waterMesh) return
  const pos = waterMesh.geometry.attributes.position, base = waterMesh.geometry.userData.base
  for (let i = 0; i < pos.count; i++) { const x = base[i * 3], y = base[i * 3 + 1]; pos.array[i * 3 + 2] = Math.sin(t * 1.1 + x * 0.35) * 0.09 + Math.cos(t * 0.8 + y * 0.3) * 0.07 }
  pos.needsUpdate = true; waterMesh.geometry.computeVertexNormals()
}

// portal (pad brillante); al pisarlo se viaja
function mkPortal(to, color) {
  const g = new THREE.Group()
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 24), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.4 })); pad.position.y = 0.05
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 12, 28), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 1.2 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.5
  g.add(pad, ring); g.userData.proto = 'portal'; g.userData.portal = { to, color }; return g
}
function registerPortal(g) { const t = worldToTile(g.position); portals.push({ x: t.x, z: t.z, to: g.userData.portal.to, ring: g.children[1] }); if (inGrid(t.x, t.z)) blocked[idx(t.x, t.z)] = 0 }
function addPortal(gx, gz, to, color) {
  const g = mkPortal(to, color); g.position.set(worldX(gx), 0, worldZ(gz)); worldGroup.add(g); registerPortal(g)
  track(g, { t: 'portal', to, c: color, x: g.position.x, y: 0, z: g.position.z, r: 0 })
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
const AVX = new Set([7, 8, 19, 20, 31, 32, 43, 44])
const AVZ = new Set([7, 8, 19, 20, 31, 32])
// mobiliario urbano procedural
const lampMat = new THREE.MeshStandardMaterial({ color: 0x333941, roughness: 0.8 })
const glowMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffd27a, emissiveIntensity: 0.9 })
function addObj(o, gx, gz, { block = false, occ = false, y = 0, rotY = 0 } = {}) {
  o.position.set(worldX(gx), y, worldZ(gz)); o.rotation.y = rotY; worldGroup.add(o); if (occ) occluders.push(o); if (block && inGrid(gx, gz)) blocked[idx(gx, gz)] = 1
  const sp = o.userData.url ? { t: 'glb', u: o.userData.url } : { t: 'proto', p: o.userData.proto, a: o.userData.protoArg }
  return track(o, { ...sp, x: o.position.x, y, z: o.position.z, r: rotY, occ, blk: block })
}
function mkLamp() { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.75, 8), lampMat); p.position.y = 0.37; const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.14), glowMat); arm.position.y = 0.76; g.add(p, arm); g.traverse(m => { if (m.isMesh) m.castShadow = true }); g.userData.proto = 'lamp'; return g }
function mkHydrant() { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.26, 8), new THREE.MeshStandardMaterial({ color: 0xcc3322, roughness: 0.7 })); m.position.y = 0.13; m.castShadow = true; g.add(m); g.userData.proto = 'hydrant'; return g }
function mkTrash() { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.24, 10), new THREE.MeshStandardMaterial({ color: 0x3f5a48, roughness: 0.8 })); m.position.y = 0.12; m.castShadow = true; g.add(m); g.userData.proto = 'trash'; return g }
function mkRail(rotY) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.05), new THREE.MeshStandardMaterial({ color: 0xbcc2c8, roughness: 0.6 })); b.position.y = 0.28; const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), lampMat); p1.position.set(-0.45, 0.15, 0); const p2 = p1.clone(); p2.position.x = 0.45; g.add(b, p1, p2); g.rotation.y = rotY; g.traverse(m => { if (m.isMesh) m.castShadow = true }); g.userData.proto = 'rail'; g.userData.protoArg = rotY; return g }
const PROTO = { lamp: () => mkLamp(), hydrant: () => mkHydrant(), trash: () => mkTrash(), crane: () => mkCrane(), rail: (a) => mkRail(a || 0), plank: () => mkPlank() }
// serializa el mundo editable a specs; deserializa reconstruyendo
function serializeWorld() { return EDITABLE.filter(o => o.parent).map(o => { const e = o.userData.ed; return { ...e, x: +o.position.x.toFixed(3), y: +o.position.y.toFixed(3), z: +o.position.z.toFixed(3), r: +o.rotation.y.toFixed(4), s: +o.scale.x.toFixed(3) } }) }
function spawnSpec(e) {
  let o = null, flat = false
  if (e.t === 'glb') { o = inst(e.u); if (!o) return null; worldGroup.add(o); if (e.occ) occluders.push(o) }
  else if (e.t === 'proto') { o = (PROTO[e.p] || PROTO.lamp)(e.a); worldGroup.add(o) }
  else if (e.t === 'patch') { o = new THREE.Mesh(new THREE.PlaneGeometry(e.w, e.d), new THREE.MeshStandardMaterial({ color: e.c, roughness: 1 })); o.rotation.x = -Math.PI / 2; o.receiveShadow = true; worldGroup.add(o); if (e.pk) groundMeshes.push(o); flat = true }
  else if (e.t === 'water') { o = addWater(e.sz, e.c, e.y); EDITABLE.pop(); flat = true }
  else if (e.t === 'grass') { o = bigPlane(e.sz, e.c, e.y, true); EDITABLE.pop(); flat = true }
  else if (e.t === 'portal') { o = mkPortal(e.to, e.c); worldGroup.add(o); o.position.set(e.x, e.y, e.z); registerPortal(o) }
  if (!o) return null
  o.position.set(e.x, e.y, e.z); if (!flat) o.rotation.y = e.r; if (e.s) o.scale.setScalar(e.s)
  o.userData.ed = { ...e }; EDITABLE.push(o); return o
}
async function loadWorldSpecs(specs) { await ensureLoaded(specs.filter((e) => e.t === 'glb').map((e) => e.u)); for (const e of specs) spawnSpec(e) }
// decora la vereda (anillo exterior de la manzana) con farol/arbol/banco/hidrante y autos estacionados
function decorate(lo, hi, lz, hz, opts = {}) {
  const treePool = opts.trees || MODELS.suburbTree
  for (let x = lo; x <= hi; x++) for (let z = lz; z <= hz; z++) {
    if (!(x === lo || x === hi || z === lz || z === hz)) continue
    if (opts.door !== undefined && x === opts.door) continue // dejar libre la columna de la puerta
    if (blocked[idx(x, z)]) continue
    const along = (x === lo || x === hi) // vereda vertical
    const s = (x + z)
    if (s % 4 === 0) addObj(mkLamp(), x, z, { block: true })
    else if (s % 4 === 2) place(pick(treePool, 'stree'), x, z, { rotY: rng() * 6.28, block: true })
    else if (s % 7 === 1) addObj(mkHydrant(), x, z, { block: true })
    else if (s % 9 === 4) place(MODELS.graveyard.bench, x, z, { rotY: along ? 0 : Math.PI / 2, block: true })
    else if (s % 11 === 3) addObj(mkTrash(), x, z, { block: true })
  }
}
function buildCity() {
  resetWorld(54, 7); COAST_Z = 46; currentWorld = 'city'
  scene.background.set(0x9fd3ef)
  addWater(420, 0x3a9ad0, -0.22)
  const landS = worldZ(COAST_Z) - 0.5, landW = GRID + 2, landD = landS - (worldZ(0) - 1)
  const lm = new THREE.Mesh(new THREE.PlaneGeometry(landW, landD), new THREE.MeshStandardMaterial({ color: 0x9a9a90, roughness: 1 }))
  lm.rotation.x = -Math.PI / 2; lm.position.set(0, -0.01, (worldZ(0) - 1 + landS) / 2); lm.receiveShadow = true; worldGroup.add(lm); groundMeshes.push(lm)
  track(lm, { t: 'patch', c: 0x9a9a90, w: landW, d: landD, x: 0, y: -0.01, z: lm.position.z, pk: true })
  const isRoad = (x, z) => inGrid(x, z) && z < COAST_Z && (AVX.has(x) || AVZ.has(z))
  for (let x = 0; x < GRID; x++) for (let z = 0; z < COAST_Z; z++) {
    if (!isRoad(x, z)) continue; roadTile[idx(x, z)] = 1
    const cx = AVX.has(x), cz = AVZ.has(z)
    if (cx && cz) place(MODELS.road.crossroad, x, z, {})
    else if (cx) place(MODELS.road.straight, x, z, { rotY: Math.PI / 2 })
    else place(MODELS.road.straight, x, z, { rotY: 0 })
  }
  // baranda de promenade en los bordes N/E/O del mapa
  for (let x = 1; x < GRID - 1; x++) { addObj(mkRail(0), x, 0, {}); if (x % 5 === 0) addObj(mkLamp(), x, 0, { block: true }) }
  for (let z = 1; z < COAST_Z; z++) { addObj(mkRail(Math.PI / 2), 0, z, {}); addObj(mkRail(Math.PI / 2), GRID - 1, z, {}) }
  const BX = [[0, 6], [9, 18], [21, 30], [33, 42], [45, 53]], BZ = [[0, 6], [9, 18], [21, 30], [33, 38]]
  const PLAN = [
    ['resid', 'park', 'commercial', 'arcade', 'cemetery'],
    ['forest', 'resid', 'downtown', 'market', 'resid'],
    ['resid', 'commercial', 'plaza', 'resid', 'skate'],
    ['resid', 'industrial', 'commercial', 'resid', 'park'],
  ]
  for (let bz = 0; bz < BZ.length; bz++) for (let bx = 0; bx < BX.length; bx++) cityBlock(BX[bx], BZ[bz], PLAN[bz][bx])
  cityCoast()
  spawnCars(8)
  return { x: 25, z: 26 } // spawn en la plaza central
}
const ringOf = (x, z, lo, hi, lz, hz) => Math.min(x - lo, hi - x, z - lz, hz - z)
function faceOut(x, z, lo, hi, lz, hz) { const dl = x - lo, dr = hi - x, dt = z - lz, db = hz - z, m = Math.min(dl, dr, dt, db); if (m === dl) return Math.PI / 2; if (m === dr) return -Math.PI / 2; if (m === dt) return Math.PI; return 0 }
function cityBlock(bx, bz, dist) {
  const [lo, hi] = bx, [lz, hz] = bz
  const green = { resid: 0x86b165, forest: 0x5f8f43, park: 0x74b356 }[dist]
  if (green) groundPatch(lo, hi, lz, hz, green, 0)
  else if (['downtown', 'commercial', 'industrial'].includes(dist)) groundPatch(lo, hi, lz, hz, 0x8f8f86, 0.002)
  if (dist === 'plaza') return cityPlaza(lo, hi, lz, hz)
  if (dist === 'park') return cityPark(lo, hi, lz, hz)
  if (dist === 'forest') return cityForest(lo, hi, lz, hz)
  if (dist === 'cemetery') return cityCemetery(lo, hi, lz, hz)
  if (dist === 'market') return buildShop(lo, hi, lz, hz, MODELS.market, false)
  if (dist === 'arcade') return buildShop(lo, hi, lz, hz, MODELS.arcade, true)
  if (dist === 'skate') return citySkate(lo, hi, lz, hz)
  if (dist === 'downtown') cityDowntown(lo, hi, lz, hz)
  else if (dist === 'commercial') cityCommercial(lo, hi, lz, hz)
  else if (dist === 'industrial') cityIndustrial(lo, hi, lz, hz)
  else cityResidential(lo, hi, lz, hz)
  decorate(lo, hi, lz, hz, { trees: dist === 'resid' ? MODELS.suburbTree : MODELS.nature.tree })
}
// coloca edificios en el anillo 1 (mirando a la calle)
function bldRow(lo, hi, lz, hz, poolFn, dens) { for (let x = lo; x <= hi; x++) for (let z = lz; z <= hz; z++) { if (ringOf(x, z, lo, hi, lz, hz) !== 1) continue; if (rng() < dens) place(poolFn(), x, z, { rotY: faceOut(x, z, lo, hi, lz, hz), block: true, jitter: 0.02, occ: true }) } }
const inInterior = (x, z, lo, hi, lz, hz) => ringOf(x, z, lo, hi, lz, hz) >= 2
function cityDowntown(lo, hi, lz, hz) {
  // menos rascacielos: mayoria edificios comerciales de media altura
  bldRow(lo, hi, lz, hz, () => rng() < 0.28 ? pick(MODELS.skyscraper, 'sk') : pick(MODELS.commercial, 'cm'), 0.85)
  // interior: plaza limpia con arboles/bancos/faroles alineados
  for (let x = lo + 2; x <= hi - 2; x++) for (let z = lz + 2; z <= hz - 2; z++) { if (x % 2 === 0 && z % 2 === 0) place(pick(MODELS.nature.tree, 'dtt'), x, z, { block: true }); else if (x % 4 === 1 && z % 4 === 1) addObj(mkLamp(), x, z, { block: true }); else if (x % 3 === 0 && z % 4 === 3) place(MODELS.graveyard.bench, x, z, { rotY: Math.PI / 2, block: true }) }
}
function cityCommercial(lo, hi, lz, hz) {
  bldRow(lo, hi, lz, hz, () => pick(MODELS.commercial, 'cm'), 0.82)
  for (let x = lo + 2; x <= hi - 2; x++) for (let z = lz + 2; z <= hz - 2; z++) { if (x % 2 === 0 && z % 2 === 0) place(pick(MODELS.nature.tree, 'ctt'), x, z, { block: true }); else if (x % 3 === 1 && z % 3 === 1) addObj(mkLamp(), x, z, { block: true }); else if (x % 4 === 2 && z % 4 === 2) place(MODELS.graveyard.bench, x, z, { block: true }) }
}
function cityIndustrial(lo, hi, lz, hz) {
  // ORDENADO: naves en el anillo, chimeneas/tanques en grilla regular, sin containers/pilas
  bldRow(lo, hi, lz, hz, () => pick(MODELS.industrial, 'ind'), 0.8)
  for (let x = lo + 2; x <= hi - 2; x++) for (let z = lz + 2; z <= hz - 2; z++) {
    if (x % 3 === 0 && z % 3 === 0) place(pick(MODELS.industrial, 'ini'), x, z, { block: true, occ: true })
    else if (x % 3 === 1 && z % 3 === 1) place(pick(MODELS.chimney, 'ich'), x, z, { block: true, occ: true })
    else if (x % 4 === 2 && z % 4 === 2) place(MODELS.tank, x, z, { block: true, occ: true })
  }
}
function cityResidential(lo, hi, lz, hz) {
  // hilera continua de casas mirando a la calle
  bldRow(lo, hi, lz, hz, () => pick(MODELS.house, 'rh'), 0.85)
  // interior LIMPIO: jardin con arboles alineados (grilla), sin cercas ni junk
  for (let x = lo + 2; x <= hi - 2; x++) for (let z = lz + 2; z <= hz - 2; z++) {
    if (x % 2 === 0 && z % 2 === 0) place(pick(MODELS.suburbTree, 'rit'), x, z, { rotY: rng() * 6.28, block: true })
    else if (x % 4 === 1 && z % 4 === 1) place(pick(MODELS.nature.flower, 'rif'), x, z, {})
  }
}
function cityPlaza(lo, hi, lz, hz) {
  const cx = (lo + hi) / 2 | 0, cz = (lz + hz) / 2 | 0
  groundPatch(lo, hi, lz, hz, 0xb9b4a3, 0.005)
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.18, 28), new THREE.MeshStandardMaterial({ color: 0xc7ccd1 })).translateY(0.09), new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.16, 28), new THREE.MeshStandardMaterial({ color: 0x4aa3d8, roughness: 0.3 })).translateY(0.15), new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xc7ccd1 })).translateY(0.45)); g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true } }); g.position.set(worldX(cx), 0, worldZ(cz)); worldGroup.add(g); blocked[idx(cx, cz)] = 1
  place(MODELS.arcade.wheel, cx, cz - 3, { block: true })
  // estatuas + arboles en las 4 esquinas interiores
  for (const [x, z, i] of [[lo + 1, lz + 1, 0], [hi - 1, lz + 1, 1], [lo + 1, hz - 1, 2], [hi - 1, hz - 1, 3]]) { place(MODELS.nature.statue[i % MODELS.nature.statue.length], x, z, { block: true }); place(pick(MODELS.nature.tree, 'pzt'), x + (x < cx ? 1 : -1), z + (z < cz ? 1 : -1), { block: true }) }
  // anillo de bancos + faroles + flores alrededor de la fuente
  for (let d = 2; d <= 3; d++) for (const [x, z] of [[cx - d, cz], [cx + d, cz], [cx, cz - d], [cx, cz + d]]) { const gx = x | 0, gz = z | 0; if (inGrid(gx, gz)) place(MODELS.graveyard.bench, gx, gz, { rotY: (z === cz ? Math.PI / 2 : 0), block: true }) }
  for (const [x, z] of [[cx - 2, cz - 2], [cx + 2, cz - 2], [cx - 2, cz + 2], [cx + 2, cz + 2]]) { addObj(mkLamp(), x, z, { block: true }) }
  for (let x = lo + 2; x <= hi - 2; x += 2) { place(pick(MODELS.nature.flower, 'pzf'), x, lz + 1, {}); place(pick(MODELS.nature.flower, 'pzf'), x, hz - 1, {}) }
  decorate(lo, hi, lz, hz, {})
}
function scatter(lo, hi, lz, hz, fn) { for (let x = lo; x <= hi; x++) for (let z = lz; z <= hz; z++) fn(x, z) }
function cityPark(lo, hi, lz, hz) { // MUY verde y denso, caminable
  const cx = (lo + hi) / 2 | 0, cz = (lz + hz) / 2 | 0
  scatter(lo, hi, lz, hz, (x, z) => {
    if (Math.abs(x - cx) <= 1 && Math.abs(z - cz) <= 1) return
    const edge = x === lo || x === hi || z === lz || z === hz, r = rng()
    if (edge) { if (r < 0.5) place(pick(MODELS.nature.tree, 'pkt'), x, z, { rotY: rng() * 6.28, block: true }); else if (r < 0.7) place(pick(MODELS.nature.plant, 'pkp'), x, z, {}) }
    else if (r < 0.22) place(pick(MODELS.nature.tree, 'pkt'), x, z, { rotY: rng() * 6.28, block: true })
    else if (r < 0.42) place(pick([...MODELS.nature.flower, ...MODELS.nature.plant, ...MODELS.nature.mushroom], 'pkf'), x, z, {})
    else if (r < 0.5) place(pick(MODELS.nature.rock, 'pkr'), x, z, { rotY: rng() * 6.28, block: true })
    else if (r < 0.55) place(MODELS.graveyard.bench, x, z, { rotY: rng() < .5 ? 0 : Math.PI / 2, block: true })
  })
  place(MODELS.fantasy.fountainCenter, cx, cz, { block: true })
  for (const [x, z] of [[lo + 1, lz + 1], [hi - 1, hz - 1], [lo + 1, hz - 1], [hi - 1, lz + 1]]) addObj(mkLamp(), x, z, { block: true })
}
function cityForest(lo, hi, lz, hz) {
  const cx = (lo + hi) / 2 | 0, cz = (lz + hz) / 2 | 0
  scatter(lo, hi, lz, hz, (x, z) => { if (Math.abs(x - cx) <= 1 && Math.abs(z - cz) <= 1) return; const r = rng(); if (r < 0.58) place(pick(MODELS.nature.tree, 'ft'), x, z, { rotY: rng() * 6.28, block: true }); else if (r < 0.7) place(pick(MODELS.nature.rock, 'fr'), x, z, { rotY: rng() * 6.28, block: true }); else if (r < 0.85) place(pick([...MODELS.nature.plant, ...MODELS.nature.mushroom, ...MODELS.nature.stump], 'fp'), x, z, {}) })
  place(MODELS.survival.camp[0], cx, cz, { block: true }); place(pick(MODELS.survival.tent, 'tt'), cx - 1, cz - 1, { rotY: Math.PI / 4, block: true }); place('assets/survival/chest.glb', cx + 1, cz, { block: true }); place('assets/survival/resource-wood.glb', cx + 1, cz + 1, {}); place(pick(MODELS.survival.rock, 'sr'), cx - 1, cz + 1, { block: true })
}
// muro/reja perimetral con orientacion CORRECTA (rot 0 = corre en X)
function wallRing(lo, hi, lz, hz, wallPool, cornerPool, gateUrl, gx) {
  for (let x = lo; x <= hi; x++) {
    if (x !== lo && x !== hi) { place(pick(wallPool, 'wr'), x, lz, { rotY: 0, block: true }); if (gateUrl && x === gx) place(gateUrl, x, hz, {}); else place(pick(wallPool, 'wr'), x, hz, { rotY: 0, block: true }) }
  }
  for (let z = lz + 1; z <= hz - 1; z++) { place(pick(wallPool, 'wr'), lo, z, { rotY: Math.PI / 2, block: true }); place(pick(wallPool, 'wr'), hi, z, { rotY: Math.PI / 2, block: true }) }
  for (const [x, z] of [[lo, lz], [hi, lz], [lo, hz], [hi, hz]]) place(pick(cornerPool, 'wc'), x, z, { block: true })
}
function cityCemetery(lo, hi, lz, hz) { // CESPED + denso + ORDENADO, muchos assets del kit
  groundPatch(lo, hi, lz, hz, 0x6f9a4e, 0.004)
  const gx = gateOf(lo, hi)
  wallRing(lo, hi, lz, hz, MODELS.graveyard.wall, MODELS.graveyard.pillar, MODELS.graveyard.gate, gx)
  // criptas + altar + braseros en la fila del fondo
  for (let x = lo + 2; x <= hi - 2; x += 3) if (x !== gx) place(pick(MODELS.graveyard.crypt, 'cy'), x, lz + 2, { rotY: Math.PI, block: true })
  place(pick(MODELS.graveyard.altar, 'ga'), gx, lz + 2, { block: true })
  place(MODELS.graveyard.fire, gx - 2, lz + 2, { block: true }); place(MODELS.graveyard.fire, gx + 2, lz + 2, { block: true })
  // grilla de lapidas variadas + camino central con farolas + urnas/arboles/bancos a los lados
  for (let x = lo + 1; x <= hi - 1; x++) for (let z = lz + 3; z <= hz - 1; z++) {
    if (x === gx) { if (z % 2 === 1) place(pick(MODELS.graveyard.lamp, 'gl'), x, z, { block: true }); continue }
    if (x === lo + 1 || x === hi - 1) { const m = z % 3; if (m === 0) place(pick(MODELS.graveyard.tree, 'gt'), x, z, { block: true }); else if (m === 1) place(MODELS.graveyard.bench, x, z, { rotY: Math.PI / 2, block: true }); else place(pick(MODELS.graveyard.urn, 'gu'), x, z, { block: true }); continue }
    if (z % 2 === 1) place(pick(MODELS.graveyard.props, 'gr'), x, z, { rotY: Math.PI, block: true })
    else if (rng() < 0.3) place(pick([...MODELS.graveyard.urn, ...MODELS.nature.flower], 'gd'), x, z, {})
  }
}
function citySkate(lo, hi, lz, hz) {
  groundPatch(lo, hi, lz, hz, 0x8f8f88, 0.004)
  const gx = gateOf(lo, hi), mz = (lz + hz) / 2 | 0, mx = (lo + hi) / 2 | 0
  for (let x = lo + 1; x <= hi - 1; x++) for (let z = lz + 1; z <= hz - 1; z++) place(MODELS.skate.floor, x, z, { y: 0.01 })
  // reja perimetral (orientacion correcta) con entrada al sur
  for (let x = lo; x <= hi; x++) { place(MODELS.graveyard.fence, x, lz, { rotY: 0, block: true }); if (x !== gx) place(MODELS.graveyard.fence, x, hz, { rotY: 0, block: true }) }
  for (let z = lz + 1; z <= hz - 1; z++) { place(MODELS.graveyard.fence, lo, z, { rotY: Math.PI / 2, block: true }); place(MODELS.graveyard.fence, hi, z, { rotY: Math.PI / 2, block: true }) }
  // DISEÑO por zonas:
  // izquierda: bowl (2x2) + half-pipes enfrentados
  place(MODELS.skate.bowl, lo + 2, lz + 2, { block: true }); place(MODELS.skate.bowl, lo + 3, lz + 2, { block: true }); place(MODELS.skate.bowl, lo + 2, lz + 3, { block: true }); place(MODELS.skate.bowl, lo + 3, lz + 3, { block: true })
  place(MODELS.skate.halfpipe, lo + 2, mz + 1, { rotY: Math.PI / 2, block: true }); place(MODELS.skate.halfpipe, lo + 2, mz + 2, { rotY: Math.PI / 2, block: true })
  // centro: snake de rieles + funboxes alineados
  for (let z = lz + 2; z <= hz - 2; z++) { if (z % 2 === 0) place(pick(MODELS.skate.rail, 'sr'), mx, z, { rotY: Math.PI / 2, block: true }); else if (z % 3 === 0) place(pick(MODELS.skate.obstacle, 'so'), mx, z, { block: true }) }
  place(pick(MODELS.skate.obstacle, 'so'), mx - 1, mz, { block: true }); place(pick(MODELS.skate.obstacle, 'so'), mx + 1, mz, { block: true })
  // derecha: rampas + escaleras + mas rieles
  place(MODELS.skate.halfpipe, hi - 2, mz, { rotY: -Math.PI / 2, block: true }); place(MODELS.skate.halfpipe, hi - 2, mz + 1, { rotY: -Math.PI / 2, block: true })
  place(MODELS.skate.steps, hi - 3, hz - 2, { rotY: Math.PI, block: true }); place(MODELS.skate.steps, hi - 3, hz - 3, { rotY: Math.PI, block: true })
  for (let z = lz + 2; z <= hz - 2; z += 2) place(pick(MODELS.skate.rail, 'sr2'), hi - 4, z, { block: true })
  // detalle: conos, bancos, faroles
  for (let i = 0; i < 4; i++) place(pick(MODELS.cone, 'sc'), lo + 2 + i * 2, hz - 1, {})
  for (const [x, z] of [[lo + 1, hz - 1], [hi - 1, lz + 1], [mx, lz + 1]]) place(MODELS.graveyard.bench, x, z, { block: true })
  for (const [x, z] of [[lo, lz], [hi, hz], [lo, hz], [hi, lz]]) addObj(mkLamp(), x, z, { block: true })
}
const gateOf = (lo, hi) => (lo + hi) / 2 | 0
// tienda/arcade con paredes, puerta, ventanilla, interior LLENO — se ENTRA
function buildShop(lo, hi, lz, hz, kit, isArcade) {
  groundPatch(lo, hi, lz, hz, 0xb0aa98, 0.004)
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
  // interior SIN colision (paredes ya bloquean) para recorrer libre
  place(kit.cash, winX, z1 - 1, { rotY: Math.PI })
  place(kit.employee || MODELS.market.employee, winX, z1 - 2, {})
  if (isArcade) {
    // maquinas DENSAS en filas; la columna de la puerta queda como pasillo
    for (let z = z0 + 1; z <= z1 - 1; z++) for (let x = x0 + 1; x <= x1 - 1; x++) {
      if (x === doorX) continue // pasillo central de la puerta al fondo
      place(pick(kit.machine, 'am' + ((z - z0) % 2)), x, z, { rotY: x < doorX ? -Math.PI / 2 : Math.PI / 2 })
    }
    place(MODELS.arcade.wheel, x0 + 1, z0 + 1, {})
    place('assets/arcade/prizes.glb', x0 + 1, z0 + 2, {})
    place('assets/arcade/ticket-machine.glb', x1 - 1, z0 + 1, {})
    place('assets/arcade/character-gamer.glb', doorX - 1, z1 - 1, {})
  }
  else { for (let z = z0 + 1; z <= z1 - 2; z++) for (let x = x0 + 1; x <= x1 - 1; x++) { if (x === doorX) continue; if ((z - z0) % 2 === 1) place(pick(kit.shelf, 'sh'), x, z, { rotY: Math.PI / 2 }); else if (rng() < 0.6) place(pick(kit.display || kit.shelf, 'ds'), x, z, {}) } for (let x = x0 + 1; x <= x1 - 1; x++) if (x !== doorX) place(kit.freezer, x, z0 + 1, { rotY: Math.PI }); place(MODELS.market.cart, doorX + 1, z1 + 1, {}); place(MODELS.market.cart, doorX - 1, z1 + 1, {}) }
  decorate(lo, hi, lz, hz, { door: doorX })
  for (let z = hz; z >= z1; z--) if (inGrid(doorX, z)) blocked[idx(doorX, z)] = 0 // acceso libre a la puerta
}
function mkCrane() { const g = new THREE.Group(); const y = new THREE.MeshStandardMaterial({ color: 0xf0c040, roughness: 0.6 }); const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), lampMat); base.position.y = 0.06; const mast = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.7, 0.14), y); mast.position.y = 0.9; const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.14), y); arm.position.set(0.55, 1.6, 0); const cbl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.03), lampMat); cbl.position.set(1.2, 1.32, 0); g.add(base, mast, arm, cbl); g.traverse(m => { if (m.isMesh) m.castShadow = true }); return g }
function buildWarehouse(x0, x1, z0, z1) {
  const doorX = (x0 + x1) / 2 | 0
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    place(MODELS.building.floor, x, z, { y: 0.01 })
    if (!(x === x0 || x === x1 || z === z0 || z === z1)) continue
    if (z === z1 && x === doorX) { place(MODELS.building.door, x, z, {}); continue }
    const corner = (x === x0 || x === x1) && (z === z0 || z === z1)
    const rotY = z === z0 ? Math.PI : z === z1 ? 0 : x === x0 ? Math.PI / 2 : -Math.PI / 2
    place(corner ? MODELS.building.wallCorner : (rng() < 0.35 ? pick(MODELS.building.window, 'bw') : MODELS.building.wall), x, z, { rotY, block: true, occ: true })
  }
}
function cityCoast() { // PUERTO: promenade + patio de containers + deposito + gruas + muelles
  const p0 = COAST_Z - 7, p1 = COAST_Z - 1
  groundPatch(0, GRID - 1, p0, p1, 0xa4a096, 0.003)
  // patio de containers DENSO (grilla con pasillos), sin tapar avenidas
  for (let x = 3; x <= 26; x++) { if (AVX.has(x) || x % 4 === 3) continue; for (let z = p0; z <= p0 + 3; z++) { if (z === p0 + 2) continue; const st = 1 + Math.floor(rng() * 3); for (let s = 0; s < st; s++) place(pick(MODELS.port.container, 'ct'), x, z, { y: s * 0.42, rotY: 0, block: s === 0, occ: s === 0 }) } }
  addObj(mkCrane(), 10, p0 + 2, { block: true }); addObj(mkCrane(), 18, p0 + 2, { block: true })
  // deposito (Building Kit)
  buildWarehouse(30, 36, p0, p0 + 3)
  for (let x = 38; x <= 48; x += 2) if (!AVX.has(x)) place(pick(MODELS.port.pile, 'pl'), x, p0 + 1, { block: true })
  // camiones/vans estacionados + conos (en el puerto SI van)
  for (const x of [8, 16, 40, 44]) { const c = inst(pick(['assets/city/cars/truck.glb', 'assets/city/cars/van.glb', 'assets/city/cars/delivery.glb'], 'pt')); if (c) addObj(c, x, p0 + 4, { block: true, rotY: 0 }) }
  for (let i = 0; i < 10; i++) place(pick(MODELS.cone, 'pc'), 4 + i * 4 + (i % 2), p1 - 1, {})
  // mobiliario del paseo (SIN arboles): faroles + bancos
  for (let x = 1; x < GRID - 1; x++) { if (AVX.has(x)) continue; if (x % 4 === 0) addObj(mkLamp(), x, p1, { block: true }); else if (x % 7 === 3) place(MODELS.graveyard.bench, x, p1, { block: true }) }
  // VARIOS muelles de 2 tiles (accesibles) hacia el agua
  const piers = [10, 22, 34, 46]
  for (const px of piers) { for (let d = 0; d < 6; d++) { const gz = COAST_Z + d; for (const ox of [px, px + 1]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.12, 1.02), new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 1 })); pl.position.set(worldX(ox), -0.02, worldZ(gz)); pl.castShadow = pl.receiveShadow = true; worldGroup.add(pl); if (inGrid(ox, gz)) blocked[idx(ox, gz)] = 0 } } }
  for (let i = 0; i < 4; i++) { const b = placeW(pick(MODELS.port.boats, 'pb' + i), worldX(piers[i] + 3), worldZ(COAST_Z + 2), { y: -0.12, rotY: Math.PI / 2 }); if (b) watercraft.push({ o: b, vx: 0.15 + rng() * 0.2 }) }
  const s1 = placeW(MODELS.port.ships[0], worldX(4), worldZ(GRID + 5), { y: -0.15, rotY: Math.PI / 2 }); if (s1) watercraft.push({ o: s1, vx: 0.5 })
  const s2 = placeW(MODELS.port.ships[1] || MODELS.port.ships[0], worldX(30), worldZ(GRID + 9), { y: -0.15, rotY: Math.PI / 2 }); if (s2) watercraft.push({ o: s2, vx: 0.35 })
  for (let i = 0; i < 6; i++) place(pick(MODELS.port.buoy, 'bu'), 6 + i * 7, COAST_Z + 4, { y: -0.08 })
  addPortal(22, COAST_Z + 5, 'pirate', 0x7a5cff)
  addPortal(3, 3, 'fantasy', 0x2fbf6a)
}

// ============================================================
//  MUNDO: PIRATA (océano + islas + barcos + portal de vuelta)
// ============================================================
function buildPirate() {
  resetWorld(48, 21); COAST_Z = GRID; currentWorld = 'pirate'
  scene.background.set(0x7fc8ea)
  addWater(440, 0x2f83b8, -0.2)
  const cx = 24, cz = 24, R = 17
  for (let x = 0; x < GRID; x++) for (let z = 0; z < GRID; z++) blocked[idx(x, z)] = Math.hypot(x - cx, z - cz) < R ? 0 : 1
  const island = groundPatch(cx - R, cx + R, cz - R, cz + R, 0xe0cf94, 0, true); island.geometry = new THREE.CircleGeometry(R, 48); island.rotation.x = -Math.PI / 2
  // pasto interior + dos anillos de palmeras
  const grass = new THREE.Mesh(new THREE.CircleGeometry(R - 4, 40), new THREE.MeshStandardMaterial({ color: 0x8fae5a, roughness: 1 })); grass.rotation.x = -Math.PI / 2; grass.position.set(worldX(cx), 0.006, worldZ(cz)); worldGroup.add(grass)
  for (const rr of [R - 1, R - 3]) for (let a = 0; a < 44; a++) { const ang = a / 44 * Math.PI * 2, x = Math.round(cx + Math.cos(ang) * rr), z = Math.round(cz + Math.sin(ang) * rr); if (inGrid(x, z) && !blocked[idx(x, z)] && rng() < 0.7) place(pick(MODELS.pirate.palm, 'pp'), x, z, { rotY: rng() * 6.28, block: true }) }
  // props pirata densos por toda la isla
  for (let i = 0; i < 90; i++) { const x = cx - 12 + Math.floor(rng() * 24), z = cz - 12 + Math.floor(rng() * 24); if (!inGrid(x, z) || blocked[idx(x, z)] || Math.hypot(x - cx, z - cz) > R - 2) continue; const r = rng(); if (r < 0.35) place(pick(MODELS.pirate.prop, 'pr'), x, z, { rotY: rng() * 6.28, block: true }); else if (r < 0.5) place(pick(MODELS.pirate.sand, 'ps'), x, z, {}); else if (r < 0.6) place(pick(MODELS.nature.plant, 'ppl'), x, z, {}); else if (r < 0.68) place(pick(MODELS.survival.rock, 'psr'), x, z, { block: true }) }
  // campamento pirata + torre + banderas
  place(MODELS.pirate.tower, cx + 6, cz - 6, { block: true, occ: true }); place(MODELS.pirate.flag[0], cx - 6, cz - 6, { block: true }); place(MODELS.pirate.flag[1] || MODELS.pirate.flag[0], cx + 6, cz + 6, { block: true })
  place(MODELS.survival.camp[0], cx - 3, cz + 2, { block: true }); place(pick(MODELS.survival.tent, 'pt'), cx - 4, cz + 3, { rotY: Math.PI / 4, block: true }); place('assets/pirate/chest.glb', cx + 3, cz - 2, { block: true }); place('assets/pirate/cannon.glb', cx + 2, cz + 3, { block: true })
  // muelle + barcos pirata moviles
  for (let d = 0; d < 6; d++) { const gz = cz + R + d - 1; const pl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.02), new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 1 })); pl.position.set(worldX(cx), -0.02, worldZ(gz)); pl.castShadow = pl.receiveShadow = true; worldGroup.add(pl); if (inGrid(cx, gz)) blocked[idx(cx, gz)] = 0 }
  placeW(MODELS.pirate.wreck, worldX(6), worldZ(8), { y: -0.2, rotY: 0.6 })
  for (let i = 0; i < 7; i++) { const ship = placeW(pick(MODELS.pirate.ship, 'psh'), worldX(2 + i * 6), worldZ(3 + (i % 3) * 20), { y: -0.15, rotY: Math.PI / 2 }); if (ship) watercraft.push({ o: ship, vx: 0.35 + rng() * 0.5 }) }
  addPortal(cx, cz, 'city', 0x7a5cff)
  return { x: cx, z: cz + R + 1 }
}

// ============================================================
//  MUNDO: FANTASY (aldea + castillo + bosque + mazmorra + portal)
// ============================================================
function cottage(gx, gz, rotY) {
  place(MODELS.fantasy.wall, gx, gz, { rotY, block: true, occ: true })
  place(MODELS.fantasy.roofTop, gx, gz, { rotY, y: (cache.get(MODELS.fantasy.wall)?.userData.h || 1) * 0.9, occ: true })
}
function buildFantasy() {
  resetWorld(46, 33); COAST_Z = GRID; currentWorld = 'fantasy'
  scene.background.set(0xa7d8b0)
  bigPlane(420, 0x74a352, -0.02, true)
  const C = 23
  // caminos de tierra (cruz)
  for (let x = 4; x < GRID - 4; x++) place(MODELS.road.straight, x, C, { rotY: 0, y: 0.005 })
  for (let z = 4; z < GRID - 4; z++) place(MODELS.road.straight, C, z, { rotY: Math.PI / 2, y: 0.005 })
  // plaza de aldea (fuente + carros + puestos + banderas + faroles)
  place(MODELS.fantasy.fountainCenter, C, C, { block: true })
  for (const [x, z] of [[C - 2, C - 2], [C + 2, C - 2], [C - 2, C + 2], [C + 2, C + 2]]) place(pick(MODELS.fantasy.cart, 'fc'), x, z, { rotY: rng() * 6.28, block: true })
  for (const [x, z] of [[C - 1, C - 3], [C + 1, C - 3], [C - 1, C + 3], [C + 1, C + 3]]) place(MODELS.fantasy.lantern, x, z, {})
  for (const [x, z] of [[C - 3, C], [C + 3, C]]) place(pick(MODELS.fantasy.banner, 'fb'), x, z, { block: true })
  // aldea: 2 hileras de casas a cada lado, con setos/jardines
  for (const bx of [10, 13, 33, 36]) for (let z = 12; z <= 34; z += 3) { cottage(bx, z, bx < C ? Math.PI / 2 : -Math.PI / 2); if (rng() < 0.6) place(pick(MODELS.fantasy.hedge, 'fh'), bx + (bx < C ? 1 : -1), z, { block: true }); if (rng() < 0.4) place(pick(MODELS.nature.tree, 'fvt'), bx, z + 1, { block: true }) }
  // castillo grande al norte
  const cxs = [8, 12, 34, 38], cz0 = 5
  for (const x of cxs) { place(MODELS.castle.towerBase, x, cz0, { block: true, occ: true }); place(MODELS.castle.towerMid, x, cz0, { y: 1.2, occ: true }); place(MODELS.castle.towerTop, x, cz0, { y: 2.4, occ: true }); place(pick(MODELS.castle.flag, 'cf'), x, cz0, { y: 3.4 }) }
  for (let x = 8; x <= 38; x++) if (!cxs.includes(x)) place(x === C ? MODELS.castle.gate : MODELS.castle.wall, x, cz0 + 1, { block: x !== C, occ: true })
  place(MODELS.castle.towerBase, C, cz0 - 2, { block: true, occ: true }); place(MODELS.castle.towerMid, C, cz0 - 2, { y: 1.2, occ: true }); place(MODELS.castle.towerTop, C, cz0 - 2, { y: 2.4, occ: true }) // torreón central
  // bosque MUY denso al este + oeste (afuera de la aldea)
  const forest = (x0, x1) => { for (let x = x0; x < x1; x++) for (let z = 10; z < GRID - 6; z++) { if (blocked[idx(x, z)]) continue; const r = rng(); if (r < 0.55) place(pick(MODELS.nature.tree, 'ff'), x, z, { rotY: rng() * 6.28, block: true }); else if (r < 0.68) place(pick(MODELS.nature.rock, 'fr'), x, z, { block: true }); else if (r < 0.82) place(pick([...MODELS.nature.plant, ...MODELS.nature.mushroom, ...MODELS.nature.stump], 'fpp'), x, z, {}) } }
  forest(40, GRID - 1); forest(1, 7)
  // mazmorra al sur
  groundPatch(17, 29, 34, 41, 0x5a5148, 0.004)
  place(MODELS.dungeon.gate, C, 35, { block: true, occ: true })
  for (const [x, z] of [[C - 3, 37], [C + 3, 37], [C - 4, 39], [C + 4, 39], [C - 1, 40], [C + 1, 40]]) place(pick([MODELS.dungeon.barrel, MODELS.dungeon.chest, MODELS.dungeon.column, MODELS.dungeon.rocks], 'dg'), x, z, { block: true })
  place(MODELS.dungeon.orc, C - 1, 38, {}); place(MODELS.dungeon.orc, C + 2, 39, {})
  // detalles de pasto por todo el mapa (bushes/flores)
  for (let i = 0; i < 120; i++) { const x = 1 + Math.floor(rng() * (GRID - 2)), z = 1 + Math.floor(rng() * (GRID - 2)); if (!blocked[idx(x, z)] && rng() < 0.5) place(pick([...MODELS.nature.plant, ...MODELS.nature.flower], 'gg'), x, z, {}) }
  addPortal(C, C + 4, 'city', 0x2fbf6a)
  return { x: C, z: C + 2 }
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
let downX = 0, downY = 0, downT = 0, editMode = false
canvas.addEventListener('pointerdown', (e) => { if (e.button === 0) { downX = e.clientX; downY = e.clientY; downT = performance.now() } })
canvas.addEventListener('pointerup', (e) => { if (editMode) return; if (e.button === 0 && Math.hypot(e.clientX - downX, e.clientY - downY) < 8 && performance.now() - downT < 500) moveTo(e.clientX, e.clientY) })
const keys = {}
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true }); window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false })
const fwd = new THREE.Vector3(), rightv = new THREE.Vector3(), moveV = new THREE.Vector3()
function keyboardMove(dt) {
  if (editMode) return false
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
function removeObj(o) { if (o.parent) o.parent.remove(o); let i = EDITABLE.indexOf(o); if (i >= 0) EDITABLE.splice(i, 1); i = occluders.indexOf(o); if (i >= 0) occluders.splice(i, 1); if (o.userData.proto === 'portal') { const j = portals.findIndex(p => p.ring === o.children[1]); if (j >= 0) portals.splice(j, 1) } }
function saveMap() { return { world: currentWorld, grid: GRID, coast: COAST_Z, bg: scene.background.getHex(), spawn: { ...charTile }, specs: serializeWorld() } }
async function loadMap(s) { resetWorld(s.grid, 1); COAST_Z = s.coast; currentWorld = s.world; scene.background.set(s.bg); await loadWorldSpecs(s.specs); return s.spawn || { x: (s.grid / 2) | 0, z: (s.grid / 2) | 0 } }
function loadSaved(name) { try { const s = localStorage.getItem('kintana_map_' + name); return s ? JSON.parse(s) : null } catch { return null } }
async function build(name) {
  const saved = loadSaved(name)
  const sp = saved ? await loadMap(saved) : (name === 'pirate' ? buildPirate() : name === 'fantasy' ? buildFantasy() : buildCity())
  ensureCharacter(); placeCharacter(sp); updateWorldLabel(); if (editor) editor.refresh()
}
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
  build('city').catch((e) => { console.error(e); loaderErr.textContent = 'Error armando: ' + (e?.message || e) })
  if (failed.length) console.warn('No cargaron:', failed.slice(0, 20))
  window.__kintana = {
    charPos: () => (character ? character.position.toArray().map((n) => +n.toFixed(2)) : null), world: () => currentWorld,
    moveToClient: (x, y) => moveTo(x, y), travel: (n) => build(n), warp: (x, z) => placeCharacter({ x, z }),
    key: (k, v) => { keys[k] = v }, tick: (dt) => { if (mixer) mixer.update(dt); updateCharacter(dt); updateCars(dt); updateWatercraft(dt); updateOcclusion() },
    failed, zoom: (z) => { camera.zoom = z; camera.updateProjectionMatrix() }, fadedCount: () => faded.size, portals: () => portals.map(p => ({ x: p.x, z: p.z, to: p.to })),
    topdown: () => { controls.maxPolarAngle = Math.PI; camera.position.set(0, 95, 0.01); controls.target.set(0, 0, -2); camera.zoom = 0.62; camera.updateProjectionMatrix(); controls.update() },
    edCount: () => EDITABLE.length, camPos: () => camera.position.toArray().map((n) => +n.toFixed(2)),
  }
  // Editor sandbox (dev): activar con ?edit en la URL. No aparece al publicar.
  if (new URLSearchParams(location.search).has('edit')) {
    editMode = true
    controls.enablePan = true; controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }
    if (character) { character.visible = false; if (avatarRing) avatarRing.visible = false }
    editor = initEditor({
      THREE, scene, camera, controls, canvas, renderer,
      groundMeshes: () => groundMeshes, editable: () => EDITABLE,
      spawnGlb: async (url, x, z, ry) => { await loadOne(url); return spawnSpec({ t: 'glb', u: url, x, y: 0, z, r: ry || 0, s: 1 }) },
      spawnProto: (p, x, z, ry) => spawnSpec({ t: 'proto', p, x, y: 0, z, r: ry || 0, s: 1 }),
      spawnSpec: (e) => spawnSpec(e), ensure: (url) => loadOne(url), cached: (url) => cache.get(url),
      removeObj, worldToTile,
      world: () => currentWorld, worlds: ['city', 'pirate', 'fantasy'], goWorld: (n) => build(n),
      saveLocal: () => { localStorage.setItem('kintana_map_' + currentWorld, JSON.stringify(saveMap())) },
      exportJSON: () => JSON.stringify(saveMap()),
      importJSON: (str) => { localStorage.setItem('kintana_map_' + currentWorld, str); build(currentWorld) },
      resetProc: () => { localStorage.removeItem('kintana_map_' + currentWorld); build(currentWorld) },
    })
  }
  showScene(); if (!raf) animate()
}
let raf = 0, last = performance.now()
function animate() {
  raf = requestAnimationFrame(animate); const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now
  if (mixer) mixer.update(dt); if (!editMode) { updateCharacter(dt); updateCameraFollow() } updateCars(dt); updateWatercraft(dt); animateWater(now / 1000); updateOcclusion(); if (editor) editor.tick(); controls.update(); renderer.render(scene, camera)
}
window.addEventListener('resize', () => { setFrustum(); renderer.setSize(window.innerWidth, window.innerHeight) })
start()
