# Spec · Detalle de producto (`T3`)

> **Feature:** `front-mvp/detalle-producto` · **Estado:** implementada en repo · **Verificación en vivo:** pendiente (depende del issue #16 y de las claves del issue #20) · **Fecha:** 2026-10-25, revisado el 2026-10-27.
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
2. Responde **404** cuando el id no es un entero positivo o el producto no está en la vista. La página
   **sí** valida a propósito el **formato** del id —delega en `idDeProducto` (`src/lib/catalogo.ts`), que
   sólo acepta dígitos, entero positivo y dentro del rango seguro de `Number`— y **no** valida `activo`:
   esa regla vive en `vista_catalogo`, que filtra los productos dados de baja. El 404 es el mismo para las
   tres situaciones (formato inválido, id inexistente y producto dado de baja): no se distinguen.
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

---

## 7. Estado de implementación (auditoría del 2026-10-27)

`npm run typecheck` sin errores y `npm test` con 279 tests en 23 archivos, todos en verde, contra PGlite.
El render del detalle no se verifica en el suite (no hay jsdom): lo que sigue se apoya en el código y en el
invariante de la vista, no en una ejecución del navegador.

| Criterio / HU | Estado | Evidencia |
|---|---|---|
| HU-1 · la card lleva a `/producto/<id>` y el detalle muestra sus datos | implementado, sin verificar en vivo | `src/components/ProductCard.tsx:14` (URL del detalle) y `:17-26` (enlaces de imagen y título); `src/app/producto/[id]/page.tsx:62-87`; tests *«la card lleva al detalle sin cambiar su contrato»* y *«resuelve los estados sin stock y sin imagen como la card»* en `tests/front/detalle-producto.test.ts:114` y `:105` |
| HU-1 · se puede agregar al carrito desde el detalle | implementado, sin verificar en vivo | `src/app/producto/[id]/page.tsx:119`; test `tests/front/detalle-producto.test.ts:105` |
| HU-2 · un producto con `activo = false` no se abre por URL | implementado, sin verificar en vivo | test *«un producto dado de baja deja de aparecer: su URL directa no puede mostrarlo»* en `tests/front/detalle-producto.test.ts:22` |
| HU-2 · la página no filtra ni valida `activo`; lo hace `vista_catalogo` | implementado, sin verificar en vivo | `src/app/producto/[id]/page.tsx:25-30,44-45`; tests *«reutiliza el catálogo y delega el 404 en la vista»* y *«no reimplementa la validación del id ni la regla de `activo`»* en `tests/front/detalle-producto.test.ts` |
| HU-3 · `tiempo_produccion` como **Producción estimada**, tiempo de elaboración | implementado, sin verificar en vivo | `src/app/producto/[id]/page.tsx:89-104`; test *«muestra la producción como dato de producción y no promete envío»* en `tests/front/detalle-producto.test.ts:98` |
| HU-3 · sin promesa de envío ni estados posteriores a `Pago Validado` | implementado, sin verificar en vivo | `src/app/producto/[id]/page.tsx:106-112`; test `tests/front/detalle-producto.test.ts:98` |
| HU-4 · `disponible = 0` muestra “Sin stock” y no ofrece agregar | implementado, sin verificar en vivo | `src/app/producto/[id]/page.tsx:114-120`; test *«resuelve los estados sin stock y sin imagen como la card»* en `tests/front/detalle-producto.test.ts:105` |
| HU-4 · sin `imagen_url` o URL rota, placeholder con `alt` descriptivo | implementado, sin verificar en vivo | `src/components/ImagenProducto.tsx:25-36` y `:42` (`onError` en `:46`); test `tests/front/detalle-producto.test.ts:105` |
| HU-4 · no se agrega ningún campo al modelo | implementado, sin verificar en vivo | test *«el detalle publica la misma disponibilidad que la grilla, sin campos nuevos»* en `tests/front/detalle-producto.test.ts:47` |
| HU-5 · una sola columna en mobile, sin desbordes, un solo `h1` | pendiente | `src/app/producto/[id]/page.tsx:60,80` dan un solo `h1` y grilla de una columna, pero no hay test ni medición: es verificación manual, bloqueada por #16/#20 |
| HU-5 · foco visible, contraste AA y nombre accesible en controles con ícono | implementado, sin verificar en vivo | `src/app/globals.css:53-55` (`:focus-visible`); `src/components/AgregarAlCarrito.tsx:32` (`aria-label`); contraste sin medir |
| HU-5 · id inválido (`abc`, `0`, `-1`) responde 404 | ✅ implementado (#42) | `idDeProducto` en `src/lib/catalogo.ts` (exportada) y `src/app/producto/[id]/page.tsx:29-30`; los cinco tests de *«el id de la URL es válido o no es un producto»* cubren `abc`, `12a`, vacío, ` 1`, `1 `, `0`, `-1`, `1.5`, `1,5`, `99999999999999999999`, `9007199254740993`, `1` y `42` |
| §2 · la página no reserva stock ni cobra: solo agrega al carrito | implementado, sin verificar en vivo | `src/app/producto/[id]/page.tsx` no importa nada de base ni de checkout; test `tests/front/carrito.test.ts:109` cubre la pureza del módulo |
| §2.2 · el 404 se apoya en que `vista_catalogo` filtra `activo` | ✅ implementado (#42) | el §2.2 precisa la decisión: formato del id en `idDeProducto` (`src/lib/catalogo.ts`), `activo` en la vista; test *«no reimplementa la validación del id ni la regla de `activo`»* y *«llama al 404 cuando el formato del id es inválido y cuando el producto no está»* en `tests/front/detalle-producto.test.ts` |

### Pendiente

1. **Verificación en el navegador de `/producto/<id>`** (jerarquía, responsive, estados y contraste). Depende
   de la base migrada (**#16**, **#15**) y de las claves de entorno (**#20**).
2. **Cerrar el ticket `T3 · Detalle de producto`** (issue **#8**): sigue abierto aunque la implementación y
   sus tests están hechos. El 404 de ids inválidos y la precisión del §2.2 se cerraron en **#42**.
