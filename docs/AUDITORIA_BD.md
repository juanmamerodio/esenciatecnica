# Auditoría de la base de datos · E-commerce MVP

> **Fecha:** 2026-10-22, re-observada el **2026-10-23** (§3.5) · **Alcance:** proyecto Supabase `otjphjnrwihqzzhbfnmh` (e-commerce).
> **Método:** introspección de solo lectura con la anon key + lectura del esquema por PostgREST + pruebas
> ejecutables contra PostgreSQL 17 real (PGlite/WASM) con las migraciones de `supabase/migrations/`.
> **Referencias:** [`MODELO.md`](MODELO.md) · [`HANDOFF-ISABELLA.md`](HANDOFF-ISABELLA.md) · [`spec`](specs/bd-mvp/spec.md).
> **Autor:** agente de implementación · **Responsable DDL:** Isabella Infante.

---

## 1. Veredicto

| Destino | Estado | Motivo |
|---|---|---|
| **Contrato para el front** | 🟢 **OK** | Tablas, vista y 4 RPC congeladas y cubiertas por 59 tests. Tipos en `src/lib/database.types.ts`. |
| **Base de producción** | 🔴 **NO OK** | Sigue con el esquema legacy y **sin RLS**: la anon key lee y escribe todo. |
| **Migración lista para aplicar** | 🟢 **OK** | Las 5 migraciones (`20261023090000_00_…` → `…_04_…`) probadas contra el esquema legacy simulado, con privilegios por defecto de Supabase. La 04 (Storage) queda sin cobertura automática (§8.3). |

**Conclusión:** el front **puede empezar ya** contra el contrato de la §9. **No puede salir a producción**
hasta aplicar la migración y verificar la §10. El único bloqueo es operativo: falta la
`SUPABASE_SERVICE_ROLE_KEY` (o el password de la base) para ejecutar el DDL.

---

## 2. Qué se auditó y cómo

| Evidencia | Cómo se obtuvo | Límite |
|---|---|---|
| Tablas, columnas y datos reales | `GET /rest/v1/<tabla>` con la anon key | Solo lo que la RLS deja ver (hoy: todo) |
| Permisos reales de la anon key | `DELETE`/`PATCH` con filtro imposible (`id = -999999`) y `POST` inválido | No se escribió ni borró ninguna fila |
| Reglas e integridad | 59 tests Vitest + PGlite sobre las migraciones | PGlite ≠ Supabase en extensiones/Storage |
| Permisos reales de los roles | Tests con los privilegios por defecto de Supabase simulados + llamada efectiva como `anon` | — |
| Tipos y constraints del esquema nuevo | `npm run db:types` desde `information_schema` | — |
| Esquema legacy exacto (tipos, índices) | **No verificable** | Requiere service role o `psql` |

Las pruebas de escritura usaron filtros que no matchean ninguna fila: si la operación se permite,
devuelve 204 sin tocar datos; si está denegada, devuelve error. No se modificó la base.

---

## 3. Hallazgos

### 3.1 Críticos (P0) — bloquean producción

| # | Hallazgo | Evidencia | Control que lo cierra |
|---|---|---|---|
| P0-1 | **RLS ausente en todas las tablas.** La anon key puede leer, insertar, actualizar y borrar. | `DELETE producto?id=-999999` → **204**; `PATCH pedido` → **204**; `DELETE cliente` → **204**; `DELETE admin` → **204**; `POST producto` llegó a violar la PK (la escritura estaba permitida). **Confirmado otra vez el 2026-10-23.** | `0003_03_rls.sql`: RLS + `REVOKE ALL` + políticas solo de lectura del catálogo. |
| P0-2 | **Datos personales expuestos.** `cliente.dni`, `email` y `telefono` eran legibles con la clave pública. | `select * from cliente` → 200 con 1 fila el 2026-10-22; el 2026-10-23 la tabla quedó vacía (ver §3.5). | RLS sin políticas + revocación de grants para `anon`/`authenticated`. |
| P0-3 | **Credencial de admin en texto plano y legible.** `admin.contrasenia` sin hash. | `select * from admin` → 200 con `dni`, `nombre` y `contrasenia` el 2026-10-22; vacía el 2026-10-23. | Tabla cerrada por RLS; el MVP autentica con `ADMIN_PASSWORD` (Basic Auth). **Rotar la clave igual.** |
| P0-4 | **Cualquiera puede destruir el negocio.** Un tercero con la anon key puede borrar filas o alterar precios. | Mismos 204 de P0-1 sobre `pedido` y `producto`. **Se materializó: entre el 22 y el 23 desaparecieron 8 de las 13 tablas con datos** (§3.5). | Igual que P0-1 + RPC `SECURITY DEFINER` solo para `service_role`. |
| P0-5 | **Trampa al cerrar permisos: `REVOKE ... FROM public` no alcanza en Supabase.** Los roles `anon`/`authenticated` reciben `EXECUTE` **directo** por `ALTER DEFAULT PRIVILEGES`; ese grant sobrevive al revoke de `PUBLIC`, y `has_function_privilege` puede devolver `false` mientras la función se ejecuta igual. | Reproducido con PGlite: con default privileges estilo Supabase, `anon` **ejecutaba** la función tras el revoke de `PUBLIC`; con `REVOKE ... FROM anon, authenticated` quedó denegada. | `0003_03_rls.sql` revoca de `public, anon, authenticated`; `tests/db/rls-supabase.test.ts` lo fija; la verificación del runbook ejecuta como `anon` en vez de consultar el catálogo. |

