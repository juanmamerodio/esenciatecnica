# Spec · Front MVP — unir el prototipo con la app final (Esencia Técnica)

> **Feature:** `front-mvp` · **Estado:** aprobada para implementación por tajadas · **Fecha:** 2026-10-23.
> **Origen:** sesión de grilling (`/grill-me`) del 2026-10-23; el issue de GitHub es la spec publicada.
> **Fuente de verdad:** [`GLOSSARY.md`](../../../GLOSSARY.md), [`docs/MODELO.md`](../../MODELO.md),
> [`src/lib/database.types.ts`](../../../src/lib/database.types.ts) y [`docs/prototype1.html`](../../prototype1.html)
> (este último **solo diseño/UX**: sus productos son contenido de muestra, no catálogo).
> **Proceso:** [`docs/brain.md`](../../brain.md) §3 y [`AGENTS.md`](../../../AGENTS.md) §6.

---

## 1. Problema

El e-commerce del MVP **no tiene front**. La app Next corre sobre código legacy: rutas con `[lang]`,
tablas `productos`/`pedidos`, campos `nombre_es`/`precio_ars`, estados `pre_aprobado`/`comprobante_subido`,
y dos secciones —“Favoritos de la Comunidad” y “Ofertas Especiales”— que el glosario **retira** y que
además inventan datos (un corte arbitrario `precio_ars < 2000`). El `typecheck` está rojo con 11 errores
y el `lint` con 1.

Al mismo tiempo, la base canónica ya está definida, migrada y probada (59 tests con PGlite), con
`vista_catalogo` exponiendo `precio` y `disponible`, y con tipos generados que **ningún archivo importa**.

El prototipo `docs/prototype1.html` define una identidad visual que nunca se implementó en la app, y su
contenido (insumos de laboratorio, `pH`, validación “vía Gemini”, estados de envío) **contradice el modelo
aprobado**: el Producto es cosmética e higiene, la validación es manual y el MVP termina en Pago Validado.

Resultado: nadie puede recorrer la tienda, el equipo no puede mostrar el sistema, y cada agente que abre
el repo ve dos verdades (legacy y canónica) sin saber cuál manda.

## 2. Solución

Llevar la app a la identidad visual acordada y al modelo canónico mediante **tajadas verticales**, cada
una con base + UI + test en un entregable mínimo. Esta spec fija:

1. Las **fundaciones compartidas** (identidad visual, componentes base, contrato de datos) que todas las
   tajadas reutilizan, para no rediseñar dos veces.
2. El **mapa de tajadas** con orden y blockers.
3. La **HU del slice 1 (Home)** y del slice **T0 (español único)**, que son los únicos detallados acá.

El resto de las tajadas suma su propio `docs/specs/<slice>/spec.md` cuando le toque; hasta entonces no se
les inventan criterios de aceptación.

---

## 3. Fundaciones compartidas

### 3.1 Identidad visual

**Base: la app actual.** La paleta `accent #3d8c6e`, `bg #f7f7f5`, superficies glass, las tipografías
DM Sans / DM Mono, los radios (20px card / 100px botón) y `lucide-react` **se mantienen**. El verde del
prototipo (`#154212`) **no** reemplaza al accent: cambiarlo es una decisión de marca que no está en el
modelo ni en el glosario, y dispararía un rediseño de todo lo construido.

**Se adopta del prototipo:**

| Del prototipo | Por qué |
|---|---|
| Anatomía de la card de producto: chip de categoría en mono, precio con “ARS”, botón circular de agregar | Da densidad técnica sin inventar campos |
| Grilla de productos con más aire y hover elevado | Mejor ritmo visual que la actual |
| Hero editorial con marco de imagen y badge flotante | Cuenta la propuesta institucional en un vistazo |
| Footer institucional en columnas (hoy es un `<p>` suelto) | Da contacto, institución y accesos |
| Ritmo de secciones amplio (~96px) y nav tipo pill con estado activo | Jerarquía y orientación |

