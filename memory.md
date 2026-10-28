# memory.md · estado de build

> Hiper-corto. Leer al abrir sesión; reescribir al cerrar. **Última:** 2026-10-27 (auditoría de
> `bd-mvp` + `admin`, specs de cierre beta y tickets #16–#23).

## Ahora
- Objetivo: **beta presentable el viernes 30-10**. El front está completo; la base viva sigue a medio
  migrar y es el único camino crítico.
- Specs de esta sesión: `docs/specs/bd-mvp/spec.md` (reescrita como cierre beta) y
  `docs/specs/admin/spec.md` (HU-12 y HU-13). Issue padre **#15**; tickets **#16–#23**.
- Decisión: **Juanma aplica las migraciones en `otjph` con revisión de Isabella**. El DDL sigue siendo
  de ella; el cierre se firma con `npm run bd:viva` verde.

## Semáforo
- Local: `typecheck` 0 errores · `lint` 0 errores y 0 warnings · **230 tests** en 19 archivos ·
  `npm run build` compila sin `RESEND_API_KEY`.
- BD prod `otjph…`: **ROJA**, **13 desajustes** medidos el 27-10 (tabla en `bd-mvp` §9.1). Faltan
  columnas de tiempo en `cliente`/`producto`/`pedido`/`stock`/`comprobante`, `alerta_de_estado.mensaje`/
  `atendida`, `estados_comprobante.id_comprobante`, `detalle_del_pedido.id_detalle_pedido`, las cuatro
  columnas de `vista_catalogo`, la RPC `crear_pedido` y los dos buckets. `detalle_carrito` sigue
  existiendo.
- **Hallazgo nuevo:** `admin`, `roll`, `estados_pedidos` y `estados_comprobante` responden `200` a la
  anon key (lectura abierta; escritura denegada). Hoy vacías, pero `bd:viva` no las miraba. `stock`
  conserva `porcentaje` y `vista_catalogo` la forma vieja (`stock_actual`, `porcentaje`, `activo`).
- `respaldo_legacy` **no existe**: la migración `00` se saltea porque su marcador (`producto.id_stock`)
  ya no está. No correr `01` sin respaldar a mano.
- `.env.local`: sólo `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `VERCEL_OIDC_TOKEN`
  (con comillas). Faltan `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL`, `CRON_SECRET` y `NEXT_PUBLIC_TRANSFERENCIA_*`.

## Tickets del cierre beta
| Ticket | Qué | Bloqueado por | Dueño |
|---|---|---|---|
| #16 · B1 | respaldo + `00`–`05` aplicadas en `otjph` | — | Juanma/Isabella |
| #17 · B3 | migración `06`: `precio > 0`, `ET007`, mensajes del panel | — | agente |
| #18 · B4 | cron de vencidos los viernes | — | agente |
| #19 · A1 | el panel avisa si el remito no salió | — | agente |
| #20 · O1 | secretos y entorno de producción | — | Enzo |
| #21 · B2 | `bd:viva` cubre toda la superficie pública | #16, #17 | agente |
| #22 · B5 | semilla y fotos de la beta | #16, #17 | agente/Celeste |
| #23 · B6 | verificación punta a punta en navegador | #16–#22 | Celeste |

## Hecho (2026-10-27)
| Cambio | Qué dejó |
|---|---|
| Auditoría de `bd-mvp` y `admin` contra migraciones y base viva | 13 desajustes + 4 tablas con lectura anónima + vista/stock con columnas legacy + respaldo inexistente + cron sin job. |
| `docs/specs/bd-mvp/spec.md` reescrita | Contrato de tablas, vista, buckets, RPC `integer`, códigos `ET001`–`ET007`, matriz RLS de diez tablas, runbook de aplicación y tickets. |
| `docs/specs/admin/spec.md` | HU-12 (errores de base traducidos) y HU-13 (remito sin email visible); blockers `05` y `06`. |
| `GLOSSARY.md` + `docs/MODELO.md` | Excepción del bucket `productos`, vencimiento viernes 23:59 ART, `precio > 0`, `ET007`, filas de cron y errores. |
| Issues #16–#23 | Sub-issues de #15 (salvo A1 → #13) con dependencias nativas. |

## Hallazgos abiertos
1. 🔴 `.agents/skills/` **no existe**, y `AGENTS.md` §11 y `front-mvp` §3.4 lo declaran como fundación.
2. 🟠 `checkout/spec.md` se contradice: HU-3 (`:87`) dice que el monto viene precargado; §6.3 (`:166`)
   dice que no se auto-completa. El código sigue HU-3.
3. 🟠 `remito/spec.md` HU-4: el `aviso` de fallo de correo se descarta en `comun.ts` → **A1 (#19)**.
4. ✅ `admin/spec.md` y migración `05`: el bucket `productos` queda como excepción explícita en
   `GLOSSARY.md` y `MODELO.md` §9.
5. 🟡 `sobre-el-proyecto/spec.md` §1: `/about` y el footer siguen usando `FlaskConical`.
6. ✅ `bd-mvp/spec.md`: linkeada a #15 y #16–#23; RPC corregidas a `integer`; `estados_comprobante`
   incluida; `roll` → `Rol` (el nombre físico de la tabla sigue `roll`, fase 2).
7. 🟡 Hueco de plantilla transversal: ningún spec tiene sección de notas finales ni lista numerada de
   historias; 25 HU no enuncian actor ni beneficio.
8. 🟡 Trazabilidad: #2, #5, #6, #8, #9, #10, #12, #13, #14 siguen **OPEN** aunque `AGENTS.md` §9 las da
   por hechas.

Siguen abiertos los hallazgos de la revisión de código del 25-10 (`buscarCliente` con `ilike`,
duplicación de "archivo subido", `sinConfiguracion()` con diagnóstico falso, casteos sin Zod).

## Reglas
- 1 ticket = 1 sesión = 1 commit. TDD. Español único. Sin IA. Sin envío.
- Dinero `NUMERIC(12,2)`; `precio > 0` y `monto > 0`; total derivado; un remito por comprobante; un
  comprobante pendiente por pedido.
- El remito lo emite **la base**; el front lo compone y lo envía. El email es posterior y no bloqueante.
- `anon`: sólo `vista_catalogo`/`producto`/`stock`. Las RPC y el panel, sólo `service_role` + Basic Auth.
- **`npm test` no prueba la base viva**: para eso está `npm run bd:viva`. `bd:viva` debe fallar si una
  tabla cerrada responde `200`, aunque venga vacía (B2).
- **Rechazo terminal:** no se reabre un pedido; el Cliente vuelve a comprar.
- **Cron:** viernes 23:59 ART = `59 2 * * 6` UTC en `vercel.json`, con `CRON_SECRET`.

## Decisiones que no hay que redescubrir
- **G2:** el detalle es **página propia** (`/producto/[id]`), no card ampliada.
- **G3:** la institucional se llama **“Sobre el proyecto”** y vive en `/about`.
- **G1:** la franja de valores vive **solo** en `/about`; la Home no la repite.
- **Basic Auth en `src/middleware.ts`** (no en la raíz: con `src/app` Next sólo compila ahí) y **solo**
  para `/admin` y `/api/admin`. El test de T0 verifica que el middleware **no** negocia idioma (ADR 0005).
- **`foto_url` = clave del objeto** (bucket privado, signed URL al leer); **`imagen_url` = URL pública**
  (bucket público `productos`).
- **Vitest resuelve `@/`** con un alias en `vitest.config.ts`, porque `admin.ts` importa las listas
  canónicas de estados como valores.
- El panel **no** expone la clave del bucket: el modelo de lectura entrega sólo la signed URL.
- **Las variables de `next/font` van en `<html>`, no en `<body>`.** `globals.css` declara en `:root`
  `--font-sans: var(--font-dm-sans), …`, y una custom property se sustituye en el elemento **donde se
  declara** (el `<html>`), no donde se usa. Con la clase de `next/font` en el `<body>`, `--font-sans`
  queda inválido y el navegador cae a su fuente por defecto — medido en Chrome: `"Times New Roman"`,
  con los `.woff2` ya descargados y servidos. Lo cubre `tests/front/identidad-shell.test.ts`
  (§F0 · tipografía), y `font-mono` cae por el mismo motivo.
- **El `PGRST202` de una RPC no siempre significa que falte.** PostgREST lo devuelve también cuando el
  cuerpo no matchea la firma. Hay que mandar los parámetros con su nombre real: un nombre inexistente da
  `PGRST202`, un tipo inválido da `22P02` y la llamada correcta da `204`. Así se supo que de las cuatro
  RPC de `02` **sólo falta `crear_pedido`**.
- **La migración `00` no respalda en `otjph`:** su marcador es `producto.id_stock`, que ya no existe, así
  que se saltea en silencio. Antes de correr `01` hay que respaldar a mano (B1).
- **`npm test` pasa en verde con la base rota** porque aplica las migraciones del repo en PGlite. No es
  evidencia de que `otjph` esté bien.
