// Manifiesto de modelos GLB usados por el prototipo.
// Rutas relativas a /public (Vite sirve /public en la raiz).
const CITY = 'assets/city'

export const MODELS = {
  // --- Calles (tiles 1x1) ---
  road: {
    straight: `${CITY}/roads/road-straight.glb`,
    crossroad: `${CITY}/roads/road-crossroad.glb`,
    intersection: `${CITY}/roads/road-intersection.glb`, // T
    bend: `${CITY}/roads/road-bend.glb`,
    end: `${CITY}/roads/road-end.glb`,
  },

  // --- Edificios comerciales (centro / mixto) ---
  commercial: [
    'building-a', 'building-b', 'building-c', 'building-d', 'building-e',
    'building-f', 'building-g', 'building-h', 'building-i', 'building-j',
    'building-k', 'building-l', 'building-m', 'building-n',
  ].map((n) => `${CITY}/commercial/${n}.glb`),

  // --- Rascacielos (downtown) ---
  skyscraper: [
    'building-skyscraper-a', 'building-skyscraper-b', 'building-skyscraper-c',
    'building-skyscraper-d', 'building-skyscraper-e',
  ].map((n) => `${CITY}/commercial/${n}.glb`),

  // --- Casas suburbanas ---
  house: [
    'building-type-a', 'building-type-b', 'building-type-c', 'building-type-d',
    'building-type-e', 'building-type-f', 'building-type-g', 'building-type-h',
    'building-type-i', 'building-type-j', 'building-type-k', 'building-type-l',
    'building-type-m', 'building-type-n', 'building-type-o', 'building-type-p',
  ].map((n) => `${CITY}/suburban/${n}.glb`),

  // --- Verde ---
  tree: [
    `${CITY}/suburban/tree-large.glb`,
    `${CITY}/suburban/tree-small.glb`,
  ],
  planter: `${CITY}/suburban/planter.glb`,
  fence: `${CITY}/suburban/fence.glb`,

  // --- Autos (escala distinta al resto: se normalizan en runtime) ---
  car: [
    'sedan', 'taxi', 'police', 'suv', 'suv-luxury', 'van',
    'truck', 'delivery', 'hatchback-sports', 'sedan-sports', 'garbage-truck',
  ].map((n) => `${CITY}/cars/${n}.glb`),
}

// Lista plana para precargar todo de una.
export function allModelUrls() {
  const urls = new Set()
  Object.values(MODELS.road).forEach((u) => urls.add(u))
  MODELS.commercial.forEach((u) => urls.add(u))
  MODELS.skyscraper.forEach((u) => urls.add(u))
  MODELS.house.forEach((u) => urls.add(u))
  MODELS.tree.forEach((u) => urls.add(u))
  urls.add(MODELS.planter)
  urls.add(MODELS.fence)
  MODELS.car.forEach((u) => urls.add(u))
  return [...urls]
}