**Se descarta:** la paleta `#154212`, Material Symbols, Poppins / JetBrains Mono, `mix-blend-mode`, y toda
la lógica SPA (`paint()`, `STATE`, `CART` en memoria): en Next eso son rutas y estado real.

**Una sola fuente de tokens.** Hoy los colores están duplicados como literales en `tailwind.config.ts` y
como variables CSS en `globals.css`. Se unifica: `globals.css` define los valores, y el tema de Tailwind
los referencia por variable. Ningún color se escribe dos veces.

### 3.2 Componentes base

Pocos componentes, props chicas, lógica adentro (módulos profundos):

- **Card de producto**: única, con estados `ok`, `sin-stock` y `sin-imagen`.
- **Chip / Badge**: categoría y señales de estado.
- **Botón**: variantes primaria y fantasma.
- **Encabezado de sección**: título + subtítulo + acción.
- **Header** (nav) y **Footer** institucional, compartidos por todas las rutas.

`src/app/[lang]/ProductCard.tsx` (duplicado y sin importadores) se elimina: [AGENTS.md](../../../AGENTS.md)
§7.4 prohíbe dos componentes para lo mismo.

### 3.3 Contrato de datos

El front consume **`vista_catalogo`** (ya filtra `activo` y expone `disponible = cantidad_actual -
cantidad_reservada` clampeado a 0) a través de los tipos generados en `src/lib/database.types.ts`.

Un módulo profundo de catálogo expone **una** función pública y devuelve un resultado que **distingue
vacío de error** (nunca `console.error` + grilla vacía indistinguible, que es lo que hace hoy la Home):

- `estado: 'ok'` con `productos` (posiblemente `[]`) → la UI muestra el estado vacío diseñado.
- `estado: 'error'` → la UI muestra el estado de error, no un catálogo vacío.

Orden por `nombre` ascendente: `PRODUCTO` no tiene `created_at`, así que “lo más nuevo” no existe en el
modelo y no se inventa. Sin límite de filas.

El tipo `Producto` legacy de `src/lib/supabase.ts` (`nombre_es`, `precio_ars`, categorías
`reactivos|materiales|equipos`) se retira de todo el camino del catálogo.

### 3.4 Skills del proyecto

Las skills propias de Esencia Técnica viven en **`.agents/skills/<nombre-kebab>/SKILL.md`**, en el repo:
viajan con el código, las ve todo el equipo, y **pisan** a las globales de `~/.agents/skills/`.

Verificado contra el runtime real del Harness: el descubrimiento es de **un solo nivel**
(`.agents/skills/<nombre>/SKILL.md`, nunca `skills/<categoría>/<skill>/SKILL.md`), el nombre canónico sale
del frontmatter (`name` en kebab-case, `description` obligatorios), y el archivo debe llamarse `SKILL.md`.

[`docs/brain.md`](../../brain.md) §4.1 exigía `model:`/`tools:` y un archivo `skill.md` en minúscula: tal
cual, una skill escrita siguiendo ese ejemplo **no carga**. Se corrige el estándar para que coincida con
el runtime, y la regla de ubicación se registra en AGENTS §11.

---

## 4. Mapa de tajadas

| Tajada | Objetivo | Blockers |
|---|---|---|
| **T0 · Español único** | Borrar i18n y `[lang]`; rutas en la raíz; `typecheck` y `lint` en verde | — |
| **T1 · Home** | Home canónica con la identidad acordada | T0; OK de UX/UI de Celeste |
| **T2 · Catálogo** | Grilla real, buscador y filtro por categoría (hoy son placeholders deshabilitados) | T1 |
| **T3 · Detalle de producto** | Ver un producto en detalle (no existe hoy; el prototipo sí lo tiene) | T2; decisión abierta 1 |
| **T4 · Carrito** | Carrito del cliente sin reservar stock | T1 |
| **T5 · Checkout + comprobante** | Confirmar pedido, reservar stock y subir el comprobante | T4 |
| **T6 · Sobre el proyecto** | Página institucional (hoy `/about`, en el prototipo “Investigación”) | T1; decisión abierta 2 |
| **T7 · Admin** | Login, stock, pedidos, aprobar/rechazar comprobantes, alertas, subida de fotos | T0; contrato canónico |
| **T8 · Remito + email** | Remito de venta al aprobar y su envío al Cliente | T7 |

