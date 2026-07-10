// ============================================================
//  Editor Sandbox (DEV) — se activa con ?edit en la URL.
//  Paleta con TODOS los assets de Kenney (por kit, en español) + colecciones
//  temáticas + buscador ES/EN + previews 3D. Colocar / mover / rotar / escalar
//  / borrar. Undo/redo, copiar/cortar/pegar, mover con flechas, portales,
//  cuadrícula. Guardar/cargar (localStorage + export/import JSON).
//  Para publicar: simplemente NO usar ?edit (no se carga la UI).
// ============================================================
import { CATALOG } from './catalog.js'

// nombre de cada kit en español
const KIT_ES = {
  'Blaster Kit': 'Blásters / Armas', 'Blocky Characters': 'Personajes (bloques)', 'Brick Kit': 'Ladrillos (Lego)',
  'Building Kit': 'Edificios (kit)', 'Car Kit': 'Autos', 'Castle Kit': 'Castillos',
  'City Kit - Commercial': 'Ciudad · Comercial', 'City Kit - Industrial': 'Ciudad · Industrial',
  'City Kit - Roads': 'Ciudad · Calles', 'City Kit - Suburban': 'Ciudad · Residencial',
  'Coaster Kit': 'Montaña rusa', 'Cube Pets': 'Mascotas (cubo)', 'Factory Kit': 'Fábrica',
  'Fantasy Town Kit': 'Pueblo Medieval', 'Food Kit': 'Comida', 'Furniture Kit': 'Muebles',
  'Graveyard Kit': 'Cementerio', 'Hexagon Kit': 'Hexágonos', 'Holiday Kit': 'Navidad / Fiestas',
  'Marble Kit': 'Canicas / Circuito', 'Mini Arcade': 'Mini Arcade', 'Mini Arena': 'Mini Arena',
  'Mini Characters': 'Mini Personajes', 'Mini Dungeon': 'Mini Mazmorra', 'Mini Market': 'Mini Market',
  'Mini Skate': 'Mini Skate', 'Minigolf Kit': 'Minigolf', 'Modular Buildings': 'Edificios Modulares',
  'Modular Dungeon Kit': 'Mazmorra Modular', 'Modular Space Kit': 'Espacio Modular', 'Nature Kit': 'Naturaleza',
  'Nature Kit (Classic)': 'Naturaleza (clásico)', 'Pirate Kit': 'Piratas', 'Platformer Kit': 'Plataformas',
  'Prototype Kit': 'Prototipos', 'Racing Kit': 'Carreras', 'Retro Fantasy Kit': 'Fantasy Retro',
  'Retro Urban Kit': 'Urbano Retro', 'Road Pack': 'Rutas (pack)', 'Space Kit': 'Espacio',
  'Space Station Kit': 'Estación Espacial', 'Survival Kit': 'Supervivencia', 'Tower Defense (Classic)': 'Tower Defense (clásico)',
  'Tower Defense Kit': 'Tower Defense', 'Toy Car Kit': 'Autos de juguete', 'Train Kit': 'Trenes',
  'Watercraft Pack': 'Embarcaciones', 'Weapon Pack': 'Armas',
}
// buscador español -> inglés (los nombres de archivo están en inglés)
const ALIAS = {
  arbol: 'tree', árbol: 'tree', arboles: 'tree', árboles: 'tree', planta: 'plant', plantas: 'plant', arbusto: 'bush',
  flor: 'flower', flores: 'flower', palmera: 'palm', pino: 'pine', cesped: 'grass', césped: 'grass', pasto: 'grass',
  hongo: 'mushroom', tronco: 'log', roca: 'rock', rocas: 'rock', piedra: 'stone', terreno: 'floor', suelo: 'floor',
  piso: 'floor', tierra: 'dirt', arena: 'sand', camino: 'path', calle: 'road', ruta: 'road', puente: 'bridge',
  pared: 'wall', muro: 'wall', puerta: 'door', ventana: 'window', techo: 'roof', columna: 'column', torre: 'tower',
  edificio: 'building', casa: 'building', rascacielos: 'skyscraper', cerca: 'fence', valla: 'fence', reja: 'fence',
  banco: 'bench', barril: 'barrel', caja: 'crate', cofre: 'chest', farol: 'lamp', lampara: 'lamp', 'lámpara': 'lamp',
  linterna: 'lantern', fuente: 'fountain', estatua: 'statue', auto: 'car', coche: 'car', camion: 'truck', 'camión': 'truck',
  furgon: 'van', taxi: 'taxi', policia: 'police', 'policía': 'police', barco: 'ship', bote: 'boat', boya: 'buoy',
  tren: 'train', persona: 'character', personaje: 'character', arma: 'blaster', mueble: 'furniture', silla: 'chair',
  mesa: 'table', cama: 'bed', comida: 'food', carro: 'cart', carreta: 'cart', señal: 'sign', escalera: 'stairs',
  bandera: 'flag', vela: 'candle', tumba: 'grave', lapida: 'gravestone', 'lápida': 'gravestone', cruz: 'cross',
  ataud: 'coffin', 'ataúd': 'coffin', calabaza: 'pumpkin', contenedor: 'container', container: 'container',
  rampa: 'ramp', muelle: 'dock', barrera: 'barrier', cono: 'cone', tacho: 'trash', basura: 'trash', hidrante: 'hydrant',
  cañon: 'cannon', 'cañón': 'cannon', tienda: 'tent', fogata: 'campfire', heladera: 'freezer', gondola: 'shelf',
  'góndola': 'shelf', carrito: 'cart', caja_registradora: 'register', semaforo: 'light', 'semáforo': 'light',
}
// colecciones temáticas (buscan en TODOS los kits)
const COLLECTIONS = [
  { key: '__todo', label: '🔎 Todos los assets', rx: /.*/ },
  { key: '__arboles', label: '🌳 Árboles y plantas', rx: /tree|plant|bush|palm|hedge|flower|pine|mushroom|leaf|log|stump|foliage|cactus/i },
  { key: '__terreno', label: '⛰️ Terreno / suelo / caminos', rx: /floor|ground|patch|tile|road|path|dirt|sand|grass|hill|cliff|rock|stone|water|bridge|ramp|driveway/i },
  { key: '__objetos', label: '🪑 Props y objetos', rx: /bench|barrel|crate|chest|box|lamp|lantern|sign|fence|table|chair|cart|pot|fountain|urn|candle|flag|shelf|freezer|register|basket|bottle|barricade|cone|planter|statue|pallet|tent|campfire|bed|cabinet|sofa|desk/i },
  { key: '__vehiculos', label: '🚗 Vehículos y barcos', rx: /car|sedan|truck|van|kart|race|bus|bike|train|tractor|ambulance|police|taxi|boat|ship|buoy|watercraft|delivery|firetruck|garbage|wagon/i },
  { key: '__personajes', label: '🧍 Personajes', rx: /character|gamer|employee|skate-boy|skate-girl/i },
  { key: '__edificios', label: '🏠 Edificios / paredes / techos', rx: /building|wall|window|door|roof|column|tower|gutter|plating|stairs|balcony|chimney|awning|border|pillar|crypt/i },
]

