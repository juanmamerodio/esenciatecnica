# Manual de uso · Esencia Técnica

> **Para:** Departamento de Química · E.E.S.T N°1 Luciano Reyes · Campana, Buenos Aires.
> **Qué explica:** cómo funciona la tienda, cómo se usa el panel de gestión (`/admin`) y qué hace el
> sistema solo. Es la visión general: no hace falta saber de programación para leerlo.
> **Última actualización:** 2026-10-26.

---

## 1. En una página

El sistema tiene **dos partes**:

| Parte | Quién la usa | Para qué |
|---|---|---|
| **La tienda** (`/`) | Cualquier persona con el link | Ver el catálogo, armar un carrito, confirmar el pedido, transferir y subir el comprobante. |
| **El panel de gestión** (`/admin`) | El Administrador de Química | Validar los comprobantes a mano, corregir stock, mantener el catálogo y ver las alertas. |

El circuito completo es este:

```
El Cliente arma el carrito          (no reserva stock)
        ↓
Confirma el pedido                  → se RESERVA el stock
        ↓
Transfiere y sube el comprobante
        ↓
Vos lo revisás a mano en /admin     (comparás imagen y monto)
        ↓
   Aprobás ──────────────→ se DESCUENTA el stock y sale el Remito por email
   Rechazás ─────────────→ se libera la reserva, el stock no cambia
        ↓
Si nadie lo aprueba antes del viernes, el pedido se cancela y se libera la reserva
```

**Lo que el sistema no hace, a propósito:** no cobra automáticamente, no lee la imagen del
comprobante, no hace envíos ni seguimiento. El pago lo valida **una persona**. El proyecto termina
en **Pago Validado + Remito**: el retiro o la entrega se coordinan aparte.

---

## 2. La tienda, pantalla por pantalla

### 2.1 Inicio (`/`)

Presenta el proyecto y muestra **los primeros productos publicados**. Desde acá se llega al catálogo
y a la página "Sobre el proyecto".

### 2.2 Catálogo (`/catalog`)

Es la vidriera completa. Tiene:

- **Buscador** por nombre, categoría, tipo o descripción.
- **Filtros por categoría** (se generan solos con las categorías que existan).
- La cantidad de productos encontrados.
- Botón **"Agregar"** en cada producto, o **"Sin stock"** si no hay disponible.

> **Importante:** la tienda solo muestra productos **publicados** (`activo`). Si un producto se da de
> baja desde el panel, desaparece del catálogo y tampoco se puede abrir por link directo.

### 2.3 Detalle de un producto (`/producto/<número>`)

Se llega desde la foto o el nombre. Muestra la descripción completa, la categoría, el tipo, el
precio, el **tiempo de producción** y, si no hay stock, el aviso "Sin stock".

El tiempo de producción es cuánto tarda el Departamento de Química en elaborarlo: **no es un plazo
de entrega**.

### 2.4 Carrito (`/cart`)

El carrito vive **en el navegador del Cliente**, no en el servidor. Por eso:

- Se puede cambiar la cantidad con `+` y `−`, o quitar un producto.
- El botón `+` se frena solo al llegar al stock disponible.
- **Todavía no reserva nada:** el stock se reserva recién al confirmar el pedido.
- Si el Cliente cierra el navegador o borra los datos, el carrito se pierde.

### 2.5 Checkout (`/checkout`)

Es el paso donde el pedido se vuelve real. El Cliente:

1. Completa **sus datos**: nombre y apellido, email, DNI y teléfono (opcional).
2. Ve el **total a transferir** y los datos de la transferencia (alias, CBU y titular).
3. Escribe el **monto transferido** (viene precargado con el total).
4. **Adjunta la foto del comprobante.**
5. Toca **"Confirmar pedido y subir el comprobante"**.

A partir de ese momento:

- **Se reserva el stock** del pedido.
- El pedido queda en estado **Pendiente de Pago**.
- Aparece en el panel de gestión para que vos lo valides.

Si el Cliente se equivoca con el monto, el sistema lo frena y le vuelve a escribir el total correcto,
sin duplicar la reserva.

---

## 3. El panel de gestión (`/admin`)

Se entra desde el botón **"Gestión"** del encabezado, o escribiendo `/admin` al final de la
dirección del sitio.

### 3.1 Cómo se entra

El panel está protegido con **una sola contraseña**, que la maneja el equipo del proyecto
(`ADMIN_PASSWORD`). Al abrir `/admin`, el navegador pide usuario y contraseña:

| Campo | Qué poner |
|---|---|
| **Usuario** | Cualquier cosa (el sistema lo ignora). |
| **Contraseña** | La contraseña del Administrador. |

