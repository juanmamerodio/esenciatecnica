# Modelo de dominio · MVP

> **Estado:** aprobado el 2026-10-22.
> **Decisiones:** modelo normalizado; MVP sin envío; carrito en cliente con cookies; Admin con Basic Auth; remito HTML; tests con Vitest; validación manual sin IA.
> **Responsable de la base:** Isabella Infante (SQL). La auditoría del esquema está en [`AUDITORIA_BD.md`](./estado/AUDITORIA_BD.md).
> **Criterio:** el código es la realidad operativa; el DER académico se adapta al código y ambos convergen en este modelo.

---

## 1. Alcance del MVP

**Incluye:**

- Catálogo de cosmética e higiene.
- Carrito en el cliente (cookie/localStorage), sin persistencia en Supabase.
- Pedido con reserva de stock.
- Comprobante con validación manual por los Administradores de Química.
- Remito de venta por email (HTML) al aprobar el comprobante.
- Panel `/admin` con pedidos, stock, alertas y remito.
- Alerta de stock en el panel, sin email al Administrador.

**No incluye (fase 2):**

- Envío, seguimiento o estados `En Preparación`, `Enviado`, `Entregado`.
- Cuentas de Cliente y carrito persistente en Supabase.
- Administradores en base (`ADMIN`/`ROL`); el MVP usa Basic Auth con `ADMIN_PASSWORD`.
- Validación por IA. En el sistema final no existe; el código legacy que la menciona se retira.

---

## 2. ERD del MVP

> **Nombres físicos, sin alias.** Este diagrama usa los nombres exactos de las tablas de `public`
> en la base viva `otjph…`. El diagrama canónico —con todas las columnas, tipos SQL, claves y
> reglas— vive en [`academico/DER.md`](./academico/DER.md) y está fijado contra el DDL ejecutable
> por `tests/front/der-paridad-esquema.test.ts`. Acá se muestra la estructura: una segunda copia
> completa se desincronizaría, que es exactamente el problema que este cambio cierra.

```mermaid
erDiagram
    cliente ||--o{ pedido : "realiza"
    cliente ||--o{ remitos_de_venta : "recibe"

    producto ||--|| stock : "tiene"
    producto ||--o{ detalle_del_pedido : "aparece en"

    pedido ||--o{ detalle_del_pedido : "contiene"
    pedido ||--o{ estados_pedidos : "registra"
    pedido ||--o{ comprobante : "presenta"

    comprobante ||--o{ estados_comprobante : "registra"
    comprobante ||--o| remitos_de_venta : "genera"

    stock ||--o{ alerta_de_estado : "dispara"
```

**Objetos reales de `public` (13):**

| Objeto | Tipo | Rol en el MVP |
|---|---|---|
| `cliente` | tabla | Comprador invitado; `email` único es la identidad. |
| `producto` | tabla | Catálogo con baja lógica (`activo`). |
| `stock` | tabla | Una fila por producto: actual, reservada y umbral. |
| `pedido` | tabla | Orden con `estado_actual` y `total` derivado. |
| `detalle_del_pedido` | tabla | Líneas con `subtotal` generado. |
| `estados_pedidos` | tabla | Historial auditable de las transiciones. |
| `comprobante` | tabla | Transferencia subida al bucket privado. |
| `estados_comprobante` | tabla | Historial de las revisiones manuales. |
| `remitos_de_venta` | tabla | Remito `R-YYYY-NNNNNN`, uno por comprobante. |
| `alerta_de_estado` | tabla | Aviso de stock bajo, popup en `/admin`. |
| `admin` | tabla | **Residuo de Fase 2**, cerrada por RLS; el MVP no la usa. |
| `roll` | tabla | **Residuo de Fase 2** (typo histórico de `rol`), cerrada por RLS. |
| `vista_catalogo` | vista | `security_invoker`: catálogo + `disponible` para la tienda. |

---

## 3. Reglas de integridad

