# memory.md · estado de build

> Hiper-corto. Leer al abrir sesión; reescribir al cerrar. **Última:** 2026-10-30 (Optimización Visual y Compactación de Diagramas DFD N0 a N3; 513 tests en verde).

## Ahora
- **Spec Maestro de Cierre Beta unificado (#53):** Consolida las tareas pendientes de Teams en tres pilares: Núcleo Técnico (`esenciatecnica`), Gate de Validación Operativa en Vivo (dominio/Resend/Vercel) y Protocolo de QA + Entregables Académicos. Hoja de ruta secuencial en `docs/specs/cierre-beta/plan-ejecucion.md`.
- **Bloqueo crítico urgente: compra del dominio para conectar Resend (#20, Enzo).** Sin dominio propio
  verificado en Resend (SPF/DKIM) y sin cargar `RESEND_API_KEY` + `RESEND_FROM_EMAIL` en Vercel, Resend
  en modo sandbox sólo permite enviar al correo del titular de la cuenta: **no se puede testear el envío
  real del Remito de venta al Cliente** ni el puente `/api/notifications`.
- **Producción (`esenciatecnica.vercel.app`) y base viva (`otjph…`) funcionando con la demo sembrada (#22):**
  nueve productos con foto real en el bucket público `productos`, seis Pedidos en los cuatro estados
  canónicos (`Pendiente de Pago` ×2, `Pago Validado` ×2 con remitos `R-2026-0000{01,02}`, `Rechazado` y
  `Cancelado`), alertas de stock y hero propio (`public/hero/portada.jpg`). `/admin` responde `401` sin
  credenciales y `200` con la clave, sin pedir credenciales al navegar la tienda (#52).
- **Trabas humanas y orden secuencial:**
  1. **Fase 0 (Inmediata en código):** resolver deuda de estándares pendiente de la revisión del 28-10 (`5324ac47`) y asentar conteos de `respaldo_legacy` (`52e566f4`).
  2. **Fase 1 (Enzo #20 / #18):** cargar datos bancarios (`8943632c`), inyectar `CRON_SECRET` (`a1f81278`) y gestionar el dominio en Resend (`3503c1ff`).
  3. **Fase 2 (Gate en vivo):** promover tareas en `review` a `done` (`cf2285f5`, `40ede00d`, `d028b233`).
  4. **Fase 3 (QA E2E autónomo):** construir `scripts/verificar-e2e.mjs`, documentar `docs/testing/PLAN_DE_PRUEBAS.md`, asentar bitácora en Teams (`29509bd2`, `5823a2db`, `16878016`) y ratificar fotos de beta (`bede4513`).
  5. **Fase 4 (Documentación y Expo):** confeccionar `docs/MANUAL_DE_USO_Y_DESARROLLO.md` (`da6b26f3`) y `docs/academico/PRESENTACION_EXPO_TEC1.md` (`b81c3468`).

## Semáforo
- Local: `typecheck` 0 errores · `lint` 0 errores y 0 warnings · **513 tests** en 38 archivos ·
  `docs:links` 0 links sin resolver sobre 46 archivos `.md` (con salida `!= 0` ante enlaces rotos) ·
  `npm run build` compila las 17 rutas + `src/middleware.ts` **validando tipos en el build**
  (`ignoreBuildErrors: true` retirado de `next.config.ts`) y sin requerir secretos en el entorno.
- **GitHub**: `main` en verde. Publicado el spec de cierre beta #53; abiertos el paraguas #1
  y los tickets que esperan acciones humanas o entorno vivo (#15, #16, #18, #20, #22, #23).
- BD prod `otjph…`: **VERDE** con `npm run bd:viva` (`01`–`06` aplicadas y medidas en las 7 secciones; las 10 tablas cerradas responden estrictamente `401`/`403`).
  Fuera del alcance de la anon key: `respaldo_legacy`, el tope de 5 MB y los MIME de cada bucket.
- **Tablero**: auditado, sincronizado y depurado con `npm run teams`. Se lee en vivo con `npm run teams -- leer` ([`teams.md`](docs/agentes/teams.md) §7).

## Tickets del cierre beta
| Ticket | Qué | Estado |
|---|---|---|
| #53 · Spec | Spec Maestro de Cierre Beta (unificación de 19 tareas) | ✅ publicado (`ready-for-agent`) |
| #15 · D1 | cerrar la migración del MVP | ✅ en todo lo que mide `bd:viva`; abierto sólo por la firma de `respaldo_legacy` |
| #16 · B1 | respaldo + `00`–`06` aplicadas en `otjph` | ✅ `01`–`06` aplicadas y medidas; falta firmar `respaldo_legacy` en el SQL Editor |
| #17 · B3 | `06`: `precio > 0`, `ET007`, mensajes del panel | ✅ cerrado |
| #18 · B4 | cron de vencidos los viernes | ⏳ código y test en `main`; falta `CRON_SECRET` en Vercel para probarlo en vivo |
| #19 · A1 | el panel avisa si el remito no salió | ✅ cerrado |
| #20 · O1 | secretos y entorno de producción | ⏳ `ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY` y `URL`/`ANON_KEY` de `otjph` ya están en Vercel; **urgente**: dominio + Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`), datos de la Cooperadora (`NEXT_PUBLIC_TRANSFERENCIA_*`) y `CRON_SECRET` |
| #21 · B2 | `bd:viva` prueba toda la superficie pública | ✅ cerrado (`65657d5`) |
| #22 · B5 | semilla y fotos de la beta | ⏳ sembrada en `otjph` (`20b50d9`); pendiente reemplazar las fotos de demo por las del taller |
| #23 · B6 | verificación punta a punta en navegador | ⏳ Celeste; desbloqueada en producción (salvo el envío real de email que requiere el dominio en Resend) |

## Hecho (2026-10-30 · Optimización Visual y Compactación de Diagramas DFD N0 a N3 #53)
| Cambio | Qué dejó |
|---|---|
| `quimicashop/diagramas-visor.js` + `quimicashop/style.css` + `docs/academico/DFD.md` + `tests/front/hub-diagramas.test.ts` + `tests/front/dfd-academico.test.ts` | **HU-6 (Compactación y Optimización Visual):** Reorganización estructural de los DFD niveles 0 a 3 mediante subgrafos y carriles lógicos sin alterar la semántica canónica ni los textos de flujos: DFD N0 simétrico con entorno cliente y gestión/control enmarcando el proceso central P0; DFD N1 estructurado en tres carriles paralelos verticales (Entidades Externas | Procesos Principales 1.0–6.0 | Almacenes Canónicos D1–D7) eliminando cruces caóticos de cables; DFD N2 y N3 alineados en bloques verticales compactos de subprocesos y transacciones atómicas (`crear_pedido`, `aprobar_comprobante`). En `diagramas-visor.js`: reducción de espaciado Mermaid (`nodeSpacing: 40`, `rankSpacing: 45`), transición de aristas a `curve: 'linear'` para evitar bucles deformes y refinamiento de bordes de cluster. En `style.css`: ajuste fino de márgenes (padding 16px/24px) y centrado con `transform-origin: 50% 50%`. 6 tests nuevos en Vitest (513 tests en 38 archivos en verde). |

## Hecho (2026-10-30 · Reforma Integral del Hub: Visor Interactivo Mermaid #53)
| Cambio | Qué dejó |
|---|---|
| `quimicashop/index.html` + `quimicashop/style.css` + `quimicashop/diagramas-visor.js` + `tests/front/hub-diagramas.test.ts` | **HU-1 a HU-5:** Sistema de navegación por pestañas en el Hub (`role="tablist"`, `role="tab"`, `role="tabpanel"`, con hash `#diagramas`). Visor documental desacoplado con renderizado Mermaid v10+ secuencial de los 7 modelos canónicos en orden: DFD N0, DFD N1 (D1–D7), DFD N2 (Subsistemas), DFD N3 (Transaccional `crear_pedido`/`aprobar_comprobante`), DER normalizado en 3FN (10 entidades canónicas), Diagrama de Clases UML (entidades y servicios de aplicación) y DCU con validación manual sin IA. Barra de herramientas por diagrama con Zoom (+/-), Reset (1:1), paneo por arrastre táctil/ratón, copia de código Mermaid, descarga directa SVG y PNG (canvas 2x) y modal de Pantalla Completa para la EXPO TEC1. Purgado de vocabulario legacy. 13 tests nuevos en Vitest (507 en 38 archivos en verde). Publicado aviso `AVANCE` en Teams. |

## Hecho (2026-10-30 · Formalización de Diagramas Académicos en Mermaid #53)
| Cambio | Qué dejó |
|---|---|
| `docs/academico/CLASES.md` + `docs/academico/DCU.md` + `docs/academico/DER.md` + `docs/README.md` + `tests/front/diagramas-academicos.test.ts` + `quimicashop/index.html` + `quimicashop/config.js` | **HU-1 a HU-5 (#53):** Formalización de entregables de cátedra en Mermaid: Diagrama de Clases UML completo con 10 entidades canónicas y 6 servicios de dominio (Nieva), Diagrama de Casos de Uso (DCU) con validación manual sin IA y carrito en cliente (Celeste), y DER normalizado en 3FN con delimitación de Fase 2 (Isabella). 15 tests nuevos en Vitest. 3 tareas de Teams movidas a `done` y aviso `AVANCE` publicado. |

## Hecho (2026-10-30 · HU-15: DFD Académico en Mermaid #53)
| Cambio | Qué dejó |
|---|---|
| `docs/academico/DFD.md` + `docs/README.md` + `tests/front/dfd-academico.test.ts` | **HU-15 (#53):** Formalización de los Diagramas de Flujo de Datos (DFD) de niveles 0, 1, 2 y 3 en formato Mermaid (`flowchart TD`) incorporando todas las observaciones docentes de Ariel: eliminación de almacenes de datos en Nivel 0 (Diagrama de Contexto), estructuración de almacenes canónicos D1 a D7 (`CLIENTE`, `PRODUCTO`, `STOCK`, `PEDIDO`, `COMPROBANTE`, `REMITO_VENTA`, `ALERTA_STOCK`) alineados con `docs/MODELO.md`, explicitación del Carrito en el navegador del cliente (sin persistencia en BD), corrección de la liberación de reserva de stock por cron semanal de los viernes 23:59 ART (`cancelar_pedidos_vencidos`) en reemplazo de temporizadores diarios, y notificación de alertas de stock exclusiva como popup en `/admin` (sin correos electrónicos al Administrador). 7 tests nuevos (479 en 36 archivos en verde). Tarea de Celeste movida a `done` en Teams. |

## Hallazgos abiertos
1. 🔴 **URGENTE — Dominio y Resend (#20, Enzo):** comprar el dominio, verificar SPF/DKIM en Resend y cargar `RESEND_API_KEY` y `RESEND_FROM_EMAIL` en Vercel. Bloquea testear el envío real del Remito de venta al Cliente y `/api/notifications`.
2. 🟡 **Datos de la Cooperadora y `CRON_SECRET` (#20 / #18, Enzo):** cargar `NEXT_PUBLIC_TRANSFERENCIA_*` y `CRON_SECRET` en Vercel.
3. 🟡 **Fotos definitivas del taller (#22, Celeste):** reemplazar desde `/admin` las fotos de demostración y pisar `public/hero/portada.jpg`.
4. 🟡 **Verificación en pantalla (#23, Celeste):** recorrer la tienda y `/admin` en navegador (desktop y mobile) y dejar el resultado en la tarea `B6`.
5. 🟡 **`respaldo_legacy` sin firmar (#16, Isabella / Juanma):** correr el bloque de conteos en el SQL Editor de `otjph` y pegarlo en #16.
6. 🟡 **Deuda del review del 28-10 (con tarea en el tablero):** resuelta la exigencia de `401/403` en `admin`/`roll` en `bd:viva` (#53); pendiente la tarea de juicio «Deuda de estándares del cierre beta».

## Reglas y decisiones que no hay que redescubrir
- **1 ticket = 1 sesión = 1 commit quirúrgico.** TDD. Español único. Sin IA. Sin envío.
- **Sin clientes al importar** (AGENTS §7.13): Supabase y Resend se instancian dentro de la función que los usa para que `npm run build` compile con el entorno vacío en CI.
- **El contrato no guarda estado** (AGENTS §8): los conteos, las fechas y el semáforo viven **acá**; ningún spec ni guía congela el número de tests.
- **Dinero:** `NUMERIC(12,2)`, `precio > 0` y `monto > 0`; redondeo en la aritmética (`redondearACentavos`, `subtotalDeLinea`, `totalDelPedido`) y formato adaptativo en la vista (`formatPrice`: entero sin decimales, con centavos dos decimales exactos; [`carrito/spec.md`](docs/specs/carrito/spec.md) §2, [#44](https://github.com/juanmamerodio/esenciatecnica/issues/44)).
- **El remito lo emite la base** en la transacción de aprobación; el front lo compone y lo envía por Resend (posterior y no bloqueante).
- **Storage y claves:** `comprobantes` privado (`foto_url` = clave, signed URL al leer) y `productos` público (`imagen_url` = URL pública). `claveDelArchivo` incluye el bucket (`productos/<id>/…`), así que la URL pública repite `…/object/public/productos/productos/<id>/…`.
- **Hero con foto propia** (`public/hero/portada.jpg`, `FOTO_DEL_HERO`) pasando por `ImagenProducto` (#49).
- **Basic Auth en `src/middleware.ts`** sólo para `/admin` y `/api/admin` (ADR 0005); la tienda entra a `/admin` con navegación de documento (`<a>`) para que Next no prefetchee el `401` (#52).
- **`npm test` corre contra PGlite; `npm run bd:viva` mide la base viva** sin ejecutar RPC destructivas (`GET` en `cancelar_pedidos_vencidos` y argumentos imposibles en las demás).
- **El tablero de Teams se sincroniza con `npm run teams`** y las tareas `done` de más de 24 h se archivan con `npm run teams -- papelera` ([`teams.md`](docs/agentes/teams.md)).
