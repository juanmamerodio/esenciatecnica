# Spec · Plantilla de spec

> **Feature:** `plantilla-de-spec` · **Estado:** implementada en repo (issue #40) · **Fecha:** 2026-10-27, implementada el 2026-10-28 · **Issue:** [#29](https://github.com/juanmamerodio/esenciatecnica/issues/29) · **Tajada:** [#40](https://github.com/juanmamerodio/esenciatecnica/issues/40).
> **Origen:** hallazgo 🟡 de `memory.md` (ningún spec tiene sección de notas finales y 25 HU no enuncian
> actor ni beneficio) y tarea `BAJA` del tablero:
> *Plantilla de spec: notas finales y HU con actor y beneficio*.
> **Fuente de verdad:** [`AGENTS.md`](../../../AGENTS.md) §6.2 ·
> [`docs/metodo/brain.md`](../../metodo/brain.md) §3 · specs existentes en `docs/specs/`.
> **Responsable:** Juan Manuel Merodio.
> **Criterio de cierre:** existe la plantilla, `AGENTS.md` §6.2 la linkea, y los specs que esta tanda
> toca cumplen sus secciones con test que lo fije.

---

## 1. Problema

Los once specs del repo se escribieron de a uno y crecieron con formas distintas:

- **Ocho de once no tienen sección de notas finales.** Las decisiones y los supuestos que no entraron en
  ninguna otra sección se pierden, y la próxima sesión los redescubre a mano.
- **Veinticinco historias de usuario no enuncian actor ni beneficio.** Una HU sin «como quién» ni «para
  qué» no permite decidir si un ticket la cumple: se convierte en una lista de criterios sueltos.
- Las secciones cambian de nombre y de orden entre specs, así que ni una persona ni un agente pueden
  recorrerlos en diagonal ni comparar el estado de dos tajadas.

El costo aparece en la etapa siguiente: para cortar tickets hay que interpretar cada spec de nuevo.

## 2. Solución

Una **plantilla única** en `docs/specs/PLANTILLA.md`, linkeada desde `AGENTS.md` §6.2, con las secciones
canónicas y la forma exacta de una HU. Los specs nuevos nacen con la plantilla; los specs que esta tanda
de trabajo toca se retrofitean; el resto queda como está hasta que una tarea los alcance.

Secciones de la plantilla:

1. **Problema** — desde el punto de vista de quien lo sufre.
2. **Solución** — desde el punto de vista de quien la usa.
3. **Historias y criterios de aceptación** — cada HU con `Como <actor>, quiero <feature>, para <beneficio>`
   y sus Given/When/Then.
4. **Decisiones de implementación** — módulos, interfaces, contratos y schema, sin rutas de archivo ni
   fragmentos de código.
5. **Decisiones de testing** — qué seam se usa, qué se testea y el prior art.
6. **Fuera de alcance**.
7. **Notas finales** — supuestos, correcciones de evidencia y lo que no hay que redescubrir.

## 3. Historias

1. Como Juanma, quiero escribir un spec nuevo siguiendo una plantilla, para no decidir el formato cada
   vez.
2. Como Isabella, quiero que las HU digan el actor y el beneficio, para saber si mi ticket la cumple.
3. Como Celeste, quiero una sección de testing en todos los specs, para saber en qué seam se prueba sin
   leer el código.
4. Como Enzo, quiero una sección de fuera de alcance, para no implementar de más.
5. Como integrante del equipo, quiero una sección de notas finales, para que las decisiones que no
   entraron en otro lado queden escritas.
6. Como agente, quiero que los specs tengan el mismo orden de secciones, para poder recorrerlos sin
   adivinar.
7. Como revisor, quiero un test que verifique las secciones y la forma de las HU, para que la plantilla
   no se degrade con el tiempo.
8. Como Juanma, quiero que la plantilla viva en `docs/specs/`, junto a los specs, para encontrarla sin
   buscarla.
9. Como integrante del equipo, quiero que `AGENTS.md` §6.2 linkee la plantilla, para que el contrato y el
   formato no se separen.
10. Como integrante del equipo, quiero que el retrofit alcance sólo a los specs que esta tanda modifica,
    para no reescribir documentos que nadie está tocando.
11. Como revisor, quiero que la plantilla no prescriba rutas de archivo, para que el spec no envejezca
    cuando el código se mueva.
12. Como Celeste, quiero que las notas finales registren las correcciones de evidencia, para que un dato
    falso no vuelva a circular.
13. Como integrante del equipo, quiero que la plantilla esté en español, como el resto de la
    documentación, para no introducir un idioma nuevo en el repo.
14. Como Juanma, quiero que la plantilla quepa en una pantalla, para que se lea antes de escribir, no
    después.

## 4. Decisiones de implementación

- **Ubicación:** `docs/specs/PLANTILLA.md`, con el mismo encabezado en blockquote que usan los specs
  (feature, estado, fecha, origen, fuente de verdad, responsable, criterio de cierre).
- **Forma de HU obligatoria:** `Como <actor>, quiero <feature>, para <beneficio>`, seguida de sus
  criterios en Given/When/Then. Una HU sin actor o sin beneficio no cumple la plantilla.
- **Sin rutas de archivo ni fragmentos de código** en las decisiones de implementación; se nombran los
  módulos por su concepto. Excepción: si un fragmento codifica una decisión mejor que la prosa (una
  máquina de estados, un contrato), se incluye recortado y se anota que viene de un prototipo.
- **Una sección de estado de implementación** es opcional y sólo la agregan los specs que ya fueron
  auditados contra el código.
- **Retrofit acotado:** se aplican las secciones faltantes —notas finales incluidas— y se reescriben como
  `Como… para…` las HU de los specs que esta tanda toca: carrito, checkout, catálogo, detalle de
  producto, sobre el proyecto, admin y remito. Los specs no tocados quedan como están.
- **`AGENTS.md` §6.2** suma el puntero a la plantilla, sin copiar su contenido.
- **La plantilla no reemplaza al issue:** el issue sigue siendo la spec publicada; la plantilla ordena el
  documento.

## 5. Decisiones de testing

- **Test estructural de documentación**, en el mismo seam que el verificador de links: recorre
  `docs/specs/*/spec.md` y exige, en cada spec, las siete secciones de la plantilla; y en cada bloque de
  HU, la forma `Como … quiero … para`.
- **El test no exige longitud ni redacción**, sólo estructura: se testea la plantilla, no el estilo.
- **`npm run docs:links`** sigue siendo el control de los enlaces relativos.
- **Prior art:** `scripts/verificar-links-docs.mjs` y los tests estructurales que recorren el repo.
- La plantilla en sí se verifica por su uso: si un spec no la sigue, el test lo nombra.

## 6. Fuera de alcance

- Reescribir las 25 HU de todos los specs existentes en una sola pasada.
- Migrar los cuerpos de los issues de GitHub al nuevo formato.
- Traducir o reescribir la documentación que no sea spec.
- Cambiar el proceso de publicación de specs en el tracker.

## 7. Notas finales

- La decisión «plantilla + retrofit sólo de los specs que toquemos» se tomó el 27-10: el retrofit total
  es trabajo de documentación sin dueño y no bloquea nada.
- La plantilla nace de la forma que ya usan los mejores specs del repo (problema, solución, HU,
  decisiones, testing, fuera de alcance) y agrega lo que faltaba: notas finales y HU con actor.
- Si un spec viejo se toca por otro motivo, se retrofitea en ese momento: la plantilla avanza por
  contacto, no por barrido.

---

## 8. Estado de implementación (2026-10-28 · issue #40)

`npm run typecheck` sin errores, `npm run lint` en 0 y la suite en verde con el test nuevo.

| Criterio | Estado | Evidencia |
|---|---|---|
| Existe `docs/specs/PLANTILLA.md`, en español y en una pantalla | implementado | `docs/specs/PLANTILLA.md` (86 líneas); tests *«está en español y cabe en una pantalla»* |
| Declara las siete secciones en orden y la forma exacta de una HU | implementado | tests *«declara las siete secciones, en orden»* y *«declara la forma exacta de una HU»* |
| No prescribe rutas de archivo ni fragmentos de código | implementado | test *«no prescribe rutas de archivo ni fragmentos de código»* |
| `AGENTS.md` §6.2 linkea la plantilla | implementado | test *«`AGENTS.md` §6.2 linkea la plantilla sin copiarla»*; §6.2 sólo la nombra y la linkea |
| Test estructural sobre `docs/specs/*/spec.md` | implementado | `tests/front/plantilla-de-spec.test.ts`: siete secciones en orden y forma de HU en cada spec, con los pendientes nombrados y su motivo |
| `npm run docs:links` en verde | implementado | 0 links sin resolver |

**Hallazgos del propio test** (los tres se corrigieron acá, porque son de una línea): las HU 13 de este
spec, 8 de `skills-del-proyecto` y 8 de `trazabilidad-issues` no enunciaban beneficio.

**Pendiente de la tanda:** el retrofit de los siete specs que toca la tanda del 27-10 es **#47**; los
otros tres specs que no siguen la plantilla (`bd-mvp`, `front-mvp` y `migracion-otjph`) quedan como están
hasta que una tarea los alcance, y están nombrados en el test con ese motivo.
