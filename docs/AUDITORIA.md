# Auditoría de artefactos y coherencia · Esencia Técnica

> **Fecha:** 2026-10-22
> **Alcance:** repositorio `esenciatecnica`, carpeta `docs/`, carpeta `diagrams/` (eliminada en esta sesión), proyecto Supabase e-commerce y proyecto Supabase de Teams.
> **Método:** lectura de archivos, comparación por hash SHA-256, consultas de solo lectura a Supabase con la anon key y `npm run typecheck`.

---

## 1. Resumen ejecutivo

El repositorio no contiene un sistema final coherente: contiene **tres sistemas mezclados**.

1. **Base nueva del e-commerce** (`otjphjnrwihqzzhbfnmh`): 13 tablas normalizadas del DER, 3 productos cosméticos, 4 pedidos y 3 comprobantes de prueba.
2. **Base vieja** (`uchyattzuhaltsaxazce`): tablas `team_*` del Hub/Teams **más** el esquema legacy `productos` / `pedidos` / `verificaciones`, que es el que consulta el código Next.js.
3. **Prototipo HTML** (`docs/prototype1.html`): una tercera propuesta visual con productos biotecnológicos que no coinciden con ninguna de las dos bases.

La decisión tomada con el equipo es:

- El **código es la realidad operativa**; el DER académico se adapta al código, y ambos se corrigen hasta converger.
- El negocio canónico es **cosmética e higiene** (jabones, shampoo, cremas), no los insumos de laboratorio del catálogo viejo ni las películas biotecnológicas del prototipo.
- El idioma canónico es **español único**; se elimina el diccionario y la selección `es/en`.
- La representación canónica de la estructura será un **ERD en Mermaid** (`docs/MODELO.md`), no el CSV de Lucidchart.
- `brain.md` se adapta como filosofía de trabajo, no se copia literal; vive en `docs/brain.md`.

---

## 2. Inventario y destino

### 2.1 Raíz

| Artefacto | Qué es | Estado | Destino |
|---|---|---|---|
| `AGENTS.md` | System prompt del e-commerce | Trackeado, con cambio sin commit (sección “Agent skills”) | Reescribir como contrato operativo adaptado a `docs/brain.md` |
| `CLAUDE.md` | Puntero a `@AGENTS.md` | Trackeado | Se mantiene |
| `README.md` | Presentación del repo | Trackeado, desactualizado (habla del esquema viejo y de i18n) | Reescribir al cerrar la migración |
| `brain.md` | Manual de agencia NexoBow | Untracked | **Movido a `docs/brain.md`** |
| `.env.example` | Variables de entorno | Trackeado; `GEMINI_API_KEY` quedó comentado como legacy | Se retira con `src/lib/gemini.ts` |
| `.env.local` | Entorno local | Ignorado; solo URL, anon key y Vercel OIDC | Completar service role/admin/Resend al implementar |
| `package.json` | Scripts y dependencias | Trackeado; no hay script de test | Agregar Vitest en la primera implementación |
| `next.config.ts` | Configuración Next | `ignoreBuildErrors: true` | Quitar cuando el typecheck esté verde |
| `src/` | Aplicación Next.js | Código legacy contra el esquema viejo | Migrar al modelo aprobado |
| `docs/` | Documentación | 5 archivos trackeados + `agents/` untracked | Reorganizar y corregir |
| `diagrams/` | Copia del Hub/Teams | **Eliminada**; era idéntica a `../quimicashop/diagrams` | Ya vive en `quimicashop` |

### 2.2 `docs/`

| Artefacto | Qué es | Destino |
|---|---|---|
| `docs/DER-quimica.csv` | DER académico de 13 entidades | Mantener como fuente académica; el modelo operativo es Mermaid |
| `docs/DCU-Quimica.csv` | Diagrama de casos de uso | Mantener como documento académico |
| `docs/DFD1-Quimica.csv`, `DFD2`, `DFD3` | DFD niveles 1–3 | **Movidos desde `diagrams/2209D/`**; mantener |
| `docs/informe_Escencia_Tecnica.md` | Informe de cátedra | Mantener |
| `docs/prototype1.html` | Prototipo visual HTML | **Movido desde `diagrams/`**; referencia visual, no catálogo |
| `docs/DEUDA_TECNICA.md` | Deuda detectada en la separación | Reescribir: hoy asume el esquema viejo |
| `docs/SEPARACION.md` | Runbook de separación | Corregir: describe la separación al revés |
| `docs/agents/` | Configuración de skills (issue tracker, triage, domain docs) | Mantener |
| `docs/adr/` | Decisiones de arquitectura | Crear cuando se aprueben las decisiones |
| `docs/brain.md` | Manual de agencia | **Movido desde la raíz**; referencia filosófica |

