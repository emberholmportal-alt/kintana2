import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { MODELS, allModelUrls } from './assets.js'

// ============================================================
//  KINTANA2 — mundo prototipo
//  Ciudad-isla diseñada con urbanismo: red vial jerarquica,
//  distritos con logica, transiciones, trafico y barcos en
//  movimiento. Camara iso tipo Kintara, personaje click-to-move.
//  Construccion en orden: limites -> vias -> distritos -> manzanas
//  -> parques -> comercio -> residencial -> industria -> especiales
//  -> decoracion -> vegetacion -> props.
//  Assets: Kenney (CC0).
// ============================================================

const GRID = 34, TILE = 1, HALF = GRID / 2
const COAST_Z = 27               // costa: tiles con z >= COAST_Z son agua/puerto
const ROAD_TOP = 0.02
const CHAR_H = 0.6

function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = makeRng(77)

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
scene.fog = new THREE.Fog(0x9fd3ef, 55, 120)

let viewSize = 14
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 240)
function setCameraFrustum() {
  const a = window.innerWidth / window.innerHeight
  camera.left = -viewSize * a; camera.right = viewSize * a
  camera.top = viewSize; camera.bottom = -viewSize
  camera.updateProjectionMatrix()
}
setCameraFrustum()
camera.position.set(40, 40, 40)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.target.set(0, 1, 0)
controls.minZoom = 0.5
controls.maxZoom = 7
controls.maxPolarAngle = Math.PI / 2.15
controls.enablePan = false
controls.update()

// ---------- Luces ----------
scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x8a8f7a, 0.95))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.55)
sun.position.set(26, 42, 20)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 140
const S = HALF + 12
Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S })
sun.shadow.bias = -0.0004
scene.add(sun, sun.target)

// coords tile -> mundo
const worldX = (gx) => gx * TILE - HALF + TILE / 2
const worldZ = (gz) => gz * TILE - HALF + TILE / 2
const idx = (x, z) => z * GRID + x
const inGrid = (x, z) => x >= 0 && z >= 0 && x < GRID && z < GRID

// ============================================================
//  1) LIMITES DEL MAPA: agua + isla
// ============================================================
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x3a9ad0, roughness: 0.7, metalness: 0 })
)
water.rotation.x = -Math.PI / 2
water.position.y = -0.22
water.receiveShadow = true
scene.add(water)

// isla: suelo urbano (hormigon) desde el norte hasta la costa
const landN = worldZ(0) - 1
const landS = worldZ(COAST_Z) - 0.5
const land = new THREE.Mesh(
  new THREE.PlaneGeometry(GRID + 2, landS - landN),
  new THREE.MeshStandardMaterial({ color: 0x9a9a90, roughness: 1 })
)
land.rotation.x = -Math.PI / 2
land.position.set(0, -0.01, (landN + landS) / 2)
land.receiveShadow = true
scene.add(land)

// parche de suelo (pasto/plaza) para un rango de tiles
function groundPatch(x0, x1, z0, z1, color, y = 0.0) {
  const w = (x1 - x0 + 1) * TILE, d = (z1 - z0 + 1) * TILE
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: 1 }))
  m.rotation.x = -Math.PI / 2
  m.position.set((worldX(x0) + worldX(x1)) / 2, y, (worldZ(z0) + worldZ(z1)) / 2)
  m.receiveShadow = true
  scene.add(m)
}

// ============================================================
//  Carga de assets (tolerante a fallos)
// ============================================================
const loaderEl = document.getElementById('loader')
const barFill = document.getElementById('barFill')
const loaderPct = document.getElementById('loaderPct')
const loaderErr = document.getElementById('loaderErr')

const gltfLoader = new GLTFLoader()
const cache = new Map()
const charAnims = new Map()
const failed = []
const isChar = (u) => u.includes('character')

function loadGLB(url) {
  return new Promise((res) => gltfLoader.load(url, (g) => res(g), undefined, () => { failed.push(url); res(null) }))
}

