import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  agregar,
  cambiarCantidad,
  quitar,
  total,
  totalUnidades,
  type ItemCarrito,
} from '../../src/lib/carrito';
import { RAIZ, leer } from './ayudantes';

/**
 * T4 · Carrito (issue #9) — seam: el módulo de carrito, que es puro (sin DOM y sin base).
 *
 * Lo que se testea es la aritmética del carrito: una línea por producto, tope por
 * disponibilidad, edición y totales. La persistencia y el render se verifican en el
 * navegador (spec `carrito` §4).
 */

const CREMA = { id: 1, nombre: 'Crema Hidratante Facial', precio: 2500, disponible: 43 };
const JABON = { id: 2, nombre: 'Jabón Líquido Neutro', precio: 1800, disponible: 6 };

function carritoCon(...cantidades: Array<[typeof CREMA, number]>): ItemCarrito[] {
  return cantidades.reduce<ItemCarrito[]>((items, [producto, cantidad]) => agregar(items, producto, cantidad), []);
}

describe('T4 · agregar', () => {
  it('agrega un producto nuevo como una línea de cantidad 1', () => {
    expect(agregar([], CREMA)).toEqual([{ ...CREMA, cantidad: 1 }]);
  });

  it('el mismo producto queda en una sola línea con la cantidad sumada', () => {
    const items = agregar(agregar(agregar([], CREMA), CREMA), JABON);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ nombre: 'Crema Hidratante Facial', cantidad: 2 });
    expect(items[1]).toMatchObject({ nombre: 'Jabón Líquido Neutro', cantidad: 1 });
  });

  it('un producto sin stock no se agrega', () => {
    expect(agregar([], { ...CREMA, disponible: 0 })).toEqual([]);
  });

  it('nunca supera las unidades disponibles', () => {
    const items = agregar([], { ...CREMA, disponible: 2 }, 3);

    expect(items).toEqual([{ ...CREMA, disponible: 2, cantidad: 2 }]);
    expect(agregar(items, { ...CREMA, disponible: 2 }, 5)).toEqual(items);
  });

  it('ignora cantidades que no son unidades positivas', () => {
    expect(agregar([], CREMA, 0)).toEqual([]);
    expect(agregar([], CREMA, -3)).toEqual([]);
  });
});

describe('T4 · editar y quitar', () => {
  it('cambia la cantidad de una línea', () => {
    const items = cambiarCantidad(carritoCon([CREMA, 1]), CREMA.id, 3);

    expect(items[0].cantidad).toBe(3);
  });

  it('no supera lo disponible al subir la cantidad', () => {
    expect(cambiarCantidad(carritoCon([JABON, 1]), JABON.id, 99)[0].cantidad).toBe(6);
  });

  it('bajar de 1 quita la línea', () => {
    expect(cambiarCantidad(carritoCon([CREMA, 1], [JABON, 2]), CREMA.id, 0)).toEqual([
      { ...JABON, cantidad: 2 },
    ]);
  });

  it('quitar saca la línea y no toca las demás', () => {
    const items = quitar(carritoCon([CREMA, 1], [JABON, 2]), JABON.id);

    expect(items).toEqual([{ ...CREMA, cantidad: 1 }]);
  });

  it('quitar un producto que no está deja el carrito igual', () => {
    const items = carritoCon([CREMA, 1]);
    expect(quitar(items, 999)).toEqual(items);
  });
});

describe('T4 · totales', () => {
  it('el total es la suma de precio por cantidad', () => {
    const items = carritoCon([CREMA, 2], [JABON, 3]);

    expect(total(items)).toBe(2500 * 2 + 1800 * 3);
  });

  it('redondea a dos decimales, como el dinero del modelo', () => {
    const items = agregar([], { ...CREMA, precio: 1000.55, disponible: 10 }, 3);

    expect(total(items)).toBe(3001.65);
  });

  it('el contador cuenta unidades, no líneas', () => {
    expect(totalUnidades(carritoCon([CREMA, 2], [JABON, 3]))).toBe(5);
    expect(totalUnidades([])).toBe(0);
    expect(total([])).toBe(0);
  });
});

describe('T4 · el carrito no reserva stock', () => {
  it('el módulo es puro: no habla con la base ni con la red', () => {
    const modulo = leer('src/lib/carrito.ts');
    expect(modulo).not.toMatch(/supabase|fetch\(|createClient|from\(/);
    expect(modulo).not.toMatch(/async|await/);
  });

  it('el adaptador de persistencia usa el módulo y guarda sólo en el navegador', () => {
    const adaptador = leer('src/lib/store.ts');
    expect(adaptador).toMatch(/from ['"]@\/lib\/carrito['"]/);
    expect(adaptador).not.toMatch(/supabase|fetch\(/);
    expect(adaptador).toContain('esenciatecnica-carrito');
  });
});

describe('T4 · página del carrito', () => {
  const pagina = leer('src/components/Carrito.tsx');

  it('hay un solo carrito: los componentes legacy se retiraron', () => {
    const componentes = readdirSync(join(RAIZ, 'src', 'components')).map((nombre) => nombre);
    expect(componentes.filter((nombre) => /^(Carrito|CartClient|CartItem|CartSummary)\.tsx$/.test(nombre))).toEqual([
      'Carrito.tsx',
    ]);
  });

  it('los controles de cantidad tienen nombre accesible y tope por disponibilidad', () => {
    expect(pagina).toMatch(/aria-label=\{`Agregar una unidad de/);
    expect(pagina).toMatch(/aria-label=\{[^}]*Quitar/);
    expect(pagina).toMatch(/disabled=\{item\.cantidad >= item\.disponible\}/);
    expect(pagina).toMatch(/aria-live="polite"/);
  });

  it('tiene estado vacío diseñado que lleva al catálogo', () => {
    expect(pagina).toContain('Tu carrito está vacío');
    expect(pagina).toMatch(/href="\/catalog"/);
  });

  it('no quedan nombres legacy en el camino del carrito', () => {
    for (const archivo of ['src/components/Carrito.tsx', 'src/components/AgregarAlCarrito.tsx', 'src/lib/store.ts', 'src/lib/carrito.ts']) {
      expect(leer(archivo)).not.toMatch(/priceArs|getTotalPrice|clearCart|quimicashop/i);
    }
  });
});
