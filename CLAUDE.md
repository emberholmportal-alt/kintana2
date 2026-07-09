# KINTANA2

## Qué es
MMO isométrico en navegador inspirado en Kintara (kintara.com), pero con
mundo 3D low-poly de calidad muy superior. Fase actual: SOLO la parte
gráfica/visual del mundo. Backend, economía y token vienen después.

## Referencia: cómo funciona Kintara (lo que replicamos/mejoramos)
- Mundo tile-based con zonas: hub central (banco, tiendas, plaza con
  fuente, portales), zonas de gathering pacíficas, zonas PvP salvajes
  donde al morir soltás el loot en una tumba.
- 5 skills: Combat, Woodcutting, Mining, Fishing, Cooking (cap nivel 20).
- Recursos: madera, piedra, carbón, pescado. Herramientas: hacha, pico,
  caña, martillo. Armas, monturas, cosméticos escasos.
- Economía dual: Gold in-game + token on-chain (NO se toca ahora).

## Diferencia visual clave
Kintara es medieval genérico y visualmente pobre. Kintana2 es una CIUDAD
moderna low-poly con un barrio medieval como zona especial. Plaza urbana
como hub, calles con autos, parque, y el "casco antiguo" medieval
conectado como distrito aparte.

## Stack
- Three.js + Vite, JavaScript vanilla. Sin frameworks de juego externos.
- Deploy futuro: sitio estático en Render. Backend futuro: FastAPI +
  PostgreSQL + WebSockets (no ahora).
- Target: navegador desktop y mobile. Performance primero: low-poly,
  InstancedMesh para repetidos, draw calls mínimos, texturas atlas.

## Assets
Pack completo de Kenney (CC0). Zip en el release del repo:
https://github.com/emberholmportal-alt/kintana2/releases/download/assets-v1/Kenney.Game.Assets.All-in-1.3.5.0.zip
Descargarlo a `_assets_raw/` (carpeta GITIGNOREADA, nunca se commitea).
Formato preferido: GLB/glTF. Si un kit no trae GLB, anotarlo.

## Fase 1 — tareas en orden
1. Setup: .gitignore con `_assets_raw/` y `node_modules/`. Descargar el
   zip del release a `_assets_raw/` con curl -L y descomprimir.
2. INVENTARIO: listar todos los kits del pack, qué contiene cada uno,
   formatos disponibles, cantidad de modelos. Generar ASSETS.md con
   recomendación de qué usar. NO copiar nada todavía.
3. Selección "ciudad + barrio medieval" (tras aprobar el inventario):
   - Base urbana: City Kit (Roads, Commercial, Suburban), Modular
     Buildings, Car Kit
   - Zona medieval: Fantasy Town Kit, Castle Kit
   - Verde: Nature Kit (parques, plazas, árboles)
   - Props: Furniture, Food, Mini Market
   - Personajes placeholder: Mini Characters / Blocky Characters
   Copiar SOLO esos GLB a public/assets/ por categoría. Máx ~40 MB.
4. Prototipo de mundo: escena Three.js con cámara isométrica
   (ortográfica, ángulo tipo Kintara), grilla de tiles, plaza central
   con banco y tiendas, calles, parque, y el barrio medieval conectado.
5. Personaje placeholder con click-to-move (pathfinding simple por
   grilla) caminando por la ciudad.

## Estilo de trabajo
- Prototipos funcionando > explicaciones largas.
- Commits chicos y frecuentes con mensajes claros.
- Frenar y consultar antes de decisiones grandes de arquitectura.
- Respuestas en español.
