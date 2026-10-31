import { describe, expect, it } from 'vitest';
import {
  TABLAS_CERRADAS,
  TABLAS_FASE_2,
  esPermisoDenegado,
  evaluarEscrituraCerrada,
  evaluarLecturaCerrada,
  evaluarRpc,
} from '../../scripts/bd-viva-reglas.mjs';
import { leer } from './ayudantes';

/**
 * HU-3 · Auditoría estricta de tablas cerradas en bd:viva (issue #53).
 *
 * Exige que las 10 tablas protegidas (incluyendo las de Fase 2: admin y roll)
 * respondan estrictamente 401 o 403 ante la anon key. Cualquier respuesta 404
 * es clasificada como violación de seguridad y falla estricta.
 */

describe('HU-3 · Reglas estrictas de bd:viva para tablas cerradas', () => {
  it('las diez tablas del contrato están listadas como cerradas', () => {
    expect(TABLAS_CERRADAS).toHaveLength(10);
    expect(TABLAS_CERRADAS).toContain('admin');
    expect(TABLAS_CERRADAS).toContain('roll');
  });

  it('un 404 en lectura cerrada devuelve ok: false para cualquier tabla', () => {
    const evaluacion = evaluarLecturaCerrada(404);
    expect(evaluacion.ok).toBe(false);
    expect(evaluacion.motivo).toMatch(/404/);
  });

  it('no existe tolerancia a tablas de Fase 2 ausentes (404 es falla)', () => {
    const evaluacion = evaluarLecturaCerrada(404);
    expect(evaluacion.ok).toBe(false);
    expect(evaluacion.motivo).toMatch(/404/);
  });

  it('sólo 401 y 403 acreditan permiso denegado en lectura', () => {
    expect(evaluarLecturaCerrada(401).ok).toBe(true);
    expect(evaluarLecturaCerrada(403).ok).toBe(true);
    expect(evaluarLecturaCerrada(200).ok).toBe(false);
    expect(evaluarLecturaCerrada(500).ok).toBe(false);
  });

  it('escritura cerrada exige 401/403 y falla ante 404 o 200', () => {
    expect(evaluarEscrituraCerrada(401).ok).toBe(true);
    expect(evaluarEscrituraCerrada(403).ok).toBe(true);
    expect(evaluarEscrituraCerrada(404).ok).toBe(false);
    expect(evaluarEscrituraCerrada(200).ok).toBe(false);
  });

  it('esPermisoDenegado sólo acepta 401 y 403', () => {
    expect(esPermisoDenegado(401)).toBe(true);
    expect(esPermisoDenegado(403)).toBe(true);
    expect(esPermisoDenegado(200)).toBe(false);
    expect(esPermisoDenegado(404)).toBe(false);
  });

  it('TABLAS_FASE_2 es una constante inmutable sin .filter() sobre listas fijas (#55)', () => {
    expect(TABLAS_FASE_2).toEqual(['admin', 'roll']);
    expect(Object.isFrozen(TABLAS_FASE_2)).toBe(true);

    const fuente = leer('scripts/bd-viva-reglas.mjs');
    expect(fuente).not.toMatch(/TABLAS_CERRADAS\.filter/);
  });

  it('evaluarRpc unifica respuestas 404 (PGRST202 y HTTP 404) sin bifurcación redundante (#55)', () => {
    expect(evaluarRpc(404, { code: 'PGRST202' })).toEqual({
      ok: false,
      motivo: 'no existe (PGRST202)',
    });
    expect(evaluarRpc(404, null)).toEqual({
      ok: false,
      motivo: 'no existe (HTTP 404)',
    });
    expect(evaluarRpc(404)).toEqual({
      ok: false,
      motivo: 'no existe (HTTP 404)',
    });

    const fuente = leer('scripts/bd-viva-reglas.mjs');
    // La función evaluarRpc no debe tener 'return resultado(false, 'no existe (PGRST202)')' duplicando la llamada return resultado
    expect(fuente).not.toMatch(/if\s*\(cuerpo\s*&&\s*cuerpo\.code\s*===\s*['"]PGRST202['"]\)\s*return resultado/);
  });
});
