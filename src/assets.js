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
  chimney: g(`${CITY}/industrial`, ['chimney-large', 'chimney-medium', 'chimney-small']),
  tank: `${CITY}/industrial/detail-tank.glb`,
  // casas/torres pre-armadas del kit Modular Buildings
  modularHouse: g(`${CITY}/modular-buildings`, ['building-sample-house-a', 'building-sample-house-b', 'building-sample-house-c']),
  modularTower: g(`${CITY}/modular-buildings`, ['building-sample-tower-a', 'building-sample-tower-b', 'building-sample-tower-c', 'building-sample-tower-d']),

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

  // --- Mini Arcade (salón recreativo, con la ruleta) ---
  arcade: {
    floor: 'assets/arcade/floor.glb', wall: 'assets/arcade/wall.glb', wallWindow: 'assets/arcade/wall-window.glb', wallDoor: 'assets/arcade/wall-door-rotate.glb', wallCorner: 'assets/arcade/wall-corner.glb',
    wheel: 'assets/arcade/prize-wheel.glb',
    machine: g('assets/arcade', ['arcade-machine', 'claw-machine', 'pinball', 'dance-machine', 'air-hockey', 'basketball-game', 'gambling-machine', 'vending-machine']),
    cash: 'assets/arcade/cash-register.glb', prizes: 'assets/arcade/prizes.glb',
  },

  // --- Fantasy Town (mundo fantasy: aldea) ---
  fantasy: {
    fountain: g('assets/fantasy', ['fountain-round', 'fountain-round-detail']), fountainCenter: 'assets/fantasy/fountain-center.glb',
    hedge: g('assets/fantasy', ['hedge', 'hedge-large', 'hedge-curved']), hedgeGate: 'assets/fantasy/hedge-gate.glb',
    cart: g('assets/fantasy', ['cart', 'cart-high']), lantern: 'assets/fantasy/lantern.glb',
    pillar: g('assets/fantasy', ['pillar-stone', 'pillar-wood']), banner: g('assets/fantasy', ['banner-red', 'banner-green']),
    wall: 'assets/fantasy/wall.glb', wallDoor: 'assets/fantasy/wall-door.glb', wallWindow: 'assets/fantasy/wall-window-shutters.glb',
    roof: 'assets/fantasy/roof-gable.glb', roofTop: 'assets/fantasy/roof-gable-top.glb', chimney: 'assets/fantasy/chimney.glb',
    fence: 'assets/fantasy/fence.glb', fenceGate: 'assets/fantasy/fence-gate.glb',
  },

  // --- Castle (mundo fantasy: castillo) ---
  castle: {
    towerBase: 'assets/castle/tower-square-base.glb', towerMid: 'assets/castle/tower-square-mid-windows.glb', towerTop: 'assets/castle/tower-square-top-roof.glb',
    hexBase: 'assets/castle/tower-hexagon-base.glb', hexMid: 'assets/castle/tower-hexagon-mid.glb', hexTop: 'assets/castle/tower-hexagon-roof.glb',
    wall: 'assets/castle/wall.glb', wallCorner: 'assets/castle/wall-corner.glb', wallDoorway: 'assets/castle/wall-doorway.glb',
    gate: 'assets/castle/gate.glb', metalGate: 'assets/castle/metal-gate.glb',
    flag: g('assets/castle', ['flag', 'flag-banner-long', 'flag-wide']), bridge: 'assets/castle/bridge-straight.glb',
    stairs: 'assets/castle/stairs-stone.glb', rocks: g('assets/castle', ['rocks-large', 'rocks-small']),
  },

  // --- Dungeon (mundo fantasy: mazmorra) ---
  dungeon: {
    floor: 'assets/dungeon/floor.glb', wall: 'assets/dungeon/wall.glb', wallOpening: 'assets/dungeon/wall-opening.glb',
    gate: 'assets/dungeon/gate.glb', chest: 'assets/dungeon/chest.glb', barrel: 'assets/dungeon/barrel.glb',
    banner: 'assets/dungeon/banner.glb', column: 'assets/dungeon/column.glb', stairs: 'assets/dungeon/stairs.glb',
    orc: 'assets/dungeon/character-orc.glb', rocks: 'assets/dungeon/rocks.glb', coin: 'assets/dungeon/coin.glb',
  },
}

export function allModelUrls() {
  const urls = new Set()
  const add = (v) => { if (!v) return; if (typeof v === 'string') urls.add(v); else if (Array.isArray(v)) v.forEach(add); else Object.values(v).forEach(add) }
  add(MODELS)
  return [...urls]
}
