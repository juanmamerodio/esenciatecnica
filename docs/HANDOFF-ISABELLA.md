# Handoff a Isabella Infante · Modelo de datos MVP

> **Para:** Isabella Infante — Database & SQL Architecture.
> **De:** Juan Manuel Merodio / equipo de e-commerce.
> **Fecha:** 2026-10-22.
> **Estado:** modelo normalizado aprobado; falta tu revisión de DDL, constraints, índices, RLS y limpieza.
> **Referencia:** [`MODELO.md`](MODELO.md) y [`AUDITORIA.md`](AUDITORIA.md).

---

## 1. Contexto

Aprobamos un modelo **normalizado** para el MVP del e-commerce:

- Productos de cosmética e higiene.
- Carrito en el cliente (cookie/localStorage), **sin** tablas de carrito en el MVP.
- Pedido con reserva de stock.
- Comprobante validado a mano por los Administradores de Química.
- Remito HTML por email al aprobar.
- El MVP termina en `Pago Validado` + remito: **no hay envío**.
- Admin con Basic Auth (`ADMIN_PASSWORD`); `admin`/`roll` quedan para fase 2.
- Sin IA. Gemini se retira.

El código Next.js todavía usa el esquema legacy (`productos`, `pedidos`, `verificaciones`) del proyecto viejo. La migración del código se hace después de cerrar el DDL.

---

## 2. Qué necesito de vos

1. Revisar el ERD de [`MODELO.md`](MODELO.md) y confirmar tablas/columnas.
2. Escribir el DDL de migración en el proyecto `otjphjnrwihqzzhbfnmh`.
3. Definir constraints, índices y tipos numéricos.
4. Definir RLS y permisos de Storage.
5. Decidir qué hacer con los datos de prueba inconsistentes.
6. Avisar cuando el DDL esté listo para migrar el código.

No escribas el DDL en este documento: este es el brief. El SQL final lo hacés vos.

---

## 3. Cambios por tabla

| Tabla actual | Cambio propuesto |
|---|---|
| `cliente` | Quitar `id_carrito` (el carrito no se persiste en el MVP). Mantener `dni`, `nombre`, `email`, `telefono`. Definir si `dni`/`email` son únicos (hoy no lo son). |
| `producto` | Quitar `id_stock` e `id_detalle_pedido` (FKA recíprocas). Un solo `nombre` y `descripcion` (español único). Mantener `categoria`, `tipo`, `precio`, `tiempo_produccion`. Agregar `activo` e `imagen_url`. |
| `stock` | Una fila por producto: `id_stock PK`, `id_producto FK UNIQUE`, `cantidad_actual`, `cantidad_reservada`, `cantidad_warning`. `porcentaje` se calcula; se puede eliminar. |
| `pedido` | Quitar `id_estado` (FK circular). Agregar `estado_actual` con CHECK de estados. Mantener `id_cliente`, `fecha`, `total`. |
| `detalle_del_pedido` | Agregar PK propia `id_detalle_pedido`. Quitar `id_cliente`, `estado`, `fecha` y `total` duplicados. Mantener `id_pedido`, `id_producto`, `cantidad`, `precio_unitario`; agregar `subtotal`. |
| `estados_pedidos` | Usar como historial: `id_estado_pedido PK`, `id_pedido FK`, `estado`, `fecha`. Índice `(id_pedido, fecha)`. No es lookup del pedido. |
| `comprobante` | Agregar `monto` y `estado_actual`; renombrar `foto_comprobante` a `foto_url` si se quiere. Mantener `id_pedido`, `fecha`. Un pedido puede tener varios intentos. |
| `estados_comprobante` | Historial: `id_estado_comprobante PK`, `id_comprobante FK`, `estado`, `fecha`. Índice `(id_comprobante, fecha)`. |
| `remitos_de_venta` | Agregar `numero UNIQUE`; quitar `producto_selec` (el detalle está en `detalle_del_pedido`). `id_comprobante` debería ser UNIQUE (un remito por comprobante aprobado). Mantener `id_cliente`, `fecha`, `total`. |
| `alerta_de_estado` | Simplificar a `id_alerta`, `id_stock`, `fecha`, `mensaje`, `atendida`. Quitar `mes`, `ano`, `porcentaje`, `descripcion`, `email_contacto` (no se envía email al Admin). |
| `admin` / `roll` | Fase 2. No tocar en el MVP. `roll` es typo de `rol`; renombrar cuando se migre a Supabase Auth. |
| `detalle_carrito` | Fase 2. No se usa en el MVP. |

