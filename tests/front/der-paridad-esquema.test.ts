import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearBase, type Base } from '../db/ayudantes';
import { RAIZ } from './ayudantes';

/**
 * Paridad entre el DER Mermaid publicado y el esquema físico real de `public`.
 *
 * El seam es el artefacto público: el bloque `erDiagram` de `docs/academico/DER.md` y el bloque
 * `der` del visor del Hub. La fuente de verdad independiente es el DDL ejecutable
 * (`supabase/migrations/*.sql`) levantado en PGlite, que es lo que `npm run bd:viva` compara
 * contra el proyecto vivo `otjphjnrwihqzzhbfnmh`.
 *
 * Qúe cubre: nombre y columnas de cada tabla, la vista `vista_catalogo`, las relaciones contra
 * las claves foráneas reales y la identidad entre el documento y el visor.
 * Qué no cubre: cuerpos de funciones, índices y políticas RLS (los fija `tests/db/`).
 *
 * Auditado el 2026-11-05 por la especificación OpenAPI de PostgREST con la service role key:
 * la base viva expone las 10 tablas del MVP, la vista, y las tablas residuales `admin` y `roll`
 * de Fase 2 (ver `docs/estado/AUDITORIA_BD.md` §11.4).
 */

const RUTA_DER = join(RAIZ, 'docs', 'academico', 'DER.md');
const RUTA_VISOR = join(RAIZ, '..', 'quimicashop', 'diagramas-visor.js');

/**
 * Tablas de Fase 2 que la migración 03 cierra **si existen** y que la auditoría confirmó vivas
 * en el proyecto real. No las crea ninguna migración: son residuo del esquema legacy.
 */
const RESIDUO_FASE_2 = ['admin', 'roll'];

/** Columnas auditadas del residuo de Fase 2 (no salen de las migraciones: ya existían vivas). */
const COLUMNAS_RESIDUO_FASE_2: Record<string, string[]> = {
  admin: ['id_admin', 'nombre', 'email', 'password_hash'],
  roll: ['id_rol', 'descripcion_rol'],
};

/** Bloques ```mermaid del documento, ya recortados. */
function bloquesMermaid(contenido: string): string[] {
  return [...contenido.matchAll(/```mermaid\s*\n([\s\S]*?)\n```/g)].map((m) => m[1].trim());
}

/** El bloque `erDiagram` del esquema físico: el primero del documento. */
function bloqueFisico(contenido: string): string {
  const bloque = bloquesMermaid(contenido).find((b) => /^erDiagram\b/.test(b));
  if (!bloque) throw new Error('El documento no tiene ningún bloque erDiagram');
  return bloque;
}

type Entidad = { nombre: string; columnas: string[]; claves: Map<string, string>; tipos: Map<string, string> };

/** Entidades declaradas con su bloque `{}` y las columnas en el orden del documento. */
function entidadesDe(bloque: string): Map<string, Entidad> {
  const entidades = new Map<string, Entidad>();
  let actual: Entidad | null = null;

  for (const linea of bloque.split('\n')) {
    const sinComentario = linea.replace(/%%.*$/, '').trimEnd();
    if (!sinComentario.trim()) continue;

    const apertura = sinComentario.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*$/);
    if (apertura) {
      actual = { nombre: apertura[1], columnas: [], claves: new Map(), tipos: new Map() };
      entidades.set(actual.nombre, actual);
      continue;
    }
    if (/^\s*\}\s*$/.test(sinComentario)) {
      actual = null;
      continue;
    }
    if (!actual) continue;

    const atributo = sinComentario.match(
      /^\s*([A-Za-z_][A-Za-z0-9_()[\]]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*([A-Za-z, ]*?)\s*(?:"([^"]*)")?\s*$/,
    );
    if (!atributo) continue;
    actual.columnas.push(atributo[2]);
    actual.tipos.set(atributo[2], atributo[1]);
    const llaves = atributo[3].trim();
    if (llaves) actual.claves.set(atributo[2], llaves.replace(/\s+/g, ' '));
  }

  return entidades;
}

/** Relaciones `padre ||--o{ hijo : etiqueta` del bloque, con sus cardinalidades. */
type Relacion = { izquierda: string; cardIzquierda: string; derecha: string; cardDerecha: string };

