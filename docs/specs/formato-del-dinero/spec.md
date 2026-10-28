# Spec · Redondeo y formato del dinero

> **Feature:** `formato-del-dinero` · **Estado:** implementada en repo (issue #44) · **Fecha:** 2026-10-27, implementada el 2026-10-28 · **Issue:** [#27](https://github.com/juanmamerodio/esenciatecnica/issues/27) · **Tajada:** [#44](https://github.com/juanmamerodio/esenciatecnica/issues/44).
> **Origen:** hallazgo 🟠 de `memory.md`, desviación de HU-3 en [`carrito/spec.md`](../carrito/spec.md) y
> tarea `ALTA` del tablero: *Redondeo y formato del dinero: el total del carrito no es el que se cobra*.
> **Fuente de verdad:** [`docs/MODELO.md`](../../MODELO.md) (dinero `NUMERIC(12,2)`) ·
> [`AGENTS.md`](../../../AGENTS.md) §5.11 · [`GLOSSARY.md`](../../../GLOSSARY.md).
> **Responsable:** Juan Manuel Merodio.
> **Criterio de cierre:** el número que se muestra, el que viaja al pedido y el que sale en el remito son
> el mismo, con test que lo fije para montos con y sin centavos.

---

## 1. Problema

La aritmética del dinero no es la misma en los tres lugares donde el dinero se ve:

- El **subtotal por línea** se muestra como `precio × cantidad` sin redondear, tanto en el carrito como
  en el resumen del checkout.
- El **total** se redondea a dos decimales en el módulo del carrito, pero el formato de precio recorta
  los ceros (`4,5` en vez de `4,50`) y redondea *al mostrar*: un total de `3001.999` se muestra
  `$ 3.002`.
- El **pedido** recibe el número sin formatear, calculado otra vez por la base a partir de los ítems.

El caso que dispara el hallazgo es chico —con el seed actual los precios son enteros—, pero la regla que
se rompe es grande: `AGENTS.md` §5.11 y el glosario dicen que el total del carrito **es** el total del
pedido. Si el carrito muestra un número y el pedido se aprueba contra otro, el Administrador compara el
comprobante contra el número equivocado.

**Corrección de evidencia:** el ejemplo que el spec del carrito daba como desviación
(`3001.65 → $ 3.002`) es falso —`3001.65` sí muestra centavos—; el que redondea al mostrar es
`3001.999`. El defecto real es el recorte de ceros y la falta de redondeo de los subtotales, no el
redondeo del total.

## 2. Solución

Una **regla única de dinero**, con una sola función de formato y una sola forma de calcular los totales:

- **Subtotal por línea:** `precio × cantidad`, redondeado a centavos.
- **Total del pedido:** la suma de los subtotales **ya redondeados** (no la suma cruda de los productos).
- **Formato:** si el monto es entero, sin decimales (`$ 3.000`); si no, con **dos decimales exactos**
  (`$ 4,50`, `$ 3.001,65`).
- **Un solo número:** el total que se muestra en el carrito es el que viaja al checkout, el que la base
  calcula para el pedido y el que aparece en el remito.

## 3. Historias

1. Como Cliente, quiero que el total del carrito sea exactamente el que se cobra, para transferir el
   monto correcto.
2. Como Cliente, quiero ver los centavos cuando el monto los tiene, para no redondear yo la
   transferencia.
3. Como Cliente, quiero que un monto entero se vea sin `,00`, para que la tienda no se vea cargada de
   ceros.
4. Como Cliente, quiero que `$ 4,50` se muestre con sus dos decimales, para leer un precio de dinero y no
   un número suelto.
5. Como Cliente, quiero que el subtotal de una línea con centavos cierre con el total, para que la suma
   del resumen tenga sentido.
6. Como Administrador de Química, quiero que el monto del comprobante y el total del pedido se comparen
   sobre el mismo número, para aprobar sin dudar.
7. Como Administrador de Química, quiero que el remito muestre el mismo total que el panel, para que el
   Cliente no reciba dos cifras.
8. Como Cliente, quiero que la confirmación del pedido muestre el total ya redondeado, para no ver una
   cifra distinta de la que transferí.
9. Como desarrollador, quiero una sola función de formato de dinero, para no repetir la regla en cada
   pantalla.
10. Como desarrollador, quiero una sola función de subtotal, para que el carrito y el checkout no
    calculen distinto.
11. Como Celeste, quiero tests con montos enteros y con centavos, para que la regla no dependa del seed
    actual.
12. Como revisor, quiero que el spec del carrito deje de citar un ejemplo falso, para que la desviación
    no se lea como un bug que no existe.
13. Como integrante del equipo, quiero que la decisión quede escrita, para no volver a discutir si el
    dinero se muestra con o sin decimales.
14. Como Cliente, quiero que los precios unitarios y los subtotales usen la misma regla, para poder
    multiplicar mentalmente sin sorpresas.

## 4. Decisiones de implementación

- **Formato adaptativo (decidido el 27-10):** entero → sin decimales; no entero → dos decimales exactos.
  Se descarta «dos decimales siempre» y se descarta seguir recortando ceros (`$ 4,5`).
- **El redondeo ocurre en la aritmética, no en la vista.** La vista elige cuántos decimales mostrar según
  el monto que recibe, pero no normaliza el valor ni esconde centavos: si le llega un monto fuera de
  contrato, lo muestra con sus dos decimales en vez de recortarlo a un entero.
- **Una sola función de formato** para toda la app (tienda, panel y remito).
- **Una sola función de subtotal**, en el módulo del carrito, usada por el carrito y por el checkout.
- **El total del pedido se calcula sumando subtotales redondeados**, no redondeando la suma cruda. La
  diferencia es de un centavo como máximo y hace que el resumen cierre línea por línea. El resultado se
  normaliza con el mismo redondeo para limpiar el ruido del punto flotante (`0,1 + 0,2`), sin cambiar su
  valor decimal.
- **Lo que viaja al pedido es el número, no el texto**: el checkout sigue mandando el total como número y
  la base sigue calculando el suyo; el criterio es que coincidan.
- **Corrección de `carrito/spec.md`**: se retira el ejemplo falso de la tabla de desviación y se precisa
  la regla de formato. El spec del checkout también se precisa en el mismo punto. Los dos son specs que
  esta tanda toca.
- **No se cambia el modelo**: el dinero sigue siendo `NUMERIC(12,2)` y no se introduce un tipo de
  centavos en esta tajada (el juicio «Primitive Obsession» del hallazgo 11 queda anotado, no absorbido).

## 5. Decisiones de testing

- **Módulo puro, test puro:** el formato y la aritmética se testean como funciones, sin base ni red. Es
  el seam más alto disponible y ya existe.
- **Casos que fijan la regla:**
  - formato: `3000 → $ 3.000`; `4.5 → $ 4,50`; `4.05 → $ 4,05`; `3001.65 → $ 3.001,65`; `0 → $ 0`;
  - subtotal: `0.1 × 3` da `0.3` y no `0.30000000000000004`;
  - total: la suma de subtotales redondeados coincide con la suma de los subtotales mostrados.
- **Test de coherencia entre pantallas:** el total que el carrito muestra es el mismo número que el
  checkout envía al confirmar (ya existe un test de pureza del carrito; se amplía al caso con centavos).
- **Prior art:** `tests/front/carrito.test.ts` (aritmética del carrito) y `tests/front/checkout.test.ts`
  (monto que viaja al borde).
- **No se testea la localización del `Intl`** (fechas, otros números): eso es de la plataforma. El formato
  del dinero sí se fija completo —incluido el espacio duro entre símbolo y número— porque es criterio de
  aceptación del issue #44; si cambia el ICU de Node, el test falla y se actualiza con el criterio nuevo.
- **El panel y el remito se cubren por el mismo formateador:** el remito se compone y se compara el texto
  y el HTML; el panel se fija estructuralmente (importa `formatPrice` y no formatea por su cuenta), porque
  sin DOM no hay render que ejecutar.

## 6. Fuera de alcance

- Migrar el dinero a un tipo de dominio en centavos enteros.
- Precios con más de dos decimales, impuestos, descuentos o redondeos por medios de pago.
- Cambiar cómo la base calcula el total del pedido.
- El formato de la fecha o de otros números que no sean dinero.

## 7. Notas finales

- La decisión de formato se tomó con el responsable el 27-10; queda escrita acá para no rediscutirla.
- El hallazgo se descubrió porque el carrito y el checkout calculaban el total por caminos distintos: la
  regla de un solo cálculo es tan importante como la del formato.
- El seed actual (precios enteros) no dispara el defecto; por eso los tests usan montos con centavos a
  propósito.

---

## 8. Estado de implementación (2026-10-28 · issue #44)

`npm run typecheck` sin errores, `npm run lint` en 0 y la suite en verde con los tests nuevos.

| Criterio | Estado | Evidencia |
|---|---|---|
| Formato adaptativo: `3000 → $ 3.000`, `4.5 → $ 4,50`, `4.05 → $ 4,05`, `3001.65 → $ 3.001,65`, `0 → $ 0` | implementado | `src/lib/format.ts` (`formatPrice`); tests *«un monto entero se muestra sin decimales»* y *«un monto con centavos se muestra con dos decimales exactos»* en `tests/front/formato-dinero.test.ts` |
| Redondeo en la aritmética, no en la vista | implementado | `redondearACentavos` en `src/lib/format.ts`; lo usan el carrito y el checkout; `formatPrice` sólo elige 0 o 2 decimales y no recorta centavos; tests *«redondea a centavos sin arrastrar el error del punto flotante»* y *«no esconde los centavos de un monto que no está redondeado»* |
| Subtotal por línea redondeado a centavos | implementado | `subtotalDeLinea` en `src/lib/carrito.ts:71-77`, usada por `Carrito.tsx:93` y `checkout/page.tsx:297` |
| Total = suma de subtotales redondeados | implementado | `totalDelPedido` en `src/lib/carrito.ts:79-89`; test *«el total suma los subtotales ya redondeados, no los productos crudos»* |
| El carrito muestra el número que el checkout envía | implementado | test *«el total del carrito es el número que el checkout precarga para transferir»* (`total.toFixed(2)`) y *«el carrito y el checkout no multiplican a mano»* |
| El remito y el panel usan la misma función de formato | implementado | `src/lib/remito.ts` y `src/components/admin/PanelDePedidos.tsx` importan `formatPrice`; test *«el remito y el panel formatean el dinero con la misma función»* |
| Los specs de carrito y checkout enuncian la regla | implementado | [`carrito/spec.md` §2, HU-3 y tabla de estado](../carrito/spec.md) · [`checkout/spec.md` HU-2](../checkout/spec.md) |
| El modelo no cambia: el dinero sigue `NUMERIC(12,2)` | implementado | no se tocó `docs/MODELO.md` ni las migraciones |
