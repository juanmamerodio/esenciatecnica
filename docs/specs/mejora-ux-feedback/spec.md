# Spec · Mejoras de UX, Identidad y Feedback del Panel

> **Feature:** Mejoras de UX, identidad, navegación y comunicación con el cliente y administradores.  
> **Estado:** especificada.  
> **Fecha:** 2026-10-29.  
> **Origen:** Feedback del equipo y cátedra sobre la demo en producción (documento adjunto de 10 puntos).  
> **Fuente de verdad:** [`AGENTS.md`](../../../AGENTS.md) · [`docs/MODELO.md`](../../MODELO.md) · [`docs/specs/PLANTILLA.md`](../PLANTILLA.md).  
> **Responsable:** Celeste Cáceres (UX/UI) y Juan Manuel Merodio (Full-Stack).  
> **Criterio de cierre:** La tienda cuenta con favicon de identidad, navegación actualizada a "Noticias", datos reales de retiro en Int. Moro 1122, checkout con mensaje cálido y simplificado, y `/admin` sin banners ni textos redundantes, con navegación rápida por anclas y terminología de "Stock bajo" / "Stock mínimo".

---

## 1. Problema

1. **Falta de identidad en la ventana del navegador:** La aplicación muestra el favicon por defecto de Next.js, restando identidad escolar e institucional a la tienda de Química.
2. **Confusión en navegación institucional:** La sección "Sobre el proyecto" resulta excesivamente académica o genérica frente a la necesidad de difundir las noticias y avances de producción del taller.
3. **Falta de información logística clave:** En la pantalla principal no se informan los días, horarios ni la dirección física real donde el cliente debe retirar los productos adquiridos.
4. **Mensajes finales con lenguaje técnico de desarrollo:** La pantalla posterior a la confirmación del pedido y los encabezados del panel `/admin` exponen detalles de arquitectura interna ("MVP", "el disponible lo calcula la base", "se valida con un algoritmo") que confunden tanto a clientes como a administradores.
5. **Panel de administración con scroll extenso e información residual:** Los administradores deben desplazarse a lo largo de toda la página para consultar el stock o los productos, visualizando además un banner informativo de desarrollo ("El panel está protegido...") ya innecesario.
6. **Terminología poco natural en stock:** El término técnico "umbral de aviso" resulta poco intuitivo para los operadores frente a expresiones directas como "Stock bajo" o "Stock mínimo".

---

## 2. Solución

1. **Favicon institucional:** Incorporar el isotipo vectorizado de Esencia Técnica en `src/app/icon.svg` para que todos los navegadores y dispositivos muestren la marca en la pestaña y marcadores.
2. **Sección "Noticias":** Renombrar el acceso en el shell de navegación y pie de página a "Noticias", enlazando al espacio de novedades y contexto del Departamento de Química.
3. **Logística clara de retiro:** Actualizar la sección de pago a "Forma de pago" e incluir la dirección oficial (Int. Moro 1122, Campana), horarios (Lunes a Viernes de 8:00 a 17:00 hs) y punto de entrega (Departamento de Química de la E.E.S.T N°1 Luciano Reyes).
4. **Checkout humano y directo:** Simplificar el mensaje de pedido registrado, agradeciendo la compra e indicando con claridad el aviso por email y el contacto ante consultas.
5. **Depuración de `/admin`:** Eliminar el banner inferior de desarrollo y reducir los subtítulos de Pedidos, Stock y Productos a instrucciones breves de gestión.
6. **Sub-navegación por anclas en `/admin`:** Agregar una barra horizontal compacta con accesos directos `#pedidos`, `#stock` y `#productos` para saltar inmediatamente de sección.
7. **Terminología de stock amigable:** Sustituir "umbral" en la interfaz por "Stock bajo" (en las alertas visuales) y "Stock mínimo" (en la configuración de alerta).

---

## 3. Historias y criterios de aceptación

### HU-1 · Identidad visual en el navegador
**Como** visitante de la tienda,  
**quiero** visualizar el logo de Esencia Técnica en la pestaña del navegador,  
**para** reconocer rápidamente la pestaña entre mis ventanas abiertas.

- **Criterio 1.1:** Given que accedo a cualquier ruta de la tienda o del panel, When la página carga en el navegador, Then se visualiza el isotipo verde esmeralda de Esencia Técnica en la pestaña.

### HU-2 · Acceso a noticias y novedades del proyecto
**Como** cliente de la comunidad técnica,  
**quiero** acceder a la sección "Noticias" desde el encabezado y el pie de página,  
**para** informarme sobre las elaboraciones y proyectos del Departamento de Química.

- **Criterio 2.1:** Given que navego por la tienda, When observo la barra de navegación o el footer, Then encuentro el enlace "Noticias" en lugar de "Sobre el proyecto".
- **Criterio 2.2:** Given que hago clic en "Noticias", When la ruta carga, Then visualizo la información del proyecto y las novedades del taller escolar.

### HU-3 · Ubicación y horarios claros de retiro
**Como** comprador,  
**quiero** conocer la dirección exacta, días y horarios de retiro antes de confirmar mi pedido,  
**para** saber cuándo y dónde retirar mis productos sin dudas.

- **Criterio 3.1:** Given que visito la sección "Forma de pago" en la portada, When leo las condiciones de entrega, Then visualizo la dirección física "Int. Moro 1122, Campana", los días "Lunes a Viernes de 8:00 a 17:00 hs" y la referencia "Departamento de Química de la E.E.S.T N°1 Luciano Reyes".

### HU-4 · Confirmación de compra empática y concisa
**Como** cliente que acaba de registrar su pedido,  
**quiero** un mensaje claro de confirmación con vías de contacto,  
**para** sentir tranquilidad respecto a mi compra sin leer explicaciones técnicas internas.

