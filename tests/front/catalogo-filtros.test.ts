import { describe, expect, it } from 'vitest';
import { consultarCatalogo, type ConsultaCatalogo, type LectorCatalogo } from '../../src/lib/catalogo';
import type { VistaCatalogo } from '../../src/lib/database.types';
import { crearBase, crearProducto, type Base } from '../db/ayudantes';

/**
 * T2 · Catálogo (issue #6) — seam: la función pública del catálogo con `consulta`.
 *
 * Igual que en T1, se testea comportamiento externo contra PGlite migrada + seed: qué
 * devuelve la búsqueda, qué alcanza, cómo combina con la categoría y qué pasa cuando no
 * hay resultados. El render de `/catalog` se verifica en el navegador (spec §4).
 */

function lectorDe(db: Base): LectorCatalogo {
  return {
    async leer() {
      const { rows } = await db.query<VistaCatalogo>('select * from public.vista_catalogo');
      return { filas: rows, error: null };
    },
  };
}

async function catalogoConSeed() {
  const db = await crearBase({ seed: true });
  return {
    db,
    consultar: (consulta?: ConsultaCatalogo) => consultarCatalogo(lectorDe(db), consulta),
  };
}

async function nombres(consulta?: ConsultaCatalogo) {
  const { consultar } = await catalogoConSeed();
  const resultado = await consultar(consulta);
  if (resultado.estado !== 'ok') throw new Error(`se esperaba catálogo ok, llegó ${resultado.estado}`);
  return resultado.productos.map((producto) => producto.nombre);
}

describe('T2 · búsqueda', () => {
  it('encuentra sin distinguir mayúsculas ni acentos', async () => {
    expect(await nombres({ busqueda: 'jabon' })).toEqual(['Jabón Líquido Neutro']);
    expect(await nombres({ busqueda: 'JABÓN' })).toEqual(['Jabón Líquido Neutro']);
  });

  it('alcanza nombre, categoría, tipo y descripción', async () => {
    const { db, consultar } = await catalogoConSeed();
    await crearProducto(db, { nombre: 'Zinc tópico', precio: 900, cantidad: 4 });

    // Mismo catálogo que la búsqueda: los productos extra se insertan en esta base.
    const buscando = async (busqueda: string) => {
      const resultado = await consultar({ busqueda });
      if (resultado.estado !== 'ok') throw new Error('se esperaba catálogo ok');
      return resultado.productos.map((producto) => producto.nombre);
    };

    expect(await buscando('zinc')).toEqual(['Zinc tópico']);
    expect(await buscando('higiene')).toEqual(['Jabón Líquido Neutro']);
    expect(await buscando('emulsión')).toEqual(['Crema Hidratante Facial', 'Zinc tópico']);
    expect(await buscando('manzanilla')).toEqual(['Crema Hidratante Facial']);
    expect(consultar).toBeTypeOf('function');
  });

  it('sin coincidencias devuelve un catálogo vacío, no un error', async () => {
    const { consultar } = await catalogoConSeed();
    const resultado = await consultar({ busqueda: 'shampoo de argán' });

    expect(resultado).toMatchObject({ estado: 'ok', productos: [] });
  });

  it('una búsqueda en blanco no filtra nada', async () => {
    const todos = await nombres();
    expect(await nombres({ busqueda: '   ' })).toEqual(todos);
  });
});

describe('T2 · filtro por categoría', () => {
  it('filtra por categoría exacta', async () => {
    expect(await nombres({ categoria: 'Higiene' })).toEqual(['Jabón Líquido Neutro']);
    expect(await nombres({ categoria: 'Cosmética' })).toEqual(['Crema Hidratante Facial']);
  });

  it('una categoría inexistente devuelve vacío, no todo el catálogo', async () => {
    expect(await nombres({ categoria: 'Insumos' })).toEqual([]);
  });

  it('combina búsqueda y categoría', async () => {
    const { db, consultar } = await catalogoConSeed();
    await crearProducto(db, { nombre: 'Crema de manos', precio: 1500, cantidad: 3 });

    const filtrando = async (consulta: ConsultaCatalogo) => {
      const resultado = await consultar(consulta);
      if (resultado.estado !== 'ok') throw new Error('se esperaba catálogo ok');
      return resultado.productos.map((producto) => producto.nombre);
    };

    expect(await filtrando({ busqueda: 'crema', categoria: 'Higiene' })).toEqual([]);
    expect(await filtrando({ busqueda: 'crema', categoria: 'Cosmética' })).toEqual([
      'Crema de manos',
      'Crema Hidratante Facial',
    ]);
  });
});

describe('T2 · categorías disponibles', () => {
  it('salen del catálogo completo y no de la lista filtrada', async () => {
    const { consultar } = await catalogoConSeed();

    const soloHigiene = await consultar({ categoria: 'Higiene' });
    if (soloHigiene.estado !== 'ok') throw new Error('se esperaba catálogo ok');
    expect(soloHigiene.productos.map((producto) => producto.nombre)).toEqual(['Jabón Líquido Neutro']);
    expect(soloHigiene.categorias).toEqual(['Cosmética', 'Higiene']);
  });

  it('están ordenadas y sin repetir', async () => {
    const { db, consultar } = await catalogoConSeed();
    await crearProducto(db, { nombre: 'Bálsamo labial', precio: 700, cantidad: 2 });

    const resultado = await consultar();
    if (resultado.estado !== 'ok') throw new Error('se esperaba catálogo ok');
    const categorias = resultado.categorias;
    expect(categorias).toEqual([...categorias].sort((uno, otro) => uno.localeCompare(otro, 'es')));
    expect(new Set(categorias).size).toBe(categorias.length);
  });
});
