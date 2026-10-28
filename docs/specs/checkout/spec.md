# Spec · Checkout y comprobante (`T5`)

> **Feature:** `front-mvp/checkout` · **Estado:** implementada en repo · **Fecha:** 2026-10-25, revisado el 2026-10-27.
> **Verificación en vivo:** pendiente (depende del issue #16 y de las claves del issue #20).
> **Origen:** gate de arranque del issue [#10](https://github.com/juanmamerodio/esenciatecnica/issues/10);
> `docs/specs/front-mvp/spec.md` §4 (tajada T5) no fijaba criterios propios y este documento los fija.
> **Depende de:** `T4 · Carrito` ([#9](https://github.com/juanmamerodio/esenciatecnica/issues/9)), que dejó el
> módulo puro del carrito, y de la spec [`bd-mvp`](../bd-mvp/spec.md), que dejó el contrato de datos
> (`crear_pedido`, `cliente`, `comprobante`, bucket privado).
> **Fuente de verdad:** [`GLOSSARY.md`](../../../GLOSSARY.md), [`docs/MODELO.md`](../../MODELO.md),
> [`AGENTS.md`](../../../AGENTS.md) §5.2, §5.3 y §5.4.

---

## 1. Problema

El checkout actual es el camino legacy: `src/app/checkout/page.tsx` hace `POST /api/orders` con
`total_ars` y después `POST /api/verify-payment` con la imagen en base64. Esas rutas van a
`src/services/order.service.ts`, que consulta la tabla `pedidos` y la RPC `crear_pedido_con_stock`:
**ninguna de las dos existe** en el contrato canónico (la tabla legacy se eliminó y la RPC se llama
`crear_pedido`, con otra firma). Hoy el camino de compra no puede completarse ni una vez.

Además, el flujo legacy no tiene identidad del Cliente (manda `nombre_cliente` suelto), guarda el
comprobante en una tabla que ya no existe (`comprobantes`), no declara el monto que el Administrador va a
comparar y no sube nada a Storage. Sin esto, `T7 · Admin` no tiene qué aprobar y el MVP no llega a
`Pago Validado`.

## 2. Solución

Un **módulo profundo** (`src/lib/checkout.ts`) con una sola función pública, `confirmarPedido(puerto,
datos)`, que envuelve el camino completo en el orden que exige el dominio:

1. **Valida el borde** con Zod (datos del Cliente y del comprobante) antes de tocar la base.
2. **Resuelve el Cliente** por `email` (único, case-insensitive): reutiliza el que existe o lo crea.
3. **Llama a `crear_pedido(id_cliente, items)`**: el pedido nace `Pendiente de Pago`, el total lo calcula
   la base (`SUM(subtotal)`) y el stock se reserva en la misma transacción (`AGENTS.md` §5.2).
4. **Sube la imagen** al bucket privado `comprobantes` y guarda en `COMPROBANTE.foto_url` la **clave del
   objeto**, no una URL pública: la imagen se sirve con signed URL generada desde el servidor.
5. **Registra el comprobante** con el `monto` que declara el Cliente y estado `Comprobante Subido`; el
   historial del comprobante lo escribe el trigger de la base, no el front (`AGENTS.md` §5.10).

El borde es una única ruta `POST /api/checkout` (Server-side, con `SUPABASE_SERVICE_ROLE_KEY`), y el
adaptador real vive en `src/lib/checkout-servidor.ts`, igual que `catalogo-servidor.ts` con el catálogo.

**Se retira el camino legacy de compra** en la misma tajada: `src/app/api/orders/`,
`src/app/api/verify-payment/`, `src/services/order.service.ts`, los esquemas
`OrderItem`/`CreateOrder`/`VerifyPayment` de `src/lib/schemas.ts` y `src/components/ReceiptUploader.tsx`
(cuyo efecto de “escaneo” sugería una validación automática que no existe, y que aportaba el único
warning de lint del repo) (`AGENTS.md` §7.5 y §9.4). Consecuencia declarada: la página legacy
`src/app/admin/page.tsx` consultaba `pedidos` y `fetch('/api/orders')`, que ya no existen, así que queda
como **aviso honesto de migración** hasta `T7` en lugar de una pantalla que promete datos que no puede
leer. No se maquilla con datos de muestra.

## 3. Historias y criterios de aceptación

### HU-1 · Identidad del Cliente (checkout invitado)

**Como** Cliente, **quiero** dejar mis datos una sola vez **para** que el pedido tenga dueño y llegue el aviso.

- **Then** el formulario pide **nombre**, **email**, **DNI** y **teléfono** (opcional); no pide apellido,
  contraseña ni cuenta: el modelo no tiene esos campos (`CLIENTE`: `nombre`, `email`, `dni`, `telefono`).
- **Given** un email ya registrado, **When** confirmo, **Then** se reutiliza ese Cliente y **no** se crea
  un segundo: la clave de identidad es `email` (índice único `lower(email)`).
- **Given** un DNI que no tiene 7 u 8 dígitos, un email inválido o un nombre vacío, **Then** veo el error
  de validación y **no** se llama a la base.
- **Then** el DNI, el email y el teléfono del Cliente **nunca** viajan al navegador de otro Cliente ni se
  exponen por la anon key (`AGENTS.md` §7.8).

### HU-2 · Confirmar el pedido y reservar stock

**Como** Cliente, **quiero** confirmar el pedido **para** que me reserven lo que elegí.

- **Given** disponible 5 y una línea de cantidad 3, **When** confirmo, **Then** el pedido nace
  `Pendiente de Pago`, `cantidad_reservada` sube a 3 y el total del pedido es la suma de subtotales de la base.
- **Given** disponible 2 y cantidad 3, **Then** veo el error de stock insuficiente y **ninguna** fila
  cambió; el **carrito no se vacía** (el Cliente ajusta la cantidad y reintenta).
- **Then** el total que se muestra sale de `totalDelPedido(items)` del carrito, pero **el que manda es el
  de la base**: si difieren (el precio cambió entre agregar y confirmar), se muestra el de la base.
- **Then** el total que se muestra, el que se precarga en el monto y el que viaja al pedido son el **mismo
  número**, en la precisión del dinero (`NUMERIC(12,2)`): el subtotal se redondea a centavos, el total suma
  subtotales redondeados y el formato es adaptativo (issue **#44**).
- **Then** los items que viajan a la RPC son `{ id_producto, cantidad }`, **una línea por producto**; no
  viaja ningún precio desde el cliente.
- **Then** una línea de un producto inactivo o inexistente se rechaza con su mensaje y no reserva nada.

### HU-3 · Monto declarado del comprobante

**Como** Administrador, **quiero** que el Cliente declare el monto que transfirió **para** poder compararlo
con la imagen y con el total (`AGENTS.md` §5.3).

- **Then** el campo "Monto transferido" viene precargado con el total del carrito y es editable; si la
  respuesta trae el total de la base (tras `monto-no-coincide`), la precarga y el «Total a transferir» usan
  **ese** número (#34 · hallazgo 5 de `deuda-codigo-25-10`).
- **Given** un monto declarado distinto del total del pedido, **Then** no se sube el comprobante y se
  explica que el importe tiene que coincidir (aprobar sin coincidencia es imposible: `ET005`).
- **Then** el `monto` guardado es el declarado por el Cliente, mayor que cero (`COMPROBANTE.monto > 0`); el
  sistema **no** lo completa solo con el total.
- **Then** en ningún momento se valida la imagen: la comparación es manual y no hay IA (`AGENTS.md` §5.3).

### HU-4 · Subir el comprobante

**Como** Cliente, **quiero** subir la foto de la transferencia **para** que un Administrador la valide.

- **Then** se aceptan **PNG, JPEG y WebP** de hasta **5 MB** (los límites del bucket `comprobantes`); un
  archivo de otro tipo o más grande se rechaza **antes** de crear el pedido.
- **Given** un pedido recién creado, **When** subo el archivo, **Then** el objeto queda en el bucket
  **privado** bajo una clave por pedido y `COMPROBANTE.foto_url` guarda esa clave.
- **Then** el comprobante queda en estado `Comprobante Subido` y su historial registra ese estado inicial.
- **Given** la anon key, **When** intenta leer el bucket o el comprobante, **Then** no obtiene nada: la
  subida y la lectura pasan por el servidor.

### HU-5 · Reintento sin duplicar

**Como** Cliente, **quiero** reintentar si algo falla **para** no terminar con dos pedidos y dos reservas.

- **Then** una vez creado el pedido, el intento guarda su `id_pedido` y un reintento **no** vuelve a
  llamar a `crear_pedido`: solo reintenta la subida del comprobante.
- **Given** un pedido que ya tiene un comprobante pendiente, **When** reintento, **Then** se reemplaza la
  imagen del **mismo** comprobante (una sola fila); la base rechaza dos pendientes a la vez.
- **Given** que la subida falla después de crear el pedido, **Then** el pedido queda `Pendiente de Pago`
  con su reserva y el cron de los viernes es quien la libera si nunca llega el comprobante (`AGENTS.md` §5.6).
- **Given** que falta `SUPABASE_SERVICE_ROLE_KEY`, **Then** el borde responde un error explícito de
  configuración, no un 500 opaco (`AGENTS.md` §7.10).

### HU-6 · Confirmación

**Como** Cliente, **quiero** saber que el pedido quedó registrado **para** quedarme tranquilo.

- **Then** la pantalla de éxito muestra el **número de pedido** y el **total**, vacía el carrito y avisa
  que un Administrador de Química valida el pago a mano y que el aviso llega por email.
- **Then** el texto **no** promete envío, seguimiento ni estados posteriores (`AGENTS.md` §5.5).
- **Then** el estado vacío del carrito y la confirmación se distinguen: recargar después de confirmar no
  vuelve a mostrar el formulario con un carrito vacío.
- **Then** mobile y accesibilidad: una columna, foco visible, `aria-label` en los controles, errores
  anunciados y asociados a su campo, contraste AA (`AGENTS.md` §7.11).

### HU-7 · Borde y claves

**Como** Administrador de Química, **quiero** que el borde del checkout no exponga la service role ni datos de otros Clientes, **para** que la tienda no filtre información.

- **Then** el navegador **nunca** recibe `SUPABASE_SERVICE_ROLE_KEY`, ni el DNI de otro Cliente, ni un
  listado de comprobantes: la ruta es server-side y devuelve solo lo que la pantalla muestra.
- **Then** la ruta valida la entrada con Zod y responde `400` con el detalle de los campos inválidos.
- **Then** el adaptador tipa el cliente Supabase con `src/lib/database.types.ts`; no se agrega ningún
  `any` (`AGENTS.md` §7.1).

## 4. Decisiones de implementación

1. **El Cliente se resuelve por email, no por DNI:** en la base el único es `lower(email)`; el DNI solo
   valida formato (`^[0-9]{7,8}$`). No hay RPC de Cliente y no se inventa una: el adaptador hace el
   *upsert* por email con la service role, acotado a esta tajada.
2. **`foto_url` guarda la clave del objeto, no una URL:** el bucket es privado; la signed URL se genera al
   leer, en el servidor.
3. **El monto llega precargado con el total a transferir y es editable; el servidor guarda lo que declara
   el Cliente:** la precarga es una comodidad de la pantalla, pero el dato que se persiste es el que el
   Cliente confirma. Si no coincide con el total de la base, no se sube el comprobante (`ET005`) y, desde
   #34, el total que se muestra pasa a ser el de la base (`totalAVisualizar`): el Cliente transfiere el
   número del pedido que el Administrador va a comparar.
   > Contradicción resuelta en la auditoría del 2026-10-27: HU-3 y esta sección ya decían “monto precargado”; el código (`src/app/checkout/page.tsx`) lo confirma, así que se corrigió este punto y manda el código.
4. **Reintento idempotente después de crear el pedido:** el `id_pedido` se conserva en el intento, así un
   fallo de subida no duplica pedido ni reserva.
5. **Se retira el camino legacy de compra en esta misma tajada:** dos caminos de pedido conviviendo es
   exactamente la contradicción que la auditoría marcó (`docs/estado/AUDITORIA.md` §6).

### 4.1 Límites del borde

El código manda: estos son los límites que el módulo aplica hoy (`ESQUEMA_CLIENTE`, `ESQUEMA_MONTO`,
`ESQUEMA_ITEMS` y los límites del archivo), escritos acá para no depender de leer el módulo (#37 ·
hallazgo 7 de `deuda-codigo-25-10`). Cada uno tiene su test en `tests/front/checkout.test.ts` y, en el
borde del archivo, en `tests/front/archivo-y-errores.test.ts`.

| Campo / regla | Límite | Rechazo |
|---|---|---|
| `nombre` | al menos 2 caracteres después de recortar espacios | `datos-invalidos`, campo `nombre` |
| `email` | formato `algo@algo.algo`; se normaliza a minúsculas | `datos-invalidos`, campo `email` |
| `dni` | 7 u 8 dígitos, sin puntos | `datos-invalidos`, campo `dni` |
| `telefono` | hasta 30 caracteres; vacío es `null` | `datos-invalidos`, campo `telefono` |
| `monto` | número finito mayor que cero | `datos-invalidos`, campo `monto` |
| `items` | entre 1 y 50 líneas; cada `id_producto` una sola vez; `cantidad` entera positiva | `items-invalidos` |
| archivo | PNG, JPEG o WebP de hasta 5 MB, con al menos un byte | `archivo-invalido` |
| `idPedido` (reintento) | entero positivo dentro del rango seguro, o ausente | `datos-invalidos`, campo `idPedido` |


## 5. Decisiones de testing

| Seam | Cubre | Deja afuera |
|---|---|---|
| `src/lib/checkout.ts` con un `PuertoCheckout` falso (sin DOM, sin red) | orden de los pasos, reutilización del Cliente, mapeo de items a la RPC, monto declarado, reemplazo del comprobante pendiente, mapa de errores `ET001`/`ET002`/`ET003`/`ET005`/`ET006` a mensajes, validación de archivo y de la clave del objeto | Supabase, Storage, render |
| RPC `crear_pedido` contra PGlite migrada (ya existe en `tests/db/pedidos.test.ts`) | reserva, total derivado, rechazo de repetidos y de stock insuficiente | el borde HTTP |
| Verificación en navegador de `/checkout` | formulario, monto precargado, estados de error y de éxito, carrito que no se vacía al fallar | automatización de UI |

No se agregan dependencias: sin jsdom ni Testing Library (`AGENTS.md` §4 y §8). El archivo se valida con
el mismo módulo puro (tipo MIME, tamaño y clave), y el bucket se verifica a mano una vez.

## 6. Fuera de alcance

- Aprobar o rechazar el comprobante, el panel y las alertas de stock: **T7**.
- El remito y su email: **T8**.
- RLS, políticas y bucket: [`bd-mvp`](../bd-mvp/spec.md) (tarea de Isabella en el tablero).
- Cuentas de Cliente, carrito persistido, cupones, envío y seguimiento: fuera del MVP.
- `/api/products` (catálogo canónico en JSON) sigue en pie: es la única API del catálogo. `/api/sync-sheets`
  se retiró con **T7**, junto con el cliente legacy `src/lib/supabase.ts` que lo alimentaba.

## 7. Notas finales

- El monto se guarda como lo declaró el Cliente, redondeado a centavos (`NUMERIC(12,2)`): el sistema no lo completa con el total.
- Corrección de evidencia (2026-10-28): el ejemplo `3001.65 → $ 3.002` que el spec del carrito daba como desviación era falso; el monto que redondeaba al mostrarse era `3001.999`.
- El borde del cliente valida la respuesta con el mismo esquema que define el contrato (#46): un cuerpo inesperado muestra que no se entendió y no rompe la pantalla.
- La verificación en navegador de `/checkout` (formulario, monto precargado, estados de error y de éxito) queda en #23.

## 8. Blockers declarados

1. **Migraciones aplicadas en `otjph…`** (Isabella). Hoy en producción: `vista_catalogo` no existe, las RPC
   de `02` no existen (`crear_pedido` responde `PGRST202`) y el bucket `comprobantes` no existe. Sin eso no
   hay nada que subir ni a quién pedirle el pedido.
2. **`SUPABASE_SERVICE_ROLE_KEY`** en `.env.local` y Vercel (Enzo, tarea *Secretos y entorno*): sin la
   clave, el borde no puede escribir ni firmar URLs.
3. **Esta spec** aprobada y linkeada en [#10](https://github.com/juanmamerodio/esenciatecnica/issues/10).

El módulo puro y sus tests **no** dependen de 1 ni 2: se puede implementar y dejar verde con el puerto
falso y PGlite mientras se cierran los blockers.

## 9. Estado de implementación (auditoría del 2026-10-27)

Auditoría de cada HU contra el código de `src/` y los tests de `tests/front/` y `tests/db/`. El estado
`implementado, sin verificar en vivo` significa que el código y los tests lo cubren, pero la base viva
`otjph…` sigue a medio migrar y las claves del issue #20 todavía no están puestas. No se marca ningún
criterio como “verde en producción” sin esa verificación.

| Criterio / HU | Estado | Evidencia |
|---|---|---|
| HU-1 · Formulario con nombre, email, DNI y teléfono opcional; sin apellido ni contraseña | implementado | `src/app/checkout/page.tsx:172-209`; `src/lib/checkout.ts:112-126` |
| HU-1 · Reutilización del Cliente por `email` | implementado | `src/lib/checkout.ts:187-188`; test `tests/front/checkout.test.ts:211` |
| HU-1 · DNI, email y teléfono fuera del alcance de la anon key | implementado, sin verificar en vivo | `tests/db/rls.test.ts:89`; `tests/db/rls-supabase.test.ts:56`; `src/lib/checkout-servidor.ts:8-10` |
| HU-2 · Reserva de stock y total derivado en la base | implementado, sin verificar en vivo | `tests/db/pedidos.test.ts:19`; `src/lib/checkout-servidor.ts:77-84` |
| HU-2 · Stock insuficiente: error y carrito intacto | implementado, sin verificar en vivo | `src/lib/checkout.ts:376-380`; `src/app/checkout/page.tsx:91-99`; test `tests/front/checkout.test.ts:318` |
| HU-2 · Total del carrito vs total de la base | implementado | `totalAVisualizar` en `src/lib/checkout.ts` y su uso en `src/app/checkout/page.tsx` (#34); test *«apenas la base devuelve su total, ese número manda»* en `tests/front/checkout.test.ts` |
| HU-2 · Items `{ id_producto, cantidad }` sin precios | implementado | `ESQUEMA_ITEMS` en `src/lib/checkout.ts`; `items.map` en `src/app/checkout/page.tsx`; test `tests/front/checkout.test.ts:220` |
| HU-2 · Producto inactivo o inexistente rechazado | implementado, sin verificar en vivo | `src/lib/checkout.ts:381-385`; test `tests/front/checkout.test.ts:332`; `tests/db/pedidos.test.ts:71` |
| HU-3 · Monto precargado con el total a transferir y editable | implementado, sin verificar en vivo | `totalAVisualizar` y la precarga en `src/app/checkout/page.tsx`; tests *«antes de confirmar manda el total del carrito»* y *«apenas la base devuelve su total, ese número manda»* (#34) |
| HU-3 · Monto distinto del total: no sube y explica | implementado | `montoQueNoCoincide` en `src/lib/checkout.ts`; test `tests/front/checkout.test.ts:252` |
| HU-3 · `monto` guardado como lo declaró el Cliente, > 0 | implementado | `ESQUEMA_MONTO` y `registrarComprobante` en `src/lib/checkout.ts`; test `tests/front/checkout.test.ts:239` |
| HU-3 · Sin validación automática de la imagen | implementado | `src/components/SubirComprobante.tsx` usa `revisarTipoYTamano` (`src/lib/archivo.ts`); el servidor revisa con `revisarArchivo`; test `tests/front/checkout.test.ts:384` |
| HU-4 · PNG, JPEG y WebP de hasta 5 MB, rechazo previo | implementado | `LIMITES_DE_ARCHIVO` y `revisarArchivo` en `src/lib/archivo.ts` (#35); tests `tests/front/checkout.test.ts:164,180` y `tests/front/archivo-y-errores.test.ts` |
| HU-4 · Bucket privado con clave por pedido en `foto_url` | implementado, sin verificar en vivo | `src/lib/checkout-servidor.ts:97-104,106-126`; `src/lib/checkout.ts:320`; tests `tests/front/checkout.test.ts:206,358` |
| HU-4 · Estado inicial `Comprobante Subido` en el historial | implementado, sin verificar en vivo | `tests/db/aprobacion.test.ts:64-71` |
| HU-4 · La anon key no lee el bucket ni el comprobante | implementado, sin verificar en vivo | `tests/db/rls.test.ts:89`; `tests/db/rls-supabase.test.ts:56`; `npm run bd:viva` (issue #15) |
| HU-5 · Reintento con `idPedido` no vuelve a crear el pedido | implementado | `src/app/checkout/page.tsx:45,83,99`; `src/lib/checkout.ts:158`; test `tests/front/checkout.test.ts:269` |
| HU-5 · Reemplazo del comprobante pendiente en la misma fila | implementado, sin verificar en vivo | `src/lib/checkout.ts:319,328`; `src/lib/checkout-servidor.ts:107-117`; tests `tests/front/checkout.test.ts:278`; `tests/db/aprobacion.test.ts:137` |
| HU-5 · Falla de subida: reserva intacta y cron de viernes | implementado, sin verificar en vivo | test `tests/front/checkout.test.ts:344`; `tests/db/aprobacion.test.ts:147` |
| HU-5 · Falta `SUPABASE_SERVICE_ROLE_KEY`: error explícito | implementado | `FaltaConfiguracion` (lanzada por `src/lib/checkout-servidor.ts`) y el borde que distingue 503 de 500 en `src/app/api/checkout/route.ts` (#35) |
| HU-6 · Pantalla de éxito con número y total; carrito vaciado | implementado, sin verificar en vivo | `src/app/checkout/page.tsx:91-94,119-127` |
| HU-6 · Sin promesas de envío, seguimiento ni estados posteriores | implementado | `src/app/checkout/page.tsx:124-126` |
| HU-6 · Carrito vacío y confirmación distinguidos | implementado, sin verificar en vivo | `src/app/checkout/page.tsx:115,136` |
| HU-6 · Mobile y accesibilidad (foco, `aria-label`, errores anunciados) | implementado, sin verificar en vivo | `src/app/checkout/page.tsx:166,233`; `src/components/SubirComprobante.tsx:65,88` |
| HU-7 · El navegador no recibe la service role ni listados | implementado | `src/app/api/checkout/route.ts:33-84`; test `tests/front/checkout.test.ts:403` |
| HU-7 · Zod y `400` con detalle de campos | implementado | `ESQUEMA_CLIENTE`/`ESQUEMA_ITEMS` en `src/lib/checkout.ts`; `camposDeZod` en `src/lib/errores-bd.ts`; `ESTADO_HTTP` compartido (#35) |
| §4.1 · Límites del borde escritos en el spec y fijados con test | implementado | [`§4.1`](#41-límites-del-borde) con la tabla de límites; tests *«los límites del borde, con su caso válido en el borde»* en `tests/front/checkout.test.ts` (#37) |
| HU-7 · Adaptador tipado con `database.types.ts`, sin `any` | implementado | `src/lib/checkout-servidor.ts:1-3,27` |
| Camino legacy de compra (`/api/orders`, `/api/verify-payment`, `ReceiptUploader`) | retirado | `tests/front/checkout.test.ts:384-401`; spec §2 |

> Las referencias `archivo:línea` de las filas sin símbolo son la foto de la auditoría del 2026-10-27;
> la tanda de #33–#46 movió código, así que las filas que esa tanda tocó citan el **símbolo**.

### Pendiente

- Aplicar las migraciones, la RLS y el bucket en `otjph…`: issue #15/#16. Es lo que convierte en
  “verificado en vivo” casi todo lo que hoy está implementado en repo.
- Poner `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` y Vercel: issue #20. Sin la clave, el borde responde
  `503` y no se puede probar el camino completo.
- Verificación manual en navegador de `/checkout` (formulario, monto precargado, estados de error y de
  éxito, carrito que no se vacía), con la base migrada y las claves puestas. Vive en la punta a punta
  **#23**.

> El ticket `T5 · Checkout y comprobante` ([#10](https://github.com/juanmamerodio/esenciatecnica/issues/10)) se cerró el 2026-10-28 con su comentario de evidencia:
> la implementación y sus tests están en `main` y lo único que falta es la verificación en vivo de arriba.