La tienda **no** pide nada: las credenciales se piden solo al entrar al panel, nunca al abrir el
catálogo, un producto o el carrito.

Se ingresa **una vez por navegador**: después queda recordada. Si no la sabés o no funciona,
pedísela al equipo del proyecto: no se resetea desde la web.

> **Si el panel dice "Panel sin configurar"** no es un problema tuyo: falta configurar una clave en el
> servidor. Avisale al equipo técnico (ver §7).

El panel tiene **cuatro secciones**, siempre en este orden: alertas, pedidos, stock y productos.

### 3.2 Alertas de stock (arriba de todo)

Aparece **solo si hay alertas sin atender**, como un recuadro amarillo. Cada alerta dice el producto,
el mensaje y la fecha. Tiene dos acciones:

| Botón | Qué hace |
|---|---|
| **Marcar como atendida** | La alerta deja de aparecer. Queda guardada como historial. |
| **Ocultar aviso** | Esconde el recuadro por esta visita, **sin** marcar nada como atendido. |

Las alertas **las genera el sistema solo**: cuando el stock disponible de un producto llega a su
umbral de aviso. **No llega ningún email de alerta**: se ven únicamente acá, así que conviene entrar
al panel con regularidad.

### 3.3 Pedidos

Es la sección más importante: acá se valida el pago. Cada pedido muestra una tarjeta con:

- **Número de pedido** y fecha.
- **Cliente**: nombre y email (el email es un link: abre para escribirle).
- **Estado actual**, en un recuadro de color.
- La **tabla de productos**: cantidad, precio unitario y subtotal.
- El **total del pedido**.
- Los **comprobantes** subidos, con su monto, su estado y un botón **"Ver la imagen"**.
- Si ya se aprobó, el **Remito** emitido.

#### Estados de un pedido

| Estado | Qué significa |
|---|---|
| **Pendiente de Pago** | El pedido existe y el stock está reservado. Falta validar el comprobante. |
| **Pago Validado** | El comprobante se aprobó: el stock se descontó y se emitió el Remito. **Es el final del circuito.** |
| **Rechazado** | El comprobante no correspondía: se liberó la reserva y el stock no cambió. |
| **Cancelado** | Venció el plazo sin comprobante aprobado: se liberó la reserva. |

#### Estados de un comprobante

| Estado | Qué significa |
|---|---|
| **Comprobante Subido** | El Cliente lo subió y espera tu revisión. Es el momento de actuar. |
| **Aprobado por Admin** | Ya lo aprobaste (lo aprobó una persona). |
| **Rechazado** | Ya lo rechazaste. |

#### Aprobar un comprobante, paso a paso

1. En el pedido en **Pendiente de Pago**, tocá **"Ver la imagen"**.
2. Compará **con tus ojos**:
   - Que la imagen sea un comprobante de transferencia real y legible.
   - Que el **monto** coincida **exactamente** con el **total del pedido**.
   - Que la fecha sea coherente.
3. Volvé al panel y tocá **"Aprobar"**.
4. El sistema muestra una **confirmación con los dos montos**: el del comprobante y el total del
   pedido. Revisala y tocá **"Sí, confirmar la aprobación"**.

Al aprobar, el sistema hace todo junto y de una sola vez:

- El pedido pasa a **Pago Validado**.
- **Descuenta el stock** (`cantidad_actual`) y libera la reserva.
- Emite el **Remito de venta** con su número.
- **Le envía el Remito al Cliente por email.**

#### Rechazar un comprobante

Mismo camino, pero con **"Rechazar"**. Sirve cuando la imagen no corresponde, el monto no coincide o
la transferencia no se hizo. Al rechazar:

- El pedido pasa a **Rechazado**.
- **Se libera la reserva** y el stock disponible vuelve a subir.
- **No** se descuenta stock ni se emite remito.

#### Si el monto no coincide

El sistema **no te deja aprobar** un comprobante cuyo monto no coincida con el total del pedido:
muestra el aviso correspondiente y no toca el stock. En ese caso, rechazá el comprobante y
comunicate con el Cliente.

#### El Remito

Una vez aprobado el pedido, aparece el número de remito con dos acciones:

| Botón | Qué hace |
|---|---|
| **Ver el remito** | Abre el remito listo para **imprimir o guardar en PDF**. |
| **Reenviar el remito** | Vuelve a mandar el email al Cliente. Usalo solo si el Cliente dice que no le llegó. |

#### Qué NO se puede hacer

- **No hay forma de modificar un pedido** (ni cantidades ni precios): es el registro de lo que el
  Cliente confirmó.
