# Orden de ejecución de la tanda del 27-10

> **Cuándo leer esto:** al abrir una sesión de implementación, para saber qué ticket sigue.
> **Origen:** los nueve specs publicados el 2026-10-27 y sus dieciséis tajadas (issues #33–#48).
> **Fuente de prioridades:** [`tablero de Teams`](../agentes/teams.md), [`memory.md`](../../memory.md) y los
> propios issues, que declaran sus blockers.
> **Última revisión:** 2026-10-28.

---

## 1. Cómo se ordenó

No alcanza con el número del issue ni con la prioridad del tablero: hay cuatro criterios, en este orden.

1. **Lo que cobra mal o filtra datos va primero.** Un defecto de dinero o de seguridad no espera a la
   cosmética ni a la documentación.
2. **La puerta automática va temprano.** La integración continua no construye nada, pero impide que los
   tickets siguientes rompan la línea base sin que nadie lo vea.
3. **Lo fundacional antes de quien lo usa.** Los módulos compartidos (archivo subido, errores de base) se
   hacen antes de los tickets que los consumen.
4. **La gobernanza va al final.** La plantilla, el retrofit, las skills y el cierre de issues citan trabajo
   ya hecho: hacerlos antes convierte la documentación en una promesa.

Los blockers declarados mandan sobre todo lo anterior: `#47` no empieza sin `#40`.

## 2. El orden

| # | Ticket | Qué cierra | Por qué está acá |
|---|---|---|---|
| 1 | **#44** · Dinero: redondeo en la aritmética y formato en un solo lugar | #27 | Es el único defecto que hace que el Cliente transfiera un número distinto del que se cobra. Base de carrito, checkout, panel y remito. **Implementado el 2026-10-28.** |
| 2 | **#39** · CI: typecheck, lint, test y `docs:links` en cada push | #30 | Puerta de entrada: con ella, los catorce tickets siguientes no pueden volver a romper la línea base en silencio. |
| 3 | **#33** · El Cliente se busca por email normalizado, no por patrón | #25 | 🔴 Seguridad: un email con `%` o `_` puede reutilizar el Cliente de otra persona. |
| 4 | **#41** · La búsqueda del catálogo es una conjunción de palabras por campo | #31 | Desviación funcional del catálogo, chica y con test: el buscador deja de depender de que los campos estén pegados. |
| 5 | **#42** · El 404 del detalle de producto queda cubierto por test | #32 | Hueco de test sin cambio de comportamiento: barato y cierra una desviación documentada. |
| 6 | **#35** · Nacen el módulo de archivo subido y el de errores de base | #25 | Fundacional: #34 y #46 construyen sobre estos módulos. Va antes que sus consumidores. |
| 7 | **#34** · El panel lee el total de la base y retira la función sin consumidor | #25 | Depende de la superficie del panel que ordena #35; hoy el panel puede mostrar un total que no es el del pedido. |
| 8 | **#46** · El comprobante se valida con Zod en el borde del cliente | #25 | Reutiliza el patrón de validación de borde que deja #35. |
| 9 | **#36** · La alerta de stock tiene una sola fuente: la base | #25 | El popup y la tabla se contradicen; no bloquea a nadie ni es bloqueado. |
| 10 | **#37** · Los límites del checkout quedan escritos y fijados con test | #25 | Contrato de borde: completa el spec con lo que el código ya hace. |
| 11 | **#38** · El catálogo publica el tiempo de producción en la card | #25 | Mejora de catálogo, independiente; va después de los defectos. |
| 12 | **#43** · La marca y el producto dejan de ser un vaso de laboratorio | #26 | Cosmética con regla de dominio: un ícono por concepto, con test que lo prohíbe. |
| 13 | **#40** · Nace `docs/specs/PLANTILLA.md`, con test que la fija | #29 | Habilita el retrofit; sin plantilla publicada no hay nada que aplicar. |
| 14 | **#47** · Retrofit de la plantilla en los siete specs de la tanda | #29 | **Bloqueado por #40.** No cambia comportamiento: sólo ordena documentos. |
| 15 | **#45** · Nacen las dos skills del proyecto y §11 dice la verdad | #28 | Conocimiento operativo (`tablero-teams`, `bd-viva`); se escribe cuando los procedimientos ya están estables. **Implementado el 2026-10-28.** |
| 16 | **#48** · Trazabilidad: cerrar los nueve issues ya implementados | #24 | Último: cierra #2, #5, #6, #8, #9, #10, #12, #13 y #14 citando commits y tests que ya están en `main`. |

## 3. Qué queda afuera del orden

- **#15, #16, #17, #18, #19, #20, #21, #22 y #23** (cierre beta) no entran: dependen de la base viva y de
  las claves, no de una sesión de código. #23 es donde se verifica en el navegador lo que esta tanda
  implementa.
- **La segunda tanda de `.env`/Vercel** es de Enzo e Isabella (#20) y sigue siendo el camino crítico de la
  beta.

## 4. Dependencias nativas en GitHub

El tracker ya tiene las aristas que este orden respeta (`docs/agentes/issue-tracker.md`, dependencias
nativas):

- **#47** está bloqueado por **#40**, **#41**, **#42** y **#44**: el retrofit de la plantilla toca los specs
  que esas cuatro tajadas corrigen. Hoy #44 está cerrado y quedan abiertos #40, #41 y #42.
- **#46** está bloqueado por **#35**: la validación del borde reutiliza el módulo de errores de base.
- **#48** está bloqueado por **los otros quince**: cierra issues que sólo pueden citarse cuando el trabajo
  ya está commiteado.

Un ticket con un blocker abierto no se empieza: primero se cierra el blocker (o se lo quita con una razón
escrita en el issue).

## 5. Cómo se verifica cada ticket

Cada tajada se cierra igual: test nuevo en rojo antes del código, `npm run typecheck`, `npm run lint` y
`npm test` sin errores nuevos, `npm run docs:links` en verde si toca documentación, y commit quirúrgico con
el issue citado. El estado del tablero pasa a `review` si falta la verificación en vivo y a `done` con el
commit y el test a la vista ([`teams.md`](../agentes/teams.md) §3).
