import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MODELS, allModelUrls } from './assets.js'

// ============================================================
//  KINTANA2 — prototipo de mundo (Fase 1, tarea 4)
//  Ciudad moderna low-poly con camara isometrica tipo Kintara.
//  Assets: Kenney City Kit (CC0). Todo procedural desde una grilla.
// ============================================================

const GRID = 29 // mundo de 29x29 tiles
const TILE = 1 // tamaño de tile en unidades del mundo (roads = 1x1)
const HALF = (GRID * TILE) / 2
const ROAD_TOP = 0.02

// PRNG determinista (mulberry32) para que el layout sea estable.
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
scene.background = new THREE.Color(0x9fd3ef) // cielo celeste
scene.fog = new THREE.Fog(0x9fd3ef, 55, 120)

// Camara ortografica isometrica (angulo clasico ~35.26deg, azimut 45deg).
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
camera.lookAt(0, 0, 0)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.target.set(0, 2, 0)
controls.minZoom = 0.5
controls.maxZoom = 3.5
controls.maxPolarAngle = Math.PI / 2.15 // no bajar debajo del horizonte
controls.update()

// ---------- Luces ----------
const hemi = new THREE.HemisphereLight(0xdff1ff, 0x5a6b52, 0.9)
scene.add(hemi)

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
scene.add(sun)
scene.add(sun.target)

// ---------- Suelo (pasto) ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(GRID + 20, GRID + 20),
  new THREE.MeshStandardMaterial({ color: 0x7dae58, roughness: 1 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// ============================================================
//  Carga de modelos
// ============================================================
const loaderEl = document.getElementById('loader')
const barFill = document.getElementById('barFill')
const loaderPct = document.getElementById('loaderPct')

const manager = new THREE.LoadingManager()
manager.onProgress = (_url, loaded, total) => {
  const pct = Math.round((loaded / total) * 100)
  barFill.style.width = pct + '%'
  loaderPct.textContent = pct + '%'
}
const gltfLoader = new GLTFLoader(manager)

const cache = new Map() // url -> THREE.Object3D template normalizado

function loadGLB(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => reject(new Error('No se pudo cargar ' + url + ': ' + err.message))
    )
  })
}

// Normaliza un modelo: sombra, y centra x/z, apoya la base en y=0.
// footprint => si se pasa, escala uniforme para que max(ancho,largo) = footprint tiles.
// carLen    => si se pasa, escala uniforme para que el LARGO (z) = carLen tiles.
function normalize(obj, { footprint, carLen } = {}) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  const box = new THREE.Box3().setFromObject(obj)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)

  let scale = 1
  if (footprint) scale = footprint / Math.max(size.x, size.z)
  else if (carLen) scale = carLen / size.z

  const wrapper = new THREE.Group()
  obj.scale.setScalar(scale)
  // recentrar en x/z y apoyar base en el suelo
  obj.position.x = -center.x * scale
  obj.position.z = -center.z * scale
  obj.position.y = -box.min.y * scale
  wrapper.add(obj)
  return wrapper
}

async function preloadAll() {
  const urls = allModelUrls()
  const scenes = await Promise.all(urls.map((u) => loadGLB(u)))
  urls.forEach((u, i) => {
    const isCar = u.includes('/cars/')
    const isRoad = u.includes('/roads/')
    let opts
    if (isRoad) opts = { footprint: TILE } // roads ya son 1x1, footprint 1
    else if (isCar) opts = { carLen: 0.82 }
    else if (u.includes('skyscraper')) opts = { footprint: 0.96 }
    else if (u.includes('/suburban/tree')) opts = { footprint: u.includes('large') ? 0.85 : 0.55 }
    else if (u.includes('planter') || u.includes('fence')) opts = { footprint: 0.8 }
    else opts = { footprint: 0.9 } // edificios
    cache.set(u, normalize(scenes[i], opts))
  })
}

// clon del template cacheado
function inst(url) {
  return cache.get(url).clone(true)
}

// ============================================================
//  Layout de la ciudad
// ============================================================
// Coordenada de tile (gx,gz) -> mundo, centrado en el origen.
function worldX(gx) { return gx * TILE - HALF + TILE / 2 }
function worldZ(gz) { return gz * TILE - HALF + TILE / 2 }

// Avenidas: lineas de calle cada 6 tiles. Bloques de 5x5 entre ellas.
const ROAD_LINES = [5, 11, 17, 23]
const isRoadCol = (x) => ROAD_LINES.includes(x)
const isRoadRow = (z) => ROAD_LINES.includes(z)
const isRoad = (x, z) => isRoadCol(x) || isRoadRow(z)

const cityGroup = new THREE.Group()

function placeRoads() {
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      if (!isRoad(x, z)) continue
      const col = isRoadCol(x)
      const row = isRoadRow(z)
      let url = MODELS.road.straight
      let rotY = 0
      if (col && row) {
        url = MODELS.road.crossroad // cruce 4 vias
      } else if (col) {
        rotY = 0 // calle vertical (N-S)
      } else {
        rotY = Math.PI / 2 // calle horizontal (E-O)
      }
      const t = inst(url)
      t.position.set(worldX(x), 0, worldZ(z))
      t.rotation.y = rotY
      cityGroup.add(t)
    }
  }
}

// Bloques de ciudad: bandas entre avenidas.
// Bandas de tiles: [0-4] [6-10] [12-16] [18-22] [24-28]
const BANDS = [[0, 4], [6, 10], [12, 16], [18, 22], [24, 28]]

