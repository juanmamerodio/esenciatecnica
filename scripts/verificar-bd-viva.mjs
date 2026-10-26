// Compara el esquema versionado (supabase/migrations → PGlite) con el proyecto vivo de otjph.
//
// El agujero que cierra: `npm test` corre contra PGlite, así que un proyecto Supabase a medio
// migrar deja los tests en verde. Esto es el control que faltaba, y es el criterio de cierre de
// las tareas de DDL y RLS de Isabella.
//
// Uso: npm run bd:viva
// No usa la service role: todo entra con la anon key, que es lo que ve el mundo.

import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const MIGRACIONES = path.join(RAIZ, 'supabase', 'migrations');
const ENV_LOCAL = path.join(RAIZ, '.env.local');

const LEGACY_PROHIBIDO = ['productos', 'pedidos', 'verificaciones', 'detalle_carrito'];
const FASE_2 = ['admin', 'roll'];
const TABLAS_SENSIBLES = [
  'cliente',
  'pedido',
  'detalle_del_pedido',
  'comprobante',
  'remitos_de_venta',
  'alerta_de_estado',
];
const BUCKETS = ['comprobantes', 'productos'];
const RPC = {
  crear_pedido: { p_id_cliente: 0, p_items: [] },
  aprobar_comprobante: { p_id_comprobante: 0 },
  rechazar_comprobante: { p_id_comprobante: 0 },
  cancelar_pedidos_vencidos: {},
};

const fallos = [];
const ok = (mensaje) => console.log(`  ok    ${mensaje}`);
const mal = (mensaje) => {
  fallos.push(mensaje);
  console.log(`  FALLA ${mensaje}`);
};

function leerEnvLocal() {
  if (!existsSync(ENV_LOCAL)) return {};
  const valores = {};
  for (const linea of readFileSync(ENV_LOCAL, 'utf8').split(/\r?\n/)) {
    const match = linea.match(/^([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
    if (match) valores[match[1]] = match[2];
  }
  return valores;
}

const entorno = { ...leerEnvLocal(), ...process.env };
const URL_BASE = (entorno.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const LLAVE = entorno.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_BASE || !LLAVE) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local).');
  process.exit(2);
}

const cabeceras = { apikey: LLAVE, Authorization: `Bearer ${LLAVE}` };

async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(`${URL_BASE}${ruta}`, { ...opciones, headers: { ...cabeceras, ...opciones.headers } });
  let cuerpo = null;
  try {
    cuerpo = await respuesta.clone().json();
  } catch {
    cuerpo = null;
  }
  return { estado: respuesta.status, cuerpo };
}

// ── Esquema versionado: la fuente de verdad es el repo ──────────────────────────
const db = new PGlite();
await db.waitReady;
for (const archivo of readdirSync(MIGRACIONES).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(path.join(MIGRACIONES, archivo), 'utf8'));
}

async function columnasDe(tipoTabla) {
  const { rows } = await db.query(
    `select c.table_name, c.column_name
       from information_schema.columns c
       join information_schema.tables t
         on t.table_schema = c.table_schema and t.table_name = c.table_name
      where c.table_schema = 'public' and t.table_type = $1
      order by c.table_name, c.ordinal_position`,
    [tipoTabla],
  );
  const porTabla = new Map();
  for (const { table_name, column_name } of rows) {
    if (!porTabla.has(table_name)) porTabla.set(table_name, []);
    porTabla.get(table_name).push(column_name);
  }
  return porTabla;
}

const tablasVersionadas = await columnasDe('BASE TABLE');
const vistasVersionadas = await columnasDe('VIEW');
const objetosVersionados = new Map([...tablasVersionadas, ...vistasVersionadas]);
await db.close();

// ── Proyección: cada columna del contrato tiene que existir en el proyecto vivo ──
console.log(`\nProyecto vivo: ${URL_BASE}`);

