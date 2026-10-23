# Spec · Catálogo (`T2`)

> **Feature:** `front-mvp/catalogo` · **Estado:** publicada para implementación · **Fecha:** 2026-10-23.
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
