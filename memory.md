# memory.md · estado de build

> Hiper-corto. Leer al abrir sesión; reescribir al cerrar. **Última:** 2026-10-28 (segunda sesión: el rojo
> de CI entra en la raíz —#50—, el seed deja de publicar copy de laboratorio —#51— y `AGENTS.md` deja de
> guardar estado. El equipo queda con el camino crítico publicado para el 29-10).

## Ahora
- Objetivo: **beta presentable el viernes 30-10**. No la traba el código: quedan **cuatro acciones humanas**,
  ya publicadas como BLOQUEO en la bandeja de Teams.
- Orden del camino crítico: **#20 secretos (Enzo)** → **#22 seed + fotos (Enzo)** → **#23 verificación en
  navegador (Celeste)**. En paralelo, **firmar `respaldo_legacy`** en el SQL Editor cierra #16 y #15.
- **`main` está en verde**: el build de CI dejó de necesitar secretos (#50, `8b0617b`) y la corrida
  `40796836397` cerró `success` con los cinco pasos, `Build Next.js` incluido. Ya no hay un «rojo esperado»
  que enseñe a ignorar el CI.
- `AGENTS.md` **ya no guarda estado**. Los conteos y las fechas vivían ahí y se vencían solos —por eso cada
  cierre re-fechaba §8, y por eso tres specs arrastran el «279 tests» de octubre—. El estado es **este
  archivo**, y `AGENTS.md` §0 ahora manda leerlo primero. Regla nueva: **§7.13, sin clientes al importar**.
- **Panel probado a medias** (28-10, `next dev` + la clave de Química): `/admin` sin credenciales da `401`
  con su `WWW-Authenticate`; con la clave da `200` y el cartel «Panel sin configurar · falta
  `SUPABASE_SERVICE_ROLE_KEY`». El Basic Auth está conectado; falta la clave de servicio para verlo con datos.
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VERCEL_OIDC_TOKEN` y
  `ADMIN_PASSWORD` (la puso Juanma el 28-10). Faltan `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL`, `CRON_SECRET` y `NEXT_PUBLIC_TRANSFERENCIA_*` (#20, Enzo).

## Semáforo
- Local: `typecheck` 0 errores · `lint` 0 errores y 0 warnings · **402 tests** en 30 archivos ·
  `docs:links` 0 links sin resolver · `npm run build` compila con el **entorno vacío** (probado con las
  ocho variables que la workflow pasa, todas en blanco).
- **GitHub**: `main` hasta `d53fffe`. La corrida `40796836397` (`28e59ff`) cerró **success**: Typecheck,
  Lint, Test, Docs links y **Build Next.js** en verde. Los secretos de Actions siguen faltando, pero el
  build ya no los necesita.
- BD prod `otjph…`: **VERDE** con el `bd:viva` del 28-10 (`01`–`06` aplicadas). Fuera del control, por ser
  invisible a la anon key: `respaldo_legacy`, el límite de 5 MB y los MIME de cada bucket.
- **Tablero**: auditado y sincronizado con `npm run teams` —cuatro tareas nuevas y dos notas, AVANCE y
  BLOQUEO—. Sus números se leen con `npm run teams -- leer`; no se cachean acá ([`teams.md`](docs/agentes/teams.md) §7).

## Tickets del cierre beta
| Ticket | Qué | Estado |
|---|---|---|
| #15 · D1 | cerrar la migración del MVP | ✅ en todo lo que mide `bd:viva`; sigue abierto por la firma de `respaldo_legacy` |
| #16 · B1 | respaldo + `00`–`06` aplicadas en `otjph` | ✅ `01`–`06` aplicadas y medidas; falta firmar `respaldo_legacy` |
| #17 · B3 | `06`: `precio > 0`, `ET007`, mensajes del panel | ✅ código, test y `06` aplicada |
| #18 · B4 | cron de vencidos los viernes | ✅ código y test; falta `CRON_SECRET` para correrlo en vivo |
| #19 · A1 | el panel avisa si el remito no salió | ✅ helper + panel + tests |
| #20 · O1 | secretos y entorno de producción | ⏳ Enzo; **es el camino crítico** |
| #21 · B2 | `bd:viva` prueba toda la superficie pública | ✅ cerrado (`65657d5`) |
| #22 · B5 | semilla y fotos de la beta | ⏳ el seed del repo no está aplicado en `otjph` y no hay fotos |
| #23 · B6 | verificación punta a punta en navegador | ⏳ Celeste, bloqueada sólo por #20 y #22 |
| #49 | la Home en 500 por una `imagen_url` de host ajeno | ⏳ defensa en `backlog`; el seed de #22 apaga el síntoma |
| #50 | el build de CI deja de necesitar secretos | ✅ cerrado (`8b0617b`); **CI en verde** |
| #51 | el seed publicaba «laboratorio» | ✅ cerrado (`d53fffe`); el test ahora mira los datos |

## Hecho (2026-10-28, segunda sesión · #50, #51 y el contrato)
| Cambio | Qué dejó |
|---|---|
| `src/app/api/notifications/route.ts` | `tablero()` perezoso y memoizado, igual que `correo()`, en lugar del `createClient` del cuerpo del módulo. Sin esto, `Collecting page data` moría con `supabaseKey is required` apenas el entorno no traía la clave —que es exactamente CI—. |
| `tests/front/notificaciones.test.ts` (nuevo, 3 tests) | Importa la ruta con el entorno vacío —reproduce el rojo de CI— y falla si alguien vuelve a asignar `createClient(...)` al importar o a leer las cuatro claves fuera del accesor. |
| `supabase/seed.sql` + `tests/front/sobre-el-proyecto.test.ts` | El copy del Alcohol en Gel pasa a «elaborado por el Departamento de Química»; el vocabulario retirado ahora se chequea en **todo** el SQL de `supabase/`, no sólo en `src/`. Importaba ya: #22 iba a sembrar ese texto para la demo. |
| `AGENTS.md` | §0 manda leer `memory.md` primero; §2 suma el Estado como fuente y aclara que no es contrato; §7.13 «sin clientes al importar»; §8 deja de congelar conteos y fechas; §10 alinea `done` con la excepción de documentación y configuración; §12 arranca por `memory.md` y cierra con `docs:links`. |
| Revisión en contexto limpio | Dos ejes sobre los 38 commits de `7ad618c..HEAD` (99 archivos, +7165/−845): **19 hallazgos** (12 de estándares y 7 de spec). Los dos bugs —el cron que trata la configuración faltante como fallo transitorio y el total pegajoso del checkout— y la deuda quedaron como **tareas nuevas del tablero**; no se parchearon en la sesión del review (AGENTS §6.5). |
| GitHub | **#50** y **#51** creados, arreglados y cerrados con su comentario de evidencia; commits `8b0617b` (fix + test), `28e59ff` (AGENTS.md) y `d53fffe` (seed) en `main`. |
| Teams | Cuatro tareas nuevas —firmar `respaldo_legacy`, el cron, el total del checkout y `bd:viva` con `admin`/`roll`— más la deuda del review; y dos notas: AVANCE del cierre y BLOQUEO con las cuatro acciones humanas que quedan. |

## Hallazgos abiertos
> Los hallazgos de código del cierre anterior están cerrados y la base viva ya no es uno. Lo que queda son
> claves, datos de demo y verificación en pantalla, más la deuda que dejó el review de esta sesión —que ya
> tiene tarea—.
1. 🔴 **Secretos (#20, Enzo):** sin `SUPABASE_SERVICE_ROLE_KEY` no hay panel con datos, ni checkout, ni cron
   en vivo, y **es lo único que separa a la beta de la demo**. `ADMIN_PASSWORD` ya está.
2. 🟡 **Seed y fotos (#22):** el catálogo vivo no es el del repo (stock 50/30/100 sin nadie bajo el umbral,
   `imagen_url` en `ejemplo.com`), así que el popup de alerta no tiene qué mostrar y la tienda no tiene
   fotos. Se arregla corriendo `supabase/seed.sql` y subiendo fotos desde `/admin`. El seed ya no trae copy
   de laboratorio (#51).
3. 🔴 **La Home devuelve 500 con esos datos ([#49](https://github.com/juanmamerodio/esenciatecnica/issues/49)):**
   `next/image` tira al validar un `src` fuera de `images.remotePatterns` y el `onError` no corre porque la
   excepción es del render. El seed lo apaga (deja `imagen_url` en `NULL`); la **defensa** —placeholder para
   hosts ajenos, con test— sigue en `backlog` y la encontró de nuevo el review de spec.
4. 🟡 **`respaldo_legacy` sin firmar:** `bd:viva` no puede verlo (la anon key no lee otros esquemas); lo
   firma quien corrió `00` en el SQL Editor. Tarea nueva del tablero.
5. 🟡 **Verificación en pantalla (#23, Celeste):** ninguna tajada del front se vio en un navegador con la
   base migrada; bloqueada por #20 y #22. El panel se probó a medias el 28-10 (Basic Auth y el cartel de
   falta de clave), no el flujo.
6. 🟡 **Deuda del review del 28-10:** dos bugs con tarea propia (el cron y el total del checkout), `bd:viva`
   tolerando que `admin`/`roll` no existan, y el resto —`estadoHttp()` sin consumidor, el guard de env
   duplicado en los tres servicios de servidor, `describirError` repetido, los `alter table` de más en `00`,
   `codigoDe` duplicado en el PostgREST falso, `format.ts` como módulo del dinero— en «Deuda de estándares
   del cierre beta».
7. 🟡 **Deuda de las skills del proyecto (revisión del 28-10):** la skill de `bd-viva` no nombra
   `scripts/verificar-bd-viva.mjs`, `tablero-teams` copia el bloque de comandos en vez de apuntarlo y falta
   `PARÁMETROS DE ENTRADA`; el test fija exactamente dos skills. Tarea `backlog` del tablero.
8. ✅ **Contrato del tablero vs excepción de documentación:** `AGENTS.md` §10 ahora nombra la excepción de
   §8, así que `done` no se contradice entre documentos. Queda decidir si `teams.md` §3 la nombra también.
9. 🟡 **Línea base de tests en tres specs:** `carrito`, `catalogo` y `detalle-producto` siguen diciendo
   «279 tests en 23 archivos». `AGENTS.md` §8 ya no congela conteos —esa es la regla que faltaba—, así que
   queda limpiar los tres. Tarea `backlog` del tablero.

## Reglas
- 1 ticket = 1 sesión = 1 commit quirúrgico. TDD. Español único. Sin IA. Sin envío.
- **Sin clientes al importar** (AGENTS §7.13): Supabase y Resend se instancian dentro de la función que los
  usa. Un cliente en el cuerpo del módulo ata `npm run build` a que la clave exista y tumba el build en CI.
- **El contrato no guarda estado** (AGENTS §8): los conteos, las fechas y el semáforo viven **acá**;
  `AGENTS.md` guarda las reglas y qué mide cada comando. Un número congelado en el contrato ya nació viejo.
- Dinero `NUMERIC(12,2)`; `precio > 0` y `monto > 0`; total derivado; un remito por comprobante; un
  comprobante pendiente por pedido.
- El total **se calcula**, se redondea y se **muestra** con la misma regla: `subtotalDeLinea` y
  `formatPrice` son las únicas funciones del dinero.
- El remito lo emite **la base**; el front lo compone y lo envía. El email es posterior y no bloqueante.
- `anon`: sólo `vista_catalogo`/`producto`/`stock`. Las RPC y el panel, sólo `service_role` + Basic Auth.
- **Buckets:** `comprobantes` privado (la imagen es del Cliente) y `productos` público (las fotos son de
  la tienda); los dos de 5 MB y png/jpeg/webp. Un control que los mida con la anon key **no puede** usar
  la ficha del bucket: son dos sondas por objeto.
- **`npm test` no prueba la base viva**: para eso está `npm run bd:viva`. Falla si una tabla cerrada
  responde `200` (aunque venga vacía) o si anon puede ejecutar una RPC.
- **Rechazo terminal:** no se reabre un pedido; el Cliente vuelve a comprar.
- **Cron:** viernes 23:59 ART = `59 2 * * 6` UTC en `vercel.json`, con `CRON_SECRET`. Fallback manual:
  `select cancelar_pedidos_vencidos();` en el SQL Editor.
- **El tablero de Teams se sincroniza con `npm run teams`** (puente temporal por PostgREST con la anon key
  pública de `quimicashop/config.js`). Contrato, estados y ritual: [`teams.md`](docs/agentes/teams.md).
- **Un issue se cierra con evidencia, no por confianza**: el comentario de cinco bloques y **commits y
  tests que existan de verdad**, subidos. La premisa de un ticket se verifica contra el artefacto.

## Decisiones que no hay que redescubrir
- **G2:** el detalle es **página propia** (`/producto/[id]`), no card ampliada.
- **G3:** la institucional se llama **“Sobre el proyecto”** y vive en `/about`.
- **G1:** la franja de valores vive **solo** en `/about`; la Home no la repite.
- **Basic Auth en `src/middleware.ts`** (no en la raíz: con `src/app` Next sólo compila ahí) y **solo**
  para `/admin` y `/api/admin`. El test de T0 verifica que el middleware **no** negocia idioma (ADR 0005).
- **`foto_url` = clave del objeto** (bucket privado, signed URL al leer); **`imagen_url` = URL pública**
  (bucket público `productos`). El seed no inventa fotos: se suben desde `/admin`.
- **El build no lee secretos.** Que compile con el entorno vacío **no** significa que la app funcione sin
  claves: significa que un fork y CI pueden correr la puerta completa. Si el build vuelve a pedir una clave,
  hay un cliente instanciado al importar (§7.13).
- **Una superficie pública se prueba contra la base viva, no contra el build.** El rojo del build era del
  build; el de los buckets era del control (`bd-viva`).
- **Vitest resuelve `@/`** con un alias en `vitest.config.ts`, porque `admin.ts` importa las listas
  canónicas de estados como valores.
- El panel **no** expone la clave del bucket: el modelo de lectura entrega sólo la signed URL.
- **Las variables de `next/font` van en `<html>`, no en `<body>`.** Lo cubre
  `tests/front/identidad-shell.test.ts` (§F0 · tipografía).
- **`bd:viva` no ejecuta RPC destructivas:** `cancelar_pedidos_vencidos()` se consulta con `GET`
  (read-only) y las demás con argumentos imposibles; una respuesta que no sea `401/403` delata que anon
  puede ejecutarlas.
- **`npm test` pasa en verde con la base rota** porque aplica las migraciones del repo en PGlite. Y un
  control rojo no siempre es la base rota: el 28-10 el rojo era del control (los buckets). Antes de
  culpar al esquema, probar la interfaz pública a mano.
- **Dinero:** el formato es **adaptativo** (entero sin decimales, con centavos dos decimales exactos); el
  redondeo vive en la aritmética (`redondearACentavos`, `subtotalDeLinea`) y la vista sólo muestra
  (`formatPrice`). La decisión está escrita en [`formato-del-dinero`](docs/specs/formato-del-dinero/spec.md) §4.
- Un spec **no se reescribe para tapar una desviación**: se marca la fila como `desviación` con
  `archivo:línea` y se abre la tarea. El código y la base mandan sobre el texto.
