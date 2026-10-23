# Runbook · Separación de `quimicashop` y `esenciatecnica`

Este documento describe cómo pasar del repo único actual a dos repositorios con claves separadas.

## Resultado esperado

| Repo | Contenido | Deploy | Supabase |
|---|---|---|---|
| `quimicashop` | Hub (`index.html`), Teams (`tasks.html`, `tasks.js`), `style.css`, `diagrams/` | GitHub Pages | Proyecto **Teams** (tablas `team_*`) |
| `esenciatecnica` | Next.js: tienda, `/admin`, APIs | Vercel | Proyecto **E-Commerce / Química** |

> Criterio acordado: el proyecto Supabase actual (`uchyattzuhaltsaxazce`) queda como **e-commerce / química**.
> Se crea un proyecto nuevo para **Teams**.

---

## 1. Crear el proyecto Supabase de Teams

1. Supabase Dashboard → **New project** → nombre `quimicashop-teams`.
2. Guardar:
   - `Project URL` → `TEAMS_SUPABASE_URL`
   - `anon public key` → `TEAMS_SUPABASE_ANON_KEY`
   - `service_role key` → solo para migraciones, nunca al frontend.
3. En **SQL Editor**, ejecutar en orden:
   - `diagrams/supabase_teams_schema.sql`
   - `diagrams/create_team_discussions.sql`
4. Migrar datos existentes (si hay):
   ```sql
   -- En el proyecto viejo: exportar CSV de team_members, team_tasks, task_notes,
   -- team_meetings, team_discussions, team_discussion_comments.
   -- En el proyecto nuevo: importar esos CSV con el Table Editor.
   ```
5. Verificar RLS. Las políticas actuales son permisivas (`USING (true)`), lo que permite escritura
   con la anon key. Para producción, restringir escritura a los DNIs/perfiles del equipo.

---

## 2. Actualizar el repo `quimicashop`

1. Editar `config.js`:
   ```js
   window.QUIMICASHOP_CONFIG = {
     supabaseUrl: "https://TU-PROYECTO-TEAMS.supabase.co",
     supabaseAnonKey: "TU_ANON_KEY_DE_TEAMS",
     notificationsApi: "https://TU-ECOMM.vercel.app/api/notifications",
   };
   ```
2. `index.html` y `tasks.html` cargan `config.js` antes de su script.
3. `tasks.js` lee la configuración desde `window.QUIMICASHOP_CONFIG`.
4. Deploy: GitHub Pages (workflow `.github/workflows/pages.yml`).
5. Si el proyecto Vercel `quimicashop` estaba conectado a este repo, desconectarlo o cambiar el
   framework preset a estático. El dominio del ecomm se configura en el proyecto nuevo.

---

## 3. Actualizar el repo `esenciatecnica`

1. `.env.local` con el proyecto Supabase **e-commerce** (el actual `uchyattzuhaltsaxazce`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://uchyattzuhaltsaxazce.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
2. Para que `/api/notifications` siga leyendo `team_members` del proyecto Teams:
   ```
   TEAMS_SUPABASE_URL=https://TU-PROYECTO-TEAMS.supabase.co
   TEAMS_SUPABASE_ANON_KEY=...
   ```
   Sin estas variables, el endpoint cae al proyecto e-commerce (comportamiento anterior).
3. Cargar las mismas variables en Vercel → **Project Settings → Environment Variables**.
4. `RESEND_API_KEY` se mantiene como está (decisión actual: una sola cuenta para Química).
   Si más adelante se quiere aislar, crear una key nueva para Teams y mover el endpoint.

---

## 4. Crear y conectar el repo nuevo

```bash
# En GitHub: crear repo vacío `esenciatecnica` (sin README).
cd ../esenciatecnica
git init
git add -A
git commit -m "chore: repo inicial del e-commerce separado de quimicashop"
git branch -M main
git remote add origin https://github.com/juanmamerodio/esenciatecnica.git
git push -u origin main
```

En Vercel:
1. **Add New Project** → importar `esenciatecnica`.
2. Framework: Next.js (autodetectado).
3. Cargar env vars.
4. Deploy.
5. Asignar dominio. Opción A: mantener `quimicashop.vercel.app` (cambiar el proyecto conectado).
   Opción B: usar `esenciatecnica.vercel.app` y actualizar `quimicashop/config.js`.

---

## 5. Limpieza de claves

- [ ] Rotar `SUPABASE_SERVICE_ROLE_KEY` del proyecto viejo si estuvo alguna vez en un `.env` compartido.
- [ ] Confirmar que `.env.local` está ignorado en ambos repos.
- [ ] Confirmar que `config.js` solo contiene la **anon key** (pública).
- [ ] Retirar `GEMINI_API_KEY` cuando se elimine `src/lib/gemini.ts`.
- [ ] Revisar que ningún HTML/JS del Hub tenga la service role key.

---

## 6. Verificación post-split

```bash
# Ecomm
cd esenciatecnica
npm install
npm run typecheck
npm run build

# Teams/Hub
cd ../quimicashop
node --check tasks.js
# Abrir index.html y tasks.html con un servidor local:
# npx serve .
```

Checklist funcional:
- [ ] `/es` lista productos.
- [ ] Checkout crea pedido y sube comprobante.
- [ ] `/admin` lista pedidos y stock bajo.
- [ ] Teams carga tareas, reuniones y minutas desde el proyecto Supabase de Teams.
- [ ] Una convocatoria de Teams dispara el email vía `/api/notifications`.
- [ ] El Hub muestra el progreso del sprint.
