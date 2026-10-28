# Spec · Base de datos MVP — cierre beta

> **Feature:** `bd-mvp` · **Estado:** aprobada para el cierre beta · **Fecha:** 2026-10-27.
> **Issue padre:** [#15 · D1 · Cerrar la migración del MVP en otjph](https://github.com/juanmamerodio/esenciatecnica/issues/15).
> **Responsable DDL:** Isabella Infante · **Aplicación en `otjph`:** Juanma, con revisión de Isabella.
> **Fuente de verdad:** [`docs/MODELO.md`](../../MODELO.md) + `supabase/migrations/` + `npm run bd:viva`.
> **Proceso:** `docs/metodo/brain.md` §3 (spec antes de codificar) y §7 (TDD obligatorio).

---

## 1. Problema

El esquema versionado del repo está bien; **la base viva no**. La verificación del 2026-10-27 con la
anon key (`npm run bd:viva`) mide **13 desajustes** y cinco superficies de lectura que la spec anterior
no cubría:

1. La tienda no compra: falta `crear_pedido`.
2. El catálogo no pinta la disponibilidad real: `vista_catalogo` conserva la forma vieja
   (`stock_actual`, `stock_warning`, `porcentaje`, `activo`) y no expone `cantidad_actual`,
   `cantidad_reservada`, `disponible` ni `cantidad_warning`.
3. El Administrador no puede validar: no existen los buckets `comprobantes` ni `productos`, y a
   `alerta_de_estado` le faltan `mensaje` y `atendida`.
4. **Lectura anónima abierta en tablas que deberían estar cerradas:** `admin`, `roll`,
   `estados_pedidos` y `estados_comprobante` responden `200` a la anon key (hoy vacías, pero la
   superficie está expuesta), y `detalle_carrito` sigue existiendo. La spec anterior sólo nombraba
   seis tablas sensibles y `bd:viva` sólo verificaba esas seis.
5. El respaldo no existe: la migración `00` usa `producto.id_stock` como marcador, columna que ya no
   está en `otjph`. **Se saltea en silencio** y `01` destruiría las filas actuales (3 productos y 3
   stocks) sin red. `respaldo_legacy` no existe (HTTP 404).
6. El cron de los viernes no existe: `cancelar_pedidos_vencidos()` está, pero ningún job la llama.
   Sin eso, el stock reservado no se libera nunca.
7. `npm test` corre contra PGlite y queda verde con la base rota: el único control que ve la base
   viva es `bd:viva`, y hoy no mira `admin`, `roll` ni el historial.

La spec anterior además declaraba las RPC como `bigint` (son `integer`), no documentaba la vista ni los
buckets, omitía `estados_comprobante` de los nombres físicos y no tenía issue que la linkeara
(`AGENTS.md` §6.2). Esta versión reemplaza ese contrato.

## 2. Solución

1. **Respaldo real y aplicación ordenada.** Corregir el marcador de `00` (detectar el esquema legacy
   por `detalle_carrito` o `stock.porcentaje`, no por `producto.id_stock`), respaldar a mano las tablas
   existentes en `respaldo_legacy` y aplicar `00 → 01 → 02 → 03 → 04 → 05` en `otjph`. Cerrar con
   `notify pgrst, 'reload schema'`.
2. **Migración `06` de cierre** (nueva, sólo agrega; no reescribe las anteriores):
   - `producto.precio > 0` (hoy `>= 0`; un pedido de total 0 no se puede aprobar porque el
     comprobante exige `monto > 0`).
   - Trigger `stock_valida_reserva` que rechaza con `ET007` dejar `cantidad_actual <
     cantidad_reservada`, para que el panel muestre un mensaje del dominio en vez del `23514` crudo.
3. **Cron de vencidos los viernes 23:59 (hora argentina):** `vercel.json` + `/api/cron/vencidos`
   protegido con `CRON_SECRET`, que llama a `cancelar_pedidos_vencidos()` con la service role.
   El cron de Vercel corre en UTC: `59 2 * * 6` = viernes 23:59 ART. Se documenta el fallback manual
   por SQL Editor para cuando el plan de Vercel no dispare el job.
4. **`bd:viva` cubre todo el contrato:** columnas de tablas y vista, columnas legacy que sobran, las
   cuatro RPC, las dos tablas retiradas, `detalle_carrito`, los dos buckets y **las diez tablas
   cerradas** (`cliente`, `pedido`, `detalle_del_pedido`, `estados_pedidos`, `estados_comprobante`,
   `comprobante`, `remitos_de_venta`, `alerta_de_estado`, `admin`, `roll`). Para las cerradas exige
   **permiso denegado** (`401`/`403`), no “cero filas”: un `200 []` con RLS apagada es una fuga que
   hoy pasa inadvertida.
5. **Datos de la demo:** seed idempotente con tres productos, stock y una alerta; las fotos se suben
   al bucket `productos` desde el panel y `producto.imagen_url` guarda su URL pública.

No se reescribe la semántica de una migración ya aplicada. Todo lo nuevo va en `06`.

## 3. Contrato de datos

### 3.1 Tablas

Las diez tablas del modelo, con los nombres físicos aprobados:
`cliente`, `producto`, `stock`, `pedido`, `detalle_del_pedido`, `estados_pedidos`, `comprobante`,
`estados_comprobante`, `remitos_de_venta`, `alerta_de_estado`. El detalle de columnas y constraints
está en `supabase/migrations/01` y `docs/MODELO.md` §2. No se agregan columnas fuera de `06`.

### 3.2 Vista pública `vista_catalogo`

`security_invoker = true`, sólo productos `activo`, y estas columnas exactas:

`id_producto`, `nombre`, `categoria`, `tipo`, `descripcion`, `precio`, `tiempo_produccion`,
`imagen_url`, `cantidad_actual`, `cantidad_reservada`, `disponible`, `cantidad_warning`.

`disponible = greatest(cantidad_actual - cantidad_reservada, 0)`. La vista **no** expone `activo`
(filtra por él) ni las columnas legacy `stock_actual`, `stock_warning`, `porcentaje`.

### 3.3 Buckets

| Bucket | Visibilidad | Límite | Tipos | Escritura |
|---|---|---|---|---|
| `comprobantes` | privado | 5 MB | PNG, JPEG, WebP | sólo servidor (service role); lectura por signed URL |
| `productos` | público | 5 MB | PNG, JPEG, WebP | sólo servidor (service role); lectura por URL pública |

`productos` es el nombre del **bucket de Storage**, no la tabla legacy: excepción explícita en
[`GLOSSARY.md`](../../../GLOSSARY.md) y en [`docs/MODELO.md`](../../MODELO.md) §9.

### 3.4 RPC e interfaz pública

| RPC | Firma | Devuelve | Permisos |
|---|---|---|---|
| `crear_pedido` | `(p_id_cliente integer, p_items jsonb)` | `pedido` | sólo `service_role` |
| `aprobar_comprobante` | `(p_id_comprobante integer)` | `remitos_de_venta` | sólo `service_role` |
| `rechazar_comprobante` | `(p_id_comprobante integer)` | `pedido` | sólo `service_role` |
| `cancelar_pedidos_vencidos` | `()` | `integer` | sólo `service_role` |

**No son interfaz pública para `anon`.** La interfaz pública es la lectura de `producto`, `stock` y
`vista_catalogo`. Las RPC se ejecutan desde el servidor (checkout, panel y cron).

### 3.5 Códigos de error del dominio

La base usa `raise exception … using errcode`. El front los traduce a mensajes; nunca muestra el texto
crudo de PostgreSQL.

| Código | Cuándo | Mensaje de dominio |
|---|---|---|
| `ET001` | stock insuficiente o inconsistente | “No hay stock suficiente…” |
| `ET002` | cliente/producto inexistente o inactivo | “El producto ya no está disponible…” |
| `ET003` | pedido sin items, producto repetido o cantidad inválida | “El pedido no tiene productos válidos…” |
| `ET004` | comprobante inexistente o ya resuelto | “Ese comprobante ya no está pendiente…” |
| `ET005` | monto del comprobante ≠ total del pedido | “El monto no coincide…” |
| `ET006` | pedido que no está `Pendiente de Pago` | “El pedido ya no está pendiente…” |
| `ET007` | `cantidad_actual < cantidad_reservada` al editar stock | “No podés dejar la cantidad por debajo de lo reservado…” |
| `23505` | nombre de producto activo duplicado | “Ya hay un producto activo con ese nombre.” |

### 3.6 Matriz RLS (`anon`)

| Tabla | Leer | Escribir |
|---|---|---|
| `producto` | sólo `activo = true` | denegado |
| `stock` | sólo de productos activos | denegado |
| `vista_catalogo` | sí | n/a |
| `cliente`, `pedido`, `detalle_del_pedido`, `estados_pedidos`, `estados_comprobante`, `comprobante`, `remitos_de_venta`, `alerta_de_estado`, `admin`, `roll` | **denegado** (`401`/`403`) | denegado |

`detalle_carrito` **no existe**. `respaldo_legacy` queda cerrado a `anon`/`authenticated` y no se
expone por PostgREST.

## 4. Historias y criterios de aceptación

### HU-1 · Catálogo por la vista

**Como** Cliente, **quiero** ver disponibilidad real **para** no pedir lo que no hay.

- **Given** un producto activo con `cantidad_actual = 10`, `cantidad_reservada = 3`, **When** `anon`
  lee `vista_catalogo`, **Then** recibe una fila con `disponible = 7`, `cantidad_actual = 10`,
  `cantidad_reservada = 3` y `cantidad_warning`.
- **Given** un producto `activo = false`, **Then** no aparece.
- **Given** la vista con la forma vieja (`stock_actual`/`porcentaje`), **Then** `bd:viva` falla y el
  catálogo no se publica como “todo agotado”.
- **Then** `anon` no puede leer `producto.imagen_url` de un producto inactivo.

### HU-2 · Confirmar pedido y reservar

- **Given** disponible 5, **When** `crear_pedido` con 3, **Then** nace el pedido en `Pendiente de Pago`,
  el detalle tiene `subtotal` generado y `cantidad_reservada` pasa a 3.
- **Given** disponible 2, **When** `crear_pedido` con 3, **Then** falla `ET001` y **ninguna** fila cambia.
- **Given** `id_producto` inexistente o inactivo, **Then** falla `ET002`.
- **Given** el mismo producto repetido, **Then** falla `ET003`.
- **Given** dos checkouts concurrentes del mismo producto, **Then** el lock de `stock` serializa y
  nunca se sobre-reserva.

### HU-3 · Aprobar comprobante

- **Given** pedido total 5000 y comprobante 5000, **When** `aprobar_comprobante`, **Then** el pedido
  pasa a `Pago Validado`, `cantidad_actual -= n`, `cantidad_reservada -= n`, nace **un** remito con
  `numero` único y el historial registra ambos estados en la misma transacción.
- **Given** comprobante 5400, **Then** falla `ET005` y no cambia stock.
- **Given** un comprobante ya aprobado, **Then** falla `ET004` (idempotencia).
- **Given** dos aprobaciones concurrentes, **Then** sólo una crea remito (`id_comprobante` UNIQUE).

### HU-4 · Rechazar comprobante

- **Given** un comprobante pendiente, **When** `rechazar_comprobante`, **Then** el pedido pasa a
  `Rechazado`, se libera `cantidad_reservada` y `cantidad_actual` no cambia.
- **Then** el rechazo es **terminal**: el Cliente no puede reenviar un comprobante para ese pedido y
  debe volver a comprar. Se documenta en la UI y en el glosario.
- **Given** un pedido ya rechazado, **When** se intenta aprobar, **Then** `ET004`/`ET006`.

### HU-5 · Vencidos y cron

- **Given** pedidos `Pendiente de Pago`, **When** corre el cron del viernes 23:59 ART, **Then** todos
  pasan a `Cancelado`, se libera la reserva, sus comprobantes pendientes pasan a `Rechazado` y el
  historial lo registra.
- **Given** pedidos `Pago Validado`, **Then** no se tocan.
- **Given** el cron corre dos veces, **Then** es idempotente: no libera dos veces ni cambia estados ya
  finales.
- **Given** falta `CRON_SECRET`, **Then** el endpoint responde `503` explícito; **Given** un secreto
  incorrecto, `401`. No hay ejecución anónima.
- **Then** el cron está versionado en `vercel.json` y el fallback manual (`select
  cancelar_pedidos_vencidos();` en SQL Editor) está documentado.

### HU-6 · Integridad estructural

- `PEDIDO.total = SUM(DETALLE_PEDIDO.subtotal)` siempre; `subtotal` es columna generada.
- Dinero `NUMERIC(12,2)`; `precio > 0` y `monto > 0`.
- Un comprobante pendiente por pedido como máximo; un remito por comprobante.
- `stock.cantidad_reservada <= stock.cantidad_actual` se garantiza por constraint **y** por `ET007`
  con mensaje de dominio.
- No hay FKs recíprocas ni `pedido.id_estado`.

### HU-7 · Seguridad (RLS completa)

- **Given** la anon key, **When** lee `producto` activo, `stock` o `vista_catalogo`, **Then** `200`.
- **Given** la anon key, **When** lee cualquiera de las **diez** tablas cerradas, **Then**
  `401`/`403` (permiso denegado), no `200 []`.
- **Given** la anon key, **When** inserta, actualiza o borra en cualquier tabla, **Then** permiso
  denegado.
- **Given** la anon key, **When** ejecuta cualquiera de las cuatro RPC, **Then** permiso denegado.
- **Then** el bucket `comprobantes` es privado y el `productos` público; ninguno permite escritura
  anónima.

### HU-8 · Respaldo y aplicación

- **Then** `00` detecta el esquema legacy por `detalle_carrito` o `stock.porcentaje` y **aborta con
  error** si detecta legacy sin poder respaldar; no se saltea en silencio.
- **Then** `respaldo_legacy` existe con las tablas y los conteos de filas previos, cerrado a
  `anon`/`authenticated`.
- **Then** las migraciones `00`–`05` se aplican en orden sin error, después `06`, y
  `notify pgrst, 'reload schema'` deja `/rest/v1` al día.
- **Then** el seed se corre después de `01` y deja el catálogo de demo.

### HU-9 · Cierre verificable

- **Then** `npm run bd:viva` queda **verde** y es el criterio de cierre del issue #15.
- **Then** `npm test`, `npm run typecheck` y `npm run lint` quedan verdes.
- **Then** `bd:viva` falla si sobra una columna legacy o si una tabla cerrada responde `200`.

## 5. Seams bajo test

| Seam | Cubre | Deja afuera |
|---|---|---|
| `crear_pedido(integer, jsonb)` | checkout, reserva, total, concurrencia | forma del carrito en el front |
| `aprobar_comprobante(integer)` | venta, stock, remito, historial | envío del email |
| `rechazar_comprobante(integer)` | liberación de reserva | motivo mostrado en UI |
| `cancelar_pedidos_vencidos()` | cron y idempotencia | scheduler real de Vercel |
| `vista_catalogo` + RLS | lectura pública y fuga de datos | seguridad de la service role |
| `bd:viva` | deriva entre repo y `otjph`: vista con sus 12 columnas, columnas legacy, cuatro RPC, tablas retiradas, **diez tablas cerradas con 401/403**, escritura anónima y buckets; sale distinto de cero y resume los desajustes | cuerpos de funciones, datos fila por fila y columnas de las tablas cerradas (no verificables con la anon key) |
| Migración `06` | `precio > 0`, `ET007`, `23505` | estilos del panel |

No se testean internals (nombres de triggers, OIDs ni planes). El cron se prueba con el módulo puro de
autorización y con un puerto falso; el scheduler de Vercel se verifica a mano una vez.

## 6. Fuera de alcance

- Envío, seguimiento, estados post-venta.
- Carrito persistente, cuentas de Cliente, `ADMIN`/`ROL` (fase 2).
- Validación por IA.
- Reenvío de comprobante después de un rechazo (decisión: terminal).
- RLS por perfil y administradores en base.
- Datos reales de la Cooperadora (`NEXT_PUBLIC_TRANSFERENCIA_*`).
- Migración a Supabase CLI o `supabase db reset`; la aplicación es por SQL Editor documentado.

## 7. Decisiones tomadas (2026-10-27)

1. **Aplicación:** Juanma corre las migraciones en `otjph` con revisión de Isabella; el DDL sigue
   siendo de ella y el cierre se firma con `bd:viva` verde.
2. **Cron literal:** todos los pedidos `Pendiente de Pago`, viernes 23:59 ART, sin corte por
   antigüedad. Un pedido creado el viernes a la noche se cancela esa misma noche; se documenta.
3. **Rechazo terminal:** no se reabre el pedido; el Cliente vuelve a comprar.
4. **Bucket `productos`:** se conserva el nombre con excepción explícita en glosario y modelo.
5. **Endurecer la base:** `precio > 0` y `ET007` en la migración `06`.
6. **Vista, buckets y RLS completa** entran al contrato y a `bd:viva`; dejan de ser notas al pie.
7. **El respaldo es obligatorio y verificable:** sin `respaldo_legacy` con conteos, no se corre `01`.
8. **`bd:viva` exige permiso denegado** para las tablas cerradas; “cero filas” no es prueba de RLS.

## 8. Blockers

1. **Acceso al SQL Editor de `otjph`** para aplicar el respaldo y las migraciones (Juanma/Isabella).
2. **`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y
   `CRON_SECRET`** en `.env.local` y Vercel (Enzo). Sin la service role no hay checkout, panel ni cron.
3. **Plan de Vercel** que permita el cron semanal; si no, se usa el fallback manual documentado.

## 9. Notas adicionales

### 9.1 Los 13 desajustes medidos (2026-10-27)

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

En verde: `estados_pedidos` y `remitos_de_venta` completas, ausencia de `productos`, `pedidos` y
`verificaciones`, las tres RPC restantes y la RLS de lectura/escritura de las seis tablas que
`bd:viva` ya miraba.

Con el `bd:viva` ampliado de B2, la medición del 27-10 sube a **26 desajustes**: además de los de
la tabla, detecta la lectura anónima abierta de las diez tablas, `detalle_del_pedido.id_detalle`,
`detalle_carrito` y que la anon key **puede ejecutar** tres RPC (ver §9.2).

### 9.2 Fugas y formas legacy que la spec anterior no cubría

| Superficie | Medición | Esperado |
|---|---|---|
| `admin` | `GET` anónimo `200 []` | `401`/`403` |
| `roll` | `GET` anónimo `200 []` | `401`/`403` |
| `estados_pedidos` | `GET` anónimo `200 []` | `401`/`403` |
| `estados_comprobante` | `GET` anónimo `200 []` | `401`/`403` |
| `detalle_carrito` | `GET` anónimo `200 []` | no existe |
| `detalle_del_pedido` | columna legacy `id_detalle` visible | sin `id_detalle` |
| RPC `aprobar_comprobante`, `rechazar_comprobante`, `cancelar_pedidos_vencidos` | la anon key las ejecuta (`204` / `25006`) | `401`/`403` |
| `stock` | columna legacy `porcentaje` | sin `porcentaje` |
| `vista_catalogo` | forma vieja (`stock_actual`, `porcentaje`, `activo`) | contrato §3.2 |
| `respaldo_legacy` | no existe (`404`) | existe y cerrado |

La escritura anónima ya está denegada (`401`) en esas cuatro tablas; la fuga es de **lectura**. Con las
tablas vacías no hay dato personal expuesto hoy, pero la superficie queda abierta y `bd:viva` no la
veía.

### 9.3 Runbook de aplicación

1. Respaldar a mano (o corregir `00` y correrlo) y **anotar los conteos** de `producto`, `stock`,
   `cliente`, `pedido`, `detalle_del_pedido`, `comprobante`, `estados_*`, `remitos_de_venta`,
   `alerta_de_estado`, `admin`, `roll`, `detalle_carrito`.
2. Verificar que `respaldo_legacy` tenga las tablas y los mismos conteos.
3. Correr `00`, `01`, `02`, `03`, `04`, `05` en orden, cada uno en su ventana del SQL Editor.
4. Correr `06` después de `05` (es re-ejecutable: si la ventana falla, se puede repetir).
5. `notify pgrst, 'reload schema';`
6. Correr `supabase/seed.sql`. Deja tres productos de demo con stock y uno por debajo del umbral;
   `imagen_url` queda en `NULL` a propósito y las fotos se suben desde `/admin` al bucket `productos`
   (nunca rutas locales como `/productos/*.jpg`).
7. `npm run bd:viva` → verde.
8. Probar en el navegador: catálogo, checkout, panel y cron manual.

**Fallback manual del cron** (si el plan de Vercel no dispara el job, o antes de tener el
`CRON_SECRET` cargado): desde el SQL Editor de Supabase, con un usuario administrador, correr

```sql
select cancelar_pedidos_vencidos();
```

Devuelve la cantidad de pedidos cancelados. Es idempotente: correrlo dos veces no libera la reserva
dos veces ni toca los pedidos `Pago Validado` (HU-5).

**Nunca** correr `01` sin el paso 2: destruye las filas actuales sin red.

### 9.4 Tickets del cierre beta

| Ticket | Qué cierra | Bloqueado por |
|---|---|---|
| [#16 · B1](https://github.com/juanmamerodio/esenciatecnica/issues/16) | respaldo y migraciones `00`–`05` aplicadas | — |
| [#17 · B3](https://github.com/juanmamerodio/esenciatecnica/issues/17) | migración `06`, `ET007`, `precio > 0` y mensajes del panel | — |
| [#18 · B4](https://github.com/juanmamerodio/esenciatecnica/issues/18) | cron de vencidos los viernes | — |
| [#19 · A1](https://github.com/juanmamerodio/esenciatecnica/issues/19) | el panel avisa si el remito no salió | — |
| [#20 · O1](https://github.com/juanmamerodio/esenciatecnica/issues/20) | secretos y entorno de producción | — |
| [#21 · B2](https://github.com/juanmamerodio/esenciatecnica/issues/21) | `bd:viva` cubre toda la superficie pública | #16, #17 |
| [#22 · B5](https://github.com/juanmamerodio/esenciatecnica/issues/22) | semilla y fotos de la beta | #16, #17 |
| [#23 · B6](https://github.com/juanmamerodio/esenciatecnica/issues/23) | verificación de punta a punta | #16, #17, #18, #19, #20, #22 |

El **camino crítico** es B1: sin el esquema aplicado no hay demo. B3, B4, A1 y O1 arrancan en paralelo
hoy; B2, B5 y B6 esperan el esquema.
