# Spec · Cerrar la migración del MVP en `otjph`

> **Feature:** `migracion-otjph` · **Estado:** lista para implementar · **Fecha:** 2026-10-26.
> **Origen:** auditoría de la sesión del 26-10 sobre el estado real de `otjphjnrwihqzzhbfnmh`.
> **Fuente de verdad:** [`docs/MODELO.md`](../../MODELO.md) + [`docs/entrega/HANDOFF-ISABELLA.md`](../../entrega/HANDOFF-ISABELLA.md) + `supabase/migrations/`.
> **Responsable:** Isabella Infante (Database & SQL Architecture).
> **Criterio de cierre:** `npm run bd:viva` en verde.

---

## 1. Problema (Problem Statement)

Isabella movió a `review` el 24-10 las dos tareas de base del Teams — *«Aplicar DDL del MVP en otjph»* y
*«RLS y Storage: cerrar lectura anónima y bucket comprobantes»* —, pero el proyecto vivo **no coincide**
con el esquema versionado. La verificación del 26-10 encuentra **13 desajustes** (tabla completa en §7).

Desde el punto de vista de quien usa la tienda:

- La Home y `/catalog` muestran el estado de error: la vista del catálogo no tiene la forma del contrato.
- Nadie puede comprar: falta `crear_pedido`, así que el checkout no tiene con qué confirmar el pedido ni reservar stock.
- El Administrador no puede validar nada: sin el bucket `comprobantes` no hay foto que comparar, y sin las
  columnas `mensaje`/`atendida` no hay alerta de stock que mostrar.
- Y hay un modo de falla silencioso peor: si la vista trajera filas sin `disponible`, la tienda mostraría
  **todo el catálogo como Agotado** sin decir que el esquema está mal.

El problema de fondo no es solo el DDL: es que **nada en el repo detectaba el desajuste**. `npm test`
corre contra PGlite con las migraciones del repo, así que un proyecto Supabase a medio migrar deja los
230 tests en verde. Eso es lo que dejó que dos tareas se marcaran como hechas sin estarlo.

## 2. Solución (Solution)

Aplicar las seis migraciones versionadas sobre `otjph` **en orden**, sin escribir SQL nuevo, y dejar
`npm run bd:viva` como la puerta de cierre que compara el proyecto vivo contra el esquema versionado.

La migración `01` ya está escrita para esto: hace `drop table if exists … cascade` de las diez tablas del
dominio y las recrea. La convergencia es **por reconstrucción**, no por `alter`: no hay que reconciliar
columna por columna lo que quedó a medias.

Después de aplicar, el front no cambia: el único cambio de código ya está hecho (§5).

## 3. Historias de usuario (User Stories)

1. Como Isabella, quiero correr las seis migraciones en orden sobre `otjph`, para que la base coincida con `docs/MODELO.md` sin SQL nuevo.
2. Como Isabella, quiero respaldar las tablas actuales antes de reconstruir, para poder volver atrás si algo sale mal.
3. Como Isabella, quiero que la migración de respaldo no se saltee en silencio, para que la próxima reconstrucción no corra sin red.
4. Como Isabella, quiero que `vista_catalogo` exponga `disponible`, `cantidad_actual`, `cantidad_reservada` y `cantidad_warning`, para que el catálogo lea la disponibilidad real.
5. Como Isabella, quiero que `crear_pedido(p_id_cliente, p_items)` exista con su firma, para que el checkout confirme el pedido y reserve stock en una transacción.
6. Como Isabella, quiero que `alerta_de_estado` tenga `mensaje` y `atendida`, para que el panel muestre y cierre alertas de stock.
7. Como Isabella, quiero que `estados_comprobante` cuelgue de `comprobante` por `id_comprobante`, para que el historial de validación sea auditable.
8. Como Isabella, quiero que `detalle_del_pedido` tenga la PK `id_detalle_pedido`, para que los tipos del front coincidan con la base.
9. Como Isabella, quiero que existan las columnas de tiempo (`creado_en`, `actualizado_en`, `subido_en`), para que los triggers de marca de tiempo no fallen al actualizar.
10. Como Isabella, quiero que `detalle_carrito` deje de existir, para que el MVP no arrastre el carrito persistente que el modelo retiró.
11. Como Isabella, quiero que `admin` y `roll` queden cerradas por RLS, para que la anon key no pueda leer la contraseña en texto plano.
12. Como Isabella, quiero que el bucket `comprobantes` exista privado, de 5 MB y solo png/jpeg/webp, para que el Cliente suba su foto y la firma solo el servidor.
13. Como Isabella, quiero que el bucket `productos` exista público, de 5 MB y solo png/jpeg/webp, para que el Administrador suba las fotos que sirve la tienda.
14. Como Isabella, quiero recargar el cache de PostgREST después de aplicar, para que `/rest/v1` vea las tablas y las RPC sin esperar.
15. Como Juanma, quiero que `npm run bd:viva` quede en verde, para saber que el proyecto vivo coincide con lo versionado.
16. Como Cliente, quiero ver los productos con su disponibilidad real, para no intentar comprar lo que no hay.
17. Como Cliente, quiero confirmar el pedido y subir el comprobante, para completar la compra.
18. Como Cliente, quiero que un producto agotado se marque como tal sin desaparecer, para entender por qué no puedo pedirlo.
19. Como Administrador de Química, quiero aprobar o rechazar el comprobante comparando monto e imagen, para validar el pago a mano.
20. Como Administrador de Química, quiero ver la alerta de stock en el panel, para reponer antes de quedarme sin producto.
21. Como Administrador de Química, quiero que al aprobar se emita el remito, para que el Cliente reciba su documento.
22. Como Enzo, quiero que los buckets existan, para poder probar la subida del comprobante y de la foto de producto.
23. Como Celeste, quiero un criterio de cierre ejecutable, para marcar las dos tareas como terminadas o devolverlas con evidencia.
24. Como equipo, quiero que el estado de las tareas del Teams refleje la realidad de la base, para no volver a dar por hecho lo que no está.

