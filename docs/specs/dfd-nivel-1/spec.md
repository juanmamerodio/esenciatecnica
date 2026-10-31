# Spec · Optimización Visual y Reorganización Topológica del DFD Nivel 1 en Mermaid

> **Feature:** Rediseño topológico y eliminación del efecto espagueti en el DFD Nivel 1 (Mermaid).  
> **Estado:** especificada (`ready-for-agent`).  
> **Fecha:** 2026-10-30.  
> **Issue:** #54 (Sub-issue de #53 · Entregables Académicos · Cierre Beta).  
> **Origen:** Observación visual en captura de pantalla del Visor Académico en pantalla completa (`dfd-n1`).  
> **Fuente de verdad:** [`docs/MODELO.md`](../../MODELO.md) · [`GLOSSARY.md`](../../../GLOSSARY.md) · [`docs/academico/DFD.md`](../../academico/DFD.md) · `quimicashop/diagramas-visor.js`.  
> **Responsables:** Celeste Cáceres (QA / UX Docs), Juan Manuel Merodio (Arquitectura).  
> **Criterio de cierre:** El DFD Nivel 1 en Mermaid se visualiza armónico, simétrico y ordenado en pantalla completa y desktop, sin cruces caóticos de líneas ni desplazamiento de nodos fuera de sus subgrafos, preservando el 100% de los datos, entidades, procesos y flujos canónicos del modelo y manteniendo en verde los 513 tests.

---

## 1. Problema

En la visualización actual del DFD Nivel 1 (tanto en el documento de cátedra `docs/academico/DFD.md` como en el Visor Académico interactivo del Hub `quimicashop/diagramas-visor.js`), el renderizado de Mermaid presenta severas deficiencias estéticas y estructurales ("efecto espagueti"):

1. **Desintegración de Subgrafos por Inversión de Ranks en Dagre:**
   La declaración raíz `flowchart LR` combinada con tres subgrafos verticales rígidos (`ENTIDADES`, `PROCESOS`, `ALMACENES`) con `direction TB` colapsa ante las relaciones bidireccionales del sistema. Debido a que el Administrador de Química y el Cron interactúan intensamente con procesos que leen y actualizan almacenes situados en el extremo opuesto, el algoritmo Dagre identifica ciclos de retroalimentación e invierte aristas, expulsando al nodo `Administrador de Química` y al `Temporizador Semanal` hacia la esquina superior derecha, fracturando el contenedor visual de Entidades Externas.

2. **Cruces Caóticos de Aristas ("Maraña de Cables"):**
   Nodos centrales de alta conectividad como el almacén `D3: STOCK` (vinculado a seis procesos) y el proceso `3.0 Gestionar Comprobante y Validación Manual` (vinculado a Cliente, Administrador y cuatro almacenes) proyectan aristas diagonales que atraviesan los títulos de otros subgrafos, cortan nodos circulares de procesos y se superponen a los textos de otros flujos.

3. **Cajas de Colisión Desproporcionadas por Etiquetas Horizontales:**
   Las etiquetas de texto de las flechas carecen de saltos de línea programados, generando cadenas de hasta 75 caracteres en una sola línea (ej. `Aprobado: descuenta stock y libera reserva / Rechazado: libera reserva`). En el layout SVG, estos anchos desmesurados fuerzan una separación artificial de cientos de píxeles entre nodos, dejando enormes vacíos espaciales en unas zonas y hacinamiento ininteligible en otras.

4. **Impacto en la Cátedra y la EXPO TEC1:**
   El DFD N1 es la pieza central que explica la descomposición funcional del sistema para los docentes evaluadores (Ariel Leibouski, Alejandro Nieva, Cecilia Maldonado). En su estado actual, transmite desorden visual y dificulta la comprensión de la frontera operativa y el aislamiento del carrito en el cliente.

---

## 2. Solución

1. **Reorganización Topológica Top-Down (`flowchart TD`):**
   Migrar el lienzo del DFD N1 a una disposición vertical jerárquica y equilibrada (`flowchart TD`) que respeta la gravedad natural de los datos:
   - **Nivel Superior:** Entidades Externas agrupadas en entornos complementarios (`Entorno Cliente` y `Entorno Gestión y Control`) dentro de `subgraph ENTIDADES ["Entidades Externas"]`.
   - **Nivel Medio:** Procesos Principales ordenados en dos columnas funcionales claras dentro de `subgraph PROCESOS ["Procesos Principales"]` (Columna Comercial: 1.0, 2.0, 3.0; Columna de Gestión e Inventario: 4.0, 5.0, 6.0).
   - **Nivel Inferior:** Almacenes Canónicos organizados por afinidad transaccional dentro de `subgraph ALMACENES ["Almacenes de Datos (D1–D7)"]` (D1, D4, D5, D6 vinculados a compras; D2, D3, D7 vinculados a catálogo, stock y alertas).

