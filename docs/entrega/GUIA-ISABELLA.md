# Guía paso a paso · Isabella Infante

> **Para:** Isabella Infante — Database & SQL Architecture.
> **De:** Juan Manuel Merodio · **Fecha:** 2026-10-26.
> **Cómo se lee:** de arriba hacia abajo, en orden. Cada paso trae el comando exacto, el resultado que
> tenés que ver y el prompt que le podés pegar a Claude Code. Si el resultado no coincide, **pará y
> avisá** en la bandeja del Teams.
> **Contrato del repo:** [`AGENTS.md`](../../AGENTS.md). Si esta guía y `AGENTS.md` se contradicen, manda `AGENTS.md`.
> **Tu ticket:** [issue #15 · D1 · Cerrar la migración del MVP en `otjph`](https://github.com/juanmamerodio/esenciatecnica/issues/15).

---

## 0. En 30 segundos

**No hay que escribir SQL nuevo.** El esquema está aprobado y versionado en `supabase/migrations/`,
y esos seis archivos ya están **verdes** en la suite local (230 tests con PGlite). Lo único que falta
es **aplicarlos, en orden, sobre el proyecto vivo** y dejar el control que lo verifica en verde.

Medido hoy, 2026-10-26, con `npm run bd:viva` contra `otjphjnrwihqzzhbfnmh`:

**ROJO · 13 desajustes**

| # | Control | Resultado |
|---|---|---|
| 1 | `alerta_de_estado` | faltan `mensaje`, `atendida` |
| 2 | `cliente` | falta `creado_en` |
| 3 | `comprobante` | falta `subido_en` |
| 4 | `detalle_del_pedido` | falta `id_detalle_pedido` (vivo: `id_detalle`) |
| 5 | `estados_comprobante` | falta `id_comprobante` |
| 6 | `pedido` | faltan `creado_en`, `actualizado_en` |
| 7 | `producto` | faltan `creado_en`, `actualizado_en` |
| 8 | `stock` | falta `actualizado_en` |
| 9 | `vista_catalogo` | faltan `cantidad_actual`, `cantidad_reservada`, `disponible`, `cantidad_warning` |
| 10 | RPC `crear_pedido` | no existe (`PGRST202`) |
| 11 | `detalle_carrito` | sigue existiendo |
| 12 | bucket `comprobantes` | no existe |
| 13 | bucket `productos` | no existe |

**Buena noticia que te ahorra medio ticket:** la RLS ya está bien. Los doce controles de lectura y
escritura anónima sobre las seis tablas sensibles **pasan**. De tu tarea *"RLS y Storage"* solo falta
**Storage**: los dos buckets.

**La causa de fondo** no es el DDL: es que `npm test` corre contra PGlite con las migraciones del
repo, así que un proyecto a medio migrar deja toda la suite en verde. Por eso las dos tareas se
marcaron como hechas sin estarlo. Ese agujero ya lo cierra `npm run bd:viva`.

> **Tus dos tareas del tablero están en `review` y no corresponde**: el proyecto vivo no coincide con
> el repo. El paso 4.1 es devolverlas a `in_progress`.

---

## 1. Antes de empezar

### 1.1 Qué necesitás

```bash
node --version    # v20 o superior
git --version
```

Y **Claude Code** abierto sobre la carpeta del repo (paso 3).

### 1.2 Traer el repo

```bash
git clone https://github.com/juanmamerodio/esenciatecnica.git
cd esenciatecnica
npm install
```

### 1.3 Acceso al proyecto Supabase

Necesitás entrar al proyecto **`otjphjnrwihqzzhbfnmh`** (el del e-commerce) y abrir el **SQL Editor**.
Pedile la invitación a Juanma si todavía no la tenés. **No uses** el proyecto de Teams (`uchy…`):
ese tiene el catálogo viejo.

### 1.4 Tu `.env.local` para poder medir

`npm run bd:viva` lee `.env.local`. Alcanza con las dos variables públicas — así **no dependés de que
Enzo ponga la service role** para empezar a medir:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://otjphjnrwihqzzhbfnmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<la anon key del proyecto otjph>
```

La **anon key es pública por diseño**: no es un secreto. La que **nunca** va acá ni en el repo es la
`service_role`. `.env.local` no se commitea (ya está en `.gitignore`).

### 1.5 Tu línea base

```bash
npm run bd:viva
```

**Resultado esperado hoy:** `ROJO · 13 desajuste(s)`, con el mismo listado de la §0. Ese es tu punto
de partida, y va a ser tu prueba de que avanzaste.

---

## 2. Las seis reglas que no se negocian

| Regla | Qué significa para vos |
|---|---|
| **1 ticket = 1 sesión = 1 commit** | Una sesión de Claude Code por ticket. No arrastres contexto entre tareas. |
| **TDD obligatorio** | Primero el test que **falla**, después el código mínimo. Sin test no está terminado. |
| **El repo es el contrato** | Las migraciones de `supabase/migrations/` son la fuente de verdad. **No se inventa SQL.** Si algo no está en el modelo, se documenta y se consulta. |
| **Convergencia por reconstrucción** | `01` hace `drop … cascade` y recrea. No hay que reconciliar columna por columna lo que quedó a medias, y **no se agrega una migración `06` de reconciliación**. |
| **No se reescribe lo ya aplicado** | Si una migración ya corrió, su semántica no se cambia. Se corrige lo que está mal escrito y no corrió. |
| **Verde de verdad** | **Nunca digas que algo está verde si el comando está rojo.** Pegá el comando y su salida. |

El detalle está en [`AGENTS.md`](../../AGENTS.md) §5, §6 y §9, y en
[`docs/specs/migracion-otjph/spec.md`](../specs/migracion-otjph/spec.md) §4.

---

## 3. Cómo se trabaja con Claude Code y las skills

### 3.1 Abrir la sesión

```bash
cd esenciatecnica
claude
```

### 3.2 El prompt de arranque (copialo tal cual)

```
Leé AGENTS.md, GLOSSARY.md, memory.md, docs/MODELO.md y docs/specs/migracion-otjph/spec.md
antes de tocar nada.
Después leé el issue 15 con `gh issue view 15`.
No corras nada todavía: decime en 10 líneas qué hay que hacer, en qué orden, y qué riesgo
tiene cada paso. Esperá mi OK.
```

### 3.3 Las skills que tenés, y para qué sirve cada una

Escribí `/` en Claude Code y te aparece la lista. Estas son las que vas a usar:

| Skill | Cuándo la querés |
|---|---|
| `/grilling` | Cuando hay que **decidir** algo (por ejemplo, cómo corregir el marcador de la migración `00`). Te interroga de a una pregunta hasta que no quedan huecos. |
| `/tdd` | Para **todo** cambio en las migraciones o en los scripts: primero el test rojo. |
| `/research` | Para un dato que no está en el repo: cómo funciona el `SQL Editor`, cómo se recarga el schema cache de PostgREST, cómo exporta backups Supabase. Deja el hallazgo en un `.md`. |
| `/diagnosing-bugs` | Cuando `bd:viva` marque algo y no entiendas por qué. |
| `/code-review` | Al cerrar la migración, **en una sesión limpia**, contra el issue #15. |
| `/domain-modeling` | Si un término del modelo necesita entrar en `GLOSSARY.md` o si hay que escribir un ADR. |
| `/find-skills` | Si no sabés qué skill usar. |

> ⚠️ **Aviso sobre `docs/metodo/brain.md`.** Su §3 muestra `/grill-me`, `/to-spec`, `/to-tickets`,
> `/implement-spec` y `/retro`. **Esos nombres no existen en el runtime actual**: escribirlos no hace
> nada. La tabla de arriba es la lista real.

### 3.4 El ciclo, aplicado a este ticket

1. `/grilling` sobre las decisiones abiertas.
2. ADR si la decisión es difícil de revertir.
3. `/tdd` → test rojo primero.
4. Verificar: `npm test && npm run bd:viva`.
5. `/code-review` en contexto limpio.
6. Commit + push, cerrar el issue #15.

---

## 4. Tu trabajo, en orden

### 4.1 Paso 0 · Devolver las tareas del Teams a `in_progress`

Antes de tocar la base, corregí el tablero: **una tarea no está en `review` si su resultado no existe**.
En el Teams, mové de `review` a `in_progress`:

- *Aplicar DDL del MVP en otjph (normalización + limpieza)*
- *RLS y Storage: cerrar lectura anónima y bucket comprobantes*

Solo vuelven a `done` con el **paso 4.5 en verde** y el link del commit.

### 4.2 Paso 1 · Respaldo manual (obligatorio, **antes** de todo)

**No te saltees este paso.** No es una formalidad: hoy la migración `00` **no respalda nada**.

**Por qué.** `00` busca `producto.id_stock` como marcador del esquema legacy. Verificado hoy contra
`otjph`:

```
GET /rest/v1/producto?select=id_stock
HTTP 400 · column producto.id_stock does not exist
```

Esa columna ya no existe, así que la condición de `00` es falsa, **el bloque entero no corre y no se
crea el esquema `respaldo_legacy`**. Y como `01` arranca con `drop table … cascade` de las diez tablas
del dominio, correrlo sin respaldo **destruye las filas actuales sin red**.

**Y no podés asumir que están vacías.** Con la anon key se ven `producto` (3 filas) y `stock`
(3 filas); `detalle_carrito`, `admin` y `roll` responden vacías; pero las tablas protegidas por RLS
(`cliente`, `pedido`, `detalle_del_pedido`, `comprobante`, `remitos_de_venta`, `alerta_de_estado`) **no
se pueden contar desde afuera**. No se puede afirmar que estén vacías. Esa es exactamente la razón de
la decisión en [`specs/migracion-otjph/spec.md`](../specs/migracion-otjph/spec.md) §4.

**Cómo respaldar.** Elegí la que te permita el plan del proyecto:

- **Opción A — Backup del proveedor.** Supabase → *Database* → *Backups*. Descargá el más reciente.
- **Opción B — Tabla por tabla.** *Table Editor* → cada tabla del dominio → *Export* → CSV.
- **Opción C — Esquema de respaldo.** En el SQL Editor, creá un esquema de respaldo y copiá cada tabla
  del dominio. Cerrá ese esquema a `anon` y a `authenticated` al terminar: va a contener datos
  personales y, si existe `admin.contrasenia`, está en **texto plano**.

Sea cual sea la opción, **verificá que el respaldo se pueda abrir** antes de seguir. Un respaldo que
no se puede restaurar no es un respaldo.

### 4.3 Paso 2 · Correr las seis migraciones, en orden

En el **SQL Editor** de `otjph`, abrí cada archivo del repo, copiá su contenido completo, pegalo y
ejecutalo. **En este orden exacto:**

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `supabase/migrations/20261023090000_00_respaldo_legacy.sql` | Respaldo legacy. **Hoy es un no-op** (ver 4.2). |
| 2 | `supabase/migrations/20261023090100_01_esquema_mvp.sql` | `drop … cascade` de las diez tablas del dominio y las recrea según el modelo. |
| 3 | `supabase/migrations/20261023090200_02_reglas_y_rpc.sql` | Triggers de marca de tiempo y la interfaz pública (RPC), incluida `crear_pedido`. |
| 4 | `supabase/migrations/20261023090300_03_rls.sql` | RLS, grants y revokes. |
| 5 | `supabase/migrations/20261023090400_04_storage_comprobantes.sql` | Bucket **privado** `comprobantes`, 5 MB, png/jpeg/webp. |
| 6 | `supabase/migrations/20261023090500_05_storage_productos.sql` | Bucket **público** `productos`, 5 MB, png/jpeg/webp. |

**Por qué ese orden** (y no otro):

- `01` dropea por `cascade`, así que **tiene que ir antes** de los `create trigger` de `02`: si no,
  los triggers viejos sobrevivirían al drop y `02` fallaría al crearlos.
- `03` va después de `02`: las políticas y los grants se apoyan en las tablas ya creadas.
- `04` y `05` van al final, y son **seguros en PGlite**: ambos chequean primero
  `if exists (select 1 from pg_namespace where nspname = 'storage')`. En Supabase ese esquema existe,
  así que crean el bucket; en PGlite no, así que no hacen nada.

**No corras `00` con la expectativa de que respalde**: ya sabés que no lo va a hacer (paso 4.4).

### 4.4 Paso 3 · Recargar el cache de PostgREST

El SQL Editor aplica el DDL, pero `/rest/v1` sigue sirviendo el esquema cacheado. Sin este paso, el
front y `bd:viva` pueden seguir viendo la forma vieja:

```sql
notify pgrst, 'reload schema';
```

### 4.5 Paso 4 · El criterio de cierre: `bd:viva` en verde

```bash
npm run bd:viva
```

**Resultado esperado:** los cinco bloques con `ok`, y al final **`VERDE`**, sin ninguna línea `FALLA`.

Si queda alguna `FALLA`, **no la maquilles**: pegá la salida completa en el issue #15. Cada `FALLA`
nombra la tabla y las columnas que faltan, así que el diagnóstico casi siempre está en el propio
mensaje.

> Recordá: `npm test` **no** prueba la base viva. Un `npm test` verde con `bd:viva` rojo significa que
> el repo está bien y el proyecto vivo no. Son dos cosas distintas y las dos importan.

### 4.6 Paso 5 · Corregir el marcador de la migración `00`

Esto evita que la próxima reconstrucción vuelva a correr **sin red**, en silencio.

- **Ticket propio.** No lo mezcles con el cierre de la migración: es un cambio de comportamiento, no
  una aplicación.
- `/tdd`. El test tiene que fallar antes: hoy, con un esquema sin `producto.id_stock`, `00` no respalda
  y **no avisa**.
- La decisión de diseño se toma con `/grilling` y se registra en un ADR: ¿el marcador correcto es
  otro?, ¿la migración tiene que **fallar ruidosamente** si no puede respaldar?, ¿o tiene que respaldar
  siempre?
- Cuidado con el alcance: `00` **ya corrió** en `otjph` (como no-op). No cambies la semántica de lo
  aplicado; cambiá el archivo para que la próxima vez no mienta.

### 4.7 Paso 6 · Corregir `docs/specs/bd-mvp/spec.md`

Es de tu área y tiene errores concretos ya detectados:

- Declara las RPC como **`bigint`** cuando son **`integer`**.
- Enumera nombres plurales y **omite `estados_comprobante`**.
- Dice **`roll`** donde el glosario dice **`Rol`**.
- Y **no tiene issue y ningún issue lo linkea**: eso incumple `AGENTS.md` §6.2. Creá el issue o
  linkealo a uno existente.

Referencia de lo correcto: [`docs/MODELO.md`](../MODELO.md) y [`GLOSSARY.md`](../../GLOSSARY.md).

### 4.8 Paso 7 · Volver a mover el tablero

Con `bd:viva` en verde y el commit pusheado:

1. Comentá el resultado en el issue #15.
2. Mové las dos tareas del Teams a `done`, con el link del commit y la salida de `bd:viva`.
3. Avisá en la bandeja del Teams.

---

## 5. Prompts listos para copiar

**Para el respaldo y la aplicación:**

```
Leé docs/specs/migracion-otjph/spec.md y los seis archivos de supabase/migrations/.
Armame un runbook de aplicación en otjph: por cada migración, qué hace, qué riesgo tiene,
qué deja en la base y cómo verificar que salió bien antes de pasar a la siguiente.
Recordá que la migración 00 no respalda porque producto.id_stock ya no existe.
No ejecutes nada: yo corro el SQL Editor a mano.
```

**Para el criterio de cierre:**

```
Corré `npm run bd:viva` y transcribime la salida completa, sin resumir y sin maquillar.
Si queda alguna FALLA, explicame para cada una qué objeto de la base la causa.
Después verificá si `notify pgrst, 'reload schema'` ya se corrió: si el cache está viejo,
las FALLAS pueden ser de lectura, no de esquema.
```

**Para la migración `00`:**

```
/grilling sobre este problema: la migración 00 usa producto.id_stock como marcador del
esquema legacy, pero esa columna ya no existe en otjph, así que el bloque no corre y 01
destruiría las filas sin respaldo.
Preguntame de a una: ¿cuál es el marcador correcto?, ¿la migración debe fallar ruidosamente
si no puede respaldar?, ¿o debe respaldar siempre? Proponé tu recomendación en cada pregunta.
Al final escribí el ADR y el test que falla primero.
```

---

## 6. Definición de terminado

El issue #15 se cierra solo si:

- [ ] El respaldo se hizo y **se pudo abrir**.
- [ ] Las seis migraciones corrieron **en orden** sobre `otjph`.
- [ ] `notify pgrst, 'reload schema';` se ejecutó.
- [ ] **`npm run bd:viva` sale VERDE**, con la salida pegada en el issue.
- [ ] `npm test` sigue verde (230 tests).
- [ ] Las dos tareas del Teams volvieron a `done` **con evidencia**, no por confianza.
- [ ] El marcador de `00` y `bd-mvp/spec.md` tienen su ticket propio (pueden quedar abiertos: son otro
      trabajo, no la misma tajada).

---

## 7. Qué NO hacer

- **No escribas SQL nuevo** para reconciliar el esquema: las migraciones ya están escritas y verdes en
  PGlite.
- **No agregues una migración `06`** de reconciliación.
- **No reescribas la semántica** de una migración que ya corrió.
- **No corras `01` sin respaldo**, ni asumas que las tablas protegidas están vacías: no se pueden
  contar desde afuera.
- **No uses la `service_role`** en el SQL Editor por costumbre ni la pegues en ningún archivo del repo.
- **No toques `admin` y `roll`** más allá de dejarlas cerradas por RLS: son fase 2.
- **No apuntes a la base de Teams** (`uchy…`).
- No digas que algo quedó verde sin pegar la salida del comando.

---

## 8. Si te trabás

**Regla: trabate 20 minutos, no dos horas.**

1. Escribí la traba en la **bandeja del Teams** (categoría `BLOQUEO`), con:
   - qué querías hacer,
   - qué SQL o qué comando corriste,
   - **el error exacto, pegado tal cual** (con su código: `42P07`, `42703`, `PGRST202`…),
   - qué ya probaste.
2. Linkeá el issue #15.
3. Seguí con algo que no dependa de eso.

El código de error de Postgres suele decir todo: no lo resumas.

---

## 9. Enlaces

| Documento | Para qué |
|---|---|
| [Issue #15](https://github.com/juanmamerodio/esenciatecnica/issues/15) | Tu ticket y el criterio de cierre. |
| [`docs/specs/migracion-otjph/spec.md`](../specs/migracion-otjph/spec.md) | La spec de esta migración: decisiones, los 13 desajustes y por qué el orden es ese. |
| [`docs/entrega/HANDOFF-ISABELLA.md`](HANDOFF-ISABELLA.md) | El brief de DDL, constraints, índices y RLS. |
| [`docs/MODELO.md`](../MODELO.md) | El modelo aprobado: es lo que las migraciones implementan. |
| [`AGENTS.md`](../../AGENTS.md) | El contrato operativo. |
| [`GLOSSARY.md`](../../GLOSSARY.md) | El vocabulario. Si un término no está, no se inventa un sinónimo. |
| [`docs/estado/AUDITORIA_BD.md`](../estado/AUDITORIA_BD.md) | La auditoría de la base y los tests. |
| [`scripts/verificar-bd-viva.mjs`](../../scripts/verificar-bd-viva.mjs) | El script que te da el veredicto. Leelo: dice qué controla. |
| [`memory.md`](../../memory.md) | El estado real del build, al día. |
