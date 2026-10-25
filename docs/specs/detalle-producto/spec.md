# Spec · Detalle de producto (`T3`)

> **Feature:** `front-mvp/detalle-producto` · **Estado:** publicada para implementación · **Fecha:** 2026-10-25.
> **Origen:** gate de arranque del issue [#8](https://github.com/juanmamerodio/esenciatecnica/issues/8);
> la decisión **G2** ([#7](https://github.com/juanmamerodio/esenciatecnica/issues/7)) se cerró el 2026-10-25
> y está registrada en [`front-mvp/spec.md`](../front-mvp/spec.md) §10.
> **Depende de:** `T1 · Home` ([#5](https://github.com/juanmamerodio/esenciatecnica/issues/5)) y
> `T2 · Catálogo` ([#6](https://github.com/juanmamerodio/esenciatecnica/issues/6)), que dejaron el módulo de
> catálogo, la card y el filtrado.
> **Fuente de verdad:** [`GLOSSARY.md`](../../../GLOSSARY.md), [`docs/MODELO.md`](../../MODELO.md),
> [`AGENTS.md`](../../../AGENTS.md) §5.1 y §7.

---

## 1. Problema

Un producto solo se puede ver en la card: la descripción está recortada a dos líneas (`line-clamp-2`) y no
hay forma de decidir la compra sin volver a la grilla. El prototipo sí tiene una vista de detalle, pero la
construye con campos que el modelo **no** tiene (galería, variantes, especificaciones de laboratorio).

El riesgo de implementarlo mal es doble: inventar campos para “llenar” la pantalla, o leer la tabla
`producto` por fuera del catálogo y dejar que un producto dado de baja siga siendo accesible por URL
directa porque el filtro de `activo` quedó del lado del cliente.

## 2. Solución

Una **página propia** en `/producto/[id]` (decisión **G2**), server-side, que:

1. Reutiliza la **misma** función pública del catálogo (`leerCatalogo` → `consultarCatalogo`). No hay un
   segundo lector ni una consulta “por id”: se busca el producto dentro del resultado que ya viene
   ordenado y filtrado por `vista_catalogo`. Una sola fuente por concepto (`AGENTS.md` §7.4).
2. Responde **404** cuando el id no es un entero positivo o el producto no está en la vista. Como
   `vista_catalogo` filtra `activo`, un producto dado de baja **no** se puede abrir por URL directa, y esa
   regla no depende del cliente.
3. Muestra solo datos del modelo: imagen (o placeholder), categoría, tipo, nombre, descripción completa,
   precio y `tiempo_produccion` como **dato de producción** (§6.2 de la spec del front).
4. Reutiliza los estados ya diseñados: `ImagenProducto` para “sin imagen”, el botón de agregar para
   “con stock” y el cartel “Sin stock” para “sin stock”. El detalle **no** publica unidades disponibles,
   igual que la card.

La card gana un enlace al detalle (imagen y título) sin cambiar su contrato: sigue siendo la única card.

## 3. Historias y criterios de aceptación

### HU-1 · Entrar al detalle

**Como** Cliente, **quiero** ver un producto en detalle **para** decidir la compra sin volver a la grilla.

- **Given** un producto activo en la grilla, **When** toco su card, **Then** voy a `/producto/<id>` y veo
  su imagen (o placeholder), categoría, nombre, descripción completa y precio.
- **Then** desde el detalle se puede agregar el producto al carrito, con el mismo comportamiento que en la
  card.

### HU-2 · El filtro de activos no depende del cliente

**Como** Administrador de Química, **quiero** que un producto dado de baja no se pueda abrir **para** que la
baja sea real.

- **Given** un producto con `activo = false`, **When** entro a su URL, **Then** veo el 404 de Next.
- **Then** la página no filtra ni valida `activo`: lo hace `vista_catalogo`, una sola vez y del lado de la
  base.

### HU-3 · Producción, no envío

- **Then** `tiempo_produccion` aparece como **Producción estimada** (días), con la aclaración de que es
  tiempo de elaboración.
- **Then** no hay promesa de envío, seguimiento ni estados posteriores a `Pago Validado`
  (`AGENTS.md` §5.5).

### HU-4 · Estados sin stock y sin imagen

- **Given** un producto con `disponible = 0`, **Then** el detalle muestra “Sin stock” y no ofrece
  agregarlo.
- **Given** un producto sin `imagen_url` o con una URL que no resuelve, **Then** se ve el placeholder de la
  identidad con `alt` descriptivo.
- **Then** no se agrega ningún campo al modelo para el detalle.

### HU-5 · Mobile y accesibilidad

- **Then** una sola columna en mobile, sin desbordes horizontales, con un solo `h1`.
- **Then** foco visible, contraste AA y nombre accesible en los controles con ícono.
- **Then** un id inválido (`/producto/abc`, `/producto/0`, `/producto/-1`) responde 404 y no rompe la página.

## 4. Seams bajo test

| Seam | Cubre | Deja afuera |
|---|---|---|
| `consultarCatalogo` contra PGlite migrada (el mismo seam de T1) | que un producto dado de baja desaparezca de la vista: es el invariante que sostiene el 404 | el render del detalle |
| Estructura de `src/app/producto/[id]/page.tsx` y de `ProductCard.tsx` | reuso de `leerCatalogo`, `notFound()`, enlace desde la card, producción como dato de producción y ausencia de campos inventados | automatización de UI |
| Verificación en navegador de `/producto/<id>` | jerarquía, responsive, estados | automatización de UI |

No se agregan dependencias: sin jsdom ni Testing Library (`AGENTS.md` §4 y §8).

## 5. Fuera de alcance

- Galería, variantes, reseñas, “productos relacionados” y especificaciones técnicas: el modelo no los tiene
  y no se inventan (`AGENTS.md` §5.1).
- Carrito y reserva de stock: ya resueltos en T4; el detalle solo agrega al carrito.
- Fotos reales: las sube el Administrador desde el panel (T7).

## 6. Decisiones tomadas

1. **Página propia** (`/producto/[id]`), no una card expandida (G2): una URL por producto, compartible, y un
   único lugar donde decidir el 404.
2. **Ruta en español**: el sistema es español único (`AGENTS.md` §4), así que la ruta es `/producto/<id>` y
   no `/product/<id>`.
3. **Un solo lector del catálogo**: el detalle no agrega una función de lectura nueva; consume
   `leerCatalogo` y busca por id. Evita dos caminos de lectura del mismo concepto.
4. **Sin unidades disponibles en el detalle**: la disponibilidad se expresa solo como “sin stock”, igual que
   en la Home.
