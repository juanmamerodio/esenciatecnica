# Spec · Base de datos MVP (Esencia Técnica)

> **Feature:** `bd-mvp` · **Estado:** aprobada para implementación · **Fecha:** 2026-10-22.
> **Responsable DDL:** Isabella Infante · **Implementación:** esta sesión.
> **Fuente de verdad:** [`docs/MODELO.md`](../../MODELO.md) + [`docs/HANDOFF-ISABELLA.md`](../../HANDOFF-ISABELLA.md).
> **Proceso:** `docs/brain.md` §3 (spec antes de codificar) y §7 (TDD obligatorio).

---

## 1. Problema

La base `otjphjnrwihqzzhbfnmh` conserva el esquema legacy: FKs recíprocas, `pedido.id_estado`
circular, `detalle_del_pedido` sin PK, `estados_comprobante` colgando de `pedido` en vez de
`comprobante` y **RLS ausente** (la anon key lee y escribe todo, incluidos DNI, emails y la
contraseña de `admin`).

El front no se puede construir contra un esquema que no garantiza totales, reservas ni estados.
Esta spec cierra el contrato de datos del MVP y sus pruebas.

## 2. Solución

Migraciones SQL versionadas en `supabase/migrations/` que:

1. Respaldan las tablas legacy en `respaldo_legacy` antes de tocar nada.
2. Crean el esquema canónico de `MODELO.md` (sin FKs recíprocas, una sola dirección por relación).
3. Hacen cumplir las reglas por constraint/trigger, no por convención del cliente.
4. Exponen 4 RPC como interfaz pública del dominio.
5. Activan RLS y revocan escritura anónima.

## 3. Historias y criterios de aceptación

### HU-1 · Contrato de catálogo

**Como** front, **quiero** leer productos activos con su stock disponible **para** pintar el catálogo.

- **Given** un producto `activo = true` con stock 10 y reservado 3,
- **When** el front consulta `producto`/`stock`,
- **Then** recibe `precio` numérico, `imagen_url`, `cantidad_actual`, `cantidad_reservada` y
  disponible = 7.
- **Given** un producto `activo = false`, **Then** no aparece en el catálogo público.
- **Given** un producto sin fila en `stock`, **Then** el catálogo sigue funcionando (disponible 0).

### HU-2 · Confirmar pedido (reserva)

**Como** Cliente, **quiero** confirmar el pedido **para** reservar stock.

- **Given** stock disponible 5, **When** `crear_pedido` con cantidad 3, **Then** se crea el pedido en
  `Pendiente de Pago`, el detalle queda con `subtotal` calculado y `cantidad_reservada` pasa a 3.
- **Given** disponible 2, **When** `crear_pedido` con cantidad 3, **Then** falla con
  `stock insuficiente` y **no** cambia ninguna fila.
- **Given** un `id_producto` inexistente o inactivo, **Then** falla y no reserva.
- **Given** el mismo producto repetido en el carrito, **Then** se rechaza (una línea por producto).

### HU-3 · Aprobar comprobante

**Como** Administrador, **quiero** aprobar **para** convertir la reserva en venta y emitir remito.

- **Given** pedido total 5000 y comprobante 5000, **When** `aprobar_comprobante`, **Then** el pedido
  pasa a `Pago Validado`, `cantidad_actual -= n`, `cantidad_reservada -= n`, nace **un** remito con
  `numero` único y el historial registra ambos estados.
- **Given** comprobante 5400 sobre pedido 5000, **Then** falla con `monto no coincide` y no cambia stock.
- **Given** un comprobante ya aprobado, **Then** falla con `comprobante no está pendiente` (idempotencia).
- **Given** dos aprobaciones concurrentes, **Then** solo una crea remito (`id_comprobante` UNIQUE).

### HU-4 · Rechazar comprobante

- **Given** pedido con reserva, **When** `rechazar_comprobante`, **Then** el pedido pasa a `Rechazado`,
  `cantidad_reservada -= n`, `cantidad_actual` **no** cambia.
- **Given** el pedido rechazado, **Then** no se puede aprobar después.

### HU-5 · Pedido vencido (cron de viernes)

- **Given** pedido `Pendiente de Pago` sin comprobante aprobado, **When** `cancelar_pedidos_vencidos()`,
  **Then** pasa a `Cancelado` y libera la reserva.
- **Given** pedido `Pago Validado`, **Then** no se toca.

### HU-6 · Integridad estructural

- `PEDIDO.total = SUM(DETALLE_PEDIDO.subtotal)` siempre, incluso si el detalle se borra o edita.
- `subtotal` es columna generada: no se puede insertar un valor inconsistente.
- `COMPROBANTE.monto` y `DETALLE.precio_unitario` son `NUMERIC(12,2)`.
- Un comprobante pendiente por pedido como máximo.
- No hay FKs recíprocas ni `pedido.id_estado`.

### HU-7 · Seguridad (RLS)

- **Given** la anon key, **When** lee `producto` activo / `stock`, **Then** 200.
- **Given** la anon key, **When** lee `cliente`, `pedido`, `comprobante`, `remito`, `alerta` o `admin`,
  **Then** 0 filas.
- **Given** la anon key, **When** inserta, actualiza o borra en cualquier tabla, **Then** error de permisos.
- El bucket `comprobantes` es privado.

## 4. Seams bajo test (interfaz pública)

| Seam | Qué cubre | Qué deja afuera |
|---|---|---|
| `crear_pedido(bigint, jsonb)` | checkout, reserva, total | forma del carrito en el front |
| `aprobar_comprobante(bigint)` | venta, stock, remito | envío del email |
| `rechazar_comprobante(bigint)` | liberación de reserva | motivo mostrado en UI |
| `cancelar_pedidos_vencidos()` | cron viernes | scheduler real (Vercel Cron) |
| Contrato de tablas | lectura del front | componentes y estilos |
| Superficie RLS `anon` | fuga de datos | seguridad de la service role |

No se testean internals (nombres de triggers, OIDs ni planes).

## 5. Fuera de alcance

- Envío, seguimiento, estados post-venta.
- Carrito persistente, cuentas de Cliente, `admin`/`roll` (fase 2).
- Validación por IA.
- Emails (Resend) y generación del PDF/HTML del remito.
- Datos reales: la migración reemplaza datos de prueba.

## 6. Decisiones abiertas (no bloquean)

1. `cliente.email` y `cliente.dni` únicos → se asume único por email para checkout invitado.
2. Nombres físicos en plural (`estados_pedidos`, `remitos_de_venta`, `alerta_de_estado`) → se mantienen.
3. Datos de prueba → se respaldan y se reemplazan por seed canónico.