2. **Compactación de Etiquetas con Saltos de Línea (`<br/>`):**
   Dividir los textos largos de las aristas en fragmentos de máximo 25–30 caracteres por línea mediante etiquetas `<br/>`, reduciendo el ancho del cuadro delimitador y permitiendo que Mermaid aproxime los nodos de forma armónica.

3. **Preservación Estricta de Datos (Cero Pérdida de Información):**
   Mantener exactamente las mismas 3 entidades externas, los mismos 6 procesos principales (1.0 al 6.0), los mismos 7 almacenes de datos canónicos (D1 a D7) y todas y cada una de las transferencias de datos del modelo canónico sin alterar ni una sola palabra del dominio.

4. **Sincronización Dual:**
   Actualizar idénticamente la definición Mermaid en `docs/academico/DFD.md` y en `quimicashop/diagramas-visor.js`, garantizando coherencia absoluta entre la documentación y el visor web interactivo.

---

## 3. Historias y criterios de aceptación

1. **Como docente evaluador de cátedra**, quiero ver el DFD Nivel 1 organizado en bloques claros y sin cables cruzados caóticos, para poder auditar con rapidez la descomposición funcional y el flujo de datos del sistema.
2. **Como alumno expositor en la EXPO TEC1**, quiero proyectar el DFD Nivel 1 en pantalla completa desde el visor interactivo, para que el público y los docentes aprecien un diagrama profesional, estético y nítido.
3. **Como Administrador de Química**, quiero que el DFD N1 refleje claramente que la validación de comprobantes es manual y que las alertas de stock se notifican únicamente por popup en el panel, para entender el alcance exacto de mis tareas de gestión sin confusiones sobre correos automatizados al panel.
4. **Como Cliente comprador invitado**, quiero que el diagrama explicite que mi carrito de compras reside en mi navegador y no en la base de datos, para comprender que la reserva de stock ocurre recién al confirmar el pedido.
5. **Como arquitecto de software**, quiero que las entidades externas permanezcan contenidas de forma limpia en su subgrafo superior, para evitar que el motor Dagre desplace nodos a ubicaciones desconectadas.
6. **Como desarrollador full-stack**, quiero que el código Mermaid del DFD N1 sea fácil de leer y mantener en el repositorio, para que futuros cambios de modelo no rompan la legibilidad del diagrama.
7. **Como responsable de QA**, quiero que los tests automatizados en Vitest validen que todos los almacenes canónicos (D1 a D7) y las reglas de dominio sigan presentes en el código Mermaid, para prevenir regresiones conceptuales.

---

## 4. Decisiones de implementación

1. **Topología `flowchart TD` Jerárquica y Modular:**
   - La orientación del grafo se define como `flowchart TD`.
   - Se mantiene la existencia obligatoria de los tres subgrafos requeridos por los tests automatizados: `ENTIDADES`, `PROCESOS` y `ALMACENES`.
   - Para evitar que Dagre expulse entidades a cuadrantes lejanos, las entidades externas se declaran en el nivel superior en dos bloques simétricos:
     - `CLI["Cliente (Comprador Invitado)"]` a la izquierda.
     - `ADM["Administrador de Química"]` y `CRON["Temporizador Semanal (Vercel Cron)"]` a la derecha.

2. **Distribución Funcional de Procesos Principales:**
   - Dentro de `subgraph PROCESOS ["Procesos Principales"]`, los procesos se ordenan por afinidad:
     - Flujo de Venta / Cliente:
       - `P1(("1.0 Consultar Catálogo y Disponibilidad"))`
       - `P2(("2.0 Registrar Pedido y Reservar Stock"))`
       - `P3(("3.0 Gestionar Comprobante y Validación Manual"))`
     - Flujo de Control / Operaciones:
       - `P4(("4.0 Administrar Catálogo y Stock Físico"))`
       - `P5(("5.0 Controlar Umbrales y Alertas de Stock"))`
       - `P6(("6.0 Cancelar Pedidos Vencidos (Cron)"))`

