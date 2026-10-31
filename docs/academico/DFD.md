# Diagramas de Flujo de Datos (DFD) · Esencia Técnica

> **Proyecto:** Esencia Técnica — E-Commerce de Cosmética y Higiene (E.E.S.T N°1 Luciano Reyes).  
> **Cátedra:** Ariel Leibouski, Cecilia Maldonado, Alejandro Nieva.  
> **Entrega:** HU-15 del Spec Maestro de Cierre Beta ([`docs/specs/cierre-beta/spec.md`](../specs/cierre-beta/spec.md)).  
> **Fuentes de verdad:** [`docs/MODELO.md`](../MODELO.md) · [`GLOSSARY.md`](../../GLOSSARY.md) · [`docs/specs/cierre-beta/spec.md`](../specs/cierre-beta/spec.md).  
> **Responsables:** Celeste Cáceres (QA / Docs) y Juan Manuel Merodio (Arquitectura).  
> **Estado:** Aprobado para cátedra, formalizado en Mermaid y sincronizado con la base viva (`otjph…`).

---

## 1. Introducción y Resolución de Observaciones Docentes (Ariel)

Los borradores preliminares desarrollados en formato CSV ([`DFD1-Quimica.csv`](DFD1-Quimica.csv), [`DFD2-Quimica.csv`](DFD2-Quimica.csv) y [`DFD3-Quimica.csv`](DFD3-Quimica.csv)) contenían inconsistencias estructurales con la teoría de análisis de sistemas y desajustes respecto al modelo de datos canónico del sistema. En este documento se corrigen de forma integral dichas observaciones:

1. **Corrección de Nivel 0 (Diagrama de Contexto):**
   - *Observación:* El borrador anterior incluía un almacén denominado "Base de datos" conectado al proceso central.
   - *Corrección metodológica:* En el Diagrama de Contexto (Nivel 0) **no se admiten almacenes de datos**. Toda la persistencia es interna a la frontera del sistema. El Nivel 0 modela estrictamente a las entidades externas (Cliente, Administrador de Química y el Temporizador del Cron Semanal) interactuando con el proceso único del sistema.
2. **Definición de Almacenes Canónicos D1 a D7 vs. "Base de datos" genérica:**
   - *Observación:* Los diagramas de niveles 1 y 2 representaban una base de datos monolítica no estructurada.
   - *Corrección metodológica:* Se identifican formalmente los 7 almacenes de datos canónicos normalizados definidos en [`docs/MODELO.md`](../MODELO.md):
     - **D1: CLIENTE** (compradores invitados, DNI, datos de contacto).
     - **D2: PRODUCTO** (catálogo activo, descripción, precio, categoría).
     - **D3: STOCK** (cantidades actuales, reservadas y umbrales de aviso).
     - **D4: PEDIDO** (cabecera, detalle de productos e historial de estados).
     - **D5: COMPROBANTE** (imagen en Storage privado, montos e historial de estados).
     - **D6: REMITO_VENTA** (remitos emitidos correlativos con vinculación a cliente y comprobante).
     - **D7: ALERTA_STOCK** (avisos de stock mínimo registrados para el panel).
3. **El Carrito reside en el Cliente (Sin persistencia en BD en el MVP):**
   - *Observación:* El borrador Nivel 3 planteaba un proceso "Registrar carrito", un almacén "carrito" y tablas de carrito persistente en base de datos.
   - *Corrección de dominio:* Conforme a [`docs/MODELO.md`](../MODELO.md) §1 y §5, en el MVP el Carrito vive pura y exclusivamente en el navegador del cliente (`localStorage` / cookies). El Carrito **no es un almacén de base de datos** y no reserva stock por sí mismo. La reserva ocurre únicamente cuando el cliente confirma la compra y se crea el Pedido en la base de datos.
4. **Ciclo de Reserva y Cancelación Semanal de Vencidos (Cron de los Viernes 23:59 ART):**
   - *Observación:* El borrador indicaba erróneamente que `cantidades_reservadas` "se iba sumando semanalmente si la compra no fue ejecutada" y proponía temporizadores diarios arbitrarios.
   - *Corrección de dominio:* La reserva (`STOCK.cantidad_reservada`) se incrementa al confirmar el pedido. El proceso temporizado semanal de los **viernes 23:59 ART** (`cancelar_pedidos_vencidos`) **cancela** los pedidos sin comprobante aprobado y **libera la reserva** (`cantidad_reservada -= cantidad`), devolviendo las unidades al stock disponible. No se utilizan temporizadores diarios ni ventanas cortas.