// props del motor (generados por código) + portales
const PROTOS = [
  { proto: 'lamp', name: 'Farol', emoji: '🏮' },
  { proto: 'hydrant', name: 'Hidrante', emoji: '🚒' },
  { proto: 'trash', name: 'Tacho', emoji: '🗑️' },
  { proto: 'crane', name: 'Grúa', emoji: '🏗️' },
  { proto: 'rail', name: 'Baranda', emoji: '🚧' },
  { proto: 'plank', name: 'Tablón', emoji: '🪵' },
  { portal: 'city', name: 'Portal → Ciudad', emoji: '🟦', color: 0x3a7bd5 },
  { portal: 'pirate', name: 'Portal → Pirata', emoji: '🟪', color: 0x9b59b6 },
  { portal: 'fantasy', name: 'Portal → Fantasy', emoji: '🟩', color: 0x2fbf6a },
]

export function initEditor(api) {
  const { THREE, scene, camera, controls, canvas } = api
  let mode = 'select'        // 'select' | 'place'
  let placeUrl = null, placeProto = null, placePortal = null
  let selected = null, boxHelper = null
  let curRot = 0, snap = true
  let clipboard = null, lastGround = new THREE.Vector3()
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const ALL_URLS = Object.values(CATALOG).flat()
  const urlKit = new Map(); for (const [k, arr] of Object.entries(CATALOG)) for (const u of arr) urlKit.set(u, k)

  // ---------- UI ----------
  const css = document.createElement('style')
  css.textContent = `
  #ed{position:fixed;top:0;right:0;width:300px;height:100vh;background:#0e1622f2;color:#dfe8f4;font:12px system-ui;z-index:200;display:flex;flex-direction:column;border-left:1px solid #2b3a4d}
  #ed h3{margin:0;padding:8px 10px;font-size:13px;letter-spacing:.05em;border-bottom:1px solid #2b3a4d}
  #ed .row{display:flex;gap:4px;padding:6px 8px;flex-wrap:wrap;align-items:center;border-bottom:1px solid #1c2836}
  #ed select,#ed input,#ed button{background:#1c2a3b;color:#dfe8f4;border:1px solid #33465c;border-radius:5px;padding:4px 6px;font:12px system-ui}
  #ed button{cursor:pointer}
  #ed button.on{background:#3a7bd5;border-color:#3a7bd5}
  #ed .sel-info{font-size:10.5px;padding:5px 8px;background:#123522;color:#bff5d5;border-bottom:1px solid #1c2836;min-height:24px;display:flex;align-items:center;gap:6px}
  #ed .sel-info.empty{background:#141f2e;color:#7f93aa}
  #ed .grid{flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:6px;align-content:start}
  #ed .cell{display:flex;flex-direction:column;align-items:center;gap:2px;padding:3px;background:#182842;border:1px solid #2b3a4d;border-radius:6px;overflow:hidden}
  #ed .cell .ph{width:100%;height:74px;border-radius:4px;background:#e9eef6 center/86% no-repeat;display:flex;align-items:center;justify-content:center;font-size:24px}
  #ed .cell span{width:100%;font-size:9px;line-height:1.15;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.9}
  #ed .cell.sel{border-color:#2fbf6a;background:#123522}
  #ed .cell.here{border-color:#f2c14e;box-shadow:0 0 0 1px #f2c14e}
  #ed .count{font-size:10px;opacity:.55;padding:0 8px 4px}
  #ed .hint{font-size:10.5px;opacity:.72;padding:6px 8px;line-height:1.5;border-top:1px solid #2b3a4d}
  #ed .tool.on{background:#3a7bd5;border-color:#3a7bd5}`
  document.head.appendChild(css)
  const el = document.createElement('div'); el.id = 'ed'; document.body.appendChild(el)
  el.innerHTML = `
    <h3>🛠️ EDITOR (dev) — <span id="edw"></span></h3>
    <div class="row">
      <button class="tool" id="tSel">Seleccionar</button>
      <button class="tool" id="tPlace">Colocar</button>
      <label><input type="checkbox" id="edsnap" checked> grilla</label>
      <label><input type="checkbox" id="edgridh"> cuadrícula</label>
    </div>
    <div class="row">
      <span>Mundo:</span>
      <button data-w="city">Ciudad</button><button data-w="pirate">Pirata</button><button data-w="fantasy">Fantasy</button>
    </div>
    <div class="row">
      <select id="edcat" style="flex:1"></select>
      <input id="edsearch" placeholder="buscar (ES/EN)…" style="width:88px">
    </div>
    <div class="count" id="edcount"></div>
    <div class="sel-info empty" id="edsel">Nada seleccionado</div>
    <div class="grid" id="edgrid"></div>
    <div class="row" style="justify-content:space-between">
      <button id="edrotL">⟲ Q</button><button id="edrotR">E ⟳</button>
      <button id="edup">▲ ]</button><button id="eddn">▼ [</button>
      <button id="edbig">+ .</button><button id="edsml">− ,</button>
      <button id="eddup">Dup</button><button id="eddel" style="background:#a33">Borrar Del</button>
    </div>
    <div class="row" style="justify-content:space-between">
      <button id="edundo">↶ Undo</button><button id="edredo">↷ Redo</button>
      <button id="edcopy">⧉ Copiar</button><button id="edpaste">⇊ Pegar</button>
    </div>
    <div class="row">
      <button id="edsave">💾 Guardar</button><button id="edexport">⬇ Export</button>
      <button id="edimport">⬆ Import</button><button id="edreset" style="background:#7a3">↺ Procedural</button>
    </div>
    <div class="hint"><b>WASD</b>: cámara · <b>flechas</b>: mover objeto sel. (o cámara) · click der: rotar · rueda: zoom · <b>Q/E</b> rotar · <b>[ ]</b> altura · <b>, .</b> escala · <b>Ctrl+Z/Y</b> undo/redo · <b>Ctrl+C/X/V</b> copiar/cortar/pegar · <b>Del</b> borrar.</div>`

  document.getElementById('edw').textContent = api.world()
  const grid = document.getElementById('edgrid'), catSel = document.getElementById('edcat'), search = document.getElementById('edsearch')
  const countEl = document.getElementById('edcount'), selInfo = document.getElementById('edsel')
  // opciones: colecciones, motor/portales, y los 47 kits en español
  for (const c of COLLECTIONS) { const o = document.createElement('option'); o.value = c.key; o.textContent = c.label; catSel.appendChild(o) }
  { const o = document.createElement('option'); o.value = '__engine'; o.textContent = '⚙ Portales / Props del motor'; catSel.appendChild(o) }
  const kitEntries = Object.keys(CATALOG).map((k) => ({ k, es: KIT_ES[k] || k })).sort((a, b) => a.es.localeCompare(b.es))
  for (const { k, es } of kitEntries) { const o = document.createElement('option'); o.value = k; o.textContent = '📦 ' + es; catSel.appendChild(o) }

  // ---------- cuadrícula visual ----------
  const gridHelper = new THREE.GridHelper(100, 100, 0x3a7bd5, 0x24405e)
  gridHelper.position.y = 0.03; gridHelper.material.opacity = 0.4; gridHelper.material.transparent = true; gridHelper.visible = false
  scene.add(gridHelper)
  document.getElementById('edgridh').onchange = (e) => gridHelper.visible = e.target.checked

  // ---------- thumbnails (preview 3D de cada asset) ----------
  const thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  thumbR.setSize(112, 112); thumbR.setPixelRatio(1); thumbR.setClearColor(0x000000, 0)
  const thumbScene = new THREE.Scene()
  thumbScene.add(new THREE.HemisphereLight(0xffffff, 0x60708a, 1.4))
  const tdl = new THREE.DirectionalLight(0xffffff, 1.6); tdl.position.set(4, 7, 5); thumbScene.add(tdl)
  const thumbCam = new THREE.PerspectiveCamera(30, 1, 0.01, 200)
  const thumbCache = new Map()
  async function makeThumb(url) {
    if (thumbCache.has(url)) return thumbCache.get(url)
    const g = await api.ensure(url); if (!g) { thumbCache.set(url, null); return null }
    const model = g.clone(true); thumbScene.add(model)
    const box = new THREE.Box3().setFromObject(model), sz = new THREE.Vector3(), ctr = new THREE.Vector3()
    box.getSize(sz); box.getCenter(ctr)
    // algunos assets del pack tienen geometría degenerada (NaN): saltarlos
    if (![sz.x, sz.y, sz.z, ctr.x, ctr.y, ctr.z].every(Number.isFinite)) { thumbScene.remove(model); thumbCache.set(url, null); return null }
    const r = Math.max(sz.x, sz.y, sz.z) || 1, d = r * 1.9
    thumbCam.position.set(ctr.x + d * 0.9, ctr.y + d * 1.15, ctr.z + d * 0.9); thumbCam.lookAt(ctr); thumbCam.updateProjectionMatrix()
    thumbR.render(thumbScene, thumbCam)
    let data = null; try { data = thumbR.domElement.toDataURL('image/png') } catch { data = null }
    thumbScene.remove(model)
    thumbCache.set(url, data); return data
  }
  let io = null
  function makeObserver() {
    if (io) io.disconnect()
    io = new IntersectionObserver((ents) => {
      for (const e of ents) {
        if (!e.isIntersecting) continue
        io.unobserve(e.target); const u = e.target.dataset.url; if (!u) continue
        makeThumb(u).then((d) => { if (d) { const ph = e.target.querySelector('.ph'); if (ph) { ph.style.backgroundImage = `url(${d})`; ph.textContent = '' } } })
      }
    }, { root: grid, rootMargin: '150px' })
  }

  function currentItems() {
    const c = catSel.value
    if (c === '__engine') return PROTOS.map((p) => ({ proto: p.proto, portal: p.portal, color: p.color, name: p.name, emoji: p.emoji }))
    const coll = COLLECTIONS.find((x) => x.key === c)
    const urls = coll ? ALL_URLS.filter((u) => coll.rx.test(u)) : (CATALOG[c] || [])
    return urls.map((u) => ({ url: u, name: u.split('/').pop().replace('.glb', '') }))
  }
  function matchQuery(name, q) {
    const toks = q.toLowerCase().split(/\s+/).filter(Boolean)
    const n = name.toLowerCase()
    return toks.every((t) => n.includes(ALIAS[t] || t))
  }
  function renderGrid(hlUrl) {
    grid.innerHTML = ''; makeObserver()
    const q = search.value.trim()
    let items = currentItems()
    if (q) items = items.filter((i) => matchQuery(i.name, q))
    countEl.textContent = items.length + ' assets' + (items.length > 800 ? ' (mostrando 800)' : '')
    for (const it of items.slice(0, 800)) {
      const b = document.createElement('div'); b.className = 'cell'; b.title = it.name
      b.innerHTML = `<div class="ph">${it.emoji || '⏳'}</div><span>${it.name}</span>`
      if (it.url) { b.dataset.url = it.url; if (it.url === hlUrl) b.classList.add('here') }
      b.onclick = () => {
        placeUrl = it.url || null; placeProto = it.proto || null; placePortal = it.portal || null
        setMode('place'); [...grid.children].forEach((x) => x.classList.remove('sel')); b.classList.add('sel')
      }
      grid.appendChild(b)
      if (it.url) io.observe(b)
    }
    if (hlUrl) { const cell = grid.querySelector('.cell.here'); if (cell) cell.scrollIntoView({ block: 'center' }) }
  }
  catSel.onchange = () => renderGrid(); search.oninput = () => renderGrid(); renderGrid()

  function setMode(m) { mode = m; document.getElementById('tSel').classList.toggle('on', m === 'select'); document.getElementById('tPlace').classList.toggle('on', m === 'place') }
  document.getElementById('tSel').onclick = () => setMode('select')
  document.getElementById('tPlace').onclick = () => setMode('place')
  setMode('select')
  document.getElementById('edsnap').onchange = (e) => snap = e.target.checked
  el.querySelectorAll('[data-w]').forEach((b) => b.onclick = () => { deselect(); undoStack.length = 0; redoStack.length = 0; api.goWorld(b.dataset.w) })
  document.getElementById('edsave').onclick = () => { api.saveLocal(); flash('Guardado ✓') }
  document.getElementById('edexport').onclick = () => { const blob = new Blob([api.exportJSON()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kintana-' + api.world() + '.json'; a.click() }
  document.getElementById('edimport').onclick = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { deselect(); api.importJSON(r.result) }; r.readAsText(f) }; inp.click() }
  document.getElementById('edreset').onclick = () => { if (confirm('¿Volver al mapa procedural (se borra tu guardado local)?')) { deselect(); api.resetProc() } }
  document.getElementById('edrotL').onclick = () => rotateSel(-1); document.getElementById('edrotR').onclick = () => rotateSel(1)
  document.getElementById('edup').onclick = () => nudgeY(0.1); document.getElementById('eddn').onclick = () => nudgeY(-0.1)
  document.getElementById('edbig').onclick = () => scaleSel(1.1); document.getElementById('edsml').onclick = () => scaleSel(1 / 1.1)
  document.getElementById('eddup').onclick = duplicateSel; document.getElementById('eddel').onclick = deleteSel
  document.getElementById('edundo').onclick = undo; document.getElementById('edredo').onclick = redo
  document.getElementById('edcopy').onclick = () => copySel(false); document.getElementById('edpaste').onclick = paste

  function flash(t) { const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#2fbf6a;color:#04240f;padding:8px 16px;border-radius:8px;z-index:300;font:600 13px system-ui'; document.body.appendChild(d); setTimeout(() => d.remove(), 1100) }

  // ---------- undo / redo ----------
  const undoStack = [], redoStack = []
  function pushCmd(cmd) { undoStack.push(cmd); if (undoStack.length > 80) undoStack.shift(); redoStack.length = 0 }
  function undo() { const c = undoStack.pop(); if (!c) return; c.undo(); redoStack.push(c) }
  function redo() { const c = redoStack.pop(); if (!c) return; c.redo(); undoStack.push(c) }
  function cmdAdd(o) { if (!o) return; const spec = { ...o.userData.ed }; let ref = o; pushCmd({ undo() { if (selected === ref) deselect(); api.removeObj(ref) }, redo() { ref = api.spawnSpec(spec) } }) }
  function cmdRemove(o) { const spec = { ...o.userData.ed }; let ref = o; if (selected === ref) deselect(); api.removeObj(ref); pushCmd({ undo() { ref = api.spawnSpec(spec) }, redo() { if (selected === ref) deselect(); api.removeObj(ref) } }) }
  function pushT(o, before, after) { if (sameT(before, after)) return; pushCmd({ undo() { applyT(o, before) }, redo() { applyT(o, after) } }) }
  const grabT = (o) => ({ x: o.position.x, y: o.position.y, z: o.position.z, r: o.rotation.y, s: o.scale.x })
  const sameT = (a, b) => a.x === b.x && a.y === b.y && a.z === b.z && a.r === b.r && a.s === b.s
  function applyT(o, t) { o.position.set(t.x, t.y, t.z); o.rotation.y = t.r; o.scale.setScalar(t.s); syncSpecOf(o); if (selected === o) { refreshBox(); updateSelInfo() } }

  // ---------- interaccion 3D ----------
  const snapv = (v) => snap ? Math.round(v) : v
  function groundPoint(cx, cy) { ndc.x = (cx / window.innerWidth) * 2 - 1; ndc.y = -(cy / window.innerHeight) * 2 + 1; ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(api.groundMeshes())[0]; if (h) return h.point; const p = new THREE.Vector3(); ray.ray.intersectPlane(planeY, p); return p }
  function topObject(cx, cy) { ndc.x = (cx / window.innerWidth) * 2 - 1; ndc.y = -(cy / window.innerHeight) * 2 + 1; ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(api.editable(), true); for (const h of hits) { let o = h.object; while (o && !o.userData.ed) o = o.parent; if (o && api.editable().includes(o) && !isFlat(o)) return o } return null }
  const isFlat = (o) => o.userData.ed && (o.userData.ed.t === 'patch' || o.userData.ed.t === 'water' || o.userData.ed.t === 'grass')

  function labelOf(o) {
    const e = o.userData.ed; if (!e) return '¿?'
    if (e.t === 'glb') return e.u.split('/').pop().replace('.glb', '')
    if (e.t === 'proto') return e.p; if (e.t === 'portal') return 'portal → ' + e.to
    return e.t
  }
  function updateSelInfo() {
    if (!selected) { selInfo.className = 'sel-info empty'; selInfo.textContent = 'Nada seleccionado'; return }
    const e = selected.userData.ed, kit = e.t === 'glb' ? (KIT_ES[urlKit.get(e.u)] || '') : ''
    selInfo.className = 'sel-info'
    selInfo.textContent = `📍 ${labelOf(selected)}${kit ? ' · ' + kit : ''}  (x${selected.position.x.toFixed(1)} z${selected.position.z.toFixed(1)} · esc ${selected.scale.x.toFixed(2)})`
  }
  // al seleccionar: mostrar el asset en la paleta para identificarlo rápido
  const cellByUrl = (url) => [...grid.children].find((c) => c.dataset.url === url)
  function revealInPalette(o) {
    const e = o.userData.ed; if (!e || e.t !== 'glb') return
    const kit = urlKit.get(e.u); if (!kit) return
    if (cellByUrl(e.u)) { highlightCell(e.u); return }
    catSel.value = kit; renderGrid(e.u)
  }
  function highlightCell(url) { grid.querySelectorAll('.cell.here').forEach((c) => c.classList.remove('here')); const cell = cellByUrl(url); if (cell) { cell.classList.add('here'); cell.scrollIntoView({ block: 'center' }) } }

  function select(o, reveal = true) { deselect(); selected = o; boxHelper = new THREE.BoxHelper(o, 0x2fbf6a); scene.add(boxHelper); updateSelInfo(); if (reveal) revealInPalette(o) }
  function deselect() { if (boxHelper) { scene.remove(boxHelper); boxHelper = null } selected = null; updateSelInfo() }
  function refreshBox() { if (boxHelper) boxHelper.update() }
  function withT(o, fn) { if (!o) return; const before = grabT(o); fn(); syncSpecOf(o); if (selected === o) { refreshBox(); updateSelInfo() } pushT(o, before, grabT(o)) }
  function rotateSel(dir) { if (selected) withT(selected, () => selected.rotation.y += dir * (snap ? Math.PI / 4 : 0.1)) }
  function nudgeY(d) { if (selected) withT(selected, () => selected.position.y += d) }
  function scaleSel(f) { if (selected) withT(selected, () => selected.scale.multiplyScalar(f)) }
  function moveSel(dx, dz) { if (selected) withT(selected, () => { selected.position.x += dx; selected.position.z += dz }) }
  function deleteSel() { if (selected) cmdRemove(selected) }
  function duplicateSel() {
    if (!selected) return; const e = selected.userData.ed, sp = { ...e, x: e.x + 1 }
    const o = api.spawnSpec(sp); if (o) { o.scale.copy(selected.scale); o.position.y = selected.position.y; syncSpecOf(o); cmdAdd(o); select(o, false) }
  }
  function copySel(cut) { if (!selected) return; clipboard = { ...selected.userData.ed }; flash(cut ? 'Cortado ✂️' : 'Copiado ⧉'); if (cut) cmdRemove(selected) }
  function paste() {
    if (!clipboard) return
    const at = lastGround, sp = { ...clipboard, x: snapv(at.x), z: snapv(at.z) }
    const o = api.spawnSpec(sp); if (o) { syncSpecOf(o); cmdAdd(o); select(o, false) }
  }
  function syncSpecOf(o) { if (!o || !o.userData.ed) return; const e = o.userData.ed; e.x = o.position.x; e.y = o.position.y; e.z = o.position.z; if (e.t !== 'patch' && e.t !== 'water' && e.t !== 'grass' && e.t !== 'portal') e.r = o.rotation.y; e.s = o.scale.x }

  let downX = 0, downY = 0, dragging = false, dragObj = null, dragBefore = null
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    downX = e.clientX; downY = e.clientY; dragging = false
    if (mode === 'select') { const o = topObject(e.clientX, e.clientY); if (o) { select(o); dragObj = o; dragBefore = grabT(o) } else dragObj = null }
  })
  canvas.addEventListener('pointermove', (e) => {
    lastGround.copy(groundPoint(e.clientX, e.clientY))
    if (!(e.buttons & 1) || !dragObj) return
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) dragging = true
    if (dragging) { dragObj.position.x = snapv(lastGround.x); dragObj.position.z = snapv(lastGround.z); syncSpecOf(dragObj); refreshBox(); updateSelInfo() }
  })
  canvas.addEventListener('pointerup', (e) => {
    if (e.button !== 0) return
    if (dragging) { dragging = false; pushT(dragObj, dragBefore, grabT(dragObj)); dragObj = null; return }
    dragObj = null
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return
    const p = groundPoint(e.clientX, e.clientY), px = snapv(p.x), pz = snapv(p.z)
    if (mode === 'place' && (placeUrl || placeProto || placePortal)) {
      if (placePortal) { const col = PROTOS.find((x) => x.portal === placePortal).color; const o = api.spawnSpec({ t: 'portal', to: placePortal, c: col, x: px, y: 0, z: pz }); if (o) { cmdAdd(o); select(o, false) } }
      else if (placeProto) { const o = api.spawnProto(placeProto, px, pz, curRot); if (o) { cmdAdd(o); select(o, false) } }
      else Promise.resolve(api.spawnGlb(placeUrl, px, pz, curRot)).then((o) => { if (o) { cmdAdd(o); select(o, false) } })
    } else { const o = topObject(e.clientX, e.clientY); if (o) select(o); else deselect() }
  })

  // ---------- cámara: WASD (siempre) + flechas (si no hay objeto) ----------
  const panKeys = new Set()
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3()
  function camPan() {
    if (!panKeys.size) return
    fwd.subVectors(controls.target, camera.position); fwd.y = 0
    if (fwd.lengthSq() < 1e-6) return
    fwd.normalize(); right.set(-fwd.z, 0, fwd.x); mv.set(0, 0, 0)
    if (panKeys.has('w')) mv.add(fwd); if (panKeys.has('s')) mv.sub(fwd)
    if (panKeys.has('d')) mv.add(right); if (panKeys.has('a')) mv.sub(right)
    if (panKeys.has('arrowup')) mv.add(fwd); if (panKeys.has('arrowdown')) mv.sub(fwd)
    if (panKeys.has('arrowright')) mv.add(right); if (panKeys.has('arrowleft')) mv.sub(right)
    if (!mv.lengthSq()) return
    mv.normalize().multiplyScalar(0.9 / (camera.zoom || 1))
    camera.position.add(mv); controls.target.add(mv)
  }

  const CAMKEYS = new Set(['w', 'a', 's', 'd'])
  const ARROWS = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] }
  window.addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return
    const k = e.key.toLowerCase()
    if (e.ctrlKey || e.metaKey) {
      if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
      else if (k === 'y') { e.preventDefault(); redo() }
      else if (k === 'c') { e.preventDefault(); copySel(false) }
      else if (k === 'x') { e.preventDefault(); copySel(true) }
      else if (k === 'v') { e.preventDefault(); paste() }
      else if (k === 'd') { e.preventDefault(); duplicateSel() }
      return
    }
    if (CAMKEYS.has(k)) { panKeys.add(k); e.preventDefault(); return }
    if (ARROWS[k]) {
      e.preventDefault()
      if (selected) { const st = snap ? 1 : 0.25, [dx, dz] = ARROWS[k]; moveSel(dx * st, dz * st) }
      else panKeys.add(k)
      return
    }
    if (k === 'q') rotateSel(-1); else if (k === 'e') rotateSel(1)
    else if (k === '[') nudgeY(-0.1); else if (k === ']') nudgeY(0.1)
    else if (k === ',') scaleSel(1 / 1.1); else if (k === '.') scaleSel(1.1)
    else if (k === 'delete' || k === 'backspace') deleteSel()
    else if (k === 'escape') { deselect(); setMode('select') }
    else if (k === 'g') { snap = !snap; document.getElementById('edsnap').checked = snap }
    else if (k === 'r') curRot += Math.PI / 4
  })
  window.addEventListener('keyup', (e) => panKeys.delete(e.key.toLowerCase()))
  window.addEventListener('blur', () => panKeys.clear())

  return {
    refresh() { deselect(); undoStack.length = 0; redoStack.length = 0; document.getElementById('edw').textContent = api.world() },
    tick() { camPan(); refreshBox() },
  }
}
