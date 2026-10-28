import { describe, expect, it } from 'vitest';
import { consultarCatalogo, idDeProducto, textoDeProduccion } from '../../src/lib/catalogo';
import { crearBase, crearCliente, crearProducto, type Base } from '../db/ayudantes';
import { lectorDe, leer } from './ayudantes';

/**
 * T3 · Detalle de producto (issue #8) — decisión G2: página propia en `/producto/[id]`.
 *
 * El detalle no tiene un lector propio: reutiliza la función pública del catálogo. Por eso el
 * seam de datos es el mismo de T1, y lo que se verifica acá es el invariante que sostiene el
 * 404 —un producto dado de baja desaparece de la vista, así que no hay URL que lo alcance— más
 * la estructura de la página y el enlace desde la card.
 */

const PAGINA = 'src/app/producto/[id]/page.tsx';

async function cerrar(db: Base): Promise<void> {
  await db.close();
}

describe('T3 · el filtro de activos vive en la vista, no en el cliente', () => {
  it('un producto dado de baja deja de aparecer: su URL directa no puede mostrarlo', async () => {
    const db = await crearBase();
    try {
      const idProducto = await crearProducto(db, {
        nombre: 'Crema de Prueba',
        precio: 1000,
        cantidad: 5,
      });

      const antes = await consultarCatalogo(lectorDe(db));
      expect(antes.estado).toBe('ok');
      if (antes.estado !== 'ok') throw new Error(antes.mensaje);
      expect(antes.productos.map((producto) => producto.id)).toContain(idProducto);

      await db.query('update producto set activo = false where id_producto = $1', [idProducto]);

      const despues = await consultarCatalogo(lectorDe(db));
      expect(despues.estado).toBe('ok');
      if (despues.estado !== 'ok') throw new Error(despues.mensaje);
      expect(despues.productos.map((producto) => producto.id)).not.toContain(idProducto);
    } finally {
      await cerrar(db);
    }
  });

  it('el detalle publica la misma disponibilidad que la grilla, sin campos nuevos', async () => {
    const db = await crearBase();
    try {
      await crearCliente(db, { dni: '40111222', email: 'cliente@ejemplo.com' });
      const idProducto = await crearProducto(db, {
        nombre: 'Jabón de Prueba',
        precio: 1800,
        cantidad: 3,
        reservada: 3,
      });

      const resultado = await consultarCatalogo(lectorDe(db));
      expect(resultado.estado).toBe('ok');
      if (resultado.estado !== 'ok') throw new Error(resultado.mensaje);

      const producto = resultado.productos.find((fila) => fila.id === idProducto);
      expect(producto).toBeDefined();
      expect(producto?.disponible).toBe(0);
      expect(producto?.sinStock).toBe(true);
      // Lo que el detalle puede mostrar sale del catálogo: no hay campos extra que inventar.
      expect(Object.keys(producto ?? {}).sort()).toEqual(
        [
          'categoria',
          'descripcion',
          'disponible',
          'id',
          'imagenUrl',
          'nombre',
          'precio',
          'sinImagen',
          'sinStock',
          'tiempoProduccion',
          'tipo',
        ].sort(),
      );
    } finally {
      await cerrar(db);
    }
  });
});

describe('#42 · el id de la URL es válido o no es un producto', () => {
  it('rechaza lo que no son dígitos', () => {
    expect(idDeProducto('abc')).toBeNull();
    expect(idDeProducto('12a')).toBeNull();
    expect(idDeProducto('')).toBeNull();
    expect(idDeProducto(' 1')).toBeNull();
    expect(idDeProducto('1 ')).toBeNull();
  });

  it('rechaza el cero y los negativos', () => {
    expect(idDeProducto('0')).toBeNull();
    expect(idDeProducto('-1')).toBeNull();
  });

  it('rechaza los decimales', () => {
    expect(idDeProducto('1.5')).toBeNull();
    expect(idDeProducto('1,5')).toBeNull();
  });

  it('rechaza un número fuera del rango seguro, que no se vuelve un producto por accidente', () => {
    expect(idDeProducto('99999999999999999999')).toBeNull();
    expect(idDeProducto('9007199254740993')).toBeNull();
  });

  it('acepta un entero positivo y lo devuelve como número', () => {
    expect(idDeProducto('1')).toBe(1);
    expect(idDeProducto('42')).toBe(42);
  });
});

