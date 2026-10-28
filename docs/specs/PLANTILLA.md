# Plantilla de spec

> **Qué es:** el esqueleto de un spec de Esencia Técnica. Se copia, se completa y se adjunta al issue.
> **Fuente de verdad:** [`AGENTS.md`](../../AGENTS.md) §6.2 · [`docs/metodo/brain.md`](../metodo/brain.md) §3 ·
> los specs de `docs/specs/`.
> **Regla:** el **issue** sigue siendo la spec publicada; esta plantilla sólo ordena el documento.
> **Última revisión:** 2026-10-28.

---

## El encabezado

Un spec abre con un blockquote: **feature**, **estado** (especificada · en implementación · implementada
en repo), **fecha**, **issue** y **tajada** si el issue es un paraguas, **origen**, **fuente de verdad**,
**responsable** y **criterio de cierre** (una frase, verificable).

## Las siete secciones, en este orden

1. **Problema** — desde el punto de vista de quien lo sufre: qué se rompe hoy y qué cuesta. Si el hallazgo
   tiene evidencia, se cita; si un dato resultó falso, se corrige acá.
2. **Solución** — desde el punto de vista de quien la usa: la regla que se adopta, en pocas viñetas.
3. **Historias y criterios de aceptación** — cada HU con la forma exacta y sus criterios.
4. **Decisiones de implementación** — módulos y contratos **por su concepto**, no por su ruta; qué entra y
   qué no. Un fragmento recortado sólo si codifica una decisión mejor que la prosa (una máquina de
   estados, un contrato), anotando de dónde viene.
5. **Decisiones de testing** — qué seam se usa, qué se testea (comportamiento externo), qué no se testea y
   el prior art del repo.
6. **Fuera de alcance** — lo que este spec **no** decide, para no implementar de más.
7. **Notas finales** — supuestos, correcciones de evidencia, decisiones que se tomaron con el equipo y lo
   que la próxima sesión no tiene que redescubrir.

Una octava sección —**Estado de implementación**— es opcional: la agregan sólo los specs ya auditados
contra el código, con una tabla criterio por criterio y su evidencia.

## La forma exacta de una HU

```
Como <actor>, quiero <feature>, para <beneficio>.
```

- `<actor>`: quién (Cliente, Administrador de Química, Enzo, Celeste, revisor, agente).
- `<beneficio>`: para qué; una HU sin actor **o** sin beneficio no cumple la plantilla.
- Después, los criterios en **Given/When/Then** o **Then**, con el valor concreto.
- Una HU por comportamiento observable; el test que la fija se nombra en la sección de estado.

## Lo que la plantilla prohíbe

- Rutas de archivo y números de línea en las decisiones (envejecen al primer refactor).
- Fragmentos de código largos: el código vive en el repo, no en el spec.
- Sinónimos de vocabulario: si un término nuevo aparece, va al [`GLOSSARY.md`](../../GLOSSARY.md) primero.
- Secciones con otro nombre para lo mismo: `Decisiones tomadas` y `Decisiones de implementación` son una
  sola sección.
