# Spec · Skills del proyecto en `.agents/skills/`

> **Feature:** `skills-del-proyecto` · **Estado:** especificada, sin implementar · **Fecha:** 2026-10-27 · **Issue:** [#28](https://github.com/juanmamerodio/esenciatecnica/issues/28).
> **Origen:** hallazgo 🟡 de `memory.md` (el directorio no existe) y tarea `BAJA` del tablero:
> *Publicar `.agents/skills/` o corregir `AGENTS.md` §11*.
> **Fuente de verdad:** [`AGENTS.md`](../../../AGENTS.md) §11 ·
> [`docs/agentes/teams.md`](../../agentes/teams.md) · [`docs/metodo/brain.md`](../../metodo/brain.md) §4.1.
> **Responsable:** Juan Manuel Merodio.
> **Criterio de cierre:** `.agents/skills/` existe con sus dos skills cargables, `AGENTS.md` §11 lista lo
> que hay de verdad y `npm run docs:links` queda verde.

---

## 1. Problema

`AGENTS.md` §11 declara que las skills propias de Esencia Técnica viven en el repo, en
`.agents/skills/<nombre>/SKILL.md`, «para que todo el equipo las tenga». **El directorio no existe.**

Hoy las skills viven en la carpeta global de cada máquina. Consecuencias:

- Isabella, Enzo y Celeste trabajan con lo que cada uno tenga instalado; el ritual del tablero y el
  control de la base viva no son reproducibles al clonar el repo.
- La documentación promete una fundación que no está: quien lee §11 y busca el directorio, no lo
  encuentra.
- El conocimiento operativo que sí existe —el contrato del tablero en `docs/agentes/teams.md` y el
  control `npm run bd:viva`— se descubre leyendo documentación larga, no desde el flujo de trabajo.

## 2. Solución

Crear `.agents/skills/` con **las dos skills propias del repo** y corregir §11 para que describa lo que
hay:

- **`tablero-teams`** — leer el tablero, mover una tarea con su bitácora, crear tareas nuevas y publicar
  en la bandeja con `npm run teams`; incluye el ritual de cierre de sesión y los gotchas que ya costaron
  tiempo.
- **`bd-viva`** — correr `npm run bd:viva`, leer su salida, distinguir un desajuste de esquema de un
  problema de cache de PostgREST y no confundir «`npm test` verde» con «base viva en verde».

Las skills se escriben con las reglas que impone el entorno real (archivo `SKILL.md`, descubrimiento de
un solo nivel, frontmatter sin `model` ni `tools`) y en español.

## 3. Historias

1. Como integrante del equipo, quiero clonar el repo y tener las skills propias, para no depender de lo
   que haya instalado en mi máquina.
2. Como Isabella, quiero una skill que me diga cómo leer el tablero y marcar el estado de mi tarea, para
   no preguntar por chat cómo se hace.
3. Como Isabella, quiero una skill que me explique cómo correr y leer `bd:viva`, para distinguir un
   desajuste de esquema de un cache viejo de PostgREST.
4. Como Enzo, quiero que la skill del tablero traiga el contrato de estados (`backlog`, `in_progress`,
   `review`, `done`), para no marcar `done` algo que sólo está en repo.
5. Como Celeste, quiero que la skill del tablero me obligue a dejar bitácora y log de auditoría, para que
   el historial no dependa de que alguien se acuerde.
6. Como Juanma, quiero que las skills sean cortas y apunten a la documentación existente, para no
   duplicar `teams.md` ni `AGENTS.md`.
7. Como revisor, quiero que `AGENTS.md` §11 liste las skills reales, para que el documento no prometa un
   directorio vacío.
8. Como integrante del equipo, quiero que las skills estén en español, como el resto del proyecto, para
   que cualquier integrante las lea sin traducir.
9. Como integrante del equipo, quiero que las skills no traigan `model:` ni `tools:` en el frontmatter,
   para que el runtime las cargue.
10. Como Celeste, quiero un test que verifique que cada skill tiene nombre kebab-case y descripción, para
    que una skill rota falle en la suite y no en la sesión de otro.
11. Como Juanma, quiero que este cambio no toque las skills globales de la máquina, para no romper el
    flujo de nadie.
12. Como integrante del equipo, quiero que el criterio de cierre incluya `npm run docs:links`, para que
    los punteros a `teams.md` no queden rotos.

## 4. Decisiones de implementación

- **Dos skills, no más.** El proyecto instala lo que necesita; no se copian colecciones de terceros ni se
  replican las skills genéricas de la agencia (esas siguen siendo globales).
- **Estructura de un solo nivel:** `.agents/skills/<nombre-kebab>/SKILL.md`. Nada de categorías
  intermedias, porque el runtime no las carga.
- **Frontmatter mínimo y permitido:** `name` (kebab-case, igual al nombre canónico), `description`,
  `whenToUse`, `metadata` y `user-invocable` si hace falta. **Sin** `model:` ni `tools:`.
- **Contenido por puntero:** cada skill resume el procedimiento y linkea la fuente (`docs/agentes/teams.md`
  para el tablero; `docs/specs/migracion-otjph/spec.md` y el script para `bd:viva`). No se copia la
  documentación.
- **La skill del tablero no reemplaza la regla de autoría:** sigue exigiendo `--autor` con el `key` real.
- **`AGENTS.md` §11 se corrige:** se enumera la lista real de skills del proyecto y se mantiene la regla
  del entorno (un solo nivel, sin `model`/`tools`, la del proyecto pisa a la global del mismo nombre).
- **No se toca** la instalación global ni el catálogo de skills de la máquina.

## 5. Decisiones de testing

- **Test estructural del front** (mismo seam que los tests que leen archivos del repo): recorre
  `.agents/skills/*/SKILL.md`, exige que exista al menos una skill, que el `name` del frontmatter sea
  kebab-case y coincida con el directorio, y que haya `description` y `whenToUse`.
- **Guardia explícita:** el test falla si aparece `model:` o `tools:` en el frontmatter, porque el
  entorno no los lee.
- **`npm run docs:links`** cubre los punteros relativos de las skills.
- **Prior art:** los tests de estructura que recorren `src/` y `docs/` en `tests/front/`.
- No se testea el comportamiento del runtime al cargar la skill: no es observable desde la suite.

## 6. Fuera de alcance

- Instalar o adaptar skills de terceros.
- Escribir skills para el resto del equipo fuera de las dos acordadas.
- Publicar las skills globales de la máquina dentro del repo.
- Cambiar el mecanismo del puente `npm run teams` o el script de `bd:viva`.

## 7. Notas finales

- Escribir una skill que el entorno no carga es código muerto: por eso el test también verifica la
  estructura, no sólo el texto.
- La decisión «publicar las dos skills» (en vez de sólo corregir `AGENTS.md`) se tomó el 27-10.
- Si mañana aparece una tercera skill propia, se suma a la lista de §11 en el mismo commit.
