# Documentación · Esencia Técnica E-Commerce

Índice de la carpeta `docs/`. El vocabulario canónico está en [`../GLOSSARY.md`](../GLOSSARY.md) y el
contrato operativo en [`../AGENTS.md`](../AGENTS.md).

---

## Decisiones y estado

| Documento | Contenido |
|---|---|
| [`AUDITORIA.md`](AUDITORIA.md) | Inventario, duplicados, dos bases, tres catálogos y contradicciones. |
| [`MODELO.md`](MODELO.md) | ERD Mermaid del MVP, estados canónicos y reglas de integridad. |
| [`HANDOFF-ISABELLA.md`](HANDOFF-ISABELLA.md) | Brief de DDL, constraints, RLS y limpieza para Isabella. |
| [`TESTING.md`](TESTING.md) | Guía corta de Vitest y TDD. |
| [`DEUDA_TECNICA.md`](DEUDA_TECNICA.md) | Deuda conocida; escrita contra el esquema legacy. |
| [`SEPARACION.md`](SEPARACION.md) | Separación real entre e-commerce y Teams. |
| [`brain.md`](brain.md) | Filosofía de trabajo (SDD, TDD, módulos profundos, contexto). |

## Artefactos académicos

| Documento | Contenido |
|---|---|
| [`DER-quimica.csv`](DER-quimica.csv) | DER de 13 entidades. |
| [`DCU-Quimica.csv`](DCU-Quimica.csv) | Casos de uso. |
| [`DFD1-Quimica.csv`](DFD1-Quimica.csv), [`DFD2-Quimica.csv`](DFD2-Quimica.csv), [`DFD3-Quimica.csv`](DFD3-Quimica.csv) | DFD niveles 1–3. |
| [`informe_Escencia_Tecnica.md`](informe_Escencia_Tecnica.md) | Informe de cátedra. |

## Referencia visual

| Documento | Contenido |
|---|---|
| [`prototype1.html`](prototype1.html) | Prototipo HTML. Referencia de diseño, no catálogo de datos. |

## Configuración de agentes

| Documento | Contenido |
|---|---|
| [`agents/domain.md`](agents/domain.md) | Cómo consumir glosario y ADRs. |
| [`agents/issue-tracker.md`](agents/issue-tracker.md) | Issues y specs en GitHub con `gh`. |
| [`agents/triage-labels.md`](agents/triage-labels.md) | Labels de triage. |
| [`adr/0001-modelo-normalizado-mermaid.md`](adr/0001-modelo-normalizado-mermaid.md) | Modelo normalizado y Mermaid. |
| [`adr/0002-validacion-manual-sin-ia.md`](adr/0002-validacion-manual-sin-ia.md) | Validación manual, sin IA. |
| [`adr/0003-mvp-sin-envio.md`](adr/0003-mvp-sin-envio.md) | MVP sin envío. |

---

## Qué vive en `quimicashop`

No se copia acá:

- `index.html`, `tasks.html`, `tasks.js`, `style.css`.
- `diagrams/` completo: minutas, CHANGELOG, planes mobile/email, SQL de Teams y `SEPARACION.md` histórico.
- Tablas `team_*`.

El Hub/Teams es el repo [`quimicashop`](https://github.com/juanmamerodio/quimicashop).
