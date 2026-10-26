# Esencia Técnica · E-Commerce

> Tienda online, checkout con comprobante, panel `/admin` y APIs del proyecto **Esencia Técnica**.
> **E.E.S.T N°1 Luciano Reyes** · Campana, Buenos Aires · 7mo Año Programación 2026.

> [!IMPORTANT]
> **Estado: el front del MVP está completo; la base viva no.** El código ya está sobre el esquema
> normalizado (los nombres legacy `productos`, `pedidos` y `verificaciones` no quedan en el repo), pero
> el proyecto Supabase `otjph…` sigue a medio migrar: `npm run bd:viva` mide **13 desajustes** al
> 2026-10-26. Criterio de cierre: [`docs/specs/migracion-otjph/spec.md`](docs/specs/migracion-otjph/spec.md)
> e [issue #15](https://github.com/juanmamerodio/esenciatecnica/issues/15). El estado al día está en
> [`memory.md`](memory.md).

---

## 🧭 Alcance de este repositorio

Este repo contiene **solamente el e-commerce**:

- Catálogo, carrito y checkout en español.
- Carga del comprobante y reserva de stock.
- Panel del Administrador en `/admin` (validación manual y remito).
- APIs, servicios, tests y migraciones del e-commerce.

El **Hub de documentación** y el **entorno Teams** (Kanban, reuniones, minutas, bandeja) viven en el repo
[`quimicashop`](https://github.com/juanmamerodio/quimicashop). No agregues acá HTML del Hub, `tasks.js`,
`style.css`, minutas ni tablas `team_*`.

---

## 📚 Documentación

| Documento | Para qué |
|---|---|
| [`GLOSSARY.md`](GLOSSARY.md) | Vocabulario canónico del dominio. |
| [`docs/MODELO.md`](docs/MODELO.md) | ERD Mermaid del MVP, estados y reglas de integridad. |
| [`docs/AUDITORIA.md`](docs/AUDITORIA.md) | Inventario, duplicados y contradicciones entre docs, código y bases. |
| [`docs/GUIA-ISABELLA.md`](docs/GUIA-ISABELLA.md) | **Paso a paso** para Isabella: respaldar `otjph`, aplicar `00 → 05`, cerrar con `bd:viva` verde. Incluye cómo usar Claude Code y las skills. |
| [`docs/GUIA-QUEIPO.md`](docs/GUIA-QUEIPO.md) | **Paso a paso** para Enzo: claves y entorno, verificación de punta a punta, cron de los viernes y el aviso de correo. Incluye cómo usar Claude Code y las skills. |
| [`docs/HANDOFF-ISABELLA.md`](docs/HANDOFF-ISABELLA.md) | Brief de DDL, constraints, RLS y limpieza para Isabella. |
| [`docs/TESTING.md`](docs/TESTING.md) | Guía corta de Vitest y TDD. |
| [`docs/brain.md`](docs/brain.md) | Filosofía de trabajo (SDD, TDD, módulos profundos, contexto). |
| [`docs/DER-quimica.csv`](docs/DER-quimica.csv) | DER académico de 13 entidades. |
| [`docs/DCU-Quimica.csv`](docs/DCU-Quimica.csv) | Diagrama de casos de uso. |
| `docs/DFD1-Quimica.csv`, `DFD2`, `DFD3` | DFD niveles 1–3. |
| [`docs/informe_Escencia_Tecnica.md`](docs/informe_Escencia_Tecnica.md) | Informe de cátedra. |
| [`docs/prototype1.html`](docs/prototype1.html) | Prototipo visual; referencia de diseño, no catálogo. |
| [`docs/DEUDA_TECNICA.md`](docs/DEUDA_TECNICA.md) | Deuda conocida (escrita contra el esquema legacy). |
| [`docs/SEPARACION.md`](docs/SEPARACION.md) | Separación real entre e-commerce y Teams. |
| [`docs/agents/`](docs/agents/domain.md) | Configuración de skills: issue tracker, triage y docs de dominio. |

---

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript estricto |
| Estilos | Tailwind CSS 3 + CSS |
| Datos | Supabase (PostgreSQL + Storage) |
| Emails | Resend |
| Validación de pago | **Manual, por los Administradores de Química** (flujo oficial) |
| Carrito | Cliente (cookie/localStorage); sin persistencia en Supabase en el MVP |
| Admin | **Basic Auth con `ADMIN_PASSWORD`** en `src/middleware.ts` (ADR 0005); `ADMIN`/`ROL` en base quedan para fase 2 |
| Idioma | **Español único**: rutas en la raíz, textos en el código, sin diccionarios ni selector `es/en` |
| Tests | Vitest + PGlite: `tests/db/` y `tests/front/` (`npm test`) |
| Deploy | Vercel |

---

## 🗄️ Los dos proyectos Supabase

| Proyecto | Ref | Contenido | Uso |
|---|---|---|---|
| E-commerce | `otjphjnrwihqzzhbfnmh` | 13 tablas normalizadas: `producto`, `pedido`, `detalle_del_pedido`, `stock`, `comprobante`, `cliente`, `admin`, `roll`, `alerta_de_estado`, `remitos_de_venta`, `detalle_carrito`, `estados_pedidos`, `estados_comprobante` | Tienda, checkout, `/admin` |
| Teams | `uchyattzuhaltsaxazce` | `team_*` + catálogo legacy `productos` / `pedidos` / `verificaciones` | Hub/Teams y datos históricos |

- `.env.local` apunta al proyecto **e-commerce**.
- `quimicashop/config.js` apunta al proyecto **Teams**.
- La base vieja **no** se usa para el e-commerce nuevo.
- El DER académico se adapta al modelo operativo, no al revés.
- El MVP usa 10 tablas; `admin`, `roll` y `detalle_carrito` quedan para fase 2.

---

## 🔄 Flujo objetivo

```
1. El Cliente arma el carrito (sin reservar stock).
2. Confirma el Pedido: se reserva stock (cantidad_reservada).
3. Sube el Comprobante (imagen + monto).
4. Los Administradores de Química lo revisan a mano y aprueban o rechazan.
5. Aprobado: descuenta stock, genera el Remito de venta y lo envía por email.
6. Rechazado o vencido (viernes): libera la reserva.
7. Alerta de stock: popup en /admin; sin email al Administrador.
```

El MVP termina en `Pago Validado` + remito: **no hay envío ni seguimiento**. El código legacy todavía
conserva Gemini y el esquema viejo; en el sistema final la IA no existe. La migración está en
[`docs/MODELO.md`](docs/MODELO.md) y [`docs/AUDITORIA.md`](docs/AUDITORIA.md).

---

## 🚀 Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar con las claves del proyecto ECOMM
npm run dev
```

- Tienda: `http://localhost:3000/` (sin prefijo de idioma; `/es` y `/en` ya no existen).
- Admin: `http://localhost:3000/admin` (Basic Auth; el usuario se ignora y la contraseña es `ADMIN_PASSWORD`).
- Typecheck: `npm run typecheck`.
- Build: `npm run build`.

---

## 🔑 Variables de entorno

| Variable | Dónde vive | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Vercel + `.env.local` | Proyecto Supabase del e-commerce |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor / Vercel | RPC de stock, Storage, panel admin |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Solo servidor / Vercel | Remito y confirmaciones |
| `ADMIN_PASSWORD` | Solo servidor / Vercel | Login de `/admin` (lo implementa `T7`) |
| `SHEETS_WEBHOOK_URL` | Solo servidor (opcional) | Sincronización con Google Sheets |
| `TEAMS_SUPABASE_URL` / `ANON_KEY` | Solo servidor (puente temporal) | `/api/notifications` |
| `TEAMS_HUB_URL` / `RESEND_FROM` | Solo servidor (puente temporal) | Links y remitente de Teams |
| `GEMINI_API_KEY` | Solo servidor (legacy) | Ya no se usa en el sistema final; se retira con `src/lib/gemini.ts` |

**Nunca** commitees `.env.local`, la service role key ni la API key de Resend.
La `anon key` es pública por diseño, pero **no** debe ser la misma para el e-commerce y para Teams.

---

## 🧪 Verificación

```bash
npm run typecheck   # 0 errores
npm run lint        # 0 errores, 0 warnings
npm test            # 230 tests: tests/db (PGlite) y tests/front, sin red
npm run build       # compila sin RESEND_API_KEY; no valida tipos (ignoreBuildErrors: true)
npm run bd:viva     # compara el repo contra el proyecto Supabase vivo (en red)
```

> `npm test` corre contra **PGlite** con las migraciones del repo, así que un proyecto Supabase a medio
> migrar deja la suite en verde. El control de la base real es `npm run bd:viva`, y es el criterio de
> cierre del [issue #15](https://github.com/juanmamerodio/esenciatecnica/issues/15).

El CI de GitHub Actions corre `npm run build` en cada push a `main` y en cada PR.
El estado real de la deuda está en [`docs/DEUDA_TECNICA.md`](docs/DEUDA_TECNICA.md) y en
[`docs/AUDITORIA.md`](docs/AUDITORIA.md).

---

## ☁️ Deploy

1. Push a `main` del repo `esenciatecnica`.
2. El proyecto de Vercel conectado a este repo sirve la tienda en
   `esenciatecnica.vercel.app`. El dominio heredado `quimicashop.vercel.app` sigue resolviendo por
   compatibilidad con el Hub; se retira cuando su `config.js` apunte al dominio nuevo.
3. Cargar las variables de `.env.example` en **Project Settings → Environment Variables**.
4. Redeploy. El Hub/Teams queda en GitHub Pages
   (`https://juanmamerodio.github.io/quimicashop/`).

---

## 👥 Equipo

| Integrante | Rol | Responsabilidad MVP |
|---|---|---|
| Juan Manuel Merodio | Full-Stack & Arquitectura | Frontend, integración y arquitectura |
| Isabella Infante | Database & SQL Architecture | SQL, DDL, migraciones y RLS |
| Celeste Cáceres | Diseño UX/UI & Testing QA | Testing, QA y Vitest |
| Enzo Queipo | Backend, Admin Panel & Relaciones | Remito, `/admin`, Resend y Basic Auth |

**Cátedra:** Ariel Leibouski, Cecilia Maldonado, Alejandro Nieva.
