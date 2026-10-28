# Spec · Íconos y copy del dominio (retiro del laboratorio)

> **Feature:** `iconos-y-copy-del-dominio` · **Estado:** implementada en repo (issue #43) · **Fecha:** 2026-10-27, implementada el 2026-10-28 · **Issue:** [#26](https://github.com/juanmamerodio/esenciatecnica/issues/26) · **Tajada:** [#43](https://github.com/juanmamerodio/esenciatecnica/issues/43).
> **Origen:** hallazgo 🟡 de `memory.md` (retirar `FlaskConical`), desviación de HU-1 en
> [`sobre-el-proyecto/spec.md`](../sobre-el-proyecto/spec.md) y tarea `ALTA` del tablero:
> *Retirar los íconos y el copy de laboratorio (FlaskConical)*.
> **Fuente de verdad:** [`GLOSSARY.md`](../../../GLOSSARY.md) (Producto no es un insumo de laboratorio) ·
> [`docs/specs/sobre-el-proyecto/spec.md`](../sobre-el-proyecto/spec.md) §1.
> **Responsable:** Juan Manuel Merodio (diseño: Celeste Cáceres).
> **Criterio de cierre:** ningún archivo de `src/` importa `FlaskConical` y `/about` no dice «laboratorio»,
> con test que lo fije.

---

## 1. Problema

La página institucional declara hablar de «cosmética e higiene del Departamento de Química» y su test
prohíbe el vocabulario de insumos (`reactivo`, `insumo`, `pH`). Sin embargo, la marca y el contenido
siguen hablando de un laboratorio:

- El ícono institucional es un **vaso de laboratorio** (`FlaskConical`), y aparece en cuatro lugares: el
  header, el footer, el placeholder de producto sin imagen y el valor «Ciencia Aplicada» de `/about`.
- El texto de ese valor dice que *«cada fórmula sale del trabajo de laboratorio»*, justo el encuadre que
  el glosario retira cuando dice que el Producto **no es un insumo de laboratorio**.
- Ningún test cubre los íconos: la verificación de T6 fue de texto, así que la desviación pasó verde.

El efecto es de coherencia de marca: la tienda dice una cosa y su ícono dice otra, y quien lee
«laboratorio» espera insumos, no cosmética.

## 2. Solución

Reemplazar el ícono por **íconos del dominio** y corregir el copy:

- **Marca (header y footer):** `Sparkles`, el mismo ícono con el que la Home ya presenta la tienda.
- **Producto (placeholder de imagen faltante) y valor «Ciencia Aplicada» de `/about`:** `Droplets`, que
  cubre cosmética e higiene sin inventar un símbolo nuevo.
- **Copy del valor:** *«Cada fórmula la elabora el Departamento de Química de la escuela y se convierte
  en un producto de cosmética o higiene listo para usar.»*
- **Test:** además del vocabulario ya prohibido, se prohíbe la palabra «laboratorio» en `/about` y se
  agrega un test estructural que falla si **cualquier** archivo de `src/` vuelve a importar `FlaskConical`.

## 3. Historias

1. Como visitante, quiero que la marca de la tienda no sea un vaso de laboratorio, para entender que
   compro cosmética e higiene y no insumos de química.
2. Como Cliente, quiero que un producto sin foto muestre un ícono de cosmética, para que el catálogo no
   parezca una lista de reactivos.
3. Como Cliente, quiero que la página institucional explique el origen del producto sin la palabra
   «laboratorio», para que el encuadre coincida con lo que se vende.
4. Como Cliente, quiero que el valor «Ciencia Aplicada» siga contando que el producto nace del
   Departamento de Química, para no perder el dato de origen al cambiar el copy.
5. Como Celeste, quiero que el ícono sea uno solo por concepto (marca, producto, valor), para que la
   identidad no se lea como una colección de símbolos sueltos.
6. Como revisor, quiero un test que prohíba `FlaskConical` en todo `src/`, para que la desviación no
   vuelva por un archivo que nadie mira.
7. Como revisor, quiero un test que prohíba «laboratorio» en `/about`, para que el copy no se reintroduzca
   en una edición futura.
8. Como integrante del equipo, quiero que el spec `sobre-el-proyecto` deje de marcar la desviación de
   HU-1, para que la tabla de estado diga la verdad.
9. Como Celeste, quiero que los íconos conserven la accesibilidad (`aria-hidden` donde son decorativos y
   texto alternativo donde no), para no degradar lo que ya estaba bien.
10. Como Cliente, quiero que el header y el footer sigan mostrando la misma marca, para que el shell no
    se vuelva inconsistente.
11. Como revisor, quiero que el test estructural recorra `src/` entero y no una lista fija de archivos,
    para que un archivo nuevo con el ícono viejo falle sin que nadie lo agregue a mano.
12. Como integrante del equipo, quiero que este cambio no toque la paleta ni la tipografía, para que el
    retiro del ícono no se convierta en un rediseño.

## 4. Decisiones de implementación

- **Un ícono por concepto, de `lucide-react`** (la librería vigente): `Sparkles` para la marca,
  `Droplets` para producto y para el valor «Ciencia Aplicada».
- **No se inventan íconos nuevos ni se suman dependencias de íconos.**
- **`ImagenProducto` conserva sus estados**: cambia sólo el símbolo del estado «sin imagen»; el `alt`
  descriptivo y el manejo de error quedan igual.
- **El comentario del archivo de `/about` también pierde «laboratorio»**: el test lee el archivo completo
  (texto y comentarios), así que el copy y el comentario se editan juntos.
- **El copy aprobado** es el del §2, en una sola frase, sin prometer envío ni validación automática.
- **El test de vocabulario** amplía la lista retirada con `laboratorio` y con el nombre del ícono viejo.
- **Se corrige `sobre-el-proyecto/spec.md`**: la fila de HU-1 deja de ser «desviación» y el `### Pendiente`
  pierde el punto del ícono. Como es un spec que esta tanda toca, se le aplica la plantilla vigente
  (ver el spec `plantilla-de-spec`).

## 5. Decisiones de testing

- **Se prefiere el seam existente:** los tests de estructura del front que ya leen archivos de `src/`
  (`tests/front/sobre-el-proyecto.test.ts` y los tests de identidad del shell). No se monta un seam nuevo.
- **Qué se testea (comportamiento externo, no implementación):**
  - el archivo de `/about` no contiene «laboratorio» ni el ícono retirado;
  - ningún archivo de `src/` importa `FlaskConical`;
  - el copy nuevo aparece en `/about` y el valor «Ciencia Aplicada» sigue presente;
  - el test de vocabulario de T6 sigue verde.
- **Prior art:** `tests/front/sobre-el-proyecto.test.ts` (vocabulario y estructura de la página) y
  `tests/front/identidad-shell.test.ts` (shell compartido).
- El test estructural de `src/` recorre el árbol completo, como ya hace el ayudante que lista archivos
  fuente.

## 6. Fuera de alcance

- Rediseñar la identidad visual, la paleta o la tipografía.
- Cambiar el copy de los otros dos valores («Sin Fines de Lucro», «Formación Técnica»).
- Retirar otros términos del glosario más allá de «laboratorio» en el encuadre del producto.
- La verificación en navegador de `/about` (queda en #23).

## 7. Notas finales

- La decisión de conservar «Departamento de Química» y «Ciencia Aplicada» es deliberada: el origen del
  producto es parte del relato; lo que se retira es el encuadre de insumo de laboratorio.
- Si Celeste prefiere otro ícono de cosmética, el reemplazo es local: el test prohíbe el viejo, no exige
  uno en particular.

---

## 8. Estado de implementación (2026-10-28 · issue #43)

`npm run typecheck` sin errores, `npm run lint` en 0 y la suite en verde con los tests nuevos. El test
sigue prohibiendo el ícono retirado **por nombre**: cambiar `Droplets` por otro ícono de cosmética no
rompe nada.

| Criterio | Estado | Evidencia |
|---|---|---|
| Ningún archivo de `src/` importa `FlaskConical`, con test que recorre el árbol | implementado | test *«ningún archivo de `src/` importa el ícono retirado»* (`archivosFuente` sobre `src/` entero) |
| `/about` no contiene «laboratorio» | implementado | `laboratorio` sumado a `VOCABULARIO_RETIRADO`; tests *«no quedó vocabulario de laboratorio ni de IA»* y *«/about no dice «laboratorio» ni siquiera en un comentario»* |
| El copy nuevo aparece y «Ciencia Aplicada» sigue | implementado | `src/app/about/page.tsx` (valor «Ciencia Aplicada» con el texto aprobado); test *«el valor «Ciencia Aplicada» sigue presente con el copy nuevo»* |
| Header y footer muestran la misma marca | implementado | `Sparkles` en `Header.tsx` y `Footer.tsx`; test *«el header y el footer muestran la misma marca»* |
| El placeholder usa el ícono de cosmética y conserva su contrato | implementado | `Droplets` en `ImagenProducto.tsx`, con `role="img"`, el `aria-label` de siempre y `onError`; test *«el placeholder de producto sin imagen usa el ícono de cosmética y conserva su contrato»* |
| Los íconos decorativos llevan `aria-hidden` | implementado | test *«los íconos decorativos del shell siguen con `aria-hidden`»* |
| El spec `sobre-el-proyecto` deja de marcar la desviación de HU-1 | implementado | [`sobre-el-proyecto/spec.md`](../sobre-el-proyecto/spec.md): la fila pasó a implementado y el `### Pendiente` perdió el punto del ícono |
| No se toca la paleta ni la tipografía | implementado | el diff es de íconos y copy: no se tocaron `globals.css`, `tailwind.config.ts` ni `layout.tsx` |
