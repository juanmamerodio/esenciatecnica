# memory.md · estado de build

> Hiper-corto. Leer al abrir sesión; reescribir al cerrar. **Última:** 2026-10-29 (auditoría de build,
> retiro de `ignoreBuildErrors: true`, limpieza de 9 specs quemadas y scripts viejos, `/retro` sobre
> skills y `docs:links`, comando `npm run teams -- papelera` con 27 tareas `done` > 24 h archivadas,
> cierre de #17, #19 y #25 en GitHub, y avisos `AVANCE` + `BLOQUEO` publicados en Teams con la compra
> urgente del dominio para Resend).

## Ahora
- **Bloqueo crítico urgente: compra del dominio para conectar Resend (#20, Enzo).** Sin dominio propio
  verificado en Resend (SPF/DKIM) y sin cargar `RESEND_API_KEY` + `RESEND_FROM_EMAIL` en Vercel, Resend
  en modo sandbox sólo permite enviar al correo del titular de la cuenta: **no se puede testear el envío
  real del Remito de venta al Cliente** ni el puente `/api/notifications`.
- **Producción (`esenciatecnica.vercel.app`) y base viva (`otjph…`) funcionando con la demo sembrada (#22):**
  nueve productos con foto real en el bucket público `productos`, seis Pedidos en los cuatro estados
  canónicos (`Pendiente de Pago` ×2, `Pago Validado` ×2 con remitos `R-2026-0000{01,02}`, `Rechazado` y
  `Cancelado`), alertas de stock y hero propio (`public/hero/portada.jpg`). `/admin` responde `401` sin
  credenciales y `200` con la clave, sin pedir credenciales al navegar la tienda (#52).
- **Trabas humanas restantes para el cierre beta:**
  1. **Enzo (#20 / #18):** comprar el dominio y verificarlo en Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`), cargar los datos bancarios de la Cooperadora (`NEXT_PUBLIC_TRANSFERENCIA_*`) y cargar `CRON_SECRET` en Vercel.
  2. **Celeste (#23 / #22):** verificación punta a punta en navegador (desktop/mobile, consola, popup de alertas, vista imprimible del remito) y reemplazo de las fotos de demostración por las fotos reales del taller desde `/admin`.
  3. **Isabella / Juanma (#16 / #15):** correr el bloque de conteos de `respaldo_legacy` en el SQL Editor y pegarlo en #16.

## Semáforo
- Local: `typecheck` 0 errores · `lint` 0 errores y 0 warnings · **441 tests** en 34 archivos ·
  `docs:links` 0 links sin resolver sobre 43 archivos `.md` (con salida `!= 0` ante enlaces rotos) ·
  `npm run build` compila las 16 rutas + `src/middleware.ts` **validando tipos en el build**
  (`ignoreBuildErrors: true` retirado de `next.config.ts`) y sin requerir secretos en el entorno.
- **GitHub**: `main` en verde. Cerrados #17, #19 y #25 con evidencia; quedan abiertos sólo el paraguas #1
  y los tickets que esperan acciones humanas o entorno vivo (#15, #16, #18, #20, #22, #23).
- BD prod `otjph…`: **VERDE** con `npm run bd:viva` (`01`–`06` aplicadas y medidas en las 7 secciones).
  Fuera del alcance de la anon key: `respaldo_legacy`, el tope de 5 MB y los MIME de cada bucket.
- **Tablero**: auditado, sincronizado y depurado con `npm run teams` (27 tareas `done` > 24 h movidas a la
  papelera; 6 tareas pasadas a `done`; 4 tareas operativas nuevas; avisos `BLOQUEO` y `AVANCE` en la
  bandeja). Se lee en vivo con `npm run teams -- leer` ([`teams.md`](docs/agentes/teams.md) §7).

## Tickets del cierre beta
| Ticket | Qué | Estado |
|---|---|---|
| #15 · D1 | cerrar la migración del MVP | ✅ en todo lo que mide `bd:viva`; abierto sólo por la firma de `respaldo_legacy` |
| #16 · B1 | respaldo + `00`–`06` aplicadas en `otjph` | ✅ `01`–`06` aplicadas y medidas; falta firmar `respaldo_legacy` en el SQL Editor |
| #17 · B3 | `06`: `precio > 0`, `ET007`, mensajes del panel | ✅ cerrado |
| #18 · B4 | cron de vencidos los viernes | ⏳ código y test en `main`; falta `CRON_SECRET` en Vercel para probarlo en vivo |
| #19 · A1 | el panel avisa si el remito no salió | ✅ cerrado |
| #20 · O1 | secretos y entorno de producción | ⏳ `ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY` y `URL`/`ANON_KEY` de `otjph` ya están en Vercel; **urgente**: dominio + Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`), datos de la Cooperadora (`NEXT_PUBLIC_TRANSFERENCIA_*`) y `CRON_SECRET` |
| #21 · B2 | `bd:viva` prueba toda la superficie pública | ✅ cerrado (`65657d5`) |
| #22 · B5 | semilla y fotos de la beta | ⏳ sembrada en `otjph` (`20b50d9`); pendiente reemplazar las fotos de demo por las del taller |
| #23 · B6 | verificación punta a punta en navegador | ⏳ Celeste; desbloqueada en producción (salvo el envío real de email que requiere el dominio en Resend) |

## Hecho (2026-10-29 · auditoría de build, limpieza del repo, `/retro` y papelera de Teams)
| Cambio | Qué dejó |
|---|---|
| `scripts/teams-tablero.mjs` + `scripts/teams-papelera-reglas.mjs` + `tests/front/teams-papelera.test.ts` | Subcomando `npm run teams -- papelera [--horas 24] --autor <key> [--confirmar]`: selecciona tareas `done` con más de 24 h, guarda respaldo local en `docs/agentes/papelera/` (ignorado en Git por `AGENTS.md` §3), las borra de `team_tasks` y registra `DELETE` en `task_audit_logs`. 6 tests puros en verde; 27 tareas archivadas. |
| `next.config.ts` + `AGENTS.md` §8 + `docs/estado/DEUDA_TECNICA.md` §4 | Se retiró `typescript.ignoreBuildErrors: true`. `npm run build` ahora valida tipos durante la compilación además de CI. Cierra el punto 4 de `DEUDA_TECNICA.md`. |
| `scripts/verificar-links-docs.mjs` | Filtra archivos borrados en el árbol de trabajo antes de abrirlos (evita `ENOENT`) y sale con `process.exitCode = 1` cuando hay links rotos o sin migrar, haciendo efectiva la puerta `docs:links` en CI. |
| Limpieza de `docs/specs/`, `docs/estado/` y `scripts/` | Eliminados los 9 specs de tickets puntuales ya quemados (`busqueda-por-campos`, `detalle-404`, `deuda-codigo-25-10`, `formato-del-dinero`, `iconos-y-copy-del-dominio`, `integracion-continua`, `plantilla-de-spec`, `skills-del-proyecto`, `trazabilidad-issues`), `docs/estado/ORDEN_DE_EJECUCION.md`, `scripts/reorganizar-docs.mjs` y el directorio vacío `docs/agents/`. En `docs/specs/` quedan los 10 specs de features + `PLANTILLA.md`. |
| `.agents/skills/*` + `docs/agentes/teams.md` + `tests/front/skills-del-proyecto.test.ts` | Cierra la deuda de skills del 28-10: anatomía de `brain.md` §4.1 en orden (`PROPÓSITO` → `PARÁMETROS DE ENTRADA` → `GUARDRAILS` → `PASOS DE EJECUCIÓN`), link a `scripts/verificar-bd-viva.mjs`, retiro de término legacy en `teams.md` y limpieza de conteos congelados en los specs. |
| GitHub y Teams | Cerrados #17, #19 y #25 con evidencia; 6 tareas pasadas a `done`, 4 tareas nuevas creadas y 2 avisos (`BLOQUEO` urgente por dominio/Resend y `AVANCE` con auditoría de build) publicados en la bandeja. |

## Hallazgos abiertos
1. 🔴 **URGENTE — Dominio y Resend (#20, Enzo):** comprar el dominio, verificar SPF/DKIM en Resend y cargar `RESEND_API_KEY` y `RESEND_FROM_EMAIL` en Vercel. Bloquea testear el envío real del Remito de venta al Cliente y `/api/notifications`.
2. 🟡 **Datos de la Cooperadora y `CRON_SECRET` (#20 / #18, Enzo):** cargar `NEXT_PUBLIC_TRANSFERENCIA_*` y `CRON_SECRET` en Vercel.
3. 🟡 **Fotos definitivas del taller (#22, Celeste):** reemplazar desde `/admin` las fotos de demostración y pisar `public/hero/portada.jpg`.
4. 🟡 **Verificación en pantalla (#23, Celeste):** recorrer la tienda y `/admin` en navegador (desktop y mobile) y dejar el resultado en la tarea `B6`.
5. 🟡 **`respaldo_legacy` sin firmar (#16, Isabella / Juanma):** correr el bloque de conteos en el SQL Editor de `otjph` y pegarlo en #16.
6. 🟡 **Deuda del review del 28-10 (con tarea en el tablero):** `FaltaConfiguracion` en `src/lib/cron-servidor.ts`, recalcular `totalAVisualizar` si cambia el carrito tras un error en `checkout/page.tsx`, exigir `401/403` en `admin`/`roll` en `bd:viva`, y la tarea de juicio «Deuda de estándares del cierre beta».

## Reglas y decisiones que no hay que redescubrir
- **1 ticket = 1 sesión = 1 commit quirúrgico.** TDD. Español único. Sin IA. Sin envío.
- **Sin clientes al importar** (AGENTS §7.13): Supabase y Resend se instancian dentro de la función que los usa para que `npm run build` compile con el entorno vacío en CI.
- **El contrato no guarda estado** (AGENTS §8): los conteos, las fechas y el semáforo viven **acá**; ningún spec ni guía congela el número de tests.
- **Dinero:** `NUMERIC(12,2)`, `precio > 0` y `monto > 0`; redondeo en la aritmética (`redondearACentavos`, `subtotalDeLinea`, `totalDelPedido`) y formato adaptativo en la vista (`formatPrice`: entero sin decimales, con centavos dos decimales exactos; [`carrito/spec.md`](docs/specs/carrito/spec.md) §2, [#44](https://github.com/juanmamerodio/esenciatecnica/issues/44)).
- **El remito lo emite la base** en la transacción de aprobación; el front lo compone y lo envía por Resend (posterior y no bloqueante).
- **Storage y claves:** `comprobantes` privado (`foto_url` = clave, signed URL al leer) y `productos` público (`imagen_url` = URL pública). `claveDelArchivo` incluye el bucket (`productos/<id>/…`), así que la URL pública repite `…/object/public/productos/productos/<id>/…`.
- **Hero con foto propia** (`public/hero/portada.jpg`, `FOTO_DEL_HERO`) pasando por `ImagenProducto` (#49).
- **Basic Auth en `src/middleware.ts`** sólo para `/admin` y `/api/admin` (ADR 0005); la tienda entra a `/admin` con navegación de documento (`<a>`) para que Next no prefetchee el `401` (#52).
- **`npm test` corre contra PGlite; `npm run bd:viva` mide la base viva** sin ejecutar RPC destructivas (`GET` en `cancelar_pedidos_vencidos` y argumentos imposibles en las demás).
- **El tablero de Teams se sincroniza con `npm run teams`** y las tareas `done` de más de 24 h se archivan con `npm run teams -- papelera` ([`teams.md`](docs/agentes/teams.md)).