function normalize(obj, o = {}) {
  obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true } })
  const box = new THREE.Box3().setFromObject(obj)
  const size = new THREE.Vector3(), center = new THREE.Vector3()
  box.getSize(size); box.getCenter(center)
  let s = 1
  if (o.scale) s = o.scale
  else if (o.footprint) s = o.footprint / Math.max(size.x, size.z)
  else if (o.length) s = o.length / Math.max(size.x, size.z)
  else if (o.height) { s = o.height / size.y; if (o.maxFootprint) s = Math.min(s, o.maxFootprint / Math.max(size.x, size.z)) }
  const w = new THREE.Group()
  obj.scale.setScalar(s)
  obj.position.set(-center.x * s, -box.min.y * s, -center.z * s)
  w.add(obj)
  w.userData.footprint = Math.max(size.x, size.z) * s
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
  if (u.includes('/suburban/planter')) return { footprint: 0.7 }
  if (u.includes('/suburban/')) return { height: 1.15, maxFootprint: 1.4 }
  if (u.includes('/market/')) return { height: 0.5 }
  if (u.includes('/skate/floor')) return { footprint: 1.0 }
  if (u.includes('/skate/half-pipe') || u.includes('/skate/bowl') || u.includes('/skate/structure')) return { footprint: 1.0 }
  if (u.includes('/skate/')) return { height: 0.4 }
  if (u.includes('/graveyard/pine')) return { height: 1.2 }
  if (u.includes('/graveyard/crypt')) return { footprint: 0.9 }
  if (u.includes('/graveyard/brick-wall') || u.includes('/graveyard/iron-fence') || u.includes('/graveyard/fence')) return { footprint: 0.9 }
  if (u.includes('/graveyard/lantern')) return { height: 0.6 }
  if (u.includes('/graveyard/bench')) return { footprint: 0.5 }
  if (u.includes('/graveyard/')) return { height: 0.5 }
  if (u.includes('ship-ocean-liner')) return { length: 9 }
  if (u.includes('ship-cargo')) return { length: 6 }
  if (u.includes('/port/boat')) return { length: 1.7 }
  if (u.includes('cargo-container')) return { length: 1.1 }
  if (u.includes('cargo-pile')) return { footprint: 1.1 }
  if (u.includes('/port/buoy')) return { height: 0.5 }
  return { footprint: 0.9 }
}

async function preloadAll() {
  const urls = allModelUrls()
  let done = 0
  const setBar = () => { const p = Math.round((done / urls.length) * 100); barFill.style.width = p + '%'; loaderPct.textContent = p + '%' }
  setBar()
  const q = urls.slice(), POOL = 12
  async function worker() {
    while (q.length) {
      const u = q.shift()
      const g = await loadGLB(u)
      if (g) { cache.set(u, normalize(g.scene, optsFor(u))); if (isChar(u) && g.animations?.length) charAnims.set(u, g.animations) }
      done++; setBar()
    }
  }
  await Promise.all(Array.from({ length: POOL }, worker))
}

const inst = (url) => { const t = cache.get(url); if (!t) return null; return isChar(url) ? skeletonClone(t) : t.clone(true) }

// selector con variedad: evita repetir el mismo asset consecutivamente
const lastPick = new Map()
function pickVaried(list, key = 'g') {
  const ok = list.filter((u) => cache.has(u))
  if (!ok.length) return null
  if (ok.length === 1) return ok[0]
  let u, tries = 0
  do { u = ok[Math.floor(rng() * ok.length)] } while (u === lastPick.get(key) && ++tries < 5)
  lastPick.set(key, u)
  return u
}

// ============================================================
//  Ocupacion (para pathfinding) y grupo de ciudad
// ============================================================
const blocked = new Uint8Array(GRID * GRID)
const roadTile = new Uint8Array(GRID * GRID)
const cityGroup = new THREE.Group()

// agua al sur = no caminable
for (let x = 0; x < GRID; x++) for (let z = COAST_Z; z < GRID; z++) blocked[idx(x, z)] = 1

function place(url, gx, gz, { rotY = 0, y = 0, block = false, jitter = 0, scaleY = 1 } = {}) {
  if (!url) return null
  const o = inst(url)
  if (!o) return null
  o.position.set(worldX(gx), y, worldZ(gz))
  o.rotation.y = rotY + (jitter ? (rng() - 0.5) * jitter : 0)
  if (scaleY !== 1) o.scale.y *= scaleY
  cityGroup.add(o)
  if (block && inGrid(gx, gz)) blocked[idx(gx, gz)] = 1
  return o
}

