import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MODELS, allModelUrls } from './assets.js'

// ============================================================
//  KINTANA2 — prototipo de mundo (Fase 1, tareas 4-5)
//  Ciudad moderna low-poly, camara isometrica tipo Kintara,
//  personaje placeholder con click-to-move (A* sobre grilla).
//  Assets: Kenney (CC0). Layout procedural desde una grilla.
// ============================================================

const GRID = 29 // mundo de 29x29 tiles
const TILE = 1
const HALF = (GRID * TILE) / 2
const ROAD_TOP = 0.02

// PRNG determinista (mulberry32) => layout estable.
function makeRng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = makeRng(1337)
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
scene.fog = new THREE.Fog(0x9fd3ef, 55, 120)

let viewSize = 17
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200)
function setCameraFrustum() {
  const aspect = window.innerWidth / window.innerHeight
  camera.left = -viewSize * aspect
  camera.right = viewSize * aspect
  camera.top = viewSize
  camera.bottom = -viewSize
  camera.updateProjectionMatrix()
}
setCameraFrustum()
camera.position.set(40, 40, 40)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.target.set(0, 2, 0)
controls.minZoom = 0.5
controls.maxZoom = 4.5
controls.maxPolarAngle = Math.PI / 2.15
controls.enablePan = false // la camara sigue al jugador (estilo Kintara)
controls.update()

// ---------- Luces ----------
scene.add(new THREE.HemisphereLight(0xdff1ff, 0x5a6b52, 0.9))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.6)
sun.position.set(24, 34, 14)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 120
const S = HALF + 6
sun.shadow.camera.left = -S
sun.shadow.camera.right = S
sun.shadow.camera.top = S
sun.shadow.camera.bottom = -S
sun.shadow.bias = -0.0004
scene.add(sun, sun.target)

// ---------- Suelo (pasto) ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(GRID + 20, GRID + 20),
  new THREE.MeshStandardMaterial({ color: 0x7dae58, roughness: 1 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// ============================================================
//  Carga de modelos — tolerante a fallos, con concurrencia limitada
// ============================================================
const loaderEl = document.getElementById('loader')
const barFill = document.getElementById('barFill')
const loaderPct = document.getElementById('loaderPct')
const loaderErr = document.getElementById('loaderErr')

const gltfLoader = new GLTFLoader()
const cache = new Map()   // url -> template normalizado
const failed = []         // urls que no cargaron

function loadGLB(url) {
  return new Promise((resolve) => {
    gltfLoader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      () => { failed.push(url); resolve(null) } // fallo NO fatal
    )
  })
}

// Normaliza: sombra + centra x/z + apoya base en y=0.
// footprint => escala para max(x,z)=footprint. carLen => largo(z)=carLen.
// height => altura(y)=height.
function normalize(obj, { footprint, carLen, height } = {}) {
  obj.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true }
  })
  const box = new THREE.Box3().setFromObject(obj)
  const size = new THREE.Vector3(); const center = new THREE.Vector3()
  box.getSize(size); box.getCenter(center)
  let scale = 1
  if (footprint) scale = footprint / Math.max(size.x, size.z)
  else if (carLen) scale = carLen / size.z
  else if (height) scale = height / size.y
  const wrapper = new THREE.Group()
  obj.scale.setScalar(scale)
  obj.position.x = -center.x * scale
  obj.position.z = -center.z * scale
  obj.position.y = -box.min.y * scale
  wrapper.add(obj)
  return wrapper
}

function optsFor(u) {
  if (u.includes('/roads/')) return { footprint: TILE }
  if (u.includes('/cars/')) return { carLen: 0.82 }
  if (u.includes('/characters/')) return { height: 0.55 }
  if (u.includes('skyscraper')) return { footprint: 0.96 }
  if (u.includes('/suburban/tree')) return { footprint: u.includes('large') ? 0.85 : 0.55 }
  if (u.includes('planter') || u.includes('fence')) return { footprint: 0.8 }
  return { footprint: 0.9 }
}

