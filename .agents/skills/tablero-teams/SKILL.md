---
name: tablero-teams
description: "Mueve tareas del tablero de Teams, crea tareas nuevas y publica avances en la bandeja con el puente `npm run teams`."
whenToUse: "Al cerrar una sesión de implementación en esenciatecnica, al auditar el tablero contra lo hecho, o cuando alguien pide marcar, crear o publicar una tarea del equipo."
---

# SKILL: tablero-teams

## 1. PROPÓSITO

Operar el tablero de Teams (`team_tasks`) desde este repo con el único camino de escritura permitido:
`npm run teams`. El contrato completo, los estados y el ritual viven en
[`docs/agentes/teams.md`](../../../docs/agentes/teams.md); esta skill es el procedimiento, no la copia.

## 2. ANTES DE ESCRIBIR

- **`--autor` es obligatorio y no se inventa.** Los cuatro `key` canónicos son `Juanma`, `Isabella`,
  `Celeste` y `Enzo`; el script rechaza cualquier otro. No se hereda del último que escribió.
- **Un estado, un significado.** `backlog` = no empezada · `in_progress` = se está trabajando ahora ·
  `review` = **hecha en repo, sin verificar en vivo** (hay código y test, falta la base migrada, las
  claves o la firma del responsable) · `done` = **con evidencia**: el commit y el test existen.
- **Nunca digas verde con el comando rojo.** Si el criterio depende de la base viva y `npm run bd:viva`
  sigue rojo, el estado es `review`; para eso está la skill `bd-viva`.
- **Escribí sólo lo que la sesión justifica.** La RLS del proyecto Teams está abierta a la anon key: es
  deuda de seguridad de Teams, no una invitación.

## 3. COMANDOS

```bash
# Leer el tablero completo, o filtrar
npm run teams -- leer
npm run teams -- leer --estado review --asignado Isabella

# Mover una tarea (id o texto del título) con su bitácora
npm run teams -- estado "Cron de los viernes" review --autor Juanma \
  --nota "Implementado en repo: ruta, cron-auth y vercel.json. Falta CRON_SECRET."

# Crear una tarea
npm run teams -- nueva --titulo "…" --asignado Enzo --prioridad ALTA \
  --tag BACKEND --der Pedido --horas 4 --descripcion "…" --autor Juanma

# Publicar en la bandeja
npm run teams -- publicar --categoria AVANCE --titulo "…" --texto "…" --autor Juanma
```

Cada `estado` y cada `nueva` escriben además una nota en `task_notes` y un registro en
`task_audit_logs`: **la bitácora y la auditoría no son opcionales**. Si una tarea vuelve de `done`,
`completed_at` no se limpia solo: corregilo a mano y dejá la nota explicando por qué.

## 4. PASOS DE EJECUCIÓN (cierre de sesión)

1. **Auditar:** `npm run teams -- leer` contra `git log` y la suite. Qué quedó hecho y qué espera la
   base viva.
2. **Mover:** `done` sólo con evidencia; `review` lo que está en repo sin verificar en vivo; el resto
   queda anotado con lo que falta.
3. **Crear** las tareas que la sesión dejó descubiertas (deuda, hallazgos, verificaciones pendientes).
4. **Publicar** una nota `AVANCE` con lo hecho y una `BLOQUEO` si algo frena al equipo.
5. **Cerrar `memory.md`** con el estado real y el tablero ya sincronizado.

## 5. GUARDRAILS

- NO escribas a mano contra PostgREST: el shell del agente desarma el JSON (gotcha `PGRST102`); el
  camino es siempre `npm run teams`.
- NO emparejes tareas por título sin verificar que la coincidencia sea única: si hay varias, el script
  lista los candidatos con su `id` y hay que elegir por `id`.
- NO inventes `task_id` en `task_notes`: la columna no tiene FK aplicada y un id falso entra igual.
- NO prometas el email del equipo: publicar en la bandeja no manda correo; eso sale sólo por
  `/api/notifications`.
- NO caches el tablero en `AGENTS.md` ni en `memory.md`: se lee con `npm run teams -- leer`.
