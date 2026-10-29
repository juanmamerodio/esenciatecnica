import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CLIENTES,
  DESENLACES,
  FOTOS,
  FOTO_DEL_HERO,
  PEDIDOS,
  PRODUCTOS,
  claveDeComprobante,
  claveDeFotoDeProducto,
  ordenDeSiembra,
  preciosDeCatalogo,
  productoPorNombre,
  totalDePedido,
  urlPublicaDeFoto,
} from '../../scripts/demo-reglas.mjs';
import { esUrlDeImagenPermitida } from '../../src/lib/imagen';
import { RAIZ, leer } from './ayudantes';

/**
 * #22 · B5 — la siembra de la beta.
 *
 * Los datos de demo son lo primero que ve un visitante y lo que va a mirar el Administrador en el
 * panel, así que se verifican acá sin red y sin base: que el catálogo entre en el contrato del
 * modelo, que cada pedido cubra un desenlace distinto, que el monto del comprobante coincida con el
 * total y que las claves caigan en el bucket que les toca.
 *
 * El adaptador (`scripts/sembrar-demo.mjs`) no se testea: es la charla con PostgREST. Su única
 * decisión no obvia —el orden de siembra— sí está acá, que es donde se puede probar.
 */

/** El vocabulario que el glosario retira: el Producto no es un insumo de laboratorio (#51). */
const VOCABULARIO_RETIRADO =
  /reactivo|insumo|\bpH\b|compuestos clínicos|Gemini|\bIA\b|inteligencia artificial|laboratorio/i;

const precios = preciosDeCatalogo(PRODUCTOS);

/**
 * Índice por clave: `FOTOS` tiene claves literales (`heroe`, `crema`, …) y `producto.foto` es un
 * `string`, así que sin esto el acceso por clave no tipa.
 */
const fotos: Record<string, (typeof FOTOS)[keyof typeof FOTOS]> = FOTOS;

function pedidosConComprobante() {
  return PEDIDOS.filter((pedido) => pedido.desenlace !== 'sinComprobante');
}

