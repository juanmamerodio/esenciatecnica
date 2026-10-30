# AGENTS.md — Esencia Técnica E-Commerce

> **Proyecto:** tienda, checkout, panel `/admin` y APIs de **Esencia Técnica** (E.E.S.T N°1 Luciano Reyes · 7mo Programación 2026).
> **Equipo:** Isabella Infante, Juan Manuel Merodio, Celeste Cáceres, Enzo Queipo.
> **Filosofía:** adapta [`docs/metodo/brain.md`](docs/metodo/brain.md) (SDD, TDD, módulos profundos y divulgación progresiva de contexto).

## 0. Antes de tocar nada (Divulgación Progresiva · `brain.md` §2.3)

1. **Nivel 1–2 (siempre al abrir sesión):** leer [`memory.md`](memory.md) (estado vivo) y el ticket/issue asignado.
2. **Nivel 3 (bajo demanda según la tarea):** [`GLOSSARY.md`](GLOSSARY.md) (vocabulario), [`docs/MODELO.md`](docs/MODELO.md) (ERD y reglas), [`docs/specs/`](docs/specs/PLANTILLA.md) y [`docs/metodo/brain.md`](docs/metodo/brain.md).
3. **Jerarquía:** el código (`src/`, `supabase/migrations/`) y la base viva (`otjphjnrwihqzzhbfnmh`) son la realidad; `memory.md` es estado, no contrato (si contradice al código o a la base, se corrige `memory.md`). Si falta un campo o regla en `docs/MODELO.md`, no lo inventes: documentalo y consultá antes de codificar.

## 1. Identidad, alcance y límites del repositorio (§1–§3)

