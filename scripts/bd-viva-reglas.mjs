// Reglas puras de `npm run bd:viva` (B2 · issue #21).
//
// El script es el único control que mira el proyecto Supabase vivo: `npm test` corre en PGlite y
// queda verde con la base rota. Estas reglas viven aparte para poder testearlas sin red; el script
// sólo las aplica contra `/rest/v1` con la anon key.
//
// La trampa que originó el ticket: un `200 []` con RLS apagada parece "sin datos" y es una fuga.
// Sólo `401`/`403` prueban que una tabla está cerrada.

/** Las diez tablas que la anon key no puede leer (spec `bd-mvp` §3.6). */
export const TABLAS_CERRADAS = [
  'cliente',
  'pedido',
  'detalle_del_pedido',
  'estados_pedidos',
  'estados_comprobante',
  'comprobante',
  'remitos_de_venta',
  'alerta_de_estado',
  'admin',
  'roll',
];

/** Tablas que el modelo retiró: no pueden existir en `public`. */
export const TABLAS_LEGACY_AUSENTES = [
  'productos',
  'pedidos',
  'verificaciones',
  'detalle_carrito',
];

/** Tablas de fase 2: si existen, tienen que estar cerradas; si no existen, no es un fallo. */
export const TABLAS_FASE_2 = TABLAS_CERRADAS.filter(
  (tabla) => tabla === 'admin' || tabla === 'roll',
);

/** Objetos de lectura pública del contrato. */
export const COLUMNAS_PUBLICAS = ['producto', 'stock', 'vista_catalogo'];

/** Columnas exactas de `vista_catalogo` (spec `bd-mvp` §3.2). */
export const COLUMNAS_VISTA = [
  'id_producto',
  'nombre',
  'categoria',
  'tipo',
  'descripcion',
  'precio',
  'tiempo_produccion',
  'imagen_url',
  'cantidad_actual',
  'cantidad_reservada',
  'disponible',
  'cantidad_warning',
];

/** Columnas legacy que no pueden sobrevivir en el esquema nuevo. */
export const COLUMNAS_LEGACY = {
  producto: ['porcentaje', 'nombre_es', 'precio_ars'],
  stock: ['porcentaje', 'categoria', 'tipo', 'descripcion'],
  vista_catalogo: ['stock_actual', 'stock_warning', 'porcentaje', 'activo'],
  detalle_del_pedido: ['id_detalle'],
};

/** Buckets de Storage del MVP: `comprobantes` privado y `productos` público (spec `bd-mvp` §3.3). */
export const BUCKETS = ['comprobantes', 'productos'];

/** Las cuatro RPC del contrato, con sus argumentos (spec `bd-mvp` §3.4). */
export const RPC = {
  crear_pedido: { p_id_cliente: 0, p_items: [] },
  aprobar_comprobante: { p_id_comprobante: 0 },
  rechazar_comprobante: { p_id_comprobante: 0 },
  cancelar_pedidos_vencidos: {},
};

/** `401`/`403` es la única prueba de que la anon key no tiene permiso. */
export function esPermisoDenegado(estado) {
  return estado === 401 || estado === 403;
}

function resultado(ok, motivo) {
  return { ok, motivo };
}

/** Lectura anónima de una tabla cerrada: exige permiso denegado, no "cero filas". */
export function evaluarLecturaCerrada(estado, opciones = {}) {
  if (esPermisoDenegado(estado)) return resultado(true, 'permiso denegado');
  if (estado === 404) {
    if (opciones.permitirAusente) return resultado(true, 'no existe (fase 2)');
    return resultado(false, `no existe (HTTP 404): falta aplicar el esquema`);
  }
  if (estado === 200) {
    return resultado(
      false,
      'responde 200 a la anon key: una tabla cerrada no puede devolver filas, ni siquiera vacías',
    );
  }
  return resultado(false, `respuesta inesperada (HTTP ${estado})`);
}

/** Escritura anónima: denegada siempre, en las diez. */
export function evaluarEscrituraCerrada(estado) {
  if (esPermisoDenegado(estado)) return resultado(true, 'escritura denegada');
  if (estado === 404) return resultado(false, 'no existe (HTTP 404): no se puede verificar el cierre');
  return resultado(false, `la anon key pudo escribir (HTTP ${estado})`);
}

/**
 * RPC del contrato (spec `bd-mvp` §3.4 y HU-7): tienen que existir y la anon key **no** puede
 * ejecutarlas. En PostgREST `401`/`403` es la prueba de que existen pero están cerradas; `404`
 * (PGRST202) es que no existen; cualquier otra respuesta significa que `anon` las pudo invocar.
 *
 * `cancelar_pedidos_vencidos()` se consulta con `GET` (transacción read-only): no cancela nada y
 * una respuesta 405 con `25006` delata que anon tiene EXECUTE.
 */
export function evaluarRpc(estado, cuerpo) {
  if (estado === 404) {
    if (cuerpo && cuerpo.code === 'PGRST202') return resultado(false, 'no existe (PGRST202)');
    return resultado(false, 'no existe (HTTP 404)');
  }
  if (esPermisoDenegado(estado)) return resultado(true, 'existe y está cerrada a anon');
  if (estado >= 500) return resultado(false, `error del servidor (HTTP ${estado})`);

  const codigo = cuerpo?.code;
  if (codigo === '25006') {
    return resultado(false, 'existe, pero la anon key puede ejecutarla (lectura intentó escribir)');
  }
  return resultado(false, `existe, pero la anon key puede ejecutarla (HTTP ${estado})`);
}

/**
 * Bucket de Storage. La API devuelve HTTP 400 con `NoSuchBucket` cuando no existe; un 401/403 (o
 * `statusCode` 403 en el cuerpo) significa que existe pero la anon key no lo ve.
 */
export function evaluarBucket(estado, cuerpo) {
  if (estado === 200) return resultado(true, 'existe');
  if (estado === 401 || estado === 403) return resultado(true, 'existe (no visible para anon)');

  const codigo = cuerpo?.code;
  const estadoInterno = String(cuerpo?.statusCode ?? '');
  if (codigo === 'NoSuchBucket' || estadoInterno === '404') {
    return resultado(false, 'no existe (NoSuchBucket)');
  }
  if (estadoInterno === '403' || estadoInterno === '401') {
    return resultado(true, 'existe (no visible para anon)');
  }
  return resultado(false, `respuesta inesperada (HTTP ${estado})`);
}

/** Columnas del contrato que no aparecen en el objeto vivo. */
export function columnasFaltantes(esperadas, obtenidas) {
  const presentes = new Set(obtenidas);
  return esperadas.filter((columna) => !presentes.has(columna));
}

/** Columnas legacy que sí aparecen en el objeto vivo. */
export function columnasProhibidas(prohibidas, obtenidas) {
  const presentes = new Set(obtenidas);
  return prohibidas.filter((columna) => presentes.has(columna));
}