// carga con pool de concurrencia (evita colgar la red con 60 requests a la vez)
async function preloadAll() {
  const urls = allModelUrls()
  let loaded = 0
  const setBar = () => {
    const pct = Math.round((loaded / urls.length) * 100)
    barFill.style.width = pct + '%'
    loaderPct.textContent = pct + '%'
  }
  setBar()
  const queue = urls.slice()
  const POOL = 12
  async function worker() {
    while (queue.length) {
      const u = queue.shift()
      const s = await loadGLB(u)
      if (s) cache.set(u, normalize(s, optsFor(u)))
      loaded++; setBar()
    }
  }
  await Promise.all(Array.from({ length: POOL }, worker))
}

// clon del template; null si el modelo fallo.
function inst(url) {
  const t = cache.get(url)
  return t ? t.clone(true) : null
}
// elige un url de la lista que SI cargo
function pickLoaded(list) {
  const ok = list.filter((u) => cache.has(u))
  return ok.length ? ok[Math.floor(rng() * ok.length)] : null
}

// ============================================================
//  Grilla / layout
// ============================================================
function worldX(gx) { return gx * TILE - HALF + TILE / 2 }
function worldZ(gz) { return gz * TILE - HALF + TILE / 2 }
const idx = (x, z) => z * GRID + x
const inGrid = (x, z) => x >= 0 && z >= 0 && x < GRID && z < GRID
const blocked = new Uint8Array(GRID * GRID) // 1 = no caminable

const ROAD_LINES = [5, 11, 17, 23]
const isRoadCol = (x) => ROAD_LINES.includes(x)
const isRoadRow = (z) => ROAD_LINES.includes(z)
const isRoad = (x, z) => isRoadCol(x) || isRoadRow(z)

const cityGroup = new THREE.Group()

function placeRoads() {
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < GRID; z++) {
      if (!isRoad(x, z)) continue
      const col = isRoadCol(x), row = isRoadRow(z)
      let url = MODELS.road.straight, rotY = 0
      if (col && row) url = MODELS.road.crossroad
      else if (!col) rotY = Math.PI / 2
      const t = inst(url)
      if (!t) continue
      t.position.set(worldX(x), 0, worldZ(z))
      t.rotation.y = rotY
      cityGroup.add(t)
    }
}

const BANDS = [[0, 4], [6, 10], [12, 16], [18, 22], [24, 28]]
function zoneOf(bx, bz) {
  if (bx === 2 && bz === 2) return 'plaza'
  if (bx >= 3 && bz >= 3) return 'downtown'
  if (bx <= 1 && bz <= 1) return 'suburban'
  if (bx <= 1 && bz >= 3) return 'park'
  return 'mixed'
}
function faceStreet(x, z, loX, hiX, loZ, hiZ) {
  if (x === loX) return Math.PI / 2
  if (x === hiX) return -Math.PI / 2
  if (z === loZ) return Math.PI
  if (z === hiZ) return 0
  return rng() * Math.PI * 2
}
function addBuilding(url, x, z, rotY, jitter = true) {
  if (!url) return
  const b = inst(url)
  if (!b) return
  b.position.set(worldX(x), 0, worldZ(z))
  b.rotation.y = rotY + (jitter ? (rng() - 0.5) * 0.08 : 0)
  cityGroup.add(b)
  blocked[idx(x, z)] = 1 // ocupa el tile
}

function fillBlock(bx, bz) {
  const [loX, hiX] = BANDS[bx], [loZ, hiZ] = BANDS[bz]
  const zone = zoneOf(bx, bz)
  const border = (x, z) => x === loX || x === hiX || z === loZ || z === hiZ
  for (let x = loX; x <= hiX; x++)
    for (let z = loZ; z <= hiZ; z++) {
      const b = border(x, z)
      const rot = faceStreet(x, z, loX, hiX, loZ, hiZ)
      if (zone === 'plaza') {
        if (b) { if (rng() < 0.85) addBuilding(pickLoaded(MODELS.commercial), x, z, rot) }
        else if (rng() < 0.3) addBuilding(rng() < 0.5 ? MODELS.planter : pickLoaded(MODELS.tree), x, z, rng() * 6.28)
      } else if (zone === 'downtown') {
        if (b) { if (rng() < 0.92) addBuilding(pickLoaded(MODELS.skyscraper), x, z, rot) }
        else if (rng() < 0.55) addBuilding(pickLoaded(MODELS.commercial), x, z, rot)
      } else if (zone === 'suburban') {
        if (b) { if (rng() < 0.8) addBuilding(pickLoaded(MODELS.house), x, z, rot) }
        else if (rng() < 0.4) addBuilding(pickLoaded(MODELS.tree), x, z, rng() * 6.28)
      } else if (zone === 'park') {
        if (rng() < 0.55) addBuilding(rng() < 0.75 ? pickLoaded(MODELS.tree) : MODELS.planter, x, z, rng() * 6.28)
      } else {
        if (b) { if (rng() < 0.78) addBuilding(pickLoaded(MODELS.commercial), x, z, rot) }
        else if (rng() < 0.3) addBuilding(pickLoaded(MODELS.tree), x, z, rng() * 6.28)
      }
    }
}
function placeBlocks() {
  for (let bx = 0; bx < BANDS.length; bx++)
    for (let bz = 0; bz < BANDS.length; bz++) fillBlock(bx, bz)
}