---

## 4. Constraints e índices sugeridos

- `pedido.total`, `detalle_del_pedido.precio_unitario`, `detalle_del_pedido.subtotal`, `comprobante.monto` y `remito.total`: `NUMERIC(12,2)`.
- `detalle_del_pedido.cantidad > 0`; `stock.cantidad_actual >= 0`; `stock.cantidad_reservada >= 0`.
- `pedido.estado_actual` CHECK: `Pendiente de Pago`, `Pago Validado`, `Rechazado`, `Cancelado`.
- `comprobante.estado_actual` CHECK: `Comprobante Subido`, `Aprobado por Admin`, `Rechazado`.
- `stock.id_producto` UNIQUE; `remito.id_comprobante` UNIQUE; `remito.numero` UNIQUE.
- FKs con `ON DELETE RESTRICT` (no borrar historial).
- Índices: `pedido(id_cliente, fecha)`, `comprobante(id_pedido)`, `estados_pedidos(id_pedido, fecha)`, `estados_comprobante(id_comprobante, fecha)`, `alerta_de_estado(id_stock, atendida)`.

---

## 5. RLS y Storage

- `producto` y `stock`: lectura pública solo de productos activos; escritura solo service role.
- `cliente`, `pedido`, `detalle_del_pedido`, `comprobante`, `remito`, `alerta_de_estado`: sin acceso anónimo; solo service role o políticas por perfil.
- `admin`/`roll`: fase 2.
- Bucket `comprobantes`: privado. Si el Admin necesita ver la imagen, generar signed URL desde el servidor; no exponer el bucket público.
- Verificar que la anon key no pueda leer `cliente` ni `admin`.

---

## 6. Limpieza de datos de prueba

La base nueva tiene datos inconsistentes. Si son de prueba, se pueden resetear; confirmalo antes de borrar:

- Productos 1 y 2 duplicados.
- Pedido 1 total 5000 vs comprobante 5400.
- Pedido 6 total 3600 vs comprobante 2400.
- Todos los detalles “Pendiente” aunque el pedido esté “Pago Validado”.
- `pedido.id_estado` de los pedidos 3, 4 y 6 apunta a la fila de estado del pedido 1.
- `cliente.id_carrito` null y `detalle_carrito` vacío.

---

## 7. Preguntas para Isabella

1. ¿Mantenemos los nombres físicos actuales (`estados_pedidos`, `remitos_de_venta`, `alerta_de_estado`) o los pasamos a singular (`estado_pedido`, `remito_venta`, `alerta_stock`)? Recomiendo mantener los actuales para reducir la migración.
2. ¿`cliente.dni` y `cliente.email` son únicos? Para checkout invitado, ¿se crea un cliente por pedido o se reutiliza por email?
3. ¿`comprobante` permite varios intentos por pedido? El modelo dice que sí; el remito se genera solo con el aprobado.
4. ¿`stock.porcentaje` se mantiene como columna calculada o se elimina?
5. ¿`alerta_de_estado` necesita `mes`/`ano` para el informe académico, o alcanza `fecha`?
6. ¿Los datos actuales se resetean o se migran?

---

## 8. Mensaje listo para enviar

> Isabella: aprobamos el modelo normalizado del e-commerce. Está en `docs/MODELO.md` y el brief de DDL en `docs/HANDOFF-ISABELLA.md`. Necesitamos que revises tablas, constraints, índices, RLS y limpieza de datos del proyecto `otjph...`. El MVP termina en Pago Validado + remito, sin envío; carrito en cliente y admin con Basic Auth. Cuando tengas el DDL, avisá y migramos el código. Gracias.
