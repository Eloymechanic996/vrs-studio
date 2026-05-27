# VRS Studio

> Control de competición para karting, monoplazas, rally y motorsport en general.
> Cronómetro con sectores, análisis de pace, comparativa entre sesiones, link
> público para compartir, y export a Excel. PWA instalable + binario desktop.

**Live:** <https://vrs-studio-web.vercel.app>

---

## Qué es

VRS Studio es una herramienta para que un mecánico o ingeniero de pista registre
y analice sesiones de competición. Datos en la nube, sincronización en tiempo
real entre dispositivos, y análisis automático de pace.

Esta reescritura sustituye la app original en Python (tkinter + openpyxl) por
una webapp moderna que funciona en cualquier dispositivo y añade métricas que
antes había que sacar a mano en Excel.

## Stack

- **Frontend:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4
- **Backend:** Supabase (Auth + Postgres + RLS + Realtime)
- **PWA:** Serwist (Service Worker + manifest, instalable, offline tras primera carga)
- **Desktop:** Tauri 2 (wrapper nativo de la PWA, build .exe / .msi / .dmg / .deb)
- **Excel:** ExcelJS (6 hojas: Resumen, Tiempos, Sectores, Stints, Eventos, Setup)
- **Gráficas:** SVG nativo, sin librerías externas
- **Hosting:** Vercel

## Funcionalidades

### Sesión
- Datos generales: modalidad, tipo, categoría, campeonato, equipo, evento, circuito,
  fecha, piloto, chasis, motor, clima, temperaturas, notas.
- Sectores configurables (0–10 por sesión).
- Link público read-only (`/s/<slug>`).

### Cronómetro
- Start / pause / reset / registrar vuelta.
- Atajo `Espacio` en desktop.
- Soporte de sectores: el botón cicla `S1 → S2 → … → vuelta`.
- Estado de pista: Green / Yellow / Red Flag, Safety Car, VSC, Pit Lane.
- Editar vueltas existentes (tiempo, estado, notas).

### Análisis (automático)
- **Delta a la mejor vuelta** por cada vuelta.
- **Media de vueltas limpias** (solo Green Flag, ignora pit / SC).
- **Desviación típica** y **coeficiente de variación**.
- **Etiqueta de consistencia** calibrada para karting (Excelente / Muy buena /
  Buena / Aceptable / Irregular).
- **Mejor sector** + **vuelta teórica** (suma de mejores sectores).
- **Análisis de stints**: detecta automáticamente stints por Pit In/Out, calcula
  best / media / desviación / decay por regresión lineal.
- **Tiempo de pit stop automático** entre Pit In y Pit Out emparejados.
- **Gráfica de evolución** SVG con tooltip.

### Comparativa
- Página `/compare` para elegir dos sesiones.
- Stats lado a lado, diferencia B−A, tabla vuelta a vuelta coloreada.
- Gráfica de evolución con ambas series superpuestas.

### Multi-dispositivo
- Realtime sync: el mecánico apunta una vuelta en el móvil y al ingeniero le
  aparece en el portátil sin recargar.
- PWA instalable en Android/Chrome/Edge (un click) y iOS (hint manual).
- Funciona offline tras la primera carga (Service Worker cacheando).

### Privacidad
- Sesiones privadas por defecto (RLS owner-only).
- Toggle "Pública" por sesión: genera slug aleatorio y URL pública read-only.
- Borrado en cascada al eliminar sesión o cuenta.

---

## Estructura del repo

