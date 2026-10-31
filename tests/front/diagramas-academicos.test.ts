import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RAIZ } from './ayudantes';

/**
 * HU-1 a HU-5: Formalización de Diagramas Académicos (Mermaid) y Actualización del Hub.
 *
 * Valida:
 * - HU-1 (Nieva): Diagrama de Clases UML con entidades canónicas y servicios de dominio.
 * - HU-2 (Celeste): Diagrama de Casos de Uso (DCU) con validación manual y sin IA.
 * - DER actualizado formalizado en docs/academico/DER.md.
 * - HU-3 a HU-5: quimicashop/index.html sin enlaces obsoletos a quimicashop.vercel.app,
 *   sin términos legacy en tarjetas, con tarjeta de Clases UML y con el hito Cierre Beta.
 */

const RUTA_CLASES = join(RAIZ, 'docs', 'academico', 'CLASES.md');
const RUTA_DCU = join(RAIZ, 'docs', 'academico', 'DCU.md');
const RUTA_DER = join(RAIZ, 'docs', 'academico', 'DER.md');
const RUTA_HUB_HTML = join(RAIZ, '..', 'quimicashop', 'index.html');

function extraerBloquesMermaid(contenido: string): string[] {
  const matches = contenido.matchAll(/```mermaid\s*\n([\s\S]*?)\n```/g);
  return [...matches].map((m) => m[1].trim());
}