describe('#22 · el catálogo de demo entra en el contrato', () => {
  it('publica nueve productos y ninguno repite nombre', () => {
    expect(PRODUCTOS).toHaveLength(9);
    const nombres = PRODUCTOS.map((producto) => producto.nombre.toLowerCase());
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it('cada producto tiene los campos que el modelo exige y un precio positivo', () => {
    for (const producto of PRODUCTOS) {
      expect(producto.nombre.trim(), 'nombre').not.toBe('');
      expect(producto.categoria.trim(), producto.nombre).not.toBe('');
      expect(producto.tipo.trim(), producto.nombre).not.toBe('');
      expect(producto.descripcion.trim(), producto.nombre).not.toBe('');
      expect(producto.precio, producto.nombre).toBeGreaterThan(0);
      expect(producto.tiempoProduccion, producto.nombre).toBeGreaterThanOrEqual(0);
      expect(producto.stock.actual, producto.nombre).toBeGreaterThanOrEqual(0);
      expect(producto.stock.warning, producto.nombre).toBeGreaterThanOrEqual(0);
    }
  });

  it('la demo muestra los tres casos del stock: holgado, alerta y sin stock', () => {
    const conAlerta = PRODUCTOS.filter((p) => p.stock.actual <= p.stock.warning);
    const sinStock = PRODUCTOS.filter((p) => p.stock.actual === 0);

    expect(sinStock.map((p) => p.nombre)).toEqual(['Jabón de Glicerina y Caléndula']);
    // Dos alertas: la del producto agotado y una de umbral, para que el popup del panel tenga qué
    // mostrar sin quedar saturado.
    expect(conAlerta).toHaveLength(2);
    expect(PRODUCTOS.some((p) => p.stock.actual > p.stock.warning)).toBe(true);
  });

  it('los datos no publican vocabulario retirado', () => {
    expect(leer('scripts/demo-reglas.mjs')).not.toMatch(VOCABULARIO_RETIRADO);
  });
});

describe('#22 · una foto por slot, en el bucket que corresponde', () => {
  it('cada producto tiene una foto distinta y declarada', () => {
    const claves = PRODUCTOS.map((producto) => producto.foto);
    expect(new Set(claves).size).toBe(claves.length);
    for (const clave of claves) expect(fotos[clave], clave).toBeDefined();
  });

  it('no queda ninguna foto sin usar: las del catálogo más la del hero son todas', () => {
    const usadas = new Set([...PRODUCTOS.map((producto) => producto.foto), FOTO_DEL_HERO]);
    expect([...usadas].sort()).toEqual(Object.keys(FOTOS).sort());
  });

  it('la clave de la foto de producto cae bajo `productos/<id>/` y su URL resuelve como la publica el panel', () => {
    const clave = claveDeFotoDeProducto(7, 'Jabón de Pétalos de Rosa');
    expect(clave).toBe('productos/7/jabon-de-petalos-de-rosa.jpg');

    const base = 'https://otjphjnrwihqzzhbfnmh.supabase.co';
    // La clave ya trae el bucket como primer segmento (misma convención que `claveDelArchivo`
    // del panel), así que la URL pública lo repite. Verificado contra la base viva: el objeto
    // vive en `/object/public/productos/productos/<id>/…` y la forma con un solo bucket da 400.
    expect(urlPublicaDeFoto(base, clave)).toBe(
      `${base}/storage/v1/object/public/productos/productos/7/jabon-de-petalos-de-rosa.jpg`,
    );
    expect(urlPublicaDeFoto(`${base}/`, clave).startsWith(base)).toBe(true);
    expect(esUrlDeImagenPermitida(urlPublicaDeFoto(base, clave))).toBe(true);
    // El host ajeno que rompía la Home (#49) sigue sin poder entrar por acá.
    expect(esUrlDeImagenPermitida('https://ejemplo.com/img/crema.jpg')).toBe(false);
  });

  it('la clave del comprobante cae en el bucket privado `comprobantes/<idPedido>/`', () => {
    expect(claveDeComprobante(12)).toBe('comprobantes/12/transferencia-demo.png');
  });

  it('cada foto trae autor, licencia y página de origen', () => {
    for (const [clave, foto] of Object.entries(FOTOS)) {
      expect(foto.autor.trim(), clave).not.toBe('');
      expect(foto.licencia.trim(), clave).not.toBe('');
      expect(foto.pagina, clave).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(foto.origen, clave).toMatch(/^https:\/\/.+\.wikimedia\.org\//);
    }
  });

  it('los créditos del repo nombran cada foto con su autor y su licencia', () => {
    const creditos = leer('docs/entrega/CREDITOS-FOTOS.md');
    for (const [clave, foto] of Object.entries(FOTOS)) {
      expect(creditos, `${clave} · archivo`).toContain(foto.archivo);
      expect(creditos, `${clave} · autor`).toContain(foto.autor);
      expect(creditos, `${clave} · licencia`).toContain(foto.licencia);
    }
  });
});

describe('#22 · los Clientes y los Pedidos de demo', () => {
  it('cada Cliente tiene un DNI de 7 u 8 dígitos y un email válido y único', () => {
    expect(CLIENTES).toHaveLength(6);
    const correos = CLIENTES.map((cliente) => cliente.email.toLowerCase());
    expect(new Set(correos).size).toBe(correos.length);

    for (const cliente of CLIENTES) {
      expect(cliente.nombre.trim(), cliente.email).not.toBe('');
      expect(cliente.dni, cliente.nombre).toMatch(/^[0-9]{7,8}$/);
      expect(cliente.email, cliente.nombre).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    }
  });

  it('los correos son de `example.com`: un remito aprobado no le llega a nadie real', () => {
    for (const cliente of CLIENTES) expect(cliente.email.endsWith('@example.com')).toBe(true);
  });

  it('los seis Pedidos cubren los cuatro desenlaces del MVP más el que no subió comprobante', () => {
    const desenlaces = PEDIDOS.map((pedido) => pedido.desenlace);
    expect([...new Set(desenlaces)].sort()).toEqual([...DESENLACES].sort());
    expect(desenlaces.filter((d) => d === 'aprobado')).toHaveLength(2);
  });

  it('cada Pedido es de un Cliente distinto y pide productos que existen', () => {
    const correos = PEDIDOS.map((pedido) => pedido.cliente);
    expect(new Set(correos).size).toBe(correos.length);

    for (const pedido of PEDIDOS) {
      expect(correos, pedido.cliente).toContain(pedido.cliente);
      for (const item of pedido.items) {
        const producto = productoPorNombre(PRODUCTOS, item.producto);
        expect(producto, item.producto).toBeDefined();
        expect(item.cantidad, item.producto).toBeGreaterThan(0);
      }
    }
  });

  it('el monto que muestra el comprobante coincide con el total del Pedido', () => {
    for (const pedido of pedidosConComprobante()) {
      expect(totalDePedido(pedido, precios), pedido.cliente).toBe(pedido.montoDelComprobante);
    }
  });

  it('el Pedido sin comprobante no declara monto', () => {
    const sinComprobante = PEDIDOS.filter((pedido) => pedido.desenlace === 'sinComprobante');
    expect(sinComprobante).toHaveLength(1);
    expect(sinComprobante[0].montoDelComprobante).toBeNull();
  });

  it('la imagen de cada comprobante existe en el repo, lista para subir', () => {
    for (const pedido of pedidosConComprobante()) {
      const archivo = join(
        RAIZ,
        'supabase',
        'demo',
        'comprobantes',
        `${pedido.cliente.split('@')[0]}.png`,
      );
      expect(existsSync(archivo), archivo).toBe(true);
    }
  });

  it('la cantidad pedida no supera el stock disponible de la demo', () => {
    for (const pedido of PEDIDOS) {
      for (const item of pedido.items) {
        const producto = productoPorNombre(PRODUCTOS, item.producto);
        expect(item.cantidad, item.producto).toBeLessThanOrEqual(producto.stock.actual);
      }
    }
  });
});

describe('#22 · el orden de siembra respeta la trampa del cron', () => {
  it('los pedidos vencidos se siembran primero', () => {
    const orden = ordenDeSiembra(PEDIDOS);
    expect(orden).toHaveLength(PEDIDOS.length);

    const vencidos = orden.filter((pedido) => pedido.desenlace === 'cancelado');
    expect(vencidos).toHaveLength(1);
    // `cancelar_pedidos_vencidos()` recorre *todos* los `Pendiente de Pago`: si corriera después
    // de crear los demás, los cancelaría también.
    expect(orden[0].desenlace).toBe('cancelado');
    expect(orden.slice(1).some((pedido) => pedido.desenlace === 'cancelado')).toBe(false);
  });

  it('el orden no pierde ni inventa pedidos', () => {
    expect(new Set(ordenDeSiembra(PEDIDOS)).size).toBe(PEDIDOS.length);
  });

  it('el total sale de los precios del catálogo y no de un número escrito aparte', () => {
    const pedido = PEDIDOS[0];
    expect(totalDePedido(pedido, precios)).toBe(5000);
    expect(() => totalDePedido(pedido, new Map())).toThrow(/no está en el catálogo/);
  });
});
