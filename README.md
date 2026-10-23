# Esencia Técnica · E-Commerce

> Tienda online, checkout con comprobante, panel `/admin` y APIs del proyecto **Esencia Técnica**.
> **E.E.S.T N°1 Luciano Reyes** · Campana, Buenos Aires · 7mo Año Programación 2026.

---

## 🧭 Alcance de este repositorio

Este repo contiene **solamente el e-commerce**:

- Catálogo i18n (`/es`, `/en`), carrito y checkout.
- Carga del comprobante de transferencia y reserva de stock.
- Panel del Administrador en `/admin` (validación manual y despacho).
- APIs de pedidos, productos, comprobantes, sincronización y notificaciones.

El **Hub de documentación** y el **entorno Teams** (Kanban, reuniones, minutas, bandeja) viven en el repo
[`quimicashop`](https://github.com/juanmamerodio/quimicashop). No agregues acá HTML del Hub, `tasks.js`,
`style.css` ni minutas: esos archivos pertenecen al otro repo.

```
esenciatecnica/
├── src/
│   ├── app/
│   │   ├── [lang]/              ← Catálogo, carrito, checkout, about
│   │   ├── admin/               ← Panel del Administrador
│   │   └── api/                 ← orders, products, verify-payment, notifications, sync-sheets
│   ├── components/              ← UI React
│   ├── services/                ← OrderService, ProductService
│   ├── lib/                     ← Supabase, Zod, i18n, store
│   └── dictionaries/            ← es.json / en.json
├── docs/                        ← DER, DCU e informe de cátedra
├── public/
├── middleware.ts                ← i18n + Basic Auth de /admin
├── .env.example                 ← Variables SOLO del e-commerce
└── .github/workflows/ci.yml     ← Build de Next.js
```

---

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript estricto |
| Estilos | Tailwind CSS 3.x + CSS |
| Datos | Supabase (PostgreSQL + Storage) |
| Emails | Resend |
| Validación de pago | **Manual, por el Administrador** (flujo oficial) |
| Deploy | Vercel |

---

## 🚀 Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar con las claves del proyecto ECOMM
npm run dev
```

- Tienda: `http://localhost:3000/es`
- Admin: `http://localhost:3000/admin` (Basic Auth con `ADMIN_PASSWORD`)
- Typecheck: `npm run typecheck`
- Build: `npm run build`

---

## 🔑 Variables de entorno y separación de claves

La regla del proyecto es **una clave por repo, un proyecto Supabase por dominio**:

| Variable | Dónde vive | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Vercel del ecomm + `.env.local` | Proyecto Supabase del e-commerce |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo Vercel / servidor | RPC de stock, Storage, panel admin |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Solo Vercel | Correos de pedidos y comprobantes |
| `ADMIN_PASSWORD` | Solo Vercel | Basic Auth de `/admin` |
| `SHEETS_WEBHOOK_URL` | Solo Vercel (opcional) | Sincronización con Google Sheets |
| `TEAMS_SUPABASE_URL` / `ANON_KEY` | Solo Vercel (puente temporal) | `/api/notifications` mientras siga en este repo |
| `TEAMS_HUB_URL` / `RESEND_FROM` | Solo Vercel (puente temporal) | Link del Hub en los emails y remitente de Teams |
| `GEMINI_API_KEY` | Solo Vercel (legado) | Endpoint viejo de IA, pendiente de retiro |

**Nunca** commitees `.env.local`, la service role key ni la API key de Resend.
La `anon key` es pública por diseño, pero **no** debe ser la misma para el ecomm y para Teams:
cada proyecto Supabase tiene la suya.

El runbook completo para crear los dos proyectos, migrar datos y conectar los deploys está en
[`docs/SEPARACION.md`](./docs/SEPARACION.md).

---

## 🗄️ Modelo de datos (e-commerce)

El DER completo de 13 entidades está en [`docs/DER-quimica.csv`](./docs/DER-quimica.csv).
Las tablas que usa este repo son:

`productos`, `pedidos`, `verificaciones`, `stock`, `comprobantes` (Storage) y las RPC de stock.
Las tablas `team_*` **no** pertenecen a este proyecto Supabase: son del repo `quimicashop`.

---

## 🔄 Flujo de compra

```
1. Cliente arma el carrito.
2. POST /api/orders          → crea Pedido y reserva stock (RPC atómica).
3. Cliente sube el comprobante.
4. POST /api/verify-payment  → sube la imagen a Storage y deja el pedido pendiente.
5. Administrador entra a /admin, revisa la foto y el monto.
6. Aprueba o rechaza:
   - Aprobado  → pedido en preparación + remito por email.
   - Rechazado → se libera el stock reservado.
7. Cron de los viernes: reintegra el stock reservado no ejecutado.
```

> ⚠️ **Deuda técnica conocida:** `/api/verify-payment` todavía llama a Gemini (`src/lib/gemini.ts`) y el
> checkout muestra textos de "IA". El flujo oficial de cátedra es **validación manual**, así que ese código
> debe retirarse en el próximo sprint. Mientras exista, `GEMINI_API_KEY` sigue siendo necesaria en Vercel.

---

## 🧪 Verificación

```bash
npm run typecheck
npm run lint
npm run build
```

El CI de GitHub Actions corre `npm run build` en cada push a `main` y en cada PR.

---

## ☁️ Deploy

1. Crear el repo `esenciatecnica` en GitHub y pushear `main`.
2. Importarlo en Vercel como proyecto Next.js.
3. Cargar las variables de `.env.example` en **Project Settings → Environment Variables**.
4. Asignar el dominio (por ejemplo `esenciatecnica.vercel.app`). Si el dominio oficial
   `quimicashop.vercel.app` se mueve a este repo, actualizalo también en
   `quimicashop/config.js` (`notificationsApi`).

---

## 👥 Equipo

| Integrante | Rol |
|---|---|
| Juan Manuel Merodio | Frontend & JS Lead |
| Isabella Infante | Database & SQL Architecture |
| Celeste Cáceres | Diseño UX/UI & Testing QA |
| Enzo Queipo | Backend, Admin Panel & Relaciones |

**Cátedra:** Ariel Leibouski, Cecilia Maldonado, Alejandro Nieva.
