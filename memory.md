# memory.md · estado de build

> Hiper-corto. Leer al abrir sesión; reescribir al cerrar. **Última:** 2026-10-27 (cierre beta en
> repo: `00` corregida, `06`, cron, A1, `bd:viva` y seed).

## Ahora
- Objetivo: **beta presentable el viernes 30-10**. El front y el código del cierre beta están
  completos; **la base viva sigue a medio migrar** y es el único camino crítico.
- Hecho en repo: B3 (#17), B4 (#18), A1 (#19), B2 (#21) y B5 (#22). Falta **aplicar** `00`–`06` y el
  seed en `otjph` (B1/#16, Juanma con revisión de Isabella), cargar secretos (O1/#20, Enzo) y la
  verificación de punta a punta (B6/#23, Celeste).
- Decisión vigente: **Juanma aplica las migraciones con revisión de Isabella**; el DDL sigue siendo de
  ella y el cierre se firma con `npm run bd:viva` verde.

## Semáforo
- Local: `typecheck` 0 errores · `lint` 0 errores y 0 warnings · **279 tests** en 23 archivos ·
  `npm run build` compila sin `RESEND_API_KEY` y ya incluye `/api/cron/vencidos`.
- BD prod `otjph…`: **ROJA**, **26 desajustes** medidos con el `bd:viva` nuevo. Además de los 13
  originales, ahora ve:
  - lectura anónima abierta (`200 []`) en **las diez** tablas cerradas, incluidas `admin` y `roll`;
  - `stock.porcentaje` y la vista con forma vieja (`stock_actual`, `stock_warning`, `porcentaje`, `activo`);
  - `detalle_del_pedido.id_detalle` (tabla todavía abierta) y `detalle_carrito` siguen existiendo;
  - `crear_pedido` sigue sin la firma de dos argumentos;
  - **la anon key puede ejecutar** `aprobar_comprobante`, `rechazar_comprobante` y
    `cancelar_pedidos_vencidos` (hallazgo nuevo de B2);
  - no existen los buckets `comprobantes` ni `productos`.
- `respaldo_legacy` no existe todavía en `otjph`; la migración `00` **ya está corregida** (detecta
  legacy por `detalle_carrito`/`stock.porcentaje`, anota conteos y aborta si no coinciden). No correr
  `01` sin verificar `respaldo_legacy.conteos`.
- `.env.local`: sólo `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `VERCEL_OIDC_TOKEN`.
  Faltan `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
  `CRON_SECRET` y `NEXT_PUBLIC_TRANSFERENCIA_*`.

## Tickets del cierre beta
| Ticket | Qué | Estado |
|---|---|---|
| #16 · B1 | respaldo + `00`–`05` aplicadas en `otjph` | repo listo; **falta aplicar** (Juanma/Isabella) |
| #17 · B3 | `06`: `precio > 0`, `ET007`, mensajes del panel | ✅ código + tests; falta aplicar `06` |
| #18 · B4 | cron de vencidos los viernes | ✅ `cron-auth`, ruta, `vercel.json` |
| #19 · A1 | el panel avisa si el remito no salió | ✅ helper + panel + tests |
| #20 · O1 | secretos y entorno de producción | ⏳ Enzo |
| #21 · B2 | `bd:viva` cubre toda la superficie pública | ✅ reglas + script + tests |
| #22 · B5 | semilla de la beta | ✅ seed de tres productos; ⏳ fotos desde `/admin` |
| #23 · B6 | verificación punta a punta en navegador | ⏳ Celeste, bloqueada por B1/O1 |

## Hecho (2026-10-27, sesión de implementación)
| Cambio | Qué dejó |
|---|---|
| `00_respaldo_legacy.sql` | Marcador por `detalle_carrito`/`stock.porcentaje`; `respaldo_legacy.conteos`; aborta si origen y copia no coinciden. |
| `06_cierre_beta.sql` | `producto_precio_positivo` (`precio > 0`) y trigger `stock_valida_reserva` con `ET007`. |
| `admin.ts` + `admin-http.ts` | `ET007` → `stock-bajo-reserva` (campo `cantidad_actual`), `23505` → `nombre-duplicado` (campo `nombre`), `23514` como último recurso; HTTP 409. |
| `cron-auth.ts`, `cron.ts`, `cron-servidor.ts`, ruta y `vercel.json` | `503` sin `CRON_SECRET`, `401` con secreto incorrecto, `200 { cancelados }`; `59 2 * * 6`. |
| `comun.ts` + `PanelDePedidos.tsx` | El `aviso` de Resend no se descarta: `role="alert"`, reenvío disponible y sin éxito falso. |
| `scripts/bd-viva-reglas.mjs` + script | Diez tablas cerradas con `401/403`, columnas legacy, RPC existentes **y cerradas a anon**, buckets, `detalle_carrito`; exit code y resumen. |
| `supabase/seed.sql` | Tres productos idempotentes, stock no destructivo, uno bajo el umbral; sin rutas locales muertas. |
| Docs | Spec `bd-mvp` (runbook + fallback del cron + seams), `.env.example` con `CRON_SECRET`, `AGENTS.md` §8. |

## Hallazgos abiertos
1. 🔴 `.agents/skills/` **no existe**, y `AGENTS.md` §11 lo declara como fundación.
2. 🟠 `checkout/spec.md` se contradice: HU-3 (`:87`) dice que el monto viene precargado; §6.3 (`:166`)
   dice que no se auto-completa. El código sigue HU-3.
3. 🟡 `sobre-el-proyecto/spec.md` §1: `/about` y el footer siguen usando `FlaskConical`.
4. 🟡 Hueco de plantilla transversal: ningún spec tiene sección de notas finales ni lista numerada de
   historias; 25 HU no enuncian actor ni beneficio.
5. 🟡 Trazabilidad: #2, #5, #6, #8, #9, #10, #12, #13, #14 siguen **OPEN** aunque `AGENTS.md` §9 las da
   por hechas.
6. ✅ A1 cerrado: el `aviso` de fallo de correo ya no se descarta.
7. 🔴 **Seguridad nueva:** la anon key ejecuta tres RPC en `otjph`; se cierra al aplicar `03`.

Siguen abiertos los hallazgos de la revisión de código del 25-10 (`buscarCliente` con `ilike`,
duplicación de "archivo subido", `sinConfiguracion()` con diagnóstico falso, casteos sin Zod).

## Reglas
- 1 ticket = 1 sesión = 1 commit. TDD. Español único. Sin IA. Sin envío.
- Dinero `NUMERIC(12,2)`; `precio > 0` y `monto > 0`; total derivado; un remito por comprobante; un
  comprobante pendiente por pedido.
- El remito lo emite **la base**; el front lo compone y lo envía. El email es posterior y no bloqueante.
- `anon`: sólo `vista_catalogo`/`producto`/`stock`. Las RPC y el panel, sólo `service_role` + Basic Auth.
- **`npm test` no prueba la base viva**: para eso está `npm run bd:viva`. Falla si una tabla cerrada
  responde `200` (aunque venga vacía) o si anon puede ejecutar una RPC.
- **Rechazo terminal:** no se reabre un pedido; el Cliente vuelve a comprar.
- **Cron:** viernes 23:59 ART = `59 2 * * 6` UTC en `vercel.json`, con `CRON_SECRET`. Fallback manual:
  `select cancelar_pedidos_vencidos();` en el SQL Editor.

## Decisiones que no hay que redescubrir
- **G2:** el detalle es **página propia** (`/producto/[id]`), no card ampliada.
- **G3:** la institucional se llama **“Sobre el proyecto”** y vive en `/about`.
- **G1:** la franja de valores vive **solo** en `/about`; la Home no la repite.
- **Basic Auth en `src/middleware.ts`** (no en la raíz: con `src/app` Next sólo compila ahí) y **solo**
  para `/admin` y `/api/admin`. El test de T0 verifica que el middleware **no** negocia idioma (ADR 0005).
- **`foto_url` = clave del objeto** (bucket privado, signed URL al leer); **`imagen_url` = URL pública**
  (bucket público `productos`). El seed no inventa fotos: se suben desde `/admin`.
- **Vitest resuelve `@/`** con un alias en `vitest.config.ts`, porque `admin.ts` importa las listas
  canónicas de estados como valores.
- El panel **no** expone la clave del bucket: el modelo de lectura entrega sólo la signed URL.
- **Las variables de `next/font` van en `<html>`, no en `<body>`.** Lo cubre
  `tests/front/identidad-shell.test.ts` (§F0 · tipografía).
- **`bd:viva` no ejecuta RPC destructivas:** `cancelar_pedidos_vencidos()` se consulta con `GET`
  (read-only) y las demás con argumentos imposibles; una respuesta que no sea `401/403` delata que anon
  puede ejecutarlas.
- **`npm test` pasa en verde con la base rota** porque aplica las migraciones del repo en PGlite. No es
  evidencia de que `otjph` esté bien.
