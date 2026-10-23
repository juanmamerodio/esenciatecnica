# NEXOBOW — MASTER AI BRAIN & OPERATING SYSTEM (v2.0)
> **Documento Maestro de Conciencia Técnica, Reglas Agénticas y Arquitectura de Sistemas**  
> *Autor: Staff AI Engineer & Arquitecto de Sistemas NexoBow*  
> *Stack Base: DeepSeek Harness, Google Antigravity (Gemini 3.8 Flash), OpenCode/OpenRouter (DeepSeek V4 Flash / Kimi / GLM), N8N, Supabase, Resend*  
> *Presupuesto Operativo: < $10 USD/mes | Filosofía: Cero Hype, Spec-Driven Development (SDD), TDD y Módulos Profundos*

---

## 1. MANIFIESTO Y FILOSOFÍA DE INGENIERÍA NEXOBOW

### 1.1 El Fin del Vibe Coding
En NexoBow no construimos software mediante "Vibe Coding" (programar a ciegas esperando que la IA adivine). El Vibe Coding genera código desordenado, satura las ventanas de contexto y destruye la mantenibilidad del sistema.

### 1.2 Principios Fundamentales de Desarrollo
1. **El Código NO es barato**: El código sin especificación ni pruebas es la deuda técnica más cara que existe.
2. **Rol Estratégico vs. Rol Táctico**:
   * **Ingeniero Humano**: Director Estratégico, Diseñador de Interfaces Públicas y Auditor de Calidad.
   * **Agente IA**: Sargento Táctico de Ejecución, Generador de Tests y Ejecutor Quirúrgico de Diffs.
3. **Shared Design Concept (Concepto de Diseño Compartido)**: Antes de escribir una sola línea de código, la IA y el Humano deben alcanzar una alineación total sobre el modelo de dominio, reglas de negocio y restricciones.
4. **Módulos Profundos (Deep Modules)**: Diseñar interfaces públicas simples que oculten lógica interna compleja y densa. Pocas funciones públicas con gran funcionalidad interna evitan que la IA se pierda navegando en docenas de archivos pequeños (shallow modules).

---

## 2. ARQUITECTURA DE ENTORNO Y CONTROL DE TOKENS EN DEEPSEEK HARNESS

### 2.1 La Regla de las Zonas de Contexto (Smart Zone vs. Dumb Zone)
* **Smart Zone (< 100k - 140k tokens)**: Zona donde el modelo mantiene atención óptima, razonamiento lógico de alta precisión y seguimiento estricto de instrucciones.
* **Dumb Zone (> 150k tokens)**: Zona de degradación por atención dividida. El modelo empieza a alucinar, olvida reglas, duplica código y quema presupuesto inútilmente.

### 2.2 Regla de Oro Operativa
$$\text{1 Feature / Ticket} = \text{1 Sesión Limpia (`/clear` o `/compact` con Handoff)} = \text{1 Commit / Diff Quirúrgico}$$

### 2.3 Divulgación Progresiva del Contexto (Progressive Context Disclosure)
Para no saturar la ventana de contexto, la información se estructura en 3 niveles de carga:
1. **Nivel 1 (YAML Frontmatter ~100 tokens)**: La IA lee únicamente el nombre y la descripción ligera de cada Skill/Módulo al iniciar la sesión.
2. **Nivel 2 (Carga Ejecutiva ~1.500 tokens)**: La IA carga el contenido completo de una `skill.md` **únicamente cuando decide invocarla**.
3. **Nivel 3 (Documentación Extendida bajo demanda)**: La IA consulta `/docs/` o `/references/` solo si necesita resolver un detalle técnico específico.

### 2.4 DeepSeek Harness: Configuración y Modos
* **Creator Mode**: Usar DeepSeek Harness en modo creador con nivel de esfuerzo **Alto/Max** para el diseño de especificaciones, arquitecturas de subagentes y planificación inicial.
* **Orquestación de Subagentes**: Un agente principal (Manager) coordina subagentes paralelos independientes. Cada subagente nace con una ventana de contexto 100% limpia (*fresh context window*), ejecuta su tarea delimitada y retorna un resumen conciso al orquestador.
* **Gestión de Errores y Resiliencia**: Un error o falla de ejecución no es un problema; es un dato para refinar la Skill o actualizar la memoria de `brain.md` mediante `/retro`.

---

## 3. METODOLOGÍA WORKFLOW PUNTA A PUNTA (MATT POCOCK & SIMON WILLISON)

El ciclo de desarrollo en NexoBow sigue estrictamente 3 fases desglosadas en pasos ejecutables:

