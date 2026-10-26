# ADR 0004 · Reconstrucción del esquema MVP en Supabase

- **Fecha:** 2026-10-22
- **Estado:** aceptada (pendiente de aplicar en producción)
- **Responsable del DDL:** Isabella Infante
- **Contexto:** [`AUDITORIA_BD.md`](../estado/AUDITORIA_BD.md) · [`MODELO.md`](../MODELO.md)

## Contexto

La base `otjphjnrwihqzzhbfnmh` tiene 13 tablas del DER académico con defectos estructurales:
FKs recíprocas (`producto.id_stock` ↔ `stock.id_producto`), `pedido.id_estado` apuntando al historial,
`detalle_del_pedido` sin PK y `estados_comprobante` colgando de `pedido` en lugar de `comprobante`.
Además no hay RLS: la anon key lee y escribe todo.

Corregir esto con `ALTER TABLE` encadenados deja columnas muertas, FKs que hay que recrear y un historial
que no se puede reasignar (los estados no guardan a qué comprobante pertenecen). La base solo contiene
datos de prueba.

## Decisión

Reconstruir el esquema del MVP con migraciones versionadas en `supabase/migrations/`, en este orden:

1. Respaldo de las tablas legacy en `respaldo_legacy` (idempotente, cerrado a `anon`).
2. Reconstrucción de las 10 tablas canónicas, vista de catálogo, constraints e índices.
3. Reglas de negocio en la base (triggers) y 4 RPC.
4. RLS y permisos.
5. Bucket privado de comprobantes.

Los datos de prueba **no se migran**: se reemplazan por `supabase/seed.sql`.

## Consecuencias

- **Positivas:** un solo esquema, invariantes garantizados por la base, RLS real, historial auditable,
  contrato tipado (`src/lib/database.types.ts`) y 59 tests que lo respaldan.
- **Negativas:** la aplicación legacy deja de funcionar contra estas tablas hasta que se migre el código
  (ya estaba roto: consulta nombres que no existen en la base nueva).
- **Riesgo:** la migración es destructiva. Se mitiga con el respaldo del paso 1, un dump previo y el test
  `tests/db/migracion-legacy.test.ts`, que la corre contra una copia fiel del esquema viejo.

## Alternativas descartadas

- **ALTER incremental:** no resuelve el historial mal referenciado y deja columnas muertas.
- **Nuevo schema `esencia`:** obliga a reconfigurar `search_path` y el cliente de Supabase; más riesgo que beneficio.
- **Migrar los datos de prueba:** no hay forma de decidir cuál de los totales cruzados es el correcto.