5. **Canal de Alertas de Stock (Popup en Panel `/admin`, sin emails):**
   - *Observación:* El borrador sugería el envío de emails ante alertas de stock.
   - *Corrección de dominio:* Las alertas de stock se notifican de manera visual exclusiva mediante un popup en el panel `/admin` (`ALERTA_STOCK`). El correo electrónico se reserva exclusivamente para el despacho del Remito de venta al Cliente.

---

## 2. Nivel 0 · Diagrama de Contexto

El Nivel 0 delimita la frontera del sistema de Esencia Técnica frente a sus entidades externas. No contiene almacenes de datos internos.

```mermaid
flowchart TD
    %% Entidades Externas
    subgraph EXT_CLI ["Entorno Cliente"]
        direction TB
        E1["Cliente (Comprador Invitado)"]
    end

    subgraph SISTEMA ["Frontera del Sistema · Esencia Técnica"]
        P0(("0. Sistema de Gestión y Venta de Cosmética Esencia Técnica"))
    end

    subgraph EXT_GESTION ["Entorno Gestión y Control"]
        direction TB
        E2["Administrador de Química"]
        E3["Temporizador Semanal (Vercel Cron)"]
    end

    %% Flujos de Cliente
    E1 -->|"Solicitud de catálogo y productos"| P0
    P0 -->|"Catálogo activo y disponibilidad de stock"| E1
    E1 -->|"Datos de contacto y confirmación de compra"| P0
    P0 -->|"Confirmación de pedido y datos de transferencia"| E1
    E1 -->|"Comprobante de transferencia bancaria (foto y monto)"| P0
    P0 -->|"Remito de venta oficial por correo electrónico"| E1

    %% Flujos de Administrador
    E2 -->|"Credenciales de acceso (Basic Auth)"| P0
    E2 -->|"Ajustes de stock, umbrales y catálogo"| P0
    E2 -->|"Validación manual de comprobante (Aprobar / Rechazar)"| P0
    E2 -->|"Atención de alertas de stock"| P0
    P0 -->|"Listado de pedidos y comprobantes pendientes"| E2
    P0 -->|"Alertas de stock bajo en panel (popup)"| E2
    P0 -->|"Estado de inventario y remitos emitidos"| E2

    %% Flujos de Cron
    E3 -->|"Disparo semanal programado (Viernes 23:59 ART)"| P0
    P0 -->|"Resultado de cancelación de pedidos vencidos"| E3
```

---

## 3. Nivel 1 · Descomposición General del Sistema

El Nivel 1 descompone el sistema central en seis procesos principales y expone los siete almacenes de datos canónicos (D1 a D7). Se explicita que el carrito reside en el cliente y no en la base de datos.

