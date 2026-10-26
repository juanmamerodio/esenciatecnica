# Panel de gestión · Guía de uso

> **Para:** Administradores de Química que validan los pagos de **Esencia Técnica**.
> **Qué explica:** cómo entrar al panel y cómo usarlo en el día a día, tarea por tarea.
> **Última actualización:** 2026-10-26.

---

## 1. Entrar al panel

1. Abrí el sitio de la tienda.
2. Tocá **"Gestión"** en el encabezado (arriba a la derecha), o agregá `/admin` al final de la
   dirección.
3. El navegador pide credenciales:

| Campo | Qué poner |
|---|---|
| **Usuario** | Cualquiera. El sistema **lo ignora**. |
| **Contraseña** | La contraseña del Administrador (`ADMIN_PASSWORD`). |

4. Listo. Se pide **una sola vez por navegador**.

> La contraseña es **una sola y compartida**: el MVP no tiene usuarios individuales. Por eso el
> sistema registra **qué** se hizo y **cuándo**, pero no **quién** lo hizo.

### Si no podés entrar

| Qué pasa | Causa | Solución |
|---|---|---|
| Pide la contraseña y no la tenés | Es la protección normal del panel | Pedísela al equipo del proyecto |
| La contraseña no funciona | Está mal escrita o cambió | Verificá mayúsculas y pedí confirmación al equipo |
| Sale **"Panel sin configurar"** | Falta configurar una clave **en el servidor** | Avisá al equipo técnico: no se arregla desde la web |
| No pide contraseña y entra directo | El navegador ya la tiene guardada | Es normal |

---

## 2. El orden de la pantalla

El panel siempre muestra las secciones en este orden:

1. **Alertas de stock** — solo si hay alguna sin atender.
2. **Pedidos** — validación de comprobantes. **Es la tarea principal.**
3. **Stock** — corrección de cantidades y umbrales.
4. **Productos** — alta, edición, baja y fotos.

---

## 3. Tarea principal: validar un comprobante

### 3.1 Antes de empezar

Tené el **total del pedido** a la vista (está en la tarjeta) y la **imagen del comprobante** abierta.

### 3.2 Checklist de revisión

Antes de aprobar, comprobá **los cuatro puntos**:

| # | Qué revisar | Cómo |
|---|---|---|
| 1 | **La imagen es real y legible** | Se lee el monto, la fecha y el destino de la transferencia |
| 2 | **El monto coincide exacto** | El monto del comprobante tiene que ser **igual** al total del pedido |
| 3 | **La fecha es coherente** | La transferencia es de estos días, no de meses atrás |
| 4 | **El pedido está en `Pendiente de Pago`** | Si dice otro estado, ya está resuelto: no hay nada que hacer |

Si los cuatro puntos pasan, **aprobá**. Si falla alguno, **rechazá** y avisale al Cliente.

### 3.3 Aprobar

1. Tocá **"Ver la imagen"** en el comprobante.
2. Tocá **"Aprobar"**.
3. Aparece una confirmación con los **dos montos**: el del comprobante y el total del pedido.
   Leela y tocá **"Sí, confirmar la aprobación"**.

**Qué hace el sistema al aprobar (todo junto, de una sola vez):**

- El pedido pasa a **Pago Validado**.
- **Descuenta el stock** real y libera la reserva.
- Emite el **Remito de venta** con su número.
- **Le manda el Remito al Cliente por email.**

Si el monto **no coincide**, el sistema **no te deja aprobar** y te lo dice. No se toca el stock. En
ese caso, rechazá el comprobante y comunicate con el Cliente.

### 3.4 Rechazar

1. Tocá **"Rechazar"** en el comprobante.
2. Confirmá en el aviso.

**Qué hace el sistema al rechazar:**

- El pedido pasa a **Rechazado**.
- **Libera la reserva**: el disponible vuelve a subir.
- **No** descuenta stock y **no** emite remito.
- **No le avisa al Cliente por email**: avisale vos, usando el email que figura en el pedido (es un
  link, te abre el correo).

### 3.5 Si dos personas trabajan a la vez

Si otro Administrador ya resolvió el comprobante mientras lo mirabas, el sistema te lo informa con un
mensaje en lugar de hacer algo raro. **Recargá el panel** y vas a ver el estado real.

### 3.6 Reenviar el remito

Si un Cliente dice que no le llegó el email, en la tarjeta del pedido aprobado tocá
**"Reenviar el remito"**. Vuelve a mandar el mismo remito al mismo email. No duplica la venta ni
cambia el stock.

### 3.7 Imprimir el remito

En el pedido aprobado, tocá **"Ver el remito"** y después **"Imprimir"**. Se puede imprimir en papel
o guardar como PDF desde el diálogo del navegador.

---

## 4. Alertas de stock

Aparecen como un **recuadro amarillo arriba del panel**, solo si hay alertas sin atender. Dicen el
producto, el motivo y la fecha.

| Botón | Qué hace |
|---|---|
| **Marcar como atendida** | La alerta desaparece del recuadro. **Queda guardada** en el historial. |
| **Ocultar aviso** | Esconde el recuadro por esta visita, **sin** marcar nada como atendido. La alerta vuelve a aparecer al recargar. |

**Cómo se generan:** solo. Cuando el **disponible** de un producto llega a su **umbral de aviso**, el
sistema crea la alerta. Vos no las creás a mano.

**No llega ningún email de alerta.** Se ven solo acá: conviene entrar al panel todos los días.

---

## 5. Corregir el stock

En la sección **Stock** hay una fila por producto.

