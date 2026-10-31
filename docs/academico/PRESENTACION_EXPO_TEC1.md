# Guión de Presentación y Defensa · EXPO TEC1 2026

> **Proyecto:** Esencia Técnica — E-Commerce de Cosmética y Higiene Escolar.  
> **Institución:** E.E.S.T N°1 "Luciano Reyes" (Campana) · 7mo Año Programación 2026.  
> **Equipo Expositor:** Juan Manuel Merodio (Arquitectura/Front), Isabella Infante (Base de Datos/DDL), Enzo Queipo (Backend/Infraestructura), Celeste Cáceres (QA/Diseño).  
> **Cátedra Evaluadora:** Ariel Leibouski, Cecilia Maldonado, Alejandro Nieva.  
> **Entrega / Tarea Teams:** `b81c3468` · HU-26 del Spec Maestro ([`docs/specs/cierre-beta/plan-ejecucion.md`](../specs/cierre-beta/plan-ejecucion.md)).  
> **Fuentes de verdad:** [`docs/MODELO.md`](../MODELO.md) · [`GLOSSARY.md`](../../GLOSSARY.md) · [`docs/academico/DFD.md`](DFD.md) · [`docs/academico/DER.md`](DER.md) · [`docs/academico/CLASES.md`](CLASES.md) · [`docs/academico/DCU.md`](DCU.md).

---

## 1. Estructura General y Tiempos de la Exposición

