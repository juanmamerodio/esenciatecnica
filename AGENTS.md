# AGENTS.md — Esencia Técnica E-Commerce

> **Proyecto:** tienda, checkout, panel `/admin` y APIs del e-commerce **Esencia Técnica**.
> **Institución:** E.E.S.T N°1 Luciano Reyes · Campana, Buenos Aires · 7mo Año Programación 2026.
> **Equipo:** Isabella Infante, Juan Manuel Merodio, Celeste Cáceres, Enzo Queipo.
> **Última actualización:** 2026-10-25.

Este documento es el contrato operativo para cualquier agente que trabaje en este repositorio. No es una copia de [`docs/brain.md`](docs/brain.md): adapta su filosofía (SDD, TDD, módulos profundos, disciplina de contexto) al e-commerce real.

---

## 0. Antes de tocar nada

Leer, en este orden:

1. [`GLOSSARY.md`](GLOSSARY.md) — vocabulario canónico.
2. [`docs/MODELO.md`](docs/MODELO.md) — ERD Mermaid y reglas de integridad.
3. [`docs/AUDITORIA.md`](docs/AUDITORIA.md) — inventario, duplicados y contradicciones.
4. [`docs/brain.md`](docs/brain.md) — filosofía de trabajo de la agencia.
5. [`docs/DEUDA_TECNICA.md`](docs/DEUDA_TECNICA.md) — deuda conocida (desactualizada; corregir contra el modelo).

Si hay conflicto entre documentos, manda el orden anterior. El modelo del MVP está aprobado; si falta un campo o una regla, **no lo inventes**: documentalo en `docs/MODELO.md` y consultá antes de codificar.

---

## 1. Identidad y alcance

Sos un **ingeniero full-stack senior**. Construís **solo el e-commerce** de `esenciatecnica`:

- Catálogo, carrito, checkout y validación manual de comprobantes.
- Panel `/admin`: pedidos, stock, alertas y remitos.
- APIs, servicios, modelos y migraciones del e-commerce.
- Tests y documentación técnica del e-commerce.

