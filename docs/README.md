# Documentación · Esencia Técnica E-Commerce

Índice de la carpeta `docs/`. El vocabulario canónico está en [`../GLOSSARY.md`](../GLOSSARY.md) y el
contrato operativo en [`../AGENTS.md`](../AGENTS.md).

---

## Dónde está cada cosa

| Si buscás… | Andá a |
|---|---|
| Cómo usar la tienda o el panel (para el cliente) | [`cliente/`](cliente/README.md) |
| El modelo de datos y las reglas del dominio | [`MODELO.md`](MODELO.md) |
| La spec de una feature | [`specs/<feature>/spec.md`](specs/front-mvp/spec.md) |
| Por qué se decidió algo | [`adr/`](adr/0001-modelo-normalizado-mermaid.md) |
| El estado real, la auditoría y la deuda | [`estado/`](estado/AUDITORIA.md) |
| Cómo trabajamos (SDD, TDD, contexto) | [`metodo/`](metodo/brain.md) |
| Qué tiene que hacer una persona del equipo | [`entrega/`](entrega/HANDOFF-ISABELLA.md) |
| Los diagramas y el informe de cátedra | [`academico/`](academico/informe_Escencia_Tecnica.md) |
| Cómo configurar a un agente | [`agentes/`](agentes/domain.md) |

---

## `cliente/` · Manual de uso

Para el **Departamento de Química**: cómo funciona la tienda y cómo se opera el panel. Sin
vocabulario técnico.

| Documento | Contenido |
|---|---|
| [`MANUAL.md`](cliente/MANUAL.md) | Visión general: qué hace el sistema, la tienda pantalla por pantalla, el panel, la rutina y las preguntas frecuentes. |
| [`PANEL-DE-ADMIN.md`](cliente/PANEL-DE-ADMIN.md) | El panel en detalle: entrar, validar un comprobante, alertas de stock, stock, catálogo y qué no se puede hacer. |

## `specs/` · Specs por feature

Una carpeta por feature; la spec se linkea desde su issue de GitHub.

