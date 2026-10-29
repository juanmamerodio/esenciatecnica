import { afterEach, describe, expect, it, vi } from 'vitest';
import { leer } from './ayudantes';

/**
 * #50 · El build no puede depender de los secretos.
 *
 * `/api/notifications` armaba el cliente Supabase en el cuerpo del módulo. Con el entorno vacío
 * —como en GitHub Actions, donde no hay secretos— `createClient` tira `supabaseKey is required`
 * durante `Collecting page data`, y `npm run build` se cae: es el rojo que arrastra `main` desde
 * #39. El cliente de correo ya se armaba por llamada desde T8 (AGENTS §8); el del tablero quedó
 * atrás y ataba el build a que las claves existieran en el entorno.
 *
 * La trampa que evita: que alguien vuelva a instanciar el cliente al importar y convierta otra vez
 * cada push sin secretos en un rojo esperado.
 */

const RUTA = 'src/app/api/notifications/route.ts';

/** Las cuatro variables que el puente lee para armar su cliente. */
const CLAVES = [
  'TEAMS_SUPABASE_URL',
  'TEAMS_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

/** Entorno original del proceso: el test lo vacía y lo devuelve como estaba. */
const entornoOriginal = new Map<string, string | undefined>(CLAVES.map((clave) => [clave, process.env[clave]]));

function vaciarEntorno(): void {
  for (const clave of CLAVES) delete process.env[clave];
}

afterEach(() => {
  vaciarEntorno();
  for (const [clave, valor] of entornoOriginal) {
    if (valor !== undefined) process.env[clave] = valor;
  }
  vi.resetModules();
});

describe('#50 · el build no necesita secretos', () => {
  it('importar la ruta con el entorno vacío no tira', async () => {
    vaciarEntorno();
    vi.resetModules();

    await expect(import('../../src/app/api/notifications/route')).resolves.toBeDefined();
  });

  it('el cliente del tablero se arma por llamada, no al importar', () => {
    const fuente = leer(RUTA);

    // Un `createClient(...)` asignado en el cuerpo del módulo es exactamente el bug de #50.
    expect(fuente).not.toMatch(/^const\s+\w+\s*=\s*createClient\(/m);

    // Y existe el accesor perezoso que lo reemplaza, memoizado como el de correo.
    expect(fuente).toMatch(/let\s+\w+\s*:\s*SupabaseClient\s*\|\s*null\s*=\s*null/);
    expect(fuente).toMatch(/if\s*\(!\w+\)\s*\{?[\s\S]{0,400}createClient\(/);
  });

  it('las cuatro claves se leen adentro del accesor, no al importar', () => {
    const fuente = leer(RUTA);
    const inicio = fuente.indexOf('function tablero');
    expect(inicio, 'falta el accesor `tablero()`').toBeGreaterThan(-1);

    const antesDelAccesor = fuente.slice(0, inicio);
    for (const clave of CLAVES) {
      const menciones = fuente.split(clave).length - 1;
      expect(menciones, `${clave} debería leerse una sola vez, dentro del accesor`).toBe(1);
      expect(antesDelAccesor, `${clave} todavía se lee al importar`).not.toContain(clave);
    }
  });
});
