# ASSETS — Inventario del pack Kenney (Game Assets All-in-1 · v1.3.5.0)

Pack CC0 completo de Kenney. Descargado a `_assets_raw/` (carpeta
gitignoreada, **nunca se commitea**). Este documento es solo el
**inventario + recomendación**. Todavía NO se copió ningún asset a
`public/`.

- Fuente: <https://github.com/emberholmportal-alt/kintana2/releases/tag/assets-v1>
- Zip: `Kenney.Game.Assets.All-in-1.3.5.0.zip` (~497 MB comprimido, ~1.4 GB
  descomprimido; los 3D solos ~652 MB).

## Estructura de nivel superior del pack

| Carpeta         | Contenido                                              |
|-----------------|--------------------------------------------------------|
| `3D assets`     | **52 kits 3D** (lo que usamos para el mundo)           |
| `2D assets`     | 151 packs de sprites/2D (no se usan en fase 3D)        |
| `Audio`         | 16 packs de sonido (SFX, música, UI, RPG…)             |
| `UI assets`     | 10 packs de UI (cursores, botones, controles mobile)   |
| `Icons`         | 8 sets de iconos (game icons, input prompts…)          |
| `Early access`  | Kits nuevos: **Medieval Weapons**, Racing Kit          |
| `Other`         | Fonts, miniguides, samples de Construct                |
| `Goodies`       | Extras varios                                          |
| `Archive`       | 16 versiones viejas/deprecadas de kits                 |

---

## Formatos 3D (nota importante)

Kenney distribuye cada kit 3D en varios formatos. Para Kintana2 el formato
preferido es **GLB** (glTF binario, un solo archivo por modelo, ideal para
Three.js con `GLTFLoader`).

- **Casi todos los kits traen GLB.** En los kits nuevos el GLB vive dentro
  de una carpeta llamada `GLTF format` (contiene archivos `.glb`, no
  `.gltf`). En los kits clásicos vive en una carpeta `GLB format`. En ambos
  casos: **es GLB usable directamente.**
- Todos traen además **FBX** y **OBJ**. Algunos suman DAE y STL.
- **Excepciones a tener en cuenta:**
  - `Nature Kit (Classic)`: solo `glTF` clásico separado (`.gltf` + `.bin`),
    **sin GLB**. Ignorar: usamos el `Nature Kit` moderno.
  - **Animated Characters** (los 4 bundles): **solo FBX**, sin GLB ni glTF.
    Si se quieren personajes animados hay que convertir FBX→GLB. Para
    placeholders usamos mejor `Mini Characters` / `Blocky Characters` (GLB).

---

## Inventario completo de los 52 kits 3D

Columna "GLB" = hay `.glb` usable (aunque la carpeta se llame `GLTF
format`). "#modelos" = cantidad de `.glb` (o `.gltf` en Nature Classic).

