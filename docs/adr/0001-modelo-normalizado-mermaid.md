# Modelo normalizado y Mermaid como representación canónica

**Status:** accepted · 2026-10-22

El código legacy usa tres tablas planas (`productos`, `pedidos`, `verificaciones`) mientras la base nueva del e-commerce tiene 13 tablas normalizadas y el DER académico describe 13 entidades. Decidimos que el **modelo normalizado** de [`docs/MODELO.md`](../MODELO.md) sea la representación canónica, expresada en **Mermaid**, y que el código se migre a él. El DER académico se adapta al modelo; no al revés.

**Alternativa descartada:** congelar el esquema plano del código legacy. Se descartó porque no permite auditar reservas, comprobantes ni remitos, y contradice la base nueva y el DER.

**Consecuencias:** el código se refactoriza; Isabella Infante revisa el DDL y las constraints; el prototipo visual no define datos.