describe('HU-1 (Nieva) · Diagrama de Clases UML (docs/academico/CLASES.md)', () => {
  it('el archivo docs/academico/CLASES.md existe', () => {
    expect(existsSync(RUTA_CLASES)).toBe(true);
  });

  it('contiene un bloque classDiagram de Mermaid válido', () => {
    const doc = readFileSync(RUTA_CLASES, 'utf8');
    const bloques = extraerBloquesMermaid(doc);
    expect(bloques.length).toBeGreaterThanOrEqual(1);
    expect(bloques.some((b) => /^classDiagram\b/.test(b))).toBe(true);
  });

  it('modela las entidades canónicas del dominio con sus atributos y métodos', () => {
    const doc = readFileSync(RUTA_CLASES, 'utf8');
    // Entidades canónicas
    expect(doc).toMatch(/class\s+Cliente\b/);
    expect(doc).toMatch(/class\s+Producto\b/);
    expect(doc).toMatch(/class\s+Stock\b/);
    expect(doc).toMatch(/class\s+Pedido\b/);
    expect(doc).toMatch(/class\s+DetallePedido\b/);
    expect(doc).toMatch(/class\s+EstadoPedido\b/);
    expect(doc).toMatch(/class\s+Comprobante\b/);
    expect(doc).toMatch(/class\s+EstadoComprobante\b/);
    expect(doc).toMatch(/class\s+RemitoVenta\b/);
    expect(doc).toMatch(/class\s+AlertaStock\b/);

    // Métodos de comportamiento de dominio
    expect(doc).toMatch(/calcularDisponible\(/);
    expect(doc).toMatch(/reservar\(/);
    expect(doc).toMatch(/descontarVenta\(/);
    expect(doc).toMatch(/liberarReserva\(/);
    expect(doc).toMatch(/coincideConTotal\(/);
  });

  it('incorpora los servicios de dominio de la arquitectura del sistema', () => {
    const doc = readFileSync(RUTA_CLASES, 'utf8');
    expect(doc).toMatch(/class\s+ServicioCheckout\b/);
    expect(doc).toMatch(/class\s+ServicioCatalogo\b/);
    expect(doc).toMatch(/class\s+ServicioAdmin\b/);
    expect(doc).toMatch(/class\s+ServicioRemito\b/);
    expect(doc).toMatch(/class\s+ServicioCron\b/);
    expect(doc).toMatch(/class\s+ServicioStorage\b/);

    // Métodos clave de los servicios
    expect(doc).toMatch(/crearPedido\(/);
    expect(doc).toMatch(/aprobarComprobante\(/);
    expect(doc).toMatch(/rechazarComprobante\(/);
    expect(doc).toMatch(/cancelarPedidosVencidos\(/);
    expect(doc).toMatch(/generarRemito\(/);
  });

  it('no contiene entidades ni vocabulario legacy prohibido', () => {
    const doc = readFileSync(RUTA_CLASES, 'utf8');
    expect(doc).not.toMatch(/\bverificaciones\b/i);
    expect(doc).not.toMatch(/\bpre_aprobado\b/i);
    expect(doc).not.toMatch(/\bcomprobante_subido\b/);
    expect(doc).not.toMatch(/\blog_ia\b/i);
    expect(doc).not.toMatch(/\bGemini\b/i);
    expect(doc).not.toMatch(/\bQuimicaShop\b/i);
    expect(doc).not.toMatch(/\bclass\s+Roll\b/i);
  });
});

describe('HU-2 (Celeste) · Diagrama de Casos de Uso (docs/academico/DCU.md)', () => {
  it('el archivo docs/academico/DCU.md existe', () => {
    expect(existsSync(RUTA_DCU)).toBe(true);
  });

  it('contiene un bloque Mermaid válido para casos de uso (flowchart)', () => {
    const doc = readFileSync(RUTA_DCU, 'utf8');
    const bloques = extraerBloquesMermaid(doc);
    expect(bloques.length).toBeGreaterThanOrEqual(1);
    expect(bloques.some((b) => /^(flowchart|graph)\s+(LR|TD|TB|RL)\b/.test(b))).toBe(true);
  });

  it('define los actores principales del sistema incluyendo el temporizador del cron', () => {
    const doc = readFileSync(RUTA_DCU, 'utf8');
    expect(doc).toMatch(/Cliente/i);
    expect(doc).toMatch(/Admin|Administrador/i);
    expect(doc).toMatch(/Cron|Temporizador/i);
  });

  it('especifica validación manual sin IA y relaciones include / extend', () => {
    const doc = readFileSync(RUTA_DCU, 'utf8');
    expect(doc).toMatch(/validaci[óo]n\s+manual/i);
    expect(doc).toMatch(/sin\s+IA/i);
    expect(doc).toMatch(/<<include>>|<<extend>>|include|extend/i);
    expect(doc).not.toMatch(/validaci[óo]n\s+(por\s+|autom[áa]tica\s+por\s+)?IA\b/i);
  });

  it('no contiene términos legacy prohibidos', () => {
    const doc = readFileSync(RUTA_DCU, 'utf8');
    expect(doc).not.toMatch(/\bverificaciones\b/i);
    expect(doc).not.toMatch(/\bpre_aprobado\b/i);
    expect(doc).not.toMatch(/\bcomprobante_subido\b/);
    expect(doc).not.toMatch(/\blog_ia\b/i);
    expect(doc).not.toMatch(/\bGemini\b/i);
    expect(doc).not.toMatch(/\bQuimicaShop\b/i);
  });
});

describe('DER Actualizado (docs/academico/DER.md)', () => {
  it('el archivo docs/academico/DER.md existe', () => {
    expect(existsSync(RUTA_DER)).toBe(true);
  });

  it('contiene un bloque erDiagram de Mermaid válido con las 10 entidades canónicas', () => {
    const doc = readFileSync(RUTA_DER, 'utf8');
    const bloques = extraerBloquesMermaid(doc);
    expect(bloques.length).toBeGreaterThanOrEqual(1);
    const erBlock = bloques.find((b) => /^erDiagram\b/.test(b));
    expect(erBlock).toBeDefined();

    expect(erBlock).toMatch(/\bCLIENTE\b/);
    expect(erBlock).toMatch(/\bPRODUCTO\b/);
    expect(erBlock).toMatch(/\bSTOCK\b/);
    expect(erBlock).toMatch(/\bPEDIDO\b/);
    expect(erBlock).toMatch(/\bDETALLE_PEDIDO\b/);
    expect(erBlock).toMatch(/\bESTADO_PEDIDO\b/);
    expect(erBlock).toMatch(/\bCOMPROBANTE\b/);
    expect(erBlock).toMatch(/\bESTADO_COMPROBANTE\b/);
    expect(erBlock).toMatch(/\bREMITO_VENTA\b/);
    expect(erBlock).toMatch(/\bALERTA_STOCK\b/);
  });

  it('aclara la frontera del MVP y las entidades pospuestas a Fase 2', () => {
    const doc = readFileSync(RUTA_DER, 'utf8');
    expect(doc).toMatch(/Fase\s+2/i);
    expect(doc).toMatch(/CARRITO/);
    expect(doc).toMatch(/ADMIN|ROL/);
  });

  it('no contiene términos legacy prohibidos', () => {
    const doc = readFileSync(RUTA_DER, 'utf8');
    expect(doc).not.toMatch(/\bverificaciones\b/i);
    expect(doc).not.toMatch(/\bpre_aprobado\b/i);
    expect(doc).not.toMatch(/\bcomprobante_subido\b/);
    expect(doc).not.toMatch(/\blog_ia\b/i);
    expect(doc).not.toMatch(/\bGemini\b/i);
    expect(doc).not.toMatch(/\bQuimicaShop\b/i);
  });
});

describe('HU-3, HU-4, HU-5 · Hub (quimicashop/index.html)', () => {
  it('si quimicashop/index.html existe, cumple con las 5 historias de usuario', () => {
    if (!existsSync(RUTA_HUB_HTML)) {
      // Si el repositorio no está clonado al lado (ej. en un runner aislado), se omite
      return;
    }

    const html = readFileSync(RUTA_HUB_HTML, 'utf8');

    // HU-3: Enlace a esenciatecnica.vercel.app en lugar del dominio heredado
    expect(html).toMatch(/https:\/\/esenciatecnica\.vercel\.app/);
    expect(html).toMatch(/esenciatecnica\.vercel\.app<\/span>/);
    expect(html).not.toMatch(/href="https:\/\/quimicashop\.vercel\.app"/);

    // HU-4: Purgado de vocabulario legacy en las tarjetas
    // En la tarjeta de DER no deben figurar las tablas legacy productos, pedidos, verificaciones
    expect(html).not.toMatch(/<code>productos<\/code>,\s*<code>pedidos<\/code>\s*y\s*<code>verificaciones<\/code>/);
    // En la tarjeta de DCU no debe decir validación IA
    expect(html).not.toMatch(/validaci[óo]n\s+IA\s+de\s+comprobantes/i);
    expect(html).toMatch(/validaci[óo]n\s+manual/i);

    // HU-1: Tarjeta o referencia al Diagrama de Clases UML
    expect(html).toMatch(/id="clases-uml"|Diagrama de Clases UML/i);

    // HU-5: Registro del hito Cierre Beta en la Timeline
    expect(html).toMatch(/Cierre Beta/i);
    expect(html).toMatch(/479\s+tests/i);
    expect(html).toMatch(/DDL\s+00.*06/i);
  });
});
