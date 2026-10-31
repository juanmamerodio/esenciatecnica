import { describe, expect, it } from 'vitest';
import { redondearACentavos, subtotalDeLinea, totalDelPedido } from '../../src/lib/dinero';
import { leer } from './ayudantes';

/**
 * Dominio monetario — Issue #55: desacoplar la lógica aritmética y de operaciones
 * monetarias en `src/lib/dinero.ts` de la capa de presentación (`src/lib/format.ts`).
 */

describe('dominio monetario · src/lib/dinero.ts', () => {
  it('redondea a centavos sin arrastrar el error del punto flotante', () => {
    expect(redondearACentavos(0.1 * 3)).toBe(0.3);
    expect(redondearACentavos(1000.55 * 3)).toBe(3001.65);
    expect(redondearACentavos(1.005)).toBe(1.01);
    expect(redondearACentavos(0)).toBe(0);
    expect(redondearACentavos(-4.505)).toBe(-4.5);
  });

  it('el subtotal de una línea es precio por cantidad, redondeado a centavos', () => {
    expect(subtotalDeLinea(0.1, 3)).toBe(0.3);
    expect(subtotalDeLinea(1000.55, 3)).toBe(3001.65);
    expect(subtotalDeLinea(2500, 2)).toBe(5000);
    expect(subtotalDeLinea(0.005, 1)).toBe(0.01);
  });

  it('el total del pedido suma los subtotales ya redondeados línea por línea', () => {
    const lineas = [
      { precio: 0.005, cantidad: 1 },
      { precio: 0.005, cantidad: 1 },
    ];
    // Cada línea redondeada a centavos da 0.01; la suma de subtotales es 0.02
    expect(totalDelPedido(lineas)).toBe(0.02);
  });

  it('el total del pedido de una lista vacía es 0', () => {
    expect(totalDelPedido([])).toBe(0);
  });

  it('el total del pedido funciona con items complejos que tienen propiedades extra', () => {
    const items = [
      { id: 1, nombre: 'Crema', precio: 1000.55, cantidad: 3, disponible: 10 },
      { id: 2, nombre: 'Jabón', precio: 2500, cantidad: 2, disponible: 5 },
    ];
    expect(totalDelPedido(items)).toBe(8001.65);
  });

  it('src/lib/format.ts preserva únicamente formato visual y no exporta aritmética', () => {
    const fuenteFormat = leer('src/lib/format.ts');
    expect(fuenteFormat).toMatch(/export function formatPrice/);
    expect(fuenteFormat).not.toMatch(/export function redondearACentavos/);
    expect(fuenteFormat).not.toMatch(/export function subtotalDeLinea/);
    expect(fuenteFormat).not.toMatch(/export function totalDelPedido/);
  });

  it('src/lib/dinero.ts es un módulo puro sin dependencias de UI ni Intl', () => {
    const fuenteDinero = leer('src/lib/dinero.ts');
    expect(fuenteDinero).not.toMatch(/Intl\.NumberFormat/);
    expect(fuenteDinero).not.toMatch(/formatPrice/);
    expect(fuenteDinero).not.toMatch(/react/i);
  });
});