```text
[ FASE 1: ALINEACIÓN (Human-in-the-Loop) ]
   │
   ├─► 1. /grill-me o /grill-with-docs  (Interrogatorio de 20-40 preguntas)
   ├─► 2. /to-spec                      (Generación del PRD / Spec)
   └─► 3. /to-tickets                   (Desglose en Vertical Slices)

[ FASE 2: EJECUCIÓN AUTÓNOMA (AFK - Away From Keyboard) ]
   │
   ├─► 4. /implement-spec               (TDD + Worktrees + Subagentes)
   └─► 5. Red-Green-Refactor            (Test que falla -> Código -> Refactor)

[ FASE 3: REVISIÓN Y RETROSPECTIVA ]
   │
   ├─► 6. /code-review o /pr            (Auditoría con Contexto Limpio)
   └─► 7. /retro                        (Actualización de Skills y Rules)
```

### 3.1 Paso 1: `/grill-me` (Sesión de Interrogatorio Implacable)
* **Objetivo**: Forzar a la IA a hacer preguntas secuenciales explorando cada rama del árbol de decisiones.
* **Instrucción Core**: *"Entrevístame de forma implacable sobre este plan/idea hasta alcanzar un concepto de diseño compartido. Haz las preguntas de a una, propone tu recomendación y actualiza el archivo `glossary.md` con los términos del dominio."*

### 3.2 Paso 2: `/to-spec` (Product Requirements Document - PRD)
* **Objetivo**: Comprimir el historial de la conversación de alineación en un documento estático de especificación (`/specs/{feature_id}/spec.md`).
* **Contenido Obligatorio**:
  1. Problema de negocio y solución propuesta.
  2. Historias de Usuario con Criterios de Aceptación (Given-When-Then).
  3. Alcance del MVP y límites explícitos (*Out of Scope*).
  4. Definición de Módulos Profundos a modificar e interfaces públicas.

### 3.3 Paso 3: `/to-tickets` (Tajadas Verticales / Tracer Bullets)
* **Prohibición**: Queda estrictamente prohibido desglosar tareas por capas horizontales (ej: "Ticket 1: Toda la BBDD", "Ticket 2: Toda la API", "Ticket 3: Todo el Frontend").
* **Regla de Tajada Vertical (*Vertical Slice*)**: Cada ticket debe cruzar verticalmente todas las capas del sistema (BD + Endpoint API + Componente UI) en un entregable funcional mínimo para obtener un bucle de retroalimentación (*feedback loop*) instantáneo.

### 3.4 Paso 4 y 5: `/implement-spec` y TDD Agéntico (Simon Willison Pattern)
* **TDD Agéntico (`Red-Green-Refactor`)**:
  1. **Red**: El agente escribe primero una prueba automatizada que demuestra que la funcionalidad no existe o falla.
  2. **Green**: El agente escribe la cantidad mínima indispensable de código para que la prueba pase.
  3. **Refactor**: El agente limpia el código manteniendo las pruebas en verde.
* **Manual Verification Loop**: Obligar al agente a levantar el servidor local en segundo plano y probar los endpoints mediante comandos `curl` o scripts de prueba antes de entregar.

### 3.5 Paso 6 y 7: `/code-review` y `/retro`
* **Auditoría en Contexto Limpio**: Nunca pedirle a la misma sesión que escribió el código que audite su trabajo. Lanzar un subagente de solo lectura (*read-only*) en una sesión limpia.
* **Retrospectiva Agéntica (`/retro`)**: Al cerrar un módulo, la IA examina los logs de la sesión para identificar ineficiencias de tokens, comandos fallidos o falta de reglas en `brain.md`, actualizando las directivas de la agencia.

---

## 4. ESTÁNDAR DE AGENT SKILLS Y ARQUITECTURA DE SUBAGENTES

### 4.1 Anatomía Estándar de una Agent Skill (`.md`)
Todas las skills en NexoBow deben ubicarse en `/.agents/skills/{skill-name}/` y cumplir la siguiente estructura:

```markdown
---
name: nombre-de-la-skill
description: "Descripción ultra-concisa de cuándo la IA debe invocar esta skill."
model: "opencode/deepseek-v4-flash | gemini-3.8-flash"
tools: ["bash", "read_file", "write_file"]
---

# SKILL: [Nombre de la Skill]

## 1. PROPÓSITO
[Explicación clara del objetivo único de esta skill]

## 2. PARÁMETROS DE ENTRADA
- `client_id`: ID del cliente en /clients/
- `template_type`: Rubro base (abogado | psicologo | nutricionista | ecomm)

## 3. GUARDRAILS (LO QUE LA SKILL NO DEBE HACER)
- NO modificar archivos fuera de /dist/{client_id}/.
- NO escribir código sin antes verificar que existan los tests en verde.
- NO realizar más de 3 llamadas consecutivas fallidas a la misma herramienta.

## 4. PASOS DE EJECUCIÓN
1. Paso 1...
2. Paso 2...
3. Paso 3...
```