// ============================================================
//  2) RED VIAL — jerarquia + autotiling correcto
// ============================================================
// calles atraviesan toda la isla (grilla limpia => solo cruces y rectas
// en el interior; T y esquinas en los bordes). Avenidas ppales: 13 y 20.
const STREETS_X = [6, 13, 20, 27]
const STREETS_Z = [6, 13, 20, 26]
const MAIN_X = new Set([13, 20])
const MAIN_Z = new Set([13])
const isStreetX = (x) => STREETS_X.includes(x)
const isStreetZ = (z) => STREETS_Z.includes(z)
const isRoad = (x, z) => inGrid(x, z) && z < COAST_Z && (isStreetX(x) || isStreetZ(z))

// orientaciones base (rot 0), openings en [dx,dz]:
//  straight: E,W | bend: W,S | tee: W,E,S | end: S
const BASE = {
  straight: [[1, 0], [-1, 0]],
  bend: [[-1, 0], [0, 1]],
  tee: [[-1, 0], [1, 0], [0, 1]],
  end: [[0, 1]],
}
const rotDir = ([dx, dz], k) => { for (let i = 0; i < k; i++)[dx, dz] = [dz, -dx]; return [dx, dz] }
function matchK(base, need) {
  for (let k = 0; k < 4; k++) {
    const set = new Set(BASE[base].map((d) => rotDir(d, k).join(',')))
    if (set.size === need.length && need.every((d) => set.has(d.join(',')))) return k
  }
  return 0
}
function roadPiece(neighbors) {
  const n = neighbors.length
  if (n >= 4) return { url: MODELS.road.crossroad, k: 0 }
  let base
  if (n === 3) base = 'tee'
  else if (n === 2) base = (neighbors[0][0] === -neighbors[1][0] && neighbors[0][1] === -neighbors[1][1]) ? 'straight' : 'bend'
  else if (n === 1) base = 'end'
  else base = 'straight'
  const map = { straight: MODELS.road.straight, bend: MODELS.road.bend, tee: MODELS.road.tee, end: MODELS.road.end }
  return { url: map[base], k: n === 0 ? 0 : matchK(base, neighbors) }
}

function buildRoads() {
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < COAST_Z; z++) {
      if (!isRoad(x, z)) continue
      roadTile[idx(x, z)] = 1
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => isRoad(x + dx, z + dz))
      const { url, k } = roadPiece(nb)
      place(url, x, z, { rotY: k * Math.PI / 2 })
    }
}

// ============================================================
//  3) DISTRITOS — plano de la ciudad
// ============================================================
// bandas de manzana entre calles
const BX = [[0, 5], [7, 12], [14, 19], [21, 26], [28, 33]]
const BZ = [[0, 5], [7, 12], [14, 19], [21, 25]]  // fila costera (27-29) = puerto aparte
// bz(N->S) x bx(W->E)
const PLAN = [
  ['skate', 'resid', 'park', 'resid', 'cemetery'],
  ['resid', 'commercial', 'downtown', 'market', 'resid'],
  ['resid', 'downtown', 'plaza', 'downtown', 'resid'],
  ['resid', 'commercial', 'commercial', 'industrial', 'industrial'],
]
// distritos "abiertos": sin edificios en el perimetro (conectan con la calle)
const OPEN_DISTRICTS = new Set(['park', 'cemetery', 'skate', 'market', 'plaza'])

// orientacion: mirar hacia la calle mas cercana del borde de manzana
function faceStreet(x, z, lo, hi, lz, hz) {
  const dl = x - lo, dr = hi - x, dt = z - lz, db = hz - z
  const m = Math.min(dl, dr, dt, db)
  if (m === dl) return Math.PI / 2   // calle al oeste
  if (m === dr) return -Math.PI / 2  // este
  if (m === dt) return Math.PI       // norte
  return 0                            // sur
}

const spawnPlaza = { x: 16, z: 16 }