### 3.2 Altos (P1) — rompen el modelo

| # | Hallazgo | Evidencia | Control |
|---|---|---|---|
| P1-1 | `pedido.id_estado` apunta a `estados_pedidos`, que es **historial**, no lookup. Pedidos 3, 4 y 6 apuntan a la fila del pedido 1. | `pedido.id_estado = 1` en 3 de 4 pedidos. | Se elimina; `estado_actual` con CHECK. |
| P1-2 | `estados_comprobante` cuelga de `pedido` (`id_pedido`), no de `comprobante`. Con varios intentos no se sabe qué estado es de qué comprobante. | 6 filas con `id_pedido`. | `id_comprobante` FK + índice `(id_comprobante, fecha)`. |
| P1-3 | `detalle_del_pedido` **no tiene PK** y duplica `id_cliente`, `estado`, `fecha` y `total`. | Columnas reales observadas. | PK propia, `subtotal` generado, sin columnas duplicadas. |
| P1-4 | Nada garantiza `PEDIDO.total = SUM(subtotal)`. | Pedido 1 total **5000** vs comprobante 1 **5400**; pedido 6 **3600** vs comprobante 4 **2400**; remito 3 **3600** atado a comprobante de **2400**. | `subtotal` generado + trigger `detalle_recalcula_total`. |
| P1-5 | El remito no tiene `numero` único ni unicidad por comprobante. | Sin `numero`; `producto_selec` como texto libre. | `numero UNIQUE` con secuencia + `id_comprobante UNIQUE`. |
| P1-6 | Nada impide aprobar un comprobante de monto distinto al pedido. | Datos inconsistentes ya existentes. | `aprobar_comprobante` compara `monto = total` y aborta. |

### 3.3 Medios (P2) — deuda de datos y modelo

| # | Hallazgo | Evidencia | Control |
|---|---|---|---|
| P2-1 | Productos 1 y 2 duplicados (mismo nombre y precio). | Dos filas “Crema Hidratante Facial” a 2500. | Índice único parcial `lower(nombre) where activo` + seed sin duplicados. |
| P2-2 | Secuencia de `producto` desfasada: el próximo insert intenta `id = 2` con `id = 3` ya usado. | `POST producto` → `Key (id_producto)=(2) already exists`. | `GENERATED ALWAYS AS IDENTITY` + tablas reconstruidas. |
| P2-3 | `stock` duplica `categoria`, `tipo`, `descripcion` y `porcentaje` del producto. | Columnas reales. | Columnas eliminadas; el disponible se calcula en `vista_catalogo`. |
| P2-4 | `alerta_de_estado` guarda `mes`, `ano`, `porcentaje`, `descripcion` y `email_contacto`, pero no `atendida` ni `mensaje`. | Columnas reales; `ano` sin tilde. | `mensaje`, `atendida`, una alerta abierta por stock. |
| P2-5 | `remitos_de_venta.producto_selec` duplica el detalle en texto. | 2 filas con nombre de producto. | Se elimina; el detalle vive en `detalle_del_pedido`. |
| P2-6 | `estados_pedidos` tiene 6 filas “Pago Validado” idénticas para el pedido 1. | `fecha` sin hora: no se puede ordenar. | Historial con `timestamptz` + orden por PK. |

