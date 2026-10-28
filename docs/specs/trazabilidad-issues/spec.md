# Spec · Trazabilidad de los issues del front y del esquema

> **Feature:** `trazabilidad-issues` · **Estado:** implementada en repo (issue #48) · **Fecha:** 2026-10-27, implementada el 2026-10-28 · **Issue:** [#24](https://github.com/juanmamerodio/esenciatecnica/issues/24) · **Tajada:** [#48](https://github.com/juanmamerodio/esenciatecnica/issues/48).
> **Origen:** hallazgo 🟡 de la auditoría del tablero del 27-10 (`memory.md`) y tarea `backlog` del tablero:
> *Cerrar los issues del front y del esquema ya implementados*.
> **Fuente de verdad:** [`AGENTS.md`](../../../AGENTS.md) §6.2 y §9 · [`docs/agentes/issue-tracker.md`](../../agentes/issue-tracker.md).
> **Responsable:** Juan Manuel Merodio.
> **Criterio de cierre:** T0–T8 cerrados con comentario de evidencia, #15–#23 abiertos y `npm run docs:links` en verde.

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
   el commit ni el tablero, para auditar el trabajo sin depender de ningún entorno.
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

---

## 8. Estado de implementación (2026-10-28 · issue #48)

La verificación es el estado del tracker, no una suite: esta tajada es documentación y gobernanza
(excepción de `AGENTS.md` §8). `npm run typecheck` y `npm run lint` en 0 y `npm test` con **388 tests en
29 archivos**, aunque ninguno de los tres habla del cierre.

| Criterio | Estado | Evidencia |
|---|---|---|
| #2, #5, #6, #8, #9, #10, #12, #13 y #14 cerrados con su comentario de evidencia | implementado | cerrados el 2026-10-28 con el comentario uniforme de cinco bloques (`gh issue view <n> --json state,comments`) |
| Ningún cierre sin comentario y ninguno cita un commit o un test que no exista | implementado | los **22 commits** que citan los nueve —24 contando los dos de #3— existen en `main` y son ancestros de `HEAD` (`git log -1 <sha>`); los 17 archivos de test existen y **sus conteos coinciden uno a uno** con la corrida de la suite (7, 9, 11, 12, 14, 5, 17, 19, 40, 9, 25, 15, 15, 47, 8, 18 y 7) |
| Cada comentario dice qué queda pendiente de verificación en vivo y en qué issue vive | implementado | bloque «Qué queda pendiente de verificación en vivo» en los nueve: base migrada (#15, #16/B1), claves (#20/O1) y pantalla (#23/B6) |
| #15 a #23 siguen abiertos y sin cambios | implementado | sin cambio de estado ni de cuerpo en los nueve |
| Los specs de las tajadas ya no piden cerrar su ticket | implementado | el punto «cerrar el ticket TN» salió de `carrito`, `catalogo`, `checkout`, `detalle-producto` y `remito`; en su lugar quedó la nota del cierre, **con el issue cerrado hyperlinkeado**, y el puntero a la verificación en vivo (#23) |
| `gh issue list --state open` reducido al cierre beta y a los tickets nuevos | implementado | quedan **#15–#23** (cierre beta), los paraguas **#24, #25, #28, #29** y el paraguas del front **#1**; las tres tajadas de la tanda que seguían abiertas —**#45, #47 y #48**— se cerraron por el mensaje de su commit al subir |
| `npm run docs:links` en verde | implementado | 0 links sin resolver sobre 52 archivos `.md` |
| El tablero de Teams no cambia de estado **por los nueve** | implementado | las nueve tareas ya estaban en `done`/`review` y no se tocaron. La única fila que se movió es la de **esta** tajada: estaba en `backlog` —la premisa del issue era falsa— y pasó a `done` con su bitácora de evidencia. **La excepción se declara acá**, porque `teams.md` §3 define `done` como commit + test y `npm run teams` no acepta una nota sobre una tarea que ya está en su estado: esta tajada es documentación sin test de código (excepción de `AGENTS.md` §8) y su evidencia es el estado del tracker, verificado uno a uno |

### Hallazgos de esta sesión

Los seis se corrigieron acá; los tres últimos los encontró la **revisión en contexto limpio** del
2026-10-28 (dos ejes: Estándares y Spec) y se arreglaron antes de cerrar el ticket.

1. **Un cierre sin cerrar.** #14 tenía su comentario de evidencia publicado a las 23:14:56Z y seguía
   **abierto**: la sesión anterior se cortó entre el comentario y el `close`. Se cerró, y la spec de
   `remito` ya no afirma algo falso sobre su propio ticket.
2. **Un issue de la misma clase fuera de la lista.** #3 (F0 · tokens y shell) tenía código y test en
   `main` (`275d61c`, `tests/front/identidad-shell.test.ts`) y quedaba abierto, así que el criterio de la
   lista de abiertos no se cumplía. Se cerró con el mismo formato y su spec (§3.1 y §3.2 de `front-mvp`)
   quedó linkeada.
3. **Punteros a secciones que no existen o que no son.** Los comentarios de #10 y #13 mandaban a «§8,
   estado de implementación», pero en `checkout` y `admin` el §8 es **Blockers declarados** y el estado
   vive en el §9; y `migracion-otjph` citaba un `checkout` §4.3 que se renumeró al nacer el §4.1. Los
   tres se corrigieron: un revisor tiene que llegar al dato sin adivinar.
4. **El rojo de `bd:viva` mal atribuido.** Los nueve comentarios decían «`bd:viva` está rojo (#21)», y
   #21/B2 es el control que lo *mide*: el rojo es la migración sin aplicar (#15/#16). Se corrigieron los
   nueve comentarios.
5. **El link que la spec pedía, sin link.** Los cinco specs de tajada nombraban el issue cerrado en
   negrita (`(**#9**)`) en vez de linkearlo, contra §4 («se deja el link al issue cerrado»). Ahora los
   cinco hyperlinkean su issue.
6. **El contrato del tablero no contempla la excepción de documentación.** `teams.md` §3 define `done`
   como commit + test, y `AGENTS.md` §8 exceptúa documentación y configuración; `npm run teams` tampoco
   acepta una nota sobre una tarea que ya está en su estado. La excepción queda declarada en la fila de
   arriba y en `memory.md`. **Es un hallazgo de contrato, no un defecto del repo**: cambiarlo toca el
   ritual de todo el equipo y no es de esta tajada.

> **Fuera del alcance de la spec, decidido con el humano en la sesión:** la fila del tablero *«Cerrar los
> issues del front y del esquema ya implementados»* decía `backlog`, no `done` como suponía el issue #48;
> se movió a `done` con su bitácora.
>
> Y `main` estaba **27 commits adelante** de `origin/main`: los `closes #NN` de los mensajes y las cuatro
> puertas nuevas de CI (#39) nunca llegaron a GitHub. **El `build` de CI sí venía corriendo, y rojo desde
> el 26-10** por falta de `SUPABASE_SERVICE_ROLE_KEY` en Actions (#20) —`supabaseKey is required` en
> `/api/notifications`—. Se hizo push: **#45, #47 y #48 se cerraron** por mensaje de commit y la corrida
> `40787366670` dejó **Typecheck, Lint, Test y Docs links en verde** con el `build` todavía rojo por esa
> misma falta de secretos. El rojo de `build` es de **#20**, no de esta tajada; los comandos locales
> —`typecheck`, `lint`, `test`, `docs:links` y `build`— están todos en verde.
>
> **Los cierres por mensaje de commit no eximen del comentario.** `docs/agentes/issue-tracker.md` §13
> prescribe `gh issue close --comment`, y #45, #47 y #48 se cerraron por el `closes #NN` de su commit;
> a los tres se les agregó después su comentario de evidencia, para que ningún issue quede cerrado sin
> poder reconstruir por qué. **El `build` de CI no es el único rojo esperado:** el de `bd:viva` es la
> migración (#15/#16), no el control que la mide —#21/B2 es el script de `bd:viva`, no la causa.
>
> **Fuera de la letra de §4 (que sólo manda retirar el punto de cierre de cada tajada):** se
> actualizaron además las filas de estado de `front-mvp` §11 y de `migracion-otjph` §7.4 que seguían
> dando por **pendientes** `.agents/skills/` (#45) y `FlaskConical` (#43) cuando ya estaban hechos y
> cerrados. Es la misma verdad que persigue esta tajada: una fila `pendiente` sobre trabajo terminado
> es el mismo defecto que un issue abierto sobre código en `main`.
