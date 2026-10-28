# memory.md · estado de build

> Hiper-corto. Leer al abrir sesión; reescribir al cerrar. **Última:** 2026-10-28 (tanda del 27-10
> **cerrada**: los dieciséis tickets #33–#48 en repo y `origin/main` al día; el único camino crítico que
> queda es el cierre beta).

## Ahora
- Objetivo: **beta presentable el viernes 30-10**. El front y el código del cierre beta están
  completos; **la base viva sigue a medio migrar** y es el único camino crítico.
- Hecho en repo: B3 (#17), B4 (#18), A1 (#19), B2 (#21) y B5 (#22). Falta **aplicar** `00`–`06` y el
  seed en `otjph` (B1/#16, Juanma con revisión de Isabella), cargar secretos (O1/#20, Enzo) y la
  verificación de punta a punta (B6/#23, Celeste).
- **Tanda del 28-10 cerrada:** los nueve specs del 27-10 se publicaron y sus dieciséis tajadas
  (#33–#48) se implementaron en repo, una por commit, en el orden de
  [`docs/estado/ORDEN_DE_EJECUCION.md`](docs/estado/ORDEN_DE_EJECUCION.md): #39 · CI, #33, #41, #42, #35,
  #34, #46, #36, #37, #38, #43, #44 · dinero, #40 · plantilla de spec, con su retrofit **#47**, #45 ·
  skills y **#48 · trazabilidad** (los nueve issues viejos `T0`–`T8` cerrados con su comentario de
  evidencia, y también F0 · #3).
- **`origin/main` al día.** El repositorio acumulaba **27 commits sin subir**: GitHub nunca vio los
  `closes #NN` de los mensajes y **CI (#39) no había corrido nunca**. Se empujó el 28-10; de ahí en
  adelante el cierre de un issue por mensaje de commit sólo vale si el commit se sube.
- Decisión vigente: **Juanma aplica las migraciones con revisión de Isabella**; el DDL sigue siendo de
  ella y el cierre se firma con `npm run bd:viva` verde.
- **Tablero de Teams** (leído con `npm run teams -- leer`, nunca cacheado acá): 44 tareas. La
  auditoría del 27-10 dejó 41 → 20 `done`, 7 `review`, 14 `backlog`; el 28-10 se movió **trazabilidad
  de issues a `done`** con su bitácora. Las de `review` son las que ya tienen código y test pero esperan
  la base viva o las claves. Siguen publicadas las dos notas de la bandeja de la auditoría: **AVANCE**
  (cierre beta) y **BLOQUEO** (los 26 desajustes de `otjph`).
  **Ojo:** el issue #48 suponía que su fila ya decía `done` y en realidad estaba en `backlog` — la
  premisa de un ticket sobre el tablero se verifica leyendo el tablero, no confiando en el texto.

## Semáforo
- Local: `typecheck` 0 errores · `lint` 0 errores y 0 warnings · **388 tests** en 29 archivos ·
  `docs:links` 0 links sin resolver · `npm run build` compila sin `RESEND_API_KEY` y ya incluye
  `/api/cron/vencidos`.
- **GitHub**: `origin/main` al día desde el 28-10, así que **CI corre de verdad** por primera vez; la
  puerta de §8 dejó de ser una promesa local. Los cierres por mensaje de commit (#45, #47) recién ahí
  se aplican.
- BD prod `otjph…`: **ROJA**, **26 desajustes** medidos con el `bd:viva` nuevo. Además de los 13
  originales, ahora ve:
  - lectura anónima abierta (`200 []`) en **las diez** tablas cerradas, incluidas `admin` y `roll`;
  - `stock.porcentaje` y la vista con forma vieja (`stock_actual`, `stock_warning`, `porcentaje`, `activo`);
  - `detalle_del_pedido.id_detalle` (tabla todavía abierta) y `detalle_carrito` siguen existiendo;
  - `crear_pedido` sigue sin la firma de dos argumentos;
  - **la anon key puede ejecutar** `aprobar_comprobante`, `rechazar_comprobante` y
    `cancelar_pedidos_vencidos` (hallazgo nuevo de B2);
  - no existen los buckets `comprobantes` ni `productos`.
- `respaldo_legacy` no existe todavía en `otjph`; la migración `00` **ya está corregida** (detecta
  legacy por `detalle_carrito`/`stock.porcentaje`, anota conteos y aborta si no coinciden). No correr
  `01` sin verificar `respaldo_legacy.conteos`.
- `.env.local`: sólo `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `VERCEL_OIDC_TOKEN`.
  Faltan `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
  `CRON_SECRET` y `NEXT_PUBLIC_TRANSFERENCIA_*`.

## Tickets del cierre beta
| Ticket | Qué | Estado |
|---|---|---|
| #16 · B1 | respaldo + `00`–`05` aplicadas en `otjph` | repo listo; **falta aplicar** (Juanma/Isabella) |
| #17 · B3 | `06`: `precio > 0`, `ET007`, mensajes del panel | ✅ código + tests; falta aplicar `06` |
| #18 · B4 | cron de vencidos los viernes | ✅ `cron-auth`, ruta, `vercel.json` |
| #19 · A1 | el panel avisa si el remito no salió | ✅ helper + panel + tests |
| #20 · O1 | secretos y entorno de producción | ⏳ Enzo |
| #21 · B2 | `bd:viva` cubre toda la superficie pública | ✅ reglas + script + tests |
| #22 · B5 | semilla de la beta | ✅ seed de tres productos; ⏳ fotos desde `/admin` |
| #23 · B6 | verificación punta a punta en navegador | ⏳ Celeste, bloqueada por B1/O1 |

## Hecho (2026-10-28, #48 · trazabilidad de issues)
| Cambio | Qué dejó |
|---|---|
| GitHub · #48 (spec `trazabilidad-issues`) | **Los nueve issues `T0`–`T8` (#2, #5, #6, #8, #9, #10, #12, #13, #14) cerrados** con el comentario uniforme de cinco bloques: qué se construyó, commits que lo contienen, tests que lo cubren, qué queda pendiente de verificación en vivo y el spec de la tajada linkeado. Se sumó **#3 (F0)** con el mismo formato. `gh issue list --state open` queda en el cierre beta (#15–#23), los paraguas (#24, #25, #28, #29) y las tajadas de la tanda. |
| Verificación de los cierres | No se cerró por confianza: los **22 commits** citados existen en `main` y los **17 archivos de test** también, con **sus conteos idénticos** a la corrida de la suite (388/29). #15–#23 sin tocar. |
| Tres correcciones de evidencia | **#14** tenía el comentario publicado a las 23:14:56Z y seguía **abierto** (la sesión anterior se cortó antes del `close`). Los comentarios de **#10** y **#13** mandaban al §8, que en `checkout` y `admin` es *Blockers declarados*: el estado vive en el §9, y se editaron los dos. **#3** estaba fuera de la lista de #48 aunque era la misma clase (código + test, sólo falta la pantalla). |
| `docs/specs/*/spec.md` | Los cinco specs que pedían «cerrar el ticket TN» pierden ese `### Pendiente` y quedan con la nota del cierre y el puntero a la verificación en vivo (**#23**). `front-mvp` §11 anota el cierre de los nueve. La spec de `trazabilidad-issues` pasa a *implementada* con su §8 de estado. |
| Push a `origin/main` | El repo venía **27 commits atrás**: se subió, que es lo que hace correr CI y lo que cierra **#45** y **#47** por mensaje de commit. |

## Hecho (2026-10-28, tanda del 27-10)
| Cambio | Qué dejó |
|---|---|
| `docs/estado/ORDEN_DE_EJECUCION.md` | Los dieciséis tickets de la tanda ordenados por cuatro criterios (dinero/seguridad, puerta automática, lo fundacional antes de quien lo usa, gobernanza al final), con las dependencias nativas de GitHub (#47 ← #40/#41/#42/#44; #46 ← #35; #48 ← los otros quince). |
| **#45 · Skills del proyecto** | Nace `.agents/skills/` con **`tablero-teams`** (leer/mover/crear/publicar con `npm run teams`, los cuatro estados, `--autor`, bitácora y auditoría) y **`bd-viva`** (correr `bd:viva`, el cache de PostgREST y la trampa del `200 []`, y por qué `npm test` no prueba la base viva). Cada `SKILL.md` en un solo nivel, con `name`/`description`/`whenToUse` y sin `model:` ni `tools:`; el runtime las descubrió. `AGENTS.md` §11 lista las dos reales y `tests/front/skills-del-proyecto.test.ts` (7 tests) fija la forma y que ninguna quede sin nombrar en §11. |
| **#47 · Retrofit de la plantilla** | Los siete specs de la tanda siguen `docs/specs/PLANTILLA.md`: secciones canónicas en orden, notas finales y 21 HU con `Como … quiero … para`. No cambió ninguna decisión de comportamiento; sí se corrigieron las referencias cruzadas a los números viejos (MODELO, ADR 0005, handoff, guías y specs vecinos). El test estructural deja de nombrar a los siete como pendientes; `bd-mvp`, `front-mvp` y `migracion-otjph` siguen fuera, con su motivo y nombrados en el test. Commit `1a66dc5`. |
| Nueve specs de `docs/specs/` | Publicados: busqueda-por-campos, detalle-404, deuda-codigo-25-10, formato-del-dinero, iconos-y-copy-del-dominio, integracion-continua, plantilla-de-spec, skills-del-proyecto y trazabilidad-issues. |
| `src/lib/format.ts` | `redondearACentavos` (aritmética) y `formatPrice` adaptativo: entero sin decimales (`$ 3.000`), con centavos con dos exactos (`$ 4,50`). Una sola regla de dinero para tienda, panel, remito y checkout. |
| `src/lib/carrito.ts` + `checkout.ts` + `Carrito.tsx` + `checkout/page.tsx` | `subtotalDeLinea` (precio × cantidad redondeado) y `totalDelPedido` como suma de subtotales redondeados; el checkout usa la misma función de redondeo y dejó la suya. |
| `tests/front/formato-dinero.test.ts` | Doce tests: formato con y sin centavos, redondeo sin error de punto flotante, total que suma subtotales redondeados, coherencia carrito→checkout, remito con el mismo total y una sola función de formato en carrito, checkout y panel. |
| `carrito/spec.md` y `checkout/spec.md` | La desviación de formato deja de estar abierta: los dos specs enuncian la regla y el ejemplo falso (`3001.65 → $ 3.002`) se retira. |

## Hecho (2026-10-27/28, cierre beta en repo)
| Cambio | Qué dejó |
|---|---|
| `00_respaldo_legacy.sql` | Marcador por `detalle_carrito`/`stock.porcentaje`; `respaldo_legacy.conteos`; aborta si origen y copia no coinciden. |
| `06_cierre_beta.sql` | `producto_precio_positivo` (`precio > 0`) y trigger `stock_valida_reserva` con `ET007`. |
| `admin.ts` + `admin-http.ts` | `ET007` → `stock-bajo-reserva` (campo `cantidad_actual`), `23505` → `nombre-duplicado` (campo `nombre`), `23514` como último recurso; HTTP 409. |
| `cron-auth.ts`, `cron.ts`, `cron-servidor.ts`, ruta y `vercel.json` | `503` sin `CRON_SECRET`, `401` con secreto incorrecto, `200 { cancelados }`; `59 2 * * 6`. |
| `comun.ts` + `PanelDePedidos.tsx` | El `aviso` de Resend no se descarta: `role="alert"`, reenvío disponible y sin éxito falso. |
| `scripts/bd-viva-reglas.mjs` + script | Diez tablas cerradas con `401/403`, columnas legacy, RPC existentes **y cerradas a anon**, buckets, `detalle_carrito`; exit code y resumen. |
| `supabase/seed.sql` | Tres productos idempotentes, stock no destructivo, uno bajo el umbral; sin rutas locales muertas. |
| Docs | Spec `bd-mvp` (runbook + fallback del cron + seams), `.env.example` con `CRON_SECRET`, `AGENTS.md` §8. |

## Hecho (2026-10-27, sesión de auditoría)
| Cambio | Qué dejó |
|---|---|
| Tablero de Teams (`team_tasks`) | 21 tareas auditadas con bitácora y log de auditoría: 8 pasaron a `done`, 5 a `review` y el resto quedó anotado como pendiente. 9 tareas nuevas. |
| Bandeja de Teams (`team_discussions`) | Nota de **AVANCE** del cierre beta y nota de **BLOQUEO** por los 26 desajustes de `otjph`. |
| `docs/specs/*/spec.md` | Los nueve specs por tajada y el paraguas `front-mvp` suman su sección **Estado de implementación (auditoría del 2026-10-27)**: criterio por criterio, con evidencia y `### Pendiente`. |
| `migracion-otjph/spec.md` | §7.4 con la medición del 27-10 (13 → 26 desajustes) y la tabla de las ocho piezas versionadas (`00`–`06` + seed). |
| `checkout/spec.md` | Se resolvió la contradicción HU-3 vs §4.3: **manda el código** (el monto se precarga, editable). |

## Hecho (2026-10-27, retro)
| Cambio | Qué dejó |
|---|---|
| `AGENTS.md` §1, §3, §10, §11, §12 | El tablero deja de estar prohibido y pasa a ser parte del contrato: se sincroniza al cerrar cada sesión, con `done` = código + test y `review` = hecho en repo sin verificar en vivo. Todo por puntero, sin cachear el contrato. |
| `docs/agentes/teams.md` | Referencia revelada: dónde vive el tablero, los cuatro `key` de autoría, el contrato de `team_tasks`, el ritual de cierre y los gotchas que ya costaron tiempo. |
| `scripts/teams-tablero.mjs` + `npm run teams` | Único camino de escritura al tablero (leer, estado, nueva, publicar): valida autor, estado y categoría, y siempre deja bitácora y log de auditoría. |
| `npm run docs:links` | El verificador de links de `docs/` deja de estar suelto: entra en `package.json` y en la definición de terminado de §8. |

## Hallazgos abiertos
> **Los hallazgos de código están cerrados.** Toda la deuda detectada por la auditoría del 27-10 y por la
> revisión del 25-10 tiene su tajada implementada, con test y con el issue cerrado: el redondeo del dinero
> (**#44**), la búsqueda del catálogo (**#41**), el 404 del detalle (**#42**), el ícono de laboratorio
> (**#43**), el hueco de la plantilla (**#40** y **#47**), las skills (**#45**) y la trazabilidad
> (**#48**). Las cuatro de la revisión del 25-10 también: `buscarCliente` con `ilike` (**#33**), el
> diagnóstico falso de `sinConfiguracion()` (**#34**), la duplicación del archivo subido (**#35**) y los
> casteos sin Zod del borde (**#46**). Y las tres de contrato: la alerta de stock (**#36**), los límites
> del checkout (**#37**) y el tiempo de producción en la card (**#38**), más el CI (**#39**).
>
> Lo que queda **no es código**: es la base viva, las claves y la verificación en el navegador.
1. 🔴 **Base viva a medio migrar:** **26 desajustes** en `otjph`. Es el camino crítico de la beta: aplicar
   `00`–`06` y el seed, con revisión de Isabella, y firmar con `npm run bd:viva` en verde (#15, #16/B1).
2. 🔴 **Seguridad:** la anon key ejecuta `aprobar_comprobante`, `rechazar_comprobante` y
   `cancelar_pedidos_vencidos`, y lee en `200 []` las diez tablas cerradas. Se cierra al aplicar `03`.
3. 🟡 **Secretos:** faltan `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `RESEND_API_KEY`,
   `RESEND_FROM_EMAIL`, `CRON_SECRET` y `NEXT_PUBLIC_TRANSFERENCIA_*` (#20, Enzo).
4. 🟡 **Revisión del 28-10 sobre las skills (#45):** ninguno toca comportamiento; se dejaron sin parchear
   por la regla de §6.5 (no parchear en la sesión de review). La skill de `bd-viva` no nombra
   `scripts/verificar-bd-viva.mjs` y `tablero-teams` copia el bloque de comandos de `teams.md` §5 en vez
   de apuntarlo; falta `PARÁMETROS DE ENTRADA` y el orden de `brain.md` §4.1, y §11 perdió el puntero
   «anatomía en `brain.md` §4.1»; el test fija exactamente dos skills (la spec §5 dice «al menos una») y
   sus guardias de `task_notes`/`§11` son más débiles que lo que §8 afirma. → tarea **`backlog`** del
   tablero *«Deuda de las skills del proyecto: revisión del 28-10»*; el issue #48 ya no es el destino.
5. 🟡 **Verificación en pantalla:** ninguna de las nueve tajadas del front se vio en un navegador con la
   base migrada. Vive en **#23** (B6, Celeste), bloqueada por #16 y #20.

## Reglas
- 1 ticket = 1 sesión = 1 commit. TDD. Español único. Sin IA. Sin envío.
- Dinero `NUMERIC(12,2)`; `precio > 0` y `monto > 0`; total derivado; un remito por comprobante; un
  comprobante pendiente por pedido.
- El total **se calcula**, se redondea y se **muestra** con la misma regla: `subtotalDeLinea` y
  `formatPrice` son las únicas funciones del dinero; si el carrito muestra un número distinto del que
  viaja al pedido, es un bug.
- El remito lo emite **la base**; el front lo compone y lo envía. El email es posterior y no bloqueante.
- `anon`: sólo `vista_catalogo`/`producto`/`stock`. Las RPC y el panel, sólo `service_role` + Basic Auth.
- **`npm test` no prueba la base viva**: para eso está `npm run bd:viva`. Falla si una tabla cerrada
  responde `200` (aunque venga vacía) o si anon puede ejecutar una RPC.
- **Rechazo terminal:** no se reabre un pedido; el Cliente vuelve a comprar.
- **Cron:** viernes 23:59 ART = `59 2 * * 6` UTC en `vercel.json`, con `CRON_SECRET`. Fallback manual:
  `select cancelar_pedidos_vencidos();` en el SQL Editor.
- **El tablero de Teams se sincroniza con `npm run teams`** (puente temporal por PostgREST con la anon key
  pública de `quimicashop/config.js`). Contrato, estados y ritual: [`docs/agentes/teams.md`](docs/agentes/teams.md).
- **Un issue se cierra con evidencia, no por confianza**: el comentario de cinco bloques (qué se
  construyó, commits, tests, qué queda pendiente en vivo y el spec linkeado) y **commits y tests que
  existan de verdad**. El commit tiene que estar **subido**: uno local no cierra nada en GitHub y deja a
  CI sin correr. Un puntero a un archivo o a una sección se verifica antes de publicarlo.
- **La premisa de un ticket se verifica contra el artefacto**: #48 afirmaba que su fila del tablero ya
  decía `done` y estaba en `backlog`. Leer el tracker antes de creerle al texto.

## Decisiones que no hay que redescubrir
- **G2:** el detalle es **página propia** (`/producto/[id]`), no card ampliada.
- **G3:** la institucional se llama **“Sobre el proyecto”** y vive en `/about`.
- **G1:** la franja de valores vive **solo** en `/about`; la Home no la repite.
- **Basic Auth en `src/middleware.ts`** (no en la raíz: con `src/app` Next sólo compila ahí) y **solo**
  para `/admin` y `/api/admin`. El test de T0 verifica que el middleware **no** negocia idioma (ADR 0005).
- **`foto_url` = clave del objeto** (bucket privado, signed URL al leer); **`imagen_url` = URL pública**
  (bucket público `productos`). El seed no inventa fotos: se suben desde `/admin`.
- **Vitest resuelve `@/`** con un alias en `vitest.config.ts`, porque `admin.ts` importa las listas
  canónicas de estados como valores.
- El panel **no** expone la clave del bucket: el modelo de lectura entrega sólo la signed URL.
- **Las variables de `next/font` van en `<html>`, no en `<body>`.** Lo cubre
  `tests/front/identidad-shell.test.ts` (§F0 · tipografía).
- **`bd:viva` no ejecuta RPC destructivas:** `cancelar_pedidos_vencidos()` se consulta con `GET`
  (read-only) y las demás con argumentos imposibles; una respuesta que no sea `401/403` delata que anon
  puede ejecutarlas.
- **`npm test` pasa en verde con la base rota** porque aplica las migraciones del repo en PGlite. No es
  evidencia de que `otjph` esté bien.
- **Dinero:** el formato es **adaptativo** (entero sin decimales, con centavos dos decimales exactos); el
  redondeo vive en la aritmética (`redondearACentavos`, `subtotalDeLinea`) y la vista sólo muestra
  (`formatPrice`). La decisión está escrita en [`formato-del-dinero`](docs/specs/formato-del-dinero/spec.md)
  §4 y no se rediscute.
- Un spec **no se reescribe para tapar una desviación**: se marca la fila como `desviación` con
  `archivo:línea` y se abre la tarea. El código y la base mandan sobre el texto.