```mermaid
flowchart TD
    %% Carril 1: Entidades Externas
    subgraph ENTIDADES ["Entidades Externas"]
        subgraph EXT_CLI ["Entorno Cliente"]
            direction TB
            CLI["Cliente (Comprador Invitado)"]
        end
        subgraph EXT_GESTION ["Entorno Gestión y Control"]
            direction TB
            ADM["Administrador de Química"]
            CRON["Temporizador Semanal (Vercel Cron)"]
        end
    end

    %% Carril 2: Procesos Principales
    subgraph PROCESOS ["Procesos Principales"]
        subgraph PROC_VENTA ["Flujo de Venta (Cliente)"]
            direction TB
            P1(("1.0 Consultar Catálogo y Disponibilidad"))
            P2(("2.0 Registrar Pedido y Reservar Stock"))
            P3(("3.0 Gestionar Comprobante y Validación Manual"))
        end
        subgraph PROC_GESTION ["Flujo de Gestión y Control"]
            direction TB
            P4(("4.0 Administrar Catálogo y Stock Físico"))
            P5(("5.0 Controlar Umbrales y Alertas de Stock"))
            P6(("6.0 Cancelar Pedidos Vencidos (Cron)"))
        end
    end

    %% Carril 3: Almacenes Canónicos
    subgraph ALMACENES ["Almacenes de Datos (D1–D7)"]
        subgraph ALM_VENTA ["Almacenes de Venta (Transaccionales)"]
            direction TB
            D1[("D1: CLIENTE")]
            D4[("D4: PEDIDO")]
            D5[("D5: COMPROBANTE")]
            D6[("D6: REMITO_VENTA")]
        end
        subgraph ALM_STOCK ["Almacenes de Catálogo y Stock"]
            direction TB
            D2[("D2: PRODUCTO")]
            D3[("D3: STOCK")]
            D7[("D7: ALERTA_STOCK")]
        end
    end

    %% Flujos Proceso 1.0
    CLI -->|"Consulta de cosmética<br/>e higiene"| P1
    D2 -->|"Productos activos"| P1
    D3 -->|"Stock actual y reservado"| P1
    P1 -->|"Vista de catálogo con<br/>disponibilidad real"| CLI

    %% Flujos Proceso 2.0 (Carrito en cliente -> Pedido en BD)
    CLI -->|"Confirmación de compra<br/>(desde carrito en cliente)"| P2
    P2 -->|"Upsert datos de contacto<br/>por email"| D1
    P2 -->|"Registro de pedido<br/>pendiente y detalle"| D4
    P2 -->|"Incrementa cantidad_reservada<br/>(RPC crear_pedido)"| D3
    P2 -->|"Número de pedido y<br/>datos de Cooperadora"| CLI

    %% Flujos Proceso 3.0
    CLI -->|"Subida de comprobante<br/>(foto y monto)"| P3
    P3 -->|"Guarda comprobante<br/>(Comprobante Subido)"| D5
    D4 -->|"Lectura de pedidos<br/>para cotejo"| P3
    D5 -->|"Lectura de comprobantes<br/>para revisión"| P3
    P3 -->|"Pedidos y comprobantes<br/>pendientes"| ADM
    ADM -->|"Decisión de validación<br/>manual (Aprobar / Rechazar)"| P3
    P3 -->|"Aprobado: estado Pago Validado<br/>Rechazado: estado Rechazado"| D4
    P3 -->|"Aprobado: descuenta stock y libera reserva<br/>Rechazado: libera reserva"| D3
    P3 -->|"Genera remito de venta<br/>con número oficial"| D6
    P3 -->|"Despacha remito HTML<br/>por correo electrónico"| CLI

    %% Flujos Proceso 4.0
    ADM -->|"Actualización de productos<br/>e inventario"| P4
    P4 -->|"Baja lógica y<br/>edición de productos"| D2
    P4 -->|"Ajuste de cantidad_actual<br/>y cantidad_warning"| D3

    %% Flujos Proceso 5.0
    D3 -->|"Monitoreo de stock<br/>disponible"| P5
    P5 -->|"Genera alerta si<br/>disponible <= warning"| D7
    D7 -->|"Lectura de alertas<br/>pendientes"| P5
    P5 -->|"Popup informativo<br/>de stock bajo"| ADM
    ADM -->|"Marca alerta como atendida"| P5
    P5 -->|"Actualiza atendida = true"| D7

    %% Flujos Proceso 6.0
    CRON -->|"Disparo semanal programado<br/>(Viernes 23:59 ART)"| P6
    D4 -->|"Consulta de pedidos<br/>Pendiente de Pago"| P6
    P6 -->|"Actualiza pedidos<br/>a Cancelado"| D4
    P6 -->|"Actualiza comprobantes<br/>a Rechazado"| D5
    P6 -->|"Libera cantidad_reservada en stock<br/>(RPC cancelar_pedidos_vencidos)"| D3
    P6 -->|"Reporte de ejecución con<br/>pedidos cancelados"| CRON
```

---

## 4. Nivel 2 · Descomposición de Subsistemas Clave

### 4.1 Subsistema de Pedidos, Comprobantes y Remitos (Descomposición de 2.0 y 3.0)

Este diagrama detalla cómo interactúan la creación de pedidos, el registro de comprobantes en storage privado y la validación manual por parte del Administrador.

