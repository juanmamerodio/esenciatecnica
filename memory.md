# memory.md · estado de build

> Hiper-corto. Leer al abrir sesión; reescribir al cerrar. **Última:** 2026-10-25 (sesión de las tajadas
> `T3`, `T5`, `T6`, `T7` y `T8` del front, más el fix de tipografía en `<html>` y el push a Vercel).

## Ahora
- Objetivo: el **front del MVP está completo, en verde y desplegado**; lo que falta para que la tienda
  funcione de punta a punta es aplicar las migraciones y poner las claves. En producción ya se sirve la
  Home nueva, pero la grilla de productos cae al estado de error por la BD y por las claves ausentes.
- Contrato del front: `src/lib/database.types.ts` (canónico) + módulos `catalogo.ts` / `carrito.ts` /
  `checkout.ts` / `admin.ts` / `remito.ts`, cada uno con su adaptador `*-servidor.ts`.

## Semáforo
- Local: `typecheck` 0 errores · `lint` 0 errores y **0 warnings** · **229 tests** en 19 archivos ·
  `npm run build` **compila sin `RESEND_API_KEY`** y el middleware entra en el build.
- BD prod `otjph…`: **ROJA, igual que antes**. Sigue faltando: `vista_catalogo` (`PGRST205`), las RPC de
  `02` (`crear_pedido` → `PGRST202`), RLS de `03` sin verificar, bucket `comprobantes` de `04` y —nuevo—
  bucket `productos` de `05` (la agregó `T7` y la revisa Isabella).
- `.env.local`: sólo `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `VERCEL_OIDC_TOKEN`.
  Faltan `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `RESEND_API_KEY` y `NEXT_PUBLIC_TRANSFERENCIA_*`.
- Producción Vercel (`esenciatecnica.vercel.app`): desde `c80150e` sirve el front nuevo (verificado en
  Chrome: `font-family` computada = **DM Sans**; antes caía a la fuente por defecto del navegador).
  La Home renderiza, pero la grilla de productos muestra «No pudimos cargar el catálogo»: la BD sigue
  roja y faltan claves en Vercel.
- Nada de esto se maquilló: la tienda **no** compra de punta a punta todavía. Lo verificado en navegador
  es el shell y la tipografía, no el flujo de compra.

## Hecho (2026-10-25)
| Commit | Tajada | Qué dejó |
|---|---|---|
| `0e04196` | Gates G1/G2/G3 | Decisiones registradas en `docs/specs/front-mvp/spec.md` §6 y §10; gate nuevo G4 (datos de transferencia). |
| `95b5608` | **T3 · Detalle** | `/producto/[id]` reutilizando `leerCatalogo`; 404 de inactivos por `vista_catalogo`; la card enlaza al detalle. 6 tests. |
| `8064dff` | **T6 · Institucional** | `/about` con cosmética e higiene (sin vocabulario de laboratorio) y la franja de valores; la Home la suelta. 9 tests. |
| `20eb571` | **T5 · Checkout** | `src/lib/checkout.ts` + `/api/checkout` + UI con monto declarado y reintento sin duplicar; se retiró todo el camino legacy de compra. 25 tests. |
| `7a6065c` | **T7 · Admin** | `src/middleware.ts` (Basic Auth) + `admin.ts` + `/api/admin/*` + panel (pedidos, stock, alertas, productos, fotos); migración `05` (bucket `productos`); ADR 0005; se borró `supabase.ts` y `/api/sync-sheets`. 46 tests. |
| `2ece28f` | **T8 · Remito** | `remito.ts` + email al Cliente al aprobar (no bloqueante) + reenvío + `/admin/remito/[idComprobante]`; Resend por llamada. 18 tests. |
| `7c968a0` | Docs | AGENTS §8/§9 al día, deuda legacy 1–4 cerrada, spec del checkout corregida. |

Specs nuevas: `docs/specs/detalle-producto`, `sobre-el-proyecto`, `admin`, `remito`. ADR nuevo:
`docs/adr/0005-basic-auth-en-middleware.md`. Migración nueva:
`supabase/migrations/20261023090500_05_storage_productos.sql` (bucket **público** `productos`).

## Falta
1. **Isabella:** `vista_catalogo`, RPC de `02`, RLS de `03` y buckets `04` + `05`, y recargar PostgREST.
2. **Enzo:** `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` y `RESEND_API_KEY` en `.env.local`/Vercel.
3. **Cooperadora (G4):** alias, CBU y titular reales → `NEXT_PUBLIC_TRANSFERENCIA_*`; sin eso el checkout
   dice que los confirma la Cooperadora y **no** muestra datos bancarios inventados.
4. **Verificación manual en navegador** de `/`, `/catalog`, `/producto/<id>`, `/cart`, `/checkout`, `/about`
   y `/admin` (con las claves y las migraciones puestas).
5. ✅ **Hecho** (`c80150e`): push a `main`; producción ya sirve el front nuevo. Falta que la grilla de
   productos deje de caer al error (puntos 1 y 2) y la verificación manual del resto de las rutas.

## Revisión de código (2026-10-25) · hallazgos abiertos

Revisión de contexto limpio sobre `1e91c03...HEAD`, en dos ejes. **AGENTS §6.5: los hallazgos no se
parchean en la sesión que escribió el código**; van a la próxima, con su test.

**Eje Spec (verificado a mano):**
1. 🔴 `buscarCliente` usa `ilike` y el email que Zod admite puede traer `%`/`_`, que en LIKE son comodines:
   un email como `%@ejemplo.com` reutilizaría el Cliente de otra persona o rompería por múltiples filas.
   Fix: igualdad sobre `lower(email)` —o escapar `%`, `_` y `*`— y un test que lo fije.
