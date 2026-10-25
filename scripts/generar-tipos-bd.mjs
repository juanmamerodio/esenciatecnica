// Genera src/lib/database.types.ts a partir de las migraciones SQL.
// Fuente de verdad: supabase/migrations/*.sql → PGlite → information_schema.
// Uso: npm run db:types

import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const MIGRACIONES = path.join(RAIZ, 'supabase', 'migrations');
const SALIDA = path.join(RAIZ, 'src', 'lib', 'database.types.ts');

const FUNCIONES = [
  'crear_pedido',
  'aprobar_comprobante',
  'rechazar_comprobante',
  'cancelar_pedidos_vencidos',
];

const db = new PGlite();
await db.waitReady;

for (const archivo of readdirSync(MIGRACIONES).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(path.join(MIGRACIONES, archivo), 'utf8'));
}

function tipoBase(dataType, udtName) {
  switch (dataType) {
    case 'integer':
    case 'bigint':
    case 'smallint':
    case 'numeric':
    case 'real':
    case 'double precision':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'json':
    case 'jsonb':
      return 'Json';
    case 'ARRAY':
      return `${tipoBase(dataType, udtName.replace(/^_/, ''))}[]`;
    default:
      return 'string';
  }
}

// Dominios tomados de los CHECK de la base: no se declaran a mano.
const dominios = new Map();
const checks = await db.query(
  `select c.conname, pg_get_constraintdef(c.oid) as definicion
     from pg_constraint c
     join pg_namespace n on n.oid = c.connamespace
    where n.nspname = 'public' and c.contype = 'c'`,
);
for (const check of checks.rows) {
  const columna = check.definicion.match(/\(([a-z_]+)\s*=/)?.[1];
  if (!columna) continue;
  const literales = [...check.definicion.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (literales.length > 1) {
    const tabla = check.conname.replace(/_[a-z_]+_(valido|valida)$/, '');
    dominios.set(`${tabla}.${columna}`, literales);
  }
}

async function objetos(tableType) {
  const { rows } = await db.query(
    `select c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable,
            c.column_default, c.is_identity, c.is_generated
       from information_schema.columns c
       join information_schema.tables t
         on t.table_schema = c.table_schema and t.table_name = c.table_name
      where c.table_schema = 'public' and t.table_type = $1
      order by c.table_name, c.ordinal_position`,
    [tableType],
  );

  const porTabla = new Map();
  for (const fila of rows) {
    if (!porTabla.has(fila.table_name)) porTabla.set(fila.table_name, []);
    porTabla.get(fila.table_name).push(fila);
  }
  return porTabla;
}

function tipoDeColumna(tabla, columna) {
  const dominio = dominios.get(`${tabla}.${columna.column_name}`);
  const base =
    columna.column_name === 'estado_actual' && dominio
      ? dominio.map((valor) => `'${valor}'`).join(' | ')
      : tipoBase(columna.data_type, columna.udt_name);

  // Las columnas generadas heredan la no-nulabilidad de sus entradas.
  if (columna.is_generated === 'ALWAYS') return base;

  return columna.is_nullable === 'YES' ? `${base} | null` : base;
}

function bloqueTabla(nombre, columnas) {
  const indentar = (lineas) => lineas.map((linea) => `          ${linea}`).join('\n');

  const filas = columnas.map((c) => `${c.column_name}: ${tipoDeColumna(nombre, c)};`);
  const insertables = columnas.filter(
    (c) => c.is_identity !== 'YES' && c.is_generated !== 'ALWAYS',
  );
  const insert = insertables.map((c) => {
    const opcional = c.is_nullable === 'YES' || c.column_default !== null ? '?' : '';
    return `${c.column_name}${opcional}: ${tipoDeColumna(nombre, c)};`;
  });
  const update = insertables.map((c) => `${c.column_name}?: ${tipoDeColumna(nombre, c)};`);

  return `      ${nombre}: {
        Row: {
${indentar(filas)}
        };
        Insert: {
${indentar(insert)}
        };
        Update: {
${indentar(update)}
        };
        Relationships: [];
      };`;
}

const tablas = await objetos('BASE TABLE');
const vistas = await objetos('VIEW');

const funciones = await db.query(
  `select p.proname,
          pg_get_function_arguments(p.oid) as args,
          pg_get_function_result(p.oid) as resultado
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any($1::text[])
    order by p.proname`,
  [FUNCIONES],
);

function tipoDeArgumento(tipoSql) {
  if (tipoSql === 'integer') return 'number';
  if (tipoSql === 'jsonb' || tipoSql === 'json') return 'Json';
  if (tipoSql === 'text') return 'string';
  return 'string';
}

function tipoDeRetorno(resultado) {
  if (resultado === 'integer') return 'number';
  if (resultado === 'json' || resultado === 'jsonb') return 'Json';
  if (tablas.has(resultado)) return `Database['public']['Tables']['${resultado}']['Row']`;
  return 'unknown';
}

const bloquesFunciones = funciones.rows.map((f) => {
  const argumentos = f.args
    ? f.args.split(',').map((parte) => {
        const [nombre, tipo] = parte.trim().split(/\s+/);
        return `${nombre}: ${tipoDeArgumento(tipo)}`;
      })
    : [];

  return `      ${f.proname}: {
        Args: ${argumentos.length === 0 ? 'Record<string, never>' : `{ ${argumentos.join('; ')} }`};
        Returns: ${tipoDeRetorno(f.resultado)};
      };`;
});

const contenido = `// GENERADO por scripts/generar-tipos-bd.mjs — no editar a mano.
// Fuente: supabase/migrations/*.sql · Regenerar con \`npm run db:types\`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [clave: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
${[...tablas].map(([nombre, columnas]) => bloqueTabla(nombre, columnas)).join('\n')}
    };
    Views: {
${[...vistas]
  .map(
    ([nombre, columnas]) => `      ${nombre}: {
        Row: {
${columnas
  .map((c) => `          ${c.column_name}: ${tipoDeColumna(nombre, c)};`)
  .join('\n')}
        };
        Relationships: [];
      };`,
  )
  .join('\n')}
    };
    Functions: {
${bloquesFunciones.join('\n')}
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ── Alias de dominio (los usan el front y los servicios) ───────────────────────
type Tabla<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Cliente = Tabla<'cliente'>;
export type NuevoCliente = Insertable<'cliente'>;
export type Producto = Tabla<'producto'>;
export type NuevoProducto = Insertable<'producto'>;
export type Stock = Tabla<'stock'>;
export type Pedido = Tabla<'pedido'>;
export type DetallePedido = Tabla<'detalle_del_pedido'>;
export type Comprobante = Tabla<'comprobante'>;
export type RemitoVenta = Tabla<'remitos_de_venta'>;
export type AlertaStock = Tabla<'alerta_de_estado'>;
export type VistaCatalogo = Database['public']['Views']['vista_catalogo']['Row'];

export type EstadoPedido = Pedido['estado_actual'];
export type EstadoComprobante = Comprobante['estado_actual'];

export type ItemPedido = { id_producto: number; cantidad: number };
export type CrearPedidoArgs = Database['public']['Functions']['crear_pedido']['Args'];

export const ESTADOS_PEDIDO = [
  'Pendiente de Pago',
  'Pago Validado',
  'Rechazado',
  'Cancelado',
] as const satisfies readonly EstadoPedido[];

export const ESTADOS_COMPROBANTE = [
  'Comprobante Subido',
  'Aprobado por Admin',
  'Rechazado',
] as const satisfies readonly EstadoComprobante[];
`;

writeFileSync(SALIDA, contenido, 'utf8');
await db.close();

console.log(`OK · ${SALIDA}`);
console.log(`   ${tablas.size} tablas, ${vistas.size} vistas, ${funciones.rows.length} RPC`);