### 2.3 Código

| Artefacto | Problema |
|---|---|
| `src/lib/supabase.ts` | Declara `productos`, `pedidos`, `verificaciones`; la base nueva usa `producto`, `pedido`, `comprobante`, etc. |
| `src/services/order.service.ts` | RPC `crear_pedido_con_stock`, tabla `pedidos`, campos `nombre_cliente`, `total_ars`, `log_ia`; no existen en la base nueva. |
| `src/services/product.service.ts` | Consulta `productos` con `nombre_es`, `precio_ars`, `activo`; no existe en la base nueva. |
| `src/app/admin/page.tsx` | Consulta `pedidos` y `stock` con `cantidad`; la base nueva tiene `pedido` y `stock.cantidad_actual`. |
| `src/app/api/verify-payment/route.ts` | Usa Gemini, `verificaciones` y `OrderService.isProcessed` (método inexistente). |
| `src/lib/gemini.ts` | Validación por IA, flujo retirado por la minuta del 21-10. |
| `src/app/[lang]/...` | i18n `es/en`; se elimina por decisión del equipo. |
| `src/components/ProductCard.tsx` y `src/app/[lang]/ProductCard.tsx` | Dos tarjetas de producto; la segunda está muerta. |
| `src/lib/types.ts`, `src/lib/schemas.ts`, `src/lib/supabase.ts` | Tres fuentes de tipos para el mismo dominio. |
| `package.json` | Sin test script; `npm run typecheck` falla con 13 errores. |

---

## 3. Duplicados exactos

Comparación por SHA-256:

| Archivo | Duplicado | Resultado |
|---|---|---|
| `docs/DER-quimica.csv` | `../quimicashop/diagrams/2209D/DER-quimica.csv` | Idéntico |
| `docs/DCU-Quimica.csv` | `../quimicashop/diagrams/2209D/DCU-Quimica.csv` | Idéntico |
| `docs/informe_Escencia_Tecnica.md` | `../quimicashop/diagrams/informe_Escencia_Tecnica.md` | Idéntico |
| `docs/SEPARACION.md` | `../quimicashop/diagrams/SEPARACION.md` | Casi idéntico; difiere en pocas líneas |
| `diagrams/` (15 archivos) | `../quimicashop/diagrams/` (15 archivos) | **Idéntico, 15/15** |

Consecuencia: la copia local de `diagrams/` no aportaba nada. Se conservaron en `docs/` los cuatro artefactos e-commerce únicos (DFD 1–3 y `prototype1.html`) y se eliminó la carpeta.

---

## 4. Las dos bases Supabase

### 4.1 Proyecto nuevo — e-commerce (`otjphjnrwihqzzhbfnmh`)

Es el que usa `.env.local` y el que contiene el DER normalizado:

| Tabla | Filas | Observación |
|---|---:|---|
| `producto` | 3 | Cosmética/higiene; productos 1 y 2 duplicados |
| `stock` | 3 | `cantidad_actual`, `cantidad_warning`, `porcentaje`, `cantidad_reservada` |
| `cliente` | 1 | `id_carrito` null |
| `pedido` | 4 | `id_estado` apunta a filas de otro pedido |
| `detalle_del_pedido` | 3 | Todos “Pendiente”, aunque el pedido esté “Pago Validado” |
| `comprobante` | 3 | Totales no coinciden con el pedido |
| `estados_pedidos` | 9 | Cadenas como “Pago Validado”, “Pendiente de Pago” |
| `estados_comprobante` | 6 | “Comprobante Subido”, “Aprobado por Admin”, “Rechazado” |
| `remitos_de_venta` | 2 | |
| `detalle_carrito` | 0 | Carrito no persistido |
| `alerta_de_estado` | 1 | Columna real `ano`, no `año` |
| `admin` | 1 | La tabla no se usa para autenticar; el panel usa Basic Auth |
| `roll` | 2 | Typo histórica de “rol”; no tiene FK con `admin` |