```mermaid
flowchart TD
    %% Actores Externos
    subgraph ACTORES ["Actores Externos"]
        direction LR
        CLI["Cliente (Comprador Invitado)"]
        ADM["Administrador de Química"]
    end

    %% Subsistemas de Procesos
    subgraph SUB_PEDIDO ["Subsistema 2.0: Pedido y Reserva"]
        direction TB
        P21(("2.1 Validar Disponibilidad y Crear Pedido"))
        P22(("2.2 Registrar Reserva de Stock"))
    end

    subgraph SUB_COMPROBANTE ["Subsistema 3.0: Comprobante y Cotejo"]
        direction TB
        P31(("3.1 Subir Comprobante a Storage y BD"))
        P32(("3.2 Cotejo Manual de Imagen y Monto"))
    end

    subgraph SUB_RESOLUCION ["Subsistema 3.0: Resolución y Remito"]
        direction TB
        P33(("3.3 Ejecutar Aprobación y Venta"))
        P34(("3.4 Ejecutar Rechazo"))
        P35(("3.5 Despachar Remito de Venta por Email"))
    end

    %% Almacenes Involucrados
    subgraph ALMACENES ["Almacenes de Persistencia"]
        direction TB
        D1[("D1: CLIENTE")]
        D3[("D3: STOCK")]
        D4[("D4: PEDIDO")]
        D5[("D5: COMPROBANTE")]
        D6[("D6: REMITO_VENTA")]
    end

    %% Flujos de Creación de Pedido
    CLI -->|"Envío de pedido (items desde carrito del cliente + contacto)"| P21
    P21 -->|"Upsert cliente por email"| D1
    P21 -->|"Verifica disponible = cantidad_actual - cantidad_reservada"| D3
    P21 -->|"Inserta pedido en estado Pendiente de Pago y detalle"| D4
    P21 -->|"Solicita reserva de unidades"| P22
    P22 -->|"Incrementa cantidad_reservada en stock"| D3
    P21 -->|"Informa total y datos bancarios para transferencia"| CLI

    %% Flujos de Comprobante
    CLI -->|"Carga foto de comprobante y monto transferido"| P31
    P31 -->|"Inserta comprobante con estado Comprobante Subido"| D5
    P31 -->|"Vincula comprobante con el pedido"| D4

    %% Validación Manual
    D4 -->|"Datos de pedido y total esperado"| P32
    D5 -->|"Imagen de transferencia y monto declarado"| P32
    P32 -->|"Presenta en panel pedidos y comprobantes"| ADM
    ADM -->|"Orden de aprobación (monto coincide con total)"| P33
    ADM -->|"Orden de rechazo (monto incorrecto o imagen apócrifa)"| P34

    %% Desenlace de Aprobación
    P33 -->|"Actualiza pedido a Pago Validado con historial"| D4
    P33 -->|"Actualiza comprobante a Aprobado por Admin"| D5
    P33 -->|"Convierte reserva en venta (resta actual y reservada)"| D3
    P33 -->|"Genera remito de venta con número oficial único"| D6
    P33 -->|"Dispara despacho del remito"| P35

    %% Desenlace de Rechazo
    P34 -->|"Actualiza pedido a Rechazado con historial"| D4
    P34 -->|"Actualiza comprobante a Rechazado"| D5
    P34 -->|"Libera cantidad_reservada en stock"| D3

    %% Despacho de Remito
    D6 -->|"Datos de remito y número correlativo"| P35
    D1 -->|"Correo electrónico del comprador"| P35
    P35 -->|"Envío de remito HTML al cliente (Resend)"| CLI
```

### 4.2 Subsistema de Stock, Alertas y Cron Semanal (Descomposición de 4.0, 5.0 y 6.0)

Este diagrama detalla la administración del inventario, la generación de alertas en el panel y la cancelación de pedidos vencidos por cron semanal.