function fillBlock(bx, bz) {
  const [lo, hi] = BX[bx], [lz, hz] = BZ[bz]
  const dist = PLAN[bz][bx]
  const onEdge = (x, z) => x === lo || x === hi || z === lz || z === hz

  // suelo por distrito (verde solo donde tiene sentido)
  if (dist === 'resid') groundPatch(lo, hi, lz, hz, 0x86b165)
  if (dist === 'park') groundPatch(lo, hi, lz, hz, 0x7cb45a)
  if (dist === 'plaza' || dist === 'market') groundPatch(lo + 1, hi - 1, lz + 1, hz - 1, 0xb8b3a2)
  if (dist === 'skate') groundPatch(lo, hi, lz, hz, 0x9a9a90)

  // densidad de perimetro por distrito
  const dens = { downtown: 0.9, commercial: 0.85, plaza: 0.8, resid: 0.62, industrial: 0.7, park: 0, cemetery: 0 }[dist] ?? 0.6
  const pool = {
    downtown: MODELS.skyscraper, commercial: MODELS.commercial, plaza: MODELS.commercial,
    resid: MODELS.house, industrial: MODELS.industrial, park: MODELS.house, cemetery: MODELS.house,
  }[dist]

  for (let x = lo; x <= hi; x++)
    for (let z = lz; z <= hz; z++) {
      const edge = onEdge(x, z)
      const rot = faceStreet(x, z, lo, hi, lz, hz)
      if (edge && !OPEN_DISTRICTS.has(dist)) {
        if (rng() < dens) place(pickVaried(pool, dist), x, z, { rotY: rot, block: true, jitter: 0.06 })
        continue
      }
      fillInterior(dist, x, z, lo, hi, lz, hz)
    }
}

function fillInterior(dist, x, z, lo, hi, lz, hz) {
  const cx = (lo + hi) / 2, cz = (lz + hz) / 2
  switch (dist) {
    case 'downtown':
      if (rng() < 0.5) place(pickVaried(MODELS.skyscraper, 'ds'), x, z, { block: true, jitter: 0.08 })
      else if (rng() < 0.3) place(pickVaried(MODELS.commercial, 'dc'), x, z, { block: true })
      break
    case 'commercial':
      if (rng() < 0.35) place(pickVaried(MODELS.commercial, 'ci'), x, z, { block: true })
      break
    case 'resid':
      // patios: pocas casas interiores + arboles agrupados
      if (rng() < 0.2) place(pickVaried(MODELS.house, 'ri'), x, z, { rotY: rng() * 6.28, block: true })
      else if (rng() < 0.35) place(pickVaried(MODELS.tree, 'rt'), x, z, { rotY: rng() * 6.28, block: true })
      break
    case 'industrial':
      if (rng() < 0.3) place(pickVaried(MODELS.industrial, 'ii'), x, z, { block: true })
      else if (rng() < 0.2) place(pickVaried(MODELS.chimney, 'ich'), x, z, { block: true })
      break
    case 'plaza':
      // plaza central abierta: fuente + arboles en las esquinas del interior
      if ((x === lo + 1 || x === hi - 1) && (z === lz + 1 || z === hz - 1))
        place(pickVaried(MODELS.tree, 'pt'), x, z, { rotY: rng() * 6.28, block: true })
      break
    case 'park':
      if (rng() < 0.5) place(rng() < 0.75 ? pickVaried(MODELS.tree, 'pk') : MODELS.planter, x, z, { rotY: rng() * 6.28, block: true })
      break
    case 'skate': {
      place(MODELS.skate[0], x, z, { y: 0.01 }) // piso hormigon (caminable)
      if (x === cx - 0.5 || (Math.abs(x - cx) < 1 && Math.abs(z - cz) < 1)) place(MODELS.skate[1], x, z, { rotY: Math.PI / 2 * Math.floor(rng() * 4), block: true })
      else if (rng() < 0.22) place(pickVaried(MODELS.skate.slice(2, 10), 'sk'), x, z, { rotY: rng() * 6.28, block: true })
      break
    }
    case 'market':
      if (rng() < 0.5) place(pickVaried(MODELS.market.slice(1, 9), 'mk'), x, z, { rotY: rng() * 6.28, block: true })
      break
    case 'cemetery': {
      const border = z === lz || z === hz || x === lo || x === hi
      if (border) { if (rng() < 0.75) place(MODELS.graveyard.fence, x, z, { rotY: (z === lz || z === hz) ? Math.PI / 2 : 0, block: true }) }
      else if (rng() < 0.14) place(pickVaried(MODELS.graveyard.crypt, 'gc'), x, z, { rotY: Math.PI, block: true })
      else if (rng() < 0.6) place(pickVaried(MODELS.graveyard.props, 'gp'), x, z, { rotY: Math.PI + (rng() - 0.5) * 0.3, block: true })
      else if (rng() < 0.2) place(MODELS.graveyard.tree, x, z, { rotY: rng() * 6.28, block: true })
      break
    }
  }
}

