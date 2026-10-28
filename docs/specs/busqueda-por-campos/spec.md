# Spec · Búsqueda del catálogo por campos

> **Feature:** `busqueda-por-campos` · **Estado:** implementada en repo (issue #41) · **Fecha:** 2026-10-27, implementada el 2026-10-28 · **Issue:** [#31](https://github.com/juanmamerodio/esenciatecnica/issues/31) · **Tajada:** [#41](https://github.com/juanmamerodio/esenciatecnica/issues/41).
> **Origen:** desviación de §2 en [`catalogo/spec.md`](../catalogo/spec.md) y hallazgo 🟡 n.º 2 de
> `memory.md`. No tiene tarea en el tablero.
> **Fuente de verdad:** [`docs/specs/catalogo/spec.md`](../catalogo/spec.md) §2 ·
> [`GLOSSARY.md`](../../../GLOSSARY.md) · [`AGENTS.md`](../../../AGENTS.md) §7.4.
> **Responsable:** Juan Manuel Merodio.
> **Criterio de cierre:** la búsqueda deja de depender de que los campos estén pegados, con test del caso
> de borde que hoy pasa por casualidad.

---

## 1. Problema

El buscador del catálogo une los cuatro campos del producto —nombre, categoría, tipo y descripción— **en
una sola cadena separada por espacios** y busca el término adentro. La búsqueda hace lo que el Cliente
espera casi siempre, pero por el motivo equivocado: un término puede «cruzar» el borde entre dos campos.

Ejemplo real: en `Alcohol en Gel`, el término `gel alcohol` **matchea** porque el tipo termina donde
empieza el nombre. Y el test que cubre la búsqueda sólo prueba coincidencias dentro de un mismo campo, así
que la desviación pasó verde.

El efecto visible es doble: coincidencias que dependen del orden en que se concatenaron los campos, y un
spec (§2) que dice una cosa («busca en nombre, categoría, tipo y descripción») mientras el código hace
otra (busca en la unión).

## 2. Solución

Definir la búsqueda como **una conjunción de términos por campo**:

- El término se parte en palabras.
- **Cada palabra** tiene que aparecer en **alguno** de los cuatro campos.
- La comparación sigue siendo sin mayúsculas y sin acentos, como hoy.
- Categoría sigue siendo un filtro exacto por separado.

Con esto, `gel alcohol` sigue encontrando `Alcohol en Gel` (las dos palabras están, una en cada campo) y
desaparece la coincidencia que dependía de que los campos estuvieran pegados. La regla del spec §2 se
precisa en el mismo movimiento: no se busca «en la unión», se busca «cada palabra en algún campo».

## 3. Historias

1. Como Cliente, quiero que el buscador encuentre un producto escribiendo sus palabras en cualquier
   orden, para no adivinar el nombre exacto.
2. Como Cliente, quiero que una palabra suelta encuentre productos en los que aparece en la descripción,
   para descubrir productos que no conozco.
3. Como Cliente, quiero que la búsqueda ignore acentos y mayúsculas, para no pelear con el teclado.
4. Como Cliente, quiero que la búsqueda no invente coincidencias por cómo se pegaron los campos, para
   confiar en los resultados.
5. Como Cliente, quiero que el filtro por categoría siga funcionando junto con la búsqueda, para acotar
   sin perder el término.
6. Como Cliente, quiero que una búsqueda sin resultados muestre el estado propio del catálogo, para poder
   volver a intentar.
7. Como Cliente, quiero que la URL siga reflejando la consulta, para compartir un resultado.
8. Como Celeste, quiero un test que fije el caso de borde entre campos, para que la desviación no vuelva.
9. Como Celeste, quiero tests de coincidencia dentro de un solo campo, para no romper lo que ya andaba.
10. Como revisor, quiero que el spec del catálogo §2 diga la regla real, para que el documento y el código
    no se contradigan.
11. Como desarrollador, quiero un solo módulo de búsqueda, sin reimplementarla en la página, para no
    duplicar la regla.
12. Como Cliente, quiero que la búsqueda siga sin tocar la base, para que sea instantánea.

## 4. Decisiones de implementación

- **La regla es «todas las palabras, cada una en algún campo»** (conjunción de términos), no «el término
  como subcadena de la unión».
- **Se conserva la normalización actual**: minúsculas y sin diacríticos, en un solo lugar.
- **Categoría sigue siendo filtro exacto**, aplicado antes que la búsqueda.
- **El módulo de catálogo sigue siendo el único que filtra**; la página no reimplementa nada.
- **El spec del catálogo §2 se precisa** con la regla nueva, y su tabla de desviación deja de estar
  abierta. Es un spec que esta tanda toca: se le aplica la plantilla vigente.
- **Sin cambios en la base ni en la vista** del catálogo.
- **Sin orden por relevancia ni paginación**: siguen fuera de alcance, como hoy.

## 5. Decisiones de testing

- **Módulo puro, test puro:** el seam existente es el módulo de filtrado del catálogo, con sus tests de
  lógica.
- **Casos que fijan la regla:**
  - `gel alcohol` encuentra `Alcohol en Gel` (palabras en campos distintos, en orden invertido);
  - `alcohol` encuentra por nombre y `gel` por tipo, cada uno por separado;
  - una palabra que no aparece en ningún campo no devuelve resultados;
  - una búsqueda con acento encuentra el producto sin acento y al revés;
  - la categoría se sigue respetando junto con la búsqueda.
- **Lo que no se testea:** el orden exacto de los campos concatenados, porque deja de existir.
- **Prior art:** `tests/front/catalogo-filtros.test.ts` y `tests/front/catalogo.test.ts`.

## 6. Fuera de alcance

- Ranking por relevancia, tolerancia a errores de tipeo o sinónimos.
- Paginación del catálogo.
- Filtro por precio u orden configurable.
- Cambiar la forma en que la página lee la consulta de la URL.

## 7. Notas finales

- Decisión tomada el 27-10: se prefirió la conjunción de términos a la coincidencia por campo estricta
  (`gel alcohol` no debe dejar de encontrar `Alcohol en Gel`) y a dejar la unión como estaba.
- El caso de borde existía desde el primer buscador y el test lo tapaba por no probar el cruce.
- Este spec y el del test del 404 del detalle salen de la auditoría del 27-10: eran desviaciones sin
  tarea en el tablero.

---

## 8. Estado de implementación (2026-10-28 · issue #41)

`npm run typecheck` sin errores, `npm run lint` en 0 y la suite en verde con los tests nuevos.

| Criterio | Estado | Evidencia |
|---|---|---|
| El término se parte en palabras; cada una en alguno de los cuatro campos | implementado | `src/lib/catalogo.ts:127-141` (`filtrar`): `palabras.every((palabra) => campos.some(...))` |
| `gel alcohol` sigue encontrando `Alcohol en Gel` | implementado | test *«sigue encontrando el caso que antes pasaba por casualidad»* (`tests/front/catalogo-filtros.test.ts`) |
| Se acaban las coincidencias que dependían de la concatenación | implementado | test *«encuentra un producto con las palabras en campos distintos y en cualquier orden»*: `glicerina alcohol` (descripción + nombre) devolvía `[]` antes y ahora encuentra el producto |
| Una palabra de otro producto no crea coincidencia | implementado | test *«cada palabra tiene que aparecer en algún campo del mismo producto»*: `jabón zinc` y `crema shampoo` devuelven `[]` |
| Sin mayúsculas ni acentos, en todas las palabras | implementado | test *«ignora acentos y mayúsculas en todas las palabras»* (`GLICERINA Alcohol`, `emulsión zinc`, espacios de más) |
| Categoría exacta junto con la búsqueda | implementado | test *«la categoría se sigue respetando junto con las palabras»* |
| El spec del catálogo §2 dice la regla real | implementado | [`catalogo/spec.md` §2](../catalogo/spec.md); la fila de desviación de su §8 pasó a ✅ |
| Un solo módulo de búsqueda | implementado | el filtrado vive en `src/lib/catalogo.ts`; `src/app/catalog/page.tsx:50` sólo le pasa la consulta |
