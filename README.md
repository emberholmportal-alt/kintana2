# KINTANA2

MMO isométrico low-poly en el navegador (prototipo visual). Ciudad moderna
low-poly con cámara isométrica tipo Kintara, construida con **Three.js +
Vite**. Assets: pack CC0 de Kenney.

> Fase actual: **solo la parte gráfica/visual del mundo.** Backend, economía
> y token vienen después. Ver `CLAUDE.md` para el plan completo y `ASSETS.md`
> para el inventario de assets.

![prototipo](docs/preview.png)

## Qué hay hasta ahora

- Escena Three.js con **cámara ortográfica isométrica** (ángulo clásico
  ~35°, azimut 45°) que **sigue al jugador**, con orbitar/zoom.
- **Isla generada proceduralmente** (40×40 tiles) rodeada de **agua**:
  - **Avenidas anchas** (2 tiles) en cuadrícula con cruces y autos.
  - Distritos: **downtown** de rascacielos, **suburbios**, **plaza/hub**,
    un **parque**, **skatepark**, **feria/mercado** y **cementerio**.
  - **Puerto** en la costa sur: muelles de madera, barcos, transatlántico,
    carguero, contenedores y boyas.
- **Escala coherente** anclada al personaje (edificios/autos/objetos
  proporcionados a la altura del jugador).
- **Personaje** con **click-to-move** (pathfinding A* que esquiva
  edificios) y **animaciones** (idle/walk) desde el rig de Kenney.
- **HUD** con assets UI de Kenney (skills: Combat / Woodcutting / Mining /
  Fishing / Cooking) e indicador de avatar.
- Sombras, niebla de profundidad, agua y suelo de pasto.

Assets 3D en `public/assets/`: `city/` (City Kit + Car Kit), `characters/`
(Mini Characters, animados), `market/`, `skate/`, `graveyard/`, `port/`
(Watercraft) y `ui/` (UI Pack). Todo CC0 de Kenney.

## Correr en local

```bash
npm install
npm run dev      # servidor de desarrollo (http://localhost:5173)
```

Build de producción:

```bash
npm run build    # genera dist/
npm run preview  # sirve dist/ para probar el build
```

## Deploy en Render (Static Site)

El proyecto es un sitio estático: Render lo compila con Vite y sirve la
carpeta `dist/`.

### Opción A — desde el dashboard de Render (recomendado)

1. Entrá a <https://dashboard.render.com> → **New +** → **Static Site**.
2. Conectá tu cuenta de GitHub y elegí el repo **`kintana2`**.
3. Configurá:
   - **Branch**: `main` (o la que quieras desplegar).
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Node Version**: 18 o superior (Render usa 20 por defecto; ok).
4. **Create Static Site**. Render clona, corre el build y publica en una URL
   `https://kintana2.onrender.com` (o similar). Cada push a esa branch
   redeploya solo.

> No hacen falta variables de entorno para el prototipo.

### Opción B — Infrastructure as Code (`render.yaml`)

Ya dejé un `render.yaml` en la raíz. Con **Blueprints** de Render
(**New + → Blueprint**), Render lee ese archivo y crea el static site con la
config correcta automáticamente. Solo tenés que apuntarlo al repo.

### Notas

- El bundle JS incluye Three.js (~590 KB, ~150 KB gzip). Para el prototipo
  está bien; más adelante se puede optimizar (code-splitting, comprimir GLB).
- `dist/` y `node_modules/` están gitignoreados: Render los regenera.
- SPA de una sola ruta; no hace falta configurar rewrites.

## Estructura

```
kintana2/
├─ index.html          # entry + overlay de carga + HUD
├─ src/
│  ├─ main.js          # escena, cámara iso, isla+puerto procedural, personaje
│  ├─ assets.js        # manifiesto de modelos GLB por categoría
│  └─ style.css        # estilos del HUD/loader
├─ public/assets/
│  ├─ city/ characters/ market/ skate/ graveyard/ port/ ui/
├─ render.yaml         # config de deploy en Render
├─ vite.config.js
├─ ASSETS.md           # inventario del pack Kenney + recomendación
└─ CLAUDE.md           # guía del proyecto y fases
```

## Próximos pasos (según CLAUDE.md)

- Barrio **medieval** como distrito aparte (Fantasy Town Kit + Castle Kit).
- **Naturaleza** dedicada (Nature Kit) para fuente/gathering.
- Animaciones extra del rig (correr, pescar, minar, combate) por skill.
- Recursos y herramientas (hacha, pico, caña) sobre el mundo.
