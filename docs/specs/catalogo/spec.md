# Spec · Catálogo (`T2`)

> **Feature:** `front-mvp/catalogo` · **Estado:** implementada en repo · **Verificación en vivo:** pendiente (depende del issue #16 y de las claves del issue #20) · **Fecha:** 2026-10-23, revisado el 2026-10-27.
> **Origen:** gate de arranque del issue [#6](https://github.com/juanmamerodio/esenciatecnica/issues/6);
> `docs/specs/front-mvp/spec.md` §4 (tajada T2) no fijaba criterios propios y este documento los fija.
> **Depende de:** `T1 · Home` ([#5](https://github.com/juanmamerodio/esenciatecnica/issues/5)), que ya dejó el
> módulo de catálogo, la card y los estados vacío/error.
> **Fuente de verdad:** [`GLOSSARY.md`](../../../GLOSSARY.md), [`docs/MODELO.md`](../../MODELO.md),
> [`src/lib/database.types.ts`](../../../src/lib/database.types.ts).

---

## 1. Problema

`/catalog` muestra la misma grilla que la Home y sus dos controles —buscador y filtro por categoría—
están **deshabilitados**: son placeholders que prometen una función que no existe. Sin buscador, la única
forma de encontrar un producto es recorrer la grilla completa, y una categoría sin resultados no se
distingue de una tienda vacía.

## 2. Solución

Extender el módulo de catálogo de T1 con una **consulta** (`búsqueda` y `categoría`) y usarla desde la
página, sin duplicar la lógica de filtrado en el cliente.

- El filtrado y la búsqueda viven en el **módulo** (`src/lib/catalogo.ts`), que ya es la única fuente del
  catálogo. No hay una segunda implementación en el navegador.
- La búsqueda es **insensible a mayúsculas y acentos** y busca en nombre, categoría, tipo y descripción.
- La categoría es un **match exacto** contra `PRODUCTO.categoria`.
- La consulta llega por **querystring** (`?q=…&categoria=…`) con un formulario GET: funciona sin
  JavaScript, se puede compartir por link y el botón "atrás" del navegador se comporta.
- El resultado expone las **categorías disponibles** del catálogo completo (no de la lista filtrada), para
  que los chips no desaparezcan al filtrar.

## 3. Historias y criterios de aceptación

### HU-1 · Buscar por texto

**Como** Cliente, **quiero** escribir parte del nombre de un producto **para** encontrarlo sin recorrer todo.

- **Given** el catálogo con "Jabón Líquido Neutro", **When** busco `jabon`, **Then** el producto aparece
  igual (la búsqueda ignora acentos y mayúsculas).
- **When** busco `shampoo` y ningún producto lo menciona, **Then** veo el estado **sin resultados**, que
  **no** es el estado vacío de la tienda ni el estado de error.
- **Then** la búsqueda también alcanza la descripción, la categoría y el tipo del producto.

### HU-2 · Filtrar por categoría

**Como** Cliente, **quiero** ver sólo una categoría **para** comparar productos parecidos.

- **Then** los chips de categoría salen del catálogo y llegan con "Todos".
- **Given** que filtro por `Higiene`, **Then** sólo veo productos de esa categoría.
- **Then** el chip activo se distingue por color **y** por `aria-current`, no sólo por color.

### HU-3 · Combinar búsqueda y filtro

- **Given** una búsqueda y una categoría activas, **Then** el resultado cumple **ambas**.
- **Then** limpiar la búsqueda conserva la categoría, y elegir "Todos" conserva la búsqueda.

### HU-4 · Estado sin resultados

**Como** Cliente, **quiero** saber que la búsqueda no encontró nada **para** corregir el término.

- **Then** el mensaje dice "Sin resultados para tu búsqueda" y ofrece volver al catálogo completo.
- **Then** ese estado se distingue del vacío de la tienda ("Todavía no hay productos publicados") y del
  error de lectura ("No pudimos cargar el catálogo").

### HU-5 · Mobile y accesibilidad

- **Then** el buscador tiene `<label>` accesible (`sr-only`), se envía con Enter y tiene un botón visible.
- **Then** una sola columna en mobile, sin desbordes horizontales, foco visible y contraste AA.
- **Then** la URL refleja la consulta: recargar la página conserva búsqueda y categoría.

## 4. Seams bajo test

| Seam | Cubre | Deja afuera |
|---|---|---|
| Función pública del catálogo con `consulta` (PGlite migrada + seed) | búsqueda sin acentos, campos alcanzados, match exacto de categoría, combinación, sin resultados, categorías disponibles | render de la página |
| Verificación en navegador de `/catalog` | form GET, chips, estados, responsive | automatización de DOM |

No se agregan dependencias: la página se verifica en el navegador, no con jsdom
([`AGENTS.md`](../../../AGENTS.md) §4 y §8).

## 5. Fuera de alcance

- Orden configurable por el Cliente, paginación y filtro por precio: el modelo no los pide.
- Búsqueda en el servidor con índices/`tsvector`: el catálogo se lee completo (spec `front-mvp` §3.3).
- Detalle de producto (T3), que sigue dependiendo de la decisión abierta G2.

## 6. Decisiones tomadas

1. **GET, no estado de cliente:** el filtro no necesita JavaScript y la URL es compartible.
2. **Filtrado en el módulo:** una sola implementación, la misma que testea PGlite.
3. **Categorías del catálogo completo:** los chips no se vacían al filtrar; el chip activo siempre existe.

---

## 7. Estado de implementación (auditoría del 2026-10-27)

`npm run typecheck` sin errores y `npm test` con 279 tests en 23 archivos, todos en verde, contra PGlite:
la base viva sigue a medio migrar, así que nada de esto está verificado en producción.

| Criterio / HU | Estado | Evidencia |
|---|---|---|
| HU-1 · búsqueda insensible a mayúsculas y acentos | implementado, sin verificar en vivo | `src/lib/catalogo.ts:119-137` (`filtrar`, `sinAcentos`); test *«encuentra sin distinguir mayúsculas ni acentos»* en `tests/front/catalogo-filtros.test.ts:22` |
| HU-1 · alcanza nombre, categoría, tipo y descripción | implementado, sin verificar en vivo | `src/lib/catalogo.ts:126`; test *«alcanza nombre, categoría, tipo y descripción»* en `tests/front/catalogo-filtros.test.ts:27` |
| HU-1 · búsqueda sin coincidencias devuelve vacío, no error | implementado, sin verificar en vivo | test *«sin coincidencias devuelve un catálogo vacío, no un error»* en `tests/front/catalogo-filtros.test.ts:45`; `src/lib/catalogo.ts:108-115` |
| HU-2 · chips de categoría con "Todos" desde el catálogo | implementado, sin verificar en vivo | `src/app/catalog/page.tsx:94-105`; test *«salen del catálogo completo y no de la lista filtrada»* en `tests/front/catalogo-filtros.test.ts:90` |
| HU-2 · filtro por categoría exacta | implementado, sin verificar en vivo | `src/lib/catalogo.ts:123`; test *«filtra por categoría exacta»* en `tests/front/catalogo-filtros.test.ts:59` |
| HU-2 · chip activo por color y `aria-current` | implementado, sin verificar en vivo | `src/app/catalog/page.tsx:36`; test *«el filtro por categoría se conserva al buscar y se marca con aria-current»* en `tests/front/catalogo-pagina.test.ts:26` |
| HU-3 · búsqueda y categoría se combinan | implementado, sin verificar en vivo | `src/lib/catalogo.ts:122-128`; test *«combina búsqueda y categoría»* en `tests/front/catalogo-filtros.test.ts:71` |
| HU-3 · limpiar búsqueda conserva la categoría | implementado, sin verificar en vivo | `src/app/catalog/page.tsx:64` y `src/app/catalog/page.tsx:86-91`; test `tests/front/catalogo-pagina.test.ts:26` |
| HU-4 · estado sin resultados propio | implementado, sin verificar en vivo | `src/app/catalog/page.tsx:115-128`; test *«el estado sin resultados es propio del catálogo y ofrece volver»* en `tests/front/catalogo-pagina.test.ts:31` |
| HU-4 · sin resultados ≠ tienda vacía ≠ error de lectura | implementado, sin verificar en vivo | `src/components/GrillaProductos.tsx:22-52`; test *«distingue la tienda vacía del error»* en `tests/front/catalogo.test.ts:110` |
| HU-5 · `<label sr-only>`, Enter y botón visible | implementado, sin verificar en vivo | `src/app/catalog/page.tsx:63-84`; test `tests/front/catalogo-pagina.test.ts:19` |
| HU-5 · una columna en mobile, sin desbordes | pendiente | No hay test ni evidencia; es verificación manual en navegador, bloqueada por los issues #16/#20 |
| HU-5 · foco visible y contraste AA | implementado, sin verificar en vivo | `src/app/globals.css:53-55` (`:focus-visible`); el contraste no está medido |
| HU-5 · la URL refleja la consulta | implementado, sin verificar en vivo | `src/app/catalog/page.tsx:14-21` y `src/app/catalog/page.tsx:48-50`; test `tests/front/catalogo-pagina.test.ts:19` |
| §2 · un solo filtrado, en el módulo, sin reimplementarlo en la página | implementado, sin verificar en vivo | `src/app/catalog/page.tsx:50`; test *«el filtrado no se reimplementa en la página»* en `tests/front/catalogo-pagina.test.ts:36` |
| §5 · sin orden configurable, paginación ni filtro por precio | implementado, sin verificar en vivo | `src/lib/catalogo.ts:165` (orden por nombre) y ausencia de paginación en `src/app/catalog/page.tsx` |
| §2 · búsqueda "en nombre, categoría, tipo y descripción" | desviación | `src/lib/catalogo.ts:126` une los cuatro campos con `join(" ")` **antes** de buscar: un término puede cruzar el borde entre dos campos (en `Alcohol en Gel` el término `"gel alcohol"` matchea porque el `tipo` termina donde empieza el `nombre`). El spec dice "busca en" cada campo; el test `tests/front/catalogo-filtros.test.ts:27` solo cubre coincidencias dentro de un campo |

### Pendiente

1. **Verificación en el navegador de `/catalog`** (form GET, chips, estados, responsive y contraste). Depende
   de la base migrada (**#16**, **#15**) y de las claves de entorno (**#20**).
2. **Búsqueda por campos: decidir si el cruce entre campos es aceptable.** Es la desviación de la tabla y hay
   que resolverla moviendo `src/lib/catalogo.ts:126` a un `some()` por campo o corrigiendo el §2 del spec.
3. **Cerrar el ticket `T2 · Catálogo`** (issue **#6**): sigue abierto aunque la implementación y sus tests
   están hechos.
