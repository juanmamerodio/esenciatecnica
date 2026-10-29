# memory.md · estado de build

> Hiper-corto. Leer al abrir sesión; reescribir al cerrar. **Última:** 2026-10-28 (sesión de **#21**: la
> base viva entra en contrato y `bd:viva` queda en verde; el camino crítico pasa a ser los secretos, el
> seed con fotos y la verificación en pantalla).

## Ahora
- Objetivo: **beta presentable el viernes 30-10**. La base viva ya está migrada y **verificada**; falta
  la clave de servicio, datos de demo con foto y la corrida en el navegador.
- **`npm run bd:viva` cierra en VERDE** contra `otjph` (28-10): vista con sus 12 columnas, RLS de las
  diez tablas (`401/403`, no `200 []`), las cuatro RPC cerradas a `anon`, `detalle_carrito` ausente y
  los dos buckets (`comprobantes` privado, `productos` público). Es el criterio de cierre de #15/#16.
- El último rojo **no era del proyecto vivo sino del control**: la sonda de buckets pedía la ficha
  (`GET /storage/v1/bucket/{id}`) y con la anon key esa ruta contesta `NoSuchBucket` **aunque el bucket
  exista**, porque `anon` no ve ningún bucket en la lista. Corregido en **#21** (commit `65657d5`) con
  dos sondas anónimas por objeto, y el control ahora también avisa si `comprobantes` quedara público.
- **Los datos vivos no son el seed del repo**: los tres productos traen otro stock (50/30/100, ninguno
  bajo el umbral) e `imagen_url` apunta a `ejemplo.com`. No disparan la alerta del panel ni muestran
  fotos: es **B5 · #22**, y necesita la service role y una pasada por `/admin`.
- Decisión vigente: **Juanma aplica las migraciones con revisión de Isabella**; el DDL sigue siendo de
  ella. Queda **una** firma que la anon key no puede dar: `respaldo_legacy` y sus conteos, en el SQL Editor.
