# Actualización Integral del Hub y Formalización de Diagramas Faltantes

> **Feature:** Actualización de diagramas académicos de cátedra y sincronización del Hub de QuimicaShop (`juanmamerodio.github.io/quimicashop/`).  
> **Estado:** Especificada (`ready-for-agent`).  
> **Fecha:** 2026-10-30.  
> **Origen:** Alineación mediante `/grill-me` para la entrega de cátedra (Nieva, Ariel, Cecilia) y actualización del Hub central.  
> **Fuente de verdad:** [`docs/MODELO.md`](../../MODELO.md) · [`GLOSSARY.md`](../../../GLOSSARY.md) · [`docs/metodo/brain.md`](../../metodo/brain.md) · [`docs/academico/DFD.md`](../../academico/DFD.md).  
> **Responsables:** Isabella Infante (Diagrama de Clases), Celeste Cáceres (DCU y QA Hub), Juan Manuel Merodio (Arquitectura y Hub).  
> **Criterio de cierre:** Diagramas de Clases, DCU y DER normalizados en formato Mermaid y Lucidchart; Hub actualizado con producción real, métricas de 479 tests y sin referencias legacy.

---

## 1. Problema

El Hub central del proyecto alojado en GitHub Pages (`juanmamerodio.github.io/quimicashop/`) se encuentra desfasado respecto al estado real del e-commerce desarrollado en `esenciatecnica`:

1. **Desactualización de enlaces y despliegue:** La tarjeta principal del prototipo funcional apunta al dominio obsoleto `quimicashop.vercel.app` en lugar de la URL oficial en producción `esenciatecnica.vercel.app`.
2. **Persistencia de vocabulario y conceptos legacy:** Las tarjetas de Casos de Uso (DCU) y Modelo de Datos (DER) continúan describiendo "validación por IA de comprobantes" (descartada en ADR 0002) y tablas del esquema legacy (`productos`, `pedidos`, `verificaciones`, `detalle_carrito`) en lugar de las entidades normalizadas del MVP.
3. **Falta de diagramas obligatorios de cátedra:** 
   - Falta el **Diagrama de Clases UML** exigido por la cátedra de Alejandro Nieva (tarea de Isabella en Teams).
   - El **Diagrama de Casos de Uso (DCU)** refleja actores y flujos de IA superados.
   - Los **Diagramas de Flujo de Datos (DFD)** en el Hub siguen apuntando a los borradores CSV antiguos sin reflejar la formalización de niveles 0 a 3 recién terminada en Mermaid (`docs/academico/DFD.md`).
4. **Timeline congelada:** La línea de tiempo histórica del Hub se detiene en Agosto/Septiembre 2026 y no refleja el Cierre de la Beta en Octubre 2026 (479 tests automatizados en Vitest, DDL `00`–`06`, demo sembrada y Basic Auth en `/admin`).

---

## 2. Solución

Se define una solución integral en dos vertientes:

1. **Formalización de Diagramas Faltantes en el Repositorio (`docs/academico/`):**
   - **Diagrama de Clases UML (Nieva):** Modelo completo con entidades de dominio (`Cliente`, `Producto`, `Stock`, `Pedido`, `DetallePedido`, `Comprobante`, `RemitoVenta`, `AlertaStock`) y servicios de aplicación (`ServicioPedido`, `ServicioAdmin`, `ServicioRemito`, `ServicioCron`), con atributos tipados, visibilidad y relaciones en Mermaid.
   - **Diagrama de Casos de Uso (DCU):** Actualización formal eliminando la IA y reflejando la validación manual por Administradores de Química en `/admin`, carrito en cliente y emisión de remito.
   - **Diagrama Entidad-Relación (DER):** Sincronización del DER visual con el modelo relacional formal de `docs/MODELO.md`.
2. **Actualización Integral del Hub (`quimicashop/index.html`):**
   - Sustitución de `quimicashop.vercel.app` por `esenciatecnica.vercel.app`.
   - Limpieza de textos legacy en las tarjetas (retiro de IA y tablas viejas).
   - Inclusión de las tarjetas del Diagrama de Clases UML y DFDs formalizados en Mermaid.
   - Actualización del Timeline con el hito de Cierre Beta de Octubre 2026 (479 tests, migración `otjph…`).

---

## 3. Historias

### HU-1 · Diagrama de Clases UML completo para cátedra Nieva

**Como** docente de cátedra (Nieva), **quiero** disponer del Diagrama de Clases UML del sistema con entidades y servicios de aplicación, **para** evaluar la arquitectura orientada a objetos y su congruencia con las transacciones de base de datos.

- **Given** el modelo de datos canónico y las funciones RPC del MVP, **When** se consulta el Diagrama de Clases, **Then** expone las 8 clases de entidad con sus tipos de datos, multiplicidades y los 4 servicios de negocio del sistema.

### HU-2 · Actualización del Diagrama de Casos de Uso sin validación IA

**Como** responsable de QA y documentación (Celeste), **quiero** que el Diagrama de Casos de Uso refleje la validación manual por administradores, **para** erradicar el flujo de IA retirado y documentar el proceso operativo real.

- **Given** la arquitectura de validación manual aprobada en ADR 0002, **When** se revisa el DCU, **Then** las relaciones de extensión e inclusión documentan el cotejo humano de imagen y monto en `/admin` y el despacho de remito HTML por correo.

