# Spec · Carrito (`T4`)

> **Feature:** `front-mvp/carrito` · **Estado:** publicada para implementación · **Fecha:** 2026-10-23.
> **Origen:** gate de arranque del issue [#9](https://github.com/juanmamerodio/esenciatecnica/issues/9);
> `docs/specs/front-mvp/spec.md` §4 (tajada T4) no fijaba criterios propios y este documento los fija.
> **Depende de:** `T1 · Home` ([#5](https://github.com/juanmamerodio/esenciatecnica/issues/5)) y
> `T2 · Catálogo` ([#6](https://github.com/juanmamerodio/esenciatecnica/issues/6)), que dejaron el módulo de
> catálogo, la card y el buscador.
> **Fuente de verdad:** [`GLOSSARY.md`](../../../GLOSSARY.md), [`docs/MODELO.md`](../../MODELO.md),
> [`AGENTS.md`](../../../AGENTS.md) §5.2.

---

## 1. Problema

No hay carrito real: la card no ofrece agregar, el contador del header está en 0 y `/cart` muestra
componentes con el vocabulario legacy (`priceArs`, `name`) que no comparten nada con el catálogo
canónico. Sin carrito no hay camino al checkout.

## 2. Solución

Un módulo **puro** (`src/lib/carrito.ts`) con toda la aritmética del carrito y un adaptador de
persistencia en el cliente (zustand). El carrito:

- vive en el navegador (`localStorage`), **no** escribe en la base ni reserva stock: la reserva ocurre
  recién al confirmar el pedido (T5, `AGENTS.md` §5.2);
- tiene **una sola línea por producto** (el modelo rechaza el producto repetido en `DETALLE_PEDIDO`);
- guarda `id`, `nombre`, `precio`, `cantidad` y la `disponible` que tenía el producto al agregarse, para
  no ofrecer más unidades de las que hay;
- calcula el total como `SUM(precio × cantidad)` redondeado a dos decimales (el modelo usa
  `NUMERIC(12,2)`).

## 3. Historias y criterios de aceptación

### HU-1 · Agregar desde la grilla

**Como** Cliente, **quiero** agregar un producto **para** armarme el pedido.

- **Given** un producto con stock, **When** lo agrego, **Then** aparece una línea con cantidad 1 y el
  contador del header sube.
- **Given** el mismo producto dos veces, **Then** queda **una sola** línea con la cantidad sumada.
- **Given** un producto sin stock (`disponible = 0`), **Then** la card no ofrece agregarlo.
- **Given** un producto con 2 unidades disponibles, **When** intento agregar 3, **Then** el carrito
  guarda 2.

### HU-2 · Editar y quitar

- **Then** cada línea permite subir y bajar la cantidad, con la cantidad actual visible.
- **Then** bajar de 1 quita la línea, y hay un botón explícito para quitar.
- **Then** la cantidad nunca supera lo disponible ni baja de 1 sin quitar la línea.

### HU-3 · Totales

- **Then** el resumen muestra el subtotal por línea y el total del pedido.
- **Then** el total es la suma de `precio × cantidad` y coincide con lo que se cobra, redondeado a dos
  decimales.
- **Then** el contador del header cuenta **unidades**, no líneas.

### HU-4 · Persistencia

- **Then** recargar la página o navegar no pierde el carrito (vive en `localStorage`).
- **Then** vaciar el carrito deja el contador en 0 y el estado vacío visible.

### HU-5 · Estado vacío y accesibilidad

- **Then** el carrito vacío explica qué hacer y lleva al catálogo.
- **Then** los controles de cantidad tienen nombre accesible, foco visible y llegan con teclado.
- **Then** una sola columna en mobile, sin desbordes horizontales.

### HU-6 · Sin reserva de stock

- **Then** agregar, editar o quitar **no** hace ninguna llamada a la base: el módulo es puro y el
  adaptador sólo escribe en `localStorage`.
- **Then** el botón del carrito lleva al checkout, que es quien va a reservar stock en T5.

## 4. Seams bajo test

| Seam | Cubre | Deja afuera |
|---|---|---|
| Módulo `src/lib/carrito.ts` (funciones puras, sin DOM) | una línea por producto, tope por disponible, sin stock no agrega, editar/quitar, total y contador, redondeo a dos decimales | render, `localStorage` |
| Verificación en navegador de `/` y `/cart` | agregar, contador, persistencia al recargar, estado vacío | automatización de UI |

No se agregan dependencias: sin jsdom ni Testing Library (`AGENTS.md` §4 y §8).

## 5. Fuera de alcance

- Confirmar el pedido, subir el comprobante y reservar stock: **T5**.
- Cuentas de Cliente y carrito persistido en Supabase: fuera del MVP.
- Cupones, descuentos y envío: no están en el modelo.

## 6. Decisiones tomadas

1. **Módulo puro + adaptador:** la aritmética se testea sin DOM y el adaptador sólo persiste.
2. **Clave de almacenamiento `esenciatecnica-carrito`:** se retira el nombre legacy del proyecto.
3. **Tope por `disponible`:** el carrito no promete unidades que la vista no ofrece hoy.
4. **Total redondeado a dos decimales:** el dinero del modelo es `NUMERIC(12,2)`.