- **No hay que aprobar dos veces**: un comprobante ya resuelto no se puede volver a decidir. Si dos
  personas entran al panel al mismo tiempo y una decide primero, a la otra el sistema le avisa.
- **No hay búsqueda ni paginación**: se ve la lista completa de pedidos.

### 3.4 Stock

Es una tabla con una fila por producto:

| Columna | Qué significa |
|---|---|
| **Producto** | Nombre, categoría y si está publicado o sin publicar. |
| **Reservada** | Unidades apartadas por pedidos que todavía no se aprobaron. |
| **Disponible** | Lo que se puede vender: **cantidad actual − reservada**. Lo calcula el sistema. |
| **Cantidad actual** | **Editable.** El stock físico real. |
| **Umbral de aviso** | **Editable.** A partir de qué cantidad querés que avise. |
| **Acción** | Botón **"Guardar"** de esa fila. |

Cómo se usa:

1. Hacé clic en el número de **Cantidad actual** y escribí el valor real.
2. Ajustá el **Umbral de aviso** si hace falta.
3. Tocá **"Guardar"** en esa fila (hay un botón por producto).

Detalles importantes:

- **El umbral `0` significa "sin umbral":** ese producto no dispara ninguna alerta.
- Cuando el **disponible** llega al umbral, el sistema **crea la alerta** y aparece arriba del panel.
- Si te equivocás y ponés un número negativo o con decimales, el sistema lo rechaza y te avisa antes
  de guardar nada.

### 3.5 Productos

Cada producto es una tarjeta con su foto, nombre, categoría, tipo, precio, tiempo de producción,
descripción y su estado (**Publicado** / **Sin publicar**).

#### Crear un producto

1. Desplegá **"Nuevo producto"**.
2. Completá: **Nombre**, **Categoría**, **Tipo**, **Precio (ARS)**, **Tiempo de producción (días)** y
   **Descripción**.
3. Tocá **"Crear producto"**.

El sistema crea el producto **y su fila de stock** automáticamente (en 0 unidades). Después cargale
el stock real desde §3.4 y subile la foto.

#### Editar un producto

1. Desplegá **"Editar <nombre del producto>"**.
2. Cambiá lo que haga falta.
3. Tocá **"Guardar cambios"**.

#### Subir o cambiar la foto

1. Desplegá **"Editar <nombre>"**.
2. En **"Foto del producto"**, elegí el archivo.
3. Tocá **"Subir foto"**.

| Requisito | Valor |
|---|---|
| Formatos aceptados | PNG, JPEG o WebP |
| Tamaño máximo | 5 MB |

Si el archivo es de otro formato o pesa más, el sistema lo rechaza antes de subir nada.

> **Consejo:** usá fotos horizontales, bien iluminadas y con el producto centrado. Es la primera
> imagen que ve el Cliente en el catálogo y en la portada de la tienda.

#### Dar de baja un producto (sin borrarlo)

Tocá **"Dar de baja"**. El producto **no se borra**:

- Deja de aparecer en el catálogo y en la portada.
- Su link directo deja de funcionar.
- **Conserva su historial de ventas**, así que los remitos viejos siguen siendo válidos.

Para volver a publicarlo, tocá **"Publicar"**.

> **Nunca se borra un producto con historial**, ni desde el panel ni desde ningún otro lado. Es una
> decisión del proyecto, no una limitación.

---

## 4. Cómo se conectan la tienda y el panel

Casi todo lo que hacés en el panel se ve enseguida en la tienda:

| Si en el panel… | En la tienda… |
|---|---|
| Subís una foto | El producto muestra esa foto en el catálogo y en su detalle. |
| Cambiás el nombre, la categoría o la descripción | Se actualiza en el catálogo y en el detalle. |
| Cambiás el precio | El precio nuevo se aplica a los carritos y pedidos **nuevos**. |
| Creás un producto | Aparece en el catálogo (con su stock en 0 hasta que lo cargues). |
| Modificás el stock | El botón "Agregar" del producto se frena cuando no hay disponible. |
| Das de baja un producto | Desaparece del catálogo y de la portada. |

**Dos cosas que conviene tener claras:**

1. **Cambiar un precio no cambia los pedidos ya hechos.** Cada pedido guarda el precio del momento
   en que se confirmó, así que un comprobante viejo sigue coincidiendo con su total.
2. **Dar de baja un producto no cancela los pedidos que ya lo incluyen.** Esos pedidos siguen su
   curso normal hasta aprobarse o rechazarse.

---

## 5. Rutina sugerida