### 3.4 Bajos (P3)

- `roll` es typo de `rol`; `detalle_carrito` vacío y sin uso en el MVP.
- `admin.contrasenia` no se usa para autenticar (Basic Auth), pero sigue expuesta: se cierra igual.
- Nombres físicos en plural (`estados_pedidos`, `remitos_de_venta`, `alerta_de_estado`): se mantienen.

### 3.5 Re-observación del 2026-10-23 — el riesgo P0-4 se materializó

Segunda lectura, misma base, misma anon key:

| Tabla | 2026-10-22 | 2026-10-23 |
|---|---:|---:|
| `producto` | 3 | 3 |
| `stock` | 3 | 3 |
| `cliente` | 1 | **0** |
| `pedido` | 4 | **0** |
| `detalle_del_pedido` | 3 | **0** |
| `comprobante` | 3 | **0** |
| `estados_pedidos` | 9 | **0** |
| `estados_comprobante` | 6 | **0** |
| `remitos_de_venta` | 2 | **0** |
| `alerta_de_estado` | 1 | **0** |
| `admin` | 1 | **0** |
| `roll` | 2 | **0** |

Conclusiones:

1. **Se perdieron los datos de prueba sin que nada lo impidiera.** Con RLS ausente, cualquier proceso con
   la anon key pudo vaciarlas. Es exactamente el escenario P0-4, ahora con evidencia.
2. **El esquema sigue siendo legacy.** `producto.activo`, `pedido.estado_actual`, `comprobante.monto` y
   `remitos_de_venta.numero` siguen sin existir: nadie aplicó las migraciones.
3. **La exposición sigue abierta.** `DELETE`/`PATCH` con filtro imposible devuelven **204** en
   `producto`, `cliente` y `pedido`, igual que el 22.
4. **Impacto en el runbook:** el respaldo previo ahora copia 3 productos, 3 stocks y tablas vacías. El
   valor histórico de esos datos ya no existe, lo que **refuerza** que reconstruir con `seed.sql` es la
   decisión correcta y que la migración debe aplicarse cuanto antes.
5. **No se puede atribuir la pérdida** (no hay historial de auditoría accesible sin service role). Si
   alguien ejecutó una limpieza manual, queda documentado igual: la base no protege nada.

---

## 4. Matriz de riesgo

| Riesgo | Probabilidad | Impacto | Nivel | Estado |
|---|---|---|---|---|
| Fuga de DNI/emails/teléfonos | Alta (hoy es explotable) | Alto | 🔴 | Mitigado en DDL, **pendiente aplicar** |
| Borrado/alteración masiva por anon | Alta | Crítico | 🔴 | Mitigado en DDL, **pendiente aplicar** |
| Venta con stock negativo o sobreventa | Media | Alto | 🟠 | Cerrado por constraints + RPC |
| Totales inconsistentes con el comprobante | Alta (ya ocurrió) | Medio | 🟠 | Cerrado por trigger + validación |
| Doble remito por el mismo comprobante | Media | Medio | 🟠 | Cerrado por `UNIQUE` |
| Pérdida de datos al migrar | Baja | Crítico | 🟠 | Respaldo `respaldo_legacy` + test de migración |
| `numeric` con decimales mal redondeados | Baja | Medio | 🟡 | `NUMERIC(12,2)` en toda la cadena |

---

## 5. Calidad de los datos actuales

Los datos son de prueba y **no se migran**: la migración reconstruye las tablas y los reemplaza por
`supabase/seed.sql`. Antes de reconstruir, copia todo a `respaldo_legacy` (mismo esquema de columnas,
sin constraints), protegido de `anon`. Se pierden a propósito: los duplicados y los totales cruzados no
tienen reparación posible sin decidir cuál es el dato bueno.

> **Actualización 2026-10-23:** gran parte de esos datos ya no existe (§3.5). Quedan `producto` (con los
> duplicados 1 y 2) y `stock`. El respaldo sigue siendo útil por trazabilidad, pero el catálogo canónico
> sale de `seed.sql`.

---

## 6. Qué entrega esta auditoría