- **Una sola dirección por relación.** `stock.id_producto` (no `producto.id_stock`), `estados_pedidos.id_pedido` (no `pedido.id_estado`). El carrito no tiene tablas en el MVP.
- **Estado actual + historial.** `pedido.estado_actual` y `comprobante.estado_actual` son la lectura rápida del panel; `estados_pedidos` y `estados_comprobante` son el historial auditable. Se actualizan en la misma transacción.
- **Total derivado.** `pedido.total = SUM(detalle_del_pedido.subtotal)` y `detalle_del_pedido.subtotal = cantidad × precio_unitario`.
- **Comprobante contra pedido.** `comprobante.monto` debe coincidir con `pedido.total` para que el Admin pueda aprobar.
- **Reserva.** Al confirmar el pedido: `stock.cantidad_reservada += cantidad`. Al aprobar: `cantidad_actual -= cantidad` y `cantidad_reservada -= cantidad`. Al rechazar o vencer: solo `cantidad_reservada -= cantidad`. La base rechaza con `ET007` dejar `cantidad_actual < cantidad_reservada`.
- **Dinero.** `producto.precio > 0` y `comprobante.monto > 0`: un pedido de total 0 no se puede aprobar.
- **Vencimiento.** El cron de los **viernes 23:59 (America/Argentina/Buenos_Aires)** cancela todos los pedidos `Pendiente de Pago`, rechaza su comprobante pendiente y libera la reserva. Es idempotente.
- **Disponible.** `stock.cantidad_actual - stock.cantidad_reservada`; el umbral de aviso es `cantidad_warning`.
- **Remito.** Se genera al aprobar el comprobante; es el estado final del MVP. No hay envío ni seguimiento.
- **Borrado lógico.** `producto.activo = false`; no se borran productos con historial.
- **Sin IA.** Los Administradores de Química comparan imagen y monto; no hay validación automática.
- **RLS.** Catálogo (`producto`, `stock`, `vista_catalogo`) de lectura pública; `cliente`, `pedido`, `detalle_del_pedido`, `comprobante`, `remitos_de_venta`, `alerta_de_estado` y el residuo `admin`/`roll` solo con service role o políticas por perfil. Ninguna escritura pública.

---

## 4. Estados canónicos del MVP

### 4.1 Pedido

```mermaid
stateDiagram-v2
    [*] --> PendienteDePago
    PendienteDePago --> PagoValidado: Admin aprueba el comprobante
    PendienteDePago --> Rechazado: Admin rechaza el comprobante
    PendienteDePago --> Cancelado: viernes sin comprobante aprobado
    PagoValidado --> [*]: remito emitido
    Rechazado --> [*]
    Cancelado --> [*]
```

**Valores:** `Pendiente de Pago`, `Pago Validado`, `Rechazado`, `Cancelado`.

`Pago Validado` es el estado final del MVP: descuenta stock, genera el remito y envía el email. No hay `En Preparación`, `Enviado` ni `Entregado`.

### 4.2 Comprobante

```mermaid
stateDiagram-v2
    [*] --> ComprobanteSubido
    ComprobanteSubido --> AprobadoPorAdmin: Admin aprueba
    ComprobanteSubido --> Rechazado: Admin rechaza
    AprobadoPorAdmin --> [*]
    Rechazado --> [*]
```

**Valores:** `Comprobante Subido`, `Aprobado por Admin`, `Rechazado`.

---

## 5. Fase 2 (no MVP)

Estas entidades existen en el DER académico y en la base nueva, pero el MVP no las usa. No se crean ni se migran en el primer sprint.

```mermaid
erDiagram
    CLIENTE ||--o| CARRITO : tiene
    CARRITO ||--o{ DETALLE_CARRITO : contiene
    PRODUCTO ||--o{ DETALLE_CARRITO : aparece
    ROL ||--o{ ADMIN : asigna

    CARRITO {
        int id_carrito PK
        int id_cliente FK
        date fecha_creacion
    }

    DETALLE_CARRITO {
        int id_detalle_carrito PK
        int id_carrito FK
        int id_producto FK
        int cantidad
        decimal precio_unitario
    }

    ADMIN {
        int id_admin PK
        int id_rol FK
        string dni
        string nombre
        string password_hash
    }

    ROL {
        int id_rol PK
        string descripcion
    }
```

- **Carrito:** cookie/localStorage en el cliente; se persiste recién si hay cuentas.
- **Admin/ROL:** Basic Auth con `ADMIN_PASSWORD`; Supabase Auth queda para fase 2.
- **Envío:** fuera de alcance; el remito es el documento final.

---

## 6. Modelo alternativo (plano, código legacy)

```mermaid
erDiagram
    PRODUCTO ||--o{ PEDIDO : "items JSON"
    PEDIDO ||--o{ VERIFICACION : tiene
```

Ventaja: es lo que hoy funciona contra el proyecto viejo. Desventajas: no hay `CLIENTE`, `COMPROBANTE`, `REMITO`, `STOCK` ni historial de estados; el stock es una columna del producto; la validación es por IA. **Descartado** porque contradice el DER académico y la base nueva.

---

## 7. Handoff a Isabella

El detalle de los cambios de DDL, constraints, índices, RLS y limpieza de datos está en
[`AUDITORIA_BD.md`](./estado/AUDITORIA_BD.md). Resumen:

1. Eliminar FKs recíprocas (`producto.id_stock`, `cliente.id_carrito`, `pedido.id_estado`).
2. Agregar `estado_actual` a `pedido` y `comprobante`; conservar las tablas de historial.
3. Normalizar `detalle_del_pedido` (PK propia, subtotal; sin estado/fecha/total duplicados).
4. Ajustar `producto` (nombre/descripción únicos, `activo`, `imagen_url`; sin FKs).
5. Ajustar `stock` (una fila por producto, `cantidad_actual`, `cantidad_reservada`, `cantidad_warning`).
6. Ajustar `comprobante` (`monto`, `foto_url`, `estado_actual`).
7. Ajustar `remitos_de_venta` (`numero`, sin `producto_selec`).
8. Simplificar `alerta_de_estado` (`mensaje`, `atendida`; sin email).
9. Dejar `admin`, `roll`, `detalle_carrito` para fase 2.
10. Definir RLS y limpiar los datos de prueba inconsistentes.