### 4.2 Proyecto viejo — Teams + legacy (`uchyattzuhaltsaxazce`)

Es el que usa `../quimicashop/config.js`:

| Grupo | Tablas | Filas | Uso |
|---|---|---|---|
| Teams | `team_members`, `team_tasks`, `task_notes`, `team_meetings`, `team_discussions`, `team_discussion_comments` | 4 miembros, 16 tareas, 1 reunión | Hub/Teams |
| Legacy e-commerce | `productos`, `pedidos`, `verificaciones` | 9 productos, 0 pedidos, 0 verificaciones | Esquema que consulta el código Next.js |
| Auditoría | `task_audit_logs` | — | Teams |

### 4.3 Contradicción documental

`docs/SEPARACION.md` dice:

> El proyecto Supabase actual (`uchy...`) queda como e-commerce / química. Se crea un proyecto nuevo para Teams.

La realidad es la inversa:

- `uchy...` conserva `team_*` y el catálogo legacy de laboratorio.
- `otjph...` tiene el DER normalizado del e-commerce.
- `.env.local` apunta al nuevo; `config.js` apunta al viejo.
- El código sigue consultando los nombres legacy (`productos`, `pedidos`, `verificaciones`) contra la base nueva, donde no existen.

---

## 5. Los tres catálogos

| Fuente | Catálogo | Evidencia |
|---|---|---|
| Base nueva | Cosmética/higiene | “Crema Hidratante Facial”, “Jabón Líquido Neutro” |
| Base vieja | Insumos de laboratorio | “Vaso de Precipitados”, “Balanza Digital”, “Ácido Sulfúrico” |
| Prototipo HTML | Películas biotecnológicas | “Película BioTec 1 Alginato”, “Extracto Celular Bioactivo” |
| Informe de cátedra | Productos cosméticos | “Sistema de Ventas de productos cosméticos” |

**Decisión:** el negocio canónico es cosmética e higiene. El prototipo es referencia visual; sus productos son contenido de diseño, no catálogo. El catálogo viejo de laboratorio es legacy y no se migra.

---

## 6. Contradicciones entre documentos, minuta y código

| Tema | Dice un artefacto | Dice otro | Resolución |
|---|---|---|---|
| Idioma | Minuta 21-10: suprimir selección de idiomas | `AGENTS.md`, middleware y código: `es/en` | Español único; eliminar `[lang]` y diccionarios |
| Favoritos/ofertas | Minuta 21-10: fuera de fase 1 | Home actual: “Favoritos de la Comunidad” y “Ofertas” | Eliminar de la UI |
| Validación de pago | Minuta e informe: manual por Admin | `verify-payment` y `gemini.ts`: IA | Retirar Gemini; validación manual |
| Alertas de stock | Minuta 21-10: popup en el panel; email solo al cliente | Código y planes: emails de alerta | Popup para Admin; email solo para el Cliente |
| Marca | Changelog: “Esencia Técnica” | Código y emails: “QuimicaShop” | Esencia Técnica |
| Separación de repos | `docs/SEPARACION.md`: viejo = e-commerce | Realidad: viejo = Teams; nuevo = e-commerce | Corregir el runbook |
| Rol de Juanma | `AGENTS.md`, README y `tasks.js`: Frontend & JS Lead | `team_members`: Full-Stack & Arquitectura | La base de Teams manda en roles |

---

## 7. Calidad de datos de la base nueva

Son datos de prueba, pero muestran que el modelo todavía no tiene reglas claras:

- Productos 1 y 2 tienen el mismo nombre y precio.
- Pedido 1: total 5000; comprobante 1: total 5400.
- Pedido 6: total 3600; comprobante 4: total 2400.
- Todos los `detalle_del_pedido` están “Pendiente” aunque los pedidos estén “Pago Validado”.
- `pedido.id_estado` de los pedidos 3, 4 y 6 apunta a la fila de estado del pedido 1.
- `producto.id_stock` es null y `stock.id_producto` está seteado: la FK está en dos direcciones.
- `cliente.id_carrito` es null y `detalle_carrito` está vacío.
- `estados_pedidos` tiene 6 filas “Pago Validado” para el pedido 1: no está claro si es historial o lookup.

Estas inconsistencias se resuelven en `docs/MODELO.md`, no parcheando datos.

---

## 8. Seguridad y entorno