- **Criterio 4.1:** Given que confirmo exitosamente un pedido, When se muestra la pantalla de confirmación, Then el texto agradece la compra, informa que se notificará por email la validación y ofrece el contacto ante dudas sin mencionar procesos de backend ni limitaciones de desarrollo.

### HU-5 · Limpieza visual del panel de administración
**Como** administrador de Química,  
**quiero** un panel de control despejado y sin advertencias obvias de desarrollo,  
**para** concentrarme en la gestión operativa sin ruido visual.

- **Criterio 5.1:** Given que inicio sesión en `/admin`, When recorro el panel, Then no se visualiza el banner inferior sobre credenciales o números de issue ("AFUERA"), y los encabezados de Pedidos, Stock y Productos contienen textos breves y operativos.

### HU-6 · Accesos rápidos a secciones en `/admin`
**Como** administrador de Química,  
**quiero** botones de acceso rápido a las secciones de Pedidos, Stock y Productos,  
**para** no tener que scrollear toda la página al revisar stock o el catálogo.

- **Criterio 6.1:** Given que estoy en `/admin`, When utilizo la barra de navegación secundaria, Then puedo hacer clic en "Pedidos", "Stock" o "Productos" y la vista se desplaza directamente a la sección correspondiente mediante anclaje suave.

### HU-7 · Terminología clara de stock mínimo
**Como** administrador de Química,  
**quiero** leer "Stock bajo" y "Stock mínimo" en lugar de la palabra "umbral",  
**para** comprender de inmediato el estado del inventario.

- **Criterio 7.1:** Given que un producto tiene cantidad disponible menor o igual a la configurada, When el administrador revisa la tabla de stock, Then visualiza el distintivo "Stock bajo, sin atender".
- **Criterio 7.2:** Given que el administrador edita un producto o revisa las columnas de stock, When observa el campo de configuración, Then la etiqueta indica "Stock mínimo" en lugar de "Umbral".

---

## 4. Decisiones de implementación

1. **Favicon de identidad:**
   - Ubicación del activo en la raíz de la aplicación para aprovechamiento de la API de metadatos estáticos de Next.js (`src/app/icon.svg`).
   - Formato vectorial SVG ligero, accesible y con colores del token de diseño corporativo.
2. **Navegación e identidad de contenidos:**
   - La lista canónica de destinos del shell de navegación actualiza la entrada a `{ nombre: "Noticias", href: "/about" }` (y en el pie de página).
   - Se mantiene la compatibilidad de URL `/about` y se actualiza el título visual principal de la página a "Noticias de Esencia Técnica".
3. **Contenido de la portada y entrega:**
   - El bloque "Cómo se paga" pasa a titularse "Forma de pago".
   - En el punto de logística se consolida la dirección física: E.E.S.T N°1 Luciano Reyes, Int. Moro 1122, Campana, de Lunes a Viernes de 8:00 a 17:00 hs.
4. **Pantalla de confirmación de pedido:**
   - Se reemplaza el párrafo explicativo por una redacción directa: *"¡Gracias por tu compra! Ya registramos tu pedido. Un Administrador del Departamento de Química validará tu comprobante y te avisaremos por email cuando quede aprobado. Si tenés dudas, podés acercarte a la escuela o escribirnos."*
5. **Panel `/admin`:**
   - Se elimina el nodo JSX del párrafo informativo inferior de la vista del panel.
   - Los subtítulos de cada sección se sintetizan en una sola línea funcional.
   - Se incorpora un componente de pastillas de sub-navegación (`nav-pills` secundario) que enlaza a `#pedidos`, `#stock` y `#productos`, asegurando que cada contenedor tenga su `id` correspondiente y `scroll-mt-20` para compensar el header fijo.
   - En los componentes de tabla y formulario de stock, los textos visibles sustituyen la palabra "umbral" por "Stock mínimo" y "Stock bajo", preservando intactos los nombres de campos de base de datos (`umbral_minimo`).

---

## 5. Decisiones de testing

- **Seam de UI y accesibilidad:**
  - Tests en `tests/front/identidad-shell.test.ts` y pruebas de navegación para verificar la presencia del enlace "Noticias" en Header y Footer.
  - Test de renderizado del panel de administración (`tests/front/admin-panel.test.tsx` o similar) que confirme:
    - Ausencia del banner inferior obsoleto.
    - Presencia de la sub-navegación por anclas.
    - Presencia de la etiqueta "Stock bajo" en productos en alerta.
- **Seam de checkout:**
  - Verificación en tests de checkout de que el mensaje de confirmación contiene el texto de agradecimiento y las referencias correctas.
- **Prior art:**
  - `tests/front/identidad-shell.test.ts`
  - `tests/front/home.test.ts`
  - `tests/front/carrito-checkout.test.ts`

---

## 6. Fuera de alcance

- Modificaciones en el esquema de base de datos o migraciones de Supabase (las columnas siguen llamándose `umbral_minimo` a nivel interno).
- Creación de un sistema de blogs o CMS dinámico para Noticias (se mantiene el contenido actual adaptado como novedades del proyecto de Química).
- Modificaciones en el flujo transaccional de pagos o emails del remito.

---

## 7. Notas finales

- La dirección exacta confirmada por el equipo para el retiro es: **Int. Moro 1122, Campana** (E.E.S.T N°1 Luciano Reyes).
- Este spec responde puntualmente a los 10 puntos de feedback relevados en la auditoría de la demo, permitiendo un pase limpio y rápido a código respetando la disciplina TDD del proyecto.
