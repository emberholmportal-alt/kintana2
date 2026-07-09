// Manifiesto de modelos GLB. Rutas relativas a /public.
const CITY = 'assets/city'
const g = (base, names) => names.map((n) => `${base}/${n}.glb`)

export const MODELS = {
  // --- Calles ---
  road: {
    straight: `${CITY}/roads/road-straight.glb`,
    crossroad: `${CITY}/roads/road-crossroad.glb`,
  },

  // --- Edificios ---
  commercial: g(`${CITY}/commercial`, [
    'building-a', 'building-b', 'building-c', 'building-d', 'building-e',
    'building-f', 'building-g', 'building-h', 'building-i', 'building-j',
    'building-k', 'building-l', 'building-m', 'building-n',
  ]),
  skyscraper: g(`${CITY}/commercial`, [
    'building-skyscraper-a', 'building-skyscraper-b', 'building-skyscraper-c',
    'building-skyscraper-d', 'building-skyscraper-e',
  ]),
  house: g(`${CITY}/suburban`, [
    'building-type-a', 'building-type-b', 'building-type-c', 'building-type-d',
    'building-type-e', 'building-type-f', 'building-type-g', 'building-type-h',
    'building-type-i', 'building-type-j', 'building-type-k', 'building-type-l',
    'building-type-m', 'building-type-n', 'building-type-o', 'building-type-p',
  ]),

  // --- Verde ---
  tree: g(`${CITY}/suburban`, ['tree-large', 'tree-small']),
  planter: `${CITY}/suburban/planter.glb`,
  fence: `${CITY}/suburban/fence.glb`,

  // --- Autos ---
  car: g(`${CITY}/cars`, [
    'sedan', 'taxi', 'police', 'suv', 'suv-luxury', 'van',
    'truck', 'delivery', 'hatchback-sports', 'sedan-sports', 'garbage-truck',
  ]),

  // --- Personajes ---
  character: g('assets/characters', [
    'character-male-a', 'character-male-b', 'character-male-c',
    'character-female-a', 'character-female-b', 'character-female-c',
  ]),

  // --- Mercado (feria) ---
  market: g('assets/market', [
    'floor', 'shelf-boxes', 'shelf-bags', 'shelf-end', 'display-bread',
    'display-fruit', 'freezer', 'cash-register', 'shopping-cart', 'character-employee',
  ]),

  // --- Skatepark ---
  skate: g('assets/skate', [
    'floor-concrete', 'half-pipe', 'bowl-side', 'rail-high', 'rail-low',
    'rail-slope', 'obstacle-box', 'obstacle-middle', 'structure-platform',
    'steps', 'character-skate-boy', 'character-skate-girl',
  ]),

  // --- Cementerio ---
  graveyard: {
    props: g('assets/graveyard', [
      'gravestone-round', 'gravestone-cross', 'gravestone-bevel',
      'gravestone-wide', 'gravestone-broken', 'grave', 'cross', 'cross-wood',
    ]),
    crypt: g('assets/graveyard', ['crypt', 'crypt-small', 'crypt-large']),
    fence: 'assets/graveyard/iron-fence.glb',
    gate: 'assets/graveyard/fence-gate.glb',
    tree: 'assets/graveyard/pine.glb',
    lantern: 'assets/graveyard/lantern-glass.glb',
  },

  // --- Puerto ---
  port: {
    boats: g('assets/port', [
      'boat-row-small', 'boat-fishing-small', 'boat-speed-a', 'boat-sail-a', 'boat-tug-a',
    ]),
    ships: g('assets/port', ['ship-cargo-a', 'ship-ocean-liner-small']),
    container: g('assets/port', ['cargo-container-a', 'cargo-container-b', 'cargo-container-c']),
    pile: g('assets/port', ['cargo-pile-a', 'cargo-pile-b']),
    buoy: g('assets/port', ['buoy', 'buoy-flag']),
  },
}

// Lista plana para precargar solo lo que se usa.
export function allModelUrls() {
  const urls = new Set()
  const add = (v) => {
    if (!v) return
    if (typeof v === 'string') urls.add(v)
    else if (Array.isArray(v)) v.forEach(add)
    else Object.values(v).forEach(add)
  }
  add(MODELS)
  return [...urls]
}
