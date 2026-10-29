---
name: bd-viva
description: "Corre `npm run bd:viva`, lee su salida y distingue un desajuste de esquema de un cache viejo de PostgREST sin confundirlo con `npm test`."
whenToUse: "Al cerrar o auditar la migración del proyecto Supabase vivo (`otjph`), cuando `bd:viva` sale rojo, o cuando alguien afirma que «la base está bien» citando `npm test`."
---

# SKILL: bd-viva

## 1. PROPÓSITO

Correr el único control que mira el proyecto Supabase **vivo** (`otjphjnrwihqzzhbfnmh`) y leer su
salida sin maquillarla. El script vive en
[`scripts/verificar-bd-viva.mjs`](../../../scripts/verificar-bd-viva.mjs) (reglas puras en
[`scripts/bd-viva-reglas.mjs`](../../../scripts/bd-viva-reglas.mjs)), el criterio de cierre está en
[`docs/specs/migracion-otjph/spec.md`](../../../docs/specs/migracion-otjph/spec.md) y el procedimiento
de aplicación en [`docs/entrega/GUIA-ISABELLA.md`](../../../docs/entrega/GUIA-ISABELLA.md) §4.4.

## 2. PARÁMETROS DE ENTRADA

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (leídos automáticamente de `.env.local` o del entorno por `npm run bd:viva`).
- Sin banderas posicionales: el comando audita siempre las siete secciones del contrato público (esquema versionado, lectura pública, columnas legacy, RPC, tablas retiradas, RLS de lectura/escritura y buckets de Storage).

## 3. GUARDRAILS

- NO confundas este comando con `npm test`: `npm test` corre offline contra PGlite y da verde aunque `otjph` esté a medio migrar; `npm run bd:viva` mide la base viva por red.
- NO leas un `bd:viva` rojo como «casi verde»: si queda una `FALLA`, el resultado es rojo y el estado de la tarea en el tablero es `review`, nunca `done`.
- NO interpretes un `200 []` en una tabla cerrada como «sin datos»: es una fuga de RLS. Sólo `401`/`403` prueban que la tabla está cerrada.
- NO uses la ruta de metadatos de Storage para medir buckets con la anon key (`NoSuchBucket` miente porque `anon` no lista buckets): el script usa dos sondas por objeto (ruta autenticada y ruta pública).
- NO maquilles la salida ni edites [`scripts/verificar-bd-viva.mjs`](../../../scripts/verificar-bd-viva.mjs) para silenciar un fallo: la salida cruda se reporta en el issue [#15](https://github.com/juanmamerodio/esenciatecnica/issues/15).

## 4. PASOS DE EJECUCIÓN

1. **Correr** `npm run bd:viva` y transcribir la salida completa.
2. **Descartar el cache viejo antes de culpar al esquema:** si el SQL Editor ya aplicó el DDL pero `/rest/v1` sigue sirviendo definiciones viejas, pedir `notify pgrst, 'reload schema';` y repetir la sonda.
3. **Diagnosticar** cada `FALLA` por el objeto que nombra (tabla, columna, RPC o bucket). Las `nota` al final indican lo que la anon key no puede ver (`respaldo_legacy`, límites de tamaño y MIME de los buckets), que se firma en el SQL Editor.
4. **Reportar** la salida en [#15](https://github.com/juanmamerodio/esenciatecnica/issues/15) y reflejar el estado real en el tablero con la skill `tablero-teams`.