```mermaid
flowchart TD
    %% Actores Externos
    subgraph ACTORES ["Actores Externos"]
        direction LR
        ADM["Administrador de Química"]
        CRON["Temporizador Semanal (Vercel Cron)"]
    end

    %% Subsistemas de Procesos
    subgraph SUB_INVENTARIO ["Subsistema 4.0: Catálogo e Inventario"]
        direction TB
        P41(("4.1 Gestión de Catálogo de Productos"))
        P42(("4.2 Gestión de Stock Físico y Warning"))
    end

    subgraph SUB_ALERTAS ["Subsistema 5.0: Detección y Popup de Alertas"]
        direction TB
        P51(("5.1 Evaluar Condición de Stock Bajo"))
        P52(("5.2 Visualizar y Atender Alertas en Panel"))
    end

    subgraph SUB_CRON ["Subsistema 6.0: Cancelación Semanal de Vencidos"]
        direction TB
        P61(("6.1 Verificar Autorización del Cron"))
        P62(("6.2 Cancelar Vencidos y Liberar Reserva"))
    end

    %% Almacenes Involucrados
    subgraph ALMACENES ["Almacenes de Persistencia"]
        direction TB
        D2[("D2: PRODUCTO")]
        D3[("D3: STOCK")]
        D4[("D4: PEDIDO")]
        D5[("D5: COMPROBANTE")]
        D7[("D7: ALERTA_STOCK")]
    end

    %% Flujos Catálogo y Stock
    ADM -->|"Alta, edición o baja lógica de producto"| P41
    P41 -->|"Actualiza tabla de productos"| D2
    ADM -->|"Ajuste manual de unidades y cantidad_warning"| P42
    P42 -->|"Actualiza inventario en tabla stock"| D3

    %% Flujos Alertas
    D3 -->|"Lectura de stock actual y reservado"| P51
    P51 -->|"Inserta alerta si disponible <= cantidad_warning"| D7
    D7 -->|"Lectura de alertas pendientes (atendida = false)"| P52
    P52 -->|"Muestra popup informativo en panel"| ADM
    ADM -->|"Acción de atender alerta"| P52
    P52 -->|"Actualiza registro a atendida = true"| D7

    %% Flujos Cron de Vencidos
    CRON -->|"Invocación HTTP semanal con Bearer CRON_SECRET (Viernes 23:59 ART)"| P61
    P61 -->|"Dispara transacción de cancelación"| P62
    D4 -->|"Filtra pedidos en Pendiente de Pago"| P62
    P62 -->|"Actualiza pedidos vencidos a Cancelado"| D4
    P62 -->|"Actualiza comprobantes pendientes a Rechazado"| D5
    P62 -->|"Libera cantidad_reservada (resta cantidad)"| D3
    P62 -->|"Responde 200 con total de cancelados"| CRON
```

---

## 5. Nivel 3 · Detalle Transaccional de Procesos Críticos

El Nivel 3 realiza la explosión de las transacciones atómicas más importantes del e-commerce:

### 5.1 Transacción Atómica de Creación de Pedido con Reserva (`crear_pedido`)

Explosión detallada del proceso 2.1 / 2.2. Garantiza que no se sobrevenda stock disponible.

```mermaid
flowchart TD
    %% Actores y Almacenes
    CLI["Cliente (Navegador)"]
    subgraph ALMACENES ["Almacenes Involucrados"]
        direction TB
        D1[("D1: CLIENTE")]
        D2[("D2: PRODUCTO")]
        D3[("D3: STOCK")]
        D4[("D4: PEDIDO")]
    end

    %% Transacción Atómica
    subgraph TX1 ["Transacción crear_pedido (Reserva de Stock)"]
        direction TB
        P211(("2.1.1 Recibir Carrito del Cliente y Contacto"))
        P212(("2.1.2 Upsert de Cliente por Email"))
        P213(("2.1.3 Validar Actividad y Stock Disponible"))
        P214(("2.1.4 Calcular Subtotal y Total en BD"))
        P215(("2.1.5 Insertar Pedido y Detalle con Historial"))
        P216(("2.1.6 Incrementar Reserva de Stock"))
    end

    CLI -->|"Envía items del carrito (cliente) y datos de contacto"| P211
    P211 -->|"Verifica formato de email y DNI"| P212
    P212 -->|"Upsert en tabla cliente"| D1
    P212 -->|"Cliente verificado"| P213

    D2 -->|"Verifica producto.activo = true"| P213
    D3 -->|"Verifica cantidad_actual - cantidad_reservada >= cantidad"| P213

    P213 -->|"Stock suficiente confirmado"| P214
    D2 -->|"Toma precio vigente de la base de datos"| P214
    P214 -->|"Calcula subtotal de línea y suma total"| P215

    P215 -->|"Inserta en pedido (Pendiente de Pago)"| D4
    P215 -->|"Inserta líneas en detalle_del_pedido"| D4
    P215 -->|"Inserta estado inicial en estados_pedidos"| D4

    P215 -->|"Confirmación de pedido registrado"| P216
    P216 -->|"Actualiza stock: cantidad_reservada += cantidad"| D3
    P216 -->|"Devuelve id_pedido y total oficial a abonar"| CLI
```

