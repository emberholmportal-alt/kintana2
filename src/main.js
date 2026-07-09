import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { MODELS, allModelUrls } from './assets.js'

// ============================================================
//  KINTANA2 — prototipo de mundo
//  Ciudad moderna low-poly con puerto, cam isometrica tipo Kintara,
//  personaje con click-to-move. Escala anclada al personaje.
//  Assets: Kenney (CC0).
// ============================================================

const GRID = 40, TILE = 1, HALF = 20
const ROAD_TOP = 0.02
const SHORE_Z = 31        // tiles con z >= SHORE_Z son agua (puerto)
const CHAR_H = 0.6        // altura del personaje = ancla de escala

function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = makeRng(20260709)
const pick = (arr) => arr[Math.floor(rng() * arr.length)]

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
scene.fog = new THREE.Fog(0x9fd3ef, 60, 130)

let viewSize = 15
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 260)
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
controls.maxZoom = 6
controls.maxPolarAngle = Math.PI / 2.15
controls.enablePan = false
controls.update()

// ---------- Luces ----------
scene.add(new THREE.HemisphereLight(0xdff1ff, 0x6b7a5a, 0.95))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.6)
sun.position.set(26, 40, 18)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 140
const S = HALF + 10
Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S })
sun.shadow.bias = -0.0004
scene.add(sun, sun.target)

// ---------- Agua + tierra ----------
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 260),
  new THREE.MeshStandardMaterial({ color: 0x3a9ad0, roughness: 0.65, metalness: 0 })
)
water.rotation.x = -Math.PI / 2
water.position.y = -0.25
water.receiveShadow = true
scene.add(water)

// worldX/Z: tile -> mundo (centrado)
const worldX = (gx) => gx * TILE - HALF + TILE / 2
const worldZ = (gz) => gz * TILE - HALF + TILE / 2

// isla: la tierra bordea la ciudad y termina en la costa sur (SHORE_Z),
// dejando agua alrededor (N/E/O) y la bahia del puerto al sur.
const landN = worldZ(0) - 1
const landS = worldZ(SHORE_Z) - 0.5
const land = new THREE.Mesh(
  new THREE.PlaneGeometry(GRID + 2, landS - landN),
  new THREE.MeshStandardMaterial({ color: 0x7dae58, roughness: 1 })
)
land.rotation.x = -Math.PI / 2
land.position.set(0, 0, (landN + landS) / 2)
land.receiveShadow = true
scene.add(land)

// ============================================================
//  Carga tolerante a fallos
// ============================================================
const loaderEl = document.getElementById('loader')
const barFill = document.getElementById('barFill')
const loaderPct = document.getElementById('loaderPct')
const loaderErr = document.getElementById('loaderErr')

const gltfLoader = new GLTFLoader()
const cache = new Map()
const charAnims = new Map() // url -> AnimationClip[]
const failed = []
const isChar = (u) => u.includes('character')

function loadGLB(url) {
  return new Promise((resolve) => {
    gltfLoader.load(url, (g) => resolve(g), undefined,
      () => { failed.push(url); resolve(null) })
  })
}

// Escala: height (con clamp de footprint), footprint, length o scale fijo.
function normalize(obj, o = {}) {
  obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true } })
  const box = new THREE.Box3().setFromObject(obj)
  const size = new THREE.Vector3(), center = new THREE.Vector3()
  box.getSize(size); box.getCenter(center)
  let s = 1
  if (o.scale) s = o.scale
  else if (o.footprint) s = o.footprint / Math.max(size.x, size.z)
  else if (o.length) s = o.length / Math.max(size.x, size.z)
  else if (o.height) {
    s = o.height / size.y
    if (o.maxFootprint) s = Math.min(s, o.maxFootprint / Math.max(size.x, size.z))
  }
  const w = new THREE.Group()
  obj.scale.setScalar(s)
  obj.position.set(-center.x * s, -box.min.y * s, -center.z * s)
  w.add(obj)
  w.userData.footprint = Math.max(size.x, size.z) * s
  return w
}

