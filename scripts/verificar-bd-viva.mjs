// Compara el esquema versionado (supabase/migrations → PGlite) con el proyecto vivo de otjph.
//
// El agujero que cierra: `npm test` corre contra PGlite, así que un proyecto Supabase a medio
// migrar deja los tests en verde. Esto es el control que faltaba, y es el criterio de cierre de
// las tareas de DDL y RLS de Isabella (issue #15, B2 · issue #21).
//
// Qué cubre (spec `bd-mvp` §5 y §9.2):
//   1. Lectura pública: `producto`, `stock` y las doce columnas de `vista_catalogo`.
//   2. Columnas legacy que sobran en los objetos públicos.
//   3. Las cuatro RPC: existen si PostgREST no responde PGRST202.
//   4. Las tablas retiradas, incluida `detalle_carrito`.
//   5. Las diez tablas cerradas: exige 401/403, no “cero filas”. Un 200 [] es una fuga.
//   6. Escritura anónima denegada.
//   7. Los dos buckets de Storage.
//
// Qué deja afuera: cuerpos de funciones, datos fila por fila y las columnas de las tablas cerradas
// (la anon key no puede leerlas: eso lo fijan el repo y los tests de PGlite).
//
// Uso: npm run bd:viva
// No usa la service role: todo entra con la anon key, que es lo que ve el mundo.

import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  BUCKETS,
  COLUMNAS_LEGACY,
  COLUMNAS_VISTA,
  RPC,
  TABLAS_CERRADAS,
  TABLAS_FASE_2,
  TABLAS_LEGACY_AUSENTES,
  columnasFaltantes,
  evaluarBucket,
  evaluarEscrituraCerrada,
  evaluarLecturaCerrada,
  evaluarRpc,
} from './bd-viva-reglas.mjs';

const RAIZ = process.cwd();
const MIGRACIONES = path.join(RAIZ, 'supabase', 'migrations');
const ENV_LOCAL = path.join(RAIZ, '.env.local');

const fallos = [];
const ok = (mensaje) => console.log(`  ok    ${mensaje}`);
const nota = (mensaje) => console.log(`  nota  ${mensaje}`);
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
  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    ...opciones,
    headers: { ...cabeceras, ...opciones.headers },
  });
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

