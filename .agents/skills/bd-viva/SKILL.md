---
name: bd-viva
description: "Corre `npm run bd:viva`, lee su salida y distingue un desajuste de esquema de un cache viejo de PostgREST sin confundirlo con `npm test`."
whenToUse: "Al cerrar o auditar la migración del proyecto Supabase vivo (`otjph`), cuando `bd:viva` sale rojo, o cuando alguien afirma que «la base está bien» citando `npm test`."
---

# SKILL: bd-viva

## 1. PROPÓSITO

Correr el único control que mira el proyecto Supabase **vivo** y leer su salida sin maquillarla. El
criterio de cierre y el runbook están en
[`docs/specs/migracion-otjph/spec.md`](../../../docs/specs/migracion-otjph/spec.md) y el procedimiento
de aplicación, en [`docs/entrega/GUIA-ISABELLA.md`](../../../docs/entrega/GUIA-ISABELLA.md) §4.4.
Esta skill es el procedimiento para ejecutarlo y diagnosticarlo, no la copia del spec.

## 2. COMANDO

```bash
npm run bd:viva
```

Cubre la vista del catálogo, las columnas legacy, las cuatro RPC (existencia **y** que `anon` no las
ejecute), las diez tablas cerradas (exige `401`/`403`), la escritura anónima y los dos buckets. Sale
distinto de cero y resume cada desajuste nombrando tabla y columnas.

## 3. LA TRAMPA QUE ORIGINÓ LA SKILL

- **`npm test` NO prueba la base viva.** La suite corre contra PGlite y aplica las migraciones del
  repo: queda verde con `otjph` a medio migrar. Un `npm test` verde con `bd:viva` rojo significa que
  **el repo está bien y el proyecto vivo no**; son dos cosas distintas y las dos importan.
- **Un `200 []` no es «sin datos», es una fuga.** Con RLS mal puesta, una tabla sensible responde `200`
  vacía. Sólo `401`/`403` prueban que está cerrada.
- **`bd:viva` no ejecuta RPC destructivas:** `cancelar_pedidos_vencidos()` se consulta con `GET` y las
  demás con argumentos imposibles; una respuesta fuera de `401/403` delata que `anon` puede ejecutarlas.

## 4. PASOS DE EJECUCIÓN

1. **Correr** `npm run bd:viva` y transcribir la salida completa, sin resumir y sin maquillar.
2. **Descartar el cache viejo antes de culpar al esquema.** El SQL Editor aplica el DDL, pero
   `/rest/v1` sigue sirviendo el esquema cacheado. Verificá si ya se corrió
   `notify pgrst, 'reload schema';`; si el cache está viejo, las `FALLA` pueden ser de lectura, no de
   esquema.
3. **Diagnosticar** cada `FALLA` por el objeto que nombra (tabla, columna, RPC o bucket). El mensaje
   casi siempre alcanza; cada línea trae la tabla y las columnas que faltan.
4. **Reportar** la salida en el issue [#15](https://github.com/juanmamerodio/esenciatecnica/issues/15)
   sin arreglarla a mano. El criterio de cierre es `bd:viva` en verde.
5. **Cerrar el tablero** con la skill `tablero-teams`: con `bd:viva` rojo, el estado es `review`, no
   `done`.

## 5. GUARDRAILS

- NO leas `bd:viva` rojo como «casi verde»: si queda una `FALLA`, el resultado es rojo y el estado de
  la tarea es `review`.
- NO maquilles la salida ni cambies el script para que pase: el diagnóstico va al issue con la salida
  cruda.
- NO confundas este comando con `npm test`: el segundo es local y offline; el primero depende de la
  base viva, la anon key y la red.
- NO corras `bd:viva` como sustituto de aplicar las migraciones: mide, no migra.