// Escala por categoria (segun ruta del asset)
function optsFor(u) {
  if (u.includes('/roads/')) return { footprint: TILE }
  if (u.includes('/cars/')) return { length: 0.9 }
  if (u.includes('/characters/') || u.includes('character-')) return { height: CHAR_H }
  if (u.includes('skyscraper')) return { height: 3.2, maxFootprint: 1.4 }
  if (u.includes('/commercial/')) return { height: 1.7, maxFootprint: 1.25 }
  if (u.includes('/suburban/tree')) return { height: u.includes('large') ? 1.3 : 0.85 }
  if (u.includes('/suburban/planter')) return { footprint: 0.7 }
  if (u.includes('/suburban/fence')) return { footprint: 0.85 }
  if (u.includes('/suburban/')) return { height: 1.25, maxFootprint: 1.55 } // casas
  // mercado
  if (u.endsWith('market/floor.glb')) return { footprint: 1.0 }
  if (u.includes('/market/')) return { height: 0.5 }
  // skate
  if (u.includes('/skate/floor')) return { footprint: 1.0 }
  if (u.includes('/skate/half-pipe') || u.includes('/skate/bowl') || u.includes('/skate/structure')) return { footprint: 1.0 }
  if (u.includes('/skate/')) return { height: 0.4 }
  // cementerio
  if (u.includes('/graveyard/pine')) return { height: 1.2 }
  if (u.includes('/graveyard/crypt')) return { footprint: 0.95 }
  if (u.includes('/graveyard/brick-wall') || u.includes('/graveyard/iron-fence') || u.includes('/graveyard/fence')) return { footprint: 0.95 }
  if (u.includes('/graveyard/lantern')) return { height: 0.7 }
  if (u.includes('/graveyard/')) return { height: 0.55 } // lapidas, cruces
  // puerto
  if (u.includes('ship-ocean-liner')) return { length: 9 }
  if (u.includes('ship-cargo')) return { length: 6 }
  if (u.includes('/port/boat')) return { length: 1.7 }
  if (u.includes('cargo-container')) return { length: 1.1 }
  if (u.includes('cargo-pile')) return { footprint: 1.1 }
  if (u.includes('/port/buoy')) return { height: 0.5 }
  return { footprint: 0.95 }
}

async function preloadAll() {
  const urls = allModelUrls()
  let done = 0
  const setBar = () => {
    const p = Math.round((done / urls.length) * 100)
    barFill.style.width = p + '%'; loaderPct.textContent = p + '%'
  }
  setBar()
  const q = urls.slice(), POOL = 12
  async function worker() {
    while (q.length) {
      const u = q.shift()
      const g = await loadGLB(u)
      if (g) {
        cache.set(u, normalize(g.scene, optsFor(u)))
        if (isChar(u) && g.animations?.length) charAnims.set(u, g.animations)
      }
      done++; setBar()
    }
  }
  await Promise.all(Array.from({ length: POOL }, worker))
}

// personajes = skinned mesh: hay que clonar con SkeletonUtils o no renderiza
const inst = (url) => {
  const t = cache.get(url)
  if (!t) return null
  return isChar(url) ? skeletonClone(t) : t.clone(true)
}
const pickLoaded = (list) => { const ok = list.filter((u) => cache.has(u)); return ok.length ? ok[Math.floor(rng() * ok.length)] : null }

// ============================================================
//  Grilla / ocupacion
// ============================================================
const idx = (x, z) => z * GRID + x
const inGrid = (x, z) => x >= 0 && z >= 0 && x < GRID && z < GRID
const blocked = new Uint8Array(GRID * GRID)
const cityGroup = new THREE.Group()

// agua = tiles al sur de la costa: no caminables por defecto
for (let x = 0; x < GRID; x++)
  for (let z = SHORE_Z; z < GRID; z++) blocked[idx(x, z)] = 1

// coloca un modelo en un tile; block=true marca ocupacion
function add(url, gx, gz, { rotY = 0, y = 0, block = false, jitter = 0 } = {}) {
  if (!url) return null
  const o = inst(url)
  if (!o) return null
  o.position.set(worldX(gx), y, worldZ(gz))
  o.rotation.y = rotY + (jitter ? (rng() - 0.5) * jitter : 0)
  cityGroup.add(o)
  if (block && inGrid(gx, gz)) blocked[idx(gx, gz)] = 1
  return o
}

// ---------- Calles: avenidas de 2 tiles ----------
const AVE = new Set([9, 10, 19, 20, 29, 30])
const isAveCol = (x) => AVE.has(x)
const isAveRow = (z) => AVE.has(z)
const isRoad = (x, z) => (isAveCol(x) && z < SHORE_Z) || (isAveRow(z) && z < SHORE_Z)

function placeRoads() {
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < SHORE_Z; z++) {
      if (!isRoad(x, z)) continue
      const col = isAveCol(x), row = isAveRow(z)
      const url = (col && row) ? MODELS.road.crossroad : MODELS.road.straight
      add(url, x, z, { rotY: (!col && row) ? Math.PI / 2 : 0 })
    }
}

