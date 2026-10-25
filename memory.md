# memory.md · estado de build

> Hiper-corto. Leer al abrir sesión; reescribir al cerrar. **Última:** 2026-10-25 (sesión de tablero + spec de checkout).

## Ahora
- Objetivo: cerrar el paquete de base (versionarlo y pushearlo) y arrancar `T5 · Checkout` por la spec.
- Contrato del front: `src/lib/database.types.ts` (canónico) + módulos `catalogo.ts` / `carrito.ts` / `checkout.ts`.

## Semáforo
- BD prod `otjph…`: **ROJA, a medias**. La migración `01` está aplicada en su mayor parte (`producto.activo`/
  `imagen_url`, `pedido.estado_actual`, `comprobante.monto`/`foto_url`, `detalle_del_pedido.subtotal`,
  `remitos_de_venta.numero`, legacy `productos`/`pedidos` eliminadas), pero:
  - `vista_catalogo` **no existe** (`PGRST205`) → `/` y `/catalog` siguen en el estado de error diseñado;
  - las RPC de `02` **no existen** (`crear_pedido` responde `PGRST202`);
  - el bucket `comprobantes` de `04` **no existe** (`NoSuchBucket`);
  - RLS (`03`) sin verificar; `cliente`/`pedido`/`comprobante` leen 200 vacías.
  El cache de PostgREST ya conoce columnas nuevas de `01`, así que el 404 de la vista no es cache viejo.
- Local: `typecheck` 0 errores · `lint` 0 errores (1 warning en `ReceiptUploader.tsx`) · **122 tests** en 14 archivos.
- Producción Vercel: sirve el Home **legacy** ("Favoritos de la Comunidad"/"Ofertas Especiales" presentes,
  "Nuestros productos" ausente) hasta que se pusheen los commits del front.
- Repo: el paquete de base (`supabase/`, `tests/db/`, `vitest.config.ts`, `database.types.ts`) y las specs
  `bd-mvp`/`front-mvp` estaban **sin versionar**; `HEAD` importaba `database.types.ts`, que no existía en git.

## Hecho (2026-10-25)
- GET del tablero de Teams (`team_tasks`, 32 tareas) y verificación de los dos `review` de Isabella: reales
  pero **incompletos** (faltan vista, RPC y bucket).
- `docs/specs/checkout/spec.md` (`T5` · issue #10): HU-1..HU-7, seams, decisiones y blockers.
- Decisiones registradas en `docs/MODELO.md` §9: identidad del Cliente por `email` (upsert con service role,
  sin RPC nueva) y `foto_url` como clave del objeto en el bucket privado.
- Números corregidos: AGENTS §8 (65 → 122 tests, 2 → 1 warning) y `docs/AUDITORIA.md` §4.2/§9 (16 → 32 tareas).
- Nota publicada en el Teams para Isabella con las evidencias y el SQL exacto que falta.
- Versionado y push del paquete de base + specs (ver `git log`).

## Falta
1. **Isabella:** crear `vista_catalogo` (`supabase/migrations/…_01_esquema_mvp.sql` §Vista de catálogo),
   correr `02` (RPC), `04` (bucket) y `03` (RLS), y recargar el cache de PostgREST.
2. **Enzo:** `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` y `RESEND_API_KEY` en `.env.local`/Vercel.
3. **`T5`:** módulo `src/lib/checkout.ts` + `POST /api/checkout`, retiro del camino legacy de compra.
4. **`T3`** (decisión G2), **`T6`** (G1/G3), **`T7`**, **`T8`**.
5. Verificación **visual** en navegador de F0/T1/T2/T4 con catálogo real (hoy sólo HTTP y tests de módulo).

## Bloqueos
- Sin migraciones aplicadas no hay demo en producción: el módulo puro y sus tests sí se pueden hacer.
- Decisiones humanas pendientes: G1 (UX/copy §6) y G3 (nombre de la página institucional) para T6; G2 para T3.

## Reglas
- 1 ticket = 1 sesión = 1 commit. TDD. Español único. Sin IA. Sin envío.
- Dinero `NUMERIC(12,2)`; total derivado; un remito por comprobante; un comprobante pendiente por pedido.
- `anon`: solo `vista_catalogo`/`producto`/`stock`. Las RPC, solo `service_role`.
- El front no toca tablas legacy: el catálogo pasa por `vista_catalogo` y el checkout por las RPC.
