---
name: tablero-teams
description: "Mueve tareas del tablero de Teams, crea tareas nuevas, limpia la papelera (>24h) y publica avances en la bandeja con el puente `npm run teams`."
whenToUse: "Al cerrar una sesión de implementación en esenciatecnica, al auditar el tablero contra lo hecho, o cuando alguien pide marcar, crear, archivar en papelera o publicar una tarea del equipo."
---

# SKILL: tablero-teams

## 1. PROPÓSITO

Operar el tablero (`team_tasks`) y la bandeja (`team_discussions`) de Teams desde este repo a través del
único camino de escritura permitido: [`scripts/teams-tablero.mjs`](../../../scripts/teams-tablero.mjs)
(`npm run teams`). El contrato de columnas, los estados, la sintaxis exacta de los cinco subcomandos
(`leer`, `estado`, `nueva`, `publicar`, `papelera`) y el ritual de cierre viven en
[`docs/agentes/teams.md`](../../../docs/agentes/teams.md) §3–§6; esta skill fija las guardias operativas
y el orden de ejecución sin duplicar esa referencia.

## 2. PARÁMETROS DE ENTRADA

- `subcomando`: `leer` · `estado` · `nueva` · `publicar` · `papelera` (ver sintaxis completa en [`docs/agentes/teams.md`](../../../docs/agentes/teams.md) §5).
- `--autor`: obligatorio en toda escritura; debe ser uno de los cuatro `key` canónicos (`Juanma` · `Isabella` · `Celeste` · `Enzo`).
- `--nota` / `--descripcion` / `--texto`: evidencia concreta (commit, test, comando corrido y qué queda pendiente en vivo).

## 3. GUARDRAILS

- NO escribas a mano contra PostgREST desde PowerShell 5.1 (desarma los `byte[]` JSON y provoca `PGRST102`): usá siempre `npm run teams`.
- NO inventes ni heredes `--autor` ni `task_id` (en `task_notes` no hay FK aplicada y un UUID falso entra igual; el script resuelve y valida unicidad antes de escribir).
- NO marques `done` sin evidencia: `backlog` = no empezada · `in_progress` = en curso · `review` = hecha en repo con código y test pero sin verificar en vivo · `done` = terminada con commit y test verificados (o excepción de documentación/configuración de `AGENTS.md` §8).
- NO omitas `task_notes` ni `task_audit_logs`: el puente los registra automáticamente en cada `estado`, `nueva` y `papelera --confirmar`. Si una tarea vuelve de `done`, limpiá `completed_at` y dejá la nota explicando el motivo.
- NO prometas envío de correo al publicar en la bandeja (`team_discussions` no dispara Resend; los correos salen sólo por `/api/notifications`) ni caches el listado del tablero en `AGENTS.md` o `memory.md`.

## 4. PASOS DE EJECUCIÓN

Seguir los pasos del ritual de [`docs/agentes/teams.md`](../../../docs/agentes/teams.md) §6:

1. **Auditar:** correr `npm run teams -- leer` y contrastar con `git log`, la suite y `npm run bd:viva` (skill `bd-viva`).
2. **Actualizar y crear:** mover a `done` o `review` según la evidencia con `npm run teams -- estado` y abrir las tareas descubiertas con `npm run teams -- nueva`.
3. **Limpiar papelera:** listar con `npm run teams -- papelera --autor <key>` las tareas `done` con más de 24 h y archivarlas con `--confirmar`.
4. **Publicar y cerrar:** publicar las notas `AVANCE` y `BLOQUEO` en la bandeja con `npm run teams -- publicar` y reescribir `memory.md`.