const CARDINALIDAD = /^(\|o|\|\||\}o|\}\|)--(o\||\|\||o\{|\|\{)$/;

function relacionesDe(bloque: string): Relacion[] {
  const relaciones: Relacion[] = [];
  for (const linea of bloque.split('\n')) {
    const sinComentario = linea.replace(/%%.*$/, '').trim();
    const match = sinComentario.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(\S+)\s+([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (!match) continue;
    const card = match[2].match(CARDINALIDAD);
    if (!card) continue;
    relaciones.push({
      izquierda: match[1],
      cardIzquierda: card[1],
      derecha: match[3],
      cardDerecha: card[2],
    });
  }
  return relaciones;
}

/** Tipo Mermaid esperado para cada tipo SQL de PostgreSQL. */
const TIPO_MERMAID: Record<string, string> = {
  text: 'string',
  'character varying': 'string',
  integer: 'int',
  numeric: 'numeric',
  boolean: 'boolean',
  date: 'date',
  'timestamp with time zone': 'timestamp',
};

/** Columnas y tipos reales de cada tabla base y de cada vista de `public`. */
async function columnasDe(
  db: Base,
  tipo: 'BASE TABLE' | 'VIEW',
): Promise<Map<string, string[]>> {
  const esquema = await esquemaDe(db, tipo);
  return new Map([...esquema].map(([tabla, columnas]) => [tabla, [...columnas.keys()]]));
}

/** Columnas con su `data_type` de PostgreSQL. */
async function esquemaDe(
  db: Base,
  tipo: 'BASE TABLE' | 'VIEW',
): Promise<Map<string, Map<string, string>>> {
  const { rows } = await db.query<{ table_name: string; column_name: string; data_type: string }>(
    `select c.table_name, c.column_name, c.data_type
       from information_schema.columns c
       join information_schema.tables t
         on t.table_schema = c.table_schema and t.table_name = c.table_name
      where c.table_schema = 'public' and t.table_type = $1
      order by c.table_name, c.ordinal_position`,
    [tipo],
  );
  const porTabla = new Map<string, Map<string, string>>();
  for (const { table_name, column_name, data_type } of rows) {
    if (!porTabla.has(table_name)) porTabla.set(table_name, new Map());
    porTabla.get(table_name)!.set(column_name, data_type);
  }
  return porTabla;
}

/** Claves foráneas reales: `hijo.columna → padre`, con la unicidad de la columna hija. */
async function clavesForaneas(
  db: Base,
): Promise<Array<{ hijo: string; padre: string; unica: boolean }>> {
  const { rows: foraneas } = await db.query<{
    hijo: string;
    padre: string;
    columna: string;
    restriccion: string;
  }>(
    `select tc.constraint_name as restriccion,
            tc.table_name as hijo,
            ccu.table_name as padre,
            kcu.column_name as columna
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu
         on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
       join information_schema.constraint_column_usage ccu
         on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
      order by tc.table_name, kcu.column_name`,
  );

  // Columnas por restricción UNIQUE: una restricción de una sola columna es la que hace 1:1.
  const { rows: unicas } = await db.query<{
    restriccion: string;
    tabla: string;
    columna: string;
    columnas: number;
  }>(
    `select tc.constraint_name as restriccion,
            tc.table_name as tabla,
            kcu.column_name as columna,
            (select count(*)
               from information_schema.key_column_usage k2
              where k2.constraint_name = tc.constraint_name
                and k2.table_schema = tc.table_schema) as columnas
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu
         on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
      where tc.constraint_type = 'UNIQUE' and tc.table_schema = 'public'`,
  );

  const unaSolaColumna = new Set(
    unicas
      .filter((fila) => Number(fila.columnas) === 1)
      .map((fila) => `${fila.tabla}.${fila.columna}`),
  );

  return foraneas.map((fila) => ({
    hijo: fila.hijo,
    padre: fila.padre,
    unica: unaSolaColumna.has(`${fila.hijo}.${fila.columna}`),
  }));
}

/** Código Mermaid del diagrama `der` del visor del Hub. */
function bloqueDelVisor(): string {
  const visor = readFileSync(RUTA_VISOR, 'utf8');
  const match = visor.match(/id:\s*['"]der['"][\s\S]*?code:\s*`([\s\S]*?)`/);
  if (!match) throw new Error('El visor del Hub no tiene el diagrama `der`');
  return match[1].trim();
}

describe('DER · paridad con el esquema físico de la base viva', () => {
  let db: Base;
  let tablas: Map<string, string[]>;
  let tipos: Map<string, Map<string, string>>;
  let tiposVistas: Map<string, Map<string, string>>;
  let vistas: Map<string, string[]>;
  let foraneas: Array<{ hijo: string; padre: string; unica: boolean }>;

  beforeAll(async () => {
    db = await crearBase();
    tipos = await esquemaDe(db, 'BASE TABLE');
    tiposVistas = await esquemaDe(db, 'VIEW');
    tablas = await columnasDe(db, 'BASE TABLE');
    vistas = await columnasDe(db, 'VIEW');
    foraneas = await clavesForaneas(db);
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it('Ciclo 1 · declara exactamente los objetos de public: 10 tablas del MVP, la vista y el residuo de Fase 2', () => {
    const esperadas = [...tablas.keys(), ...vistas.keys(), ...RESIDUO_FASE_2].sort();
    const declaradas = [...entidadesDe(bloqueFisico(readFileSync(RUTA_DER, 'utf8'))).keys()].sort();
    expect(declaradas).toEqual(esperadas);
  });

  it('Ciclo 2 · cada entidad declara exactamente las columnas de su tabla, en el orden físico', () => {
    const entidades = entidadesDe(bloqueFisico(readFileSync(RUTA_DER, 'utf8')));
    const desajustes: Record<string, { declaradas: string[]; reales: string[] }> = {};

    for (const [tabla, reales] of tablas) {
      const declaradas = entidades.get(tabla)?.columnas ?? [];
      if (declaradas.join(',') !== reales.join(',')) desajustes[tabla] = { declaradas, reales };
    }
    for (const tabla of RESIDUO_FASE_2) {
      const reales = COLUMNAS_RESIDUO_FASE_2[tabla];
      const declaradas = entidades.get(tabla)?.columnas ?? [];
      if (declaradas.join(',') !== reales.join(',')) desajustes[tabla] = { declaradas, reales };
    }

    expect(desajustes).toEqual({});
  });

  it('Ciclo 3 · cada columna declara el tipo Mermaid que corresponde a su tipo SQL real', () => {
    const entidades = entidadesDe(bloqueFisico(readFileSync(RUTA_DER, 'utf8')));
    const desajustes: Record<string, { declarado: string; real: string }> = {};

    for (const [tabla, columnas] of [...tipos, ...tiposVistas]) {
      const entidad = entidades.get(tabla);
      if (!entidad) continue;
      for (const [columna, tipoSql] of columnas) {
        const esperado = TIPO_MERMAID[tipoSql];
        const declarado = entidad.tipos.get(columna);
        if (!esperado) desajustes[`${tabla}.${columna}`] = { declarado: `SQL sin mapeo: ${tipoSql}`, real: tipoSql };
        else if (declarado !== esperado) {
          desajustes[`${tabla}.${columna}`] = { declarado: String(declarado), real: `${tipoSql} → ${esperado}` };
        }
      }
    }

    expect(desajustes).toEqual({});
  });

  it('Ciclo 3 · declara la vista vista_catalogo con sus 12 columnas calculadas', () => {
    const entidades = entidadesDe(bloqueFisico(readFileSync(RUTA_DER, 'utf8')));
    const esperadas = vistas.get('vista_catalogo');
    expect(esperadas).toBeDefined();
    expect(entidades.get('vista_catalogo')?.columnas).toEqual(esperadas);
  });

  it('Ciclo 3 · cada relación es una clave foránea real y la cardinalidad respeta la unicidad', () => {
    const relaciones = relacionesDe(bloqueFisico(readFileSync(RUTA_DER, 'utf8')));
    const pares = new Set(relaciones.map((r) => `${r.izquierda}->${r.derecha}`));
    const problemas: string[] = [];

    for (const { hijo, padre, unica } of foraneas) {
      const relacion = relaciones.find((r) => r.izquierda === padre && r.derecha === hijo);
      if (!relacion) {
        problemas.push(`${hijo} → ${padre}: la FK no está dibujada`);
        continue;
      }
      const hijoEsUno = /^(o\||\|\|)$/.test(relacion.cardDerecha);
      if (unica && !hijoEsUno) {
        problemas.push(`${hijo} → ${padre}: la columna es UNIQUE y el DER la dibuja 1:N`);
      }
      if (!unica && hijoEsUno) {
        problemas.push(`${hijo} → ${padre}: la columna admite N filas y el DER la dibuja 1:1`);
      }
    }
    for (const { izquierda, derecha } of relaciones) {
      if (!foraneas.some((fk) => fk.padre === izquierda && fk.hijo === derecha)) {
        problemas.push(`${izquierda} → ${derecha}: la relación no tiene FK en la base`);
      }
    }

    expect(problemas).toEqual([]);
    expect(pares.size).toBe(relaciones.length);
  });

  it('Ciclo 3 · el dinero declara NUMERIC(12,2) en todas las columnas monetarias', () => {
    const bloque = bloqueFisico(readFileSync(RUTA_DER, 'utf8'));
    const lineas = bloque.split('\n');
    const monetarias = [...tipos]
      .flatMap(([tabla, columnas]) =>
        [...columnas].filter(([, tipo]) => tipo === 'numeric').map(([columna]) => ({ tabla, columna })),
      )
      .map(({ tabla, columna }) => `${tabla}.${columna}`);

    expect(monetarias.length).toBeGreaterThan(0);
    const sinPrecision = monetarias.filter((referencia) => {
      const [tabla, columna] = referencia.split('.');
      const entidad = entidadesDe(bloque).get(tabla);
      const linea = lineas.find((l) => new RegExp(`^\\s*\\w+\\s+${columna}\\b`).test(l));
      return !entidad || !linea || !/NUMERIC\(12,2\)/.test(linea);
    });

    expect(sinPrecision).toEqual([]);
  });

  it('Ciclo 3 · el DER del Hub es idéntico al de docs/academico/DER.md', () => {
    const documento = bloqueFisico(readFileSync(RUTA_DER, 'utf8'));
    const visor = bloqueDelVisor();

    // El documento sangra a 4 espacios y el visor a 8 porque vive dentro de un template literal.
    // En un `erDiagram` la indentación es cosmética: la igualdad se mide sobre el contenido.
    const normalizar = (texto: string) =>
      texto
        .split('\n')
        .map((linea) => linea.trim())
        .filter((linea) => linea.length > 0)
        .join('\n');

    expect(normalizar(visor)).toBe(normalizar(documento));
  });
});
