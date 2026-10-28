# Spec · Página institucional (`T6`)

> **Feature:** `front-mvp/sobre-el-proyecto` · **Estado:** implementada en repo · **Fecha:** 2026-10-25 (revisado el 2026-10-27).
> **Verificación en vivo:** pendiente (depende del issue #16 y de las claves del issue #20).
> **Origen:** gate de arranque del issue [#12](https://github.com/juanmamerodio/esenciatecnica/issues/12);
> las decisiones **G3** ([#11](https://github.com/juanmamerodio/esenciatecnica/issues/11)) y **G1**
> ([#4](https://github.com/juanmamerodio/esenciatecnica/issues/4), decisiones 3 y 5) se cerraron el
> 2026-10-25 y están registradas en [`front-mvp/spec.md`](../front-mvp/spec.md) §6 y §10.
> **Depende de:** `T1 · Home` ([#5](https://github.com/juanmamerodio/esenciatecnica/issues/5)), que dejó la
> identidad visual, el shell y el copy institucional vigente.
> **Fuente de verdad:** [`GLOSSARY.md`](../../../GLOSSARY.md), [`docs/MODELO.md`](../../MODELO.md),
> [`AGENTS.md`](../../../AGENTS.md) §5.

---

## 1. Problema

`/about` es la página más vieja del repo y la única que todavía habla del **otro** producto: dice que lo
recaudado se destina a “reactivos e insumos” y usa el ícono de un vaso de laboratorio. Ese es exactamente
el vocabulario que el glosario retira: el Producto es cosmética e higiene, no un insumo de laboratorio.

Además, la página no explica lo que el Cliente necesita para comprar —cómo se paga, quién lo valida, qué
pasa con la reserva— y la identidad acordada tiene una **franja de valores** (“Ciencia Aplicada”, “Sin
Fines de Lucro”, “Formación Técnica”) que no vive en ningún lado. La decisión **G1** la adjudica a esta
página; el riesgo de implementarla mal es dejarla en los dos lugares y publicar dos verdades.

## 2. Solución

Reescribir `/about` con la identidad acordada y el contenido del dominio:

1. **Nombre y ruta (G3):** “Sobre el proyecto” en `/about`, como hoy. “Investigación” describe otro
   contenido y confunde con insumos de laboratorio.
2. **Qué es:** cosmética e higiene formuladas por el Departamento de Química y elaboradas por alumnos de
   7mo año de la E.E.S.T N°1 Luciano Reyes (Campana, Buenos Aires), en el marco del Ciclo Lectivo 2026.
3. **Cómo se compra:** transferencia validada a mano por un Administrador de Química; la reserva se libera
   el viernes si el comprobante no está aprobado; el retiro o la entrega se coordinan después de aprobar el
   pago; el MVP no incluye envío ni seguimiento (`AGENTS.md` §5.5 y §5.6).
4. **Franja de valores (G1, decisión 5):** vive **solo acá**. La Home deja de repetir “Sin fines de lucro” y
   su bloque de pago queda sobre el pago.
5. **Contacto e institución:** el copy aprobado en G1 (`proyectos@esenciatecnica.edu.ar`), sin inventar
   teléfonos, direcciones ni textos nuevos.

La página **no** agrega funcionalidad: es contenido e identidad. Reutiliza el shell (header y footer) que ya
marca la ruta activa, así que no monta navegación propia.

## 3. Historias y criterios de aceptación

### HU-1 · Qué es el proyecto

**Como** Cliente, **quiero** saber qué compro y quién lo hace **para** confiar en la tienda.

- **Then** la página dice que son productos de **cosmética e higiene** elaborados por el **Departamento de
  Química** con alumnos de **7mo año** de la **E.E.S.T N°1 Luciano Reyes**.
- **Then** no aparece vocabulario de laboratorio (`reactivos`, `insumos`, `pH`, “compuestos clínicos”) ni
  referencias a IA.

### HU-2 · Cómo se compra

**Como** Cliente, **quiero** entender cómo se compra, **para** saber qué pasa después de transferir.

- **Then** la página explica que el pago es por **transferencia validada a mano** por los Administradores de
  Química.
- **Then** comunica que la **reserva se libera el viernes** si el comprobante no está aprobado.
- **Then** comunica que el **retiro o la entrega se acuerdan** después de aprobar el pago y que **no** hay
  envío ni seguimiento.

### HU-3 · Franja de valores en un solo lugar

**Como** Cliente, **quiero** leer los valores de la tienda una sola vez, **para** no encontrar el mismo bloque repetido.

- **Given** las tres valores aprobados (“Ciencia Aplicada”, “Sin Fines de Lucro”, “Formación Técnica”),
  **Then** la franja existe en `/about` y **no** en la Home: una sola fuente por concepto
  (`AGENTS.md` §7.4).
- **Then** el bloque de pago de la Home habla del pago y la reserva, no de los valores institucionales.

### HU-4 · Contacto, mobile y accesibilidad

**Como** Cliente, **quiero** el contacto institucional y una página usable en el celular, **para** preguntar sin buscar el dato.

- **Then** el contacto y la institución son los aprobados en G1 y coinciden con el footer.
- **Then** un solo `h1`, jerarquía de encabezados coherente, una columna en mobile, sin desbordes
  horizontales, foco visible y contraste AA.
- **Then** la ruta activa se marca desde el shell: la página no duplica navegación.

## 4. Decisiones de implementación

1. **“Sobre el proyecto” en `/about`** (G3), no “Investigación”.
2. **La franja de valores vive solo en esta página** (G1, decisión 5); la Home la suelta.
3. **Sin datos de contacto inventados**: se usa el email que ya está en el footer.
4. **El plazo de la reserva es contenido de dominio**, no una promesa comercial: la página lo comunica tal
   como lo aplica el cron de los viernes (`AGENTS.md` §5.6).

---

## 5. Decisiones de testing

| Seam | Cubre | Deja afuera |
|---|---|---|
| Estructura y texto de `src/app/about/page.tsx` y de `src/app/page.tsx` | vocabulario del dominio, las tres piezas de “cómo se compra”, la franja de valores en un solo lugar y el contacto aprobado | render y estilos |
| Verificación en navegador de `/about` | jerarquía, responsive, foco, ruta activa en el header | automatización de UI |

Esta tajada no toca datos, así que no tiene seam de base: su verificación es de contenido y estructura, y no
se agregan dependencias (`AGENTS.md` §4 y §8).

## 6. Fuera de alcance

- La franja de valores en la Home: se retira de ahí en esta misma tajada (decisión G1).
- Copy nuevo: el texto institucional es el aprobado; cualquier cambio de fondo es un gate de contenido.
- Teléfono, dirección, redes o formulario de contacto: el modelo y el copy aprobado no los tienen.

## 7. Notas finales

- G1 (27-10): la franja de valores vive **sólo** en esta página; la Home no la repite.
- G3: la institucional se llama «Sobre el proyecto» y vive en `/about`.
- La marca dejó el vaso de laboratorio (#43): `Sparkles` en el shell y `Droplets` para el producto y para el valor «Ciencia Aplicada».
- Se conservan «Departamento de Química» y «Ciencia Aplicada»: lo que se retiró es el encuadre de insumo de laboratorio, no el origen del producto.

## 8. Estado de implementación (auditoría del 2026-10-27)

Auditoría de cada historia contra el código del repo y sus tests. La página está escrita y el contenido del
dominio está cubierto por tests; la verificación en navegador queda pendiente (depende del issue #16 y de las
claves del issue #20), igual que el resto del front.

| Criterio / HU | Estado | Evidencia |
|---|---|---|
| HU-1 · Qué es el proyecto | implementado, sin verificar en vivo | El texto cumple (cosmética e higiene, Departamento de Química, 7mo año, E.E.S.T N°1); tests `habla de cosmética e higiene de la escuela` y `no quedó vocabulario de laboratorio ni de IA`. El ícono del laboratorio se retiró en **#43**: la marca es `Sparkles` en `Header` y `Footer`, y el valor «Ciencia Aplicada» y el placeholder de producto usan `Droplets`; tests *«ningún archivo de `src/` importa el ícono retirado»* y *«el header y el footer muestran la misma marca»*. |
| HU-2 · Cómo se compra | implementado | `src/app/about/page.tsx:44-63` (transferencia validada a mano, reserva que se libera el viernes, retiro o entrega acordados y sin envío ni seguimiento); tests `explica la validación manual del pago` y `comunica el plazo de la reserva sin prometer envío`. |
| HU-3 · Franja de valores en un solo lugar | implementado | `src/app/about/page.tsx:23-42` y `:152-165`; `src/app/page.tsx:88-129` (el bloque de pago de la Home no repite los valores); tests `está en la página institucional`, `no se repite en la Home` y `el bloque de pago de la Home habla del pago y la reserva…`. |
| HU-4 · Contacto, mobile y accesibilidad | implementado, sin verificar en vivo | `src/app/about/page.tsx:168-191` (contacto e institución) y `src/components/Footer.tsx:36-39`; tests `usa el contacto institucional aprobado en G1` y `tiene un solo h1 y no vuelve a montar la navegación`; la jerarquía, el responsive y el foco se verifican en navegador (#23). |
| Ruta activa marcada desde el shell | implementado | `src/components/Header.tsx:20-23` y `:60` (`aria-current`); test `tiene un solo h1 y no vuelve a montar la navegación`. |

### Pendiente

- Verificación en navegador de `/about` (jerarquía de encabezados, responsive, foco visible, ruta activa) dentro de la punta a punta (#23).

> La desviación de HU-1 (el ícono de laboratorio) se cerró en **#43**: ver
> [`iconos-y-copy-del-dominio/spec.md`](../iconos-y-copy-del-dominio/spec.md).
