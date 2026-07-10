// ============================================================
//  Editor Sandbox (DEV) — se activa con ?edit en la URL.
//  Colocar / mover / rotar / escalar / borrar cualquier elemento.
//  Guardar/cargar el mapa (localStorage + export/import JSON).
//  Para publicar: simplemente NO usar ?edit (no se carga la UI).
// ============================================================
import { CATALOG } from './catalog.js'

const PROTOS = ['lamp', 'hydrant', 'trash', 'crane', 'rail', 'plank']
const CAT_LABEL = {
  'city/roads': 'Calles', 'city/commercial': 'Comercial', 'city/suburban': 'Casas', 'city/industrial': 'Industrial',
  'city/cars': 'Autos', 'city/modular-buildings': 'Modular', characters: 'Personajes', nature: 'Naturaleza',
  market: 'Market', arcade: 'Arcade', skate: 'Skate', graveyard: 'Cementerio', port: 'Puerto', building: 'Building Kit',
  pirate: 'Pirata', fantasy: 'Fantasy', castle: 'Castillo', dungeon: 'Dungeon', survival: 'Survival',
}

export function initEditor(api) {
  const { THREE, scene, camera, canvas } = api
  let mode = 'select'        // 'select' | 'place'
  let placeUrl = null, placeProto = null
  let selected = null, boxHelper = null
  let curRot = 0, snap = true
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

  // ---------- UI ----------
  const css = document.createElement('style')
  css.textContent = `
  #ed{position:fixed;top:0;right:0;width:280px;height:100vh;background:#0e1622ee;color:#dfe8f4;font:12px system-ui;z-index:200;display:flex;flex-direction:column;border-left:1px solid #2b3a4d}
  #ed h3{margin:0;padding:8px 10px;background:#16233400;font-size:13px;letter-spacing:.05em;border-bottom:1px solid #2b3a4d}
  #ed .row{display:flex;gap:4px;padding:6px 8px;flex-wrap:wrap;align-items:center;border-bottom:1px solid #1c2836}
  #ed select,#ed input,#ed button{background:#1c2a3b;color:#dfe8f4;border:1px solid #33465c;border-radius:5px;padding:4px 6px;font:12px system-ui}
  #ed button{cursor:pointer}
  #ed button.on{background:#3a7bd5;border-color:#3a7bd5}
  #ed .grid{flex:1;overflow-y:auto;display:flex;flex-wrap:wrap;gap:3px;padding:6px;align-content:flex-start}
  #ed .grid button{width:100%;text-align:left;padding:4px 6px;font-size:11px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  #ed .grid button.sel{background:#2fbf6a;border-color:#2fbf6a;color:#04240f}
  #ed .hint{font-size:10.5px;opacity:.7;padding:6px 8px;line-height:1.5;border-top:1px solid #2b3a4d}
  #ed .tool.on{background:#3a7bd5;border-color:#3a7bd5}`
  document.head.appendChild(css)
  const el = document.createElement('div'); el.id = 'ed'; document.body.appendChild(el)
  el.innerHTML = `
    <h3>🛠️ EDITOR (dev) — <span id="edw"></span></h3>
    <div class="row">
      <button class="tool" id="tSel">Seleccionar</button>
      <button class="tool" id="tPlace">Colocar</button>
      <label><input type="checkbox" id="edsnap" checked> grilla</label>
    </div>
    <div class="row">
      <span>Mundo:</span>
      <button data-w="city">Ciudad</button><button data-w="pirate">Pirata</button><button data-w="fantasy">Fantasy</button>
    </div>
    <div class="row">
      <select id="edcat" style="flex:1"></select>
      <input id="edsearch" placeholder="buscar…" style="width:70px">
    </div>
    <div class="grid" id="edgrid"></div>
    <div class="row" style="justify-content:space-between">
      <button id="edrotL">⟲ Q</button><button id="edrotR">E ⟳</button>
      <button id="edup">▲ ]</button><button id="eddn">▼ [</button>
      <button id="edbig">+ .</button><button id="edsml">− ,</button>
      <button id="eddup">Dup</button><button id="eddel" style="background:#a33">Borrar Del</button>
    </div>
    <div class="row">
      <button id="edsave">💾 Guardar</button><button id="edexport">⬇ Export</button>
      <button id="edimport">⬆ Import</button><button id="edreset" style="background:#7a3">↺ Procedural</button>
    </div>
    <div class="hint">Click: colocar/seleccionar · arrastrar: mover · <b>Q/E</b> rotar · <b>[ ]</b> altura · <b>, .</b> escala · <b>Del</b> borrar · <b>Esc</b> deseleccionar · click der: rotar cámara · rueda del medio: mover cámara.</div>`

  document.getElementById('edw').textContent = api.world()
  const grid = document.getElementById('edgrid'), catSel = document.getElementById('edcat'), search = document.getElementById('edsearch')
  const cats = ['props', ...Object.keys(CATALOG)]
  for (const c of cats) { const o = document.createElement('option'); o.value = c; o.textContent = (c === 'props' ? '⚙ Props/Terreno' : (CAT_LABEL[c] || c)); catSel.appendChild(o) }

  function renderGrid() {
    grid.innerHTML = ''; const c = catSel.value, q = search.value.toLowerCase()
    let items = c === 'props' ? PROTOS.map(p => ({ proto: p, name: p })) : CATALOG[c].map(u => ({ url: u, name: u.split('/').pop().replace('.glb', '') }))
    if (q) items = items.filter(i => i.name.toLowerCase().includes(q))
    for (const it of items.slice(0, 400)) {
      const b = document.createElement('button'); b.textContent = it.name
      b.onclick = () => { placeUrl = it.url || null; placeProto = it.proto || null; setMode('place'); [...grid.children].forEach(x => x.classList.remove('sel')); b.classList.add('sel') }
      grid.appendChild(b)
    }
  }
  catSel.onchange = renderGrid; search.oninput = renderGrid; renderGrid()

  function setMode(m) { mode = m; document.getElementById('tSel').classList.toggle('on', m === 'select'); document.getElementById('tPlace').classList.toggle('on', m === 'place') }
  document.getElementById('tSel').onclick = () => setMode('select')
  document.getElementById('tPlace').onclick = () => setMode('place')
  setMode('select')
  document.getElementById('edsnap').onchange = (e) => snap = e.target.checked
  el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { deselect(); api.goWorld(b.dataset.w) })
  document.getElementById('edsave').onclick = () => { api.saveLocal(); flash('Guardado ✓') }
  document.getElementById('edexport').onclick = () => { const blob = new Blob([api.exportJSON()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kintana-' + api.world() + '.json'; a.click() }
  document.getElementById('edimport').onclick = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { deselect(); api.importJSON(r.result) }; r.readAsText(f) }; inp.click() }
  document.getElementById('edreset').onclick = () => { if (confirm('¿Volver al mapa procedural (se borra tu guardado local)?')) { deselect(); api.resetProc() } }
  document.getElementById('edrotL').onclick = () => rotateSel(-1); document.getElementById('edrotR').onclick = () => rotateSel(1)
  document.getElementById('edup').onclick = () => nudgeY(0.1); document.getElementById('eddn').onclick = () => nudgeY(-0.1)
  document.getElementById('edbig').onclick = () => scaleSel(1.1); document.getElementById('edsml').onclick = () => scaleSel(1 / 1.1)
  document.getElementById('eddup').onclick = duplicateSel; document.getElementById('eddel').onclick = deleteSel

  function flash(t) { const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#2fbf6a;color:#04240f;padding:8px 16px;border-radius:8px;z-index:300;font:600 13px system-ui'; document.body.appendChild(d); setTimeout(() => d.remove(), 1200) }

  // ---------- interaccion 3D ----------
  const snapv = (v) => snap ? Math.round(v) : v
  function groundPoint(cx, cy) { ndc.x = (cx / window.innerWidth) * 2 - 1; ndc.y = -(cy / window.innerHeight) * 2 + 1; ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(api.groundMeshes())[0]; if (h) return h.point; const p = new THREE.Vector3(); ray.ray.intersectPlane(planeY, p); return p }
  function topObject(cx, cy) { ndc.x = (cx / window.innerWidth) * 2 - 1; ndc.y = -(cy / window.innerHeight) * 2 + 1; ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(api.editable(), true); for (const h of hits) { let o = h.object; while (o && !o.userData.ed) o = o.parent; if (o && api.editable().includes(o) && !isFlat(o)) return o } return null }
  const isFlat = (o) => o.userData.ed && (o.userData.ed.t === 'patch' || o.userData.ed.t === 'water' || o.userData.ed.t === 'grass')

  function select(o) { deselect(); selected = o; boxHelper = new THREE.BoxHelper(o, 0x2fbf6a); scene.add(boxHelper) }
  function deselect() { if (boxHelper) { scene.remove(boxHelper); boxHelper = null } selected = null }
  function refreshBox() { if (boxHelper) boxHelper.update() }
  function rotateSel(dir) { if (!selected) return; selected.rotation.y += dir * (snap ? Math.PI / 4 : 0.1); syncSpec(); refreshBox() }
  function nudgeY(d) { if (!selected) return; selected.position.y += d; syncSpec(); refreshBox() }
  function scaleSel(f) { if (!selected) return; selected.scale.multiplyScalar(f); syncSpec(); refreshBox() }
  function deleteSel() { if (!selected) return; api.removeObj(selected); deselect() }
  function duplicateSel() { if (!selected) return; const e = selected.userData.ed; const o = e.t === 'proto' ? api.spawnProto(e.p, selected.position.x + 1, selected.position.z, selected.rotation.y) : api.spawnGlb(e.u, selected.position.x + 1, selected.position.z, selected.rotation.y); if (o) { o.position.y = selected.position.y; o.scale.copy(selected.scale); syncSpecOf(o); select(o) } }
  function syncSpec() { syncSpecOf(selected) }
  function syncSpecOf(o) { if (!o || !o.userData.ed) return; const e = o.userData.ed; e.x = o.position.x; e.y = o.position.y; e.z = o.position.z; e.r = o.rotation.y; e.s = o.scale.x }

  let downX = 0, downY = 0, dragging = false, dragObj = null
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    downX = e.clientX; downY = e.clientY; dragging = false
    if (mode === 'select') { const o = topObject(e.clientX, e.clientY); if (o) { select(o); dragObj = o } else dragObj = null }
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!(e.buttons & 1) || !dragObj) return
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) dragging = true
    if (dragging) { const p = groundPoint(e.clientX, e.clientY); dragObj.position.x = snapv(p.x); dragObj.position.z = snapv(p.z); syncSpecOf(dragObj); refreshBox() }
  })
  canvas.addEventListener('pointerup', (e) => {
    if (e.button !== 0) return
    if (dragging) { dragging = false; dragObj = null; return }
    dragObj = null
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return
    const p = groundPoint(e.clientX, e.clientY)
    if (mode === 'place' && (placeUrl || placeProto)) {
      const o = placeProto ? api.spawnProto(placeProto, snapv(p.x), snapv(p.z), curRot) : api.spawnGlb(placeUrl, snapv(p.x), snapv(p.z), curRot)
      if (o) { syncSpecOf(o); select(o) }
    } else { const o = topObject(e.clientX, e.clientY); if (o) select(o); else deselect() }
  })
  window.addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return
    const k = e.key.toLowerCase()
    if (k === 'q') rotateSel(-1); else if (k === 'e') rotateSel(1)
    else if (k === '[') nudgeY(-0.1); else if (k === ']') nudgeY(0.1)
    else if (k === ',') scaleSel(1 / 1.1); else if (k === '.') scaleSel(1.1)
    else if (k === 'delete' || k === 'backspace') deleteSel()
    else if (k === 'escape') { deselect(); setMode('select') }
    else if (k === 'g') { snap = !snap; document.getElementById('edsnap').checked = snap }
    else if (k === 'r') curRot += Math.PI / 4
  })

  return {
    refresh() { deselect(); document.getElementById('edw').textContent = api.world() },
    tick() { refreshBox() },
  }
}
