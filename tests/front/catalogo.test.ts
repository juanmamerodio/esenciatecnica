import { describe, expect, it } from 'vitest';
import { consultarCatalogo } from '../../src/lib/catalogo';
import { crearBase, crearProducto } from '../db/ayudantes';
import { catalogoConSeed, lectorDe } from './ayudantes';

/**
 * T1 · Home canónica (issue #5) — seam: la función pública del módulo de catálogo.
 *
 * Se testea comportamiento externo contra un PostgreSQL real (PGlite) con las migraciones
 * y el seed aplicados: qué productos salen, con qué disponibilidad, qué pasa cuando la
 * vista no devuelve filas y qué pasa cuando la lectura falla. Nada de triggers, formas de
 * query ni detalles internos. La Home no se testea con DOM en esta tajada (spec §7).
 */

async function nombresDe(consultar: () => ReturnType<typeof consultarCatalogo>): Promise<string[]> {
  const resultado = await consultar();
  if (resultado.estado !== 'ok') throw new Error(`se esperaba catálogo ok, llegó ${resultado.estado}`);
  return resultado.productos.map((producto) => producto.nombre);
}

describe('T1 · catálogo público', () => {
  it('sólo expone productos activos', async () => {
    const { db, consultar } = await catalogoConSeed();
    await db.query(`update public.producto set activo = false where nombre = 'Jabón Líquido Neutro'`);

    expect(await nombresDe(consultar)).toEqual(['Crema Hidratante Facial']);
  });

  it('ordena por nombre ascendente', async () => {
    const { db, consultar } = await catalogoConSeed();
    await crearProducto(db, { nombre: 'Zinc tópico', precio: 900, cantidad: 4 });
    await crearProducto(db, { nombre: 'Aloe en gel', precio: 900, cantidad: 4 });

    expect(await nombresDe(consultar)).toEqual([
      'Aloe en gel',
      'Crema Hidratante Facial',
      'Jabón Líquido Neutro',
      'Zinc tópico',
    ]);
  });

  it('resuelve la disponibilidad y marca sin stock, incluso sin fila de stock', async () => {
    const { db, consultar } = await catalogoConSeed();
    const agotado = await crearProducto(db, { nombre: 'Acondicionador sólido', precio: 1200, cantidad: 3, reservada: 3 });
    const sinFila = await crearProducto(db, { nombre: 'Bálsamo labial', precio: 700, cantidad: 5 });
    await db.query('delete from public.stock where id_producto = $1', [sinFila]);

    const resultado = await consultar();
    if (resultado.estado !== 'ok') throw new Error('se esperaba catálogo ok');

    const porNombre = new Map(resultado.productos.map((producto) => [producto.nombre, producto]));
    expect(porNombre.get('Crema Hidratante Facial')).toMatchObject({ disponible: 43, sinStock: false });
    expect(porNombre.get('Jabón Líquido Neutro')).toMatchObject({ disponible: 6, sinStock: false });
    expect(porNombre.get('Acondicionador sólido')).toMatchObject({ disponible: 0, sinStock: true });
    expect(porNombre.get('Bálsamo labial')).toMatchObject({ disponible: 0, sinStock: true });
    expect(agotado).toBeGreaterThan(0);
  });

  it('no inventa campos: precio numérico, descripción y categoría tal como están en el modelo', async () => {
    const { consultar } = await catalogoConSeed();
    const resultado = await consultar();
    if (resultado.estado !== 'ok') throw new Error('se esperaba catálogo ok');

    expect(resultado.productos[0]).toMatchObject({
      nombre: 'Crema Hidratante Facial',
      categoria: 'Cosmética',
      tipo: 'Emulsión',
      descripcion: 'Base de aloe vera y manzanilla',
      precio: 2500,
      tiempoProduccion: 3,
    });
  });

  it('distingue la tienda vacía del error: sin filas es un catálogo vacío, no una falla', async () => {
    const db = await crearBase({ seed: false });
    const resultado = await consultarCatalogo(lectorDe(db));

    expect(resultado).toEqual({ estado: 'ok', productos: [], categorias: [] });
  });

  it('si la lectura falla, devuelve error y no un catálogo vacío', async () => {
    const conError = await consultarCatalogo({
      async leer() {
        return { filas: null, error: new Error('sin conexión con la base') };
      },
    });
    expect(conError.estado).toBe('error');
    expect(conError).not.toHaveProperty('productos');
    if (conError.estado !== 'error') throw new Error('se esperaba error');
    expect(conError.mensaje).toContain('sin conexión con la base');

    const excepcion = await consultarCatalogo({
      async leer() {
        throw new Error('la vista no responde');
      },
    });
    expect(excepcion.estado).toBe('error');
    if (excepcion.estado !== 'error') throw new Error('se esperaba error');
    expect(excepcion.mensaje).toContain('la vista no responde');
  });
});
