# memory.md · estado de build

> Hiper-corto. Leer al abrir sesión; reescribir al cerrar. **Última:** 2026-10-26 (auditoría de la
> migración de `otjph`, guard del catálogo y spec `migracion-otjph`).

## Ahora
- Objetivo: **cerrar la migración de `otjph`**. El front del MVP está completo y desplegado, pero la
  tienda no compra de punta a punta porque la base sigue a medio migrar.
- Isabella movió a `review` el 24-10 las dos tareas de base del Teams, y **no corresponde**: el
  proyecto vivo no coincide con `supabase/migrations/`.
- Spec de esta sesión: `docs/specs/migracion-otjph/spec.md` → **issue #15** (`ready-for-human`).
  Criterio de cierre: `npm run bd:viva` en verde.

## Semáforo
- Local: `typecheck` 0 errores · `lint` 0 errores y **0 warnings** · **230 tests** en 19 archivos ·
  `npm run build` compila sin `RESEND_API_KEY`.
- BD prod `otjph…`: **ROJA**, con **13 desajustes** medidos (tabla en la spec §7.1). Faltan columnas de
  tiempo en `cliente`/`producto`/`pedido`/`stock`/`comprobante`, `alerta_de_estado.mensaje`/`atendida`,
  `estados_comprobante.id_comprobante`, `detalle_del_pedido.id_detalle_pedido`, las cuatro columnas de
  `vista_catalogo`, la RPC `crear_pedido` y los dos buckets. `detalle_carrito` sigue existiendo.
- En verde en la base: RLS anónima de lectura y escritura en las seis tablas sensibles, ausencia de
  `productos`/`pedidos`/`verificaciones`, y `estados_pedidos`/`remitos_de_venta` completas.
- `.env.local`: sólo `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `VERCEL_OIDC_TOKEN`.
  Faltan `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `RESEND_API_KEY` y `NEXT_PUBLIC_TRANSFERENCIA_*`.

## Hecho (2026-10-26)
| Cambio | Qué dejó |
|---|---|
| `scripts/verificar-bd-viva.mjs` + `npm run bd:viva` | Compara las migraciones (PGlite) contra `otjph` con la anon key: columnas, RPC, tablas retiradas, RLS y buckets. Cierra el agujero de que `npm test` pasa en verde con la base rota. |
| `src/lib/catalogo.ts` + `tests/front/catalogo.test.ts` | Guard: si la vista devuelve filas sin `disponible`, el catálogo da `estado: 'error'` en vez de mostrar **todo agotado** en silencio. Rojo → verde verificado. |
| `docs/specs/migracion-otjph/spec.md` + issue #15 | La spec del cierre de la migración, con las decisiones y el criterio de cierre. |
| Auditoría de specs (subagente, 9 specs + 14 issues) | Hallazgos en §7.4 de la spec y en "Hallazgos abiertos" acá abajo. |

## Falta
1. **Isabella:** respaldar a mano y correr `00 → 01 → 02 → 03 → 04 → 05` en `otjph`, después
   `notify pgrst, 'reload schema'`, y dejar `npm run bd:viva` en verde (issue #15).
2. **Enzo:** `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` y `RESEND_API_KEY` en `.env.local`/Vercel.
3. **Cooperadora (G4):** alias, CBU y titular reales → `NEXT_PUBLIC_TRANSFERENCIA_*`.
4. **Verificación manual en navegador** de `/`, `/catalog`, `/producto/<id>`, `/cart`, `/checkout`,
   `/about` y `/admin` (con las claves y las migraciones puestas).
5. **Cron de los viernes:** `cancelar_pedidos_vencidos()` existe pero **ningún job lo llama** — no hay
   `vercel.json` ni `schedule:` en `.github/workflows/ci.yml`. Sin eso el stock reservado no se libera.

## Hallazgos abiertos de la auditoría de specs (26-10)

Van como fichas propias; **no** entran en la spec de la migración.

1. 🔴 `.agents/skills/` **no existe**, y `AGENTS.md` §11 y `front-mvp` §3.4 lo declaran como fundación
   del proyecto ("las skills viven en el repo para que todo el equipo las tenga").
2. 🟠 `checkout/spec.md` se contradice: HU-3 (`:87`) dice que el monto viene precargado; §6.3 (`:166`)
   dice que no se auto-completa. El código sigue HU-3, así que §6.3 es una decisión muerta.
3. 🟠 `remito/spec.md` HU-4: el `aviso` de fallo de correo **se descarta** en
   `src/components/admin/comun.ts`; el panel dice "quedó aprobado y la base emitió el remito" aunque el
   Cliente no haya recibido nada. (Ya estaba anotado el 25-10: sigue abierto.)
4. 🟠 `admin/spec.md` y la migración `05` crean el bucket y las rutas `productos`, término que
   `GLOSSARY.md:101` retira y `AGENTS.md:54` prohíbe en código nuevo, sin excepción escrita ni ADR.
5. 🟡 `sobre-el-proyecto/spec.md` §1 señala el ícono de laboratorio como el vocabulario a retirar, y
   `/about` y el footer siguen usando `FlaskConical` (el test sólo mira texto).
6. 🟡 `bd-mvp/spec.md` **no tiene issue y ningún issue lo linkea** (incumple `AGENTS.md` §6.2); además
   declara las RPC como `bigint` cuando son `integer`, enumera nombres plurales sin
   `estados_comprobante` y dice `roll` donde el glosario dice `Rol`.
7. 🟡 Hueco de plantilla transversal: ningún spec tiene sección de notas finales ni lista numerada de
   historias; sólo `front-mvp` declara prior art; 25 HU no enuncian actor ni beneficio.
8. 🟡 Trazabilidad: los issues de las tajadas ya implementadas (#2, #5, #6, #8, #9, #10, #12, #13, #14)
   siguen **OPEN** aunque `AGENTS.md` §9 las da por hechas.

Siguen abiertos también los hallazgos de la revisión de código del 25-10 (`buscarCliente` con `ilike`,
duplicación de "archivo subido", `sinConfiguracion()` con diagnóstico falso, casteos sin Zod).

## Reglas
- 1 ticket = 1 sesión = 1 commit. TDD. Español único. Sin IA. Sin envío.
- Dinero `NUMERIC(12,2)`; total derivado; un remito por comprobante; un comprobante pendiente por pedido.
- El remito lo emite **la base**; el front lo compone y lo envía. El email es posterior y no bloqueante.
- `anon`: solo `vista_catalogo`/`producto`/`stock`. Las RPC y el panel, solo `service_role` + Basic Auth.
- El front no toca tablas legacy: ya no queda ninguna (`supabase.ts` y `sync-sheets` se retiraron).
- **`npm test` no prueba la base viva**: para eso está `npm run bd:viva`.

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
- **El `PGRST202` de una RPC no siempre significa que falte.** PostgREST lo devuelve también cuando el
  cuerpo no matchea la firma. Hay que mandar los parámetros con su nombre real: un nombre inexistente da
  `PGRST202`, un tipo inválido da `22P02` y la llamada correcta da `204`. Así se supo que de las cuatro
  RPC de `02` **sólo falta `crear_pedido`**.
- **La migración `00` no respalda en `otjph`:** su marcador es `producto.id_stock`, que ya no existe, así
  que se saltea en silencio. Antes de correr `01` hay que respaldar a mano.