| Kit                              | Categoría        | GLB | FBX | OBJ | #modelos |
|----------------------------------|------------------|-----|-----|-----|----------|
| Animated Characters Bundle       | personajes       | ❌  | ✅  | ❌  | 0 (FBX)  |
| Animated Characters Protagonists | personajes       | ❌  | ✅  | ❌  | 0 (FBX)  |
| Animated Characters Retro        | personajes       | ❌  | ✅  | ❌  | 0 (FBX)  |
| Animated Characters Survivors    | personajes       | ❌  | ✅  | ❌  | 0 (FBX)  |
| Blaster Kit                      | props/armas      | ✅  | ✅  | ✅  | 40       |
| Blocky Characters                | personajes       | ✅  | ✅  | ✅  | 18       |
| Brick Kit                        | construcción     | ✅  | ✅  | ✅  | 296      |
| Building Kit                     | ciudad           | ✅  | ✅  | ✅  | 79       |
| **Car Kit**                      | **ciudad**       | ✅  | ✅  | ✅  | 50       |
| **Castle Kit**                   | **medieval**     | ✅  | ✅  | ✅  | 76       |
| **City Kit - Commercial**        | **ciudad**       | ✅  | ✅  | ✅  | 41       |
| City Kit - Industrial            | ciudad           | ✅  | ✅  | ✅  | 25       |
| **City Kit - Roads**             | **ciudad**       | ✅  | ✅  | ✅  | 72       |
| **City Kit - Suburban**          | **ciudad**       | ✅  | ✅  | ✅  | 40       |
| Coaster Kit                      | props            | ✅  | ✅  | ✅  | 183      |
| Cube Pets                        | personajes       | ✅  | ✅  | ✅  | 24       |
| Factory Kit                      | ciudad/industria | ✅  | ✅  | ✅  | 143      |
| **Fantasy Town Kit**             | **medieval**     | ✅  | ✅  | ✅  | 167      |
| **Food Kit**                     | **props**        | ✅  | ✅  | ✅  | 200      |
| **Furniture Kit**                | **props**        | ✅  | ✅  | ✅  | 140      |
| Graveyard Kit                    | medieval/props   | ✅  | ✅  | ✅  | 91       |
| Hexagon Kit                      | terreno          | ✅  | ✅  | ✅  | 72       |
| Holiday Kit                      | props            | ✅  | ✅  | ✅  | 99       |
| Marble Kit                       | props            | ✅  | ✅  | ✅  | 162      |
| Mini Arcade                      | props            | ✅  | ✅  | ✅  | 20       |
| Mini Arena                       | props            | ✅  | ✅  | ✅  | 22       |
| **Mini Characters**              | **personajes**   | ✅  | ✅  | ✅  | 26       |
| Mini Dungeon                     | medieval/dungeon | ✅  | ✅  | ✅  | 25       |
| **Mini Market**                  | **props/tienda** | ✅  | ✅  | ✅  | 20       |
| Mini Skate                       | props            | ✅  | ✅  | ✅  | 20       |
| Minigolf Kit                     | props            | ✅  | ✅  | ✅  | 126      |
| **Modular Buildings**            | **ciudad**       | ✅  | ✅  | ✅  | 108      |
| Modular Dungeon Kit              | medieval/dungeon | ✅  | ✅  | ✅  | 39       |
| Modular Space Kit                | sci-fi           | ✅  | ✅  | ✅  | 40       |
| **Nature Kit**                   | **naturaleza**   | ✅  | ✅  | ✅  | 329      |
| Nature Kit (Classic)             | naturaleza       | ⚠️  | ✅  | ✅  | 232 (.gltf) |
| Pirate Kit                       | temático         | ✅  | ✅  | ✅  | 72       |
| Platformer Kit                   | plataformas      | ✅  | ✅  | ✅  | 153      |
| Prototype Kit                    | greyboxing       | ✅  | ✅  | ✅  | 145      |
| Racing Kit                       | ciudad/racing    | ✅  | ✅  | ✅  | 112      |
| Retro Fantasy Kit                | medieval/retro   | ✅  | ✅  | ✅  | 160      |
| Retro Urban Kit                  | ciudad/retro     | ✅  | ✅  | ✅  | 124      |
| Road Pack                        | ciudad/calles    | ✅  | ✅  | ✅  | 294      |
| Space Kit                        | sci-fi           | ✅  | ✅  | ✅  | 153      |
| Space Station Kit                | sci-fi           | ✅  | ✅  | ✅  | 177      |
| Survival Kit                     | props            | ✅  | ✅  | ✅  | 80       |
| Tower Defense (Classic)          | temático         | ✅  | ✅  | ✅  | 119      |
| Tower Defense Kit                | temático         | ✅  | ✅  | ✅  | 160      |
| Toy Car Kit                      | props            | ✅  | ✅  | ✅  | 157      |
| Train Kit                        | ciudad/transporte| ✅  | ✅  | ✅  | 103      |
| Watercraft Pack                  | vehículos        | ✅  | ✅  | ✅  | 46       |
| Weapon Pack                      | props/armas      | ✅  | ✅  | ✅  | 37       |

**Total 3D:** 52 kits, ~5.900 modelos GLB. Los kits **en negrita** son los
candidatos para la selección "ciudad moderna + barrio medieval".

Extra relevante fuera de `3D assets`:
`Early access/Medieval Weapons` → 17 modelos GLB (hachas, picos, martillos,
espadas). Útil para las herramientas de skills (hacha, pico, caña, martillo)
del CLAUDE.md.

---

## Otras categorías (no-3D)

- **2D assets (151 packs):** sprites, tilesets, backgrounds, UI 2D, packs
  pixel-art. No se usan en la fase de mundo 3D. Reserva para HUD/iconos 2D
  más adelante.
- **Audio (16 packs):** `RPG Audio`, `Impact Sounds`, `Foley Sounds`,
  `Interface Sounds`, `UI Audio`, `Music Loops`, `Music Jingles`, etc.
  Reserva para la fase de sonido; no ahora.
- **UI assets (10 packs):** `UI Pack`, `UI Pack - Adventure`, `Cursor Pack`,
  `Mobile Controls`, `Fantasy UI Borders`. Muy útil para el HUD del MMO y
  controles mobile más adelante.
- **Icons (8 sets):** `Game Icons`, `Game Icons Expansion`, `Input Prompts`
  (teclado/gamepad/touch). Útil para inventario, skills y prompts de input.