// ============================================================
//  Plaza central: fuente + bancos + spawn
// ============================================================
function buildPlazaCenter() {
  const g = new THREE.Group()
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.18, 24), new THREE.MeshStandardMaterial({ color: 0xbfc4c9, roughness: 0.9 }))
  base.position.y = 0.09
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.16, 24), new THREE.MeshStandardMaterial({ color: 0x4aa3d8, roughness: 0.3 }))
  w.position.y = 0.14
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0xbfc4c9 }))
  post.position.y = 0.4
  g.add(base, w, post)
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true } })
  g.position.set(worldX(spawnPlaza.x), 0, worldZ(spawnPlaza.z))
  cityGroup.add(g)
  blocked[idx(spawnPlaza.x, spawnPlaza.z)] = 1
}

// ============================================================
//  Puerto (industria/logistica en la costa sur)
// ============================================================
const ships = []
function buildPort() {
  const promZ = COAST_Z - 1
  // contenedores y pilas junto a la costa (lado industrial, este)
  for (let x = 3; x < GRID - 3; x++) {
    if (rng() < 0.16) {
      const st = 1 + Math.floor(rng() * 2)
      for (let s = 0; s < st; s++) place(pickVaried(MODELS.port.container, 'cont'), x, promZ, { y: s * 0.42, rotY: rng() < 0.5 ? 0 : Math.PI / 2, block: s === 0 })
    } else if (rng() < 0.1) place(pickVaried(MODELS.port.pile, 'pile'), x, promZ, { rotY: rng() * 6.28, block: true })
  }
  // muelles de madera caminables
  const piers = [8, 17, 26]
  for (const px of piers)
    for (let d = 0; d < 4; d++) {
      const gz = COAST_Z + d
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.02), new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 1 }))
      plank.position.set(worldX(px), -0.02, worldZ(gz)); plank.castShadow = plank.receiveShadow = true
      cityGroup.add(plank)
      if (inGrid(px, gz)) blocked[idx(px, gz)] = 0
    }
  // barcos en movimiento
  const addShip = (url, wx, wz, dir, spd) => {
    const o = inst(url); if (!o) return
    o.position.set(wx, -0.15, wz); o.rotation.y = Math.atan2(dir.x, dir.z)
    cityGroup.add(o); ships.push({ o, dir, spd })
  }
  addShip(MODELS.port.ships[0], worldX(6), worldZ(GRID + 5), { x: 1, z: 0 }, 0.5)
  addShip(pickVaried(MODELS.port.ships, 's'), worldX(28), worldZ(GRID + 8), { x: -1, z: 0 }, 0.35)
  for (const px of piers) {
    const b = inst(pickVaried(MODELS.port.boats, 'bo'))
    if (b) { b.position.set(worldX(px + 1), -0.12, worldZ(COAST_Z + 1.5)); b.rotation.y = rng() * 6.28; cityGroup.add(b) }
  }
  for (let i = 0; i < 6; i++) place(pickVaried(MODELS.port.buoy, 'buoy'), 3 + i * 5, COAST_Z + 3, { y: -0.08 })
}
function updateShips(dt) {
  const lim = HALF + 22
  for (const s of ships) {
    s.o.position.x += s.dir.x * s.spd * dt
    s.o.position.z += s.dir.z * s.spd * dt
    if (s.o.position.x > lim) s.o.position.x = -lim
    if (s.o.position.x < -lim) s.o.position.x = lim
  }
}

// ============================================================
//  Decoracion: faroles en veredas de avenidas ppales
// ============================================================
function buildStreetFurniture() {
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.8 })
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffd27a, emissiveIntensity: 0.8 })
  const lamp = (gx, gz, side) => {
    const g = new THREE.Group()
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.5, 8), lampMat); pole.position.y = 0.25
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), glowMat); head.position.y = 0.5
    g.add(pole, head); g.traverse((m) => { if (m.isMesh) m.castShadow = true })
    g.position.set(worldX(gx) + side * 0.42, 0, worldZ(gz))
    cityGroup.add(g)
  }
  for (const mx of MAIN_X)
    for (let z = 2; z < COAST_Z - 1; z += 3) { lamp(mx, z, -1); lamp(mx, z, 1) }
}