| Artefacto | Qué resuelve |
|---|---|
| `supabase/migrations/20261023090000_00_respaldo_legacy.sql` | Respaldo idempotente antes de tocar nada. |
| `supabase/migrations/20261023090100_01_esquema_mvp.sql` | 10 tablas canónicas, vista de catálogo, constraints e índices. |
| `supabase/migrations/20261023090200_02_reglas_y_rpc.sql` | Historial automático, total derivado, alertas y 4 RPC. |
| `supabase/migrations/20261023090300_03_rls.sql` | RLS, grants y permisos de ejecución. |
| `supabase/migrations/20261023090400_04_storage_comprobantes.sql` | Bucket privado `comprobantes`. |
| `supabase/seed.sql` | Catálogo canónico sin duplicados. |
| `tests/db/*.test.ts` | 59 pruebas de contrato, reglas, RLS, permisos y migración legacy. |
| `src/lib/database.types.ts` | Contrato tipado para el front (generado con `npm run db:types`). |

---

## 7. Evidencia de las pruebas

```bash
npm test        # 59 tests, 7 archivos, PostgreSQL 17 (PGlite)
npm run db:types # regenera src/lib/database.types.ts desde el SQL
```

| Archivo | Qué prueba |
|---|---|
| `contrato.test.ts` | Forma de tablas, columnas prohibidas, `NUMERIC(12,2)`, stock automático. |
| `pedidos.test.ts` | Reserva, disponible real, carrito inválido, total derivado. |
| `aprobacion.test.ts` | Aprobación, remito, monto, rechazo, vencimiento, doble remito y cron idempotente. |
| `rls.test.ts` | La anon key: contrato del catálogo, qué **no** lee y qué no puede escribir. |
| `rls-supabase.test.ts` | RLS con los privilegios por defecto de Supabase y llamada efectiva como `anon`. |
| `migracion-legacy.test.ts` | Migración sobre el esquema viejo con FKs recíprocas y datos cruzados. |
| `seed.test.ts` | Catálogo canónico, idempotencia y alerta de stock. |

---

## 8. Lo que no se pudo verificar

1. **Tipos e índices exactos del esquema legacy** (sin `psql`/service role).
2. **Políticas RLS actuales** (no hay función de introspección accesible con anon).
3. **Storage**: PGlite no tiene el esquema `storage`; la migración 04 es un no-op en tests y se aplica recién en Supabase. Es el único artefacto **sin cobertura automática**.
4. **Comportamiento de PostgREST** con las RPC nuevas (se validó el SQL, no el endpoint HTTP).
5. **Concurrencia real**: el `UNIQUE` de remito está probado; el bloqueo `FOR UPDATE` se revisó por lectura, no con carga paralela. Los tres bucles de detalle (`crear_pedido`, `aprobar_comprobante`, `rechazar_comprobante`, `cancelar_pedidos_vencidos`) recorren ordenados por `id_producto` para tomar locks siempre en el mismo orden, pero **no hay prueba de carga** que lo confirme bajo contención.
6. **Redondeo/overflow de `NUMERIC(12,2)`** en el borde (≈10¹⁰): el tipo es correcto para el rango esperado, sin test de límite.

### 8.1 Decisiones de diseño que conviene conocer

- Los triggers de historial y de total son `SECURITY DEFINER`: escriben como owner y por lo tanto **no pasan por la RLS**. Es intencional (si no, no podrían mantener el historial), pero significa que el camino de los triggers queda fuera de las políticas.
- `cantidad_warning = 0` significa “sin umbral”: ese producto nunca genera alerta.
- `monto > 0` en el comprobante contra `total >= 0` en el pedido: un pedido de total 0 no podría acreditarse. El MVP no contempla productos de precio 0.

---

## 9. Contrato congelado para el front

**Lectura pública (anon):** `vista_catalogo` (precio, imagen, `disponible`) y `producto`/`stock`
(solo activos). **Todo lo demás** exige servidor con service role.

| RPC | Args | Devuelve | Regla |
|---|---|---|---|
| `crear_pedido` | `p_id_cliente: int`, `p_items: jsonb` `[{id_producto, cantidad}]` | fila `pedido` | Reserva stock, calcula total, rechaza si no hay disponible. |
| `aprobar_comprobante` | `p_id_comprobante: int` | fila `remitos_de_venta` | Exige `monto = total`, descuenta stock y emite remito. |
| `rechazar_comprobante` | `p_id_comprobante: int` | fila `pedido` | Libera reserva y cierra el pedido. |
| `cancelar_pedidos_vencidos` | — | `int` | Cancela pendientes; lo dispara el cron del viernes. |

