# Separación de repos y proyectos Supabase

> **Estado:** vigente al 2026-10-22.
> Reemplaza al runbook histórico, que describía la separación al revés. La copia vieja vive en
> `quimicashop/diagrams/SEPARACION.md` y no debe usarse como guía.

---

## Resultado real

| Repo | Contenido | Deploy | Supabase |
|---|---|---|---|
| `esenciatecnica` (este) | Tienda Next.js, `/admin`, APIs, tests | Vercel | Proyecto **e-commerce** `otjphjnrwihqzzhbfnmh` |
| `quimicashop` | Hub (`index.html`), Teams (`tasks.html`, `tasks.js`), `style.css`, `diagrams/` | GitHub Pages | Proyecto **Teams** `uchyattzuhaltsaxazce` (`team_*`) |

El proyecto viejo `uchyattzuhaltsaxazce` conserva además el esquema legacy del e-commerce
(`productos`, `pedidos`, `verificaciones`) y el catálogo de laboratorio. Es historia: **no** se usa para
el e-commerce nuevo.

---

## Variables

### E-commerce (`esenciatecnica/.env.local` y Vercel)

```env
NEXT_PUBLIC_SUPABASE_URL=https://otjphjnrwihqzzhbfnmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
ADMIN_PASSWORD=...
```

### Teams (`quimicashop/config.js`)

```js
window.QUIMICASHOP_CONFIG = {
  supabaseUrl: "https://uchyattzuhaltsaxazce.supabase.co",
  supabaseAnonKey: "...",
  notificationsApi: "https://esenciatecnica.vercel.app/api/notifications",
};
```

- `config.js` solo lleva la **anon key** (pública).
- La **service role** y `RESEND_API_KEY` nunca van al cliente.
- `/api/notifications` es el único puente vivo; si se migra a Teams, se borran `TEAMS_*` del e-commerce.
- Con la tienda en `esenciatecnica.vercel.app`, el `config.js` del Hub tiene que apuntar al dominio nuevo;
  si no, las notificaciones siguen saliendo al dominio heredado `quimicashop.vercel.app`.

---

## Estado de la migración

1. La base del e-commerce (`otjphjnrwihqzzhbfnmh`) tiene aplicadas las migraciones `00`–`06`, datos de demo sembrados (#22) y `npm run bd:viva` en **VERDE**.
2. El código Next.js usa exclusivamente el modelo aprobado en [`MODELO.md`](../MODELO.md) (sin esquema legacy, sin i18n y sin IA).
3. Producción en Vercel (`esenciatecnica.vercel.app`) apunta a `otjphjnrwihqzzhbfnmh`.
4. El DER académico se adapta al modelo operativo; no al revés.

---

## SQL de Teams

Los DDL de Teams viven en el repo `quimicashop`:

- `diagrams/supabase_teams_schema.sql`
- `diagrams/create_team_discussions.sql`

No se copian a este repo.

---

## Checklist de verificación

- [x] `.env.local` y Vercel apuntan al proyecto e-commerce (`otjph…`).
- [x] `config.js` apunta al proyecto Teams (`uchy…`).
- [x] La service role no está en el cliente ni en Git.
- [x] `/api/notifications` responde con las claves de Teams.
- [x] La tienda no consulta tablas `team_*`.
- [x] El panel `/admin` no consulta el catálogo legacy.