// ============================================================
//  Trafico: autos que recorren la grilla vial
// ============================================================
const cars = []
const DIRV = [[1, 0], [0, 1], [-1, 0], [0, -1]] // E,S,W,N
function rightOffset([dx, dz]) { return [-dz * 0.22, dx * 0.22] }
function spawnCars(n) {
  const roadCells = []
  for (let x = 0; x < GRID; x++) for (let z = 0; z < COAST_Z; z++) if (roadTile[idx(x, z)]) roadCells.push([x, z])
  for (let i = 0; i < n; i++) {
    const [x, z] = roadCells[Math.floor(rng() * roadCells.length)]
    // direccion inicial valida
    const dirs = [0, 1, 2, 3].filter((d) => isRoad(x + DIRV[d][0], z + DIRV[d][1]))
    if (!dirs.length) continue
    const d = dirs[Math.floor(rng() * dirs.length)]
    const o = inst(pickVaried(MODELS.car, 'car'))
    if (!o) continue
    cityGroup.add(o)
    cars.push({ o, tile: { x, z }, dir: d, t: 0, from: { x, z }, to: { x: x + DIRV[d][0], z: z + DIRV[d][1] }, spd: 1.6 + rng() * 1.2 })
  }
}
function chooseNextDir(car) {
  const { x, z } = car.to
  const back = (car.dir + 2) % 4
  // preferir seguir derecho; sino girar; evitar retroceso salvo sin salida
  const opts = [0, 1, 2, 3].filter((d) => d !== back && isRoad(x + DIRV[d][0], z + DIRV[d][1]))
  let d
  if (opts.includes(car.dir) && rng() < 0.7) d = car.dir
  else if (opts.length) d = opts[Math.floor(rng() * opts.length)]
  else d = back // sin salida: volver
  car.dir = d; car.from = { x, z }; car.to = { x: x + DIRV[d][0], z: z + DIRV[d][1] }; car.t = 0; car.tile = { x, z }
}
function updateCars(dt) {
  for (const c of cars) {
    c.t += (c.spd * dt) / TILE
    while (c.t >= 1) { c.t -= 1; chooseNextDir(c) }
    const [ox, oz] = rightOffset(DIRV[c.dir])
    const wx = worldX(c.from.x) + (worldX(c.to.x) - worldX(c.from.x)) * c.t + ox
    const wz = worldZ(c.from.z) + (worldZ(c.to.z) - worldZ(c.from.z)) * c.t + oz
    c.o.position.set(wx, ROAD_TOP, wz)
    c.o.rotation.y = Math.atan2(DIRV[c.dir][0], DIRV[c.dir][1])
  }
}

// ============================================================
//  Personaje + click-to-move (A*) + animacion
// ============================================================
const CHAR_Y = ROAD_TOP
let character = null, avatarRing = null
let charTile = { ...spawnPlaza }
let path = [], moveTarget = null
const SPEED = 3.4
const tileCenter = (x, z) => new THREE.Vector3(worldX(x), CHAR_Y, worldZ(z))

function nearestWalkable(x, z) {
  if (inGrid(x, z) && !blocked[idx(x, z)]) return { x, z }
  for (let r = 1; r < GRID; r++)
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue
        const nx = x + dx, nz = z + dz
        if (inGrid(nx, nz) && !blocked[idx(nx, nz)]) return { x: nx, z: nz }
      }
  return { x, z }
}
function findPath(start, goal) {
  if (blocked[idx(goal.x, goal.z)]) return []
  const key = (a) => idx(a.x, a.z)
  const open = [start], came = new Map()
  const gs = new Map([[key(start), 0]])
  const h = (a) => Math.abs(a.x - goal.x) + Math.abs(a.z - goal.z)
  const fs = new Map([[key(start), h(start)]])
  let guard = 0
  while (open.length && guard++ < 20000) {
    let bi = 0
    for (let i = 1; i < open.length; i++) if ((fs.get(key(open[i])) ?? 1e9) < (fs.get(key(open[bi])) ?? 1e9)) bi = i
    const cur = open.splice(bi, 1)[0]
    if (cur.x === goal.x && cur.z === goal.z) {
      const out = []; let c = cur, k = key(c)
      while (came.has(k)) { out.unshift(c); c = came.get(k); k = key(c) }
      return out
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx, nz = cur.z + dz
      if (!inGrid(nx, nz) || blocked[idx(nx, nz)]) continue
      const nk = idx(nx, nz), tg = (gs.get(key(cur)) ?? 1e9) + 1
      if (tg < (gs.get(nk) ?? 1e9)) { came.set(nk, cur); gs.set(nk, tg); fs.set(nk, tg + h({ x: nx, z: nz })); if (!open.some((o) => idx(o.x, o.z) === nk)) open.push({ x: nx, z: nz }) }
    }
  }
  return []
}

