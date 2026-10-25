# memory.md · estado de build

> Hiper-corto. Leer al abrir sesión; reescribir al cerrar. **Última:** 2026-10-25 (sesión de las tajadas
> `T3`, `T5`, `T6`, `T7` y `T8` del front).

## Ahora
- Objetivo: el **front del MVP está completo y en verde**; lo único que falta para verlo funcionando es
  aplicar las migraciones y poner las claves. Después: verificación manual en navegador y push a Vercel.
- Contrato del front: `src/lib/database.types.ts` (canónico) + módulos `catalogo.ts` / `carrito.ts` /
  `checkout.ts` / `admin.ts` / `remito.ts`, cada uno con su adaptador `*-servidor.ts`.

## Semáforo
- Local: `typecheck` 0 errores · `lint` 0 errores y **0 warnings** · **227 tests** en 19 archivos ·
  `npm run build` **compila sin `RESEND_API_KEY`** y el middleware entra en el build.
- BD prod `otjph…`: **ROJA, igual que antes**. Sigue faltando: `vista_catalogo` (`PGRST205`), las RPC de
  `02` (`crear_pedido` → `PGRST202`), RLS de `03` sin verificar, bucket `comprobantes` de `04` y —nuevo—
  bucket `productos` de `05` (la agregó `T7` y la revisa Isabella).
- `.env.local`: sólo `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `VERCEL_OIDC_TOKEN`.
  Faltan `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `RESEND_API_KEY` y `NEXT_PUBLIC_TRANSFERENCIA_*`.
- Producción Vercel: sigue sirviendo el Home legacy hasta que se pusheen estos commits.
- Nada de esto se maquilló: **no** hay verificación en navegador ni demo en producción; los módulos puros
  y sus tests sí están verdes.

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
5. Push a `main` (Vercel) para que producción deje de servir el Home legacy.

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