---

## 8. Decisiones cerradas

| Decisión | Resultado | Responsable |
|---|---|---|
| Modelo | Normalizado, ERD Mermaid | Isabella (SQL) |
| Estados MVP | Termina en `Pago Validado` + remito | Enzo |
| Envío | Fuera de alcance | Enzo |
| Carrito | Cliente, cookie/localStorage | Juanma |
| Admin | Basic Auth con `ADMIN_PASSWORD` | Enzo |
| Remito | HTML por email con Resend | Enzo |
| Tests | Vitest | Celeste |
| Validación | Manual por Administradores de Química | Enzo / Admin |

---

## 9. Implementación (2026-10-22)

El DDL ejecutable vive en `supabase/migrations/` y los tipos del front en `src/lib/database.types.ts`
(generados con `npm run db:types`). La auditoría y el runbook están en
[`AUDITORIA_BD.md`](./estado/AUDITORIA_BD.md); la decisión de reconstruir, en
[`adr/0004-reconstruccion-esquema-mvp.md`](adr/0004-reconstruccion-esquema-mvp.md).

Ajustes de implementación sobre este modelo. La columna *Cobertura* dice qué test lo fija; los que
dicen “decisión” son acuerdos de implementación, no invariantes que la base haga cumplir:

| Tema | Modelo | Implementación | Por qué | Cobertura |
|---|---|---|---|---|
| Historial `fecha` | `date` | `timestamptz` | Un `date` no permite ordenar dos cambios del mismo día. | `aprobacion.test.ts` (historial) |
| `cliente.email` | sin definir | único (`lower(email)`) | Evita clientes duplicados en checkout invitado. El DNI **no** es clave de identidad: solo valida formato (`^[0-9]{7,8}$`). | `contrato.test.ts` |
| Nombres | el diagrama usaba lógicos en singular (`ESTADO_PEDIDO`, `REMITO_VENTA`) | se publican los físicos (`estados_pedidos`, `estados_comprobante`, `remitos_de_venta`, `alerta_de_estado`, `detalle_del_pedido`) | Un diagrama que no coincide con la base hace creer que el esquema es otro; el desajuste se auditó el 2026-11-05. | `der-paridad-esquema.test.ts` · `contrato.test.ts` |
| `detalle_carrito` | fase 2 | se elimina (vacía) | El MVP no persiste carrito. | `contrato.test.ts` |
| `subtotal` / `total` | derivados | `subtotal` generado + trigger en `pedido` | La base garantiza el invariante. | `pedidos.test.ts` |
| Lectura del catálogo | — | vista `vista_catalogo` con `disponible` | Una sola forma de leer stock disponible. | `rls.test.ts` (HU-1) |
| Operaciones | — | RPC `crear_pedido`, `aprobar_comprobante`, `rechazar_comprobante`, `cancelar_pedidos_vencidos` | Transacciones atómicas y permisos por función. |
| Identidad del Cliente | — | el checkout lo resuelve por `email` desde el servidor (upsert con service role), sin RPC nueva | No hay RPC de Cliente en el contrato aprobado (4 RPC) y el único real es `email`. | decisión — spec `checkout` §4.1 |
| `comprobante.foto_url` | `string` | clave del objeto dentro del bucket privado; la signed URL se genera al leer | El bucket es privado: no hay URL pública que guardar. | decisión — spec `checkout` §4.2 |
| `producto.imagen_url` | `string` | URL pública del objeto en el bucket público `productos` (PNG/JPEG/WebP, 5 MB) | La foto es contenido público de la tienda y la sube el Administrador desde el panel: no hay dato sensible que firmar. La clave queda bajo `productos/<id_producto>/`. **`productos` es el nombre del bucket de Storage, no la tabla legacy**: excepción explícita en `GLOSSARY.md`. | `admin.test.ts` (clave saneada) · decisión — spec `admin` §4.5 y migración `05` |
| Vencimiento | regla del MVP | cron de Vercel (`59 2 * * 6` UTC = viernes 23:59 ART) + RPC `cancelar_pedidos_vencidos()` | La reserva no puede quedar tomada para siempre. El cron es idempotente y no toca `Pago Validado`. | `aprobacion.test.ts` · spec `bd-mvp` HU-5 |
| Errores de dominio | — | `ET001`–`ET007` + `23505` (nombre duplicado) | El panel traduce el código a un mensaje; nunca muestra el error crudo de PostgreSQL. | `admin.test.ts` · spec `bd-mvp` §3.5 |

