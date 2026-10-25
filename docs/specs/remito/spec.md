# Spec · Remito y email al Cliente (`T8`)

> **Feature:** `front-mvp/remito` · **Estado:** publicada para implementación · **Fecha:** 2026-10-25.
> **Origen:** gate de arranque del issue [#14](https://github.com/juanmamerodio/esenciatecnica/issues/14);
> `docs/specs/front-mvp/spec.md` §4 (tajada T8) no fijaba criterios propios y este documento los fija.
> **Depende de:** `T7 · Admin` ([#13](https://github.com/juanmamerodio/esenciatecnica/issues/13)), que dejó
> el panel y la aprobación contra los RPC, y de la migración `02`, que ya emite el remito con su número.
> **Fuente de verdad:** [`GLOSSARY.md`](../../../GLOSSARY.md) (*Remito de venta*), [`docs/MODELO.md`](../../MODELO.md)
> §3 y §4.1, [`AGENTS.md`](../../../AGENTS.md) §5.4 y §5.5.

---

## 1. Problema

La base ya emite el remito: `aprobar_comprobante` descuenta el stock, libera la reserva, deja el pedido
en `Pago Validado` e inserta una fila en `remitos_de_venta` con su `numero` único (`R-AAAA-NNNNNN`).
Lo que **no** existe es el documento: el Cliente no recibe nada, y el Administrador no puede ver ni
reenviar el remito de una venta ya aprobada. El issue #14 lo pide explícito: “al aprobar el comprobante,
el Administrador obtiene un remito de venta y el Cliente lo recibe por email”.

El riesgo de implementarlo mal es doble: prometer envío o seguimiento —que el MVP no tiene— o atar la
venta al correo, de modo que un fallo de Resend revierta o duplique una aprobación que la base ya cerró.

## 2. Solución

1. **El remito lo sigue emitiendo la base**, en la misma transacción de la aprobación. El front no lo
   crea ni lo numera: lo **compone** para mostrarlo y enviarlo (`AGENTS.md` §5.10).
2. Un **módulo puro** `src/lib/remito.ts` con dos funciones públicas:
   - `componerRemito(datos)` → número, asunto, HTML y texto plano del remito, a partir del pedido, el
     Cliente y sus líneas. Sin datos inventados: solo lo que el modelo tiene.
   - `enviarRemito(puerto, datos)` → envía por un puerto de correo y devuelve `ok` o `error` tipado. El
     envío **nunca** forma parte de la transacción de aprobación.
3. El adaptador real vive en `src/lib/remito-servidor.ts` (Resend, `RESEND_API_KEY`): inicializa el
   cliente **por llamada**, no al importar, para que el build no dependa de la clave (hoy
   `src/app/api/notifications/route.ts` la instancia al importar y rompe `npm run build`; se corrige acá).
4. **Al aprobar** (`POST /api/admin/comprobantes`): primero la venta, después el correo. Si el correo
   falla, la respuesta lo dice (`aviso`) y el panel ofrece **reenviar**: la venta no se revierte ni se
   duplica. El reenvío tiene su propio borde (`POST /api/admin/remito`).
5. **El Administrador ve el remito**: página imprimible `/admin/remito/[idComprobante]` (server-side, bajo
   la misma Basic Auth que el panel) y un acceso desde la fila del pedido aprobado.

## 3. Historias y criterios de aceptación

### HU-1 · Un remito por venta

**Como** Administrador, **quiero** que la aprobación emita un remito único **para** acreditar la venta.

- **Given** un comprobante pendiente cuyo monto coincide, **When** apruebo, **Then** la respuesta trae el
  `numero` y el `total` del remito emitido por la base.
- **Then** dos aprobaciones concurrentes **no** duplican: lo garantiza la base (`id_comprobante` único y
  `ET004` si el comprobante ya no está pendiente), y el módulo no crea remitos.

### HU-2 · El Cliente recibe el remito

- **Then** el email sale al `email` del Cliente del pedido, con el número del remito, la fecha, la lista
  de productos (cantidad × precio unitario = subtotal) y el total.
- **Then** el asunto y el cuerpo dicen **Esencia Técnica** y la institución; no dicen “QuimicaShop”.
- **Then** `RESEND_API_KEY` vive solo en el servidor: ningún archivo `"use client"` la lee ni importa el
  adaptador.

### HU-3 · Sin promesas que el MVP no cumple

- **Then** ni el remito ni el email prometen envío, seguimiento ni estados posteriores a `Pago Validado`
  (`AGENTS.md` §5.5). Se aclara que el retiro o la entrega se acuerdan aparte.
- **Then** el remito no inventa datos fiscales (CUIT, IVA, domicilio) que el modelo no tiene.

### HU-4 · Un fallo de correo no toca la venta

- **Given** que Resend falla, **When** apruebo, **Then** el pedido queda `Pago Validado`, el remito existe
  (uno solo) y la respuesta avisa del fallo sin revertir nada.
- **Given** ese caso, **When** reenvío el remito, **Then** el Cliente lo recibe y **no** se emite un
  segundo remito.
- **Then** el fallo se registra en el log del servidor con su motivo (no se silencia).

### HU-5 · Visible desde el panel

- **Then** el pedido aprobado muestra su número de remito y lleva a la página imprimible.
- **Then** la página del remito se ve sin el resto del panel (para imprimir) y respeta mobile,
  accesibilidad y contraste AA.

## 4. Seams bajo test

| Seam | Cubre | Deja afuera |
|---|---|---|
| `src/lib/remito.ts` con un puerto de correo falso (sin red) | composición del documento y del email, destinatario, ausencia de promesas de envío, `ok`/`error` del envío, y que un fallo no altere la venta | Resend, el panel, el render |
| `tests/db/aprobacion.test.ts` (ya existe) | un solo remito por comprobante, numeración única y estado final `Pago Validado` | el correo |
| Estructura de los archivos | `RESEND_API_KEY` solo en el servidor, el remito no se crea en el front, la ruta imprimible existe | automatización de UI |
| Verificación manual | que el email llegue y se vea bien (una vez, con la clave real) | automatización de UI |

## 5. Fuera de alcance

- PDF adjunto: el modelo no lo pide y el remito HTML cumple la función del MVP.
- Datos fiscales, envío y seguimiento: fuera del MVP (`AGENTS.md` §5.5).
- Reintentos automáticos con backoff: el reenvío es manual y explícito.
- El puente `/api/notifications` hacia Teams (`AGENTS.md` §3): solo se le corrige la inicialización de
  Resend, no se migra.

## 6. Decisiones tomadas

1. **El remito lo emite la base, el front lo compone**: una sola fuente de numeración y una sola
   transacción de venta.
2. **El correo es post-aprobación y no bloqueante**: la venta no depende de Resend (`AGENTS.md` §5.4).
3. **Reenvío manual**: barato, explícito y suficiente para el MVP; un reintento automático podría duplicar
   correos sin que nadie lo note.
4. **Remito HTML, sin PDF**: el documento se imprime desde el navegador si hace falta.
5. **Sin datos fiscales**: el modelo no los tiene y no se inventan.
