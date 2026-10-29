import { describe, expect, it } from 'vitest';
import {
  corteDePapelera,
  fechaDeCierre,
  tareasParaPapelera,
} from '../../scripts/teams-papelera-reglas.mjs';

const AHORA = new Date('2026-10-29T00:00:00.000Z');

/** Tarea mínima: el test fija la selección, no el contrato completo del tablero. */
function tarea(extra: Record<string, unknown> = {}) {
  return {
    title: 'tarea',
    status: 'done',
    completed_at: null as string | null,
    updated_at: null as string | null,
    ...extra,
  };
}

describe('la papelera del tablero', () => {
  it('sólo se lleva las tareas done cerradas hace más de 24 h', () => {
    const tareas = [
      tarea({ title: 'vieja', completed_at: '2026-10-27T00:00:00.000Z' }),
      tarea({ title: 'reciente', completed_at: '2026-10-28T12:00:00.000Z' }),
      tarea({ title: 'abierta', status: 'backlog', completed_at: '2026-10-01T00:00:00.000Z' }),
      tarea({ title: 'sin fecha' }),
    ];

    expect(tareasParaPapelera(tareas, { ahora: AHORA }).map((t: { title: string }) => t.title)).toEqual(['vieja']);
  });

  it('usa updated_at cuando completed_at falta (legacy)', () => {
    const tareas = [tarea({ title: 'legacy', updated_at: '2026-10-26T00:00:00.000Z' })];

    expect(tareasParaPapelera(tareas, { ahora: AHORA }).map((t: { title: string }) => t.title)).toEqual(['legacy']);
  });

  it('el corte es estricto: exactamente 24 h no entra', () => {
    const tareas = [tarea({ title: 'borde', completed_at: '2026-10-28T00:00:00.000Z' })];

    expect(tareasParaPapelera(tareas, { ahora: AHORA })).toEqual([]);
  });

  it('acepta un corte distinto', () => {
    const tareas = [tarea({ title: 'una-hora', completed_at: '2026-10-28T23:00:00.000Z' })];

    expect(tareasParaPapelera(tareas, { horas: 0.5, ahora: AHORA }).map((t: { title: string }) => t.title)).toEqual([
      'una-hora',
    ]);
  });

  it('una fecha inválida no se lleva la tarea', () => {
    const rota = tarea({ title: 'rota', completed_at: 'no-es-fecha' });

    expect(fechaDeCierre(rota)).toBeNull();
    expect(tareasParaPapelera([rota], { ahora: AHORA })).toEqual([]);
  });

  it('rechaza horas inválidas', () => {
    expect(() => corteDePapelera({ horas: 0, ahora: AHORA })).toThrow();
    expect(() => corteDePapelera({ horas: -1, ahora: AHORA })).toThrow();
  });
});