async function columnasDe(tipoObjeto) {
  const { rows } = await db.query(
    `select c.table_name, c.column_name
       from information_schema.columns c
       join information_schema.tables t
         on t.table_schema = c.table_schema and t.table_name = c.table_name
      where c.table_schema = 'public' and t.table_type = $1
      order by c.table_name, c.ordinal_position`,
    [tipoObjeto],
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
await db.close();

console.log(`\nProyecto vivo: ${URL_BASE}`);

// ── 0. El repo también tiene que estar en contrato ─────────────────────────────
console.log('\n0. Esquema versionado (repo)');
const vistaDelRepo = vistasVersionadas.get('vista_catalogo') ?? [];
const faltantesEnElRepo = columnasFaltantes(COLUMNAS_VISTA, vistaDelRepo);
const sobranEnElRepo = vistaDelRepo.filter((columna) => !COLUMNAS_VISTA.includes(columna));
if (faltantesEnElRepo.length === 0 && sobranEnElRepo.length === 0) {
  ok('vista_catalogo versionada con las 12 columnas del contrato');
} else {
  if (faltantesEnElRepo.length) mal(`repo · vista_catalogo: faltan → ${faltantesEnElRepo.join(', ')}`);
  if (sobranEnElRepo.length) mal(`repo · vista_catalogo: sobran → ${sobranEnElRepo.join(', ')}`);
}

// ── 1. Lectura pública ─────────────────────────────────────────────────────────
console.log('\n1. Lectura pública (producto, stock y vista_catalogo)');
for (const tabla of ['producto', 'stock']) {
  const columnas = tablasVersionadas.get(tabla) ?? [];
  const { estado } = await pedir(`/rest/v1/${tabla}?select=${columnas.join(',')}&limit=1`);
  if (estado === 200) ok(`${tabla}: ${columnas.length} columnas del contrato`);
  else mal(`${tabla}: la anon key no puede leer el contrato (HTTP ${estado})`);
}

const vista = await pedir(`/rest/v1/vista_catalogo?select=${COLUMNAS_VISTA.join(',')}&limit=1`);
if (vista.estado === 200) ok(`vista_catalogo: 12 columnas del contrato`);
else mal(`vista_catalogo: no responde la forma del contrato (HTTP ${vista.estado})`);

// ── 2. Columnas legacy que sobran ──────────────────────────────────────────────
console.log('\n2. Columnas legacy que sobran');
for (const [tabla, columnas] of Object.entries(COLUMNAS_LEGACY)) {
  for (const columna of columnas) {
    const { estado } = await pedir(`/rest/v1/${tabla}?select=${columna}&limit=1`);
    if (estado === 200) mal(`${tabla}.${columna}: columna legacy todavía visible`);
    else if (estado === 400) ok(`${tabla}.${columna}: no existe`);
    else if (estado === 401 || estado === 403) {
      // Tabla cerrada: la anon key no puede ver el esquema. La columna queda cubierta por el
      // repo y por PGlite; acá se deja constancia en vez de fingir que se verificó.
      nota(`${tabla}.${columna}: tabla cerrada, no verificable con anon`);
    } else mal(`${tabla}.${columna}: respuesta inesperada (HTTP ${estado})`);
  }
}

// ── 3. Interfaz pública (RPC) ──────────────────────────────────────────────────
console.log('\n3. Interfaz pública (RPC)');
for (const [nombre, argumentos] of Object.entries(RPC)) {
  // `cancelar_pedidos_vencidos()` se consulta con GET (read-only): no cancela pedidos reales y
  // su respuesta delata si la anon key tiene EXECUTE. Las otras tres se invocan con argumentos
  // imposibles (id 0 / carrito vacío): no mutan nada y también revelan si anon puede ejecutarlas.
  const { estado, cuerpo } =
    nombre === 'cancelar_pedidos_vencidos'
      ? await pedir(`/rest/v1/rpc/${nombre}`)
      : await pedir(`/rest/v1/rpc/${nombre}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(argumentos),
        });

  const revision = evaluarRpc(estado, cuerpo);
  if (revision.ok) ok(`rpc ${nombre}: ${revision.motivo}`);
  else mal(`rpc ${nombre}: ${revision.motivo}`);
}

// ── 4. Tablas que el modelo retiró ─────────────────────────────────────────────
console.log('\n4. Tablas que el modelo retiró');
for (const tabla of TABLAS_LEGACY_AUSENTES) {
  const { estado } = await pedir(`/rest/v1/${tabla}?select=*&limit=1`);
  if (estado === 404) ok(`${tabla}: no existe`);
  else mal(`${tabla}: sigue existiendo (HTTP ${estado})`);
}

// ── 5. RLS: las diez tablas cerradas ───────────────────────────────────────────
console.log('\n5. RLS: la anon key no lee ninguna tabla cerrada');
for (const tabla of TABLAS_CERRADAS) {
  const { estado } = await pedir(`/rest/v1/${tabla}?select=*&limit=1`);
  const revision = evaluarLecturaCerrada(estado, {
    permitirAusente: TABLAS_FASE_2.includes(tabla),
  });
  if (revision.ok && revision.motivo.includes('fase 2')) nota(`${tabla}: ${revision.motivo}`);
  else if (revision.ok) ok(`${tabla}: ${revision.motivo}`);
  else mal(`${tabla}: ${revision.motivo}`);
}

// ── 6. Escritura anónima ───────────────────────────────────────────────────────
console.log('\n6. Escritura anónima denegada');
for (const tabla of TABLAS_CERRADAS) {
  const { estado } = await pedir(`/rest/v1/${tabla}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (estado === 404 && TABLAS_FASE_2.includes(tabla)) {
    nota(`${tabla}: no existe (fase 2)`);
    continue;
  }
  const revision = evaluarEscrituraCerrada(estado);
  if (revision.ok) ok(`${tabla}: ${revision.motivo}`);
  else mal(`${tabla}: ${revision.motivo}`);
}

// ── 7. Storage ─────────────────────────────────────────────────────────────────
console.log('\n7. Storage');
for (const bucket of BUCKETS) {
  const { estado, cuerpo } = await pedir(`/storage/v1/bucket/${bucket}`);
  const revision = evaluarBucket(estado, cuerpo);
  if (revision.ok) ok(`bucket ${bucket}: ${revision.motivo}`);
  else mal(`bucket ${bucket}: ${revision.motivo}`);
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