### 4.2 Catálogo de Skills Maestras Recomendadas para NexoBow
1. `grill-me`: Interrogatorio inicial y alineación.
2. `to-spec`: Consolidación del PRD y alcance.
3. `to-tickets`: Desglose en tajadas verticales.
4. `implement-spec`: Bucle TDD autónomo por ticket.
5. `frontend-design`: Inyección de heurísticas UI/UX para evitar "AI Slop".
6. `build-client-site`: Ensamblado automático de landings para clientes de servicios.
7. `ecomm-pipeline-builder`: Configuración de flujos e-commerce (carritos, checkout, mails).
8. `retro`: Auditoría y optimización del entorno agéntico.

---

## 5. ARQUITECTURA B2B Y E-COMMERCE: SUPABASE, RESEND Y N8N

### 5.1 Supabase Stack (Base de Datos y Autenticación)
* **Aislamiento Multi-inquilino**: Cada cliente de la agencia o tienda e-commerce debe tener su aislamiento de datos mediante `client_id` y políticas de **Row Level Security (RLS)** en PostgreSQL.
* **Migraciones Deterministas**: No crear tablas manualmente desde el panel. Toda modificación de base de datos se ejecuta mediante archivos SQL en `supabase/migrations/` aplicados vía CLI o MCP.
* **Webhooks de BD**: Configurar disparadores en Supabase (`Database Webhooks`) para notificar eventos (ej: `INSERT INTO leads` o `INSERT INTO orders`) directamente a N8N.

### 5.2 Resend Stack (Emails Transaccionales e Hiper-personalizados)
* **Plantillas React Email / HTML Aisladas**: Las plantillas de correo viven en `/templates/emails/` (ej: `welcome-b2b.html`, `abandoned-cart.html`, `quote-ready.html`).
* **Regla de Integración en Node/Python/N8N**:
  ```javascript
  import { Resend } from 'resend';
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'NexoBow <no-reply@nexobow.com>',
    to: lead.email,
    subject: `Cotización Personalizada para ${lead.business_name}`,
    html: compiledTemplate
  });
  ```
* **Casos de Uso E-Commerce / Servicios**:
  * Confirmación de agendamiento automático.
  * Entrega de cotizador/calculadora de ROI.
  * Secuencia de recuperación de carritos abandonados.
  * Notificación instantánea al dueño del negocio por cliente de alta prioridad.

### 5.3 N8N + MCP Servers (Orquestación e Integración)
* **Servidores MCP por Proyecto**: Prohibido instalar MCPs globales. Definir los MCPs únicamente dentro de `mcp.json` en la raíz de cada proyecto.
* **Preferir CLIs y Scripts Locales**: Cuando sea posible, usar utilidades CLI o scripts en Python en lugar de MCPs pesados para reducir el consumo inicial de tokens.
* **Flujos N8N Deterministas**: N8N maneja la lógica fija (Webhooks, almacenamiento en Supabase, envío por Resend). La IA se invoca únicamente en nodos específicos para clasificación o generación de texto personalizado.

---

## 6. ESTRUCTURA MAESTRA DE DIRECTORIOS (`agency-factory`)

```text
agency-factory/
├── brain-v2.md                        <-- Documento Maestro (Este archivo)
├── agents.md                          <-- Contexto operativo del IDE
├── .agents/
│   └── skills/                        <-- Skills reutilizables
│       ├── grill-me/skill.md
│       ├── to-spec/skill.md
│       ├── to-tickets/skill.md
│       ├── implement-spec/skill.md
│       ├── frontend-design/skill.md
│       ├── build-client-site/skill.md
│       └── retro/skill.md
├── .vscode/
│   └── mcp.json                       <-- Conexiones MCP aisladas
├── templates/                         <-- Código base por vertical
│   ├── abogado/
│   ├── psicologo/
│   ├── nutricionista/
│   ├── ecomm-store/
│   └── emails/
├── clients/                           <-- Contexto privado por cliente
│   ├── client-001-perez/
│   │   └── client.json
│   └── client-002-nutrifit/
│       └── client.json
└── dist/                              <-- Builds generados por cliente
```

---

## 7. CHECKLIST DE EJECUCIÓN RÁPIDA PARA LA IA

Al iniciar cualquier tarea en el repositorio de NexoBow, la IA debe ejecutar automáticamente la siguiente comprobación:

1. [ ] **Lectura del Estado**: Verificar el archivo `brain-v2.md` y `glossary.md` para entender las reglas de negocio.
2. [ ] **Verificación de la Ventana de Contexto**: Si la conversación supera los 100k tokens, sugerir al usuario hacer un `/compact` o `/clear` con `session-handoff.md`.
3. [ ] **Fase de Alineación**: ¿Existe un archivo `spec.md` para esta tarea? Si no existe, invocar `/grill-me` antes de programar.
4. [ ] **Desglose Vertical**: Comprobar que el ticket actual sea una tajada vertical (*vertical slice*).
5. [ ] **TDD Obligatorio**: Crear el test que falla antes de escribir el código de producción.
6. [ ] **Aislamiento de Datos**: Garantizar que ningún dato sensible o credencial se guarde hardcodeado fuera de `.env` o `/clients/{client_id}/client.json`.