- **Tablero de Teams** (leído con `npm run teams -- leer`, nunca cacheado acá): **45 tareas** —10
  `backlog`, 6 `review`, 29 `done`—. La sesión movió a `done` *«Aplicar DDL del MVP en otjph»* y *«RLS y
  Storage: cerrar lectura anónima y bucket comprobantes»*, y publicó un **AVANCE** que corrige la nota de
  **BLOQUEO** del 27-10 (los 26 desajustes ya no están; la bandeja no se edita, se supera con otra nota).
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VERCEL_OIDC_TOKEN` y
  `ADMIN_PASSWORD` (la puso Juanma el 28-10). Faltan `SUPABASE_SERVICE_ROLE_KEY` —sin ella el panel
  responde `503` y **no se puede ver el panel en vivo**—, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
  `CRON_SECRET` y `NEXT_PUBLIC_TRANSFERENCIA_*` (#20, Enzo).

## Semáforo
- Local: `typecheck` 0 errores · `lint` 0 errores y 0 warnings · **397 tests** en 29 archivos ·
  `docs:links` 0 links sin resolver · `npm run build` compila sin `RESEND_API_KEY`.
- **GitHub**: `main` y `origin/main` al día (sesión #21, hasta `1b09cb4`). Las corridas `40792252142`
  y `40793704253` dejan **Typecheck, Lint, Test y Docs links en verde** y **`Build Next.js` en rojo** con
  `supabaseKey is required` en `/api/notifications`: es el **rojo esperado** por los secretos de Actions
  que faltan (#20), no un defecto del repo.
- BD prod `otjph…`: **VERDE** con el `bd:viva` del 28-10 (`01`–`06` aplicadas). Fuera del control, por
  ser invisible a la anon key: `respaldo_legacy`, el límite de 5 MB y los MIME de cada bucket.

## Tickets del cierre beta
| Ticket | Qué | Estado |
|---|---|---|
| #15 · D1 | cerrar la migración del MVP | ✅ en todo lo que mide `bd:viva` (verde); sigue abierto por la firma de `respaldo_legacy` |
| #16 · B1 | respaldo + `00`–`06` aplicadas en `otjph` | ✅ `01`–`06` aplicadas y medidas; falta firmar `respaldo_legacy` (Juanma/Isabella) |
| #17 · B3 | `06`: `precio > 0`, `ET007`, mensajes del panel | ✅ código, test y `06` aplicada |
| #18 · B4 | cron de vencidos los viernes | ✅ `cron-auth`, ruta, `vercel.json`; falta `CRON_SECRET` |
| #19 · A1 | el panel avisa si el remito no salió | ✅ helper + panel + tests |
| #20 · O1 | secretos y entorno de producción | ⏳ Enzo; **es el camino crítico** |
| #21 · B2 | `bd:viva` prueba toda la superficie pública | ✅ **cerrado**: control de buckets corregido y verde (`65657d5`) |
| #22 · B5 | semilla y fotos de la beta | ⏳ el seed del repo no está aplicado y no hay fotos |
| #23 · B6 | verificación punta a punta en navegador | ⏳ Celeste, bloqueada por #20 y #22 |

## Hecho (2026-10-28, #21 · el control de los buckets de `bd:viva`)
| Cambio | Qué dejó |
|---|---|
| `scripts/bd-viva-reglas.mjs` + `verificar-bd-viva.mjs` | `evaluarBucket` (una sonda a la ficha del bucket) se parte en `evaluarBucketExistente` —ruta del objeto autenticado: `NoSuchKey` = existe— y `evaluarBucketPublico` —ruta pública: `NoSuchBucket` = privado—, con `rutaDeExistencia`, `rutaPublica` y `CLAVE_INEXISTENTE`. `BUCKETS` pasa de nombres a `{nombre, publico}`. El `statusCode` del cuerpo no decide: `NoSuchKey` y `NoSuchBucket` llegan los dos con `404` y HTTP 400. |
| `tests/front/bd-viva.test.ts` | 22 tests (16 → 22): las dos sondas, el bucket de comprobantes público como fuga, el de productos privado como tienda sin fotos y la guardia de que el script **no** vuelva a usar la ruta de metadatos. |
| `npm run bd:viva` | **VERDE** contra `otjph`, con los dos buckets y su visibilidad. |
| Docs | `bd-mvp` §4.4/§5/§9.5 (el falso negativo y las dos sondas), `migracion-otjph` §7.5 y §8 (la medición del 28-10), `AGENTS.md` §8/§9, la skill `bd-viva` §3, y las filas que daban `bd:viva` por rojo en `admin`, `front-mvp` e `integracion-continua` (commit `95604d8`). |
| GitHub | #21 cerrado por el mensaje de `65657d5` **con** su comentario de cinco bloques y la salida cruda de `bd:viva`. |
| Revisión en contexto limpio | Dos ejes (Estándares y Spec) sobre `65657d5`. **Seis hallazgos, los seis corregidos en el commit de cierre:** el `return estado === 404` de `esBucketAusente` contradecía su propio comentario —un 404 sin `code` se leía como «no existe» y, en la sonda pública, como «privado»: la dirección sensible— y ahora **una respuesta sin `code` conocido se reporta, no se interpreta**; «no se pudo medir» ya no pasa por «privado»; el cierre dice **cuántos** controles quedaron como `nota`; `AGENTS.md` §8/§9 y el encabezado quedaron con el conteo y la fecha reales; y los specs de `admin`, `checkout`, `front-mvp`, `integracion-continua` y `migracion-otjph` dejaron de afirmar que la base está a medio migrar, con la referencia `archivo:línea` del seam actualizada. Un solo hallazgo era un falso positivo del revisor (leyó #21 antes de que se publicara el comentario de evidencia). |
| Evidencia medida | `GET /storage/v1/bucket` con la anon key devuelve `[]`; `/storage/v1/bucket/productos` → `NoSuchBucket` aunque el bucket exista; `/storage/v1/object/authenticated/productos/…` → `NoSuchKey`; `/storage/v1/object/public/comprobantes/…` → `NoSuchBucket` (privado) y el mismo pedido sobre `productos` → `NoSuchKey` (público). |

## Hecho (2026-10-27/28, en repo, comprimido)
- **Tanda del 27-10:** los nueve specs y sus dieciséis tajadas (#33–#48) se implementaron en el orden de
  [`docs/estado/ORDEN_DE_EJECUCION.md`](docs/estado/ORDEN_DE_EJECUCION.md) —dinero, CI, seguridad,
  fundacionales, cosmética y gobernanza—, y los nueve issues `T0`–`T8` se cerraron con evidencia (**#48**).
- **Cierre beta en repo:** `00` corregida (marcador real y conteos), `06` (`precio > 0` y `ET007`), cron
  de vencidos con `CRON_SECRET`, el panel avisa si el remito no salió (A1), `bd:viva` ampliado a toda la
  superficie pública (B2) y seed idempotente con un producto bajo el umbral (B5). El detalle vive en
  [`bd-mvp`](docs/specs/bd-mvp/spec.md) y en [`migracion-otjph`](docs/specs/migracion-otjph/spec.md).
- **Auditoría y retro del 27-10:** el tablero entra en el contrato (`AGENTS.md` §1/§3/§10/§11/§12,
  [`teams.md`](docs/agentes/teams.md)) y nace `npm run teams`; `docs:links` entra en la definición de
  terminado.

## Hallazgos abiertos
> **Los hallazgos de código están cerrados y la base viva ya no es uno.** Lo que queda son claves, datos
> de demo y verificación en pantalla.
1. 🔴 **Secretos (#20, Enzo):** sin `SUPABASE_SERVICE_ROLE_KEY` no hay panel, checkout ni cron en vivo, y
   **es lo único que separa a la beta de la demo**. `ADMIN_PASSWORD` ya está.
2. 🟡 **Seed y fotos (#22):** el catálogo vivo no es el del repo (stock 50/30/100 sin nadie bajo el
   umbral, `imagen_url` en `ejemplo.com`), así que el popup de alerta no tiene qué mostrar y la tienda no
   tiene fotos. Se arregla corriendo `supabase/seed.sql` y subiendo fotos desde `/admin`.
3. 🟡 **`respaldo_legacy` sin firmar:** `bd:viva` no puede verlo (la anon key no lee otros esquemas); lo
   firma quien corrió `00` en el SQL Editor.
4. 🟡 **Verificación en pantalla (#23, Celeste):** ninguna tajada del front se vio en un navegador con la
   base migrada; bloqueada por #20 y #22.
5. 🟡 **Deuda de las skills del proyecto (revisión del 28-10):** la skill de `bd-viva` no nombra
   `scripts/verificar-bd-viva.mjs`, `tablero-teams` copia el bloque de comandos en vez de apuntarlo y
   falta `PARÁMETROS DE ENTRADA`; el test fija exactamente dos skills. Tarea `backlog` del tablero.
6. 🟡 **Contrato del tablero vs excepción de documentación:** `teams.md` §3 define `done` como «commit y
   test», pero `AGENTS.md` §8 exceptúa documentación y configuración, y `npm run teams` rechaza escribir
   una nota sobre una tarea que ya está en su estado (no hay `--forzar`). Decidir con el equipo si §3 la
   nombra.
7. ⏳ **Línea base de tests desactualizada:** `AGENTS.md` §8 ya dice **397 en 29** (lo corrigió esta
   sesión, porque su bloque se re-fechó), pero `carrito`, `catalogo` y `detalle-producto` en su §8 siguen
   con el número viejo. Tarea `backlog` del tablero, todavía abierta por esos tres specs.

## Reglas
- 1 ticket = 1 sesión = 1 commit quirúrgico. TDD. Español único. Sin IA. Sin envío.
- Dinero `NUMERIC(12,2)`; `precio > 0` y `monto > 0`; total derivado; un remito por comprobante; un
  comprobante pendiente por pedido.
- El total **se calcula**, se redondea y se **muestra** con la misma regla: `subtotalDeLinea` y
  `formatPrice` son las únicas funciones del dinero.
- El remito lo emite **la base**; el front lo compone y lo envía. El email es posterior y no bloqueante.
- `anon`: sólo `vista_catalogo`/`producto`/`stock`. Las RPC y el panel, sólo `service_role` + Basic Auth.
- **Buckets:** `comprobantes` privado (la imagen es del Cliente) y `productos` público (las fotos son de
  la tienda); los dos de 5 MB y png/jpeg/webp. Un control que los mida con la anon key **no puede** usar
  la ficha del bucket: son dos sondas por objeto.
- **`npm test` no prueba la base viva**: para eso está `npm run bd:viva`. Falla si una tabla cerrada
  responde `200` (aunque venga vacía) o si anon puede ejecutar una RPC.
- **Rechazo terminal:** no se reabre un pedido; el Cliente vuelve a comprar.
- **Cron:** viernes 23:59 ART = `59 2 * * 6` UTC en `vercel.json`, con `CRON_SECRET`. Fallback manual:
  `select cancelar_pedidos_vencidos();` en el SQL Editor.
- **El tablero de Teams se sincroniza con `npm run teams`** (puente temporal por PostgREST con la anon key
  pública de `quimicashop/config.js`). Contrato, estados y ritual: [`teams.md`](docs/agentes/teams.md).
- **Un issue se cierra con evidencia, no por confianza**: el comentario de cinco bloques y **commits y
  tests que existan de verdad**, subidos. La premisa de un ticket se verifica contra el artefacto.

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
- **`npm test` pasa en verde con la base rota** porque aplica las migraciones del repo en PGlite. Y un
  control rojo no siempre es la base rota: el 28-10 el rojo era del control (los buckets). Antes de
  culpar al esquema, probar la interfaz pública a mano.
- **Dinero:** el formato es **adaptativo** (entero sin decimales, con centavos dos decimales exactos); el
  redondeo vive en la aritmética (`redondearACentavos`, `subtotalDeLinea`) y la vista sólo muestra
  (`formatPrice`). La decisión está escrita en [`formato-del-dinero`](docs/specs/formato-del-dinero/spec.md) §4.
- Un spec **no se reescribe para tapar una desviación**: se marca la fila como `desviación` con
  `archivo:línea` y se abre la tarea. El código y la base mandan sobre el texto.
