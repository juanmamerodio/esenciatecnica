import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { consultarCatalogo, type ConsultaCatalogo, type LectorCatalogo } from '../../src/lib/catalogo';
import type { VistaCatalogo } from '../../src/lib/database.types';
import { crearBase, type Base } from '../db/ayudantes';

/** Raíz del repo: los tests de estructura leen archivos, no ejecutan la app. */
export const RAIZ = fileURLToPath(new URL('../..', import.meta.url));

export function leer(rutaRelativa: string): string {
  return readFileSync(join(RAIZ, rutaRelativa), 'utf8');
}

/** Archivos `.ts`/`.tsx` bajo un directorio, recursivo. */
export function archivosFuente(directorio: string): string[] {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) return archivosFuente(ruta);
    return /\.(ts|tsx)$/.test(entrada.name) ? [ruta] : [];
  });
}

/** Adaptador de lectura sobre PGlite: es el mismo puerto que implementa Supabase. */
export function lectorDe(db: Base): LectorCatalogo {
  return {
    async leer() {
      const { rows } = await db.query<VistaCatalogo>('select * from public.vista_catalogo');
      return { filas: rows, error: null };
    },
  };
}

/** Base migrada con el seed del MVP y el catálogo ya conectado a esa base. */
export async function catalogoConSeed(): Promise<{
  db: Base;
  consultar: (consulta?: ConsultaCatalogo) => ReturnType<typeof consultarCatalogo>;
}> {
  const db = await crearBase({ seed: true });
  return { db, consultar: (consulta?: ConsultaCatalogo) => consultarCatalogo(lectorDe(db), consulta) };
}
