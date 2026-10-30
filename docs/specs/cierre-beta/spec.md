# Spec Maestro de Cierre Beta: Robustez Técnica, Desbloqueo Operativo y Entregables Académicos

> **Feature:** Cierre integral de la Beta (MVP) de Esencia Técnica y alineación de entregables.  
> **Estado:** Especificada (`ready-for-agent`).  
> **Fecha:** 2026-10-29.  
> **Issue:** [#53](https://github.com/juanmamerodio/esenciatecnica/issues/53) (vinculado a #1, #15, #16, #18, #20, #22, #23).  
> **Origen:** Unificación de las 19 tareas pendientes del tablero de Teams (`uchy…`) acordada tras entrevista de diseño (`/grill-me`).  
> **Fuente de verdad:** [`AGENTS.md`](../../../AGENTS.md) · [`docs/MODELO.md`](../../MODELO.md) · [`GLOSSARY.md`](../../../GLOSSARY.md) · [`memory.md`](../../../memory.md).  
> **Responsables:** Juan Manuel Merodio (Arquitectura/Front), Enzo Queipo (Backend/Infra), Isabella Infante (BD/DDL), Celeste Cáceres (QA/Docs).  
> **Criterio de cierre:** Puerta CI en verde (typecheck, lint, Vitest, docs:links, build), deuda técnica resuelta, matriz de validación en vivo completada y entregables de cátedra listos para la Expo.

---

## 1. Problema

El desarrollo del MVP de Esencia Técnica se encuentra operativo en producción (`esenciatecnica.vercel.app`) y respaldado por la base viva `otjph…` con demo sembrada y 453 tests automatizados en verde. Sin embargo, la entrega formal de la beta y la defensa académica ante la cátedra permanecen abiertas debido a la fragmentación de 19 tareas pendientes en Teams distribuidas en tres frentes críticos:

1. **Deuda técnica y robustez de backend en `esenciatecnica`:**
   - El endpoint del cron de pedidos vencidos lanza excepciones genéricas (`new Error`) en lugar de `FaltaConfiguracion`, provocando respuestas HTTP 500 erróneas ("El cron volverá a intentarlo el próximo viernes") cuando la falla real es la ausencia de credenciales de servicio en el entorno.
   - La herramienta de auditoría de superficie viva (`bd:viva`) tolera respuestas HTTP 404 en tablas de Fase 2 (`admin` y `roll`), permitiendo que el semáforo cierre en verde a pesar de que el modelo y la HU-7 exigen que las diez tablas protegidas respondan estrictamente 401 o 403 ante clientes anónimos.
   - Existe duplicación de código en la verificación e inicialización segura de clientes de Supabase con service role en handlers de servidor (`admin-servidor`, `checkout-servidor`, `cron-servidor`), violando los principios de módulos profundos y consistencia de AGENTS §7.4.
   - Existen utilidades huérfanas sin consumidores de producción (`estadoHttp`) y lógica solapada en la descripción de errores.

2. **Trabas operativas y de infraestructura en vivo:**
   - Tres módulos centrales (`Automatización de comprobantes/remito`, `Secretos y entorno`, y `Cron de los viernes`) tienen su código y tests en `main`, pero permanecen retenidos en estado `review` porque requieren validación en el entorno vivo.
   - Persiste el bloqueo urgente de adquisición y verificación del dominio institucional en Resend (SPF/DKIM), sin el cual el servicio permanece en sandbox y no permite validar el envío real del Remito de venta al Cliente.
   - Faltan cargar en Vercel los secretos `CRON_SECRET` y los datos bancarios oficiales de la Cooperadora (`NEXT_PUBLIC_TRANSFERENCIA_*`).
   - El catálogo y la portada continúan utilizando fotografías de demostración temporales en lugar de las fotografías definitivas del taller de Química.

3. **Dispersión en el protocolo de QA y entregables de cátedra:**
   - La verificación de calidad se encuentra disgregada en tareas solapadas (`B6`, `Testeo`, `Plan de pruebas`), sin una matriz formal unificada que trace desde la navegación hasta la bitácora de hallazgos.
   - Los requerimientos de cátedra (Diagrama de clases para Nieva, DFD v1–v3 para Ariel, Canvas de negocio, presentación Canva y póster con logos para Cecilia) carecen de sincronización explícita con el modelo de datos formal de `docs/MODELO.md`.

---

## 2. Solución

Se establece una especificación unificada de cierre estructurada en tres pilares sinérgicos:

1. **Núcleo Técnico (`esenciatecnica`):**
   - Implementar un módulo compartido para la obtención controlada de clientes con clave de servicio (`obtenerClienteServicio`), garantizando instanciación en tiempo de ejecución (AGENTS §7.13) y lanzando la excepción canónica `FaltaConfiguracion`.
   - Normalizar el handler del cron para que responda HTTP 503 ante `FaltaConfiguracion` y 401 ante token inválido, reservando 500 exclusivamente para fallos transitorios de base de datos.
   - Endurecer `bd:viva` eliminando la tolerancia a 404 en tablas de Fase 2, exigiendo que toda tabla cerrada responda indefectiblemente 401 o 403.
   - Depurar el código muerto (`estadoHttp`) y unificar la conmutación de errores.

2. **Matriz Operativa y Gate de Verificación en Vivo:**
   - Definir con precisión las condiciones de activación y los responsables para pasar las 3 tareas de `review` a `done`: provisión de dominio y claves Resend, inyección de variables en Vercel, y sustitución de fotos de productos y hero desde `/admin`.

3. **Protocolo Integral de QA y Entregables Académicos:**
   - Consolidar en un único marco metodológico la matriz de casos de prueba de punta a punta (Plan de pruebas), la ejecución en navegador desktop/mobile (B6) y la bitácora de hallazgos UI/UX (Testeo).
   - Detallar la lista de verificación para el cierre del paquete académico (Diagrama de clases, DFDs corregidos, Canvas, diapositivas Canva y póster con logos institucionales).

---

## 3. Historias y criterios de aceptación

### HU-1 · Respuesta 503 ante falta de configuración en el cron

**Como** operador de infraestructura, **quiero** que el endpoint del cron (`POST /api/cron/vencidos`) devuelva HTTP 503 cuando falten credenciales de servicio, **para** distinguir un error de configuración de un fallo transitorio de base de datos.

- **Given** una invocación autorizada con `CRON_SECRET` pero sin `SUPABASE_SERVICE_ROLE_KEY` en el entorno, **When** se llama a `POST /api/cron/vencidos`, **Then** responde HTTP 503 con código semántico `sin-configuracion`.

### HU-2 · Helper compartido de cliente con clave de servicio

**Como** desarrollador del backend, **quiero** disponer de una función compartida para inicializar el cliente con clave de servicio en tiempo de ejecución, **para** evitar la duplicación de guardias y cumplir con AGENTS §7.13.

- **Given** un endpoint de servidor que requiere privilegios elevados, **When** invoca a `obtenerClienteServicio()`, **Then** valida las variables en el momento y lanza `FaltaConfiguracion` si alguna falta.

### HU-3 · Auditoría estricta de tablas cerradas en bd:viva

**Como** auditor de seguridad, **quiero** que `bd:viva` falle si alguna de las diez tablas cerradas responde 404 en lugar de 401 o 403, **para** garantizar que no existan desvíos en la superficie pública protegida.

- **Given** una ejecución de `npm run bd:viva`, **When** una tabla protegida (incluyendo `admin` y `roll`) devuelve 404 ante clientes anónimos, **Then** el evaluador registra estado de falla `ERROR` y el proceso termina con código de salida 1.

### HU-4 · Depuración de utilidades huérfanas y descripción de errores

**Como** mantenedor del repositorio, **quiero** eliminar funciones sin consumidores de producción y consolidar la descripción de errores, **para** preservar la higiene y claridad de la base de código.

- **Given** la suite de pruebas y el build de producción, **When** se eliminan utilidades muertas como `estadoHttp()`, **Then** `npm run build` y `npm test` compilan y pasan en 100% verde sin referencias rotas.

### HU-5 · Firma formal de respaldo legacy en base de datos

**Como** administradora de base de datos, **quiero** ejecutar el script de verificación de `respaldo_legacy` en el SQL Editor y volcar los conteos en el issue #16, **para** certificar y cerrar formalmente la migración histórica de datos.

- **Given** la base de datos viva `otjph…`, **When** se ejecuta el conteo sobre `respaldo_legacy.conteos`, **Then** los totales se documentan en el issue #16 y permiten el cierre definitivo del ticket.

### HU-6 · Visualización de datos bancarios oficiales de la Cooperadora

**Como** Cliente, **quiero** ver el CBU, alias, banco y titular reales de la Cooperadora en el checkout, **para** realizar la transferencia a la cuenta bancaria correcta de la escuela.

- **Given** las variables `NEXT_PUBLIC_TRANSFERENCIA_*` cargadas en el entorno, **When** accedo a la pantalla de pago en el checkout, **Then** visualizo los datos bancarios exactos sin leyendas de aviso de datos pendientes.

### HU-7 · Emisión y recepción del Remito de venta oficial

**Como** Cliente, **quiero** recibir el correo electrónico con el Remito de venta al validarse mi pago, **para** tener constancia formal y presentarla al momento de retirar mi pedido en el taller.

- **Given** un pedido aprobado manualmente desde `/admin`, **When** la transacción de base de datos se completa con éxito, **Then** se despacha un correo por Resend con el remito adjunto y remitente verificado institucional.

### HU-8 · Fotografías auténticas del taller en catálogo y portada

**Como** Administrador de Química, **quiero** que los productos y la portada exhiban las imágenes reales del laboratorio, **para** brindar una experiencia visual fiel a las elaboraciones de los alumnos.

- **Given** las fotografías del taller obtenidas, **When** se actualizan desde `/admin` en el bucket público y se reemplaza la portada del hero, **Then** la tienda refleja los productos reales sin imágenes temporales de stock.

### HU-9 · Ejecución periódica y segura del cron de vencidos

**Como** administrador del sistema, **quiero** que el cron semanal cancele automáticamente pedidos vencidos los viernes, **para** reponer el stock disponible de productos que no completaron el pago.

- **Given** un pedido en estado `Pendiente de Pago` con más de 7 días o sin comprobante al cierre del viernes, **When** Vercel Cron invoca la ruta con `CRON_SECRET`, **Then** el pedido pasa a `Cancelado` y se libera su `cantidad_reservada`.

### HU-10 · Validación y promoción de tareas retenidas en review

**Como** equipo de desarrollo, **quiero** cumplir la matriz de verificación en producción con dominio y variables cargadas, **para** promover formalmente las tres tareas en review a estado `done`.

- **Given** las variables y el dominio configurados en Vercel, **When** se comprueba en vivo la autenticación, el remito y el cron, **Then** las tareas de Teams se marcan como `done` con su evidencia correspondiente.

### HU-11 · Matriz de casos de prueba de punta a punta

**Como** responsable de QA, **quiero** disponer de un plan de pruebas documentado por etapas desde el catálogo hasta el remito, **para** asegurar que todos los flujos del e-commerce estén cubiertos.

- **Given** el plan de pruebas documentado en `docs/`, **When** se inicia la ronda de control de calidad, **Then** cada caso de uso cuenta con su precondición, paso a paso y resultado esperado verificable.

### HU-12 · Verificación integral en navegadores de escritorio y móvil

**Como** responsable de QA, **quiero** recorrer el flujo de compra y administración en múltiples dispositivos reales, **para** certificar la compatibilidad y ergonomía de la interfaz.

- **Given** la versión desplegada en producción, **When** se ejecuta la prueba B6 en resoluciones desktop y mobile, **Then** se constata que no existan errores de consola, desbordes visuales ni bloqueos de interacción.

### HU-13 · Registro sistemático de incidencias en bitácora de testing

**Como** responsable de QA, **quiero** asentar cada hallazgo visual o funcional en una bitácora centralizada, **para** priorizar y validar su corrección antes de la presentación final.

- **Given** una sesión de pruebas en vivo, **When** se detecta una inconsistencia en la interfaz o validación, **Then** se registra en la bitácora de la tarea con pasos de reproducción y captura asociada.

### HU-14 · Diagrama de Clases alineado al modelo relacional

**Como** docente de cátedra (Nieva), **quiero** evaluar el Diagrama de Clases del sistema desarrollado en Lucidchart, **para** corroborar la coherencia de la arquitectura orientada a objetos con las entidades de la base de datos.

- **Given** el modelo de datos formal de `docs/MODELO.md`, **When** se consulta el diagrama de clases en Lucidchart, **Then** las clases, atributos, visibilidad y relaciones reflejan fielmente el dominio de la aplicación.

### HU-15 · Ajuste de Diagramas de Flujo de Datos con observaciones

**Como** docente de cátedra (Ariel), **quiero** que los DFD de niveles 1 a 3 incorporen las correcciones solicitadas, **para** verificar que los procesos de negocio y almacenamiento de datos sean técnicamente precisos.

- **Given** las devoluciones docentes sobre los DFDs previos, **When** se revisan las versiones finales, **Then** los almacenes de datos y procesos coinciden exactamente con las transacciones del sistema.

### HU-16 · Material visual y presentación para la EXPO TEC1

**Como** expositor en la EXPO TEC1, **quiero** contar con diapositivas en Canva y póster impreso con la identidad visual y logos requeridos, **para** representar a la institución con profesionalismo ante la comunidad.

- **Given** los requerimientos de exhibición fijados por la cátedra, **When** se confecciona el material, **Then** incluye los tres logos obligatorios, paleta institucional y descripción sintética del proyecto.

### HU-17 · Manual de uso y guía de arquitectura para continuidad

**Como** futuro desarrollador o alumno de ciclos posteriores, **quiero** consultar la documentación de uso y desarrollo de la plataforma, **para** facilitar el mantenimiento y la implementación de fases futuras.

- **Given** la entrega del proyecto completada, **When** se consulta la documentación en `docs/`, **Then** se dispone de guías claras para la operación de la tienda, administración y configuración del entorno técnico.

---

## 4. Decisiones de implementación

### 4.1. Módulo Compartido de Clientes de Servicio y Manejo de Errores
- **Instanciación en tiempo de ejecución:** Todo acceso a `SUPABASE_SERVICE_ROLE_KEY` y `NEXT_PUBLIC_SUPABASE_URL` se realizará dentro del cuerpo de la función invocada mediante un helper de infraestructura (`obtenerClienteServicio`), garantizando que `npm run build` compile sin secretos en CI (cumpliendo AGENTS §7.13).
- **Semántica de errores HTTP:**
  - Si falta la configuración del entorno, se lanza la excepción tipada `FaltaConfiguracion`, que el handler de la API traduce directamente a HTTP 503 (`Service Unavailable`).
  - Si la petición carece del `Bearer` token de autorización o este no coincide con `CRON_SECRET`, se devuelve HTTP 401 (`Unauthorized`).
  - Los fallos de red o base de datos se traducen a HTTP 500 con mensajes neutrales para el cliente.
- **Limpieza de deuda:** Se elimina `estadoHttp()` de la biblioteca de errores al no tener consumidores de producción, y se simplifican los conmutadores de descripción de errores.

### 4.2. Endurecimiento de `bd:viva`
- **Revisión de reglas:** Se modifica el evaluador de superficie para que la lista de tablas cerradas (incluyendo `admin` y `roll`) exija código de estado 401 o 403. La presencia de un 404 pasa a ser clasificada como violación de seguridad (`ERROR`) y provoca la salida con código de error en `npm run bd:viva`.

### 4.3. Matriz de Promoción de Tareas en `review`
| Tarea en Teams | Prerrequisito en Vivo | Acción de Verificación |
|---|---|---|
| **Secretos y entorno** (`40ede00d`) | Carga de `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_PASSWORD` en Vercel | Autenticación en `/admin` y recepción de correo de prueba en casilla real |
| **Cron de los viernes** (`cf2285f5`) | Inyección de `CRON_SECRET` en Vercel | Disparo manual de `POST /api/cron/vencidos` y confirmación de cancelación en base viva |
| **Automatización de remito** (`d028b233`) | Dominio verificado en Resend (SPF/DKIM) | Aprobación de un pedido en `/admin` y recepción del remito con remitente oficial |

### 4.4. Protocolo de QA Integrado
- **Estructura del Plan:** Matriz de 8 etapas secuenciales:
  1. Catálogo (filtros, stock, foto de producto y hero).
  2. Carrito (persistencia, edición de cantidades, límites de stock).
  3. Checkout (datos de cliente, validación de datos bancarios de Cooperadora).
  4. Comprobante (subida a bucket privado, validación de monto positivo coincidente).
  5. Aprobación y Rechazo Manual (`/admin`, actualización de stock e historial en transacción).
  6. Emisión de Remito (disparo no bloqueante por Resend).
  7. Cancelación automática (cron de pedidos vencidos).
  8. Alerta de stock bajo (popup en `/admin`).
- **Bitácora:** Los hallazgos se consolidan en la bitácora de la tarea `B6` y se abren tickets quirúrgicos ante defectos bloqueantes.

### 4.5. Paquete de Entregables Académicos
- **Diagrama de Clases:** Elaborado en Lucidchart por Isabella reflejando las entidades canónicas de `docs/MODELO.md`.
- **DFDs 1 a 3:** Ajustados por Celeste incorporando devoluciones de cátedra y archivados en `docs/academico/`.
- **Material de Expo:** Diapositivas Canva con diseño visual institucional y póster impreso con los 3 logos requeridos.
- **Manuales:** Documento técnico y de usuario consolidado en `docs/`.

---

## 5. Decisiones de testing

### 5.1. Seams de Prueba
- **Frontera HTTP (Mayor Seam Posible):**
  - Pruebas sobre el route handler del cron invocando `POST /api/cron/vencidos` en diferentes estados de configuración del entorno (simulación de variables ausentes para constatar respuesta 503).
  - Verificación de rechazo 401 ante token incorrecto.
- **Seam de Reglas de Superficie:**
  - Pruebas unitarias sobre `evaluarSuperficie()` en la suite de `bd:viva`, garantizando que respuestas simuladas con código 404 en tablas de Fase 2 reporten estado de falla no recuperable.
- **Persistencia y Transacciones (PGlite):**
  - Pruebas de integración en base local en memoria (PGlite) para verificar que la cancelación por cron libere `cantidad_reservada` y registre el historial sin requerir conexión a internet.

### 5.2. Lo que no se testea
- No se mockean clientes internos ni llamadas HTTP profundas: se evalúa la respuesta completa de la ruta y la suite de reglas puras.
- No se comprueban textos literales o párrafos de prosa propensos a variaciones de redacción.

### 5.3. Prior Art
- `tests/front/cron.test.ts` (lógica del cron de vencidos).
- `tests/front/bd-viva-reglas.test.ts` (evaluador de superficie pública).
- `tests/front/admin.test.ts` y `tests/front/checkout.test.ts` (contratos de API y manejo de errores).

---

## 6. Fuera de alcance

- Modificación de la interfaz gráfica y estilos del carrito y checkout (ya auditados y validados en el lote HU-1 a HU-7).
- Funcionalidades de Fase 2: pasarelas de pago automatizadas, login de clientes, cálculo automatizado de envíos físicos, o tablas `team_*` de QuimicaShop.
- Incorporación de bibliotecas pesadas de testing E2E (e.g. Playwright / Cypress en CI): la verificación E2E se realiza mediante el protocolo manual B6 por el equipo humano.
- Subida de credenciales o secretos en texto plano al repositorio.

---

## 7. Notas finales

### Mapeo de las 19 Tareas del Tablero de Teams
1. `83687821-ca8b-4d72-91bc-2159c5accc1f` · Isabella · ALTA · DOCS · Diagrama de clases
2. `d028b233-04b5-43c6-849d-598365ce0af9` · Enzo · MEDIA · BACKEND · Automatización de comprobantes/rémito
3. `4a5714b1-48c8-4de6-8649-85189aea43f0` · Celeste · ALTA · DOCS · Correcciones de documentación de cátedra (checklist)
4. `b81c3468-e66a-4506-913f-6db72ec15825` · Celeste · MEDIA · DOCS · Presentacion Final EXPO TEC1
5. `40ede00d-415c-4e40-ac5b-1e5f860b8c37` · Enzo · ALTA · BACKEND · Secretos y entorno: service role, ADMIN_PASSWORD y Resend
6. `f895ba12-f7d2-4f33-84e5-4c401031fe44` · Celeste · ALTA · DOCS · Cerrar DFD con las observaciones de Ariel
7. `cf2285f5-1c52-45ce-b6f9-b8c3df0e450b` · Enzo · MEDIA · BACKEND · Cron de los viernes: cancelar pedidos sin comprobante aprobado
8. `5823a2db-bedb-43a0-9bf0-9b8c3c80070d` · Celeste · MEDIA · DOCS · Plan de pruebas del flujo compra → remito
9. `29509bd2-1dbd-481d-963a-d44ae0aab39b` · Celeste · ALTA · FRONTEND · B6 · Verificación de punta a punta en navegador
10. `52e566f4-aaa8-4a56-9515-a43948e9b0a2` · Juanma · ALTA · DATABASE · Firmar respaldo_legacy en el SQL Editor (B1 #16)
11. `4732a8e0-ed99-4550-aa1e-a09f809f0aa0` · Enzo · ALTA · BACKEND · El cron no distingue configuración faltante de fallo transitorio
12. `b97cd036-b9b0-45cc-a750-03ad1c4b7388` · Juanma · MEDIA · DATABASE · bd:viva tolera que admin y roll no existan (HU-7)
13. `5324ac47-00e9-485b-a8f5-b1708a509b33` · Juanma · BAJA · BACKEND · Deuda de estándares del cierre beta (revisión del 28-10)
14. `16878016-db1d-4c97-b43c-e64bf6619825` · Celeste · ALTA · FRONTEND · Testeo
15. `da6b26f3-566d-48c1-94da-f606fa989190` · Celeste · ALTA · DOCS · Documentacion de uso y desarollo
16. `3503c1ff-a9d9-43c1-9471-bf82db990217` · Enzo · ALTA · BACKEND · Comprar el dominio y conectar Resend (bloquea el test del remito)
17. `bede4513-4b39-42f5-91eb-211bb8ef7174` · Celeste · ALTA · FRONTEND · Reemplazar las fotos de demo por las del taller
18. `a1f81278-e59d-41bb-bf83-7bb32b2ec76b` · Enzo · MEDIA · BACKEND · Cargar CRON_SECRET en Vercel y probar el cron de vencidos
19. `8943632c-99d2-4a9c-bae7-8e93c6ec1b27` · Enzo · ALTA · BACKEND · Cargar datos bancarios de la Cooperadora (NEXT_PUBLIC_TRANSFERENCIA_*)

### Orden de Ejecución Recomendado
1. **Paso 1 (Código y Tests):** Implementar el helper común de clientes de servidor, resolver el error 503 del cron y fijar la regla estricta de 401/403 en `bd:viva`, garantizando que la suite local continúe en 100% verde.
2. **Paso 2 (Infraestructura y Secretos):** Cargar `NEXT_PUBLIC_TRANSFERENCIA_*` y `CRON_SECRET` en Vercel; avanzar con la adquisición/verificación de dominio en Resend.
3. **Paso 3 (Contenido y QA):** Subir fotos definitivas desde `/admin`, actualizar la imagen del hero, y ejecutar la verificación B6 con registro en la bitácora de pruebas.
4. **Paso 4 (Cátedra y Cierre):** Completar los diagramas de clases, DFDs corregidos, Canva y documentación técnica en `docs/`.
