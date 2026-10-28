# Spec · Trazabilidad de los issues del front y del esquema

> **Feature:** `trazabilidad-issues` · **Estado:** especificada, sin implementar · **Fecha:** 2026-10-27 · **Issue:** [#24](https://github.com/juanmamerodio/esenciatecnica/issues/24).
> **Origen:** hallazgo 🟡 de la auditoría del tablero del 27-10 (`memory.md`) y tarea `backlog` del tablero:
> *Cerrar los issues del front y del esquema ya implementados*.
> **Fuente de verdad:** [`AGENTS.md`](../../../AGENTS.md) §6.2 y §9 · [`docs/agentes/issue-tracker.md`](../../agentes/issue-tracker.md).
> **Responsable:** Juan Manuel Merodio.
> **Criterio de cierre:** T0–T8 cerrados con comentario de evidencia, #15–#22 abiertos y `npm run docs:links` en verde.

---

## 1. Problema

Nueve issues del front y del esquema (**#2, #5, #6, #8, #9, #10, #12, #13, #14** — los `T0` a `T8`) siguen
**abiertos** aunque `AGENTS.md` §9 los declara hechos, el tablero de Teams los da por `done` y el spec de
cada tajada cierra su `### Pendiente` con la frase *«cerrar el ticket TN»*.

GitHub y el tablero dicen cosas distintas del mismo trabajo. Desde el punto de vista del equipo:

- Quien entra al repo a ver qué falta recibe una lista falsa: los pendientes reales (#15, #16, #20, #23)
  se pierden entre nueve issues ya implementados.
- El estado `done` del tablero —que exige código **y** test— no tiene su reflejo en el tracker, así que
  no se puede auditar el uno contra el otro.
- Los specs prometen un cierre que nunca ocurrió: la trazabilidad existe en la documentación, no en el
  issue.

## 2. Solución

Cerrar los nueve issues con un **comentario de evidencia** y dejar escrito qué parte **no** está
verificada. La regla que ordena el cierre:

- Un issue no se cierra por confianza: se cierra con el **commit**, el **test que lo cubre** y el
  **estado del tablero**.
- El comentario de cierre dice, explícitamente, qué queda pendiente de verificación en vivo y en qué
  issue vive esa verificación (#15/#16 para la base, #20 para las claves, #23 para el navegador).
- Los issues del cierre beta (#15 a #23) **no se tocan**: su resultado depende de la base migrada y de
  las claves, y cerrarlos ahora sería volver al mismo error.

## 3. Historias

1. Como integrante del equipo, quiero que GitHub deje de mostrar como abiertos los tickets ya
   implementados, para que la lista de pendientes sea real.
2. Como integrante del equipo, quiero que cada cierre cite el commit y el test que lo cubren, para poder
   auditar el `done` del tablero contra el tracker.
3. Como Celeste, quiero que el cierre diga que la verificación en vivo queda en #23, para no confundir
   «implementado en repo» con «verificado en producción».
4. Como Isabella, quiero que #15 y #16 sigan abiertos hasta que `bd:viva` esté en verde, para que el
   cierre de la migración no se mezcle con el del front.
5. Como Enzo, quiero que #20 siga abierto aunque el código esté listo, para que la falta de secretos no
   desaparezca de la lista de bloqueos.
6. Como Juanma, quiero un comentario de cierre uniforme en los nueve issues, para no reescribir el mismo
   formato nueve veces ni olvidar un dato en el octavo.
7. Como integrante del equipo, quiero que cada spec de tajada pierda su `### Pendiente` de cierre de
   ticket, para que el documento no siga pidiendo algo ya hecho.
8. Como revisor externo, quiero poder reconstruir por qué un issue se cerró leyendo el issue, sin abrir
   el commit ni el tablero.
9. Como integrante del equipo, quiero que los issues nuevos de deuda y deuda técnica queden linkeados
   desde su spec, para que la trazabilidad no se corte al abrir trabajo nuevo.
10. Como Celeste, quiero que el checklist de cierre del issue mencione la evidencia pegada (comando y
    salida), para que la regla «verde de verdad» también aplique a los cierres.
11. Como Juanma, quiero que el cierre no reabra ni renombre issues existentes, para no perder los
    enlaces que ya apuntan a ellos.
12. Como integrante del equipo, quiero que al terminar esta tarea el tablero quede igual —ya dice
    `done`—, para que el cambio de estado no esconda el trabajo real.

## 4. Decisiones de implementación

- **Se cierran** #2, #5, #6, #8, #9, #10, #12, #13 y #14 con `gh issue close --comment`.
- **Comentario de cierre único**, con cinco bloques: qué se construyó, commits que lo contienen, tests
  que lo cubren, qué queda pendiente de verificación en vivo y el link al spec de la tajada.
- **No se cierran** #15, #16, #17, #18, #19, #20, #21 y #22: su criterio depende de la base viva o de las
  claves. #23 (punta a punta) es el issue donde se verifica en el navegador lo que estos nueve issues
  implementaron.
- **Los specs de las tajadas se actualizan** en su sección `### Pendiente`: se retira el punto «cerrar el
  ticket TN» y, cuando corresponde, se deja el link al issue cerrado.
- **Los issues nuevos** que salen de esta tanda de specs se linkean desde su spec con la forma
  `**Origen:** issue #N`.
- **El tablero de Teams no cambia de estado**: ya está `done` para estas tareas. Se deja una nota en la
  bitácora de la sesión, no un cambio de estado.
- **No se fusionan ni se renombran issues**: los enlaces existentes siguen siendo válidos.
- El cierre se hace **después** de publicar los specs nuevos, para que los comentarios puedan linkearlos.

## 5. Decisiones de testing

Esta tajada es documentación y gobernanza: no lleva test de código (excepción explícita de
`AGENTS.md` §8). Lo que se verifica es el **estado del tracker**, y la evidencia es:

- `gh issue list --state open` antes y después: la lista de abiertos queda reducida a #15–#23 más los
  issues nuevos de esta tanda.
- `npm run docs:links` en verde después de editar los `### Pendiente`.
- Un checklist en el issue: los nueve cierres tienen comentario, ninguno quedó sin él.

## 6. Fuera de alcance

- Cerrar o mover los issues del cierre beta (#15 a #23).
- Tocar el tablero de Teams.
- Reescribir la historia de los issues o migrarlos de repositorio.
- Los hallazgos de deuda de código, que tienen su propio spec.

## 7. Notas finales

- Los números de issue de este spec son los del repositorio `juanmamerodio/esenciatecnica` al 27-10.
- El orden importa: primero se publican los specs nuevos (para poder linkearlos), después se comentan y
  cierran los nueve.
- Si al momento del cierre un issue ya tiene un commit que no aparece en este spec, manda el commit: se
  cita ese y se anota la diferencia.