| Cuándo | Qué hacer |
|---|---|
| **Todos los días** | Entrar a `/admin`, atender las alertas de stock y validar los comprobantes pendientes. |
| **Si hay stock bajo** | Reponer y corregir **Cantidad actual** en §3.4. |
| **Antes de publicar algo nuevo** | Cargar bien precio, descripción y foto; después cargar el stock inicial. |
| **Los viernes** | Revisar que no queden comprobantes sin validar: los pedidos sin aprobar se cancelan y liberan la reserva. |
| **Si un Cliente pregunta** | Buscar su pedido por email en §3.3 y mirar en qué estado está. |

> **Sobre el vencimiento del viernes:** el sistema cancela los pedidos que llegaron al viernes sin un
> comprobante aprobado, y libera el stock reservado. Es automático: no hay que hacer nada.

---

## 6. Preguntas frecuentes

**Un Cliente dice que transfirió pero no veo el comprobante.**
Puede haber confirmado el pedido y no haber subido la imagen: en la tarjeta va a decir "El Cliente
todavía no subió el comprobante". Escribile con el link del email que aparece en el pedido.

**¿Puedo aprobar si el monto es distinto por unos pesos?**
No. El sistema exige coincidencia exacta con el total y no deja aprobar. Rechazá el comprobante y
acordá con el Cliente cómo seguir.

**Borré un producto sin querer, ¿se puede recuperar?**
No se borró: quedó **sin publicar**. Buscalo en §3.5 y tocá **"Publicar"**.

**¿Por qué el disponible no coincide con la cantidad actual?**
Porque hay pedidos **Pendientes de Pago** que tienen stock **reservado**. El disponible es la
cantidad actual menos lo reservado. Cuando esos pedidos se aprueban o se rechazan, la reserva se
libera y el disponible se acomoda.

**¿Se le avisa al Cliente cuando rechazo un comprobante?**
El email del remito se envía solo al **aprobar**. Ante un rechazo, avisale vos por el email del
pedido para explicarle el motivo.

**¿Llega algún email de alerta de stock?**
No. Las alertas de stock se ven **únicamente en el panel**. Los emails son solo para el Cliente.

**¿Puedo ver quién aprobó cada comprobante?**
En el MVP hay **una sola contraseña compartida**, así que el sistema no registra quién fue. Cada
comprobante guarda **qué** pasó y **cuándo**, no quién lo hizo.

---

## 7. Si algo no funciona

| Qué ves | Qué significa | Qué hacer |
|---|---|---|
| El navegador pide usuario y contraseña y no la sabés | Es la protección del panel | Pedile la contraseña al equipo del proyecto |
| **"Panel sin configurar"** | Falta una clave en el servidor | Avisá al equipo técnico: no se arregla desde la web |
| **"No pudimos cargar el catálogo"** | Falla temporal de lectura de datos | Recargá en unos minutos; si sigue, avisá al equipo |
| Un comprobante dice **"No pudimos generar el link de la imagen"** | No se pudo abrir la imagen guardada | Recargá el panel; si sigue, avisá al equipo |
| Un mensaje rojo al aprobar o guardar | El pedido ya se resolvió, el monto no coincide o el dato no es válido | Leé el mensaje: explica el motivo |

**Contacto del proyecto:** [proyectos@esenciatecnica.edu.ar](mailto:proyectos@esenciatecnica.edu.ar)

---

## 8. Glosario corto

| Término | Qué es |
|---|---|
| **Cliente** | Quien compra en la tienda. |
| **Administrador de Química** | Quien usa el panel: valida pagos, stock y catálogo. |
| **Producto** | Cosmética o higiene elaborada por el Departamento de Química. |
| **Pedido** | Lo que el Cliente confirma, con sus productos, cantidades y total. |
| **Comprobante** | La imagen de la transferencia que sube el Cliente. |
| **Validación manual** | Que el pago lo aprueba una persona, comparando imagen y monto. |
| **Reserva** | Stock apartado por un pedido que todavía no se aprobó. |
| **Disponible** | Cantidad actual menos lo reservado. |
| **Umbral de aviso** | La cantidad a partir de la cual el sistema avisa que hay que reponer. |
| **Remito de venta** | El documento que se emite al aprobar el pago y se envía por email. |
| **Baja lógica** | Dejar de publicar un producto sin borrarlo, conservando su historial. |

---

## Para profundizar

Este manual es la visión de uso. La documentación técnica del proyecto vive en
[`docs/`](../README.md): el modelo de datos en [`docs/MODELO.md`](../MODELO.md) y el detalle del panel
en [`docs/specs/admin/spec.md`](../specs/admin/spec.md).
