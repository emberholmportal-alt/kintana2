// Manifiesto de modelos GLB. Rutas relativas a /public.
const CITY = 'assets/city'
const g = (base, names) => names.map((n) => `${base}/${n}.glb`)

export const MODELS = {
  // --- Calles ---
  road: {
    straight: `${CITY}/roads/road-straight.glb`,
    crossroad: `${CITY}/roads/road-crossroad.glb`,
    bend: `${CITY}/roads/road-bend.glb`,
    tee: `${CITY}/roads/road-intersection.glb`,
    end: `${CITY}/roads/road-end.glb`,
  },

  // --- Edificios ---
  commercial: g(`${CITY}/commercial`, ['building-a', 'building-b', 'building-c', 'building-d', 'building-e', 'building-f', 'building-g', 'building-h', 'building-i', 'building-j', 'building-k', 'building-l', 'building-m', 'building-n']),
  skyscraper: g(`${CITY}/commercial`, ['building-skyscraper-a', 'building-skyscraper-b', 'building-skyscraper-c', 'building-skyscraper-d', 'building-skyscraper-e']),
  house: g(`${CITY}/suburban`, ['building-type-a', 'building-type-b', 'building-type-c', 'building-type-d', 'building-type-e', 'building-type-f', 'building-type-g', 'building-type-h', 'building-type-i', 'building-type-j', 'building-type-k', 'building-type-l', 'building-type-m', 'building-type-n', 'building-type-o', 'building-type-p', 'building-type-q', 'building-type-r']),
  industrial: g(`${CITY}/industrial`, ['building-a', 'building-b', 'building-c', 'building-d', 'building-e', 'building-f', 'building-g', 'building-h', 'building-i', 'building-j', 'building-k', 'building-l', 'building-m', 'building-n', 'building-o']),
  chimney: g(`${CITY}/industrial`, ['chimney-large', 'chimney-medium', 'chimney-small', 'detail-tank']),

  // props suburbanos
  suburbTree: g(`${CITY}/suburban`, ['tree-large', 'tree-small']),
  fence: `${CITY}/suburban/fence.glb`,
  driveway: g(`${CITY}/suburban`, ['driveway-long', 'driveway-short']),
  path: g(`${CITY}/suburban`, ['path-long', 'path-short', 'path-stones-long']),

  // --- Autos ---
  car: g(`${CITY}/cars`, ['sedan', 'taxi', 'police', 'suv', 'suv-luxury', 'van', 'truck', 'delivery', 'hatchback-sports', 'sedan-sports', 'garbage-truck']),

  // --- Personajes ---
  character: g('assets/characters', ['character-male-a', 'character-male-b', 'character-male-c', 'character-female-a', 'character-female-b', 'character-female-c']),

  // --- Minimarket (piezas para construir el local) ---
  market: {
    floor: 'assets/market/floor.glb',
    wall: 'assets/market/wall.glb',
    wallWindow: 'assets/market/wall-window.glb',
    wallDoor: 'assets/market/wall-door-rotate.glb',
    wallCorner: 'assets/market/wall-corner.glb',
    cash: 'assets/market/cash-register.glb',
    freezer: 'assets/market/freezer.glb',
    shelf: g('assets/market', ['shelf-boxes', 'shelf-bags', 'shelf-end']),
    display: g('assets/market', ['display-bread', 'display-fruit']),
    cart: 'assets/market/shopping-cart.glb',
    employee: 'assets/market/character-employee.glb',
  },

  // --- Skate ---
  skate: {
    floor: 'assets/skate/floor-concrete.glb',
    halfpipe: 'assets/skate/half-pipe.glb',
    bowl: 'assets/skate/bowl-side.glb',
    rail: g('assets/skate', ['rail-high', 'rail-low', 'rail-slope']),
    obstacle: g('assets/skate', ['obstacle-box', 'obstacle-middle', 'structure-platform']),
    steps: 'assets/skate/steps.glb',
  },

  // --- Cementerio ---
  graveyard: {
    props: g('assets/graveyard', ['gravestone-round', 'gravestone-cross', 'gravestone-bevel', 'gravestone-wide', 'gravestone-broken', 'cross', 'cross-wood']),
    crypt: g('assets/graveyard', ['crypt', 'crypt-small', 'crypt-large']),
    fence: 'assets/graveyard/iron-fence.glb',
    gate: 'assets/graveyard/fence-gate.glb',
    tree: 'assets/graveyard/pine.glb',
    lantern: 'assets/graveyard/lantern-glass.glb',
    bench: 'assets/graveyard/bench.glb',
  },

  // --- Puerto ---
  port: {
    boats: g('assets/port', ['boat-row-small', 'boat-fishing-small', 'boat-speed-a', 'boat-sail-a', 'boat-tug-a']),
    ships: g('assets/port', ['ship-cargo-a', 'ship-ocean-liner-small']),
    container: g('assets/port', ['cargo-container-a', 'cargo-container-b', 'cargo-container-c']),
    pile: g('assets/port', ['cargo-pile-a', 'cargo-pile-b']),
    buoy: g('assets/port', ['buoy', 'buoy-flag']),
  },

  // --- Naturaleza (bosque / plaza) ---
  nature: {
    tree: g('assets/nature', ['tree_pineDefaultA', 'tree_pineTallA', 'tree_pineRoundA', 'tree_pineSmallA', 'tree_oak', 'tree_default', 'tree_detailed', 'tree_cone', 'tree_fat', 'tree_tall', 'tree_thin', 'tree_small']),
    rock: g('assets/nature', ['rock_largeA', 'rock_largeB', 'rock_smallA', 'rock_smallB', 'rock_tallA', 'rock_tallB']),
    plant: g('assets/nature', ['plant_bush', 'plant_bushLarge', 'plant_bushSmall', 'grass', 'grass_large', 'grass_leafs']),
    flower: g('assets/nature', ['flower_redA', 'flower_yellowA', 'flower_purpleA']),
    mushroom: g('assets/nature', ['mushroom_red', 'mushroom_redGroup', 'mushroom_tan']),
    stump: g('assets/nature', ['stump_round', 'log', 'log_stack']),
    statue: g('assets/nature', ['statue_obelisk', 'statue_column', 'statue_ring', 'statue_head']),
  },

  // --- Pirata (caleta costera) ---
  pirate: {
    ship: g('assets/pirate', ['ship-pirate-small', 'ship-pirate-medium', 'ship-pirate-large', 'ship-small', 'ship-medium']),
    wreck: 'assets/pirate/ship-wreck.glb',
    palm: g('assets/pirate', ['palm-straight', 'palm-bend', 'palm-detailed-straight']),
    prop: g('assets/pirate', ['barrel', 'crate', 'crate-bottles', 'chest', 'cannon', 'cannon-mobile']),
    flag: g('assets/pirate', ['flag-pirate', 'flag-pirate-high']),
    dock: g('assets/pirate', ['structure-platform-dock', 'structure-platform-dock-small', 'platform-planks', 'platform']),
    sand: g('assets/pirate', ['patch-sand', 'patch-sand-foliage', 'rocks-sand-a', 'rocks-sand-b', 'grass-patch']),
    tower: 'assets/pirate/tower-complete-small.glb',
  },

  // --- Survival (campamento en el bosque) ---
  survival: {
    rock: g('assets/survival', ['rock-a', 'rock-b', 'rock-c']),
    grass: g('assets/survival', ['grass', 'grass-large']),
    camp: g('assets/survival', ['campfire-pit', 'campfire-stand', 'chest', 'barrel', 'box', 'box-large', 'resource-wood', 'resource-planks', 'signpost']),
    tent: g('assets/survival', ['structure-canvas']),
  },
}

export function allModelUrls() {
  const urls = new Set()
  const add = (v) => { if (!v) return; if (typeof v === 'string') urls.add(v); else if (Array.isArray(v)) v.forEach(add); else Object.values(v).forEach(add) }
  add(MODELS)
  return [...urls]
}
