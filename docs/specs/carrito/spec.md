# Spec · Carrito (`T4`)

> **Feature:** `front-mvp/carrito` · **Estado:** implementada en repo · **Verificación en vivo:** pendiente (depende del issue #16 y de las claves del issue #20) · **Fecha:** 2026-10-23, revisado el 2026-10-27.
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
- calcula el total como la **suma de los subtotales ya redondeados** (`precio × cantidad` por línea,
  redondeado a dos decimales). El dinero del modelo es `NUMERIC(12,2)` y la regla es una sola para toda
  la app (issue **#44**).

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

**Como** Cliente, **quiero** subir, bajar o quitar una línea del carrito, **para** ajustar el pedido antes de confirmarlo.

- **Then** cada línea permite subir y bajar la cantidad, con la cantidad actual visible.
- **Then** bajar de 1 quita la línea, y hay un botón explícito para quitar.
- **Then** la cantidad nunca supera lo disponible ni baja de 1 sin quitar la línea.

### HU-3 · Totales

**Como** Cliente, **quiero** ver el subtotal por línea y el total del pedido, **para** saber cuánto voy a transferir.

- **Then** el resumen muestra el subtotal por línea y el total del pedido.
- **Then** el total es la suma de los subtotales redondeados de `precio × cantidad` y coincide con lo que
  se cobra: es el mismo número que el checkout precarga para transferir, redondeado a dos decimales.
- **Then** el monto con centavos se muestra con dos decimales exactos (`$ 4,50`) y el entero sin
  decimales (`$ 3.000`).
- **Then** el contador del header cuenta **unidades**, no líneas.

### HU-4 · Persistencia

**Como** Cliente, **quiero** que el carrito sobreviva a una recarga, **para** no volver a cargar los productos.

- **Then** recargar la página o navegar no pierde el carrito (vive en `localStorage`).
- **Then** vaciar el carrito deja el contador en 0 y el estado vacío visible.

### HU-5 · Estado vacío y accesibilidad

**Como** Cliente, **quiero** entender un carrito vacío y manejarlo con el teclado, **para** saber qué hacer y no quedar trabado.

- **Then** el carrito vacío explica qué hacer y lleva al catálogo.
- **Then** los controles de cantidad tienen nombre accesible, foco visible y llegan con teclado.
- **Then** una sola columna en mobile, sin desbordes horizontales.

### HU-6 · Sin reserva de stock

**Como** Cliente, **quiero** que el carrito no toque la base, **para** que navegar no me reserve ni me descuente stock.

- **Then** agregar, editar o quitar **no** hace ninguna llamada a la base: el módulo es puro y el
  adaptador sólo escribe en `localStorage`.
- **Then** el botón del carrito lleva al checkout, que es quien va a reservar stock en T5.

## 4. Decisiones de implementación

1. **Módulo puro + adaptador:** la aritmética se testea sin DOM y el adaptador sólo persiste.
2. **Clave de almacenamiento `esenciatecnica-carrito`:** se retira el nombre legacy del proyecto.
3. **Tope por `disponible`:** el carrito no promete unidades que la vista no ofrece hoy.
4. **Total redondeado a dos decimales:** el dinero del modelo es `NUMERIC(12,2)`, el redondeo ocurre en la
   aritmética y el formato es adaptativo (entero sin decimales, con centavos con dos exactos).

---

## 5. Decisiones de testing

| Seam | Cubre | Deja afuera |
|---|---|---|
| Módulo `src/lib/carrito.ts` (funciones puras, sin DOM) | una línea por producto, tope por disponible, sin stock no agrega, editar/quitar, total y contador, redondeo a dos decimales | render, `localStorage` |
| Verificación en navegador de `/` y `/cart` | agregar, contador, persistencia al recargar, estado vacío | automatización de UI |

No se agregan dependencias: sin jsdom ni Testing Library (`AGENTS.md` §4 y §8).

## 6. Fuera de alcance

- Confirmar el pedido, subir el comprobante y reservar stock: **T5**.
- Cuentas de Cliente y carrito persistido en Supabase: fuera del MVP.
- Cupones, descuentos y envío: no están en el modelo.

## 7. Notas finales

- La regla del dinero es una sola: `subtotalDeLinea` redondea en la aritmética y `formatPrice` sólo muestra el número (#44). Si el carrito muestra un importe y el pedido se aprueba contra otro, es un bug.
- El carrito vive en `localStorage` y **no** reserva stock (AGENTS §5.2): reservar es del pedido confirmado.
- El contador del header cuenta unidades, no líneas: con un producto y cantidad 3 el Cliente espera ver «3».
- La verificación en navegador de `/cart` queda en #23, con la base migrada y las claves puestas.

## 8. Estado de implementación (auditoría del 2026-10-27)

`npm run typecheck` sin errores y `npm test` con 279 tests en 23 archivos, todos en verde. La aritmética se
testea contra el módulo puro; `localStorage` y el render **no** se ejecutan en el suite, así que la
persistencia y el contador quedan para la verificación manual.

| Criterio / HU | Estado | Evidencia |
|---|---|---|
| HU-1 · agregar deja una línea con cantidad 1 y sube el contador | implementado, sin verificar en vivo | `src/lib/carrito.ts:26-51`; test *«agrega un producto nuevo como una línea de cantidad 1»* en `tests/front/carrito.test.ts:30`; contador en `src/components/Header.tsx:27` |
| HU-1 · el mismo producto queda en una sola línea | implementado, sin verificar en vivo | `src/lib/carrito.ts:35-50`; test *«el mismo producto queda en una sola línea con la cantidad sumada»* en `tests/front/carrito.test.ts:34` |
| HU-1 · sin stock (`disponible = 0`), la card no ofrece agregar | implementado, sin verificar en vivo | `src/components/ProductCard.tsx:35-41`; test *«un producto sin stock no se agrega»* en `tests/front/carrito.test.ts:42` |
| HU-1 · con 2 disponibles, agregar 3 guarda 2 | implementado, sin verificar en vivo | `src/lib/carrito.ts:37`; test *«nunca supera las unidades disponibles»* en `tests/front/carrito.test.ts:46` |
| HU-2 · subir y bajar la cantidad, con la cantidad visible | implementado, sin verificar en vivo | `src/components/Carrito.tsx:65-90` (`aria-live` en `:78`); tests en `tests/front/carrito.test.ts:59` y `:133` |
| HU-2 · bajar de 1 quita la línea; hay botón explícito para quitar | implementado, sin verificar en vivo | `src/lib/carrito.ts:53-68` y `src/components/Carrito.tsx:96-103`; test *«bajar de 1 quita la línea»* en `tests/front/carrito.test.ts:70` |
| HU-2 · la cantidad nunca supera lo disponible ni baja de 1 | implementado, sin verificar en vivo | `src/lib/carrito.ts:57-60`; tests *«no supera lo disponible al subir la cantidad»* en `tests/front/carrito.test.ts:66` y `:133` |
| HU-3 · subtotal por línea y total del pedido | implementado, sin verificar en vivo | `src/components/Carrito.tsx:93` y `:116-119`; `subtotalDeLinea` en `src/lib/carrito.ts:71-77`; test *«el total es la suma de precio por cantidad»* en `tests/front/carrito.test.ts:89` |
| HU-3 · total = `precio × cantidad`, redondeado a dos decimales | implementado, sin verificar en vivo | `src/lib/carrito.ts:75-89`; tests *«redondea a dos decimales, como el dinero del modelo»* en `tests/front/carrito.test.ts:95` y *«el total suma los subtotales ya redondeados»* en `tests/front/formato-dinero.test.ts` |
| HU-3 · el contador del header cuenta unidades, no líneas | implementado, sin verificar en vivo | `src/lib/carrito.ts:91-94` y `src/components/Header.tsx:27`; test *«el contador cuenta unidades, no líneas»* en `tests/front/carrito.test.ts:101` |
| HU-4 · recargar o navegar no pierde el carrito | implementado, sin verificar en vivo | `src/lib/store.ts:28-44` (`persist`, clave `esenciatecnica-carrito`); test `tests/front/carrito.test.ts:115`. La persistencia real es de `localStorage`: no se testea |
| HU-4 · vaciar deja el contador en 0 y el estado vacío visible | implementado, sin verificar en vivo | `src/lib/store.ts:41`; `src/components/Carrito.tsx:30-44`; test *«tiene estado vacío diseñado que lleva al catálogo»* en `tests/front/carrito.test.ts:141` |
| HU-5 · carrito vacío que explica y lleva al catálogo | implementado, sin verificar en vivo | `src/components/Carrito.tsx:30-44`; test `tests/front/carrito.test.ts:141` |
| HU-5 · controles con nombre accesible, foco visible y teclado | implementado, sin verificar en vivo | `src/components/Carrito.tsx:66-90` y `src/components/AgregarAlCarrito.tsx:32`; `src/app/globals.css:53-55`; test `tests/front/carrito.test.ts:133` |
| HU-5 · una sola columna en mobile, sin desbordes | pendiente | `src/components/Carrito.tsx:56` usa una grilla de una columna, pero no hay test ni medición: verificación manual, bloqueada por #16/#20 |
| HU-6 · agregar, editar o quitar no llaman a la base | implementado, sin verificar en vivo | test *«el módulo es puro: no habla con la base ni con la red»* en `tests/front/carrito.test.ts:109` y *«el adaptador de persistencia usa el módulo y guarda sólo en el navegador»* en `tests/front/carrito.test.ts:115` |
| HU-6 · el botón del carrito lleva al checkout | implementado, sin verificar en vivo | `src/components/Carrito.tsx:126-129`; `src/app/checkout/page.tsx:48` recalcula con `totalDelPedido` |
| §5 · un solo carrito, sin componentes legacy | implementado, sin verificar en vivo | test *«hay un solo carrito: los componentes legacy se retiraron»* en `tests/front/carrito.test.ts:126` y *«no quedan nombres legacy en el camino del carrito»* en `:146` |
| HU-3 · el total "coincide con lo que se cobra" | implementado, sin verificar en vivo | Regla única: `subtotalDeLinea` suma subtotales ya redondeados (`src/lib/carrito.ts:71-89`) y `formatPrice` muestra entero sin decimales y con centavos con dos exactos (`src/lib/format.ts`). El carrito y el checkout comparten `subtotalDeLinea`; tests *«un monto con centavos se muestra con dos decimales exactos»*, *«el total del carrito es el número que el checkout precarga»* y *«el carrito y el checkout no multiplican a mano»* en `tests/front/formato-dinero.test.ts`. Cierra el issue **#44** |
| §1 · `/cart` sin el vocabulario legacy | implementado, sin verificar en vivo | `src/app/cart/page.tsx:1-5` monta `src/components/Carrito.tsx`; test `tests/front/carrito.test.ts:146` |

### Pendiente

1. **Verificación en el navegador de `/` y `/cart`** (agregar, contador, persistencia al recargar, estado
   vacío, mobile y foco). Depende de la base migrada (**#16**, **#15**) y de las claves de entorno (**#20**).
   Vive en la punta a punta **#23**.

> El ticket `T4 · Carrito` (**#9**) se cerró el 2026-10-28 con su comentario de evidencia: la
> implementación y sus tests están en `main` y lo único que falta es la verificación en vivo de arriba.
> La desviación de formato de precio se cerró en el issue **#44** (spec
> [`formato-del-dinero`](../formato-del-dinero/spec.md)): el redondeo vive en la aritmética y el formato es
> adaptativo, así que el total que se muestra es el que viaja al pedido.