## 4. Decisiones de implementación (Implementation Decisions)

**Fuente de verdad.** Las migraciones del repo son el contrato. No se inventa SQL: si algo no está en
`MODELO.md`, se documenta y se consulta antes.

**Mecanismo.** Se aplican `00 → 01 → 02 → 03 → 04 → 05` en orden. `01` reconstruye las diez tablas del
dominio (`drop … cascade` + `create`), así que la convergencia no depende de lo que quedó a medias. `02`
va después de `01` (los `create trigger` de `02` necesitan que `01` haya dropeado los triggers viejos por
cascade), `03` después de `02`, y `04`/`05` al final. Cierra con `notify pgrst, 'reload schema'`.

**No se agrega una migración `06` de reconciliación** ni se reescribe la semántica de una migración ya
aplicada.

**Datos: respaldo manual obligatorio antes de correr `01`.** La migración `00` usa `producto.id_stock`
como marcador de esquema legacy, y esa columna ya no existe en `otjph`: **`00` no hace nada** y `01`
destruiría las filas actuales sin red. Además, con la anon key no se puede contar filas de las tablas
protegidas por RLS, así que **no se puede afirmar desde afuera que estén vacías**. Decisión: respaldar a
mano el esquema `public` antes de aplicar, y corregir el marcador de `00` para que la falta de respaldo
no vuelva a pasar inadvertida.

**Firmas.** Las RPC usan `integer`, no `bigint`: `bd-mvp/spec.md` §4 las declara mal y hay que corregirlo.

**`id_detalle` → `id_detalle_pedido`.** `01` crea el nombre canónico. No se agrega alias ni vista de
compatibilidad: el nombre viejo no queda en ningún lado.

**Semilla.** `supabase/seed.sql` repuebla el catálogo de prueba. No se inventan productos ni categorías.

**Nada del front cambia** por esta spec, salvo el guard del catálogo ya implementado (§5).

## 5. Decisiones de testing (Testing Decisions)

**Qué hace bueno a un test acá.** Que observe comportamiento por la interfaz pública —el borde HTTP de
PostgREST con la anon key y la firma de cada RPC— y no nombres de triggers, OIDs ni definiciones internas.
Un test tiene que sobrevivir a que se reescriba la migración y seguir diciendo lo mismo.

**Seam nuevo, el único:** `npm run bd:viva` (`scripts/verificar-bd-viva.mjs`). Compara el esquema
versionado, aplicado en PGlite, contra el proyecto vivo consultado con la anon key.

- **Cubre:** columnas por tabla y vista, existencia de las cuatro RPC por su firma, ausencia de las tablas
  retiradas, RLS de lectura y escritura anónima, y los dos buckets.
- **Deja afuera:** los cuerpos de las funciones (verifica firma, no comportamiento), los datos fila por
  fila, el contenido de `respaldo_legacy` y cualquier cosa que exija la service role.