let mixer = null, actions = {}, curAction = null
function playAction(name) {
  const next = actions[name]
  if (!next || next === curAction) return
  next.reset().fadeIn(0.2).play(); if (curAction) curAction.fadeOut(0.2); curAction = next
}
function spawnCharacter() {
  const start = nearestWalkable(charTile.x, charTile.z)
  charTile = start
  const url = pickVaried(MODELS.character, 'char')
  character = url ? inst(url) : null
  if (!character) { character = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.24, 4, 8), new THREE.MeshStandardMaterial({ color: 0x2f6fd0 })); character.castShadow = true }
  else if (charAnims.has(url)) {
    mixer = new THREE.AnimationMixer(character)
    const clips = charAnims.get(url)
    for (const n of ['idle', 'walk']) { const c = THREE.AnimationClip.findByName(clips, n); if (c) actions[n] = mixer.clipAction(c) }
    playAction('idle')
  }
  character.position.copy(tileCenter(start.x, start.z))
  scene.add(character)
  avatarRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 28), new THREE.MeshBasicMaterial({ color: 0x66c2ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }))
  avatarRing.rotation.x = -Math.PI / 2; scene.add(avatarRing)
  controls.target.copy(character.position).setY(0.5); controls.update()
}
let followLock = false
const followTarget = new THREE.Vector3()
function updateCameraFollow() { if (character && !followLock) { followTarget.copy(character.position).setY(0.5); controls.target.lerp(followTarget, 0.12) } }

const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.26, 24), new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }))
marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker)
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2()
const worldToTile = (p) => ({ x: Math.round((p.x + HALF - TILE / 2) / TILE), z: Math.round((p.z + HALF - TILE / 2) / TILE) })
function moveTo(cxp, cyp) {
  ndc.x = (cxp / window.innerWidth) * 2 - 1; ndc.y = -(cyp / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(ndc, camera)
  const hit = raycaster.intersectObjects([land, water])[0]
  if (!hit) return
  let t = worldToTile(hit.point)
  if (!inGrid(t.x, t.z)) return
  t = nearestWalkable(t.x, t.z)
  const p = findPath(charTile, t)
  if (p.length) { path = p; moveTarget = null; marker.position.copy(tileCenter(t.x, t.z)).setY(0.05); marker.visible = true }
}
let downX = 0, downY = 0, downT = 0
canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; downT = performance.now() })
canvas.addEventListener('pointerup', (e) => { if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6 && performance.now() - downT < 400) moveTo(e.clientX, e.clientY) })
function updateCharacter(dt) {
  if (!character) return
  if (!moveTarget && path.length) { const n = path.shift(); moveTarget = tileCenter(n.x, n.z); charTile = n }
  if (moveTarget) {
    const dir = new THREE.Vector3().subVectors(moveTarget, character.position); dir.y = 0
    const d = dir.length()
    if (d < 0.02) { character.position.copy(moveTarget); moveTarget = null; if (!path.length) { marker.visible = false; playAction('idle') } }
    else { dir.normalize(); character.position.addScaledVector(dir, Math.min(SPEED * dt, d)); character.rotation.y = Math.atan2(dir.x, dir.z); playAction('walk') }
  }
  if (avatarRing) avatarRing.position.set(character.position.x, 0.04, character.position.z)
}