3. **Disposición de Almacenes Canónicos por Afinidad:**
   - Dentro de `subgraph ALMACENES ["Almacenes de Datos (D1–D7)"]`:
     - Almacenes transaccionales de venta: `D1[("D1: CLIENTE")]`, `D4[("D4: PEDIDO")]`, `D5[("D5: COMPROBANTE")]`, `D6[("D6: REMITO_VENTA")]`.
     - Almacenes de inventario y catálogo: `D2[("D2: PRODUCTO")]`, `D3[("D3: STOCK")]`, `D7[("D7: ALERTA_STOCK")]`.
   - `D3: STOCK` se ubica de forma estratégica para facilitar la convergencia de las reservas (`P2`), descuentos (`P3`), ajustes (`P4`), monitoreo (`P5`) y liberaciones de vencidos (`P6`).

4. **Estandarización de Etiquetas con Saltos `<br/>`:**
   - Toda etiqueta de flujo con más de 28 caracteres se formatea con `<br/>`. Ejemplos concretos:
     - `CLI -->|"Confirmación de compra<br/>(desde carrito en cliente)"| P2`
     - `P2 -->|"Incrementa cantidad_reservada<br/>(RPC crear_pedido)"| D3`
     - `P3 -->|"Aprobado: estado Pago Validado<br/>Rechazado: estado Rechazado"| D4`
     - `P3 -->|"Aprobado: descuenta stock y libera reserva<br/>Rechazado: libera reserva"| D3`
     - `P6 -->|"Libera cantidad_reservada en stock<br/>(RPC cancelar_pedidos_vencidos)"| D3`
     - `CRON -->|"Disparo semanal programado<br/>(Viernes 23:59 ART)"| P6`

5. **Configuración del Motor en `quimicashop/diagramas-visor.js`:**
   - Se mantiene el soporte para Mermaid v10+ con `useMaxWidth: false`, asegurando que el paneo, zoom (+/-) y pantalla completa respeten las dimensiones intrínsecas del diagrama sin recortar nodos.

---

## 5. Decisiones de testing

1. **Seam de Pruebas Unitarias / Integración de Cátedra (`tests/front/dfd-academico.test.ts`):**
   - Verifica que `docs/academico/DFD.md` exista y contenga bloques válidos en sintaxis `flowchart TD` o `flowchart LR`.
   - Valida la presencia explícita de los siete almacenes canónicos normalizados: `D1: CLIENTE`, `D2: PRODUCTO`, `D3: STOCK`, `D4: PEDIDO`, `D5: COMPROBANTE`, `D6: REMITO_VENTA` y `D7: ALERTA_STOCK`.
   - Verifica que el carrito figure estrictamente en el cliente (localStorage/cookie) sin ningún almacén persistente `D... CARRITO`.
   - Asegura la presencia de los subgrafos obligatorios: `Entidades`, `Procesos` y `Almacenes`.
   - Confirma la total ausencia de términos y conceptos legacy prohibidos (`pedidos`, `productos`, `verificaciones`, `pre_aprobado`, `comprobante_subido`, `log_ia`, `Gemini`, `QuimicaShop`).

2. **Seam de Pruebas del Visor Interactivo (`tests/front/hub-diagramas.test.ts`):**
   - Verifica que `quimicashop/diagramas-visor.js` contenga la entrada canónica `id: 'dfd-n1'` con sintaxis Mermaid válida.
   - Valida la exportación a SVG, PNG, copia de código y controles de pantalla completa.
   - Exige cero errores de TypeScript y 0 fallos en Vitest.

---

## 6. Fuera de alcance

1. No se modifica el código ni la estructura de los diagramas DFD N0, DFD N2, DFD N3, DER, Clases UML ni DCU.
2. No se alteran las reglas del modelo de datos de `docs/MODELO.md` (no se crean estados nuevos, no se agregan envíos, no se altera la periodicidad del cron de los viernes 23:59 ART ni la validación manual sin IA).
3. No se incorporan bibliotecas externas de diagramación pesadas ni canvas propietarios: la solución se apoya 100% en el estándar Mermaid soportado nativamente por Markdown y GitHub Pages.

---

## 7. Notas finales

- La solución se basa en una reorganización puramente estructural y visual dentro de las capacidades de Dagre y Mermaid v10+, sin inventar nodos intermedios ficticios ni eliminar flujos reales.
- Al publicar esta especificación en GitHub Issues con la etiqueta `ready-for-agent`, el equipo de desarrollo podrá ejecutar la implementación con TDD inmediato, verificando los 513 tests locales y la compilación en GitHub Actions.