| Columna | Qué significa | ¿Se edita? |
|---|---|---|
| **Reservada** | Unidades apartadas por pedidos sin aprobar | No (la maneja el sistema) |
| **Disponible** | Cantidad actual − reservada | No (lo calcula el sistema) |
| **Cantidad actual** | El stock físico real | **Sí** |
| **Umbral de aviso** | A partir de qué cantidad querés que avise | **Sí** |

### Cómo hacerlo

1. Escribí el valor real en **Cantidad actual**.
2. Ajustá el **Umbral de aviso** si hace falta.
3. Tocá **"Guardar"** **en esa fila** (hay un botón por producto).

### Reglas

- **El umbral `0` significa "sin umbral":** ese producto **no** dispara alertas.
- Los valores tienen que ser **enteros y no negativos**. Si no, el sistema lo rechaza antes de
  guardar y te lo dice.
- **No toques `Cantidad actual` para "cuadrar" el disponible.** Si el disponible está bajo, es
  porque hay pedidos pendientes con reserva. Eso se resuelve aprobando o rechazando los pedidos.
- Cuando el disponible toca el umbral, **el sistema** crea la alerta.

---

## 6. Mantener el catálogo

### Crear un producto

1. Desplegá **"Nuevo producto"**.
2. Completá:

| Campo | Qué poner |
|---|---|
| **Nombre** | El nombre comercial del producto |
| **Categoría** | Jabones, cremas, champús… (se usa para los filtros del catálogo) |
| **Tipo** | La variante o línea (opcional) |
| **Precio (ARS)** | El precio de venta |
| **Tiempo de producción (días)** | Cuánto tarda el taller en elaborarlo |
| **Descripción** | Lo que ve el Cliente en el detalle del producto |

3. Tocá **"Crear producto"**.

El sistema crea el producto **y su fila de stock** (en 0). Después **cargá el stock real** (§5) y
**subile la foto** (abajo).

### Editar un producto

1. Desplegá **"Editar <nombre>"**.
2. Cambiá los campos.
3. Tocá **"Guardar cambios"**.

### Subir la foto

1. Desplegá **"Editar <nombre>"**.
2. En **"Foto del producto"**, elegí el archivo.
3. Tocá **"Subir foto"**.

| Requisito | Valor |
|---|---|
| Formato | PNG, JPEG o WebP |
| Tamaño máximo | 5 MB |

Si no cumple, el sistema lo rechaza antes de subir nada.

> **Recomendación:** foto horizontal, con luz pareja y el producto centrado. Es la primera imagen
> que ve el Cliente.

### Dar de baja (sin borrar)

Tocá **"Dar de baja"**.

- El producto **no se borra**: queda **"Sin publicar"**.
- Desaparece del catálogo, de la portada y de su link directo.
- **Conserva su historial**: los pedidos y remitos viejos siguen siendo válidos.

Para volver a publicarlo, tocá **"Publicar"**.

> **Nunca se borra un producto con historial.** No existe ningún botón para borrar, y es a propósito.

---

## 7. Qué NO se puede hacer desde el panel

Estas cosas **no** están en el MVP y no hay que buscarlas:

- **Borrar un producto** (solo darlo de baja).
- **Modificar un pedido** ya confirmado: ni cantidades, ni precios, ni datos del Cliente.
- **Cancelar o reabrir un pedido a mano.**
- **Crear usuarios o dar permisos:** hay una sola contraseña compartida.
- **Buscar o filtrar pedidos:** se ve la lista completa.
- **Gestionar envíos:** el proyecto no incluye envío ni seguimiento; el retiro o la entrega se
  coordinan aparte.
- **Ver quién aprobó cada comprobante:** el sistema guarda qué y cuándo, no quién.

---

## 8. Rutina diaria recomendada

| Momento | Qué hacer |
|---|---|
| **Al empezar el día** | Entrar al panel y mirar las **alertas de stock** |
| **Después** | Validar **todos** los comprobantes en `Pendiente de Pago` |
| **Si falta stock** | Reponer y corregir **Cantidad actual** (§5) |
| **Antes de cada viernes** | Asegurarte de que no quede ningún comprobante sin resolver |
| **Antes de publicar** | Cargar bien precio, descripción y foto, y después el stock inicial |
| **Al cerrar** | Que las alertas queden atendidas o el stock repuesto |

---

## 9. Problemas frecuentes

| Qué ves | Qué significa | Qué hacer |
|---|---|---|
| **"Panel sin configurar"** | Falta una clave en el servidor | Avisá al equipo técnico |
| **"El Cliente todavía no subió el comprobante"** | Confirmó el pedido pero no adjuntó la imagen | Escribile con el email del pedido |
| **"No pudimos generar el link de la imagen"** | No se pudo abrir la imagen guardada | Recargá el panel; si sigue, avisá al equipo |
| Mensaje de que el **monto no coincide** | El monto del comprobante ≠ total del pedido | Rechazá y acordá con el Cliente |
| Mensaje de que el **comprobante ya no está pendiente** | Otro Administrador ya lo resolvió | Recargá el panel |
| Un producto que **desapareció del catálogo** | Se dio de baja | Buscalo en Productos y tocá **"Publicar"** |
| El **disponible no coincide** con la cantidad actual | Hay pedidos pendientes con reserva | Es correcto: resolvé esos pedidos |

**Contacto del proyecto:** [proyectos@esenciatecnica.edu.ar](mailto:proyectos@esenciatecnica.edu.ar)

---

## Para profundizar

- Visión general del sistema y del circuito de compra: [`MANUAL.md`](MANUAL.md).
- Detalle técnico del panel: [`docs/specs/admin/spec.md`](../specs/admin/spec.md).
- Reglas de negocio y modelo de datos: [`GLOSSARY.md`](../../GLOSSARY.md) y
  [`docs/MODELO.md`](../MODELO.md).