**Prior art.** `tests/db/contrato.test.ts` (forma de las tablas y columnas), `tests/db/rls.test.ts` y
`tests/db/rls-supabase.test.ts` (superficie anónima), `tests/front/catalogo.test.ts` (el catálogo por su
función pública). `bd:viva` sigue el mismo estilo: nombres en español, un `ok`/`FALLA` por control y salida
distinta de cero si algo no cierra.

**Guard del catálogo (ya implementado, `tests/front/catalogo.test.ts`).** Si la vista devuelve filas sin la
columna `disponible`, `consultarCatalogo` devuelve `estado: 'error'` en vez de rellenar con 0 y mostrar todo
agotado. El test se escribió antes del cambio y fallaba: verificado en rojo y después en verde.

**`npm test` sigue sin red.** `bd:viva` es un script aparte, no un test de la suite: no consulta Supabase
en CI.

## 6. Fuera de alcance (Out of Scope)

- **Secretos y entorno de Enzo:** `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` y `RESEND_API_KEY`.
- **Datos de transferencia de la Cooperadora (G4)** y `NEXT_PUBLIC_TRANSFERENCIA_*`.
- **Verificación manual en navegador** de las rutas del front.
- **Scheduler del cron de los viernes:** `cancelar_pedidos_vencidos()` existe pero ningún job lo llama.
  Es una tajada propia.
- **`.agents/skills/`:** `AGENTS.md` §11 y `front-mvp` §3.4 lo declaran y el directorio no existe. Tajada propia.
- **Inconsistencias de specs detectadas en la auditoría** (se listan en §7): `checkout` §6.3 contra su HU-3,
  el `aviso` de fallo de correo que se descarta en `comun.ts`, `FlaskConical` en `/about` y el footer,
  `bd-mvp` huérfano de issue, y el término `productos` en la spec de admin contra `GLOSSARY.md`.
- **RLS por perfil y `admin`/`roll` operativos:** fase 2.

## 7. Notas adicionales (Further Notes)

### 7.1 Los 13 desajustes (salida de `npm run bd:viva`, 26-10)

| Control | Resultado |
|---|---|
| `alerta_de_estado` | faltan `mensaje`, `atendida` |
| `cliente` | falta `creado_en` |
| `comprobante` | falta `subido_en` |
| `detalle_del_pedido` | falta `id_detalle_pedido` (vivo: `id_detalle`) |
| `estados_comprobante` | falta `id_comprobante` |
| `pedido` | faltan `creado_en`, `actualizado_en` |
| `producto` | faltan `creado_en`, `actualizado_en` |
| `stock` | falta `actualizado_en` |
| `vista_catalogo` | faltan `cantidad_actual`, `cantidad_reservada`, `disponible`, `cantidad_warning` |
| RPC `crear_pedido` | no existe (PGRST202) |
| `detalle_carrito` | sigue existiendo |
| bucket `comprobantes` | no existe |
| bucket `productos` | no existe |

En verde ya están: `estados_pedidos` y `remitos_de_venta` completas, la ausencia de `productos`, `pedidos`
y `verificaciones`, las tres RPC restantes, la RLS de lectura y escritura anónima en las seis tablas
sensibles, y `cliente`/`pedido`/`producto` con sus columnas del modelo.

### 7.2 Correcciones a lo que dice `memory.md`

- **No faltan las cuatro RPC: falta solo `crear_pedido`.** `aprobar_comprobante`, `rechazar_comprobante` y
  `cancelar_pedidos_vencidos` existen y responden: un nombre de parámetro inexistente devuelve `PGRST202`,
  un tipo inválido devuelve `22P02` y la llamada correcta devuelve `204`. El `PGRST202` que se leyó el 25-10
  salió de mandar `{}` sin parámetros, que no matchea ninguna firma con argumentos.
- **`vista_catalogo` ya no da `PGRST205`:** existe, pero con la forma vieja (`stock_actual`,
  `stock_warning`, `porcentaje`) en vez de la del contrato.
- **La suite son 230 tests, no 227** (`AGENTS.md` §8 y `memory.md` están desactualizados por 3).

### 7.3 Por qué esto no lo vio nadie

`npm test` aplica las migraciones del repo sobre PGlite y pasa en verde con el proyecto vivo roto. La
auditoría lo dejó medible: es exactamente el agujero que `bd:viva` cierra, y la razón por la que este
criterio de cierre no debería volver a ser un `SELECT` a mano en el SQL Editor.
