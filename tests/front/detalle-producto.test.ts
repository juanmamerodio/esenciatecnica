import { describe, expect, it } from 'vitest';
import { consultarCatalogo } from '../../src/lib/catalogo';
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
