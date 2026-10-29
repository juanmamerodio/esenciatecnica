/**
 * Reglas de la papelera del tablero de Teams.
 *
 * El puente `npm run teams` las usa; el test las fija sin red. Una tarea se mueve a la
 * papelera cuando está `done` y su fecha de cierre —o, si es legacy, su última
 * modificación— es anterior al corte. La comparación es estricta: «más de N horas».
 */

/** Instante de corte: ahora menos las horas pedidas. */
export function corteDePapelera({ horas = 24, ahora = new Date() } = {}) {
  if (!Number.isFinite(horas) || horas <= 0) throw new Error(`Horas inválidas: ${horas}`);
  return new Date(ahora.getTime() - horas * 60 * 60 * 1000);
}

/** Fecha de cierre de una tarea; `completed_at` manda y `updated_at` cubre las legacy. */
export function fechaDeCierre(tarea) {
  const fecha = tarea.completed_at ?? tarea.updated_at;
  if (!fecha) return null;
  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime()) ? null : valor;
}

/** Las tareas `done` cerradas antes del corte. No muta la lista. */
export function tareasParaPapelera(tareas, { horas = 24, ahora = new Date() } = {}) {
  const corte = corteDePapelera({ horas, ahora });
  return tareas.filter((tarea) => {
    if (tarea.status !== 'done') return false;
    const fecha = fechaDeCierre(tarea);
    return fecha !== null && fecha < corte;
  });
}
