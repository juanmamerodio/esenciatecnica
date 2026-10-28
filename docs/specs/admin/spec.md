# Spec · Panel `/admin` (`T7`)

> **Feature:** `front-mvp/admin` · **Estado:** implementada en repo · **Fecha:** 2026-10-27 (revisado el 2026-10-27).
> **Verificación en vivo:** pendiente (depende del issue #16 y de las claves del issue #20).
> **Origen:** gate de arranque del issue [#13](https://github.com/juanmamerodio/esenciatecnica/issues/13);
> `docs/specs/front-mvp/spec.md` §4 (tajada T7) no fijaba criterios propios y este documento los fija.
> **Cierre beta:** esta versión agrega los criterios que faltaban para que el panel explique los
> rechazos de la base (`ET007`, nombre duplicado) y no oculte un remito que no salió por email.
> **Depende de:** `T5 · Checkout + comprobante` ([#10](https://github.com/juanmamerodio/esenciatecnica/issues/10)),
> que dejó los pedidos con su reserva y el comprobante en el bucket privado, y de la migración `02`, que ya
> expone los RPC `aprobar_comprobante` y `rechazar_comprobante` con sus códigos de error `ET001`/`ET004`/
> `ET005`/`ET006`.
> **Fuente de verdad:** [`GLOSSARY.md`](../../../GLOSSARY.md) (*Administrador*, *Alerta de stock*, *Validación
> manual*, *Stock*), [`docs/MODELO.md`](../../MODELO.md) §3 y §4, [`AGENTS.md`](../../../AGENTS.md) §5.3,
> §5.7, §5.9, §5.10 y §5.12.

---

## 1. Problema

El panel no existe: `src/app/admin/page.tsx` es el **aviso de migración** que dejó T5, porque la pantalla
anterior leía la tabla legacy `pedidos` y `fetch('/api/orders')`, que ya no existen. Hoy no hay forma de
validar un comprobante, editar stock, ver una alerta ni subir la foto de un producto: el MVP no puede salir
de `Pendiente de Pago` y la tienda no tiene con qué llenar `producto.imagen_url`.

Al mismo tiempo queda deuda legacy que sólo tiene sentido retirar acá: `src/lib/supabase.ts` (cliente del
esquema viejo `pedidos`) y `src/app/api/sync-sheets/route.ts`, su único consumidor, que además autentica con
un `Bearer` armado con la service role. Cada tajada que los deja vivos obliga a un agente nuevo a preguntarse
cuál de los dos esquemas manda.

Y falta la pieza de infraestructura que el issue pide explícito: subir fotos de producto desde el panel. La
migración `04` sólo crea el bucket **privado** `comprobantes`; no hay bucket donde dejar una foto que la
tienda pueda mostrar.

## 2. Solución

1. **Entrada con Basic Auth** (`AGENTS.md` §5.9): `src/middleware.ts` (Edge) protege **sólo** `/admin/:path*`
   y `/api/admin/:path*` y delega la decisión en un módulo puro, `src/lib/admin-auth.ts`
   (`revisarBasicAuth(header, password)`), que se testea sin red. Si falta `ADMIN_PASSWORD`, el borde responde
   **503 explícito** en vez de un 401 mudo que haría creer que la contraseña es la equivocada. El middleware
   **no** negocia idioma: T0 retiró i18n y T7 lo reintroduce únicamente para autenticar.
2. **Un módulo profundo** `src/lib/admin.ts` con **una** función pública, `crearPanel(puerto)`, que devuelve un
   objeto cohesivo con métodos tipados y resultado que distingue `ok`/`error` (mismo criterio que
   `src/lib/catalogo.ts`). Valida el borde con Zod adentro y traduce los códigos del dominio
   (`ET001`, `ET004`, `ET005`, `ET006`) a mensajes, con el patrón de `src/lib/checkout.ts`.
3. **El adaptador** `src/lib/admin-servidor.ts` (server-side, `SUPABASE_SERVICE_ROLE_KEY` +
   `src/lib/database.types.ts`) lee `pedido` + `cliente` + `comprobante` + `detalle_del_pedido` +
   `remitos_de_venta`, `stock` + `producto` y `alerta_de_estado`. Las decisiones llaman a los **RPC**
   `aprobar_comprobante` / `rechazar_comprobante`: la regla vive en la base y el front no la reimplementa
   (`AGENTS.md` §5.10). El comprobante se ve con `createSignedUrl` del bucket privado `comprobantes`; la
   columna guarda la **clave**, no una URL pública.
4. **Fotos de producto:** migración `20261023090500_05_storage_productos.sql` que crea el bucket **público**
   `productos` (PNG/JPEG/WebP, 5 MB). `producto.imagen_url` guarda la URL pública del objeto. El nombre
   del bucket es una **excepción explícita** al término legacy `productos` (tabla): ver
   [`GLOSSARY.md`](../../../GLOSSARY.md) y [`docs/MODELO.md`](../../MODELO.md) §9.
5. **Bordes HTTP server-side** en `src/app/api/admin/`: `comprobantes`, `stock`, `productos`,
   `productos/foto` y `alertas`. Nunca devuelven la clave del bucket, la service role, `ADMIN_PASSWORD` ni
   datos de otros Clientes.
6. **Panel `/admin`**: Server Component que lee con el módulo y componentes cliente para las acciones, en
   español único, mobile y accesible. Reemplaza el aviso de migración de T5.
7. **Se retira la deuda legacy**: `src/lib/supabase.ts` y `src/app/api/sync-sheets/`. `/api/products` **no**
   se toca: es el catálogo canónico en JSON que dejó T1.

## 3. Historias y criterios de aceptación

### HU-1 · Entrada con Basic Auth

**Como** Administrador de Química, **quiero** entrar al panel con una sola contraseña **para** validar pagos
sin cuentas de usuario, que son fase 2.

- **Then** `/admin` y `/api/admin/*` exigen Basic Auth con `ADMIN_PASSWORD`; ninguna otra ruta del sitio
  cambia (`/`, `/catalog`, `/cart`, `/checkout` y `/api/checkout` siguen abiertas).
- **Given** un encabezado `Authorization` ausente, **Then** la respuesta es `401` con
  `WWW-Authenticate: Basic`, y el navegador pide las credenciales.
- **Given** una contraseña incorrecta o un encabezado mal formado, **Then** `401` y **ningún** dato del panel
  viaja en el cuerpo de la respuesta.
- **Given** que falta `ADMIN_PASSWORD`, **Then** la respuesta es **`503`** con un mensaje que dice que el
  panel no está configurado: un `401` haría creer que la contraseña es la equivocada (`AGENTS.md` §7.10).
- **Then** `ADMIN_PASSWORD` y `SUPABASE_SERVICE_ROLE_KEY` viven **sólo** en el servidor: ningún archivo
  `"use client"` las lee ni importa el adaptador (`AGENTS.md` §7.8).
- **Then** el middleware **no** contiene negociación de idioma (`locale`, `i18n`, `negotiator`,
  `accept-language`, `dictionaries`): su única responsabilidad es autenticar.

### HU-2 · Los pedidos con su estado actual

**Como** Administrador, **quiero** ver los pedidos con su estado actual y su comprobante **para** decidir cuál
validar.

- **Then** la lista muestra, por pedido: número, fecha, Cliente (nombre y email), líneas con cantidad × precio
  unitario = subtotal, total, **estado actual** y el comprobante con su monto y su estado.
- **Then** el estado que se lee es la columna `estado_actual`; las tablas de historial son la auditoría y no
  se consultan para pintar la fila (`AGENTS.md` §5.10).
- **Then** la imagen del comprobante se abre con una **signed URL** generada en el servidor (bucket privado
  `comprobantes`), con vencimiento corto; nunca se publica la clave ni el bucket.
- **Given** un comprobante que no se puede firmar, **Then** la fila queda sin link y la lista se muestra
  igual: un fallo de Storage no oculta un pedido.
- **Given** filas que no cumplen el contrato del modelo, **Then** la sección muestra un error explícito en
  lugar de una lista incompleta: el panel no puede perder de vista un pedido.

### HU-3 · Aprobar el comprobante

**Como** Administrador, **quiero** aprobar el comprobante comparando imagen y monto **para** convertir la
reserva en venta.

- **Given** un pedido `Pendiente de Pago` cuyo comprobante coincide con el total, **When** apruebo, **Then**
  la llamada va al RPC `aprobar_comprobante` (no a un `update` armado en el front), el pedido pasa a
  `Pago Validado`, baja `cantidad_actual` y `cantidad_reservada`, y el historial registra ambos estados en la
  misma transacción.
- **Then** la respuesta del borde trae el **`numero`** y el **`total`** del remito que emitió la base, y el
  panel los muestra en la fila aprobada.
- **Then** antes de aprobar, el panel pide **confirmación mostrando el monto** del comprobante y el total del
  pedido: la validación es manual y de una persona (`GLOSSARY.md`, *Validación manual*).
- **Then** el front no descuenta stock, no cambia estados y no numera remitos: una sola fuente
  (`AGENTS.md` §5.10).

### HU-4 · Rechazar el comprobante

**Como** Administrador, **quiero** rechazar un comprobante que no corresponde **para** liberar la reserva.

- **Given** un comprobante pendiente, **When** rechazo, **Then** la llamada va al RPC
  `rechazar_comprobante`, el pedido pasa a `Rechazado`, se libera `cantidad_reservada` y **no** cambia
  `cantidad_actual`.
- **Given** un pedido ya rechazado, **When** intento aprobarlo, **Then** la base responde `ET004`/`ET006` y el
  panel muestra el mensaje del dominio; el stock no cambia.
- **Given** un comprobante ya resuelto por otro Administrador, **Then** el error llega como mensaje, no como
  una excepción cruda de PostgreSQL.

### HU-5 · Monto que no coincide

**Como** Administrador, **quiero** que el sistema me frene si el monto no coincide **para** no aprobar un pago
equivocado.

- **Given** un comprobante de 5400 sobre un pedido de 5000, **When** apruebo, **Then** veo el mensaje del
  dominio de monto que no coincide (`ET005`), el pedido sigue `Pendiente de Pago` y **ninguna** fila de stock
  cambia.
- **Then** la regla la aplica la base; el panel sólo muestra el mensaje.

### HU-6 · Stock editable

**Como** Administrador, **quiero** corregir la cantidad y el umbral **para** que el catálogo y las alertas
reflejen la realidad.

- **Then** cada fila de stock muestra cantidad actual, reservada, disponible y umbral, y permite editar
  `cantidad_actual` y `cantidad_warning`.
- **Given** una cantidad o un umbral negativo o no entero, **Then** el módulo lo rechaza **antes** de llamar a
  la base y el mensaje se asocia al campo.
- **Then** la edición devuelve el stock actualizado (con su disponible recalculado) y el panel lo refleja.
- **Then** el umbral `0` significa “sin umbral configurado”, como en la base: no dispara alerta.

### HU-7 · La alerta de stock vive en el panel

**Como** Administrador, **quiero** ver el aviso de stock bajo **para** reponer a tiempo.

- **Then** las alertas sin atender se muestran como **popup/aviso dentro del panel** (`role="alert"`), con el
  producto y el mensaje que guardó la base; **no** se envía ningún email al Administrador
  (`AGENTS.md` §5.7).
- **Given** una alerta, **When** la atiendo, **Then** queda `atendida = true` y deja de aparecer en el popup;
  la fila se conserva (es auditoría) y se puede seguir consultando.
- **Then** la alerta la genera la base cuando el disponible toca el umbral; el panel no la calcula ni la
  inventa.

### HU-8 · Productos: alta, edición, baja lógica y foto

**Como** Administrador, **quiero** mantener el catálogo y subir las fotos reales **para** publicar los
productos de la tienda.

- **Then** puedo **crear** un producto con nombre, categoría, tipo, descripción, precio y tiempo de
  producción; la fila de stock la crea la base con su trigger.
- **Then** puedo **editar** esos campos, y la **baja es lógica**: `activo = false`. Ningún camino del panel
  borra un producto con historial (`AGENTS.md` §5.12).
- **Given** un producto sin nombre o sin precio mayor que cero, **Then** el módulo lo rechaza antes de llamar a
  la base.
- **Then** puedo **subir una foto** PNG, JPEG o WebP de hasta 5 MB; el objeto queda en el bucket público
  `productos` bajo una clave saneada (sin `..` ni rutas) y `producto.imagen_url` guarda su URL pública.
- **Given** un archivo de otro tipo o más grande que 5 MB, **Then** se rechaza antes de subir nada y el
  mensaje dice el límite.

### HU-9 · Borde HTTP

- **Then** existe una ruta server-side por operación: `POST /api/admin/comprobantes`,
  `PATCH /api/admin/stock`, `POST|PATCH /api/admin/productos`, `POST /api/admin/productos/foto` y
  `PATCH /api/admin/alertas`.
- **Then** la entrada se valida con Zod y un dato inválido responde `400` con el detalle del campo.
- **Given** un conflicto del dominio, **Then** el estado HTTP lo distingue: `409` para comprobante o pedido
  que ya no está pendiente y para stock insuficiente, `422` para el monto que no coincide y `503` para falta
  de configuración. El mensaje que se muestra es el del dominio.
- **Then** ninguna respuesta incluye la clave del bucket, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, el
  DNI de un Cliente ni un listado de comprobantes de otros pedidos.

### HU-10 · Se retira la deuda legacy

- **Then** `src/lib/supabase.ts` (esquema legacy `pedidos`) y `src/app/api/sync-sheets/` **no existen**, y
  ninguna fuente del repo los importa (`AGENTS.md` §7.5).
- **Then** `/api/products` **se conserva**: es el catálogo canónico en JSON de T1, no deuda legacy.
- **Then** `/admin` deja de ser un aviso de migración: lee el contrato canónico con el módulo.

### HU-11 · Mobile y accesibilidad

- **Then** el panel se usa en el celular sin desbordes horizontales ni zoom, con una columna y tablas
  desplazables cuando hacen falta.
- **Then** foco visible, contraste AA, `aria-label` en los controles con ícono, `role="alert"` en errores y
  avisos, y las confirmaciones se anuncian (no depende sólo del color).
- **Then** la UI y los mensajes están en español: no hay vocabulario legacy (`pre_aprobado`,
  `comprobante_subido`, `precio_ars`, `nombre_es`, `verificación por IA`, `Gemini`).

### HU-12 · El panel explica los rechazos de la base

**Como** Administrador, **quiero** que un rechazo de la base se entienda **para** corregir el dato sin
adivinar.

- **Given** intento dejar `cantidad_actual` por debajo de `cantidad_reservada`, **When** guardo,
  **Then** la base responde `ET007`, el panel muestra “No podés dejar la cantidad por debajo de lo
  reservado…” asociado al campo, y el stock no cambia. Nunca se muestra el `23514` crudo.
- **Given** un producto activo con un nombre que ya existe, **When** creo o edito, **Then** la base
  responde `23505` y el panel muestra “Ya hay un producto activo con ese nombre.” sin crear ni
  modificar nada.
- **Given** cualquier otro error de la base, **Then** el panel muestra un mensaje explícito y no deja
  la acción como si hubiera salido bien.
- **Then** el mapeo vive en `src/lib/admin.ts` (módulo puro) y se testea con un puerto falso, sin red.

### HU-13 · El remito que no salió se ve

**Como** Administrador, **quiero** enterarme si el email del remito no salió **para** reenviarlo.

- **Given** que apruebo un comprobante y Resend falla, **When** la ruta responde
  `{ estado: "ok", aviso }`, **Then** el panel muestra ese aviso (`role="alert"`) y ofrece
  **Reenviar el remito**; no dice “el Cliente lo recibió”.
- **Given** el reenvío manual falla, **Then** el mensaje dice que el remito existe pero el email no
  salió, y el botón sigue disponible.
- **Given** el reenvío sale bien, **Then** el aviso dice que se reenvió al Cliente.
- **Then** un fallo de correo **no** revierte la venta ni duplica el remito: la base ya cerró la
  transacción (`specs/remito/spec.md` §2.4).

## 4. Seams bajo test

| Seam | Cubre | Deja afuera |
|---|---|---|
| `src/lib/admin.ts` con un `PuertoAdmin` falso (sin DOM, sin red) | validación del borde antes de llamar al puerto, decisión por RPC y no reimplementada, `ET001`/`ET004`/`ET005`/`ET006`/`ET007` como mensajes del dominio, `23505` de nombre duplicado, stock que no cambia en `ET005`, disponible y alerta recalculados, orden de las alertas, baja lógica, saneo de la clave de la foto, firma de la URL del comprobante | Supabase, Storage, render |
| `src/components/admin/comun.ts` + `PanelDePedidos.tsx` | el `aviso` de remito no se descarta: se muestra y no se confunde con éxito | el envío real de Resend |
| `src/lib/admin-auth.ts` (módulo puro) | sin credenciales, encabezado mal formado, contraseña incorrecta, correcta y `sin-configurar` | el runtime Edge del middleware |
| `tests/db/aprobacion.test.ts` (ya existe) | aprobar/rechazar contra PGlite: reserva, venta, remito y el monto que no coincide | el borde HTTP y el panel |
| Estructura de los archivos | el matcher del middleware cubre sólo `/admin` y `/api/admin` y no negocia idioma, secretos sólo del lado servidor, RPC presentes en el adaptador, `delete` ausente, legacy retirado | automatización de UI |
| Verificación en navegador de `/admin` | Basic Auth, popup de alerta, confirmación del monto, edición de stock y subida de foto | automatización de UI |

No se agregan dependencias: sin jsdom ni Testing Library (`AGENTS.md` §4 y §8). El middleware se verifica a
mano una vez en el navegador; la lógica que decide está en el módulo puro y se testea sin red.

## 5. Fuera de alcance

- **El email del remito**: **T8** ([#14](https://github.com/juanmamerodio/esenciatecnica/issues/14)). Acá el
  remito se muestra con el número que emitió la base y, desde HU-13, el panel **avisa** si el correo no
  salió; el envío en sí no se reimplementa.
- **Administradores en base** (`ADMIN`/`ROL`), roles y permisos por perfil: fase 2 (`AGENTS.md` §5.9).
- **Reimplementar la regla en el front**: reservas, descuentos de stock, estados y numeración del remito son
  de la base.
- **Ver el comprobante sin autenticación**: el bucket es privado y la URL firmada vence.
- **RLS y políticas**: las revisa Isabella Infante ([`HANDOFF-ISABELLA.md`](../../entrega/HANDOFF-ISABELLA.md)); las
  migraciones `05` y `06` entran en el handoff para su revisión.
- **Búsqueda, filtros y paginación del panel**: el MVP tiene un solo Administrador y un catálogo chico.
- **Envío, seguimiento y estados posteriores a `Pago Validado`**: fuera del MVP (`AGENTS.md` §5.5).
- **Reabrir un pedido rechazado**: el rechazo es terminal (spec `bd-mvp` §7, decisión 3); el Cliente vuelve a comprar.
- **Ejecutar el cron desde el panel**: el viernes lo dispara Vercel; el fallback es SQL Editor (spec `bd-mvp`
  HU-5).

## 6. Decisiones tomadas

1. **Basic Auth en `src/middleware.ts`, con la decisión en un módulo puro.** El middleware resuelve el
   encabezado pero no decide: `revisarBasicAuth` es testeable sin red. El matcher cubre **sólo** `/admin` y
   `/api/admin`; el resto del sitio no cambia. Detalle en
   [`adr/0005-basic-auth-en-middleware.md`](../../adr/0005-basic-auth-en-middleware.md).
2. **Sin `ADMIN_PASSWORD` se responde `503`, no `401`.** Un 401 mudo mandaría al Administrador a buscar una
   contraseña que no existe: el problema es de configuración del entorno (`AGENTS.md` §7.10).
3. **El nombre de usuario del Basic Auth se ignora.** El MVP no tiene Administradores en base; la contraseña
   compartida es el único secreto y `ADMIN`/`ROL` quedan para fase 2.
4. **Aprobar y rechazar llaman a los RPC.** El front no reimplementa la regla ni toca el stock: la base
   garantiza reserva, venta, remito e historial en la misma transacción (`AGENTS.md` §5.10).
5. **`producto.imagen_url` guarda la URL pública del bucket `productos`; el comprobante sigue privado.** La
   foto es contenido público de la tienda y no tiene dato sensible; el comprobante tiene el monto y la imagen
   de una transferencia de un Cliente, así que sigue con signed URL y clave guardada (decisión de T5,
   spec `checkout` §6.2).
6. **Validación estricta al leer el panel.** A diferencia del catálogo —donde una fila inválida se descarta y
   el producto no se publica—, acá una fila que no cumple el contrato detiene la sección con un error
   explícito: mostrar una lista incompleta podría hacer que un Administrador no vea un pedido a validar.
7. **La baja de producto es lógica** (`activo = false`); no hay `delete` en ningún camino del panel.
8. **La alerta es un aviso del panel, no un email** (`AGENTS.md` §5.7). Atenderla sólo marca `atendida`; la
   fila se conserva como auditoría.
9. **Se retira la deuda legacy en esta tajada**: `src/lib/supabase.ts` y `src/app/api/sync-sheets/`. Dejarlos
   vivos era la contradicción de dos esquemas que la auditoría marcó (`docs/estado/AUDITORIA.md` §6) y su único
   consumidor era esa ruta. `/api/products` no se toca.
10. **La confirmación del monto es en pantalla, no un `confirm()` del navegador**: muestra el monto del
    comprobante y el total del pedido, se anuncia con `role="alert"` y se puede cancelar.
11. **El rechazo de la base se traduce, no se muestra crudo.** `ET007` (stock por debajo de la reserva)
    y `23505` (nombre activo duplicado) tienen mensaje propio y campo asociado; el mapeo vive en el
    módulo puro (`HU-12`).
12. **Un remito sin email no es un éxito.** La ruta devuelve `aviso` y el panel lo muestra; el reenvío
    manual sigue disponible (`HU-13`). La venta no se revierte.
13. **`productos` es el bucket, no la tabla legacy.** Se conserva el nombre con excepción explícita en
    `GLOSSARY.md` y `docs/MODELO.md` §9; renombrarlo no aporta al MVP y toca migración, adaptador y tests.

## 7. Blockers declarados

1. **Migraciones `05` y `06` aplicadas en `otjph…`** (Juanma aplica, Isabella revisa). Sin el bucket
   `productos`, subir una foto falla; sin `06`, el panel no puede recibir `ET007` ni la restricción de
   precio. El DDL está en [`HANDOFF-ISABELLA.md`](../../entrega/HANDOFF-ISABELLA.md) y **no** se aplica a
   producción desde acá.
2. **`SUPABASE_SERVICE_ROLE_KEY` y `ADMIN_PASSWORD`** en `.env.local` y en Vercel (Enzo, tarea *Secretos y
   entorno*): sin la primera el panel no puede leer ni escribir; sin la segunda responde `503`.
3. **Esta spec** aprobada y linkeada en [#13](https://github.com/juanmamerodio/esenciatecnica/issues/13).

**Gate de despliegue, no de desarrollo:** sin las migraciones aplicadas en el proyecto de producción y sin
los secretos, no hay demo en producción; en desarrollo se usa `supabase/seed.sql`. No se maquilla con datos de
muestra ni se leen tablas legacy.

El módulo puro y sus tests **no** dependen de 1 ni 2: se puede implementar y dejar en verde con el puerto
falso mientras se cierran los blockers.

---

## 8. Estado de implementación (auditoría del 2026-10-27)

Auditoría de cada historia contra el código del repo y sus tests. El panel está codificado, pero la
verificación en vivo no está hecha: la base `otjph…` está a medio migrar y faltan `SUPABASE_SERVICE_ROLE_KEY`
y `ADMIN_PASSWORD`. Por eso casi todo queda “implementado, sin verificar en vivo”, que no es lo mismo que
“verificado”.

| Criterio / HU | Estado | Evidencia |
|---|---|---|
| HU-1 · Entrada con Basic Auth | implementado, sin verificar en vivo | `src/middleware.ts:19-21` (matcher sólo `/admin` y `/api/admin`), `src/middleware.ts:36-52` (`503` sin `ADMIN_PASSWORD`, `401` con `WWW-Authenticate`), `src/lib/admin-auth.ts:26-45`; tests `sin encabezado no hay credenciales`, `sin ADMIN_PASSWORD el panel no está configurado…`, `los secretos y el adaptador no aparecen en ningún archivo "use client"`. La entrada real en el navegador depende de `ADMIN_PASSWORD` (#20). |
| HU-2 · Los pedidos con su estado actual | implementado, sin verificar en vivo | `src/lib/admin-servidor.ts:42-131` (lee `estado_actual` y firma con `createSignedUrl`), `src/lib/admin.ts:389-410`; `src/components/admin/PanelDePedidos.tsx:138-242`; tests `pedidos() devuelve el estado actual…`, `un comprobante que no se puede firmar no oculta el pedido`, `una fila que no cumple el contrato…`. |
| HU-3 · Aprobar el comprobante | implementado, sin verificar en vivo | `src/lib/admin-servidor.ts:208-214` (RPC `aprobar_comprobante`), `src/lib/admin.ts:418-427`; `src/components/admin/PanelDePedidos.tsx:244-249` y `:283-304` (confirmación con el monto); tests `aprobar va al RPC…` y `…confirman mostrando el monto`. La transacción de stock y remito vive en la base (`tests/db/aprobacion.test.ts`) y no está aplicada en `otjph` (#16). |
| HU-4 · Rechazar el comprobante | implementado, sin verificar en vivo | `src/lib/admin-servidor.ts:216-222` (RPC `rechazar_comprobante`), `src/lib/admin.ts:430-440`; tests `rechazar va al RPC…` y `traduce ET001, ET004 y ET006…`. |
| HU-5 · Monto que no coincide | implementado, sin verificar en vivo | `src/lib/admin.ts:804-810` (`ET005` a mensaje del dominio), `src/lib/admin-http.ts:19` (`422`); test `un monto que no coincide llega como mensaje del dominio…`. |
| HU-6 · Stock editable | implementado, sin verificar en vivo | `src/lib/admin.ts:244-256` y `:474-503`; `src/components/admin/PanelDeStock.tsx:86-185`; tests `rechaza una cantidad de stock o un umbral negativos`, `editarStock devuelve el stock actualizado…`, `stock() calcula el disponible…`. |
| HU-7 · La alerta de stock vive en el panel | implementado, sin verificar en vivo | `src/components/admin/AvisoDeAlertas.tsx:44-48` (`role="alert"`), `:22-23` (las atendidas no se muestran); `src/app/admin/page.tsx:52-56`; tests `alertas() muestra primero las pendientes…` y `…la alerta de stock es un aviso del panel, nunca un email al Administrador`. |
| HU-8 · Productos: alta, edición, baja y foto | implementado, sin verificar en vivo | `src/lib/admin.ts:548-619` y `:646-681`; `src/lib/admin-servidor.ts:239-306`; `src/components/admin/PanelDeProductos.tsx`; tests `rechaza un producto sin nombre…`, `la baja es lógica…`, `sanea el nombre…`, `rechaza una foto de otro tipo…`. Sin el bucket `productos` (migración `05`, #16) la subida no corre en vivo. |
| HU-9 · Borde HTTP | implementado, sin verificar en vivo | `src/app/api/admin/{comprobantes,stock,productos,productos/foto,alertas}/route.ts`; `src/lib/admin-http.ts:13-24` (409/422/503) y `:39-44` (400 con campo); test `existe una ruta server-side por operación…`. Nota: §4 habla de “cinco” rutas y hoy hay una sexta, `src/app/api/admin/remito/route.ts`, del reenvío de T8. |
| HU-10 · Se retira la deuda legacy | implementado | Tests `la deuda legacy del esquema viejo se retiró del repo` (no existen `src/lib/supabase.ts` ni `src/app/api/sync-sheets/`; `/api/products` se conserva) y `/admin deja de ser el aviso de migración…`. |
| HU-11 · Mobile y accesibilidad | implementado, sin verificar en vivo | `src/app/globals.css:53-55` (foco visible), `src/components/admin/PanelDeStock.tsx:86` y `PanelDePedidos.tsx:160` (`overflow-x-auto`), `aria-label` y `role="alert"` en los componentes; el uso en celular y el contraste AA se verifican en navegador (#23). |
| HU-12 · El panel explica los rechazos de la base | implementado | `src/lib/admin.ts:817-850` (`ET007`, `23505`, `23514`); test `traduce ET007, 23505 y 23514 a mensajes del dominio (issue #17)`. |
| HU-13 · El remito que no salió se ve | implementado, sin verificar en vivo | `src/app/api/admin/comprobantes/route.ts:40-46`, `src/components/admin/comun.ts:51`, `src/components/admin/PanelDePedidos.tsx:80-86` y `:117-121`; `tests/front/aviso-remito.test.ts`. El envío real depende de `RESEND_API_KEY` (#20). |
| Verificación de punta a punta del panel | pendiente | Ninguna corrida contra la base viva: falta el esquema migrado y las claves (#16, #20, #23). |

### Pendiente

- Aplicar las migraciones `00`–`05` (#16) y `06` (#17) en `otjph…`: sin eso no hay bucket `productos`, ni `ET007`, ni RPC en vivo; `npm run bd:viva` sigue rojo (#21).
- `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` y `RESEND_API_KEY` en `.env.local` y Vercel (#20): sin la primera el panel responde `503`; sin la segunda, el middleware responde `503`.
- Semilla y fotos de la beta (#22) y verificación en navegador del panel —Basic Auth, popup de alerta, confirmación del monto, edición de stock, subida de foto y reenvío del remito— antes de la punta a punta (#23).
- Nada de esto bloquea los seams: `src/lib/admin.ts`, `src/lib/admin-auth.ts` y `src/components/admin/comun.ts` corren con puerto falso, sin red.