| Documento | Contenido |
|---|---|
| [`specs/front-mvp/spec.md`](specs/front-mvp/spec.md) | Plan de las tajadas del front y decisiones de UI. |
| [`specs/catalogo/spec.md`](specs/catalogo/spec.md) | Catálogo y grilla de productos. |
| [`specs/detalle-producto/spec.md`](specs/detalle-producto/spec.md) | Página de detalle de un producto. |
| [`specs/carrito/spec.md`](specs/carrito/spec.md) | Carrito en el cliente. |
| [`specs/checkout/spec.md`](specs/checkout/spec.md) | Confirmación del pedido, reserva y comprobante. |
| [`specs/admin/spec.md`](specs/admin/spec.md) | Panel `/admin`: validación, stock, alertas y productos. |
| [`specs/remito/spec.md`](specs/remito/spec.md) | Remito de venta y su email. |
| [`specs/sobre-el-proyecto/spec.md`](specs/sobre-el-proyecto/spec.md) | Página institucional. |
| [`specs/bd-mvp/spec.md`](specs/bd-mvp/spec.md) | Esquema de base del MVP. |
| [`specs/migracion-otjph/spec.md`](specs/migracion-otjph/spec.md) | Aplicar las migraciones en el proyecto Supabase vivo (issue #15). |

## `adr/` · Decisiones de arquitectura

El **porqué** de las decisiones difíciles de revertir.

| Documento | Decisión |
|---|---|
| [`adr/0001-modelo-normalizado-mermaid.md`](adr/0001-modelo-normalizado-mermaid.md) | Modelo normalizado y Mermaid como representación canónica. |
| [`adr/0002-validacion-manual-sin-ia.md`](adr/0002-validacion-manual-sin-ia.md) | Validación manual, sin IA. |
| [`adr/0003-mvp-sin-envio.md`](adr/0003-mvp-sin-envio.md) | El MVP termina en `Pago Validado` + remito. |
| [`adr/0004-reconstruccion-esquema-mvp.md`](adr/0004-reconstruccion-esquema-mvp.md) | Reconstrucción del esquema del MVP. |
| [`adr/0005-basic-auth-en-middleware.md`](adr/0005-basic-auth-en-middleware.md) | Basic Auth del panel en el middleware. |

## `estado/` · Estado, auditoría y deuda

Qué es verdad hoy: inventario, contradicciones y deuda conocida. Se corrige contra el modelo.

| Documento | Contenido |
|---|---|
| [`estado/AUDITORIA.md`](estado/AUDITORIA.md) | Inventario, duplicados, dos bases, tres catálogos y contradicciones. |
| [`estado/AUDITORIA_BD.md`](estado/AUDITORIA_BD.md) | Auditoría de la base y de los tests. |
| [`estado/DEUDA_TECNICA.md`](estado/DEUDA_TECNICA.md) | Deuda conocida; escrita contra el esquema legacy. |
| [`estado/SEPARACION.md`](estado/SEPARACION.md) | Separación real entre e-commerce y Teams. |

## `metodo/` · Método de trabajo

| Documento | Contenido |
|---|---|
| [`metodo/brain.md`](metodo/brain.md) | Filosofía de trabajo (SDD, TDD, módulos profundos, contexto). |
| [`metodo/TESTING.md`](metodo/TESTING.md) | Guía corta de Vitest y TDD. |

## `entrega/` · Handoffs y guías por persona

Qué tiene que hacer cada responsable, con el paso a paso.

| Documento | Contenido |
|---|---|
| [`entrega/HANDOFF-ISABELLA.md`](entrega/HANDOFF-ISABELLA.md) | Brief de DDL, constraints, RLS y limpieza para Isabella. |
| [`entrega/GUIA-ISABELLA.md`](entrega/GUIA-ISABELLA.md) | Paso a paso de la migración de `otjph` (issue #15). |
| [`entrega/GUIA-QUEIPO.md`](entrega/GUIA-QUEIPO.md) | Paso a paso de secretos, verificación de punta a punta y cron. |

## `academico/` · Artefactos académicos y referencia visual

Material de cátedra. Se adapta al código y al modelo; **no** manda sobre la implementación.

| Documento | Contenido |
|---|---|
| [`academico/DER-quimica.csv`](academico/DER-quimica.csv) | DER de 13 entidades. |
| [`academico/DCU-Quimica.csv`](academico/DCU-Quimica.csv) | Casos de uso. |
| [`academico/DFD1-Quimica.csv`](academico/DFD1-Quimica.csv), [`DFD2-Quimica.csv`](academico/DFD2-Quimica.csv), [`DFD3-Quimica.csv`](academico/DFD3-Quimica.csv) | DFD niveles 1–3. |
| [`academico/informe_Escencia_Tecnica.md`](academico/informe_Escencia_Tecnica.md) | Informe de cátedra. |
| [`academico/prototype1.html`](academico/prototype1.html) | Prototipo HTML. Referencia de diseño, **no** catálogo de datos. |

## `agentes/` · Configuración de agentes

| Documento | Contenido |
|---|---|
| [`agentes/domain.md`](agentes/domain.md) | Cómo consumir glosario y ADRs. |
| [`agentes/issue-tracker.md`](agentes/issue-tracker.md) | Issues y specs en GitHub con `gh`. |
| [`agentes/triage-labels.md`](agentes/triage-labels.md) | Labels de triage. |

---

## Qué vive en `quimicashop`

No se copia acá:

- `index.html`, `tasks.html`, `tasks.js`, `style.css`.
- `diagrams/` completo: minutas, CHANGELOG, planes mobile/email, SQL de Teams y `SEPARACION.md` histórico.
- Tablas `team_*`.

El Hub/Teams es el repo [`quimicashop`](https://github.com/juanmamerodio/quimicashop).