// ---------- HUD ----------
function buildHud() {
  const skills = [{ name: 'Combat', emoji: '⚔️' }, { name: 'Wood', emoji: '🪓' }, { name: 'Mining', emoji: '⛏️' }, { name: 'Fishing', emoji: '🎣' }, { name: 'Cooking', emoji: '🍳' }]
  const wrap = document.getElementById('hudSkills')
  const btn = 'assets/ui/blue/button_square_depth_gloss.png'
  skills.forEach((s) => { const b = document.createElement('button'); b.className = 'skill'; b.style.backgroundImage = `url("${btn}")`; b.innerHTML = `<span class="emoji">${s.emoji}</span><span>${s.name}</span>`; wrap.appendChild(b) })
}

// ============================================================
//  Debug piezas de calle (?debugroads)
// ============================================================
async function debugRoads() {
  await preloadAll()
  land.visible = false; water.visible = false; scene.background = new THREE.Color(0x445566)
  const pieces = ['road-straight', 'road-bend', 'road-intersection', 'road-end']
  pieces.forEach((p, i) => {
    const o = inst(`assets/city/roads/${p}.glb`); if (o) { o.position.set(i * 1.25, 0, 0); scene.add(o) }
    const rx = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xff2222 })); rx.position.set(i * 1.25 + 0.3, 0.06, 0); scene.add(rx)
    const bz = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), new THREE.MeshBasicMaterial({ color: 0x2222ff })); bz.position.set(i * 1.25, 0.06, 0.3); scene.add(bz)
  })
  camera.position.set(1.9, 30, 0.001); controls.target.set(1.9, 0, 0); camera.zoom = 5.5; camera.updateProjectionMatrix(); controls.update()
  loaderEl.classList.add('hidden'); animate()
}

// ============================================================
//  Arranque — construccion en orden
// ============================================================
let started = false
function showScene() { if (started) return; started = true; loaderEl.classList.add('hidden'); document.getElementById('hud').classList.remove('hidden') }

async function start() {
  if (new URLSearchParams(location.search).has('debugroads')) return debugRoads()
  buildHud()
  const watchdog = setTimeout(() => { if (!started) { loaderErr.textContent = 'Carga lenta: mostrando lo disponible…'; buildAndShow() } }, 20000)
  try { await preloadAll() } catch (e) { console.error(e); loaderErr.textContent = 'Error de carga: ' + (e?.message || e) }
  clearTimeout(watchdog); buildAndShow()
}

let built = false
function buildAndShow() {
  if (built) return
  built = true
  try {
    buildRoads()                 // 2) red vial
    for (let bz = 0; bz < BZ.length; bz++) for (let bx = 0; bx < BX.length; bx++) fillBlock(bx, bz) // 3-9) distritos
    buildPlazaCenter()           // plaza central
    buildPort()                  // 10) especiales / logistica
    buildStreetFurniture()       // 11) decoracion
    spawnCars(22)                // trafico
    scene.add(cityGroup)
    spawnCharacter()
  } catch (e) { console.error(e); loaderErr.textContent = 'Error armando la ciudad: ' + (e?.message || e) }
  if (failed.length) console.warn('No cargaron:', failed)
  window.__kintana = {
    charPos: () => (character ? character.position.toArray().map((n) => +n.toFixed(2)) : null),
    moveToClient: (x, y) => moveTo(x, y), failed, blockedCount: blocked.reduce((a, b) => a + b, 0),
    state: () => ({ pathLen: path.length, hasTarget: !!moveTarget, charTile: { ...charTile }, raf }),
    tick: (dt) => { if (mixer) mixer.update(dt); updateCharacter(dt); updateCars(dt); updateShips(dt) },
    zoom: (z) => { camera.zoom = z; camera.updateProjectionMatrix() },
    topdown: () => { followLock = true; controls.maxPolarAngle = Math.PI; camera.position.set(0, 80, 0.01); controls.target.set(0, 0, -1); camera.zoom = 0.62; camera.updateProjectionMatrix(); controls.update() },
  }
  showScene(); if (!raf) animate()
}

let raf = 0, last = performance.now()
function animate() {
  raf = requestAnimationFrame(animate)
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now
  if (mixer) mixer.update(dt)
  updateCharacter(dt); updateCars(dt); updateShips(dt); updateCameraFollow(); controls.update()
  renderer.render(scene, camera)
}
window.addEventListener('resize', () => { setCameraFrustum(); renderer.setSize(window.innerWidth, window.innerHeight) })
start()