describe('#42 · la página delega el 404 y no valida `activo`', () => {
  it('llama al 404 cuando el formato del id es inválido y cuando el producto no está', () => {
    const pagina = leer(PAGINA);
    expect(pagina).toMatch(/idDeProducto\(/);
    // Dos `notFound()`: uno por formato y otro por producto ausente.
    expect(pagina.match(/notFound\(\)/g)).toHaveLength(2);
    expect(pagina).toMatch(/find\(\(fila\) => fila\.id === identificador\)/);
  });

  it('no reimplementa la validación del id ni la regla de `activo`', () => {
    const pagina = leer(PAGINA);
    expect(pagina).not.toMatch(/Number\.isSafeInteger|\/\^\[0-9\]\+\$\//);

    // Sin comentarios: la página puede explicar que la vista filtra `activo`, pero no puede usarlo.
    const codigo = pagina.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(codigo).not.toMatch(/activo/);
  });
});

describe('#38 · el tiempo de producción en la card del catálogo', () => {
  it('se dice en días, en singular y en plural, y sin inventar un cero', () => {
    expect(textoDeProduccion(1)).toBe('1 día');
    expect(textoDeProduccion(3)).toBe('3 días');
    expect(textoDeProduccion(0)).toBe('Elaboración inmediata');
    expect(textoDeProduccion(0)).not.toMatch(/0/);
  });

  it('la card lo publica sólo cuando el que la usa lo pide', () => {
    const card = leer('src/components/ProductCard.tsx');
    expect(card).toMatch(/muestraProduccion/);
    expect(card).toMatch(/textoDeProduccion\(/);

    const grilla = leer('src/components/GrillaProductos.tsx');
    expect(grilla).toMatch(/muestraProduccion/);
    expect(grilla).toMatch(/<ProductCard[\s\S]*muestraProduccion=\{muestraProduccion\}/);
  });

  it('el catálogo lo publica y la Home no', () => {
    const catalogo = leer('src/app/catalog/page.tsx');
    expect(catalogo).toMatch(/muestraProduccion/);

    const home = leer('src/app/page.tsx');
    expect(home).not.toMatch(/muestraProduccion/);
    expect(home).not.toMatch(/tiempoProduccion|textoDeProduccion/);
  });

  it('el detalle usa la misma frase que la card', () => {
    const detalle = leer(PAGINA);
    expect(detalle).toMatch(/textoDeProduccion\(/);
    expect(detalle).not.toMatch(/Elaboración inmediata/);
  });
});

describe('T3 · página de detalle', () => {
  it('reutiliza el catálogo y delega el 404 en la vista', () => {
    const pagina = leer(PAGINA);
    expect(pagina).toMatch(/leerCatalogo\(/);
    expect(pagina).toMatch(/notFound\(\)/);
    // No hay un segundo camino de lectura ni un filtro reimplementado en la página.
    expect(pagina).not.toMatch(/from\(['"]producto['"]\)|from\(['"]vista_catalogo['"]\)/);
    expect(pagina).not.toMatch(/\.filter\(|normalize\(/);
  });

  it('muestra la producción como dato de producción y no promete envío', () => {
    const pagina = leer(PAGINA);
    expect(pagina).toMatch(/tiempoProduccion/);
    expect(pagina).toMatch(/Producción estimada/);
    expect(pagina).not.toMatch(/enviamos|llega en|entrega en \d|seguimiento del pedido|En Preparación/i);
  });

  it('resuelve los estados sin stock y sin imagen como la card', () => {
    const pagina = leer(PAGINA);
    expect(pagina).toMatch(/ImagenProducto/);
    expect(pagina).toMatch(/AgregarAlCarrito/);
    expect(pagina).toMatch(/sinStock/);
    // El detalle no publica unidades disponibles, igual que la card.
    expect(pagina).not.toMatch(/producto\.disponible/);
  });

  it('la card lleva al detalle sin cambiar su contrato', () => {
    const card = leer('src/components/ProductCard.tsx');
    expect(card).toMatch(/\/producto\/\$\{producto\.id\}/);
    expect(card).not.toMatch(/producto\.disponible/);
  });
});
