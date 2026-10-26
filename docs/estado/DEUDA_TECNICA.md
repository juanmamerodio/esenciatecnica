# Deuda técnica detectada al separar los repos

> **Nota 2026-10-22:** este documento se escribió contra el esquema legacy (`productos`, `pedidos`,
> `verificaciones`). El modelo vigente es [`MODELO.md`](../MODELO.md) y la brecha completa está en
> [`AUDITORIA.md`](AUDITORIA.md). Los puntos 1–4 siguen siendo ciertos para el código actual, pero
> los nombres de tablas son legacy y no deben usarse en código nuevo.
>
> **Nota 2026-10-25:** los puntos **1 a 4 quedaron cerrados** al retirarse el camino legacy de compra en
> `T5` (#10): `api/verify-payment`, `services/order.service.ts`, `lib/schemas.ts` y `ReceiptUploader.tsx`
> ya no existen, `typecheck` da 0 errores y la validación es manual. Lo que sigue abierto es el puente
> `/api/notifications` (§5, decisión vigente de `AGENTS.md` §3) y lo que es del proyecto de Teams
> (§6 y §7), que no vive en este repo.

Estos puntos **no se tocaron** en la separación para no cambiar el comportamiento de las APIs
(decisión acordada). Quedan documentados con archivo y línea para resolverlos en el próximo sprint.

---

## 1. 🔴 Crítico: el checkout falla al subir el comprobante

`src/app/api/verify-payment/route.ts:50` llama a `OrderService.isProcessed(pedidoId)`, pero ese
método **no existe** en `src/services/order.service.ts`. Cualquier intento de subir un comprobante
lanza `TypeError: OrderService.isProcessed is not a function` y devuelve 500.

**Impacto:** el flujo de compra no se completa; el pedido queda creado pero sin comprobante.

**Opciones:**
- Implementar `isProcessed(pedidoId)` consultando `pedidos.comprobante_url` o la tabla `verificaciones`.
- O quitar la idempotencia y validar duplicados por `pedido_id + estado`.

**Resuelto 2026-10-23:** se implementó `OrderService.isProcessed` consultando `comprobante_url` (commit `a984727`).

---

## 2. 🔴 Crítico: `comprobante_url` no se guarda

`verify-payment/route.ts:101` llama:

```ts
await OrderService.updateStatus(pedidoId, nuevoEstado, {
  comprobante_url: comprobanteUrl,
  log_ia: iaResponse,
});
```

Pero la firma real (`order.service.ts:69`) es:

```ts
static async updateStatus(pedidoId, status, log_ia = {} as Pedido['log_ia'])
```

El tercer argumento se asigna a `log_ia`; `comprobante_url` se descarta. El panel `/admin`
(`admin/page.tsx:285`) no puede mostrar la foto del comprobante porque la URL nunca llega a la fila.

**Fix sugerido:** cambiar la firma a `updateStatus(pedidoId, status, patch?: Partial<Pedido>)` y
hacer `update({ estado: status, ...patch })`.

**Resuelto 2026-10-23:** la firma ahora recibe `patch: Partial<Pedido>` y `verify-payment` guarda
`comprobante_url` (commit `a984727`).

---

## 3. 🟠 Gemini sigue en el código legacy, pero en el sistema final no existe

- `src/lib/gemini.ts` y `src/app/api/verify-payment/route.ts` usan `GEMINI_API_KEY`.
- El checkout muestra "Procesando pedido e IA..." y usa `dict.checkout.aiNote`.
- El flujo oficial es **validación manual por los Administradores de Química**. La validación por IA
  no existe en el sistema final; el código que la menciona se retira.

**Fix:** eliminar `gemini.ts`, el import y el bloque de análisis; subir el comprobante, guardar
`comprobante_url` y dejar el pedido en `Comprobante Subido` para revisión humana. Recién después
borrar `GEMINI_API_KEY` de Vercel y del `.env.example`.

**Resuelto 2026-10-23:** se eliminó `src/lib/gemini.ts`, el bloque de IA, la tabla espejo
`verificaciones`, el tipo `GeminiResponse`, `log_ia` y `GEMINI_API_KEY`. El comprobante queda en
`Comprobante Subido` (commit `a984727`). Falta borrar la key en Vercel.

---

## 4. 🟡 `tsc --noEmit` no pasa (el build sí, porque está silenciado)

`next.config.ts` tiene `typescript.ignoreBuildErrors: true`. Errores actuales:

- Diccionarios `es.json`/`en.json` sin `hero` y `categories` que exige `Dictionary`
  (`src/lib/types.ts`).
- `catalog` sin `title`/`subtitle`; `cart` sin `continueShopping`.
- `CartClient` pasa `lang` a `CartItem`, que no lo declara.
- `verify-payment` usa `isProcessed` y `updateStatus` con firmas incorrectas.

**Fix:** alinear `Dictionary` con los JSON reales (o completar los JSON), corregir las firmas y
recién entonces sacar `ignoreBuildErrors`.

---

## 5. 🟡 `/api/notifications` sigue siendo un puente entre repos

El endpoint de Teams vive en el ecomm y lee `team_members` del proyecto Supabase de Teams vía
`TEAMS_SUPABASE_URL` / `TEAMS_SUPABASE_ANON_KEY`. Funciona, pero mezcla responsabilidades.

**End state:** moverlo al repo `quimicashop` como Supabase Edge Function o Vercel Function con su
propia key de Resend, y borrar `TEAMS_*` del ecomm.

---

## 6. 🟡 RLS permisivas en Supabase de Teams

`quimicashop/diagrams/supabase_teams_schema.sql` crea políticas `USING (true)` para lectura y
escritura. La anon key es pública (`config.js`), así que cualquiera puede escribir en `team_*`.

**Fix:** restringir escritura por perfil/DNI, idealmente con Supabase Auth y JWT en lugar de la
anon key suelta.

---

## 7. 🟡 Credenciales de Teams en el cliente

`tasks.js` incluye los DNIs como contraseñas de los perfiles. Es un dato personal y no es un
secreto fuerte.

**Fix:** mover la autenticación a Supabase Auth (email/OAuth) o, como mínimo, a un hash validado
en el servidor.

---

## 8. ✅ `sync-sheets` usa la service role key como bearer token — cerrado en `T7` (#13)

`src/app/api/sync-sheets/route.ts` comparaba el header con `SUPABASE_SERVICE_ROLE_KEY` y su único
consumidor era la tabla legacy `pedidos`. T7 retiró la ruta y el cliente legacy que la sostenía, así
que no queda una segunda vía de acceso con la clave de servicio: el panel la usa server-side detrás
de Basic Auth y el navegador nunca la recibe.