// ---------- Bloques / distritos ----------
const BANDX = [[0, 8], [11, 18], [21, 28], [31, 39]]
const BANDZ = [[0, 8], [11, 18], [21, 28]]
// bz\bx  0         1        2         3
const DISTRICTS = [
  ['suburban', 'park', 'downtown', 'market'],
  ['suburban', 'plaza', 'downtown', 'mixed'],
  ['skate', 'mixed', 'downtown', 'graveyard'],
]

function faceOut(x, z, lo, hi, lz, hz) {
  if (x === lo) return Math.PI / 2
  if (x === hi) return -Math.PI / 2
  if (z === lz) return Math.PI
  if (z === hz) return 0
  return rng() * 6.28
}

function fillBlock(bx, bz) {
  const [lo, hi] = BANDX[bx], [lz, hz] = BANDZ[bz]
  const dist = DISTRICTS[bz][bx]
  const isEdge = (x, z) => x === lo || x === hi || z === lz || z === hz
  const perim = {
    suburban: MODELS.house, plaza: MODELS.commercial, downtown: MODELS.skyscraper,
    market: MODELS.commercial, mixed: MODELS.commercial, skate: MODELS.house,
    park: MODELS.house, graveyard: MODELS.house,
  }[dist]

  for (let x = lo; x <= hi; x++)
    for (let z = lz; z <= hz; z++) {
      const edge = isEdge(x, z)
      const rot = faceOut(x, z, lo, hi, lz, hz)
      if (edge) {
        // perimetro: edificios con huecos (para entrar caminando)
        if (rng() < 0.72) add(pickLoaded(perim), x, z, { rotY: rot, block: true, jitter: 0.08 })
        continue
      }
      // interior por distrito
      fillInterior(dist, x, z, lo, hi, lz, hz)
    }
}

function fillInterior(dist, x, z, lo, hi, lz, hz) {
  const cx = (lo + hi) / 2, cz = (lz + hz) / 2
  switch (dist) {
    case 'downtown':
      if (rng() < 0.6) add(pickLoaded(MODELS.skyscraper), x, z, { block: true, jitter: 0.1 })
      else if (rng() < 0.4) add(pickLoaded(MODELS.commercial), x, z, { block: true })
      break
    case 'suburban':
      if (rng() < 0.4) add(pickLoaded(MODELS.house), x, z, { rotY: rng() * 6.28, block: true })
      else if (rng() < 0.3) add(pickLoaded(MODELS.tree), x, z, { rotY: rng() * 6.28, block: true })
      break
    case 'plaza':
      if (rng() < 0.22) add(rng() < 0.5 ? MODELS.planter : pickLoaded(MODELS.tree), x, z, { rotY: rng() * 6.28, block: true })
      break
    case 'park':
      if (rng() < 0.5) add(rng() < 0.7 ? pickLoaded(MODELS.tree) : MODELS.planter, x, z, { rotY: rng() * 6.28, block: true })
      break
    case 'mixed':
      if (rng() < 0.35) add(pickLoaded(rng() < 0.5 ? MODELS.commercial : MODELS.house), x, z, { block: true })
      break
    case 'market': {
      // feria al aire libre: puestos sobre el pasto (sin piso damero)
      const r = rng()
      if (r < 0.5) add(pickLoaded(MODELS.market.slice(1, 9)), x, z, { rotY: rng() * 6.28, block: true })
      else if (r < 0.62) add(pickLoaded(MODELS.tree), x, z, { rotY: rng() * 6.28, block: true })
      break
    }
    case 'skate': {
      add(MODELS.skate[0], x, z, { y: 0.01 }) // floor-concrete
      const r = rng()
      if (Math.abs(x - cx) < 1 && Math.abs(z - cz) < 1) add(MODELS.skate[1], x, z, { rotY: Math.PI / 2 * Math.floor(rng() * 4), block: true }) // half-pipe centro
      else if (r < 0.28) add(pickLoaded(MODELS.skate.slice(2, 10)), x, z, { rotY: rng() * 6.28, block: true }) // rampas/rieles/obstaculos
      break
    }
    case 'graveyard': {
      const bl = z === lz + 1 || z === hz - 1 || x === lo + 1 || x === hi - 1
      if (bl) { if (rng() < 0.7) add(MODELS.graveyard.fence, x, z, { rotY: (z === lz + 1 || z === hz - 1) ? Math.PI / 2 : 0, block: true }) }
      else if (rng() < 0.14) add(pickLoaded(MODELS.graveyard.crypt), x, z, { rotY: Math.PI, block: true })
      else if (rng() < 0.6) add(pickLoaded(MODELS.graveyard.props), x, z, { rotY: Math.PI + (rng() - 0.5) * 0.3, block: true })
      else if (rng() < 0.2) add(MODELS.graveyard.tree, x, z, { rotY: rng() * 6.28, block: true })
      break
    }
  }
}