Ninguna tajada se implementa sin su spec detallada ni sus criterios de aceptación.

---

## 5. Slice 1 · Home (`T1`)

### HU-1 · Propuesta de valor

**Como** Cliente, **quiero** entender en un vistazo qué vende la tienda y quién la hace, **para** decidir si
me interesa el catálogo.

- **Given** que entro a `/`, **Then** veo un hero con la identidad institucional (E.E.S.T N°1 Luciano Reyes)
  y una llamada a la acción al catálogo.
- **Then** el texto habla de cosmética e higiene elaboradas por el Departamento de Química: **no** aparece
  vocabulario de insumos de laboratorio, `pH`, “compuestos clínicos” ni referencias a IA.

### HU-2 · Productos publicados

**Como** Cliente, **quiero** ver los productos publicados **para** elegir uno.

- **Given** 2 productos activos en el catálogo, **When** cargo `/`, **Then** veo los 2 en **una sola**
  grilla ordenada por nombre.
- **Then** cada card muestra imagen, chip de categoría, nombre, descripción y precio, sin inventar campos.
- **Then** la Home **no** muestra la cantidad de unidades disponibles.

### HU-3 · Producto sin stock

**Como** Cliente, **quiero** saber que un producto no está disponible **para** no perder tiempo.

- **Given** un producto activo con `disponible = 0`, **Then** la card se muestra igual, marcada como sin
  stock, y no ofrece agregarlo.
- **Given** un producto activo sin fila en `stock`, **Then** se comporta igual que `disponible = 0`.

### HU-4 · Tienda sin productos

**Como** Cliente, **quiero** una explicación honesta **para** no pensar que la tienda está rota.

- **Given** que la vista del catálogo responde sin filas, **Then** veo “Todavía no hay productos publicados”.
- **Given** que la consulta falla, **Then** veo un estado de error distinguible del estado vacío.

### HU-5 · Imagen ausente

**Como** Cliente, **quiero** ver una card prolija aunque falte la foto **para** no ver un ícono de error.

- **Given** un producto sin `imagen_url` o con una URL que no resuelve, **Then** la card muestra el
  placeholder de la identidad (fondo tonal + nombre de categoría en mono) y un `alt` descriptivo.

### HU-6 · Navegación

**Como** Cliente, **quiero** moverme por la tienda **para** llegar al catálogo, al carrito o a la
información institucional.

- **Then** el header ofrece Inicio, Catálogo, Sobre el proyecto, Carrito (con contador) y Gestión (admin).
- **Then** el footer institucional repite los accesos, el contacto y la institución.
- **Then** **no** hay selector de idioma en ninguna parte.

### HU-7 · Mobile y accesibilidad

**Como** Cliente en el celular, **quiero** usar la Home con una mano **para** comprar sin zoom.

- **Then** una sola columna, sin desbordes horizontales, con áreas táctiles cómodas.
- **Then** foco visible, contraste AA, `aria-label` en los controles con ícono y `lang="es"` en el documento.
- **Then** las animaciones respetan `prefers-reduced-motion`.

### HU-8 · Confianza en el pago

**Como** Cliente, **quiero** entender cómo se paga **para** animarme a comprar.

- **Then** la Home comunica que el pago es por **transferencia validada a mano** por los Administradores de
  Química, sin prometer envío ni seguimiento (fuera del MVP).

### Slice 0 · Español único (`T0`)

