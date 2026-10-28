# Spec · Integración continua: typecheck, lint y test en cada push

> **Feature:** `integracion-continua` · **Estado:** implementada en repo (issue #39) · **Fecha:** 2026-10-27, implementada el 2026-10-28 · **Issue:** [#30](https://github.com/juanmamerodio/esenciatecnica/issues/30) · **Tajada:** [#39](https://github.com/juanmamerodio/esenciatecnica/issues/39).
> **Origen:** tarea `MEDIA` del tablero: *CI: correr typecheck, lint y test en cada push*.
> **Fuente de verdad:** [`AGENTS.md`](../../../AGENTS.md) §8 (definición de terminado) ·
> [`package.json`](../../../package.json) (comandos de verificación).
> **Responsable:** Juan Manuel Merodio.
> **Criterio de cierre:** un push a `main` con un error de tipos, de lint o un test rojo falla en GitHub
> Actions antes que en la máquina de nadie.

---

## 1. Problema

El workflow de integración continua del repo **sólo compila**. La línea base del proyecto es verde
—`typecheck` y `lint` en 0 y 279 tests—, pero nada la sostiene desde GitHub:

- Un error de tipos o de lint llega a `main` sin que nadie lo vea; el build lo tapa, porque
  `next.config.ts` tiene `ignoreBuildErrors: true`.
- Un test rojo se descubre en la sesión siguiente, cuando el contexto ya se perdió.
- La regla de `AGENTS.md` §8 («un ticket no está terminado hasta que typecheck, lint y test pasan») se
  verifica a mano, ticket por ticket.

El workflow existente sí pide los secretos necesarios para compilar, así que el camino ya está armado:
lo que falta es correr los controles.

## 2. Solución

Ampliar el workflow para que cada push y cada pull request contra `main` corra, en este orden:
**`typecheck` → `lint` → `test` → `docs:links` → build**. El primer paso que falla corta el job y GitHub
marca el commit en rojo.

- `bd:viva` **no** entra: necesita la base viva y los secretos, y hoy está rojo por diseño hasta que se
  apliquen las migraciones. Su lugar es el cierre de la migración, no cada push.
- Los controles que no necesitan secretos corren siempre, incluso en un fork o en un PR sin variables.

## 3. Historias

1. Como integrante del equipo, quiero que un push con errores de tipos falle en GitHub, para no
   descubrirlo en la sesión siguiente.
2. Como Celeste, quiero que la suite corra en cada push, para que un test rojo no llegue a `main`.
3. Como Juanma, quiero que el lint sea una puerta de entrada, para que los warnings no se acumulen.
4. Como revisor, quiero que el link checker de la documentación corra en CI, para que un enlace roto no
   quede en `main`.
5. Como integrante del equipo, quiero que el build siga corriendo, para no perder el control que ya
   existía.
6. Como Enzo, quiero que los pasos que no necesitan secretos corran siempre, para que un PR sin variables
   igual verifique estilo y tests.
7. Como integrante del equipo, quiero que el job no corra `bd:viva`, para que un rojo esperado no bloquee
   todos los pushes.
8. Como Juanma, quiero que un push nuevo cancele la corrida anterior de la misma rama, para no esperar
   dos veces por el mismo commit.
9. Como Celeste, quiero que la salida del test se vea completa en el log de GitHub, para diagnosticar sin
   reproducir localmente.
10. Como integrante del equipo, quiero que la instalación use el lockfile, para que CI y producción usen
    las mismas versiones.
11. Como revisor, quiero que el workflow esté versionado y comentado, para entender por qué cada paso
    existe.
12. Como integrante del equipo, quiero que `AGENTS.md` §8 diga que la puerta es GitHub además de local,
    para que la definición de terminado sea una sola.

## 4. Decisiones de implementación

- **Un solo job** con pasos secuenciales: typecheck, lint, test, `docs:links`, build. Simple de leer y de
  diagnosticar; no hay matriz de versiones de Node.
- **Node 20 y `npm ci`** con cache de npm, para respetar el lockfile.
- **Los pasos de verificación no reciben secretos**: `typecheck`, `lint`, `test` y `docs:links` no leen
  variables de entorno. El build conserva las variables que ya tenía el workflow.
- **`bd:viva` queda explícitamente afuera** y se documenta por qué: es un control contra la base viva, no
  una prueba de repo.
- **Cancelación de corridas concurrentes** de la misma rama: `concurrency` con `cancel-in-progress`.
- **Disparadores:** push y pull request contra `main`, como hoy.
- **`AGENTS.md` §8** se precisa: la puerta local y la de GitHub corren los mismos comandos, y `bd:viva`
  sigue siendo el control de la base viva.
- **No se cambia** `ignoreBuildErrors`: sacarlo es una decisión aparte, y con `typecheck` en CI queda
  cubierto el agujero mientras tanto.

## 5. Decisiones de testing

- **La configuración no se testea por comportamiento**: no hay forma de ejecutar GitHub Actions desde la
  suite (excepción de `AGENTS.md` §8 para configuración).
- **Test estructural liviano** del workflow: verifica que el archivo existe y contiene los comandos
  `typecheck`, `lint`, `test` y `docs:links`, y que **no** invoca `bd:viva`. Es la misma técnica de los
  tests que leen archivos del repo.
- **Verificación real (evidencia del issue):** una rama de prueba con un error de tipos deliberado hace
  fallar el job; la salida se pega en el issue y la rama se borra. Un push limpio posterior queda en
  verde.
- **Prior art:** los tests estructurales que leen archivos de configuración y de `src/`.

## 6. Fuera de alcance

- Deploy continuo, previews de Vercel o versionado de releases.
- Cobertura de tests mínima y reportes de cobertura.
- Matriz de sistemas operativos o de versiones de Node.
- Correr `bd:viva` en CI con secretos.
- Sacar `ignoreBuildErrors` de `next.config.ts`.

## 7. Notas finales

- El workflow ya existía: esta tajada agrega pasos, no un pipeline nuevo.
- La tentación de sumar `bd:viva` a CI es real y hay que resistirla: un control que depende del estado
  de la base viva convierte todos los pushes en rojos esperados y enseña a ignorar el CI.
- Si mañana se saca `ignoreBuildErrors`, el paso `build` pasa a ser una segunda puerta de tipos; no hay
  que cambiar el workflow para eso.

---

## 8. Estado de implementación (2026-10-28 · issue #39)

`npm run typecheck` sin errores, `npm run lint` en 0 y la suite en verde con el test nuevo.

| Criterio | Estado | Evidencia |
|---|---|---|
| Los cinco pasos en orden en cada push y PR contra `main` | implementado | [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml): `npm run typecheck` → `npm run lint` → `npm run test` → `npm run docs:links` → `npm run build` |
| El workflow **no** invoca `bd:viva` | implementado | el único `bd:viva` del workflow es un comentario que explica por qué queda afuera; test *«no invoca bd:viva y explica por qué queda afuera»* |
| Node 20 con `npm ci` y cache de npm | implementado | `actions/setup-node@v4` con `node-version: 20` y `cache: 'npm'`; paso `Install dependencies` con `npm ci` |
| La corrida anterior de la misma rama se cancela | implementado | bloque `concurrency` con `group: ${{ github.workflow }}-${{ github.ref }}` y `cancel-in-progress: true` |
| Los controles sin secretos corren siempre | implementado | sólo el paso `Build Next.js` recibe `secrets.*`; test *«los controles de repo no reciben secretos; el build conserva los suyos»* |
| La salida del test se ve completa en el log | implementado | paso `Test` con `CI: true` y sin `--silent` ni reporter escueto |
| `AGENTS.md` §8 dice que la puerta es local y de GitHub | implementado | [`AGENTS.md`](../../../AGENTS.md) §8, párrafo **«La puerta es local y de GitHub, con los mismos comandos»** |
| Test estructural liviano que fija los comandos y la ausencia de `bd:viva` | implementado | `tests/front/integracion-continua.test.ts` (10 tests) |
| `npm run docs:links` en verde | implementado | el spec linkea el workflow y `AGENTS.md` |

### Pendiente

- **Evidencia en GitHub de la verificación real del issue:** una rama de prueba con un error de tipos
  deliberado que haga fallar el job, la salida pegada en el issue y la rama borrada. Requiere un push a
  GitHub, así que no se puede cerrar desde una sesión local.
- Un push limpio posterior queda en verde (misma dependencia anterior).
