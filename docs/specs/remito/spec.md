# Spec · Remito y email al Cliente (`T8`)

> **Feature:** `front-mvp/remito` · **Estado:** implementada en repo · **Fecha:** 2026-10-25, revisado el 2026-10-27.
> **Verificación en vivo:** pendiente (depende del issue #16 y de las claves del issue #20).
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

**Como** Cliente, **quiero** recibir el remito por email, **para** tener el comprobante de la compra.

- **Then** el email sale al `email` del Cliente del pedido, con el número del remito, la fecha, la lista
  de productos (cantidad × precio unitario = subtotal) y el total.
- **Then** el asunto y el cuerpo dicen **Esencia Técnica** y la institución; no dicen “QuimicaShop”.
- **Then** `RESEND_API_KEY` vive solo en el servidor: ningún archivo `"use client"` la lee ni importa el
  adaptador.

### HU-3 · Sin promesas que el MVP no cumple

**Como** Cliente, **quiero** que el remito no prometa envío ni seguimiento, **para** no esperar algo que el proyecto no incluye.

- **Then** ni el remito ni el email prometen envío, seguimiento ni estados posteriores a `Pago Validado`
  (`AGENTS.md` §5.5). Se aclara que el retiro o la entrega se acuerdan aparte.
- **Then** el remito no inventa datos fiscales (CUIT, IVA, domicilio) que el modelo no tiene.

### HU-4 · Un fallo de correo no toca la venta

**Como** Administrador de Química, **quiero** que un fallo de correo no revierta la aprobación, **para** no perder una venta ya cerrada.

- **Given** que Resend falla, **When** apruebo, **Then** el pedido queda `Pago Validado`, el remito existe
  (uno solo) y la respuesta avisa del fallo sin revertir nada.
- **Given** ese caso, **When** reenvío el remito, **Then** el Cliente lo recibe y **no** se emite un
  segundo remito.
- **Then** el fallo se registra en el log del servidor con su motivo (no se silencia).

### HU-5 · Visible desde el panel

**Como** Administrador de Química, **quiero** ver el número de remito del pedido aprobado, **para** reimprimirlo o reenviarlo.

- **Then** el pedido aprobado muestra su número de remito y lleva a la página imprimible.
- **Then** la página del remito se ve sin el resto del panel (para imprimir) y respeta mobile,
  accesibilidad y contraste AA.

## 4. Decisiones de implementación

1. **El remito lo emite la base, el front lo compone**: una sola fuente de numeración y una sola
   transacción de venta.
2. **El correo es post-aprobación y no bloqueante**: la venta no depende de Resend (`AGENTS.md` §5.4).
3. **Reenvío manual**: barato, explícito y suficiente para el MVP; un reintento automático podría duplicar
   correos sin que nadie lo note.
4. **Remito HTML, sin PDF**: el documento se imprime desde el navegador si hace falta.
5. **Sin datos fiscales**: el modelo no los tiene y no se inventan.

## 5. Decisiones de testing

| Seam | Cubre | Deja afuera |
|---|---|---|
| `src/lib/remito.ts` con un puerto de correo falso (sin red) | composición del documento y del email, destinatario, ausencia de promesas de envío, `ok`/`error` del envío, y que un fallo no altere la venta | Resend, el panel, el render |
| `tests/db/aprobacion.test.ts` (ya existe) | un solo remito por comprobante, numeración única y estado final `Pago Validado` | el correo |
| Estructura de los archivos | `RESEND_API_KEY` solo en el servidor, el remito no se crea en el front, la ruta imprimible existe | automatización de UI |
| Verificación manual | que el email llegue y se vea bien (una vez, con la clave real) | automatización de UI |

## 6. Fuera de alcance

- PDF adjunto: el modelo no lo pide y el remito HTML cumple la función del MVP.
- Datos fiscales, envío y seguimiento: fuera del MVP (`AGENTS.md` §5.5).
- Reintentos automáticos con backoff: el reenvío es manual y explícito.
- El puente `/api/notifications` hacia Teams (`AGENTS.md` §3): solo se le corrige la inicialización de
  Resend, no se migra.

## 7. Notas finales

- El remito lo **emite la base** en la misma transacción de la aprobación; el front lo compone y lo envía.
- El email es **posterior y no bloqueante**: cuando se intenta mandar, la venta ya está cerrada, y un fallo se avisa en el panel sin revertir nada.
- Un remito por comprobante: reintentar el envío reutiliza el mismo número.
- El envío real depende de `RESEND_API_KEY` (#20).

## 8. Estado de implementación (auditoría del 2026-10-27)

Auditoría de cada HU contra el código de `src/` y los tests de `tests/front/` y `tests/db/`. El remito lo
emite la base (RPC); el front lo lee, lo compone y lo envía por Resend. El email es posterior y no
bloqueante: si falla, la venta ya está cerrada y el panel ofrece reenviar. El comportamiento de “el email
falló” está implementado en `src/components/admin/comun.ts` y `PanelDePedidos.tsx` (issue #19).

| Criterio / HU | Estado | Evidencia |
|---|---|---|
| HU-1 · La aprobación devuelve `numero` y `total` del remito | implementado, sin verificar en vivo | `src/lib/admin.ts:413-427`; `src/app/api/admin/comprobantes/route.ts:34-46`; test `tests/db/aprobacion.test.ts:31-39` |
| HU-1 · Un solo remito por comprobante; el módulo no crea ni numera | implementado, sin verificar en vivo | `src/lib/remito.ts:7-8`; test `tests/front/remito.test.ts:191`; `tests/db/aprobacion.test.ts:86,97` |
| HU-2 · El email sale al `email` del Cliente con número, fecha, líneas y total | implementado, sin verificar en vivo | `src/lib/remito.ts:157-188,190-282`; tests `tests/front/remito.test.ts:115,155` |
| HU-2 · Asunto y cuerpo con Esencia Técnica y la institución | implementado | `src/lib/remito.ts:191,229,259`; test `tests/front/remito.test.ts:127-128` |
| HU-2 · `RESEND_API_KEY` solo en el servidor | implementado | `src/lib/remito-servidor.ts:93`; tests `tests/front/remito.test.ts:229,237` |
| HU-3 · Sin promesas de envío, seguimiento ni estados posteriores | implementado | `src/lib/remito.ts:214-215,255`; test `tests/front/remito.test.ts:132` |
| HU-3 · Sin datos fiscales inventados | implementado | `src/lib/remito.ts:190-282`; test `tests/front/remito.test.ts:139` |
| HU-4 · Fallo de Resend no revierte la venta y vuelve como `aviso` | implementado | `src/app/api/admin/comprobantes/route.ts:40-46`; `src/lib/remito.ts:173-184`; `src/components/admin/comun.ts:51-52`; `src/components/admin/PanelDePedidos.tsx:80-86,117-121`; tests `tests/front/aviso-remito.test.ts:30,99`; `tests/front/remito.test.ts:169` |
| HU-4 · Reenvío manual sin emitir un segundo remito | implementado | `src/app/api/admin/remito/route.ts:16-44`; `src/components/admin/PanelDePedidos.tsx:40-56,261-276`; tests `tests/front/remito.test.ts:191,204` |
| HU-4 · El fallo queda en el log del servidor | implementado | `src/lib/remito.ts:175-178`; `src/app/api/admin/remito/route.ts:33` |
| HU-5 · El panel muestra número de remito y link imprimible | implementado | `src/components/admin/PanelDePedidos.tsx:244-259`; test `tests/front/remito.test.ts:221` |
| HU-5 · Página imprimible sin el resto del panel, mobile y AA | implementado, sin verificar en vivo | `src/app/admin/remito/[idComprobante]/page.tsx:48,77,80-83`; test `tests/front/remito.test.ts:212` |

### Pendiente

- Verificación en vivo del envío real por Resend (el email llega y se ve bien): issue #20
  (`RESEND_API_KEY`).
- Verificación en vivo de `aprobar_comprobante` y `remitos_de_venta` contra `otjph…`: issue #15/#16. Los
  tests de PGlite ya cubren la regla; falta la base real.
- Verificación manual de la página imprimible (mobile, foco, contraste AA), con la base migrada. Vive en
  la punta a punta **#23**.
- El fallo de correo y el reenvío ya están implementados (issue #19); no queda código pendiente en esa
  parte.

> El ticket `T8 · Remito y email al Cliente` (**#14**) se cerró el 2026-10-28 con su comentario de
> evidencia: la implementación y sus tests están en `main` y lo único que falta es la verificación en vivo
> de arriba.
