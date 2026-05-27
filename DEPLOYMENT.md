# Deployment

Guía paso a paso para desplegar VRS Studio desde cero en otra cuenta.

## 1. Supabase

### Crear el proyecto

1. Entra en <https://supabase.com/dashboard> → **New project**.
2. Región: la más cercana a los usuarios (Europe West para España).
3. Apunta la **Database password** que generes (no la necesitarás para la app
   pero sí si quieres acceder vía `psql`).
4. Espera ~2 min a que el proyecto esté listo.

### Aplicar migraciones

`Database → SQL Editor → New query`:

1. Pega el contenido de [`supabase/migrations/0001_initial_schema.sql`](./supabase/migrations/0001_initial_schema.sql) → Run.
2. Pega el contenido de [`supabase/migrations/0002_sectors_share_realtime.sql`](./supabase/migrations/0002_sectors_share_realtime.sql) → Run.

Ambas migraciones son **idempotentes**: puedes correrlas varias veces sin miedo.
Si ves errores tipo `duplicate_object`, los puedes ignorar (vienen de objetos
que ya existían).

### Realtime

La migración 0002 ya añade las tablas a la publicación `supabase_realtime`. Si
quieres comprobarlo: `Database → Replication → supabase_realtime`. Debes ver
`sessions`, `laps`, `events` y `lap_sectors`.

### Auth

`Authentication → Providers → Email`: activado por defecto.

Si quieres signup sin confirmación de correo (útil para pruebas internas):
`Authentication → Sign In / Up → Email → desactivar "Confirm email"`.

### URL Configuration

`Authentication → URL Configuration`:

- **Site URL:** tu dominio final (ej. `https://vrs-studio-web.vercel.app`).
- **Redirect URLs:** añade `https://<tu-dominio>/**` y, si usas previews,
  `https://*.vercel.app/**`.

Sin esto, los emails de confirmación apuntan a `localhost`.

### Obtener las claves

`Settings → API`:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (no expuesta al navegador)

---

## 2. Vercel

### Opción A — CLI (sin GitHub)

```bash
cd vrs-studio-web
npx vercel login                       # si no estás logueado
npx vercel link --yes --project vrs-studio-web

# Añadir env vars (cada comando lee el valor de stdin):
echo "https://<tu-proyecto>.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "<anon-public-key>" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "<service-role-key>" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production

npx vercel deploy --prod --yes
```

### Opción B — GitHub integration

1. En Vercel: **Add New… → Project → Import from GitHub**.
2. Selecciona el repo y la rama `web`.
3. **Root Directory:** `vrs-studio-web` (si el repo tiene la app en subcarpeta).
4. **Build Command:** dejar el default (`npm run build`).
5. Añade las 3 env vars en `Project Settings → Environment Variables` antes
   del primer deploy.

### Smoke test

```bash
curl -I https://<tu-dominio>/login        # 200
curl -I https://<tu-dominio>/sw.js        # 200
curl -I https://<tu-dominio>/manifest.json # 200
curl -I https://<tu-dominio>/             # 307 a /login (proxy auth)
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
cd vrs-studio-web
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

cd vrs-studio-web
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
  `sessions`, `laps`, `events`, `lap_sectors`. La migración 0002 las añade,
  pero si fallaron silenciosamente, añádelas manualmente desde la UI.

### Share público da 404
- El slug se genera vía `generate_session_slug()` (función SQL en migración
  0002). Si no existe, el toggle falla en silencio.
- Verifica: `select pg_get_functiondef('public.generate_session_slug'::regproc);`

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
