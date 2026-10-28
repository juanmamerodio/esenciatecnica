# Spec · El 404 del detalle de producto

> **Feature:** `detalle-404` · **Estado:** especificada, sin implementar · **Fecha:** 2026-10-27 · **Issue:** [#32](https://github.com/juanmamerodio/esenciatecnica/issues/32).
> **Origen:** `### Pendiente` de [`detalle-producto/spec.md`](../detalle-producto/spec.md) (el 404 por id
> inválido sólo lo sostiene el código) y hallazgo 🟡 n.º 3 de `memory.md`. No tiene tarea en el tablero.
> **Fuente de verdad:** [`docs/specs/detalle-producto/spec.md`](../detalle-producto/spec.md) §2.2 y HU-5 ·
> [`AGENTS.md`](../../../AGENTS.md) §8.
> **Responsable:** Juan Manuel Merodio.
> **Criterio de cierre:** el 404 por id inválido y por producto inexistente o dado de baja está cubierto
> por test, y el §2.2 del spec dice lo que la página hace.

---

## 1. Problema

`/producto/[id]` responde 404 en tres situaciones: un id con formato inválido (`abc`, `0`, `-1`), un id
válido que no existe, y un producto dado de baja (que la vista del catálogo ya filtra). Las tres están
implementadas, pero **ninguna tiene test**: la evidencia es el código, no una ejecución.

Dos consecuencias:

- Una regla de accesibilidad y de negocio —un producto retirado no se alcanza por URL directa— queda sin
  red. Cualquier refactor del detalle puede romperla en silencio.
- El spec no es preciso: §2.2 dice que la página «no filtra ni valida `activo`», y eso es cierto, pero se
  lee como si la página no validara nada. La página **sí** valida el formato del id antes de delegar el
  404. La desviación quedó anotada y sin cerrar.

## 2. Solución

Cubrir las tres situaciones con test y precisar el spec:

- **Se extrae la validación de formato del id a una función pura** del dominio del catálogo, con
  `id válido → número` y `cualquier otra cosa → nulo`.
- **Se testea la función pura** con los casos de borde: `abc`, `0`, `-1`, `1.5`, `1 `, vacío, un número
  gigante fuera del rango seguro y un id válido.
- **Se testea la página como estructura**: llama al 404 cuando el formato es inválido y cuando el
  producto no está en el catálogo; no valida `activo` por su cuenta (eso vive en la vista).
- **Se corrige el §2.2 del spec**: la página valida el **formato** del id a propósito y delega en la
  vista la regla de `activo`. Como es un spec que esta tanda toca, se le aplica la plantilla vigente.

## 3. Historias

1. Como Cliente, quiero que una URL con un id inventado me dé un 404 claro, para no ver una página rota.
2. Como Cliente, quiero que un producto dado de baja no se pueda abrir por URL directa, para no comprar
   algo que ya no está en la tienda.
3. Como Cliente, quiero que un id válido pero inexistente dé el mismo 404, para no distinguir entre
   «borrado» y «nunca existió».
4. Como Cliente, quiero que el 404 no muestre datos de otro producto, para no comprar por error.
5. Como desarrollador, quiero la validación del id en una función pura, para poder probarla sin montar la
   página.
6. Como Celeste, quiero tests de los ids inválidos, para que la regla no dependa de leer el código.
7. Como Celeste, quiero que el test cubra también el borde numérico, para que un id fuera del rango
   seguro no se convierta en un producto por accidente.
8. Como revisor, quiero que el spec §2.2 diga qué valida la página y qué delega, para no leer una
   desviación donde hay una decisión.
9. Como integrante del equipo, quiero que este cambio no agregue campos al modelo, para que el detalle
   siga mostrando lo que hay.
10. Como Cliente, quiero que la página con un id válido siga funcionando igual, para que la corrección no
    cambie el camino feliz.
11. Como desarrollador, quiero que la función de validación viva en el módulo del catálogo, para no crear
    un módulo nuevo para una sola función.
12. Como revisor, quiero que el test nombre cada caso inválido, para saber qué se rompió cuando falle.

## 4. Decisiones de implementación

- **La validación del id se mueve al módulo del catálogo como función pura y exportada.** La página la
  importa y llama al 404 cuando devuelve nulo. No se crea un módulo nuevo.
- **La regla de validez es la actual**: sólo dígitos, entero positivo y dentro del rango seguro de
  `Number`. No se agregan formatos nuevos (nada de UUID, nada de slug).
- **La página no valida `activo`**: sigue delegando en la vista del catálogo, que ya filtra los productos
  dados de baja. Esa es la decisión, no una omisión.
- **El 404 es el mismo** para formato inválido, id inexistente y producto dado de baja: no se distinguen
  los casos de cara al Cliente.
- **El spec de detalle de producto se corrige** en §2.2 y en su `### Pendiente`, que pierde el punto del
  404.
- **No se agregan campos** al modelo ni a la vista.

## 5. Decisiones de testing

- **Seam existente:** el módulo del catálogo, que ya es la función pública de datos del detalle. Se
  prefiere a montar la página.
- **Test puro de la validación:** un caso por entrada inválida y uno por válida, con nombres que digan
  qué se está fijando.
- **Test de integración con PGlite (ya existe):** un producto dado de baja desaparece de la vista, así que
  su URL no lo alcanza. Se conserva como está.
- **Test estructural de la página:** llama al 404 cuando la validación devuelve nulo y cuando el producto
  no aparece en el catálogo; no contiene lógica de `activo`.
- **Prior art:** `tests/front/detalle-producto.test.ts` y `tests/front/catalogo.test.ts`.

## 6. Fuera de alcance

- Cambiar el diseño o el contenido de la página de detalle.
- Una página 404 personalizada del sitio.
- Validar ids en otras rutas (admin, remito).
- Mover la regla de `activo` del catálogo a la página.

## 7. Notas finales

- Este spec y el de la búsqueda por campos salen de la auditoría del 27-10: eran desviaciones sin tarea
  en el tablero.
- La corrección del §2.2 es de redacción, no de comportamiento: el código ya hacía lo correcto.
- El test del borde numérico (`99999999999999999999`) es el que más fácil se olvida y el que más caro sale
  si el id entra a una consulta sin validar.
