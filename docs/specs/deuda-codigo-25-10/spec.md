# Spec · Deuda de código de la revisión del 25-10

> **Feature:** `deuda-codigo-25-10` · **Estado:** en implementación (tanda del 28-10) · **Fecha:** 2026-10-27 · **Issue:** [#25](https://github.com/juanmamerodio/esenciatecnica/issues/25).
> **Origen:** revisión de contexto limpio del 25-10 sobre `1e91c03..HEAD` (dos ejes: Spec y Estándares),
> registrada en la sección *«Revisión de código (2026-10-25) · hallazgos abiertos»* de `memory.md`, y
> tarea `MEDIA` del tablero: *Deuda de código de la revisión del 25-10*.
> **Fuente de verdad:** [`AGENTS.md`](../../../AGENTS.md) §6.5 y §7 ·
> [`docs/specs/checkout/spec.md`](../checkout/spec.md) · [`docs/specs/admin/spec.md`](../admin/spec.md).
> **Responsable:** Juan Manuel Merodio.
> **Criterio de cierre:** los hallazgos abiertos tienen su ticket, su test y su commit; el spec que
> contradecía el código queda corregido.

---

## 1. Problema

La revisión del 25-10 dejó **once hallazgos** en dos ejes. Uno (el `aviso` de correo que se descartaba)
se cerró en `A1` · #19. Los otros **diez siguen abiertos** y hoy no tienen tarea, test ni issue propio:

| # | Sev. | Hallazgo | Qué rompe hoy |
|---|---|---|---|
| 1 | 🔴 | `buscarCliente` usa `ilike` con un email que Zod admite con `%`/`_` | Un email como `%@ejemplo.com` puede reutilizar el Cliente de otra persona |
| 3 | 🟡 | `tiempo_produccion` no aparece en el catálogo | El spec del front lo pide «en catálogo y detalle, no en la Home» |
| 4 | 🟡 | `urlFirmadaDelComprobante` es superficie pública sin consumidor | Código muerto: el panel firma dentro de su lectura de pedidos |
| 5 | 🟡 | Tras `monto-no-coincide`, el sidebar sigue mostrando el total del carrito | La pantalla dice un número y el pedido se aprueba contra otro |
| 6 | 🟡 | La alerta de stock la genera la base **y** la recalcula el panel | Con una alerta atendida y el stock bajo, la fila dice «alerta» y el popup no muestra nada |
| 7 | 🟡 | Límites del checkout (nombre ≥ 2, teléfono ≤ 30, máximo 50 líneas) que el spec no pide | El contrato del borde no está escrito en ningún lado |
| 8 | 🟠 | Duplicación de «archivo subido» y de «errores de base» | Tres pares de funciones gemelas y dos mapas de estado HTTP (AGENTS §7.4) |
| 9 | 🟠 | `sinConfiguracion()` responde 503 «falta la service role» ante cualquier error | Diagnóstico falso: una falla real se disfraza de entorno mal configurado (AGENTS §7.10) |
| 10 | 🟡 | El borde del cliente castea la respuesta del checkout en vez de validarla | Un cuerpo inesperado entra sin Zod (AGENTS §7.7) |
| 11 | 🟡 | Juicios del baseline: `describirError` repetido, dinero como `number`, `BUCKET_COMPROBANTES` acoplado, `comun.ts` mezclando transporte y formato | Deuda de diseño sin dueño |

Ninguno de los diez es una feature: son defectos y deudas que ya costaron retrabajo y que, sin ticket,
vuelven a aparecer en la próxima revisión.

## 2. Solución

Un **spec paraguas** que fija el destino de cada hallazgo y deja los cortes verticales listos para la
etapa de tickets. Cada hallazgo es un ticket independiente y entregable por separado; el paraguas existe
para que ninguno quede sin decisión.

Decisiones por hallazgo:

- **(1)** El email se normaliza a minúsculas y se busca por **igualdad**, no por patrón. Un email con
  comodines no puede alcanzar la fila de otra persona.
- **(3)** El **tiempo de producción se publica en la card del catálogo** (además del detalle), como pide
  el spec del front; la Home sigue sin publicarlo.
- **(4)** La función se **retira** del puerto y del adaptador del panel: el panel firma dentro de su
  lectura de pedidos, que es su único consumidor real.
- **(5)** El **total de la base manda**: apenas la base devuelve su total (por ejemplo, tras
  `monto-no-coincide`), el «Total a transferir» muestra ese número y no el del carrito.
- **(6)** **La base es la única fuente de la alerta**: la fila de stock marca alerta si existe una
  `alerta_de_estado` **sin atender** para ese stock. El panel deja de recalcular y el spec de admin se
  corrige a una sola fuente.
- **(7)** Los límites se **documentan en el spec del checkout** (el código manda) y se fijan con test,
  para que el borde no dependa de leer el módulo.
- **(8)** Nacen **dos módulos compartidos**: uno de *archivo subido* (tipos, límites, clave del objeto y
  revisión) y uno de *errores de base* (código de error, campos de Zod y mensaje del dominio). Los tres
  pares de funciones gemelas y los dos mapas de estado HTTP quedan en una sola definición.
- **(9)** El adaptador del panel distingue **falta de configuración** de **falla real**: sólo la primera
  responde 503 con el mensaje de entorno; el resto responde 500, se loguea con su motivo y **no** inventa
  el diagnóstico de la service role.
- **(10)** La respuesta del checkout se **valida con Zod** en el borde del cliente, igual que ya lo hace
  el ayudante del panel.
- **(11)** Se reparte: el dinero pasa al spec `formato-del-dinero`; `describirError` va al módulo de
  errores de base (hallazgo 8); `BUCKET_COMPROBANTES` vive en el módulo de archivo subido; y el formateo
  de fecha del panel se separa del transporte HTTP.

## 3. Historias

1. Como Cliente, quiero que mi email no pueda hacer que el sistema reutilice el Cliente de otra persona,
   para que mi pedido quede a mi nombre.
2. Como Administrador de Química, quiero que un email con `%` no rompa el alta de Cliente, para no
   recibir un error crudo de la base.
3. Como Cliente, quiero ver el tiempo de producción en el catálogo, para decidir la compra sin abrir cada
   producto.
4. Como integrante del equipo, quiero que la superficie pública del panel no tenga funciones sin
   consumidor, para que leer el módulo no engañe sobre lo que usa el sistema.
5. Como Administrador de Química, quiero que el total que veo en el checkout sea el del pedido que voy a
   aprobar, para comparar el comprobante contra el número correcto.
6. Como Administrador de Química, quiero que la alerta de stock tenga una sola fuente, para que la fila
   de stock y el popup no se contradigan.
7. Como Administrador de Química, quiero que una alerta atendida deje de contar como pendiente aunque el
   disponible siga bajo, para no atender dos veces lo mismo.
8. Como desarrollador, quiero que los límites del comprobante estén escritos en el spec, para
   implementarlos sin adivinar.
9. Como desarrollador, quiero una sola definición de los límites del archivo subido, para que el
   comprobante y la foto del producto no se desincronicen.
10. Como desarrollador, quiero un solo mapa de errores de base a mensajes del dominio, para no arreglar
    el mismo mapeo dos veces.
11. Como Administrador de Química, quiero que un error real del servidor diga que es un error, para no
    perseguir una variable de entorno que sí está puesta.
12. Como Cliente, quiero que una respuesta inesperada del checkout no rompa la pantalla, para poder
    reintentar.
13. Como revisor, quiero que cada hallazgo tenga su ticket y su test, para que la próxima revisión no los
    vuelva a encontrar.
14. Como Juanma, quiero que el dinero tenga un solo spec, para no resolverlo dos veces.
15. Como Celeste, quiero que los tickets sean tajadas verticales, para poder cerrarlos de a uno con su
    test.

## 4. Decisiones de implementación

- **Orden de los tickets (blockers-first):** el hallazgo 1 (seguridad) primero; después 9 y 8, que crean
  los módulos compartidos donde aterrizan 10 y 11; luego 4, 5, 6, 3 y 7.
- **Los módulos compartidos son profundos**: interfaz chica (revisar un archivo, derivar una clave,
  traducir un error) y lógica adentro. No se crean carpetas de servicios: dos módulos, no diez.
- **El módulo de archivo subido** cubre comprobante y foto de producto: una sola tabla de tipos
  permitidos, un solo tope de tamaño y una sola forma de sanear la clave del objeto.
- **El módulo de errores de base** recibe el error crudo de Supabase/Postgres y devuelve el motivo del
  dominio; el mapa de motivo a HTTP queda en un solo lugar, compartido por el checkout y el panel.
- **El hallazgo 6 cambia la lectura del panel, no la base**: la tabla `alerta_de_estado` y su trigger
  siguen siendo el mecanismo; lo que se retira es el recálculo en el front.
- **El hallazgo 5** usa el total de la base cuando ya se conoce (respuesta con `total`) y el del carrito
  sólo antes de confirmar.
- **El hallazgo 10** valida la respuesta con el mismo esquema que define el contrato del borde; no se
  duplica el tipo a mano.
- **El spec de admin se corrige** en el punto de la alerta (una sola fuente) y **el spec de checkout** se
  completa con los límites del comprobante. Los dos son specs que esta tanda toca: se les aplica la
  plantilla vigente.
- **No se agregan features** ni se cambia el modelo de datos.

## 5. Decisiones de testing

- **Sólo comportamiento externo**: se testea el resultado de la operación (el Cliente encontrado, el
  motivo del dominio, el total mostrado, la alerta visible), no las funciones internas.
- **Seam preferido:** el puerto del módulo. Los hallazgos 5, 6, 9 y 10 se testean con un puerto falso
  (sin red), como ya hacen los tests del panel y del checkout.
- **Hallazgo 1:** test de integración con PGlite — un email con comodines no encuentra al Cliente de
  otra persona y el mismo email real siempre encuentra al mismo Cliente.
- **Hallazgo 3:** test de estructura del catálogo — la card publica el tiempo de producción y la Home no.
- **Hallazgo 4:** el compilador es la prueba principal (al retirarla, no queda consumidor); se suma un
  test estructural que falla si el símbolo vuelve.
- **Hallazgo 6:** test con PGlite o puerto falso — una alerta atendida con el stock bajo no marca la fila
  como pendiente.
- **Hallazgo 8:** test que fija una sola tabla de límites y un solo mapeo de errores (una sola
  importación canónica), con los casos ya cubiertos migrados al módulo compartido.
- **Hallazgo 9:** dos caminos — sin service role → 503 con mensaje de entorno; error real del cliente →
  500 con el motivo real y sin la palabra «SUPABASE_SERVICE_ROLE_KEY».
- **Hallazgo 10:** un cuerpo inesperado muestra el mensaje de «respuesta que no se entiende» en vez de
  explotar.
- **Prior art:** `tests/front/admin.test.ts`, `tests/front/checkout.test.ts`, `tests/db/aprobacion.test.ts`
  y los tests de estructura que leen archivos de `src/`.

## 6. Fuera de alcance

- El `aviso` de correo (hallazgo 2), ya cerrado en `A1` · #19.
- El redondeo del dinero: tiene su propio spec (`formato-del-dinero`).
- La búsqueda por campos del catálogo y el test del 404 del detalle: tienen spec propio.
- Los hallazgos de base (la anon key que ejecuta RPC) y el DDL: son del cierre de la migración.
- Reescrituras grandes de arquitectura que no paguen un hallazgo.

## 7. Notas finales

- El paraguas **no se implementa de una sola vez**: cada ticket es una sesión y un commit, como manda
  `AGENTS.md` §6.3.
- Los hallazgos vienen de una revisión en contexto limpio; la tentación de parchearlos todos juntos es
  exactamente lo que la regla §6.5 evita.
- Si un hallazgo resulta no ser cierto al abrir su ticket, se documenta la corrección en el issue y el
  spec se ajusta: el código manda sobre este documento.

---

## 8. Estado de implementación (tanda del 28-10)

| Hallazgo | Ticket | Estado |
|---|---|---|
| 1 · `buscarCliente` por patrón | [#33](https://github.com/juanmamerodio/esenciatecnica/issues/33) | ✅ implementado |
| 3 · `tiempo_produccion` en el catálogo | [#38](https://github.com/juanmamerodio/esenciatecnica/issues/38) | pendiente |
| 4 · `urlFirmadaDelComprobante` sin consumidor | [#34](https://github.com/juanmamerodio/esenciatecnica/issues/34) | pendiente |
| 5 · el total del sidebar tras `monto-no-coincide` | [#34](https://github.com/juanmamerodio/esenciatecnica/issues/34) | pendiente |
| 6 · la alerta de stock con dos fuentes | [#36](https://github.com/juanmamerodio/esenciatecnica/issues/36) | pendiente |
| 7 · límites del checkout sin escribir | [#37](https://github.com/juanmamerodio/esenciatecnica/issues/37) | pendiente |
| 8 · duplicación de «archivo subido» y «errores de base» | [#35](https://github.com/juanmamerodio/esenciatecnica/issues/35) | ✅ implementado |
| 9 · `sinConfiguracion()` con diagnóstico falso | [#35](https://github.com/juanmamerodio/esenciatecnica/issues/35) | ✅ implementado |
| 10 · el borde del cliente castea la respuesta | [#46](https://github.com/juanmamerodio/esenciatecnica/issues/46) | pendiente |
| 11 · juicios del baseline | repartido (ver §2) | ✅ implementado en [#35](https://github.com/juanmamerodio/esenciatecnica/issues/35) (fecha) y [#44](https://github.com/juanmamerodio/esenciatecnica/issues/44) (dinero) |

### Hallazgo 1 · cerrado (#33)

`buscarCliente` y el camino de carrera del alta buscan **por igualdad** contra el email normalizado
(`normalizarEmail`: `trim` + minúsculas), nunca con `ilike`. El alta también guarda normalizado, así que
la igualdad siempre encuentra la fila que creó el sistema.

| Criterio | Estado | Evidencia |
|---|---|---|
| Un email con comodines no encuentra al Cliente de otra persona | implementado | `tests/db/cliente-email.test.ts` *«el patrón `%@ejemplo.com` no encuentra la fila de la víctima»* y *«el patrón `_ictima@ejemplo.com` tampoco»*, con PGlite real |
| El mismo email real encuentra siempre al mismo Cliente, con o sin mayúsculas | implementado | test *«con o sin mayúsculas devuelve la misma fila»* (`JUAN@Ejemplo.com`, `  Juan@EJEMPLO.COM  `) |
| El camino de carrera reutiliza el Cliente correcto, no el que matcheó por patrón | implementado | test *«no reutiliza la fila que matcheó por patrón»*: con `vitima@ejemplo.com` y `%@ejemplo.com` cargados, el alta de `%@ejemplo.com` reutiliza la segunda fila |
| Test de integración con PGlite que falla con el comportamiento actual | implementado | 6 de los 9 tests fallaban con `ilike`; el seam es `puertoSobre` + el PostgREST falso sobre PGlite (`tests/db/postgrest-falso.ts`) |
| El adaptador no vuelve a usar patrones | implementado | tests estructurales *«no queda ningún `ilike` en el adaptador del checkout»* y *«busca por igualdad con el email normalizado»* |

### Hallazgos 8, 9 y 11 · cerrados (#35)

Nacieron dos módulos compartidos y profundos, y el formato de la fecha se separó del transporte.

- **`src/lib/archivo.ts`** — una sola tabla de tipos y tope (`LIMITES_DE_ARCHIVO`), una sola
  revisión (`revisarTipoYTamano` para el borde del navegador, `revisarArchivo` en el servidor) y una
  sola forma de derivar la clave (`claveDelArchivo`). El uso (`comprobante` o `foto`) decide el
  bucket y el nombre de respaldo. El nombre del bucket privado vive acá (`bucketDe("comprobante")`).
- **`src/lib/errores-bd.ts`** — código crudo → motivo (`MOTIVO_POR_CODIGO`), motivo → HTTP
  (`ESTADO_HTTP`), `codigoDeError`, `camposDeZod` y `FaltaConfiguracion`. El checkout y el panel
  comparten la tabla; cada uno elige sólo el mensaje que lee su público.
- **`src/lib/fecha.ts`** — `fechaEnHoraArgentina` sale de `src/components/admin/comun.ts`, que queda
  con el transporte (`pedirAlPanel`).

| Criterio | Estado | Evidencia |
|---|---|---|
| Una sola definición de tipos y tope, usada por el comprobante y la foto | implementado | `LIMITES_DE_ARCHIVO` en `src/lib/archivo.ts`; test *«el tope de tamaño está definido en un solo lugar»* (ningún otro archivo de `src/` declara `tamanoMaximo`) |
| Una sola forma de sanear la clave del objeto | implementado | `claveDelArchivo`; tests *«sanea el nombre igual en los dos usos»* y *«si el nombre no deja nada usable, usa el de respaldo del uso»* |
| Una sola revisión con los mensajes del dominio en un solo lugar | implementado | `revisarArchivo`/`revisarTipoYTamano`; `SubirComprobante.tsx` dejó su copia y usa la misma función |
| Un solo mapa de error de base a motivo, campos y HTTP | implementado | `MOTIVO_POR_CODIGO`, `ESTADO_HTTP` y `camposDeZod` en `src/lib/errores-bd.ts`; `checkout.ts` y `admin.ts` ya no tienen `codigoDeError` ni `camposDe`; test *«los dos bordes HTTP comparten el mapa de motivo a HTTP»* |
| Sin service role → 503 con el mensaje del entorno | implementado | `FaltaConfiguracion` (la lanzan los dos adaptadores) y `respuestaDeFalla`; test *«sin configuración responde 503 con el mensaje del entorno»* |
| Error real → 500 con el motivo real, sin `SUPABASE_SERVICE_ROLE_KEY` | implementado | test *«una falla real responde 500, sin el diagnóstico del entorno, y deja el motivo en el log»* |
| La fecha del panel se separa del transporte HTTP | implementado | `src/lib/fecha.ts`; test *«`comun.ts` queda con el transporte y sin formato de fecha»* |
| Tests que fijan la importación canónica de los dos módulos | implementado | `tests/front/archivo-y-errores.test.ts` (25 tests, 6 estructurales) |
| Cobertura migrada sin duplicar el mapeo | implementado | `tests/front/admin.test.ts` y `tests/front/checkout.test.ts` usan `LIMITES_DE_ARCHIVO` y `ArchivoSubido` del módulo |