console.log('\n1. Esquema versionado contra el proyecto vivo');
for (const [tabla, columnas] of objetosVersionados) {
  const faltantes = [];
  for (const columna of columnas) {
    const { estado } = await pedir(`/rest/v1/${tabla}?select=${columna}&limit=1`);
    if (estado !== 200) faltantes.push(columna);
  }
  const sobrantes = [];
  if (faltantes.length === 0) {
    // Sólo se revisan columnas legacy conocidas: no se inventa un catálogo del proyecto vivo.
    for (const columna of ['nombre_es', 'precio_ars', 'stock_actual', 'stock_warning', 'porcentaje', 'foto_comprobante', 'producto_selec', 'mes', 'ano']) {
      if (columnas.includes(columna)) continue;
      const { estado } = await pedir(`/rest/v1/${tabla}?select=${columna}&limit=1`);
      if (estado === 200) sobrantes.push(columna);
    }
  }

  if (faltantes.length === 0 && sobrantes.length === 0) ok(tabla);
  else {
    if (faltantes.length) mal(`${tabla}: faltan columnas del contrato → ${faltantes.join(', ')}`);
    if (sobrantes.length) mal(`${tabla}: quedan columnas fuera del contrato → ${sobrantes.join(', ')}`);
  }
}

console.log('\n2. Interfaz pública (RPC)');
for (const [nombre, argumentos] of Object.entries(RPC)) {
  const { estado, cuerpo } = await pedir(`/rest/v1/rpc/${nombre}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(argumentos),
  });
  // PGRST202 = PostgREST no encuentra la función: no está en la base o no es visible para anon.
  if (estado === 404 && cuerpo?.code === 'PGRST202') mal(`rpc ${nombre}: no existe (PGRST202)`);
  else ok(`rpc ${nombre} (HTTP ${estado})`);
}

console.log('\n3. Tablas que el modelo retiró');
for (const tabla of LEGACY_PROHIBIDO) {
  const { estado } = await pedir(`/rest/v1/${tabla}?select=*&limit=1`);
  if (estado === 404) ok(`${tabla}: no existe`);
  else mal(`${tabla}: sigue existiendo (HTTP ${estado})`);
}
for (const tabla of FASE_2) {
  const { estado } = await pedir(`/rest/v1/${tabla}?select=*&limit=1`);
  if (estado === 404) ok(`${tabla}: no existe (fase 2)`);
  else console.log(`  nota  ${tabla}: existe (fase 2, aceptado si queda cerrada por RLS)`);
}

console.log('\n4. RLS: la anon key no lee datos personales ni escribe nada');
for (const tabla of TABLAS_SENSIBLES) {
  const lectura = await pedir(`/rest/v1/${tabla}?select=*&limit=1`);
  if (lectura.estado === 200 && Array.isArray(lectura.cuerpo) && lectura.cuerpo.length === 0) ok(`${tabla}: lectura anónima vacía`);
  else mal(`${tabla}: la anon key obtuvo datos (HTTP ${lectura.estado})`);

  const escritura = await pedir(`/rest/v1/${tabla}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (escritura.estado === 401 || escritura.estado === 403) ok(`${tabla}: escritura anónima rechazada`);
  else mal(`${tabla}: la anon key pudo insertar (HTTP ${escritura.estado})`);
}

console.log('\n5. Storage');
for (const bucket of BUCKETS) {
  const { estado } = await pedir(`/storage/v1/bucket/${bucket}`);
  if (estado === 200) ok(`bucket ${bucket}`);
  else mal(`bucket ${bucket}: no existe (HTTP ${estado})`);
}

// ── Cierre ─────────────────────────────────────────────────────────────────────
console.log('');
if (fallos.length === 0) {
  console.log('VERDE · el proyecto vivo coincide con el esquema versionado.');
  process.exit(0);
}
console.log(`ROJO · ${fallos.length} desajuste(s) entre el repo y el proyecto vivo:`);
for (const fallo of fallos) console.log(`  · ${fallo}`);
process.exit(1);
