# El MVP termina en Pago Validado + remito, sin envío

**Status:** accepted · 2026-10-22

El alcance de la fase 1 termina cuando el Administrador aprueba el comprobante: se descuenta el stock, se genera el remito de venta en HTML y se envía por email al Cliente. No hay envío, seguimiento ni estados `En Preparación`, `Enviado` o `Entregado`.

**Alternativa descartada:** modelar el ciclo logístico completo. Se descartó porque el proyecto no incluye envío de pedidos y agregaría estados y tablas sin uso real.

**Consecuencias:** el estado final del pedido es `Pago Validado`; el remito es el documento final; el panel `/admin` no necesita acciones de despacho. La fase 2 puede agregar logística sin romper el modelo.