**Estados:** pedido `Pendiente de Pago → Pago Validado | Rechazado | Cancelado`; comprobante
`Comprobante Subido → Aprobado por Admin | Rechazado`.

**Errores de negocio (SQLSTATE):** `ET001` stock insuficiente · `ET002` producto/cliente inexistente ·
`ET003` carrito inválido · `ET004` comprobante no pendiente · `ET005` monto no coincide ·
`ET006` pedido no pendiente.

**Tipos:** importar de `src/lib/database.types.ts`. Las columnas de vista figuran nullable porque
PostgreSQL no conserva `NOT NULL` en vistas: validar con Zod en el borde.

---

## 10. Runbook de aplicación (gate único)

1. **Respaldar** (el paso 00 ya lo hace, pero Supabase conviene un dump):
   `pg_dump "$DATABASE_URL" > respaldo_$(date +%F).sql`.
2. Pegar en el **SQL Editor** de Supabase, en orden:
   `20261023090000_00_…`, `…_01_…`, `…_02_…`, `…_03_…`, `…_04_…`.
   Pegá **el archivo completo** de una vez: Postgres ejecuta el script en una sola transacción implícita
   y no queda a medias. No corras sentencia por sentencia. **No re-apliques** las migraciones: la 01
   reconstruye las tablas y volver a correrla borra los datos.
3. Correr `supabase/seed.sql` una vez (solo si la base es de demo).
4. Recargar el caché de PostgREST: `notify pgrst, 'reload schema';`.
5. Verificar:

```sql
-- 1) RLS activo en todas las tablas (incluido el respaldo): todo debe decir true
select n.nspname, c.relname, c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname in ('public','respaldo_legacy') and c.relkind = 'r'
 order by 1, 2;

-- 2) Sin FKs recíprocas ni columnas legacy
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'producto'
   and column_name in ('id_stock','id_detalle_pedido');   -- 0 filas

-- 3) El respaldo existe y guarda la traza de lo que había antes
select count(*) from respaldo_legacy.producto;            -- 3 (estado del 2026-10-23)

-- 4) El catálogo final sale del seed, no del respaldo
select count(*) from public.producto;                     -- 2 (seed canónico)

-- 5) anon NO debe poder ejecutar las RPC.
--    OJO: `has_function_privilege` puede mentir (devuelve false mientras anon ejecuta igual,
--    porque Supabase concede EXECUTE directo por default privileges). Verificá ejecutando:
set role anon;
select crear_pedido(1, '[]'::jsonb);                      -- debe fallar: permission denied
select aprobar_comprobante(1);                            -- debe fallar: permission denied
reset role;
```

La comprobación 5 se hace **ejecutando como `anon`**, no consultando el catálogo de privilegios: es el
único chequeo que prueba el efecto real. La suite lo cubre en `tests/db/rls-supabase.test.ts`.

También probá con la anon key (debe fallar):

```bash
# bash / macOS / Linux
curl -s -o /dev/null -w "%{http_code}\n" \
  "$SUPABASE_URL/rest/v1/cliente?select=*" -H "apikey: $ANON_KEY"   # 401/403 o []
```

```powershell
# PowerShell
(Invoke-WebRequest "$env:SUPABASE_URL/rest/v1/cliente?select=*" -Headers @{ apikey = $env:ANON_KEY } -SkipHttpErrorCheck).StatusCode
```

6. **Rollback:** las tablas nuevas se pueden volver a crear desde `respaldo_legacy` si algo falla;
   guardar el dump del paso 1 hasta validar el front.

---

## 11. Riesgos residuales y decisiones para Isabella

1. `cliente.dni` y `cliente.email` quedaron **únicos** (email case-insensitive). Confirmar criterio de checkout invitado.
2. `fecha` del historial pasó de `date` a `timestamptz` (el `date` no permite ordenar dos cambios del mismo día).
3. Nombres físicos en plural: se mantienen para reducir la migración.
4. Se elimina `detalle_carrito` (fase 2, vacía); `admin`/`roll` se conservan pero cerrados.
5. La migración **reemplaza datos de prueba**; no migra el catálogo legacy de laboratorio.
6. La contraseña de `admin` estuvo expuesta: **rotarla** aunque la tabla quede cerrada.