function placeCars() {
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < GRID; z++) {
      if (!isRoad(x, z)) continue
      const col = isRoadCol(x), row = isRoadRow(z)
      if (col && row) continue
      if (rng() > 0.16) continue
      const car = inst(pickLoaded(MODELS.car))
      if (!car) continue
      const off = 0.22
      if (col) {
        car.position.set(worldX(x) + (rng() < 0.5 ? off : -off), ROAD_TOP, worldZ(z))
        car.rotation.y = rng() < 0.5 ? 0 : Math.PI
      } else {
        car.position.set(worldX(x), ROAD_TOP, worldZ(z) + (rng() < 0.5 ? off : -off))
        car.rotation.y = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2
      }
      cityGroup.add(car)
    }
}

// ============================================================
//  Personaje + click-to-move (A* sobre la grilla)
// ============================================================
const CHAR_Y = ROAD_TOP
let character = null
let charTile = { x: 14, z: 14 }
let path = []          // array de {x,z} pendientes
let moveTarget = null  // Vector3 del proximo waypoint
const SPEED = 3.2      // tiles por segundo

function tileCenter(x, z) { return new THREE.Vector3(worldX(x), CHAR_Y, worldZ(z)) }

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

// A* 4-conexo
function findPath(start, goal) {
  if (blocked[idx(goal.x, goal.z)]) return []
  const open = [start]
  const came = new Map()
  const g = new Map([[idx(start.x, start.z), 0]])
  const h = (a) => Math.abs(a.x - goal.x) + Math.abs(a.z - goal.z)
  const f = new Map([[idx(start.x, start.z), h(start)]])
  const key = (a) => idx(a.x, a.z)
  while (open.length) {
    let bi = 0
    for (let i = 1; i < open.length; i++)
      if ((f.get(key(open[i])) ?? 1e9) < (f.get(key(open[bi])) ?? 1e9)) bi = i
    const cur = open.splice(bi, 1)[0]
    if (cur.x === goal.x && cur.z === goal.z) {
      const out = []
      let k = key(cur), c = cur
      while (came.has(k)) { out.unshift(c); c = came.get(k); k = key(c) }
      return out
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx, nz = cur.z + dz
      if (!inGrid(nx, nz) || blocked[idx(nx, nz)]) continue
      const nk = idx(nx, nz)
      const tg = (g.get(key(cur)) ?? 1e9) + 1
      if (tg < (g.get(nk) ?? 1e9)) {
        came.set(nk, cur)
        g.set(nk, tg)
        f.set(nk, tg + h({ x: nx, z: nz }))
        if (!open.some((o) => idx(o.x, o.z) === nk)) open.push({ x: nx, z: nz })
      }
    }
  }
  return []
}

function spawnCharacter() {
  const start = nearestWalkable(charTile.x, charTile.z)
  charTile = start
  const url = pickLoaded(MODELS.character)
  character = url ? inst(url) : null
  if (!character) { // fallback: capsula si fallo el modelo
    character = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.12, 0.3, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2f6fd0 })
    )
    character.castShadow = true
  }
  character.position.copy(tileCenter(start.x, start.z))
  scene.add(character)
  controls.target.copy(character.position).setY(0.6)
  controls.update()
}

// la camara sigue suavemente al personaje
const followTarget = new THREE.Vector3()
function updateCameraFollow() {
  if (!character) return
  followTarget.copy(character.position).setY(0.6)
  controls.target.lerp(followTarget, 0.12)
}