### 5.2 Transacción Atómica de Validación Manual y Emisión de Remito (`aprobar_comprobante`)

Explosión detallada del proceso 3.2 / 3.3. Representa el hito final de venta del MVP.

```mermaid
flowchart TD
    %% Actores Externos
    subgraph ACTORES ["Actores Involucrados"]
        direction LR
        ADM["Administrador de Química"]
        CLI["Cliente"]
    end

    %% Almacenes Involucrados
    subgraph ALMACENES ["Almacenes Involucrados"]
        direction TB
        D3[("D3: STOCK")]
        D4[("D4: PEDIDO")]
        D5[("D5: COMPROBANTE")]
        D6[("D6: REMITO_VENTA")]
    end

    %% Transacción Atómica
    subgraph TX2 ["Transacción aprobar_comprobante (Venta y Remito)"]
        direction TB
        P331(("3.3.1 Cotejar Monto de Comprobante vs Total"))
        P332(("3.3.2 Transición Atómica de Estados"))
        P333(("3.3.3 Descontar Stock Físico y Liberar Reserva"))
        P334(("3.3.4 Generar Remito de Venta Correlativo"))
        P335(("3.3.5 Despachar Correo Asíncrono (Resend)"))
    end

    ADM -->|"Aprueba comprobante verificado en panel"| P331
    D5 -->|"Monto del comprobante subido"| P331
    D4 -->|"Total exigido del pedido"| P331

    P331 -->|"Monto coincide exactamente"| P332
    P332 -->|"Actualiza pedido a Pago Validado e inserta en estados_pedidos"| D4
    P332 -->|"Actualiza comprobante a Aprobado por Admin e inserta en estados_comprobante"| D5

    P332 -->|"Aprobación asentada"| P333
    P333 -->|"STOCK: cantidad_actual -= cantidad y cantidad_reservada -= cantidad"| D3

    P333 -->|"Stock actualizado"| P334
    P334 -->|"Inserta remito con número R-YYYY-NNNNNN"| D6

    P334 -->|"Remito persistido"| P335
    P335 -->|"Envía email con remito HTML al cliente"| CLI
```

### 5.3 Proceso Automático del Cron Semanal (`cancelar_pedidos_vencidos`)

Explosión detallada del proceso 6.0. Cancela pedidos pendientes de pago los viernes por la noche y devuelve el stock al catálogo.

```mermaid
flowchart TD
    CRON["Vercel Cron Trigger"]

    %% Almacenes Involucrados
    subgraph ALMACENES ["Almacenes Involucrados"]
        direction TB
        D3[("D3: STOCK")]
        D4[("D4: PEDIDO")]
        D5[("D5: COMPROBANTE")]
    end

    %% Proceso Atómico
    subgraph TX_CRON ["Proceso cancelar_pedidos_vencidos (Cron)"]
        direction TB
        P621(("6.2.1 Invocación con Bearer CRON_SECRET"))
        P622(("6.2.2 Identificar Pedidos en Pendiente de Pago"))
        P623(("6.2.3 Transición a Cancelado y Rechazado"))
        P624(("6.2.4 Liberar Stock Reservado"))
        P625(("6.2.5 Registrar Auditoría y Retornar Balance"))
    end

    CRON -->|"POST /api/cron/vencidos los viernes 23:59 ART"| P621
    P621 -->|"Token validado"| P622
    D4 -->|"Filtra pedidos con estado_actual = Pendiente de Pago"| P622

    P622 -->|"Lista de pedidos vencidos"| P623
    P623 -->|"Actualiza pedido a Cancelado e inserta en historial estados_pedidos"| D4
    P623 -->|"Actualiza comprobantes asociados a Rechazado e inserta en estados_comprobante"| D5

    P623 -->|"Pedidos cancelados"| P624
    P624 -->|"Libera reserva: STOCK.cantidad_reservada -= cantidad"| D3

    P624 -->|"Stock restituido a disponible"| P625
    P625 -->|"Responde HTTP 200 con cantidad de pedidos cancelados"| CRON
```

