# Deployment

Guía para desplegar VRS Studio desde cero en otra cuenta.

## 1. Supabase

1. Crea un proyecto en <https://supabase.com/dashboard> (Europa para España).
2. Con la CLI v3 y el proyecto enlazado (`supabase link --project-ref <ref>`):

   ```bash
   supabase db push --remote --yes
   ```

   Aplica las migraciones de [`supabase/migrations/`](./supabase/migrations/) en orden.
3. En `Authentication → URL Configuration`:
   - **Site URL:** tu dominio final (ej. `https://vrs-studio.vercel.app`).
   - **Redirect URLs:** `https://<tu-dominio>/**` y `http://localhost:3000/**`.

   Sin esto, los correos de confirmación apuntan a `localhost`.
4. En `Settings → API` copia la URL y la clave pública (*publishable*).

Los correos de confirmación y de contraseña llegan a `/auth/confirm`. El plan gratuito
envía muy pocos correos por hora: para más usuarios configura un SMTP propio.

La app no usa la clave `service_role`.

## 2. Vercel

Variables necesarias (Production, Preview y Development):

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (publishable) |

Importa el repositorio, marca `web` como rama de producción y deja el framework en Next.js.
[`vercel.json`](./vercel.json) programa una llamada diaria a `/api/health` para que el
proyecto gratuito de Supabase no se pause por inactividad.

### Comprobación

```bash
curl -I https://<tu-dominio>/login         # 200
curl -I https://<tu-dominio>/sw.js         # 200
curl -I https://<tu-dominio>/manifest.json # 200
curl -I https://<tu-dominio>/              # 307 a /login
curl    https://<tu-dominio>/api/health    # {"ok":true}
```

---

## 3. Desktop (Tauri) — opcional

El binario desktop **wrappea la PWA** en producción. Da una ventana nativa sin
barra de URL y un instalador descargable. No es una app standalone con su propia
DB; sigue usando Supabase + la deployment de Vercel.

### Vía GitHub Actions (recomendado, no necesitas Rust local)

1. Asegúrate que el workflow está en `.github/workflows/desktop-release.yml`.
2. Push de un tag:

   ```bash
   git tag desktop-v1.0.0
   git push origin desktop-v1.0.0
   ```

3. GitHub Actions construye en paralelo en Windows, macOS y Linux.
4. Tras ~10 min, tienes una release en
   `https://github.com/<owner>/<repo>/releases/tag/desktop-v1.0.0` con:
   - `VRS Studio_1.0.0_x64-setup.exe` (Windows NSIS)
   - `VRS Studio_1.0.0_x64_en-US.msi` (Windows MSI)
   - `VRS Studio_1.0.0_aarch64.dmg` / `_x64.dmg` (macOS)
   - `vrs-studio_1.0.0_amd64.deb` / `.AppImage` (Linux)

5. Si solo quieres trigger manual sin tag: `Actions → Desktop release → Run workflow`.

### Build local en Windows

Requisitos:

1. **Rust:** instala desde <https://rustup.rs>.
2. **Microsoft C++ Build Tools:** descarga desde Visual Studio Installer y
   marca el workload "Desktop development with C++". Si no, `cargo build` falla.
3. **WebView2 Runtime:** ya viene en Windows 10/11 modernos.

Construir:

```bash
node scripts/generate-tauri-icons.mjs  # solo la primera vez
npm install --save-dev @tauri-apps/cli
npx tauri build
```

Los instaladores aparecen en `src-tauri/target/release/bundle/`.

### Build local en macOS

```bash
brew install --cask visual-studio-code  # opcional
# Necesitas Xcode Command Line Tools:
xcode-select --install

node scripts/generate-tauri-icons.mjs
npx tauri build
```

El `.dmg` aparece en `src-tauri/target/release/bundle/dmg/`.

> El icono `.icns` se genera con `iconutil` solo en macOS. En Windows/Linux el
> build no genera macOS bundles.

---

## 4. Verificación post-deploy

Checklist completo tras desplegar:

- [ ] Abre `/login` → ves el formulario.
- [ ] Crea cuenta nueva → recibes email de confirmación (o entras directo si
      lo desactivaste).
- [ ] Crea una sesión vacía → te lleva al workspace.
- [ ] Inicia cronómetro → cuenta tiempo real.
- [ ] Registra 3 vueltas → aparecen en la tabla con delta.
- [ ] Stats del summary se actualizan (media, σ, CV%, consistencia).
- [ ] Pestaña Stints muestra el stint inicial.
- [ ] Botón "Privada" → activa share → URL pública funciona en navegador incógnito.
- [ ] Exportar Excel → descarga `.xlsx` con 6 hojas.
- [ ] Abre la misma sesión en otro dispositivo (móvil) → cambios sincronizan
      en tiempo real.

---

## 5. Troubleshooting

### "Failed to fetch" en login
- Las env vars de Supabase están mal puestas o no se redeployó tras añadirlas.
  En Vercel: redeploy manual desde el dashboard.

### Service Worker no se registra
- Debe haber `/sw.js` accesible (200). Si da 404, el build se hizo con Turbopack
  en vez de webpack. El `package.json` ya tiene `next build --webpack`; si lo
  cambias, el SW no se genera.

### Realtime no funciona
- En Supabase: `Database → Replication → supabase_realtime` debe tener
  `sessions`, `laps`, `events`, `lap_sectors`. Las migraciones las añaden.

### Enlace público da 404
- La sesión debe estar marcada como pública. La página usa la función SQL
  `get_public_session`, incluida en las migraciones.

### Tauri build falla en CI
- `windows-latest`: WebView2 SDK debería estar en el runner. Si falla,
  añade `webview2-com = "0.30"` a `src-tauri/Cargo.toml`.
- `macos-latest`: necesita firma de código para .dmg distribuibles. Sin firma
  el .dmg se crea pero macOS lo bloquea por Gatekeeper.
- `ubuntu-22.04`: instala `libwebkit2gtk-4.1-dev`, ya está en el workflow.

---

## 6. Costes (free tier)

- **Supabase free:** 500 MB DB, 5 GB transferencia/mes, 50K usuarios mensuales.
  Más que suficiente para uso de un equipo de karting.
- **Vercel Hobby:** 100 GB transferencia, builds ilimitados para uso personal.
  No para uso comercial — si va a ser comercial, plan Pro ($20/mes).
- **Vercel functions:** 100 GB·h/mes en Hobby, suficiente para esta app.

Si la app crece a varios equipos profesionales activos, plan Pro de Vercel
($20) + Supabase Pro ($25) cubren ampliamente.