---

## Recomendación para "ciudad moderna + barrio medieval"

Selección propuesta para la Tarea 3 (copiar SOLO estos GLB a
`public/assets/` por categoría, presupuesto ~40 MB). Todos estos usan GLB
directo.

### Base urbana (hub, plaza, calles)
| Kit                    | Para qué                                   | GLB size |
|------------------------|--------------------------------------------|----------|
| City Kit - Roads       | calles, cruces, veredas, rotondas          | 1.2 MB   |
| City Kit - Commercial  | edificios comerciales (banco, tiendas)     | 3.7 MB   |
| City Kit - Suburban    | casas/edificios residenciales del barrio   | 2.6 MB   |
| Modular Buildings      | fachadas modulares (armar edificios a medida) | 1.0 MB |
| Car Kit                | autos en las calles (ideal InstancedMesh)  | 5.5 MB   |

Opcional urbano: `City Kit - Industrial` (2.5 MB) para zona de gathering
tipo depósito/fábrica; `Retro Urban Kit` (alternativa estética).

### Zona medieval (casco antiguo)
| Kit               | Para qué                                    | GLB size |
|-------------------|---------------------------------------------|----------|
| Fantasy Town Kit  | casas medievales, carts, cercas, banners, mercado | 2.8 MB |
| Castle Kit        | murallas, torres, puente levadizo, portal   | 2.2 MB   |

Opcional medieval: `Graveyard Kit` (tumbas → mecánica de loot al morir en
PvP), `Mini Dungeon` / `Modular Dungeon Kit` (interiores/dungeon).

### Verde (parque, plaza)
| Kit         | Para qué                                       | GLB size |
|-------------|------------------------------------------------|----------|
| Nature Kit  | árboles, arbustos, rocas, puentes, flores, fuente/agua | 3.6 MB |

### Props (mobiliario urbano, tiendas, comida)
| Kit           | Para qué                                     | GLB size |
|---------------|----------------------------------------------|----------|
| Furniture Kit | interiores de banco/tiendas/casas            | 2.2 MB   |
| Food Kit      | comida (skill Cooking, mercado)              | 3.7 MB   |
| Mini Market   | tienda/almacén completo (estanterías, cajas) | 0.8 MB   |

### Personajes placeholder
| Kit               | Para qué                                    | GLB size |
|-------------------|---------------------------------------------|----------|
| Mini Characters   | NPCs/jugador humano estilizado (12 modelos + accesorios) | 3.4 MB |
| Blocky Characters | alternativa low-poly tipo bloque (18 variantes) | 2.3 MB |

> Nota: estos placeholders vienen **sin animar** (T-pose). Los
> `Animated Characters` sí traen animaciones pero **solo en FBX** — quedan
> como opción a futuro (requieren conversión FBX→GLB).

### Herramientas de skills (bonus)
`Early access/Medieval Weapons` → hacha, pico, martillo, espada (17 GLB) para
Woodcutting/Mining y combate.

**Suma aproximada de la selección core:** ~38 MB de GLB → entra en el
presupuesto de ~40 MB. Si aprieta, `Car Kit` y `Food Kit` son los más
pesados y se pueden recortar a un subconjunto de modelos.

---

## Estado — assets ya copiados a `public/assets/`

Aprobado el inventario, se copió la **base urbana completa** (Tarea 3
parcial) + UI. Total en repo: ~18 MB.

| Carpeta destino                       | Origen (kit)          | GLB |
|---------------------------------------|-----------------------|-----|
| `public/assets/city/roads/`           | City Kit - Roads      | 72  |
| `public/assets/city/commercial/`      | City Kit - Commercial | 41  |
| `public/assets/city/suburban/`        | City Kit - Suburban   | 40  |
| `public/assets/city/industrial/`      | City Kit - Industrial | 25  |
| `public/assets/city/modular-buildings/` | Modular Buildings   | 108 |
| `public/assets/city/cars/`            | Car Kit               | 50  |
| `public/assets/ui/blue/` `grey/` `spritesheet/` | UI Pack     | —   |

Cada carpeta de kit incluye su `Textures/colormap.png` (los GLB la
referencian de forma relativa).

## Próximos pasos (assets)

Pendiente de copiar cuando encaremos el **barrio medieval** y la naturaleza:
- Medieval: `Fantasy Town Kit`, `Castle Kit` (+ `Graveyard Kit` para tumbas).
- Verde: `Nature Kit` (fuente/plaza, zonas de gathering).
- Props: `Furniture Kit`, `Food Kit`, `Mini Market`.
- Personajes placeholder: `Mini Characters` / `Blocky Characters`.
