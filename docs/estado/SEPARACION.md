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

1. La base nueva del e-commerce ya tiene el DER normalizado y datos de prueba.
2. El código Next.js todavía consulta el esquema legacy (`productos`, `pedidos`, `verificaciones`).
   i18n y Gemini ya se retiraron (`T0 · Español único` y `a984727`).
3. El modelo objetivo está en [`MODELO.md`](../MODELO.md); la brecha y el plan, en
   [`AUDITORIA.md`](AUDITORIA.md).
4. El DER académico se adapta al modelo operativo; no al revés.

---

## SQL de Teams

Los DDL de Teams viven en el repo `quimicashop`:

- `diagrams/supabase_teams_schema.sql`
- `diagrams/create_team_discussions.sql`

No se copian a este repo.

---

## Checklist de verificación

- [ ] `.env.local` apunta al proyecto e-commerce.
- [ ] `config.js` apunta al proyecto Teams.
- [ ] La service role no está en el cliente ni en Git.
- [ ] `/api/notifications` responde con las claves de Teams.
- [ ] La tienda no consulta tablas `team_*`.
- [ ] El panel `/admin` no consulta el catálogo legacy.