**No** tocás el Hub ni el entorno Teams. Viven en el repo [`quimicashop`](https://github.com/juanmamerodio/quimicashop): `index.html`, `tasks.html`, `tasks.js`, `style.css`, `diagrams/`, minutas y tablas `team_*`.

---

## 2. Fuentes de verdad

| Tema | Fuente | Regla |
|---|---|---|
| Vocabulario | [`GLOSSARY.md`](GLOSSARY.md) | Si un término no está, se propone y se agrega; no se inventa un sinónimo. |
| Estructura | [`docs/MODELO.md`](docs/MODELO.md) | ERD Mermaid aprobado (MVP). Es la representación consensuada del dominio. |
| Implementación | Proyecto Supabase `otjphjnrwihqzzhbfnmh` | Base del e-commerce; nunca la base vieja `uchy...`. |
| Código | `src/` | Realidad operativa. Si se desvía del modelo, se corrige el código o se actualiza el modelo con una decisión explícita. |
| Académico | [`docs/DER-quimica.csv`](docs/DER-quimica.csv), [`docs/DCU-Quimica.csv`](docs/DCU-Quimica.csv), [`docs/DFD1-Quimica.csv`](docs/DFD1-Quimica.csv), [`docs/DFD2-Quimica.csv`](docs/DFD2-Quimica.csv), [`docs/DFD3-Quimica.csv`](docs/DFD3-Quimica.csv), [`docs/informe_Escencia_Tecnica.md`](docs/informe_Escencia_Tecnica.md) | Se adapta al código/modelo; no manda sobre la implementación. |
| Referencia visual | [`docs/prototype1.html`](docs/prototype1.html) | Solo diseño/UX; sus productos son contenido de muestra, no catálogo. |
| Historia | `quimicashop/diagrams/minutas/`, `CHANGELOG.md` | Evidencia de decisiones; no es spec vigente. |
| Filosofía | [`docs/brain.md`](docs/brain.md) | Principios de trabajo; no estructura de agencia. |

**Jerarquía operativa:** el código y la base nueva son la realidad; el modelo Mermaid es la representación acordada; el DER académico se adapta. Nunca convivan dos esquemas: si algo no está en el modelo, se decide y se documenta antes de codificar.

**Prohibido en código nuevo:** `productos`, `pedidos`, `verificaciones`, `nombre_es`, `nombre_en`, `precio_ars`, `pre_aprobado`, `comprobante_subido`, `log_ia`, `Gemini`, `QuimicaShop`. Son legacy; ver “Términos retirados” en el glosario.

---

## 3. Límites del repositorio

| Repo | Contenido | Deploy | Supabase |
|---|---|---|---|
| `esenciatecnica` (este) | Tienda, `/admin`, APIs, tests | Vercel | Proyecto e-commerce (`otjph...`) |
| `quimicashop` | Hub, Teams, minutas, diagramas | GitHub Pages | Proyecto Teams (`uchy...`, `team_*`) |

- No agregues HTML del Hub, `tasks.js`, `style.css`, minutas ni tablas `team_*` a este repo.
- `/api/notifications` es un puente temporal hacia Teams; si se migra, se borran `TEAMS_*` de este repo.
- `.env.local` y las claves de servicio **nunca** se commitean.
- La base vieja `uchy...` es de Teams y conserva el catálogo legacy; **no** se usa para el e-commerce.

---

## 4. Stack vigente

| Capa | Tecnología | Regla |
|---|---|---|
| Framework | Next.js 15 · App Router · TypeScript estricto | Sin `any` explícito. |
| Estilos | Tailwind CSS 3 + CSS | M3 Expressive + iOS 26/27. |
| Datos | Supabase · PostgreSQL + Storage | Proyecto `otjph...`; RLS obligatoria en producción. |
| Validación de pagos | **Manual por Administradores de Química** | Sin IA, sin Gemini, sin validadores automáticos. |
| Stock | Reservas + cron de viernes | Libera reservas no ejecutadas. |
| Notificaciones | Resend | Remito y confirmaciones al Cliente. Alertas de stock solo en el panel. |
| Idioma | **Español único** | Sin `[lang]`, sin diccionarios, sin selector `es/en`. |
| Tests | Vitest | Compatible con Next; no reemplaza a Next ni requiere Vite como bundler. |
| Hosting | Vercel | CI/CD desde GitHub. |

Cualquier cambio de stack se avisa **antes** de implementarlo.

---

## 5. Dominio y reglas de negocio

El dominio completo está en [`GLOSSARY.md`](GLOSSARY.md) y [`docs/MODELO.md`](docs/MODELO.md). Las reglas que no se negocian:

1. **Producto** es cosmética/higiene elaborada por el Departamento de Química. No es un insumo de laboratorio ni el contenido del prototipo.
2. **Carrito** vive en el cliente (cookie/localStorage) y no reserva stock. **Pedido** confirmado sí: incrementa `cantidad_reservada`.
3. **Comprobante** se valida a mano por los Administradores de Química. Comparan imagen y monto contra el Pedido. No hay IA en el sistema final.
4. **Aprobado:** descuenta `cantidad_actual`, libera la reserva y genera **Remito de venta** por email al Cliente.
5. **El MVP termina en `Pago Validado` + remito.** No hay envío, seguimiento ni estados `En Preparación`, `Enviado` o `Entregado`.
6. **Rechazado o vencido:** libera la reserva. El cron de los **viernes** cancela los pedidos sin comprobante aprobado.
7. **Alerta de stock:** popup en `/admin`; no se envía por email. El email es solo para el Cliente.
8. **Estados canónicos del MVP:** Pedido (`Pendiente de Pago`, `Pago Validado`, `Rechazado`, `Cancelado`); Comprobante (`Comprobante Subido`, `Aprobado por Admin`, `Rechazado`).
9. **Admin:** Basic Auth con `ADMIN_PASSWORD`; `ADMIN`/`ROL` quedan para fase 2.
10. **Estado actual + historial:** el panel lee el estado actual; las tablas de historial son la auditoría. Se actualizan en la misma transacción.
11. **Total:** `PEDIDO.total = SUM(DETALLE_PEDIDO.subtotal)`. El comprobante debe coincidir con el total para aprobar.
12. **Borrado lógico:** `PRODUCTO.activo = false`; no se borran productos con historial.
13. **Base de datos:** los cambios de DDL los revisa Isabella Infante; el brief está en [`docs/HANDOFF-ISABELLA.md`](docs/HANDOFF-ISABELLA.md).

---

## 6. Método de trabajo (brain.md adaptado)

### 6.1 Alineación primero

Antes de codificar una feature no trivial:

- Entrevista de decisiones (grilling) hasta acordar el modelo.
- Actualizar [`GLOSSARY.md`](GLOSSARY.md) si aparece un término nuevo.
- Registrar una decisión difícil de revertir en `docs/adr/` (formato ADR).
- No se escribe código de producción hasta que el alcance esté claro.

### 6.2 Spec y tickets

- La spec vive en un issue de GitHub (ver [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)). Si necesita detalle, se adjunta `docs/specs/<feature>/spec.md` y el issue lo linkea.
- Cada ticket es una **tajada vertical**: base + API + UI + test en un entregable mínimo.
- Prohibido dividir por capas horizontales (“ticket de toda la base”, “ticket de toda la API”).
- Cada ticket declara sus **blockers**; se trabaja blockers-first.

### 6.3 Una sesión por ticket

- **1 ticket = 1 sesión limpia = 1 commit quirúrgico.**
- Si la ventana se acerca a **140k tokens**, hacer `/compact` o handoff antes de seguir.
- No arrastrar contexto de un ticket al siguiente.

### 6.4 TDD obligatorio

1. **Red:** escribir el test que falla.
2. **Green:** el mínimo código para pasarlo.
3. **Refactor:** limpiar sin romper el verde.

- Runner: **Vitest**. Celeste es la responsable de testing/QA. Guía corta: [`docs/TESTING.md`](docs/TESTING.md).
- El primer ticket de implementación agrega Vitest y el primer test real.
- No se considera terminado un cambio sin test que lo cubra, salvo documentación o configuración.

### 6.5 Revisión en contexto limpio

- No revises tu propio código en la misma sesión que lo escribiste.
- Lanzá un subagente de solo lectura con el diff y dos ejes: **Estándares** (AGENTS/GLOSSARY) y **Spec** (issue/ticket).
- Reportá hallazgos; no los parchees en la misma sesión de review.

### 6.6 Retro

Al cerrar un módulo, preguntá qué regla, test o documento habría evitado el retrabajo. Actualizá el entorno (AGENTS, GLOSSARY, skills, tests), no solo el código.

### 6.7 Subagentes

- Cada subagente nace con contexto limpio y una tarea delimitada.
- Devuelve un resumen conciso; el orquestador integra.
- No delegues decisiones de dominio: se deciden con el humano y se documentan.

---

## 7. Reglas de código

1. **TypeScript estricto.** Prohibido `any` explícito. Si el tipo es desconocido, `unknown` + validación.
2. **Módulos profundos.** Interfaz pública chica, lógica interna densa. Evitá docenas de archivos shallow.
3. **Una sola fuente de tipos.** Salen de `docs/MODELO.md`; no dupliques `Producto` en tres archivos.
4. **Una sola fuente por concepto.** No dos `ProductCard`, no dos servicios para lo mismo, no dos esquemas.
5. **Sin código muerto.** Si un archivo no se importa, se borra.
6. **Diffs quirúrgicos** en archivos existentes; archivos completos solo para archivos nuevos.
7. **Validación en los bordes** con Zod: APIs, formularios, respuestas de Supabase.
8. **Secretos solo en servidor.** `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY` jamás en el cliente.
9. **RLS primero.** La anon key es pública; ninguna tabla sensible se lee sin política.
10. **Errores explícitos.** No silenciar errores con `catch {}` vacío; loguear y devolver un estado claro.
11. **Accesibilidad y responsive.** `aria-label`, foco visible, contraste AA, safe areas.
12. **Español** en UI, emails, docs y nombres de dominio. Los identificadores técnicos pueden ir en inglés si el modelo lo pide.

---

## 8. Verificación y definición de “terminado”

Comandos:

```bash
npm run typecheck
npm run lint
npm run build
npm test          # suite de base de datos (Vitest + PGlite)
npm run db:types  # regenera src/lib/database.types.ts desde el SQL
```

Estado actual (2026-10-25, tras `T3`, `T5`, `T6`, `T7` y `T8`):

- `npm run typecheck` → 0 errores. La línea base ya no es roja: cualquier error nuevo es del ticket en curso.
- `npm run lint` → 0 errores y 0 warnings. El warning de `<img>` se fue con `ReceiptUploader.tsx` en `T5`.
- `npm test` → 227 tests en 19 archivos: `tests/db/` (Vitest + PGlite) y `tests/front/` (módulos puros y estructura del front), sin red ni Docker.
- `npm run build` → compila **sin** `RESEND_API_KEY`: desde `T8` Resend se instancia por llamada y no al importar. El middleware (`src/middleware.ts`) entra en el build y protege `/admin` y `/api/admin`. Sigue configurado con `ignoreBuildErrors: true`; no lo tomes como prueba de tipos.

Un ticket está terminado solo si:

- El test nuevo falla antes y pasa después.
- `npm run typecheck` no agrega errores nuevos; idealmente queda verde.
- `npm run lint` no agrega errores nuevos.
- El modelo/glosario se actualiza si cambió un término o una regla.
- La documentación afectada queda linkeada y sin referencias al esquema legacy.

**Nunca digas que algo está verde si el comando está rojo.** Reportá el comando, la salida y el error exacto.

---

## 9. Deuda y orden de migración

1. Enviar el modelo a Isabella y cerrar el DDL: [`docs/HANDOFF-ISABELLA.md`](docs/HANDOFF-ISABELLA.md).
   **Abierto:** en `otjph…` faltan `vista_catalogo`, las RPC de `02`, la RLS de `03` y los buckets de `04`
   y `05` (ver el estado en [`memory.md`](memory.md)).
2. Eliminar i18n (`[lang]`, diccionarios, middleware de idioma). ✅ Hecho: `T0 · Español único` (issue #2).
   `src/middleware.ts` volvió en `T7` **solo** para el Basic Auth del panel (ADR 0005).
3. Retirar Gemini (`src/lib/gemini.ts`, `verify-payment` con IA, `GEMINI_API_KEY`). ✅ Hecho: la validación
   es manual y el camino legacy de compra se retiró en `T5`.
4. Migrar tipos, servicios y `/admin` al modelo aprobado. ✅ Hecho: catálogo (`T1`/`T2`), checkout (`T5`) y
   panel (`T7`); `src/lib/supabase.ts` y `/api/sync-sheets` ya no existen.
5. Corregir `.env.local`/Vercel (service role, `ADMIN_PASSWORD`, Resend, datos de transferencia) y RLS.
   **Abierto**: es de Enzo y de Isabella, y es lo único que separa al MVP de una demo en producción.
6. Agregar Vitest y el primer test. ✅ Hecho: `tests/db/` + `vitest.config.ts` (ver [`docs/AUDITORIA_BD.md`](docs/AUDITORIA_BD.md)).
7. Recién entonces, features nuevas. ✅ Hechas las tajadas del front (`T3`, `T5`, `T6`, `T7`, `T8`); falta la
   **verificación manual en navegador** con la base migrada y las claves puestas.

La deuda detallada está en [`docs/DEUDA_TECNICA.md`](docs/DEUDA_TECNICA.md), pero ese documento asume el esquema viejo: corregilo contra el modelo.

---

## 10. Equipo y gobernanza

Roles vigentes (fuente: `team_members` del proyecto Teams; si la base cambia, este cuadro se actualiza):

| Integrante | Rol |
|---|---|
| Juan Manuel Merodio | Full-Stack & Arquitectura |
| Isabella Infante | Database & SQL Architecture |
| Celeste Cáceres | Diseño UX/UI & Testing QA |
| Enzo Queipo | Backend, Admin Panel & Relaciones |

- El tablero de tareas vive en `quimicashop` (`team_tasks`). Es la fuente de prioridades; no se cachea acá.
- Las minutas son historia y evidencia; no son spec.
- Las decisiones de dominio se consultan con el equipo; no se inventan.

**Responsabilidades del MVP:**

| Área | Responsable |
|---|---|
| SQL, DDL, migraciones y RLS | Isabella Infante |
| Remito, `/admin`, Resend y Basic Auth | Enzo Queipo |
| Testing, QA y Vitest | Celeste Cáceres |
| Frontend, integración y arquitectura | Juan Manuel Merodio |

---

## 11. Documentos del agente

- [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) — issues y specs en GitHub con `gh`.
- [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) — roles de triage.
- [`docs/agents/domain.md`](docs/agents/domain.md) — cómo consumir glosario y ADRs.
- [`GLOSSARY.md`](GLOSSARY.md) — vocabulario.
- `.agents/skills/` — skills propias del proyecto (anatomía en [`docs/brain.md`](docs/brain.md) §4.1).
- `docs/adr/` — decisiones de arquitectura.

**Skills del proyecto.** Las skills propias de Esencia Técnica viven en el repo, en
`.agents/skills/<nombre-kebab>/SKILL.md`, para que todo el equipo las tenga; las globales de la máquina
quedan para las genéricas de la agencia. Reglas que impone el entorno real (DeepSeek Harness), no el gusto:

- El archivo se llama **`SKILL.md`** y el descubrimiento es de **un solo nivel**: `skills/<categoría>/<skill>/SKILL.md` **no** se carga.
- El frontmatter leído es `name` (kebab-case obligatorio), `description` (obligatorio), `whenToUse`, `metadata`, `disable-model-invocation` y `user-invocable`. **No** se escriben `model:` ni `tools:`.
- El nombre canónico sale del frontmatter, no del directorio.
- Las skills del proyecto **pisan** a las globales del mismo nombre.

No se instalan colecciones de skills de terceros completas: si una tajada necesita una skill puntual, se
adapta a esta regla, en español y con guardrails propios. Escribir una skill que el entorno no carga es
código muerto.

---

## 12. Checklist de inicio de tarea

1. Leer `GLOSSARY.md`, `docs/MODELO.md` y el ticket.
2. Confirmar que el área que vas a tocar está cubierta por el modelo aprobado.
3. Correr `npm run typecheck` y anotar la línea base.
4. Hacer el cambio más chico que resuelva el ticket.
5. Escribir/ajustar el test antes del código de producción.
6. Verificar typecheck, lint y test.
7. Actualizar glosario, modelo o ADR si cambió una decisión.
8. Commit quirúrgico con mensaje claro; sin archivos sueltos.
