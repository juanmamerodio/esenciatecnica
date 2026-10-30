# Spec · Cerrar la migración del MVP en `otjph`

> **Feature:** `migracion-otjph` · **Estado:** `01`–`06` aplicadas en `otjph`, `bd:viva` en **verde**; falta la firma de `respaldo_legacy` (no visible con la anon key) · **Fecha:** 2026-10-26, revisado el 2026-10-28.
> **Origen:** auditoría de la sesión del 26-10 sobre el estado real de `otjphjnrwihqzzhbfnmh`.
> **Fuente de verdad:** [`docs/MODELO.md`](../../MODELO.md) + [`docs/estado/AUDITORIA_BD.md`](../../estado/AUDITORIA_BD.md) + `supabase/migrations/`.
> **Responsable:** Isabella Infante (Database & SQL Architecture).
> **Criterio de cierre:** `npm run bd:viva` en verde.

---

## 1. Problema (Problem Statement)

Isabella movió a `review` el 24-10 las dos tareas de base del Teams — *«Aplicar DDL del MVP en otjph»* y
*«RLS y Storage: cerrar lectura anónima y bucket comprobantes»* —, pero el proyecto vivo **no coincide**
con el esquema versionado. La verificación del 26-10 encuentra **13 desajustes** (tabla completa en §7).
La medición del **27-10**, con el `bd:viva` ampliado (B2 · #21), sube a **26 desajustes** (§7.4).

Desde el punto de vista de quien usa la tienda:

- La Home y `/catalog` muestran el estado de error: la vista del catálogo no tiene la forma del contrato.
- Nadie puede comprar: falta `crear_pedido`, así que el checkout no tiene con qué confirmar el pedido ni reservar stock.
- El Administrador no puede validar nada: sin el bucket `comprobantes` no hay foto que comparar, y sin las
  columnas `mensaje`/`atendida` no hay alerta de stock que mostrar.
- Y hay un modo de falla silencioso peor: si la vista trajera filas sin `disponible`, la tienda mostraría
  **todo el catálogo como Agotado** sin decir que el esquema está mal.

El problema de fondo no es solo el DDL: es que **nada en el repo detectaba el desajuste**. `npm test`
corre contra PGlite con las migraciones del repo, así que un proyecto Supabase a medio migrar deja los
230 tests en verde. Eso es lo que dejó que dos tareas se marcaran como hechas sin estarlo.

## 2. Solución (Solution)

Aplicar las migraciones versionadas del repo sobre `otjph` **en orden**, sin escribir SQL nuevo, y dejar
`npm run bd:viva` como la puerta de cierre que compara el proyecto vivo contra el esquema versionado.

La migración `01` ya está escrita para esto: hace `drop table if exists … cascade` de las diez tablas del
dominio y las recrea. La convergencia es **por reconstrucción**, no por `alter`: no hay que reconciliar
columna por columna lo que quedó a medias.

Después de aplicar, el front no cambia: el único cambio de código ya está hecho (§5).

**Actualización 2026-10-27 (cierre beta en repo).** Ya no son seis migraciones: el repo versiona
`00`–`06` y `supabase/seed.sql`, escritos, probados y **listos para aplicar**. No hay que escribir SQL
nuevo:

| Migración | Qué hizo |
|---|---|
| `20261023090000_00_respaldo_legacy.sql` | Respaldo legacy con marcador real (`detalle_carrito`/`stock.porcentaje`), `respaldo_legacy.conteos` y **aborta** si los conteos de origen y copia no coinciden (B1 · #16). |
| `20261023090100_01_esquema_mvp.sql` | Reconstruye las diez tablas canónicas, la vista `vista_catalogo`, los constraints y los índices. |
| `20261023090200_02_reglas_y_rpc.sql` | Triggers de historial y de total derivado, alertas y las cuatro RPC. |
| `20261023090300_03_rls.sql` | RLS, grants y permisos de ejecución: cierra las diez tablas y deja las RPC sólo para `service_role`. |
| `20261023090400_04_storage_comprobantes.sql` | Bucket privado `comprobantes` (5 MB, png/jpeg/webp). |
| `20261023090500_05_storage_productos.sql` | Bucket público `productos` (fotos de la tienda). |
| `20261027120000_06_cierre_beta.sql` | `producto.precio > 0` y trigger de stock con **`ET007`** (no dejar `cantidad_actual` por debajo de la reserva) (B3 · #17). |
| `supabase/seed.sql` | Tres productos de demo idempotentes, stock no destructivo y uno bajo el umbral (B5 · #22). |

`bd:viva` también se amplió (B2 · #21): exige `401`/`403` en las **diez** tablas cerradas (no “cero
filas”), verifica que `anon` **no pueda ejecutar** las cuatro RPC, mira los dos buckets y la ausencia de
`detalle_carrito`. El criterio de cierre no cambia: **`npm run bd:viva` en verde**.

## 3. Historias de usuario (User Stories)

1. Como Isabella, quiero correr las migraciones del repo (`00`–`06`) en orden sobre `otjph`, para que la base coincida con `docs/MODELO.md` sin SQL nuevo.
2. Como Isabella, quiero respaldar las tablas actuales antes de reconstruir, para poder volver atrás si algo sale mal.
3. Como Isabella, quiero que la migración de respaldo no se saltee en silencio, para que la próxima reconstrucción no corra sin red.
4. Como Isabella, quiero que `vista_catalogo` exponga `disponible`, `cantidad_actual`, `cantidad_reservada` y `cantidad_warning`, para que el catálogo lea la disponibilidad real.
5. Como Isabella, quiero que `crear_pedido(p_id_cliente, p_items)` exista con su firma, para que el checkout confirme el pedido y reserve stock en una transacción.
6. Como Isabella, quiero que `alerta_de_estado` tenga `mensaje` y `atendida`, para que el panel muestre y cierre alertas de stock.
7. Como Isabella, quiero que `estados_comprobante` cuelgue de `comprobante` por `id_comprobante`, para que el historial de validación sea auditable.
8. Como Isabella, quiero que `detalle_del_pedido` tenga la PK `id_detalle_pedido`, para que los tipos del front coincidan con la base.
9. Como Isabella, quiero que existan las columnas de tiempo (`creado_en`, `actualizado_en`, `subido_en`), para que los triggers de marca de tiempo no fallen al actualizar.
10. Como Isabella, quiero que `detalle_carrito` deje de existir, para que el MVP no arrastre el carrito persistente que el modelo retiró.
11. Como Isabella, quiero que `admin` y `roll` queden cerradas por RLS, para que la anon key no pueda leer la contraseña en texto plano.
12. Como Isabella, quiero que el bucket `comprobantes` exista privado, de 5 MB y solo png/jpeg/webp, para que el Cliente suba su foto y la firma solo el servidor.
13. Como Isabella, quiero que el bucket `productos` exista público, de 5 MB y solo png/jpeg/webp, para que el Administrador suba las fotos que sirve la tienda.
14. Como Isabella, quiero recargar el cache de PostgREST después de aplicar, para que `/rest/v1` vea las tablas y las RPC sin esperar.
15. Como Juanma, quiero que `npm run bd:viva` quede en verde, para saber que el proyecto vivo coincide con lo versionado.
16. Como Cliente, quiero ver los productos con su disponibilidad real, para no intentar comprar lo que no hay.
17. Como Cliente, quiero confirmar el pedido y subir el comprobante, para completar la compra.
18. Como Cliente, quiero que un producto agotado se marque como tal sin desaparecer, para entender por qué no puedo pedirlo.
19. Como Administrador de Química, quiero aprobar o rechazar el comprobante comparando monto e imagen, para validar el pago a mano.
20. Como Administrador de Química, quiero ver la alerta de stock en el panel, para reponer antes de quedarme sin producto.
21. Como Administrador de Química, quiero que al aprobar se emita el remito, para que el Cliente reciba su documento.
22. Como Enzo, quiero que los buckets existan, para poder probar la subida del comprobante y de la foto de producto.
23. Como Celeste, quiero un criterio de cierre ejecutable, para marcar las dos tareas como terminadas o devolverlas con evidencia.
24. Como equipo, quiero que el estado de las tareas del Teams refleje la realidad de la base, para no volver a dar por hecho lo que no está.

## 4. Decisiones de implementación (Implementation Decisions)

**Fuente de verdad.** Las migraciones del repo son el contrato. No se inventa SQL: si algo no está en
`MODELO.md`, se documenta y se consulta antes.

**Mecanismo.** Se aplican `00 → 01 → 02 → 03 → 04 → 05` en orden. `01` reconstruye las diez tablas del
dominio (`drop … cascade` + `create`), así que la convergencia no depende de lo que quedó a medias. `02`
va después de `01` (los `create trigger` de `02` necesitan que `01` haya dropeado los triggers viejos por
cascade), `03` después de `02`, y `04`/`05` al final. Cierra con `notify pgrst, 'reload schema'`.

**Actualización 2026-10-27 (B3 · #17).** La secuencia termina en `06`: `20261027120000_06_cierre_beta.sql`
corre **después de `05`** y sólo **agrega** dos reglas (`producto.precio > 0` y el trigger `ET007`), sin
reescribir la semántica de `01`–`05`. Es re-ejecutable si la ventana del SQL Editor se corta.

**No se agrega una migración `06` de reconciliación** ni se reescribe la semántica de una migración ya
aplicada. (La `06` del cierre beta no reconcilia: endurece una constraint y agrega un trigger.)

**Datos: respaldo manual obligatorio antes de correr `01`.** La versión original de `00` usaba
`producto.id_stock` como marcador de esquema legacy, y esa columna ya no existe en `otjph`: **`00` no hacía
nada** y `01` destruiría las filas actuales sin red. Además, con la anon key no se puede contar filas de
las tablas protegidas por RLS, así que **no se puede afirmar desde afuera que estén vacías**. **Corregido el
2026-10-27 (B1 · #16):** `00` detecta el legacy por `detalle_carrito`/`stock.porcentaje`, anota los conteos
en `respaldo_legacy.conteos` y **aborta** si origen y copia no coinciden; no hay que correr `01` sin
verificar esos conteos.

**Firmas.** Las RPC usan `integer`, no `bigint`: `bd-mvp/spec.md` §4 las declara mal y hay que corregirlo.

**`id_detalle` → `id_detalle_pedido`.** `01` crea el nombre canónico. No se agrega alias ni vista de
compatibilidad: el nombre viejo no queda en ningún lado.

**Semilla.** `supabase/seed.sql` repuebla el catálogo de prueba. No se inventan productos ni categorías.

**Nada del front cambia** por esta spec, salvo el guard del catálogo ya implementado (§5).

## 5. Decisiones de testing (Testing Decisions)

**Qué hace bueno a un test acá.** Que observe comportamiento por la interfaz pública —el borde HTTP de
PostgREST con la anon key y la firma de cada RPC— y no nombres de triggers, OIDs ni definiciones internas.
Un test tiene que sobrevivir a que se reescriba la migración y seguir diciendo lo mismo.

**Seam nuevo, el único:** `npm run bd:viva` (`scripts/verificar-bd-viva.mjs`). Compara el esquema
versionado, aplicado en PGlite, contra el proyecto vivo consultado con la anon key.

- **Cubre:** columnas por tabla y vista, columnas legacy que sobran, existencia de las cuatro RPC **y que
  `anon` no pueda ejecutarlas**, ausencia de las tablas retiradas (incluida `detalle_carrito`), RLS de
  lectura y escritura anónima en las **diez** tablas cerradas (`401`/`403`, no “cero filas”), y los dos
  buckets.
- **Deja afuera:** los cuerpos de las funciones (verifica firma, no comportamiento), los datos fila por
  fila, el contenido de `respaldo_legacy` y cualquier cosa que exija la service role.

**Prior art.** `tests/db/contrato.test.ts` (forma de las tablas y columnas), `tests/db/rls.test.ts` y
`tests/db/rls-supabase.test.ts` (superficie anónima), `tests/front/catalogo.test.ts` (el catálogo por su
función pública). `bd:viva` sigue el mismo estilo: nombres en español, un `ok`/`FALLA` por control y salida
distinta de cero si algo no cierra.

**Guard del catálogo (ya implementado, `tests/front/catalogo.test.ts`).** Si la vista devuelve filas sin la
columna `disponible`, `consultarCatalogo` devuelve `estado: 'error'` en vez de rellenar con 0 y mostrar todo
agotado. El test se escribió antes del cambio y fallaba: verificado en rojo y después en verde.

**`npm test` sigue sin red.** `bd:viva` es un script aparte, no un test de la suite: no consulta Supabase
en CI.

## 6. Fuera de alcance (Out of Scope)

- **Secretos y entorno de Enzo:** `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` y `RESEND_API_KEY` (hoy
  `RESEND_FROM_EMAIL` y `CRON_SECRET` también).
- **Datos de transferencia de la Cooperadora (G4)** y `NEXT_PUBLIC_TRANSFERENCIA_*`.
- **Verificación manual en navegador** de las rutas del front (#23).
- **Scheduler del cron de los viernes:** `cancelar_pedidos_vencidos()` existe pero ningún job lo llama.
  Es una tajada propia. **(Cerrado el 2026-10-27 en B4 · #18:** `vercel.json` dispara
  `/api/cron/vencidos` con `CRON_SECRET`; el fallback manual queda en `bd-mvp` §9.3.)**
- **`.agents/skills/`:** `AGENTS.md` §11 y `front-mvp` §3.4 lo declaran y el directorio no existe. Tajada propia.
- **Inconsistencias de specs detectadas en la auditoría** (se listan en §7): `checkout` §4.3 contra su HU-3,
  el `aviso` de fallo de correo que se descartaba en `comun.ts` (**cerrado en A1 · #19, 2026-10-27**),
  `FlaskConical` en `/about` y el footer, y el término `productos` en la spec de admin contra
  `GLOSSARY.md`. (`bd-mvp` ya no está huérfano de issue: cuelga de [#15](https://github.com/juanmamerodio/esenciatecnica/issues/15).)
- **RLS por perfil y `admin`/`roll` operativos:** fase 2.

## 7. Notas adicionales (Further Notes)

### 7.1 Los 13 desajustes (salida de `npm run bd:viva`, 26-10)

| Control | Resultado |
|---|---|
| `alerta_de_estado` | faltan `mensaje`, `atendida` |
| `cliente` | falta `creado_en` |
| `comprobante` | falta `subido_en` |
| `detalle_del_pedido` | falta `id_detalle_pedido` (vivo: `id_detalle`) |
| `estados_comprobante` | falta `id_comprobante` |
| `pedido` | faltan `creado_en`, `actualizado_en` |
| `producto` | faltan `creado_en`, `actualizado_en` |
| `stock` | falta `actualizado_en` |
| `vista_catalogo` | faltan `cantidad_actual`, `cantidad_reservada`, `disponible`, `cantidad_warning` |
| RPC `crear_pedido` | no existe (PGRST202) |
| `detalle_carrito` | sigue existiendo |
| bucket `comprobantes` | no existe |
| bucket `productos` | no existe |

En verde ya están: `estados_pedidos` y `remitos_de_venta` completas, la ausencia de `productos`, `pedidos`
y `verificaciones`, las tres RPC restantes, la RLS de lectura y escritura anónima en las seis tablas
sensibles, y `cliente`/`pedido`/`producto` con sus columnas del modelo.

**Actualización 2026-10-27:** esta tabla es el historial del 26-10 y se conserva tal cual. La medición
vigente, con el `bd:viva` ampliado, está en §7.4.

### 7.2 Correcciones a lo que dice `memory.md`

- **No faltan las cuatro RPC: falta solo `crear_pedido`.** `aprobar_comprobante`, `rechazar_comprobante` y
  `cancelar_pedidos_vencidos` existen y responden: un nombre de parámetro inexistente devuelve `PGRST202`,
  un tipo inválido devuelve `22P02` y la llamada correcta devuelve `204`. El `PGRST202` que se leyó el 25-10
  salió de mandar `{}` sin parámetros, que no matchea ninguna firma con argumentos.
- **`vista_catalogo` ya no da `PGRST205`:** existe, pero con la forma vieja (`stock_actual`,
  `stock_warning`, `porcentaje`) en vez de la del contrato.
- **La suite son 230 tests, no 227** (`AGENTS.md` §8 y `memory.md` están desactualizados por 3).
  **Actualizado el 2026-10-27:** son **279 tests en 23 archivos**, ya con `tests/front/` además de
  `tests/db/`.

### 7.3 Por qué esto no lo vio nadie

`npm test` aplica las migraciones del repo sobre PGlite y pasa en verde con el proyecto vivo roto. La
auditoría lo dejó medible: es exactamente el agujero que `bd:viva` cierra, y la razón por la que este
criterio de cierre no debería volver a ser un `SELECT` a mano en el SQL Editor.

### 7.4 Los 26 desajustes medidos el 27-10 (salida del `bd:viva` ampliado)

La medición del 27-10 no reescribe la de §7.1: la amplía. Los 13 desajustes del 26-10 siguen vigentes y el
`bd:viva` de B2 (#21) agrega la superficie que antes no miraba (lectura anónima de las diez tablas, las
RPC cerradas a `anon`, los buckets y `detalle_carrito`). El total medido es **26 desajustes**:

| Control | Resultado el 27-10 |
|---|---|
| lectura anónima de las diez tablas cerradas | `200 []` en las diez, incluidas `admin` y `roll`: una tabla cerrada no puede responder, ni siquiera vacía |
| `stock.porcentaje` | columna legacy todavía visible |
| `vista_catalogo` | forma vieja (`stock_actual`, `stock_warning`, `porcentaje`, `activo`) en vez del contrato |
| `detalle_del_pedido.id_detalle` | columna legacy visible (la tabla todavía está abierta) |
| `detalle_carrito` | sigue existiendo |
| RPC `aprobar_comprobante`, `rechazar_comprobante`, `cancelar_pedidos_vencidos` | la anon key **las ejecuta** (`204` / `25006`) |
| `crear_pedido` | sigue sin la firma de dos argumentos |
| buckets `comprobantes` y `productos` | no existen |
| columnas faltantes de §7.1 | `creado_en`, `actualizado_en`, `subido_en`, `mensaje`, `atendida`, `id_comprobante` siguen faltando |

El detalle por superficie está en [`bd-mvp/spec.md`](../bd-mvp/spec.md) §9.1 y §9.2, y el resumen vigente
en [`memory.md`](../../../memory.md). La escritura anónima ya está denegada: la fuga es de **lectura**.
`respaldo_legacy` tampoco existía en `otjph` (`404`): lo crea `00`, que hay que correr **antes** de `01`.
El cierre sigue siendo el mismo y no se negocia: **`npm run bd:viva` en verde**.

### 7.5 La medición del 28-10 cierra en verde

Con `01`–`06` aplicadas, `npm run bd:viva` del 2026-10-28 termina en
`VERDE · el proyecto vivo coincide con el esquema versionado`: las diez tablas cerradas responden
`401`/`403` (no `200 []`), la vista tiene sus doce columnas, `detalle_carrito` y las columnas legacy no
existen, las cuatro RPC existen y están cerradas a `anon`, y los dos buckets existen —`comprobantes`
privado y `productos` público—.

El último control que quedaba en rojo era un **defecto del propio control**, no del proyecto vivo: la
sonda de los buckets pedía `/storage/v1/bucket/{id}` con la anon key, y esa ruta contesta
`NoSuchBucket` aunque el bucket exista, porque `anon` no ve ningún bucket en la lista. Corregido en
[#21](https://github.com/juanmamerodio/esenciatecnica/issues/21); el detalle de las dos sondas está en
[`bd-mvp/spec.md`](../bd-mvp/spec.md) §9.5.

Sigue **afuera** del control lo que la anon key no puede ver: `respaldo_legacy` y su conteo —lo firma
quien corrió `00` en el SQL Editor—, el límite de 5 MB y los tipos MIME de cada bucket.

Los **datos** vivos tampoco son los del seed del repo: los tres productos traen otro stock
(50/30/100, ninguno bajo el umbral) y `imagen_url` apunta a `ejemplo.com`, así que no disparan la alerta
del panel ni muestran fotos. Eso es B5 · [#22](https://github.com/juanmamerodio/esenciatecnica/issues/22),
no esta migración.

---

## 8. Notas adicionales (cierre beta)

### Estado de implementación (auditoría del 2026-10-27)

| Criterio | Estado | Evidencia |
|---|---|---|
| Migraciones `00`–`06` escritas y versionadas | implementado | `supabase/migrations/20261023090000_00_respaldo_legacy.sql` … `20261027120000_06_cierre_beta.sql`; commits `ef36427`, `3ee339d`, `c1c904a`. |
| `00` respaldo legacy con verificación de conteos | implementado | Marcador por `detalle_carrito`/`stock.porcentaje`, `respaldo_legacy.conteos` y aborto si origen y copia no coinciden; `tests/db/migracion-legacy.test.ts`; commit `3ee339d`. |
| `01` esquema, `02` reglas y RPC, `03` RLS | implementado | `tests/db/contrato.test.ts`, `tests/db/pedidos.test.ts`, `tests/db/aprobacion.test.ts`, `tests/db/rls.test.ts`, `tests/db/rls-supabase.test.ts`. |
| `04`/`05` Storage (`comprobantes` privado, `productos` público) | implementado | `04_storage_comprobantes.sql`, `05_storage_productos.sql`; PGlite no tiene el esquema `storage`, así que quedan sin cobertura automática (`AUDITORIA_BD.md` §8.3). |
| `06` `precio > 0` + trigger `ET007` con reserva de stock | implementado | `06_cierre_beta.sql`; `tests/db/cierre-beta.test.ts`; `src/lib/admin.ts` traduce `ET007` a `stock-bajo-reserva`; commit `c1c904a`. |
| `supabase/seed.sql` | implementado | Tres productos idempotentes, stock no destructivo y uno bajo el umbral; `tests/db/seed.test.ts`; commit `943e380`. |
| `bd:viva` con las diez tablas cerradas, las RPC cerradas a `anon`, los dos buckets **con su visibilidad** y `detalle_carrito` | implementado | `scripts/bd-viva-reglas.mjs` (`TABLAS_CERRADAS`, `evaluarRpc`, `rutaDeExistencia`/`rutaPublica`), `scripts/verificar-bd-viva.mjs:224-246` (Storage, dos sondas por bucket) y `tests/front/bd-viva.test.ts` (25 tests); commits `fed815a` y `65657d5` (#21). |
| Cron de vencidos los viernes | implementado | `vercel.json` (`59 2 * * 6`), `src/app/api/cron/vencidos/route.ts`; `tests/front/cron.test.ts`; commit `8d0bf44`. |
| Aplicar `00`–`06` en `otjph` | implementado | `bd:viva` del 28-10 en **verde**: `01`–`06` aplicadas (esquema, vista, RLS, RPC y buckets). De `00` queda la firma de `respaldo_legacy` (B1 · #16, B3 · #17). |
| Correr `supabase/seed.sql` en `otjph` | sin verificar | Los datos vivos no son los del seed: stock 50/30/100 (ninguno bajo el umbral) e `imagen_url` en `ejemplo.com`. Es B5 · #22. |
| `npm run bd:viva` en verde | implementado | Salida del 28-10: `VERDE · el proyecto vivo coincide con el esquema versionado` (#15). |
| Cerrar la lectura anónima y borrar lo retirado | implementado | Las diez tablas responden `401`/`403`; `detalle_carrito`, `stock.porcentaje`, `detalle_del_pedido.id_detalle` y la vista vieja ya no existen. |
| Buckets `comprobantes` y `productos` | implementado | Sondas anónimas del 28-10: `comprobantes` existe y es privado; `productos` existe y es público (B2 · #21). |
| `respaldo_legacy` | sin verificar | La anon key no ve otros esquemas: lo firma quien corrió `00` en el SQL Editor. |
| Secretos y entorno de producción | pendiente | O1 · #20 (Enzo): `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET` y `NEXT_PUBLIC_TRANSFERENCIA_*`. |
| Verificación manual en navegador con la base migrada | pendiente | B6 · #23 (Celeste), bloqueada por **#20** (secretos) y **#22** (seed y fotos); el esquema ya no bloquea. |
| Scheduler del cron (antes fuera de alcance) | implementado | B4 · #18: `vercel.json` + `CRON_SECRET`; fallback manual en `bd-mvp` §9.3. |
| `.agents/skills/` | implementado | `.agents/skills/tablero-teams/SKILL.md` y `.agents/skills/bd-viva/SKILL.md`, nombradas en `AGENTS.md` §11; `tests/front/skills-del-proyecto.test.ts`; commit `7fd1f72` (#45). |
| Inconsistencias de specs de §6 | implementado | El `aviso` de correo se cerró en A1 · #19; la contradicción entre la HU-3 de `checkout` y sus decisiones de implementación (§4: el monto se precarga y es editable) se resolvió el 27-10; `FlaskConical` en `/about` y el footer se retiró en **#43**; `productos` en la spec de admin queda documentado como el bucket, con excepción explícita. |
| `npm test` como evidencia de la base viva | retirado | Corre contra PGlite y deja `otjph` a medio migrar en verde; el único control es `bd:viva` (`memory.md`, reglas). |

En verde **en repo**: `typecheck` y `lint` en 0, `npm test` con 388 tests en 29 archivos y `npm run build`
que compila sin `RESEND_API_KEY`. Y desde el 28-10 también está verde **la base viva**: `bd:viva` cierra
en `VERDE` con `01`–`06` aplicadas (§7.5). Lo que queda no es esquema: son los secretos, el seed y las
fotos, y la verificación en pantalla.

### Pendiente

- **Firmar `respaldo_legacy`** en el SQL Editor: es lo único de B1 que la anon key no puede ver
  (`bd:viva` ya está verde).
- **Cargar los secretos** de producción (O1 · #20, Enzo): sin la service role no hay checkout, panel ni cron.
- **Correr el seed del repo y subir las fotos** desde `/admin` (B5 · #22): los datos vivos no son los del
  seed y no hay ningún producto bajo el umbral que dispare la alerta del panel.
- **Verificación punta a punta en navegador** (B6 · #23, Celeste), bloqueada por #20 y #22.
