import type { Base } from './ayudantes';

/**
 * El pedazo de PostgREST que el checkout usa, sobre PGlite.
 *
 * Sirve para testear los adaptadores (`puertoSobre` del checkout) contra un PostgreSQL real, sin red
 * y sin Supabase: la semántica que importa es la del SQL. `eq` es igualdad y `ilike` es patrón, así
 * que un test que busca `%@ejemplo.com` distingue una de otra —que es justo la diferencia del
 * hallazgo 1 de `deuda-codigo-25-10` (#33).
 *
 * No es un PostgREST completo: sólo `select`/`insert` con `eq`/`ilike` y `single`/`maybeSingle`.
 */

export type Respuesta<T> = {
  data: T | null;
  error: { code: string | null; message: string } | null;
};

type Filtro = { operador: 'eq' | 'ilike'; columna: string; valor: string };

export class Consulta<T> implements PromiseLike<Respuesta<T>> {
  private filtros: Filtro[] = [];
  private accion: 'select' | 'insert' = 'select';
  private datos: Record<string, unknown> | null = null;
  private columnas: string[] = ['id_cliente'];
  private singular = false;

  constructor(
    private readonly db: Base,
    private readonly tabla: string,
  ) {}

  select(columnas: string): this {
    this.columnas = columnas.split(',').map((columna) => columna.trim());
    return this;
  }

  insert(datos: Record<string, unknown>): this {
    this.accion = 'insert';
    this.datos = datos;
    return this;
  }

  eq(columna: string, valor: string): this {
    this.filtros.push({ operador: 'eq', columna, valor });
    return this;
  }

  ilike(columna: string, valor: string): this {
    this.filtros.push({ operador: 'ilike', columna, valor });
    return this;
  }

  /** Una fila o error; con más de una fila copia el `PGRST116` de PostgREST. */
  maybeSingle(): Promise<Respuesta<T>> {
    this.singular = true;
    return this.ejecutar();
  }

  single(): Promise<Respuesta<T>> {
    this.singular = true;
    return this.ejecutar();
  }

  then<TResult1 = Respuesta<T>, TResult2 = never>(
    onfulfilled?: ((value: Respuesta<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.ejecutar().then(onfulfilled, onrejected);
  }

  private async ejecutar(): Promise<Respuesta<T>> {
    try {
      const { rows } =
        this.accion === 'insert' ? await this.insertar() : await this.seleccionar();

      if (this.singular && rows.length > 1) {
        return { data: null, error: { code: 'PGRST116', message: 'más de una fila' } };
      }
      return { data: rows[0] ?? null, error: null };
    } catch (error) {
      return { data: null, error: { code: codigoDe(error), message: mensajeDe(error) } };
    }
  }

  private async seleccionar() {
    const where = this.filtros.map(
      (filtro, indice) =>
        `${filtro.columna} ${filtro.operador === 'eq' ? '=' : 'ilike'} $${indice + 1}`,
    );
    const sql = [
      `select ${this.columnas.join(', ')} from public.${this.tabla}`,
      where.length > 0 ? `where ${where.join(' and ')}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return await this.db.query<T>(sql, this.filtros.map((filtro) => filtro.valor));
  }

  private async insertar() {
    const datos = this.datos ?? {};
    const columnas = Object.keys(datos);
    const sql =
      `insert into public.${this.tabla} (${columnas.join(', ')}) ` +
      `values (${columnas.map((_, indice) => `$${indice + 1}`).join(', ')}) ` +
      `returning ${this.columnas.join(', ')}`;

    return await this.db.query<T>(
      sql,
      columnas.map((columna) => datos[columna] ?? null),
    );
  }
}

/** El mínimo cliente que `puertoSobre` necesita, apoyado en PGlite. */
export function clienteFalso(db: Base) {
  return {
    from: (tabla: string) => new Consulta<Record<string, unknown>>(db, tabla),
  };
}

function codigoDe(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const codigo = (error as { code?: unknown }).code;
    if (typeof codigo === 'string') return codigo;
  }
  return null;
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