function placeBlocks() {
  for (let bz = 0; bz < BANDZ.length; bz++)
    for (let bx = 0; bx < BANDX.length; bx++) fillBlock(bx, bz)
}

// ---------- Autos en avenidas ----------
function placeCars() {
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < SHORE_Z; z++) {
      if (!isRoad(x, z)) continue
      const col = isAveCol(x), row = isAveRow(z)
      if (col && row) continue
      if (rng() > 0.14) continue
      const c = inst(pickLoaded(MODELS.car))
      if (!c) continue
      const off = 0.24
      if (col) { c.position.set(worldX(x) + (rng() < 0.5 ? off : -off), ROAD_TOP, worldZ(z)); c.rotation.y = rng() < 0.5 ? 0 : Math.PI }
      else { c.position.set(worldX(x), ROAD_TOP, worldZ(z) + (rng() < 0.5 ? off : -off)); c.rotation.y = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2 }
      cityGroup.add(c)
    }
}

// ---------- Puerto (costa sur) ----------
function buildPort() {
  const promZ = SHORE_Z - 1 // paseo costero (ultima fila de tierra)
  // paseo: contenedores y grua-pile cerca de la costa
  for (let x = 2; x < GRID - 2; x += 1) {
    if (rng() < 0.18) {
      const stack = 1 + Math.floor(rng() * 2)
      for (let s = 0; s < stack; s++)
        add(pickLoaded(MODELS.port.container), x, promZ, { y: s * 0.42, rotY: rng() < 0.5 ? 0 : Math.PI / 2, block: s === 0 })
    } else if (rng() < 0.12) {
      add(pickLoaded(MODELS.port.pile), x, promZ, { rotY: rng() * 6.28, block: true })
    }
  }
  // muelles de madera (planks) que entran al agua + barcos
  const piers = [6, 16, 26, 34]
  for (const px of piers) {
    for (let d = 0; d < 5; d++) {
      const gz = SHORE_Z + d
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.12, 1.02),
        new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 1 })
      )
      plank.position.set(worldX(px), -0.02, worldZ(gz))
      plank.castShadow = plank.receiveShadow = true
      cityGroup.add(plank)
      if (inGrid(px, gz)) blocked[idx(px, gz)] = 0 // muelle caminable
    }
    // barco chico amarrado
    add(pickLoaded(MODELS.port.boats), px + (rng() < 0.5 ? 1 : -1), SHORE_Z + 2, { y: -0.12, rotY: rng() * 6.28 })
  }
  // barcos grandes flotando mar adentro (fuera de la grilla)
  const ship = (url, wx, wz, ry) => {
    const o = inst(url); if (!o) return
    o.position.set(wx, -0.15, wz); o.rotation.y = ry; cityGroup.add(o)
  }
  ship(pickLoaded(MODELS.port.ships), worldX(12), worldZ(GRID + 4), 0.2)
  ship(MODELS.port.ships[0], worldX(28), worldZ(GRID + 6), -0.3)
  // boyas
  for (let i = 0; i < 6; i++) add(pickLoaded(MODELS.port.buoy), 3 + i * 6, SHORE_Z + 4, { y: -0.1 })
}

// ============================================================
//  Personaje + click-to-move (A*)
// ============================================================
const CHAR_Y = ROAD_TOP
let character = null
let charTile = { x: 15, z: 15 }
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
  while (open.length) {
    let bi = 0
    for (let i = 1; i < open.length; i++)
      if ((fs.get(key(open[i])) ?? 1e9) < (fs.get(key(open[bi])) ?? 1e9)) bi = i
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
      if (tg < (gs.get(nk) ?? 1e9)) {
        came.set(nk, cur); gs.set(nk, tg); fs.set(nk, tg + h({ x: nx, z: nz }))
        if (!open.some((o) => idx(o.x, o.z) === nk)) open.push({ x: nx, z: nz })
      }
    }
  }
  return []
}

let mixer = null, actions = {}, curAction = null
function playAction(name) {
  const next = actions[name]
  if (!next || next === curAction) return
  next.reset().fadeIn(0.2).play()
  if (curAction) curAction.fadeOut(0.2)
  curAction = next
}