### 5.4 Ciclo de Detección y Notificación de Alertas de Stock

Explosión detallada del proceso 5.0.

```mermaid
flowchart TD
    ADM["Administrador de Química"]

    %% Almacenes Involucrados
    subgraph ALMACENES ["Almacenes Involucrados"]
        direction TB
        D3[("D3: STOCK")]
        D7[("D7: ALERTA_STOCK")]
    end

    %% Ciclo de Detección
    subgraph CICLO_ALERTAS ["Ciclo de Detección y Popup de Alertas"]
        direction TB
        P511(("5.1.1 Calcular Stock Disponible"))
        P512(("5.1.2 Comparar contra Cantidad Warning"))
        P513(("5.1.3 Registrar Alerta de Stock Bajo"))
        P521(("5.2.1 Consultar Alertas No Atendidas"))
        P522(("5.2.2 Desplegar Popup Informativo en Panel"))
        P523(("5.2.3 Marcar Alerta como Atendida"))
    end

    D3 -->|"Lee cantidad_actual y cantidad_reservada"| P511
    P511 -->|"disponible = cantidad_actual - cantidad_reservada"| P512
    D3 -->|"Lee cantidad_warning (umbral de aviso)"| P512

    P512 -->|"Condición cumplida: disponible <= cantidad_warning"| P513
    P513 -->|"Inserta fila en alerta_de_estado con atendida = false"| D7

    ADM -->|"Accede al panel /admin con Basic Auth"| P521
    D7 -->|"Recupera alertas con atendida = false"| P521
    P521 -->|"Envía alertas activas a la interfaz"| P522
    P522 -->|"Muestra popup de advertencia en pantalla"| ADM

    ADM -->|"Cierra o confirma la alerta desde el panel"| P523
    P523 -->|"Actualiza atendida = true en alerta_de_estado"| D7
```

---

## 6. Trazabilidad con el Modelo de Datos y Reglas de Dominio

| Componente del DFD | Tabla Física en Supabase | Regla de Dominio ([`docs/MODELO.md`](../MODELO.md)) |
|---|---|---|
| **D1: CLIENTE** | `cliente` | Identificación por `email` (único en minúsculas) y `dni` válido. |
| **D2: PRODUCTO** | `producto` | Cosmética/higiene (`precio > 0`). Baja lógica con `activo = false`. |
| **D3: STOCK** | `stock` | `disponible = cantidad_actual - cantidad_reservada`. Umbral en `cantidad_warning`. |
| **D4: PEDIDO** | `pedido`, `detalle_del_pedido`, `estados_pedidos` | `total = SUM(subtotal)`. Estados: `Pendiente de Pago`, `Pago Validado`, `Rechazado`, `Cancelado`. |
| **D5: COMPROBANTE** | `comprobante`, `estados_comprobante` | `monto > 0` coincidente con total. Estados: `Comprobante Subido`, `Aprobado por Admin`, `Rechazado`. |
| **D6: REMITO_VENTA** | `remitos_de_venta` | Documento final del MVP emitido al aprobar pago (`R-YYYY-NNNNNN`). Encriptado y enviado por Resend. |
| **D7: ALERTA_STOCK** | `alerta_de_estado` | Popup en `/admin` cuando `disponible <= cantidad_warning`. Sin correos electrónicos al Administrador. |
| **Carrito (Cliente)** | *Ninguna (localStorage / Cookies)* | El carrito no se persiste en BD en el MVP ni reserva stock por sí mismo. |
| **Cron Semanal** | RPC `cancelar_pedidos_vencidos()` | Ejecución los viernes 23:59 ART (`America/Argentina/Buenos_Aires`). Libera reserva y cancela pedidos impagos. |