### HU-3 · Actualización del enlace de producción en el Hub

**Como** visitante o evaluador del Hub institucional, **quiero** que el enlace del prototipo conduzca a la aplicación en vivo, **para** acceder a la tienda oficial desplegada en Vercel.

- **Given** la navegación en `juanmamerodio.github.io/quimicashop/`, **When** hago click en la tarjeta de la aplicación, **Then** navego directamente hacia `https://esenciatecnica.vercel.app`.

### HU-4 · Purgado de vocabulario legacy en tarjetas del Hub

**Como** auditor del proyecto, **quiero** que las descripciones de las tarjetas en el Hub utilicen el vocabulario canónico, **para** mantener la coherencia conceptual con la documentación oficial.

- **Given** las secciones de DER, DFD y DCU en el Hub, **When** se leen sus descripciones, **Then** no contienen nombres como `productos`, `pedidos`, `verificaciones` ni menciones a validación por IA.

### HU-5 · Registro del hito de Cierre Beta en la Timeline del Hub

**Como** equipo de desarrollo, **quiero** visibilizar los avances recientes en la línea de tiempo del Hub, **para** certificar el cumplimiento del sprint final ante la cátedra y la comunidad escolar.

- **Given** el timeline de hitos en `index.html`, **When** se consulta la sección de progreso, **Then** se detalla el hito de Cierre de Beta con 479 tests en Vitest, DDL `00`–`06` y demo sembrada en producción.

---

## 4. Decisiones de implementación

- **Formato híbrido:** Los diagramas se formalizan primero en formato Mermaid dentro del repositorio `esenciatecnica` (en `docs/academico/`) acompañados de pruebas automatizadas en Vitest, permitiendo renderizado nativo y versionado en Git. Luego se reflejan los enlaces y estructuras equivalentes en el Hub y Lucidchart.
- **Respeto a la frontera de repositorios:** El código del Hub (`index.html`, `style.css`) reside exclusivamente en el repositorio hermano `quimicashop`. La modificación en `quimicashop/index.html` se ejecuta quirúrgicamente sobre el archivo local sin importar dependencias ni alterar la separación de responsabilidades de `docs/estado/SEPARACION.md`.
- **Estructura del Diagrama de Clases UML:**
  - Clases de entidad: `Cliente`, `Producto`, `Stock`, `Pedido`, `DetallePedido`, `EstadoPedido`, `Comprobante`, `EstadoComprobante`, `RemitoVenta`, `AlertaStock`.
  - Clases de servicio de dominio: `ServicioPedido` (`crearPedido`, `consultarDisponibilidad`), `ServicioAdmin` (`aprobarComprobante`, `rechazarComprobante`), `ServicioCron` (`cancelarPedidosVencidos`), `ServicioRemito` (`enviarRemitoEmail`).
- **Actualización de `index.html` en el Hub:**
  - Modificación de la tarjeta `proto-v2` apuntando a `https://esenciatecnica.vercel.app`.
  - Reemplazo de badges y descripciones de DFD para referenciar los 4 niveles (0 a 3) en Mermaid.
  - Actualización de la tarjeta DER referenciando el modelo relacional normalizado.
  - Actualización de la tarjeta DCU sustituyendo la validación automática por cotejo manual en `/admin`.
  - Inserción de la tarjeta del Diagrama de Clases UML (Nieva) con insignia correspondiente.
  - Agregado del bloque de hito de Octubre 2026 en el componente de timeline.

---

## 5. Decisiones de testing

- **Pruebas estructurales y de contenido en Vitest:** Se crearán pruebas automatizadas en `tests/front/` que verifiquen:
  - Existencia y validez de sintaxis Mermaid del Diagrama de Clases UML y DCU actualizado en `docs/academico/`.
  - Correspondencia exacta de clases y atributos respecto a las columnas y tipos de `docs/MODELO.md`.
  - Ausencia absoluta de términos legacy (`log_ia`, `verificaciones`, `detalle_carrito`) en los diagramas.
- **Verificación de links y assets:** Comprobación con `npm run docs:links` para garantizar 0 enlaces rotos entre la documentación del repositorio y los artefactos académicos.
- **Prior art:**
  - `tests/front/dfd-academico.test.ts` (verificación de los cuatro niveles de DFD).
  - `tests/front/plantilla-de-spec.test.ts` (control de calidad estructural de especificaciones).

---

## 6. Fuera de alcance

- Fusión de los repositorios `esenciatecnica` y `quimicashop` (se mantiene la arquitectura desacoplada).
- Modificaciones al tablero scrum `tasks.html` o la lógica `tasks.js` de Teams (ya sincronizados con `npm run teams`).
- Funcionalidades de Fase 2 (cuentas de cliente, pagos automáticos con Mercado Pago, envíos a domicilio).

---

## 7. Notas finales

- **Mapeo con tareas de Teams:**
  - `83687821-ca8b-4d72-91bc-2159c5accc1f` · Isabella · Diagrama de clases.
  - `4a5714b1-48c8-4de6-8649-85189aea43f0` · Celeste · Correcciones de documentación de cátedra.
  - `67c37ce6-ce75-4ad4-926c-efc98b9e9420` · Enzo · Migrar diagramas a mermaid.
- **Acceso en vivo:** El Hub actualizado quedará accesible públicamente en `https://juanmamerodio.github.io/quimicashop/` tras el push en dicho repositorio.