```
vrs-studio-web/
├── src/                           # Código de la webapp
│   ├── app/
│   │   ├── (app)/                 # Rutas protegidas (auth required)
│   │   │   ├── page.tsx           # Dashboard / lista de sesiones
│   │   │   ├── sessions/
│   │   │   │   ├── new/           # Crear sesión
│   │   │   │   └── [id]/          # Workspace de sesión (tabs)
│   │   │   ├── compare/           # Comparativa entre sesiones
│   │   │   └── actions.ts         # Server actions
│   │   ├── login/                 # Auth (signin/signup)
│   │   ├── s/[slug]/              # Vista pública read-only
│   │   ├── api/sessions/[id]/export/  # Excel export
│   │   ├── layout.tsx
│   │   └── sw.ts                  # Service Worker (Serwist)
│   ├── components/
│   │   ├── ui/                    # Primitivas (button, input, card, badge)
│   │   ├── app-shell.tsx
│   │   ├── lap-chart.tsx          # Gráfica SVG
│   │   ├── install-prompt.tsx     # PWA install banner
│   │   ├── realtime-refresher.tsx # Supabase Realtime hook
│   │   └── register-pwa.tsx
│   ├── lib/
│   │   ├── supabase/              # Clientes browser/server/proxy + types
│   │   ├── stats.ts               # Pace, sectores, stints
│   │   └── utils.ts               # cn(), formatLapTime(), parseLapTime()
│   └── proxy.ts                   # Next.js 16 proxy (auth refresh)
├── src-tauri/                     # Wrapper desktop (Tauri 2)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── src/main.rs
│   └── icons/
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql
│       └── 0002_sectors_share_realtime.sql
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker (generado en build)
│   └── icons/
├── scripts/
│   ├── build-changelog-pdf.py     # Genera VRS-Studio-Cambios.pdf
│   └── generate-tauri-icons.mjs   # Iconos para Tauri
└── .github/workflows/
    └── desktop-release.yml        # CI: build .exe/.msi/.dmg/.deb
```

---

## Desarrollo local

### Requisitos
- Node 20+
- Cuenta Supabase con el proyecto creado y las migraciones aplicadas

### Setup

```bash
git clone https://github.com/Eloymechanic996/vrs-studio.git
cd vrs-studio
git checkout web        # rama con la PWA (la rama main es la app Python original)

npm install
```

Crea `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

Aplica migraciones en Supabase (SQL Editor):

1. `supabase/migrations/0001_initial_schema.sql` — tablas base + RLS
2. `supabase/migrations/0002_sectors_share_realtime.sql` — sectores, share, realtime

Configura `Authentication → URL Configuration` en Supabase:
- `Site URL`: la URL donde vas a desplegar
- `Redirect URLs`: añade el dominio

Arranca:

```bash
npm run dev
```

→ <http://localhost:3000>

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción (webpack, requerido por Serwist PWA) |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `python scripts/build-changelog-pdf.py` | Regenera el PDF de cambios |
| `node scripts/generate-tauri-icons.mjs` | Regenera iconos para Tauri |

---

## Deploy (web)

Ver [DEPLOYMENT.md](./DEPLOYMENT.md).

Resumen: `npx vercel deploy --prod` con las 3 env vars configuradas
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

## Desktop (Tauri)

El binario desktop **envuelve** la PWA en producción. No es una app standalone,
es un wrapper nativo que da una ventana sin barra de URL y un instalador `.exe` /
`.msi` / `.dmg` / `.deb` distribuible.

### Construir local (necesita Rust + MSVC build tools)

```bash
# Una vez: instala Rust desde https://rustup.rs
# En Windows también necesitas Microsoft C++ Build Tools.

cd src-tauri
cargo build --release          # debug build
# o desde la raíz:
npm install --save-dev @tauri-apps/cli
npx tauri build                # bundle .exe + .msi
```

### Construir vía CI (recomendado, sin instalar nada local)

Push de un tag con prefijo `desktop-v`:

```bash
git tag desktop-v1.0.0
git push origin desktop-v1.0.0
```

El workflow [`.github/workflows/desktop-release.yml`](./.github/workflows/desktop-release.yml)
construye automáticamente en Windows + macOS + Linux y publica los instaladores
como release de GitHub.

---

## Documentación

- [DEPLOYMENT.md](./DEPLOYMENT.md) — guía completa de despliegue (Supabase, Vercel, Tauri)
- [VRS-Studio-Cambios.pdf](./VRS-Studio-Cambios.pdf) — resumen visual de cambios para tu equipo
- [supabase/migrations/](./supabase/migrations/) — schema SQL idempotente

## Licencia

Sin licencia explícita. Si planeas usarlo o redistribuirlo, abre un issue.
