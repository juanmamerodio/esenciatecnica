# memory.md · estado de build

> Hiper-corto. Leer al abrir sesión; reescribir al cerrar. **Última:** 2026-10-28 (tanda del 27-10 casi
> cerrada: #33–#44 y #46 en repo, y el retrofit de la plantilla, #47).

## Ahora
- Objetivo: **beta presentable el viernes 30-10**. El front y el código del cierre beta están
  completos; **la base viva sigue a medio migrar** y es el único camino crítico.
- Hecho en repo: B3 (#17), B4 (#18), A1 (#19), B2 (#21) y B5 (#22). Falta **aplicar** `00`–`06` y el
  seed en `otjph` (B1/#16, Juanma con revisión de Isabella), cargar secretos (O1/#20, Enzo) y la
  verificación de punta a punta (B6/#23, Celeste).
- **Tanda nueva ordenada el 28-10:** los nueve specs del 27-10 se publican y sus dieciséis tajadas
  (#33–#48) tienen un orden de ejecución en [`docs/estado/ORDEN_DE_EJECUCION.md`](docs/estado/ORDEN_DE_EJECUCION.md).
  **Implementadas en repo, una por commit:** #39 · CI, #33, #41, #42, #35, #34, #46, #36, #37, #38, #43,
  #44 · dinero y #40 · plantilla de spec, con su retrofit **#47**. Quedan **#45 · skills del proyecto** y
  **#48 · trazabilidad de issues**, los dos últimos del orden.
- Decisión vigente: **Juanma aplica las migraciones con revisión de Isabella**; el DDL sigue siendo de
  ella y el cierre se firma con `npm run bd:viva` verde.
- **Tablero de Teams auditado el 27-10** contra el repo: 41 tareas → 20 `done`, 7 `review`, 14 `backlog`.
  Las de `review` son las que ya tienen código y test pero esperan la base viva o las claves. Se
  publicaron dos notas en la bandeja: **AVANCE** (cierre beta) y **BLOQUEO** (los 26 desajustes de
  `otjph`). Tareas nuevas: B6, semilla y fotos, trazabilidad de issues, deuda de código, íconos de
  laboratorio, redondeo del dinero, `.agents/skills/` y plantilla de spec.

## Semáforo
- Local: `typecheck` 0 errores · `lint` 0 errores y 0 warnings · **381 tests** en 28 archivos ·
  `npm run build` compila sin `RESEND_API_KEY` y ya incluye `/api/cron/vencidos`.
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

## Hecho (2026-10-28, tanda del 27-10)
| Cambio | Qué dejó |
|---|---|
| `docs/estado/ORDEN_DE_EJECUCION.md` | Los dieciséis tickets de la tanda ordenados por cuatro criterios (dinero/seguridad, puerta automática, lo fundacional antes de quien lo usa, gobernanza al final), con las dependencias nativas de GitHub (#47 ← #40/#41/#42/#44; #46 ← #35; #48 ← los otros quince). |
| **#47 · Retrofit de la plantilla** | Los siete specs de la tanda siguen `docs/specs/PLANTILLA.md`: secciones canónicas en orden, notas finales y 21 HU con `Como … quiero … para`. No cambió ninguna decisión de comportamiento; sí se corrigieron las referencias cruzadas a los números viejos (MODELO, ADR 0005, handoff, guías y specs vecinos). El test estructural deja de nombrar a los siete como pendientes; `bd-mvp`, `front-mvp` y `migracion-otjph` siguen fuera, con su motivo y nombrados en el test. Commit `1a66dc5`. |
| Nueve specs de `docs/specs/` | Publicados: busqueda-por-campos, detalle-404, deuda-codigo-25-10, formato-del-dinero, iconos-y-copy-del-dominio, integracion-continua, plantilla-de-spec, skills-del-proyecto y trazabilidad-issues. |
| `src/lib/format.ts` | `redondearACentavos` (aritmética) y `formatPrice` adaptativo: entero sin decimales (`$ 3.000`), con centavos con dos exactos (`$ 4,50`). Una sola regla de dinero para tienda, panel, remito y checkout. |
| `src/lib/carrito.ts` + `checkout.ts` + `Carrito.tsx` + `checkout/page.tsx` | `subtotalDeLinea` (precio × cantidad redondeado) y `totalDelPedido` como suma de subtotales redondeados; el checkout usa la misma función de redondeo y dejó la suya. |
| `tests/front/formato-dinero.test.ts` | Doce tests: formato con y sin centavos, redondeo sin error de punto flotante, total que suma subtotales redondeados, coherencia carrito→checkout, remito con el mismo total y una sola función de formato en carrito, checkout y panel. |
| `carrito/spec.md` y `checkout/spec.md` | La desviación de formato deja de estar abierta: los dos specs enuncian la regla y el ejemplo falso (`3001.65 → $ 3.002`) se retira. |


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
> El redondeo del dinero (hallazgo 1 de la auditoría del 27-10) quedó cerrado el 2026-10-28 con el issue
> **#44**: el formato es adaptativo, el subtotal se redondea en la aritmética y el total suma subtotales
> redondeados. Los demás hallazgos ya tienen su tajada en el orden de ejecución.
1. 🟡 **Búsqueda del catálogo:** `catalogo.ts` une nombre + categoría + tipo + descripción con `join(" ")`
   antes de buscar, así que un término cruza el borde entre campos (`"gel alcohol"` matchea
   `Alcohol en Gel`). El test sólo cubre coincidencias intra-campo. → **#41**.
2. 🟡 **Detalle de producto:** el 404 por id inválido tiene código (`producto/[id]/page.tsx:25-34`) pero
   ningún test lo cubre. → **#42**.
3. 🟡 `FlaskConical` (ícono de laboratorio) sigue en `about`, `Header`, `Footer` e `ImagenProducto`, y
   `sobre-el-proyecto/spec.md` §1 lo daba por retirado. → **#43**.
4. ✅ **Hueco de plantilla transversal:** cerrado el 2026-10-28 con **#40** (nace `PLANTILLA.md` y su test
   estructural) y **#47** (retrofit de los siete specs de la tanda). `bd-mvp`, `front-mvp` y
   `migracion-otjph` siguen fuera de la plantilla y están nombrados en el test, para que una tarea futura
   los alcance sin que nadie tenga que acordarse.
5. 🟡 Trazabilidad: #2, #5, #6, #8, #9, #10, #12, #13 y #14 siguen **OPEN** aunque `AGENTS.md` §9 las da
   por hechas; los del cierre beta también. → **#48**.
6. 🟡 `.agents/skills/` **no existe**, y `AGENTS.md` §11 lo declara como fundación. → **#45**.
7. 🔴 **Seguridad:** la anon key ejecuta tres RPC en `otjph`; se cierra al aplicar `03`.

Siguen abiertos los hallazgos de la revisión de código del 25-10 (`buscarCliente` con `ilike`,
duplicación de "archivo subido", `sinConfiguracion()` con diagnóstico falso, casteos sin Zod): son las
tajadas #33 a #38 y #46.

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