- **Given** el repo limpio, **When** corro `npm run typecheck`, **Then** 0 errores.
- **Given** el repo limpio, **When** corro `npm run lint`, **Then** 0 errores.
- **Then** `/` renderiza la tienda sin redirección a `/es`, no existe `src/app/[lang]/`, no existen
  diccionarios ni `middleware.ts`, y no quedan las dependencias de i18n.
- **Then** ningún texto de UI depende de un diccionario: está escrito en español en el código.

---

## 6. Decisiones de UX (aprobadas el 2026-10-25)

> **Gate G1 ([#4](https://github.com/juanmamerodio/esenciatecnica/issues/4)): cerrado.** Las cinco propuestas
> de abajo quedan **aprobadas tal cual**, y las decisiones abiertas 3, 4 y 5 se cierran en §10. El texto
> institucional definitivo del footer es el que ya está en `src/components/Footer.tsx` (contacto
> `proyectos@esenciatecnica.edu.ar`, “Ciclo Lectivo 2026”), que es el que G1 aprobó por escrito.

1. **Confianza primero**: alias/CBU y plazo visibles en el camino al checkout, con el mensaje de
   transferencia validada a mano. **Límite explícito:** el sistema **no inventa** datos bancarios. Los
   publica desde `NEXT_PUBLIC_TRANSFERENCIA_*` y, si no están configurados, el checkout dice que los
   confirma la Cooperadora en vez de mostrar un CBU de mentira (gate **G4**).
2. **Promesa de entrega**: `tiempo_produccion` como dato de producción (no de envío), visible en catálogo
   y detalle; **no** en la Home. Lo implementa T3.
3. **Retiro/entrega a acordar**: se comunica como acuerdo posterior, porque el MVP no incluye envío.
4. **Trazabilidad de lote**: lenguaje institucional (“elaborado por alumnos de 7mo año”), sin inventar
   campos de lote en el modelo.
5. **Mobile-first** y **estados diseñados** (vacío, error, sin stock, sin imagen), no estados por defecto.
6. **Plazo de la reserva**: el camino al checkout comunica que la reserva se libera el **viernes** si el
   comprobante no está aprobado (`AGENTS.md` §5.6), porque es una regla del dominio y no una promesa.

---

## 7. Seams bajo test

**Un solo seam** para el slice 1: la función pública del módulo de catálogo, que devuelve el resultado del
catálogo ya ordenado y con `disponible` resuelto. Es el punto más alto posible: la UI no se testea con DOM.

| Seam | Cubre | Deja afuera |
|---|---|---|
| Función pública del catálogo (contra PGlite migrada + seed) | solo activos, orden por nombre, `disponible` correcto, vacío, error | render de la Home |
| Verificación en navegador de la Home | jerarquía, responsive, foco | automatización de UI |

**Prior art:** `tests/db/` (Vitest + PGlite, sin red ni Docker) y su ayudante de migraciones. No se agregan
dependencias nuevas: si hace falta cobertura de DOM, es un ticket aparte y se avisa antes de instalar
jsdom + Testing Library ([AGENTS.md](../../../AGENTS.md) §4 y §8).

**Qué hace bueno a un test acá:** verifica comportamiento externo del catálogo (qué productos salen, con
qué disponibilidad, qué pasa cuando no hay filas o cuando la consulta falla), nunca nombres de triggers,
formas de query ni detalles de implementación.

---

## 8. Fuera de alcance

- T2 a T8: catálogo con buscador, detalle, carrito, checkout, “Sobre el proyecto”, admin, remito y emails.
- Fotos reales de producto: las carga el Administrador desde el panel (T7). La Home solo consume `imagen_url`.
- i18n, Gemini/IA, envío y seguimiento, cuentas de Cliente, carrito persistente en Supabase.
- DDL, migraciones, RLS y datos reales: los revisa Isabella Infante ([`docs/HANDOFF-ISABELLA.md`](../../HANDOFF-ISABELLA.md)).
- Cualquier skill externa (incluida `awesome-ecommerce-skills`): no se instala la colección; si una tajada
  necesita una skill puntual, se vendea adaptada a la regla de §3.4 y con sus propias guardrails.
- Dominio, deploy y `.env` de producción.

---

## 9. Blockers y gates

| Blocker | Afecta | Estado |
|---|---|---|
| T0 sin terminar | T1 | **Cerrado**: T0/F0/T1/T2/T4 implementados y en verde. |
| OK de UX/UI sobre §6 | Implementar T1 | **Cerrado** (G1/G2/G3, 2026-10-25). |
| Migraciones del MVP sin aplicar en `otjph…` | Ver la tienda **con datos en producción** | **Abierto** (gate de despliegue, no de desarrollo). |
| `.env.local` sin `SUPABASE_SERVICE_ROLE_KEY` | Aplicar migraciones, checkout y panel | **Abierto** (Enzo). |
| `.env.local` sin `ADMIN_PASSWORD` ni `RESEND_API_KEY` | Entrar al panel y enviar el remito | **Abierto** (Enzo). |
| Fotos reales de producto | Calidad visual en producción | Depende del panel (T7). |
| Datos bancarios reales (alias/CBU) | Mostrar la transferencia en el checkout | **Abierto** (G4, Cooperadora). |

Nada de esto se maquilla: **no** se leen tablas legacy ni se siembran datos de muestra para aparentar
catálogo. En desarrollo se usa el seed (`supabase/seed.sql`); en producción la Home muestra el estado
vacío hasta que se apliquen las migraciones.

---

## 10. Decisiones cerradas (2026-10-25)

Los gates **G1** ([#4](https://github.com/juanmamerodio/esenciatecnica/issues/4)), **G2**
([#7](https://github.com/juanmamerodio/esenciatecnica/issues/7)) y **G3**
([#11](https://github.com/juanmamerodio/esenciatecnica/issues/11)) se resolvieron antes de implementar las
tajadas que bloqueaban. Quedan acá y en la spec de cada tajada:

1. **T3 · Detalle de producto (G2):** **página propia** en `/producto/[id]`. El modelo no tiene galería ni
   variantes, así que el detalle es chico: imagen (o placeholder), categoría, nombre, descripción, precio y
   `tiempo_produccion` como dato de producción. Un producto inactivo **no** es accesible por URL directa:
   el filtro de activos vive en `vista_catalogo`, no en el cliente. Detalle en
   [`specs/detalle-producto/spec.md`](../detalle-producto/spec.md).
2. **T6 · Página institucional (G3):** se llama **“Sobre el proyecto”** y vive en **`/about`**, como hoy.
   “Investigación” describe otro contenido y confunde con insumos de laboratorio, que no son el Producto.
   Detalle en [`specs/sobre-el-proyecto/spec.md`](../sobre-el-proyecto/spec.md).
3. **Copy institucional (G1, decisión 3):** contacto `proyectos@esenciatecnica.edu.ar`, institución
   E.E.S.T N°1 Luciano Reyes (Campana, Buenos Aires) y “Ciclo Lectivo 2026”. No se inventa texto nuevo:
   es el que ya está en el footer y en la Home.
4. **Título de la grilla del slice 1 (G1, decisión 4):** **“Nuestros productos”**, como quedó en T1.
5. **Franja de valores (G1, decisión 5):** se **muda** a la página institucional (T6). La Home no la repite:
   una sola fuente por concepto (`AGENTS.md` §7.4). La consecuencia en la Home es que su bloque de pago
   deja de repetir “Sin fines de lucro”, que pasa a la franja de valores.

### Gate nuevo

- **G4 · Datos de la transferencia:** alias, CBU y titular reales los confirma la Cooperadora. Hasta
  entonces el checkout **no** muestra datos bancarios inventados: publica lo que haya en
  `NEXT_PUBLIC_TRANSFERENCIA_*` y, si falta, lo dice.
