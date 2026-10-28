import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RAIZ, archivosFuente, leer } from './ayudantes';

/**
 * T6 · Página institucional (issue #12) — decisiones G3 (nombre/ruta) y G1 (franja de valores).
 *
 * La tajada no toca datos: lo observable es el contenido. Se verifica el vocabulario del
 * dominio (cosmética e higiene, no insumos de laboratorio), las tres piezas de “cómo se
 * compra”, el contacto aprobado y —lo que más fácil se rompe— que la franja de valores viva
 * en un solo lugar.
 */

const ABOUT = 'src/app/about/page.tsx';
const HOME = 'src/app/page.tsx';

/** Palabras que el glosario retira: el Producto no es un insumo de laboratorio. */
const VOCABULARIO_RETIRADO = /reactivo|insumo|\bpH\b|compuestos clínicos|Gemini|\bIA\b|inteligencia artificial|laboratorio/i;

const VALORES = ['Ciencia Aplicada', 'Sin Fines de Lucro', 'Formación Técnica'];

describe('T6 · qué es el proyecto', () => {
  const about = leer(ABOUT);

  it('habla de cosmética e higiene de la escuela', () => {
    expect(about).toMatch(/cosmética e higiene/i);
    expect(about).toMatch(/Departamento de Química/);
    expect(about).toMatch(/7mo año/);
    expect(about).toMatch(/E\.E\.S\.T N°1 Luciano Reyes/);
    expect(about).toMatch(/Ciclo Lectivo 2026/);
  });

  it('no quedó vocabulario de laboratorio ni de IA', () => {
    expect(about).not.toMatch(VOCABULARIO_RETIRADO);
  });
});

describe('T6 · cómo se compra', () => {
  const about = leer(ABOUT);

  it('explica la validación manual del pago', () => {
    expect(about).toMatch(/Administrador(es)? de Química/);
    expect(about).toMatch(/a mano/i);
    expect(about).toMatch(/transferencia/i);
  });

  it('comunica el plazo de la reserva sin prometer envío', () => {
    expect(about).toMatch(/viernes/i);
    expect(about).not.toMatch(/enviamos|llega en|entrega en \d|seguimiento del pedido|En Preparación|Enviado|Entregado/i);
  });
});

describe('T6 · la franja de valores vive en un solo lugar', () => {
  it('está en la página institucional', () => {
    const about = leer(ABOUT);
    for (const valor of VALORES) expect(about).toContain(valor);
  });

  it('no se repite en la Home', () => {
    const home = leer(HOME);
    for (const valor of VALORES) expect(home).not.toContain(valor);
  });

  it('el bloque de pago de la Home habla del pago y la reserva, no de los valores', () => {
    const home = leer(HOME);
    expect(home).toMatch(/Administrador de Química/);
    expect(home).toMatch(/reserva|reserv/i);
  });
});

describe('T6 · contacto y estructura', () => {
  const about = leer(ABOUT);

  it('usa el contacto institucional aprobado en G1', () => {
    expect(about).toContain('proyectos@esenciatecnica.edu.ar');
    expect(about).toMatch(/Campana, Buenos Aires/);
  });

  it('tiene un solo h1 y no vuelve a montar la navegación', () => {
    expect(about.match(/<h1\b/g)?.length).toBe(1);
    expect(about).not.toMatch(/from\s+["']@\/components\/(Header|Footer)["']/);
    expect(about).toMatch(/grid-cols-1/);
  });
});

describe('#43 · la marca y el producto dejan de ser un vaso de laboratorio', () => {
  const COPY_CIENCIA_APLICADA =
    'Cada fórmula la elabora el Departamento de Química de la escuela y se convierte en un producto de cosmética o higiene listo para usar.';

  it('ningún archivo de `src/` importa el ícono retirado', () => {
    const ofensores = archivosFuente(join(RAIZ, 'src'))
      .filter((archivo) => /FlaskConical/.test(readFileSync(archivo, 'utf8')))
      .map((archivo) => relative(RAIZ, archivo).replace(/\\/g, '/'));

    expect(ofensores).toEqual([]);
  });

  it('/about no dice «laboratorio» ni siquiera en un comentario', () => {
    expect(leer(ABOUT)).not.toMatch(/laboratorio/i);
  });

  it('el header y el footer muestran la misma marca', () => {
    const header = leer('src/components/Header.tsx');
    const footer = leer('src/components/Footer.tsx');

    expect(header).toMatch(/<Sparkles aria-hidden/);
    expect(footer).toMatch(/<Sparkles aria-hidden/);
  });

  it('el placeholder de producto sin imagen usa el ícono de cosmética y conserva su contrato', () => {
    const imagen = leer('src/components/ImagenProducto.tsx');

    expect(imagen).toMatch(/<Droplets aria-hidden/);
    // El texto alternativo y el manejo de error del estado «sin imagen» no cambian.
    expect(imagen).toMatch(/role="img"/);
    expect(imagen).toMatch(/aria-label=\{`\$\{nombre\} — sin foto, categoría \$\{categoria\}`\}/);
    expect(imagen).toMatch(/onError/);
  });

  it('el valor «Ciencia Aplicada» sigue presente con el copy nuevo', () => {
    const about = leer(ABOUT).replace(/\s+/g, ' ');

    expect(about).toContain('Ciencia Aplicada');
    expect(about).toContain(COPY_CIENCIA_APLICADA);
    expect(about).toMatch(/Droplets/);
  });

  it('los íconos decorativos del shell siguen con `aria-hidden`', () => {
    for (const archivo of ['src/components/Header.tsx', 'src/components/Footer.tsx', 'src/components/ImagenProducto.tsx']) {
      const fuente = leer(archivo);
      const iconos = [...fuente.matchAll(/<(Sparkles|Droplets)\b([^>]*)>/g)];
      expect(iconos.length, archivo).toBeGreaterThan(0);
      for (const icono of iconos) expect(icono[2], archivo).toMatch(/aria-hidden/);
    }
  });
});