// marcador de destino
const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.18, 0.28, 24),
  new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
)
marker.rotation.x = -Math.PI / 2
marker.visible = false
scene.add(marker)

const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2()
function worldToTile(p) {
  return {
    x: Math.round((p.x + HALF - TILE / 2) / TILE),
    z: Math.round((p.z + HALF - TILE / 2) / TILE),
  }
}
function moveTo(clientX, clientY) {
  ndc.x = (clientX / window.innerWidth) * 2 - 1
  ndc.y = -(clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(ndc, camera)
  const hit = raycaster.intersectObject(ground)[0]
  if (!hit) return
  let t = worldToTile(hit.point)
  if (!inGrid(t.x, t.z)) return
  t = nearestWalkable(t.x, t.z)
  const p = findPath(charTile, t)
  if (p.length) {
    path = p
    moveTarget = null
    marker.position.copy(tileCenter(t.x, t.z)).setY(0.04)
    marker.visible = true
  }
}

// distinguir click de drag (drag = orbitar)
let downX = 0, downY = 0, downT = 0
canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; downT = performance.now() })
canvas.addEventListener('pointerup', (e) => {
  const dist = Math.hypot(e.clientX - downX, e.clientY - downY)
  if (dist < 6 && performance.now() - downT < 400) moveTo(e.clientX, e.clientY)
})

function updateCharacter(dt) {
  if (!character) return
  if (!moveTarget && path.length) {
    const n = path.shift()
    moveTarget = tileCenter(n.x, n.z)
    charTile = n
  }
  if (moveTarget) {
    const pos = character.position
    const dir = new THREE.Vector3().subVectors(moveTarget, pos)
    dir.y = 0
    const d = dir.length()
    if (d < 0.02) {
      pos.copy(moveTarget)
      moveTarget = null
      if (!path.length) marker.visible = false
    } else {
      dir.normalize()
      const step = Math.min(SPEED * dt, d)
      pos.addScaledVector(dir, step)
      character.rotation.y = Math.atan2(dir.x, dir.z)
    }
  }
}

// ---------- HUD ----------
function buildHud() {
  const skills = [
    { name: 'Combat', emoji: '⚔️' }, { name: 'Wood', emoji: '🪓' },
    { name: 'Mining', emoji: '⛏️' }, { name: 'Fishing', emoji: '🎣' },
    { name: 'Cooking', emoji: '🍳' },
  ]
  const wrap = document.getElementById('hudSkills')
  const btn = 'assets/ui/blue/button_square_depth_gloss.png'
  skills.forEach((s) => {
    const b = document.createElement('button')
    b.className = 'skill'
    b.style.backgroundImage = `url("${btn}")`
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
  // watchdog: pase lo que pase, no dejar el loader colgado > 20s
  const watchdog = setTimeout(() => {
    if (!started) { loaderErr.textContent = 'Carga lenta: mostrando lo disponible…'; buildAndShow() }
  }, 20000)

  try {
    await preloadAll()
  } catch (e) {
    console.error(e)
    loaderErr.textContent = 'Error de carga: ' + (e?.message || e)
  }
  clearTimeout(watchdog)
  buildAndShow()
}

let built = false
function buildAndShow() {
  if (built) return
  built = true
  try {
    placeRoads(); placeBlocks(); placeCars()
    scene.add(cityGroup)
    spawnCharacter()
  } catch (e) {
    console.error(e)
    loaderErr.textContent = 'Error armando la ciudad: ' + (e?.message || e)
  }
  if (failed.length) console.warn('Assets que no cargaron:', failed)
  // hook de debug (inofensivo): permite inspeccionar/mover desde consola
  window.__kintana = {
    charPos: () => (character ? character.position.toArray().map((n) => +n.toFixed(2)) : null),
    moveToClient: (x, y) => moveTo(x, y),
    failed,
    blockedCount: blocked.reduce((a, b) => a + b, 0),
    zoom: (z) => { camera.zoom = z; camera.updateProjectionMatrix() },
  }
  showScene()
  if (!raf) animate()
}

let raf = 0
let last = performance.now()
function animate() {
  raf = requestAnimationFrame(animate)
  const now = performance.now()
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  updateCharacter(dt)
  updateCameraFollow()
  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  setCameraFrustum()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

start()