- La anon key del proyecto nuevo **lee las tablas** (no se probaron escrituras). RLS parece permisiva o ausente. Hay que restringir lectura de `cliente` y `admin` y escritura de pedidos.
- La anon key del proyecto viejo lee `team_members` (incluye DNI y email). Ya está documentado como deuda en `docs/DEUDA_TECNICA.md`.
- `.env.local` solo tiene `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `VERCEL_OIDC_TOKEN`. Faltan `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` y `RESEND_API_KEY`; sin eso no se pueden probar altas, Storage ni `/admin`.
- `src/app/api/sync-sheets/route.ts` usa la service role como bearer token: si se filtra, da acceso total.
- `admin.contrasenia` no se usa: el panel autentica con `ADMIN_PASSWORD` por Basic Auth. Hay que decidir si el Admin vive en la base o en Auth.
- `GEMINI_API_KEY` quedó comentado en `.env.example`; se retira junto con `src/lib/gemini.ts`.

---

## 9. Contexto del equipo (`quimicashop`)

Roles leídos de `team_members` (solo lectura):

| Integrante | Rol en la base | Rol en docs |
|---|---|---|
| Juan Manuel Merodio | Full-Stack & Arquitectura | Frontend & JS Lead (desactualizado) |
| Isabella Infante | Database & SQL Architecture | Igual |
| Celeste Cáceres | Diseño UX/UI & Testing QA | Igual |
| Enzo Queipo | Backend, Admin Panel & Relaciones | Igual |

Estado del tablero (`team_tasks`): 16 tareas; 7 `done`, 2 `in_progress`, 2 `review`, 5 `backlog`. Las prioridades activas son alertas/notificaciones y automatización de comprobante/remito (Enzo), diagrama de clases y traducción de diagramas a SQL (Isabella), estructura main de producción, carrito y remito (Juanma), documentación y presentación (Celeste).

Observaciones:

- `team_members` no tiene las columnas `notify_on_meetings` / `notify_on_tasks` que el plan de notificaciones daba por agregadas.
- El rol de Juanma cambió en la base pero no en `AGENTS.md`, README ni `tasks.js`.
- El tablero es la fuente de prioridades; no se cachea en `AGENTS.md`.

---

## 10. Limpieza ejecutada en esta sesión

- `brain.md` → `docs/brain.md`.
- `diagrams/2209D/DFD1-3` → `docs/DFD1-3`.
- `diagrams/prototype1.html` → `docs/prototype1.html`.
- `diagrams/` eliminado: los 11 archivos restantes eran idénticos a `../quimicashop/diagrams` (15/15 verificados antes de borrar).

No se modificó código ni la base de datos. No se borró ningún archivo trackeado.

---

## 11. Limpieza pendiente

Ya ejecutado: `README.md` y `AGENTS.md` reescritos; `docs/SEPARACION.md` corregido; `docs/DEUDA_TECNICA.md` marcado como histórico; `diagrams/` eliminado; `brain.md` movido.

Pendiente de código:

1. Eliminar `src/app/[lang]/`, `src/dictionaries/`, middleware i18n y `src/app/[lang]/ProductCard.tsx`.
2. Retirar `src/lib/gemini.ts`, `verify-payment` con IA y `GEMINI_API_KEY`.
3. Unificar tipos: `src/lib/types.ts`, `src/lib/schemas.ts` y `src/lib/supabase.ts` deben salir del modelo de `docs/MODELO.md`.
4. Migrar servicios y `/admin` a las tablas y estados canónicos.
5. Agregar Vitest y el primer test cuando se implemente el primer ticket.

---

## 12. Decisiones cerradas

| Decisión | Resultado |
|---|---|
| Modelo | Normalizado, ERD Mermaid (`docs/MODELO.md`). |
| Estados MVP | Termina en `Pago Validado` + remito; sin envío. |
| Carrito | Cliente, cookie/localStorage; sin tablas en Supabase en el MVP. |
| Admin | Basic Auth con `ADMIN_PASSWORD`; `ADMIN`/`ROL` en fase 2. |
| Remito | HTML por email con Resend. |
| Tests | Vitest; Celeste es la responsable. |
| Validación | Manual por los Administradores de Química; sin IA. |
| Base de datos | La revisa Isabella Infante; brief en `docs/HANDOFF-ISABELLA.md`. |