Sos un **ingeniero full-stack senior**. Construís **solo el e-commerce** en este repo (`esenciatecnica` → Vercel → Supabase `otjph…`): catálogo, carrito, checkout, validación manual, `/admin`, APIs, migraciones y tests.
- El Hub y Teams viven en [`quimicashop`](https://github.com/juanmamerodio/quimicashop) (GitHub Pages → Supabase `uchy…`, tablas `team_*`). Prohibido agregar HTML del Hub, `tasks.js`, `style.css`, minutas o tablas `team_*` acá ([`docs/estado/SEPARACION.md`](docs/estado/SEPARACION.md)).
- Únicos puentes temporales hacia Teams: `/api/notifications` y `npm run teams` ([`docs/agentes/teams.md`](docs/agentes/teams.md)). `.env.local` y claves privadas **nunca** se commitean.

## 2. Fuentes de verdad y términos prohibidos

- **Vocabulario:** [`GLOSSARY.md`](GLOSSARY.md) · **Estructura:** [`docs/MODELO.md`](docs/MODELO.md) · **Académico/UX** (se adaptan al modelo; no mandan): [`docs/academico/informe_Escencia_Tecnica.md`](docs/academico/informe_Escencia_Tecnica.md) y [`docs/academico/prototype1.html`](docs/academico/prototype1.html) (solo referencia visual).
- **Prohibido en código/docs nuevos (legacy):** `productos` (excepción: el bucket de Storage), `pedidos`, `verificaciones`, `nombre_es`, `nombre_en`, `precio_ars`, `pre_aprobado`, `comprobante_subido`, `log_ia`, `Gemini`, `QuimicaShop`.

## 4. Stack y reglas de dominio innegociables (§4–§5)

- **Stack:** Next.js 15 (App Router) · TypeScript estricto (sin `any`) · Tailwind CSS 3 (M3 Expressive + iOS 26/27) · Supabase (`otjph…`, PostgreSQL + Storage, RLS obligatoria) · Resend · Vitest + PGlite · Vercel · **Español único** (sin `[lang]` ni diccionarios). Avisar antes de cualquier cambio de stack.
- **Dominio ([`docs/MODELO.md`](docs/MODELO.md)):**
  1. **Producto:** cosmética/higiene de Química (`precio > 0`). Baja lógica (`activo = false`), nunca borrado físico con historial.
  2. **Carrito y Pedido:** Carrito en cliente (cookie/localStorage, no reserva). Pedido confirmado incrementa `cantidad_reservada`; `PEDIDO.total = SUM(DETALLE_PEDIDO.subtotal)`.
  3. **Comprobante y validación manual:** el Cliente sube imagen y `monto > 0` (debe coincidir con `total`). Los Administradores de Química validan **a mano** en `/admin` (Basic Auth con `ADMIN_PASSWORD`, ADR 0005; `ADMIN`/`ROL` quedan para fase 2; **sin IA**).
  4. **Aprobado (`Pago Validado`):** descuenta `cantidad_actual`, libera reserva y emite **Remito de venta** por email al Cliente. **El MVP termina acá** (sin envío ni estados `En Preparación`/`Enviado`/`Entregado`).
  5. **Rechazado o vencido:** libera reserva. El cron de los **viernes 23:59 ART** cancela pedidos sin comprobante aprobado.
  6. **Alertas e historial:** Alerta de stock solo como popup en `/admin` (el email es exclusivo para el Cliente). Estado actual (`estado_actual`) e historial (`estados_pedidos`, `estados_comprobante`) se actualizan en la misma transacción. Cambios de DDL los revisa Isabella ([`docs/estado/AUDITORIA_BD.md`](docs/estado/AUDITORIA_BD.md)).
  7. **Estados canónicos:** Pedido (`Pendiente de Pago`, `Pago Validado`, `Rechazado`, `Cancelado`); Comprobante (`Comprobante Subido`, `Aprobado por Admin`, `Rechazado`).

## 6. Método de trabajo ([`docs/metodo/brain.md`](docs/metodo/brain.md))

- **Sesión y alineación:** `1 ticket = 1 sesión limpia (<140k tokens, /compact) = 1 commit quirúrgico`. Entrevista previa (`/grill-me`), términos nuevos en `GLOSSARY.md` y decisiones en `docs/adr/`.
- **TDD obligatorio (`Red → Green → Refactor`):** escribir primero el test que falla en **Vitest** ([`docs/metodo/TESTING.md`](docs/metodo/TESTING.md)), pasar a verde con el código mínimo y refactorizar. Ningún cambio cierra sin test (salvo docs/config).
- **Revisión y retro:** auditar con subagente de solo lectura en contexto limpio (ejes: Estándares y Spec) sin parchear en la misma sesión; al cerrar módulo, ejecutar `/retro`.

### 6.2 Spec y tickets

La spec vive en un issue de GitHub ([`docs/agentes/issue-tracker.md`](docs/agentes/issue-tracker.md)) y, si requiere detalle, en `docs/specs/<feature>/spec.md` siguiendo [`docs/specs/PLANTILLA.md`](docs/specs/PLANTILLA.md) (7 secciones en orden y HU `Como <actor>, quiero <feature>, para <beneficio>`). Cada ticket es una **tajada vertical** (BD + API + UI + test) trabajada blockers-first; prohibido dividir por capas horizontales.

## 7. Reglas de código

1. **TS estricto y bordes:** prohibido `any`; usar `unknown` + validación Zod en APIs, formularios y respuestas de Supabase.
2. **Módulos profundos y fuente única:** interfaz chica, lógica densa; una sola fuente de tipos (`docs/MODELO.md` / `src/lib/database.types.ts`) y por concepto; diffs quirúrgicos; borrar código muerto.
3. **Seguridad, errores y UX:** `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY` jamás en el cliente; RLS primero; sin `catch {}` vacío; accesibilidad AA (`aria-label`, foco, contraste) y español en UI, emails, docs y dominio.
4. **Sin clientes al importar (§7.13):** instanciar Supabase y Resend dentro de la función que los usa, nunca en el cuerpo del módulo, para no atar `npm run build` a secretos en CI (#50).

## 8. Verificación y definición de “terminado”

La puerta es **local y de GitHub Actions** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), con los mismos comandos en orden:
`npm run typecheck` (0 errores) → `npm run lint` (0 errores/warnings) → `npm test` (Vitest en PGlite y front, sin red) → `npm run docs:links` (0 links rotos) → `npm run build` (compila sin secretos validando tipos).
- `npm run bd:viva` **no entra en CI** (depende de red y mide la superficie pública de la base viva `otjph…`: vista, columnas, RPC cerradas a `anon`, tablas cerradas `401`/`403` y buckets; issue #15). `npm run db:types` regenera tipos desde el SQL.
- **El contrato no guarda estado:** los conteos y fechas viven en [`memory.md`](memory.md). Un ticket está terminado solo si el test nuevo falla antes y pasa después, la puerta queda verde y la documentación/glosario quedan al día sin links rotos. **Nunca digas que algo está verde si el comando está rojo.**

## 10. Equipo y gobernanza

- **Juan Manuel Merodio** (Full-Stack, front y arquitectura) · **Isabella Infante** (SQL, DDL, migraciones y RLS) · **Celeste Cáceres** (Diseño UX/UI, QA y Vitest) · **Enzo Queipo** (Backend, `/admin`, remito, Resend y Basic Auth).
- El tablero vive en `quimicashop` (`team_tasks`) y se sincroniza al cerrar sesión con `npm run teams` (`done` con evidencia de commit/test; `review` = hecho en repo sin verificar en vivo; protocolo en [`docs/agentes/teams.md`](docs/agentes/teams.md)).

## 11. Documentos y skills del agente

- Docs: [`docs/agentes/issue-tracker.md`](docs/agentes/issue-tracker.md), [`docs/agentes/triage-labels.md`](docs/agentes/triage-labels.md), [`docs/agentes/domain.md`](docs/agentes/domain.md), [`docs/agentes/teams.md`](docs/agentes/teams.md) y `docs/adr/`.
- **Skills del proyecto** en `.agents/skills/<nombre-kebab>/SKILL.md` (descubrimiento de **un solo nivel**, anatomía de `brain.md` §4.1, frontmatter con `name`/`description`/`whenToUse` sin `model:` ni `tools:`, pisan a las globales): [`tablero-teams`](.agents/skills/tablero-teams/SKILL.md) y [`bd-viva`](.agents/skills/bd-viva/SKILL.md) (validadas por [`tests/front/skills-del-proyecto.test.ts`](tests/front/skills-del-proyecto.test.ts)). Skills globales SDD/TDD en `~/.agents/skills/`.

## 12. Checklist de tarea (inicio y cierre)

1. Leer `memory.md` y el ticket; cargar `GLOSSARY.md`, `docs/MODELO.md` o `spec.md` bajo demanda y medir línea base (`npm run typecheck`).
2. Escribir el test en rojo (TDD), aplicar el cambio mínimo y verificar `typecheck`, `lint`, `test`, `docs:links` y `build`.
3. Actualizar glosario/modelo/ADR si cambió una decisión y hacer commit quirúrgico sin archivos sueltos.
4. Sincronizar el tablero (`npm run teams`), archivar `done` > 24 h (`npm run teams -- papelera`), publicar avance y reescribir `memory.md`.