// Zona de cada bloque (bx,bz de 0..4). Centro = plaza/hub.
function zoneOf(bx, bz) {
  if (bx === 2 && bz === 2) return 'plaza'
  if (bx >= 3 && bz >= 3) return 'downtown'
  if (bx <= 1 && bz <= 1) return 'suburban'
  if (bx <= 1 && bz >= 3) return 'park'
  return 'mixed'
}

// Orienta un edificio para que "mire" hacia la calle mas cercana del borde.
function faceStreet(x, z, loX, hiX, loZ, hiZ) {
  if (x === loX) return Math.PI / 2
  if (x === hiX) return -Math.PI / 2
  if (z === loZ) return Math.PI
  if (z === hiZ) return 0
  return rng() * Math.PI * 2
}

function addBuilding(url, x, z, rotY, footprintJitter = true) {
  const b = inst(url)
  b.position.set(worldX(x), 0, worldZ(z))
  b.rotation.y = rotY + (footprintJitter ? (rng() - 0.5) * 0.08 : 0)
  cityGroup.add(b)
}

function fillBlock(bx, bz) {
  const [loX, hiX] = BANDS[bx]
  const [loZ, hiZ] = BANDS[bz]
  const zone = zoneOf(bx, bz)
  const isBorder = (x, z) => x === loX || x === hiX || z === loZ || z === hiZ

  for (let x = loX; x <= hiX; x++) {
    for (let z = loZ; z <= hiZ; z++) {
      const border = isBorder(x, z)
      const rot = faceStreet(x, z, loX, hiX, loZ, hiZ)

      if (zone === 'plaza') {
        // Centro comercial (banco + tiendas) en el borde; centro abierto con verde.
        if (border) {
          if (rng() < 0.85) addBuilding(pick(MODELS.commercial), x, z, rot)
        } else if (rng() < 0.35) {
          addBuilding(rng() < 0.5 ? MODELS.planter : pick(MODELS.tree), x, z, rng() * 6.28)
        }
      } else if (zone === 'downtown') {
        if (border) {
          if (rng() < 0.92) addBuilding(pick(MODELS.skyscraper), x, z, rot)
        } else if (rng() < 0.55) {
          addBuilding(pick(MODELS.commercial), x, z, rot)
        }
      } else if (zone === 'suburban') {
        if (border) {
          if (rng() < 0.8) addBuilding(pick(MODELS.house), x, z, rot)
        } else if (rng() < 0.4) {
          addBuilding(pick(MODELS.tree), x, z, rng() * 6.28)
        }
      } else if (zone === 'park') {
        // parque: arboles + canteros distribuidos, sin edificios
        if (rng() < 0.55) {
          addBuilding(rng() < 0.75 ? pick(MODELS.tree) : MODELS.planter, x, z, rng() * 6.28)
        }
      } else {
        // mixed: comercial de media altura
        if (border) {
          if (rng() < 0.78) addBuilding(pick(MODELS.commercial), x, z, rot)
        } else if (rng() < 0.3) {
          addBuilding(pick(MODELS.tree), x, z, rng() * 6.28)
        }
      }
    }
  }
}

function placeBlocks() {
  for (let bx = 0; bx < BANDS.length; bx++)
    for (let bz = 0; bz < BANDS.length; bz++) fillBlock(bx, bz)
}

// Autos sobre calles rectas, orientados segun la direccion de la calle.
function placeCars() {
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      if (!isRoad(x, z)) continue
      const col = isRoadCol(x)
      const row = isRoadRow(z)
      if (col && row) continue // no en cruces
      if (rng() > 0.16) continue
      const car = inst(pick(MODELS.car))
      const laneOff = 0.22 // desplazar a un carril
      if (col) {
        // calle vertical: auto mira N-S
        car.position.set(worldX(x) + (rng() < 0.5 ? laneOff : -laneOff), ROAD_TOP, worldZ(z))
        car.rotation.y = rng() < 0.5 ? 0 : Math.PI
      } else {
        car.position.set(worldX(x), ROAD_TOP, worldZ(z) + (rng() < 0.5 ? laneOff : -laneOff))
        car.rotation.y = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2
      }
      cityGroup.add(car)
    }
  }
}

// ---------- HUD: skills con assets UI de Kenney ----------
function buildHud() {
  const skills = [
    { name: 'Combat', emoji: '⚔️' },
    { name: 'Wood', emoji: '🪓' },
    { name: 'Mining', emoji: '⛏️' },
    { name: 'Fishing', emoji: '🎣' },
    { name: 'Cooking', emoji: '🍳' },
  ]
  const wrap = document.getElementById('hudSkills')
  const btnImg = 'assets/ui/blue/button_square_depth_gloss.png'
  skills.forEach((s) => {
    const b = document.createElement('button')
    b.className = 'skill'
    b.style.backgroundImage = `url("${btnImg}")`
    b.innerHTML = `<span class="emoji">${s.emoji}</span><span>${s.name}</span>`
    b.title = s.name + ' (placeholder)'
    wrap.appendChild(b)
  })
}

// ============================================================
//  Arranque
// ============================================================
async function start() {
  buildHud()
  try {
    await preloadAll()
  } catch (e) {
    loaderPct.textContent = 'Error cargando assets'
    console.error(e)
    return
  }

  placeRoads()
  placeBlocks()
  placeCars()
  scene.add(cityGroup)

  // ocultar loader, mostrar HUD
  loaderEl.classList.add('hidden')
  document.getElementById('hud').classList.remove('hidden')

  animate()
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  setCameraFrustum()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

start()