- **Tiempo Total Estimado:** 15 a 20 minutos (12 min de exposición estructurada + 5 min de demo en vivo + 3 min de preguntas del jurado docente).
- **Soporte Visual:** 
  - Diapositivas proyectadas (basadas en este guión y en la [Presentación Gamma](https://gamma.app/docs/-rvc9k5s41kxgrr3?mode=doc)).
  - [Visor Académico de Diagramas Mermaid](https://juanmamerodio.github.io/quimicashop/#diagramas) proyectado en Pantalla Completa.
  - Aplicación en Producción en Vivo: [`esenciatecnica.vercel.app`](https://esenciatecnica.vercel.app).
  - Panel de Administración en Vivo: [`esenciatecnica.vercel.app/admin`](https://esenciatecnica.vercel.app/admin).

---

## 2. Guión Bloque por Bloque

### Bloque 1: Apertura e Introducción Institucional (2 min · Juanma)

**Diapositiva 1-2:** Portada institucional, logos de E.E.S.T N°1, integrantes y título del proyecto.

> **Voz de Juanma:**  
> "Buenas tardes profesores, directivos y compañeros. Somos estudiantes de 7mo año de la tecnicatura en Programación de la Escuela Técnica N°1 Luciano Reyes.  
> Hoy presentamos **Esencia Técnica**, una solución integral de e-commerce y gestión desarrollada para digitalizar y automatizar la venta de productos cosméticos y de higiene elaborados por los estudiantes del taller de Química de nuestra institución.  
> El proyecto articula transversalmente las materias de Proyecto de Diseño e Implementación de Sistemas con los profesores Leibouski, Maldonado y Nieva, resolviendo una necesidad operativa concreta de nuestra propia escuela."

---

### Bloque 2: Problemática Real y Diagnóstico (2 min · Celeste)

**Diapositiva 3:** El antes vs. el después. Desafíos del departamento de Química.

> **Voz de Celeste:**  
> "Antes de Esencia Técnica, el departamento de Química comercializaba sus cremas, jabones y aromatizantes en ferias o por boca a boca anotando pedidos en planillas de cálculo o cuadernos.  
> Esto generaba cuatro problemas críticos:
> 1. **Sobrevenda y quiebres de stock:** Se tomaban compras sin saber la existencia real en taller.
> 2. **Comprobantes dispersos:** Los pagos por transferencia quedaban perdidos en capturas de WhatsApp sin validación correlativa.
> 3. **Ausencia de comprobantes formales:** El comprador no recibía un remito oficial con detalle y número único.
> 4. **Retención indefinida:** Unidades apartadas que nunca se pagaban quedaban inmovilizadas semanas.
> Nuestra meta fue diseñar un sistema seguro, accesible y formal que garantice la trazabilidad de cada centavo y cada unidad producida."

---

### Bloque 3: Modelo de Dominio y Reglas Innegociables (2 min · Isabella)

**Diapositiva 4:** Modelo canónico y reglas de negocio.

> **Voz de Isabella:**  
> "Para garantizar una base sólida, delimitamos las reglas del MVP en [`docs/MODELO.md`](../MODELO.md):
> 1. **Productos:** Cosmética y cosmecéutica activa (`precio > 0`). Las bajas son lógicas (`activo = false`) para conservar el historial histórico de ventas.
> 2. **Carrito en cliente:** Para no sobrecargar la base con carritos abandonados ni reservar unidades prematuramente, el carrito reside en el navegador (`localStorage`).
> 3. **Reserva atómica:** El stock solo se reserva (`cantidad_reservada += cantidad`) al confirmar el pedido con datos del comprador.
> 4. **Validación manual sin IA:** Conforme a nuestro análisis y al ADR 0002, la verificación de comprobantes es realizada a mano por los administradores de Química mediante Basic Auth en `/admin`, sin delegar decisiones en modelos predictivos opacos.
> 5. **Hito final del MVP:** La aprobación del comprobante descuenta `cantidad_actual`, libera la reserva y emite el **Remito de venta oficial** numerado (`R-YYYY-NNNNNN`), despachado automáticamente por email."

---

### Bloque 4: Arquitectura del Sistema y Diagramas Académicos (3 min · Enzo / Isabella)

**Diapositiva 5-6:** Visor de Diagramas Mermaid y Modelos Formales.

> **Voz de Enzo:**  
> "La arquitectura del sistema está formalizada en código vivo e interactivo mediante Mermaid v10 en nuestro Hub y en la carpeta [`docs/academico/`](CLASES.md):
> - **DFD Nivel 0:** Diagrama de contexto riguroso que no contiene almacenes internos y delimita las entidades Cliente, Administrador y el Cron Semanal frente al proceso central.
> - **DFD Nivel 1:** Descompone el sistema en 6 procesos principales y 7 almacenes canónicos normalizados: D1 `CLIENTE`, D2 `PRODUCTO`, D3 `STOCK`, D4 `PEDIDO`, D5 `COMPROBANTE`, D6 `REMITO_VENTA` y D7 `ALERTA_STOCK`.
> - **DFD Niveles 2 y 3:** Detallan las transacciones atómicas `crear_pedido` y `aprobar_comprobante` garantizando concurrencia segura."
>
> **Voz de Isabella:**  
> "- **DER Normalizado en 3ra Forma Normal:** 10 tablas en PostgreSQL sobre Supabase, con tipos monetarios exactos `NUMERIC(12,2)`, claves foráneas con integridad referencial e historial inmutable en `estados_pedidos` y `estados_comprobante`.
> - **Diagrama de Clases UML (Cátedra Nieva):** Modela las 10 entidades canónicas con métodos encapsulados y los 6 servicios de dominio (`ServicioCheckout`, `ServicioCatalogo`, `ServicioAdmin`, `ServicioRemito`, `ServicioCron`, `ServicioStorage`).
> - **Diagrama de Casos de Uso:** Relaciones `<<include>>` y `<<extend>>` explicitando la validación manual sin IA y el carrito en cliente."

---

### Bloque 5: Demostración en Vivo: Experiencia del Comprador (3 min · Juanma)

**En pantalla:** Navegación en [`esenciatecnica.vercel.app`](https://esenciatecnica.vercel.app).

> **Voz de Juanma:**  
> "Veamos el sistema en funcionamiento real en producción sobre Vercel:
> 1. **Catálogo dinámico:** El cliente explora los productos con fotos reales del taller, filtrado instantáneo por categoría y disponibilidad en vivo (`cantidad_actual - cantidad_reservada`). Si un producto no tiene stock, se muestra la etiqueta 'Sin Stock' y se inhabilita el botón de compra.
> 2. **Carrito y Checkout:** Agregamos crema corporal y jabón líquido. El carrito valida topes de disponibilidad en memoria del navegador.
> 3. **Confirmación de Pedido:** Ingresamos datos de contacto (email y DNI). Al confirmar, la base ejecuta `crear_pedido`: se valida stock en el servidor, se inserta la orden `Pendiente de Pago` y se incrementa `cantidad_reservada` en una sola transacción atómica.
> 4. **Carga de Comprobante:** El comprador visualiza el CBU/alias de la Cooperadora de la escuela, sube la foto de su transferencia bancaria y declara el monto abonado. El comprobante se almacena de forma privada y encriptada en Supabase Storage."

---

### Bloque 6: Demostración en Vivo: Panel de Validación `/admin` (3 min · Enzo)

**En pantalla:** Ingreso a [`esenciatecnica.vercel.app/admin`](https://esenciatecnica.vercel.app/admin).

> **Voz de Enzo:**  
> "Ahora ingresamos al panel `/admin`:
> 1. **Seguridad y Acceso:** Protegido mediante Basic Auth en Middleware de Next.js (ADR 0005). Los navegadores prefetchean enlaces sin disparar falsos diálogos 401.
> 2. **Bandeja de Cotejo:** El administrador examina el listado de pedidos pendientes, abre la imagen del comprobante (generada con URL firmada temporal de 1 hora) y verifica que el monto coincida con el total exigido.
> 3. **Aprobación Atómica:** Al hacer clic en 'Aprobar Pago', la transacción en base de datos ejecuta:
>    - Estado del pedido pasa a `Pago Validado`.
>    - Estado del comprobante pasa a `Aprobado por Admin`.
>    - El stock físico (`cantidad_actual`) se descuenta y se libera la reserva (`cantidad_reservada`).
>    - Se emite el remito correlativo oficial `R-2026-00000X`.
>    - Resend compone y envía el remito HTML con formato fiscal al correo electrónico del comprador.
> 4. **Alertas de Stock:** Si el stock disponible cae por debajo de `cantidad_warning`, el panel despliega un popup visual de aviso inmediato para reponer insumos en el taller."

---

### Bloque 7: Automatización y Tareas Programadas (2 min · Celeste)

**Diapositiva 7:** Cron de los viernes 23:59 ART y liberación de stock.

> **Voz de Celeste:**  
> "Uno de los mayores aportes del diseño metodológico con el profesor Ariel Leibouski fue resolver el vencimiento de pedidos impagos:
> - En lugar de temporizadores arbitrarios diarios que complicaban la operación del taller, definimos un cron semanal que corre los **viernes a las 23:59 ART** (`cancelar_pedidos_vencidos`).
> - Este endpoint protegido con `CRON_SECRET` busca pedidos en estado `Pendiente de Pago`, los actualiza a `Cancelado`, marca los comprobantes pendientes como `Rechazado` y **devuelve las unidades reservadas al stock disponible**, dejando el catálogo limpio para las compras del fin de semana.
> - La transacción es estrictamente idempotente: correr el cron varias veces jamás libera unidades de más."

---

### Bloque 8: Aseguramiento de Calidad, TDD y Puertas de CI (2 min · Juanma)

**Diapositiva 8:** Métricas de Testing y Calidad de Código.

> **Voz de Juanma:**  
> "Para certificar que el software no falle ante cátedra ni en producción, adoptamos TDD (Test-Driven Development) con Vitest y PGlite:
> - **513 tests automatizados** distribuidos en 38 suites cubren base de datos, APIs, componentes visuales y validaciones de modelo.
> - **0 errores de TypeScript y 0 warnings de ESLint** bajo configuración estricta sin `any`.
> - **0 enlaces rotos** auditados sobre los 46 documentos markdown del repositorio.
> - **Auditoría de Base Viva (`npm run bd:viva`):** Script que inspecciona en vivo Supabase `otjph…` verificando que las 10 tablas sensibles respondan `401/403` al acceso anónimo, los RPC estén sellados y los buckets respeten sus políticas de privacidad.
> - **Build Hermético en Vercel:** Los clientes de Supabase y Resend se instancian bajo demanda, permitiendo compilar en CI sin exigir secretos en el entorno de build."

---

### Bloque 9: Conclusiones, Impacto y Próximos Pasos (2 min · Todos)

**Diapositiva 9:** Resumen de logros y Fase 2.

> **Voz de Isabella:**  
> "Esencia Técnica demuestra que desde la escuela pública técnica se pueden construir soluciones de software de estándar profesional, uniendo el rigor del análisis de sistemas con tecnologías modernas de la industria."
>
> **Voz de Enzo:**  
> "Para la Fase 2 posterior a la graduación, el sistema ya deja planificada la integración con pasarela de pagos automatizada (MercadoPago), autenticación granular por roles en base de datos (`ADMIN`/`ROL`) y módulo de despacho con empresas de logística."
>
> **Voz de Celeste:**  
> "Agradecemos a los profesores Ariel Leibouski, Cecilia Maldonado y Alejandro Nieva por el acompañamiento metodológico, y al departamento de Química por abrirnos sus puertas para crear esta herramienta."
>
> **Voz de Juanma:**  
> "Quedamos a disposición de la mesa evaluadora para responder sus preguntas y demostrar cualquier caso de uso en vivo. Muchas gracias."

---

## 3. Matriz de Preguntas Frecuentes del Jurado (Defensas Clave)

| Pregunta Esperada | Integrante que Responde | Argumento Técnico Clave |
|---|---|---|
| *¿Por qué el carrito no reserva stock al agregar productos?* | Juanma / Isabella | "Para evitar ataques de denegación de inventario (reservas fantasmas de carritos abandonados). La reserva se concreta únicamente al crear el pedido en BD." |
| *¿Por qué no usaron Inteligencia Artificial para validar el comprobante?* | Enzo | "Decisión documentada en ADR 0002. En un contexto escolar, la validación manual por personal del taller evita falsos positivos en transferencias apócrifas y cumple el principio de trazabilidad sin costos de inferencia." |
| *¿Qué ocurre si dos clientes intentan comprar la última unidad al mismo tiempo?* | Isabella | "La RPC `crear_pedido` valida disponibilidad en una transacción atómica serializada a nivel de base de datos; el segundo intento es rechazado limpiamente sin sobreventa." |
| *¿Cómo aseguran que nadie acceda a las fotos de las transferencias?* | Enzo | "El bucket `comprobantes` es privado; solo el backend con service role genera URLs firmadas con expiración de 60 minutos al solicitarlas el admin autenticado." |
| *¿Cómo demuestran que el sistema está probado si no hay internet en la expo?* | Celeste | "La suite completa de Vitest corre contra PGlite (PostgreSQL compilado a WebAssembly en memoria), permitiendo ejecutar los 513 tests de forma local sin conexión a la red." |

---

## 4. Checklist para el Día de la Presentación

- [ ] Proyector calibrado y pantalla en resolución 1080p.
- [ ] Pestaña abierta en el [Visor de Diagramas](https://juanmamerodio.github.io/quimicashop/#diagramas) en modo Pantalla Completa.
- [ ] Pestaña abierta en la tienda pública [`esenciatecnica.vercel.app`](https://esenciatecnica.vercel.app).
- [ ] Pestaña abierta en el panel `/admin` con sesión iniciada.
- [ ] Terminal abierta en la raíz con `npm test` listo para demostrar los 513 tests en vivo.
- [ ] Copia de respaldo local del prototipo estático (`quimicashop/diagrams/prototype1.html`) por si falla el Wi-Fi escolar.
