import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RAIZ } from './ayudantes';

/**
 * HU-15 · Diagramas de Flujo de Datos (DFD) corregidos para cátedra (Ariel).
 *
 * Exige que `docs/academico/DFD.md` documente los 4 niveles (0, 1, 2 y 3) en formato
 * Mermaid (`flowchart TD` o `flowchart LR`), incorpore los almacenes canónicos D1–D7
 * del modelo formal (`docs/MODELO.md`), refleje las transacciones reales del sistema y
 * elimine todos los términos y conceptos legacy observados en los borradores CSV.
 */
const RUTA_DFD = join(RAIZ, 'docs', 'academico', 'DFD.md');

function leerDFD(): string {
  return readFileSync(RUTA_DFD, 'utf8');
}

/** Extrae todos los bloques de código ```mermaid del documento. */
function bloquesMermaid(contenido: string): string[] {
  const matches = contenido.matchAll(/```mermaid\s*\n([\s\S]*?)\n```/g);
  return [...matches].map((m) => m[1].trim());
}

describe('HU-15 · DFD Académico (Niveles 0, 1, 2 y 3 en Mermaid)', () => {
  it('el archivo docs/academico/DFD.md existe', () => {
    expect(existsSync(RUTA_DFD)).toBe(true);
  });

  it('contiene los cuatro niveles canónicos (0, 1, 2 y 3) con bloques Mermaid válidos', () => {
    const doc = leerDFD();
    expect(doc).toMatch(/##\s+.*Nivel\s+0/i);
    expect(doc).toMatch(/##\s+.*Nivel\s+1/i);
    expect(doc).toMatch(/##\s+.*Nivel\s+2/i);
    expect(doc).toMatch(/##\s+.*Nivel\s+3/i);

    const bloques = bloquesMermaid(doc);
    expect(bloques.length).toBeGreaterThanOrEqual(4);
    for (const bloque of bloques) {
      expect(bloque).toMatch(/^(flowchart|graph)\s+(TD|LR|TB|RL)/);
    }
  });

  it('incorpora los almacenes canónicos D1 a D7 alineados con docs/MODELO.md', () => {
    const doc = leerDFD();
    expect(doc).toMatch(/D1[:\s\-_|]+CLIENTE/i);
    expect(doc).toMatch(/D2[:\s\-_|]+PRODUCTO/i);
    expect(doc).toMatch(/D3[:\s\-_|]+STOCK/i);
    expect(doc).toMatch(/D4[:\s\-_|]+PEDIDO/i);
    expect(doc).toMatch(/D5[:\s\-_|]+COMPROBANTE/i);
    expect(doc).toMatch(/D6[:\s\-_|]+REMITO/i);
    expect(doc).toMatch(/D7[:\s\-_|]+ALERTA/i);
  });

  it('aclara explícitamente que el carrito es del cliente y no un almacén de base de datos', () => {
    const doc = leerDFD();
    expect(doc).toMatch(/carrito/i);
    expect(doc).toMatch(/cliente|localStorage|cookie/i);
    // No debe haber almacén D... para carrito
    expect(doc).not.toMatch(/D\d[:\s\-_|]+CARRITO/i);
    expect(doc).not.toMatch(/\[\(.*carrito.*\)\]/i);
  });

  it('el Nivel 0 (Diagrama de Contexto) no contiene almacenes internos según la regla de DFD', () => {
    const doc = leerDFD();
    const seccionNivel0 = doc.split(/##\s+.*Nivel\s+1/i)[0];
    const bloque0 = bloquesMermaid(seccionNivel0)[0];
    expect(bloque0).toBeDefined();
    // En Nivel 0 no hay almacenes de datos [( ... )]
    expect(bloque0).not.toMatch(/\[\(.*?\)\]/);
    expect(bloque0).not.toMatch(/\bD[1-7]\b/);
    // Debe contener las entidades externas Cliente, Administrador y el Proceso del Sistema
    expect(bloque0).toMatch(/Cliente/i);
    expect(bloque0).toMatch(/Admin|Administrador/i);
    expect(bloque0).toMatch(/Esencia\s+T[ée]cnica/i);
  });

  it('corrige las observaciones docentes de Ariel (reserva, alertas, cron de los viernes)', () => {
    const doc = leerDFD();
    // 1. Cron de los viernes 23:59 ART / cancelar pedidos vencidos
    expect(doc).toMatch(/viernes.*23:59/i);
    expect(doc).toMatch(/cancelar_pedidos_vencidos|pedidos?\s+vencidos?/i);

    // 2. Liberación de reserva (no incremento semanal erróneo)
    expect(doc).toMatch(/libera(r|ci[óo]n)?\s+(de\s+)?(la\s+)?reserva|cantidad_reservada/i);

    // 3. Alertas de stock en panel / popup (sin email al admin)
    expect(doc).toMatch(/panel|popup/i);
    expect(doc).not.toMatch(/email.*alerta.*admin|alerta.*enviar.*correo/i);

    // 4. No hay temporizador de 24 horas del borrador viejo
    expect(doc).not.toMatch(/temporizador.*24\s*h/i);
  });

  it('no contiene términos ni entidades legacy retirados', () => {
    const doc = leerDFD();
    expect(doc).not.toMatch(/\bdetalle_carrito\b/i);
    expect(doc).not.toMatch(/\bverificaciones\b/i);
    expect(doc).not.toMatch(/\bpre_aprobado\b/i);
    expect(doc).not.toMatch(/\bcomprobante_subido\b/);
    expect(doc).not.toMatch(/\blog_ia\b/i);
    expect(doc).not.toMatch(/\bGemini\b/i);
    expect(doc).not.toMatch(/\bQuimicaShop\b/i);
    // El almacén canónico es D4: PEDIDO, no almacén pedidos
    expect(doc).not.toMatch(/\[\(.*almac[ée]n\s+pedidos.*\)\]/i);
    expect(doc).not.toMatch(/\[\(.*D\d[:\s]+pedidos.*\)\]/i);
  });
});