function spawnCharacter() {
  const start = nearestWalkable(charTile.x, charTile.z)
  charTile = start
  const url = pickLoaded(MODELS.character)
  character = url ? inst(url) : null
  if (!character) {
    character = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.24, 4, 8), new THREE.MeshStandardMaterial({ color: 0x2f6fd0 }))
    character.castShadow = true
  } else if (charAnims.has(url)) {
    mixer = new THREE.AnimationMixer(character)
    const clips = charAnims.get(url)
    for (const n of ['idle', 'walk']) {
      const c = THREE.AnimationClip.findByName(clips, n)
      if (c) actions[n] = mixer.clipAction(c)
    }
    playAction('idle')
  }
  character.position.copy(tileCenter(start.x, start.z))
  scene.add(character)
  // indicador de avatar (siempre visible bajo el personaje)
  avatarRing = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.32, 28),
    new THREE.MeshBasicMaterial({ color: 0x66c2ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })
  )
  avatarRing.rotation.x = -Math.PI / 2
  scene.add(avatarRing)
  controls.target.copy(character.position).setY(0.5)
  controls.update()
}
let avatarRing = null

const followTarget = new THREE.Vector3()
function updateCameraFollow() {
  if (!character) return
  followTarget.copy(character.position).setY(0.5)
  controls.target.lerp(followTarget, 0.12)
}

const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.16, 0.26, 24),
  new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
)
marker.rotation.x = -Math.PI / 2; marker.visible = false
scene.add(marker)

const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2()
const worldToTile = (p) => ({ x: Math.round((p.x + HALF - TILE / 2) / TILE), z: Math.round((p.z + HALF - TILE / 2) / TILE) })
function moveTo(clientX, clientY) {
  ndc.x = (clientX / window.innerWidth) * 2 - 1
  ndc.y = -(clientY / window.innerHeight) * 2 + 1
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
canvas.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6 && performance.now() - downT < 400) moveTo(e.clientX, e.clientY)
})

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
  const skills = [
    { name: 'Combat', emoji: '⚔️' }, { name: 'Wood', emoji: '🪓' },
    { name: 'Mining', emoji: '⛏️' }, { name: 'Fishing', emoji: '🎣' }, { name: 'Cooking', emoji: '🍳' },
  ]
  const wrap = document.getElementById('hudSkills')
  const btn = 'assets/ui/blue/button_square_depth_gloss.png'
  skills.forEach((s) => {
    const b = document.createElement('button')
    b.className = 'skill'; b.style.backgroundImage = `url("${btn}")`
    b.innerHTML = `<span class="emoji">${s.emoji}</span><span>${s.name}</span>`
    wrap.appendChild(b)
  })
}

// ============================================================
//  Arranque
// ============================================================
let started = false
function showScene() {
  if (started) return
  started = true
  loaderEl.classList.add('hidden')
  document.getElementById('hud').classList.remove('hidden')
}

async function start() {
  buildHud()
  const watchdog = setTimeout(() => { if (!started) { loaderErr.textContent = 'Carga lenta: mostrando lo disponible…'; buildAndShow() } }, 20000)
  try { await preloadAll() } catch (e) { console.error(e); loaderErr.textContent = 'Error de carga: ' + (e?.message || e) }
  clearTimeout(watchdog)
  buildAndShow()
}

let built = false
function buildAndShow() {
  if (built) return
  built = true
  try {
    placeRoads(); placeBlocks(); placeCars(); buildPort()
    scene.add(cityGroup)
    spawnCharacter()
  } catch (e) { console.error(e); loaderErr.textContent = 'Error armando la ciudad: ' + (e?.message || e) }
  if (failed.length) console.warn('Assets que no cargaron:', failed)
  window.__kintana = {
    charPos: () => (character ? character.position.toArray().map((n) => +n.toFixed(2)) : null),
    moveToClient: (x, y) => moveTo(x, y),
    failed, blockedCount: blocked.reduce((a, b) => a + b, 0),
    zoom: (z) => { camera.zoom = z; camera.updateProjectionMatrix() },
    charInfo: () => {
      if (!character) return null
      const bb = new THREE.Box3().setFromObject(character)
      const sz = new THREE.Vector3(); bb.getSize(sz)
      let meshes = 0; character.traverse((m) => { if (m.isMesh || m.isSkinnedMesh) meshes++ })
      return { size: sz.toArray().map((n) => +n.toFixed(2)), min: bb.min.toArray().map((n) => +n.toFixed(2)), meshes, skinned: character.type }
    },
    camTarget: () => controls.target.toArray().map((n) => +n.toFixed(2)),
  }
  showScene()
  if (!raf) animate()
}

let raf = 0, last = performance.now()
function animate() {
  raf = requestAnimationFrame(animate)
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now
  if (mixer) mixer.update(dt)
  updateCharacter(dt); updateCameraFollow(); controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => { setCameraFrustum(); renderer.setSize(window.innerWidth, window.innerHeight) })
start()
