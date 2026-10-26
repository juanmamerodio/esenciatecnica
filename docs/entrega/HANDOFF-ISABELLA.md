# Handoff a Isabella Infante · Modelo de datos MVP

> **Para:** Isabella Infante — Database & SQL Architecture.
> **De:** Juan Manuel Merodio / equipo de e-commerce.
> **Fecha:** 2026-10-22 (actualizado 2026-10-26).
> **Estado:** modelo normalizado aprobado y **versionado en `supabase/migrations/`**; falta **aplicarlo**
> en `otjph` y dejar `npm run bd:viva` en verde.
> **Referencia:** [`MODELO.md`](../MODELO.md) y [`AUDITORIA.md`](../estado/AUDITORIA.md).

> [!IMPORTANT]
> **Este documento es el brief de diseño, no el paso a paso.** El DDL ya está escrito: son los seis
> archivos de `supabase/migrations/` y ya están verdes en PGlite. Lo que falta es **aplicarlos en orden
> sobre el proyecto vivo**, respaldar antes y cerrar con el control automático.
> El instructivo operativo, con el orden exacto, los prompts y el criterio de cierre, está en
> **[`GUIA-ISABELLA.md`](GUIA-ISABELLA.md)** → issue
> [#15](https://github.com/juanmamerodio/esenciatecnica/issues/15).
>
> Medido el 2026-10-26 con `npm run bd:viva`: **ROJO, 13 desajustes**. La RLS ya está bien; de
> "RLS y Storage" solo faltan los dos buckets. Y ojo: la migración `00` **no respalda nada**, porque su
> marcador `producto.id_stock` ya no existe en `otjph` — el respaldo va a mano, antes de `01`.

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

1. Revisar el ERD de [`MODELO.md`](../MODELO.md) y confirmar tablas/columnas.
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

## 8. Anexo · T7 (2026-10-25): bucket público de fotos de producto

La migración `04` sólo crea el bucket **privado** `comprobantes`. El panel `/admin` (T7 · issue #13) también
sube las **fotos de producto**, que son contenido público de la tienda: la migración
`supabase/migrations/20261023090500_05_storage_productos.sql` crea el bucket `productos`. **Es DDL para tu
revisión: no lo aplicamos a producción desde acá.**

```sql
-- 05 · Bucket público de fotos de producto (solo Supabase: el esquema `storage` no existe en PGlite).
-- La foto es contenido público de la tienda: se sirve por URL pública y `producto.imagen_url` la guarda.

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'productos',
      'productos',
      true,
      5242880,
      array['image/png', 'image/jpeg', 'image/webp']
    )
    on conflict (id) do update
      set public = true,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end
$$;
```

Qué falta de tu lado:

1. **Convención de clave:** `productos/<id_producto>/<nombre-saneado>.<ext>`, con `upsert` en la misma clave
   (reemplaza la foto, no acumula objetos sueltos).
2. **Políticas de Storage:** la subida pasa **siempre** por el servidor con la service role (no hay política
   de escritura para `anon`); la lectura se resuelve con el bucket público. Si preferís una política explícita
   de lectura para `anon`, decilo y la agregamos.
3. **`producto.imagen_url`** guarda la URL pública del objeto (decisión registrada en
   [`MODELO.md`](../MODELO.md) §9 y en [`specs/admin/spec.md`](../specs/admin/spec.md) §6.5). El bucket
   `comprobantes` **sigue privado** y con signed URL: no se toca.

---

## 9. Mensaje listo para enviar

> Isabella: el modelo normalizado ya está aprobado **y versionado**: el DDL son las seis migraciones de
> `supabase/migrations/`, y están verdes en la suite local. Lo que falta es aplicarlas en `otjph` **en
> orden** (`00 → 01 → 02 → 03 → 04 → 05`), recargar el cache de PostgREST y dejar `npm run bd:viva` en
> verde.
>
> **Antes de `01`, respaldá a mano**: la migración `00` no respalda porque usa `producto.id_stock` como
> marcador y esa columna ya no existe. Y no se puede asumir que las tablas protegidas por RLS estén
> vacías: no se pueden contar desde afuera.
>
> El paso a paso completo, con el orden, los prompts para Claude Code y el criterio de cierre, está en
> `docs/entrega/GUIA-ISABELLA.md`: https://github.com/juanmamerodio/esenciatecnica/blob/main/docs/GUIA-ISABELLA.md
>
> Tu ticket es el issue #15. La RLS ya está bien: de "RLS y Storage" solo faltan los dos buckets.
