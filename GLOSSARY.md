# Glosario · Esencia Técnica

> **Contexto:** e-commerce de productos de cosmética e higiene elaborados por el Departamento de Química de la E.E.S.T N°1 Luciano Reyes.
> **Alcance:** solo el e-commerce. El Hub y el entorno Teams usan su propio vocabulario en el repo `quimicashop`.
> **Regla:** este archivo define vocabulario, no implementación. El modelo y las reglas están en `docs/MODELO.md`.

---

## Términos del dominio

### Administrador (de Química)

Persona del Departamento de Química con permiso para validar comprobantes, gestionar stock y ver las alertas del panel. Es el único rol autenticado del sistema en la fase 1. No es un Cliente.

### Alerta de stock

Aviso que ve el Administrador cuando el stock disponible de un Producto cae por debajo o igual al umbral de aviso. Se muestra en el panel; no se envía por email al Administrador. No confundir con el email de remito al Cliente.

### Carrito

Selección de Productos que el Cliente arma antes de confirmar el Pedido. No reserva stock por sí solo: la reserva ocurre al confirmar el Pedido. En el MVP vive en el cliente (cookie/localStorage); no se persiste en Supabase. No es un Pedido.

### Cliente

Persona que compra en la tienda. Se identifica por DNI y datos de contacto. En la fase 1 no tiene cuenta ni login: compra como invitado. No es el Administrador.

### Comprobante

Prueba de la transferencia bancaria: imagen y monto. El Cliente lo sube para acreditar el pago de un Pedido. Su validación es manual. No es el remito.

### Detalle del pedido

Línea de un Pedido: un Producto, una cantidad, un precio unitario y un subtotal. No tiene estado propio; el estado pertenece al Pedido.

### Estado del comprobante

Etapa actual de un Comprobante. Valores canónicos: `Comprobante Subido`, `Aprobado por Admin`, `Rechazado`. El historial completo se conserva; el estado actual es el último.

### Estado del pedido

Etapa actual de un Pedido. Valores canónicos del MVP: `Pendiente de Pago`, `Pago Validado`, `Rechazado`, `Cancelado`. `Pago Validado` es el estado final: descuenta stock, genera el remito y envía el email. No hay `En Preparación`, `Enviado` ni `Entregado` porque el MVP no incluye envío. El historial completo se conserva; el estado actual es el último.

### Pedido

Confirmación de compra de un Cliente. Agrupa uno o más Detalles del pedido, tiene fecha, total y estado actual. No es el Carrito.

### Pedido vencido

Pedido que llega al cierre del viernes sin Comprobante aprobado. Se cancela y libera la reserva de stock. El cierre es el **viernes 23:59 de la hora argentina** (`America/Argentina/Buenos_Aires`). También se lo puede llamar “pedido expirado”; el término canónico es **Pedido vencido**.

### Producto

Artículo de cosmética o higiene elaborado por el Departamento de Química y ofrecido en la tienda. Tiene nombre, categoría, tipo, descripción, precio y tiempo de producción. No es un insumo de laboratorio ni el contenido de muestra del prototipo.

### Remito de venta

Documento que acredita la venta de los Productos de un Pedido aprobado. Se genera al aprobar el Comprobante y se envía por email al Cliente. Es el documento final del MVP: no hay envío ni seguimiento. No es el Comprobante.

### Reserva

Unidades de Stock apartadas para un Pedido mientras su Comprobante espera validación. No es una venta. Se libera si el Pedido se rechaza o vence; se convierte en venta si el Comprobante se aprueba.

### Rol

Perfil de permisos de un Administrador (por ejemplo, administrador general). No confundir con el rol del equipo de desarrollo en `quimicashop`.

### Stock

Existencias físicas de un Producto, medidas en unidades. Distingue cantidad disponible, cantidad reservada y umbral de aviso. El stock disponible es la cantidad actual menos la reservada.

### Validación manual

Revisión que hacen los Administradores de Química comparando la imagen y el monto del Comprobante con el Pedido, y deciden aprobarlo o rechazarlo. No interviene IA: en el sistema final la validación automática no existe. Es el único flujo oficial de validación de pagos.

---

## Marca y nombres

- **Esencia Técnica** es el nombre canónico del proyecto y de la tienda.
- **QuimicaShop** es el nombre anterior; se conserva solo en nombres de repos, tablas o URLs históricas. No se usa en la UI, los emails ni la documentación nueva.

---

## Fuera del MVP

Estos conceptos no forman parte de la fase 1; no agregarlos sin una decisión nueva:

- Envío, seguimiento y estados `En Preparación`, `Enviado`, `Entregado`.
- Cuentas de Cliente y carrito persistente en Supabase.
- Administradores en base (`ADMIN`/`ROL`); el MVP usa Basic Auth.
- Validación por IA. En el sistema final no existe.

---

## Términos retirados

No usar en código, documentación ni conversaciones nuevas:

| Término retirado | Por qué |
|---|---|
| `productos`, `pedidos`, `verificaciones` | Nombres del esquema legacy; la base nueva usa `producto`, `pedido`, `comprobante`, etc. **Excepción:** el bucket de Storage `productos` conserva ese nombre a propósito; no es la tabla legacy ni se renombra. |
| `nombre_es` / `nombre_en` | El sistema es español único; el Producto tiene un solo nombre. |
| `precio_ars` | El precio canónico es `precio`; la moneda es ARS por contexto. |
| `pre_aprobado`, `comprobante_subido`, `pendiente` | Nombres de estado del código legacy; usar los estados canónicos de este glosario. |
| `verificación por IA`, `Gemini`, `log_ia` | Flujo de validación automática retirado; la validación es manual. |
| `favoritos`, `ofertas` | Fuera del alcance de la fase 1. |
| `Roll` | Typo histórica; el término canónico es **Rol**. |
| `QuimicaShop` | Nombre anterior; usar **Esencia Técnica**. |

---

## Frases que resumen las reglas

- “El comprobante se aprueba a mano, no con IA.”
- “El pedido reserva stock; el comprobante aprobado lo descuenta.”
- “Si no se paga, el viernes se libera la reserva.”
- “El remito va por email al cliente; la alerta de stock queda en el panel.”
- “El MVP termina en Pago Validado + remito: no hay envío.”
- “Los Administradores de Química revisan los pagos a mano.”
- “El carrito no reserva; el pedido sí.”