2. 🟠 El `aviso` de fallo de correo **nunca llega** al Administrador: `pedirAlPanel` descarta el cuerpo y
   `PanelDePedidos` afirma siempre “quedó aprobado y la base emitió el remito”. Fix: devolver el cuerpo en
   `pedirAlPanel` y mostrar el `aviso` (el test actual sólo busca la palabra en la ruta).
3. 🟡 `tiempo_produccion` no aparece en `/catalog`: la spec del front §6.2 lo pide “en catálogo y detalle,
   **no** en la Home”. Hoy sólo está en el detalle y en el panel.
4. 🟡 `urlFirmadaDelComprobante` (`src/lib/admin.ts`) es superficie pública sin consumidor ni borde HTTP:
   código muerto (AGENTS §7.5); el panel firma dentro de `pedidos()`.
5. 🟡 Tras un `monto-no-coincide` se corrige el campo, pero el sidebar sigue mostrando el total del carrito
   cuando el de la base difiere (la spec del checkout dice que manda el de la base).
6. 🟡 La spec de admin se contradice sobre la alerta: §HU dice que la genera la base y no se recalcula; la
   tabla de seams pide “alerta recalculada”. El front la recalcula: decidir una sola fuente.
7. 🟡 Límites propios del módulo de checkout que la spec no pide (nombre ≥ 2, teléfono ≤ 30, máximo 50 líneas).

**Eje Estándares** (el revisor confirmó verde `typecheck`, `lint` y 227 tests; sin `any`, sin `catch {}`
vacíos y sin secretos en el cliente):
8. 🟠 **Duplicación de "archivo subido" (AGENTS §7.4).** `claveDelComprobante` ≡ `claveDeLaFoto`,
   `revisarArchivo` ≡ `revisarArchivoDeFoto` ≡ `revisar` (tres límites distintos) y las constantes gemelas
   `LIMITES` / `LIMITES_DE_FOTO`. Además verbatim: `camposDe`, `codigoDeError`, `fechaLegible`, `esArchivo`
   y los dos mapas `ESTADO_HTTP`. Fix: un `archivo-subido.ts` y un `errores-de-base.ts` compartidos.
9. 🟠 `sinConfiguracion()` responde 503 “falta `SUPABASE_SERVICE_ROLE_KEY`” ante **cualquier** error
   inesperado de cinco rutas: diagnóstico falso (AGENTS §7.10). Hay que distinguir la falta de
   configuración de una falla real.
10. 🟡 Los bordes de cliente **castean** la respuesta (`as ResultadoCheckout` en el checkout y `as {...}` en
    `comun.ts`) en vez de validarla con Zod (AGENTS §7.7).
11. 🟡 Juicios del baseline, para tener a mano: `describirError` repetido en `checkout.ts` y `admin.ts`
    (Repeated Switches); dinero como `number` con redondeo ad-hoc (Primitive Obsession); `BUCKET_COMPROBANTES`
    exportado por el adaptador de checkout y consumido por el panel (acoplamiento — usarlo, en realidad, sí
    lo usa `admin-servidor.ts`); `comun.ts` mezcla llamadas HTTP con formato de fecha.

## Reglas
- 1 ticket = 1 sesión = 1 commit. TDD. Español único. Sin IA. Sin envío.
- Dinero `NUMERIC(12,2)`; total derivado; un remito por comprobante; un comprobante pendiente por pedido.
- El remito lo emite **la base**; el front lo compone y lo envía. El email es posterior y no bloqueante.
- `anon`: solo `vista_catalogo`/`producto`/`stock`. Las RPC y el panel, solo `service_role` + Basic Auth.
- El front no toca tablas legacy: ya no queda ninguna (`supabase.ts` y `sync-sheets` se retiraron).

## Decisiones que no hay que redescubrir
- **G2:** el detalle es **página propia** (`/producto/[id]`), no card ampliada.
- **G3:** la institucional se llama **“Sobre el proyecto”** y vive en `/about`.
- **G1:** la franja de valores vive **solo** en `/about`; la Home no la repite.
- **Basic Auth en `src/middleware.ts`** (no en la raíz: con `src/app` Next sólo compila ahí) y **solo**
  para `/admin` y `/api/admin`. El test de T0 se ajustó para verificar que el middleware **no** negocia
  idioma (ADR 0005). El Basic Auth lo decide `src/lib/admin-auth.ts`, que sí se testea.
- **`foto_url` = clave del objeto** (bucket privado, signed URL al leer); **`imagen_url` = URL pública**
  (bucket público `productos`).
- **Vitest resuelve `@/`** con un alias en `vitest.config.ts`, porque `admin.ts` importa las listas
  canónicas de estados como valores.
- El panel **no** expone la clave del bucket: el modelo de lectura entrega sólo la signed URL.
- **Las variables de `next/font` van en `<html>`, no en `<body>`.** `globals.css` declara en `:root`
  `--font-sans: var(--font-dm-sans), …`, y una custom property se sustituye en el elemento **donde se
  declara** (el `<html>`), no donde se usa. Con la clase de `next/font` en el `<body>`, `--font-sans`
  queda inválido y el navegador cae a su fuente por defecto — medido en Chrome: `"Times New Roman"`,
  con los `.woff2` ya descargados y servidos. Lo cubre `tests/front/identidad-shell.test.ts`
  (§F0 · tipografía), y `font-mono` cae por el mismo motivo.
