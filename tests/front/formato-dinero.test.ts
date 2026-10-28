import { describe, expect, it } from 'vitest';
import { formatPrice, redondearACentavos } from '../../src/lib/format';
import {
  agregar,
  subtotalDeLinea,
  totalDelPedido,
  type ItemCarrito,
  type ProductoParaAgregar,
} from '../../src/lib/carrito';
import { componerRemito } from '../../src/lib/remito';
import { leer } from './ayudantes';

/**
 * `formato-del-dinero` · issue #44 — seam: los módulos puros del dinero
 * (`src/lib/format.ts` y `src/lib/carrito.ts`).
 *
 * La regla es una sola: el subtotal se redondea a centavos, el total suma subtotales ya
 * redondeados y el formato muestra un entero sin decimales y un monto con centavos con dos
 * decimales exactos. El monto que se muestra es el que viaja al pedido.
 *
 * El `Intl` de `es-AR` separa el símbolo del número con un espacio duro (U+00A0) y los tests fijan
 * la salida completa a propósito: el formato es criterio de aceptación del issue #44. Si el ICU de
 * Node cambia, el test falla y se actualiza con el criterio nuevo.
 */

const PESOS = (monto: string) => `$\u00a0${monto}`;

const CON_CENTAVOS: ProductoParaAgregar = {
  id: 1,
  nombre: 'Crema Hidratante Facial',
  precio: 1000.55,
  disponible: 10,
};

function carrito(...lineas: Array<[ProductoParaAgregar, number]>): ItemCarrito[] {
  return lineas.reduce<ItemCarrito[]>(
    (items, [producto, cantidad]) => agregar(items, producto, cantidad),
    [],
  );
}

describe('formato-del-dinero · formatPrice', () => {
  it('un monto entero se muestra sin decimales', () => {
    expect(formatPrice(3000)).toBe(PESOS('3.000'));
    expect(formatPrice(0)).toBe(PESOS('0'));
  });

  it('un monto con centavos se muestra con dos decimales exactos', () => {
    expect(formatPrice(4.5)).toBe(PESOS('4,50'));
    expect(formatPrice(4.05)).toBe(PESOS('4,05'));
    expect(formatPrice(3001.65)).toBe(PESOS('3.001,65'));
  });

  it('formatea el monto que la aritmética ya redondeó, sin cambiarlo', () => {
    expect(formatPrice(redondearACentavos(3001.999))).toBe(PESOS('3.002'));
    expect(formatPrice(redondearACentavos(4.5))).toBe(PESOS('4,50'));
  });

  it('no esconde los centavos de un monto que no está redondeado', () => {
    // La vista no decide el valor: si llega un monto fuera de contrato, muestra sus dos decimales
    // en vez de recortarlo a un entero. El defecto del ticket era exactamente eso.
    expect(formatPrice(3001.999)).not.toBe(PESOS('3.002'));
    expect(formatPrice(3001.999)).toBe(PESOS('3.002,00'));
  });
});

describe('formato-del-dinero · redondeo y subtotales', () => {
  it('redondea a centavos sin arrastrar el error del punto flotante', () => {
    expect(redondearACentavos(0.1 * 3)).toBe(0.3);
    expect(redondearACentavos(1000.55 * 3)).toBe(3001.65);
    expect(redondearACentavos(1.005)).toBe(1.01);
  });

  it('el subtotal de una línea es precio por cantidad, redondeado a centavos', () => {
    expect(subtotalDeLinea(0.1, 3)).toBe(0.3);
    expect(subtotalDeLinea(1000.55, 3)).toBe(3001.65);
    expect(subtotalDeLinea(2500, 2)).toBe(5000);
  });

  it('el total suma los subtotales ya redondeados, no los productos crudos', () => {
    // Montos fuera del modelo (`NUMERIC(12,2)`): prueban el orden de la suma, no un precio real.
    const items: ItemCarrito[] = [
      { id: 1, nombre: 'Crema', precio: 0.005, cantidad: 1, disponible: 1 },
      { id: 2, nombre: 'Jabón', precio: 0.005, cantidad: 1, disponible: 1 },
    ];

    expect(subtotalDeLinea(0.005, 1)).toBe(0.01);
    expect(totalDelPedido(items)).toBe(0.02);
    // Redondear la suma cruda daría 0.01: el total tiene que sumar subtotales redondeados.
    expect(redondearACentavos(0.005 * 1 + 0.005 * 1)).toBe(0.01);
  });

  it('el total con centavos cierra línea por línea', () => {
    const items = carrito([CON_CENTAVOS, 3], [{ ...CON_CENTAVOS, id: 2, precio: 2500 }, 2]);

    expect(subtotalDeLinea(1000.55, 3)).toBe(3001.65);
    expect(subtotalDeLinea(2500, 2)).toBe(5000);
    expect(totalDelPedido(items)).toBe(8001.65);
    expect(formatPrice(totalDelPedido(items))).toBe(PESOS('8.001,65'));
  });
});

describe('formato-del-dinero · el mismo número en todas las pantallas', () => {
  it('el total del carrito es el número que el checkout precarga para transferir', () => {
    const total = totalDelPedido(carrito([CON_CENTAVOS, 3]));

    // El checkout precarga el monto con `total.toFixed(2)` y lo envía como número.
    expect(total).toBe(3001.65);
    expect(total.toFixed(2)).toBe('3001.65');
    expect(Number(total.toFixed(2))).toBe(total);
  });

  it('el remito compone el mismo total con centavos', () => {
    const remito = componerRemito({
      numero: 'R-0001',
      fecha: '2026-10-28',
      total: 3001.65,
      cliente: { nombre: 'Ana Pérez', email: 'ana@example.com' },
      items: [{ nombre: 'Crema Hidratante Facial', cantidad: 3, precioUnitario: 1000.55, subtotal: 3001.65 }],
    });

    expect(remito.texto).toContain(`Total: ${PESOS('3.001,65')}`);
    expect(remito.html).toContain(PESOS('3.001,65'));
    expect(remito.texto).not.toContain(PESOS('3.002'));
  });

  it('el carrito y el checkout no multiplican a mano: usan la regla del módulo', () => {
    const carritoPintado = leer('src/components/Carrito.tsx');
    const checkout = leer('src/app/checkout/page.tsx');
    const producto = /(?:precio\s*\*\s*\w*cantidad|cantidad\s*\*\s*\w*precio)/;

    for (const fuente of [carritoPintado, checkout]) {
      expect(fuente).toMatch(/subtotalDeLinea/);
      expect(fuente).not.toMatch(producto);
    }
  });

  it('el panel no formatea el dinero por su cuenta', () => {
    expect(leer('src/components/admin/PanelDePedidos.tsx')).toMatch(/formatPrice/);
    expect(leer('src/components/admin/PanelDePedidos.tsx')).not.toMatch(/Intl\.NumberFormat/);
  });
});
