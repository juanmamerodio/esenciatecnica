# Teams · tablero, bandeja y el puente `npm run teams`

> **Cuándo leer esto:** al cerrar una sesión de implementación en `esenciatecnica`, o cada vez que haya
> que marcar tareas, auditar las que quedan, limpiar la papelera o publicar un avance del equipo.
> **Puente:** [`scripts/teams-tablero.mjs`](../../scripts/teams-tablero.mjs) (`npm run teams`).
> **Repos:** el Hub y el Teams viven en `quimicashop`; este repo **consume** su tablero, no lo reimplementa.

---

## 1. Dónde vive el tablero

| Dato | Valor |
|---|---|
| Proyecto Supabase | Teams (`uchyattzuhaltsaxazce`) — **no** es la base del e-commerce (`otjph…`) |
| Repo del Hub | [`quimicashop`](https://github.com/juanmamerodio/quimicashop) · deploy en GitHub Pages |
| Tablero | `team_tasks` + `task_notes` + `task_audit_logs` |
| Bandeja | `team_discussions` (+ `team_discussion_comments`) |
| Miembros | `team_members` (los `key` son la autoría canónica) |
| Clave | la **anon key pública** está en `quimicashop/config.js`; el script la lee de ahí |
| DDL | `quimicashop/diagrams/supabase_teams_schema.sql` y `create_team_discussions.sql` |

La RLS del proyecto Teams es `USING (true)`: cualquiera con la anon key puede escribir. Es deuda de
seguridad de Teams, no una invitación: escribí sólo lo que la sesión justifica.

## 2. Los cuatro `key` de autoría

`Juanma` · `Isabella` · `Celeste` · `Enzo`

Toda escritura lleva `--autor <key>` (o `TEAMS_AUTOR` en el entorno). La autoría no se inventa ni se
hereda de lo último que se escribió.

## 3. Qué significa cada estado

| Estado | Significado en este equipo |
|---|---|
| `backlog` | no empezada |
| `in_progress` | alguien la está trabajando ahora |
| `review` | **hecha en repo, sin verificar en vivo**: hay código y test, pero falta la base migrada, las claves o la firma de su responsable |
| `done` | terminada **con evidencia**: el commit y el test que la cubren existen (o la razón explícita por la que el cambio es sólo de documentación o configuración, según [`AGENTS.md`](../../AGENTS.md) §8 y §10) |

`done` no es cortesía: si el criterio de aceptación depende de la base viva y `npm run bd:viva` sigue
rojo, el estado es `review`. Nunca digas verde con el comando rojo.

## 4. El contrato de `team_tasks`

| Columna | Valores |
|---|---|
| `title`, `description` | texto; la descripción dice alcance, dependencias y "listo cuando" |
| `assignee` | `key` de `team_members` |
| `status` | `backlog` · `in_progress` · `review` · `done` |
| `priority` | `ALTA` · `MEDIA` · `BAJA` |
| `tag` | `DATABASE` · `BACKEND` · `FRONTEND` · `ADMIN` · `DOCS` |
| `der_entity` | `General` · `Producto` · `Stock` · `Cliente` · `Pedido` · `Comprobante` · `remitos_de_venta` · `Admin` |
| `estimated_hours` | horas cátedra, `NUMERIC(4,1)` |
| `created_by` / `last_modified_by` | `key` de quien crea o toca |
| `completed_at` | sólo cuando el estado pasa a `done` |

La bandeja usa `category` ∈ `AVANCE` · `BLOQUEO` · `AYUDA` · `DEBATE` · `IDEA`, con `author_key`,
`author_name`, `title`, `content` y `read_by` (array de `key`).

## 5. Comandos

```bash
# Leer el tablero completo, o filtrar
npm run teams -- leer
npm run teams -- leer --estado review --asignado Isabella

# Mover una tarea (id o texto del título) y dejar bitácora
npm run teams -- estado "Cron de los viernes" review --autor Juanma \
  --nota "Implementado en repo: ruta, cron-auth y vercel.json. Falta CRON_SECRET."

# Crear una tarea
npm run teams -- nueva --titulo "…" --asignado Enzo --prioridad ALTA \
  --tag BACKEND --der Pedido --horas 4 --descripcion "…" --autor Juanma

# Publicar en la bandeja
npm run teams -- publicar --categoria AVANCE --titulo "…" --texto "…" --autor Juanma

# Papelera: listar o archivar las tareas done cerradas hace más de 24 h
npm run teams -- papelera --autor Juanma
npm run teams -- papelera --autor Juanma --confirmar
```

Cada `estado` y cada `nueva` escriben además una nota en `task_notes` y un registro en
`task_audit_logs`; `papelera --confirmar` respalda las tareas con sus notas en `docs/agentes/papelera/`
(ignorado en Git para no versionar volcados de `team_*` en este repo) y registra `DELETE` en
`task_audit_logs` con el `previous_state` completo, siguiendo el mismo contrato que `tasks.js` en
`quimicashop`.

## 6. El ritual de cierre de sesión

1. **Auditar**: leer el tablero y contrastarlo con `git log` y la suite. Qué quedó hecho, qué espera la
   base viva o las claves.
2. **Mover**: `done` con evidencia; `review` lo que está en repo sin verificar en vivo; el resto queda
   anotado con lo que falta.
3. **Crear** las tareas que la sesión dejó descubiertas (deuda, hallazgos, controles en vivo pendientes).
4. **Papelera**: correr `npm run teams -- papelera --autor <key> --confirmar` para retirar del tablero
   activo las tareas `done` con más de 24 horas de antigüedad.
5. **Publicar** en la bandeja: una nota `AVANCE` con lo hecho y una `BLOQUEO` si algo frena al equipo.
6. **Cerrar** `memory.md` con el estado real y el tablero ya sincronizado.

Publicar en la bandeja **no** manda emails: el email del equipo sigue saliendo sólo por
`/api/notifications`, y avisar por correo es una decisión aparte.

## 7. Gotchas que ya costaron tiempo

- **El shell del agente es Windows PowerShell 5.1**, no `pwsh`. Armar el cuerpo JSON con un `if/else` que
  asigne un `byte[]` lo desenrolla a `Object[]` y PostgREST contesta `PGRST102 (Empty or invalid json)`.
  Por eso el camino es el script en Node: `npm run teams`.
- **`task_notes.task_id` no tiene FK aplicada**: un `task_id` inventado entra igual. Cuidado al escribir a
  mano; el script siempre resuelve la tarea primero y verifica cuántas coincidencias hay.
- **Emparejar por título puede ser ambiguo**: el script exige una única coincidencia y, si hay varias,
  lista los candidatos con su `id`.
- **`completed_at` no se limpia solo**: si una tarea vuelve de `done`, el script no lo borra; corregilo a
  mano y dejá la nota explicando por qué.
- **El tablero no se cachea** en `AGENTS.md` ni en `memory.md`: se lee con `npm run teams -- leer`. Lo que
  sí queda escrito acá es el **estado de la última auditoría**.

## 8. Cuándo se borra este puente

Cuando Teams tenga su propia función de tablero (o su CLI en `quimicashop`), se borra
`scripts/teams-tablero.mjs`, `scripts/teams-papelera-reglas.mjs`, las variables `TEAMS_*` de este repo y
esta referencia; igual que `/api/notifications` (`docs/estado/SEPARACION.md`).
