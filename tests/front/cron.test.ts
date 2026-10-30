import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET, POST } from '../../src/app/api/cron/vencidos/route';
import { revisarCron } from '../../src/lib/cron-auth';
import { manejarCron, type PuertoCron } from '../../src/lib/cron';
import { FaltaConfiguracion } from '../../src/lib/errores-bd';
import { puertoCronServidor, puertoSobre } from '../../src/lib/cron-servidor';
import { RAIZ, leer } from './ayudantes';

/**
 * B4 · cron de vencidos (issue #18).
 *
 * El scheduler de Vercel se verifica a mano una vez; lo que sí se testea es la decisión de
 * autorización (`cron-auth`), el manejador con un puerto falso y que el cron quede versionado
 * con el horario correcto. La idempotencia de la RPC vive en `tests/db/aprobacion.test.ts`.
 */

const SECRETO = 'secreto-del-cron';

function peticion(encabezado?: string): Request {
  return new Request('http://localhost/api/cron/vencidos', {
    method: 'POST',
    headers: encabezado ? { authorization: encabezado } : {},
  });
}

function puertoFalso(
  opciones: {
    falla?: boolean;
    faltaConfiguracion?: boolean;
    cancelados?: number;
  } = {},
) {
  const llamadas: number[] = [];
  const puerto: PuertoCron = {
    async cancelarVencidos() {
      llamadas.push(1);
      if (opciones.faltaConfiguracion) {
        throw new FaltaConfiguracion(
          'Falta SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_URL): el cron no puede cancelar los vencidos.',
        );
      }
      if (opciones.falla) throw new Error('connection refused: detalle interno');
      return opciones.cancelados ?? 2;
    },
  };
  return { puerto, llamadas };
}

describe('B4 · revisarCron decide sin red', () => {
  it('sin CRON_SECRET el cron no está configurado', () => {
    expect(revisarCron(`Bearer ${SECRETO}`, undefined)).toBe('sin-secreto');
    expect(revisarCron(`Bearer ${SECRETO}`, '')).toBe('sin-secreto');
    expect(revisarCron(null, null)).toBe('sin-secreto');
  });

  it('sin encabezado o con un secreto distinto no autoriza', () => {
    expect(revisarCron(null, SECRETO)).toBe('no-autorizado');
    expect(revisarCron('', SECRETO)).toBe('no-autorizado');
    expect(revisarCron(`Bearer otro`, SECRETO)).toBe('no-autorizado');
    expect(revisarCron(SECRETO, SECRETO)).toBe('no-autorizado');
    expect(revisarCron('Basic abc', SECRETO)).toBe('no-autorizado');
  });

  it('acepta Bearer con el secreto correcto, sin importar el caso del esquema', () => {
    expect(revisarCron(`Bearer ${SECRETO}`, SECRETO)).toBe('ok');
    expect(revisarCron(`bearer ${SECRETO}`, SECRETO)).toBe('ok');
  });
});

describe('B4 · POST /api/cron/vencidos', () => {
  it('sin CRON_SECRET responde 503 explícito y no toca la base', async () => {
    const { puerto, llamadas } = puertoFalso();

    const respuesta = await manejarCron(peticion(`Bearer ${SECRETO}`), puerto, undefined);
    const cuerpo = (await respuesta.json()) as { estado: string; motivo: string };

    expect(respuesta.status).toBe(503);
    expect(cuerpo).toMatchObject({ estado: 'error', motivo: 'sin-secreto' });
    expect(cuerpo).not.toHaveProperty('cancelados');
    expect(llamadas).toEqual([]);
  });

  it('sin encabezado o con un secreto incorrecto responde 401 y no toca la base', async () => {
    const sinEncabezado = puertoFalso();
    const incorrecto = puertoFalso();

    const unaRespuesta = await manejarCron(peticion(), sinEncabezado.puerto, SECRETO);
    const otraRespuesta = await manejarCron(
      peticion('Bearer otro'),
      incorrecto.puerto,
      SECRETO,
    );

    expect(unaRespuesta.status).toBe(401);
    expect(otraRespuesta.status).toBe(401);
    expect(sinEncabezado.llamadas).toEqual([]);
    expect(incorrecto.llamadas).toEqual([]);
  });

  it('con el secreto correcto devuelve la cantidad de pedidos cancelados', async () => {
    const { puerto, llamadas } = puertoFalso({ cancelados: 3 });

    const respuesta = await manejarCron(peticion(`Bearer ${SECRETO}`), puerto, SECRETO);
    const cuerpo = (await respuesta.json()) as { estado: string; cancelados: number };

    expect(respuesta.status).toBe(200);
    expect(cuerpo).toEqual({ estado: 'ok', cancelados: 3 });
    expect(llamadas).toEqual([1]);
  });

  it('un fallo de la base se informa sin filtrar el detalle interno', async () => {
    const { puerto } = puertoFalso({ falla: true });

    const respuesta = await manejarCron(peticion(`Bearer ${SECRETO}`), puerto, SECRETO);
    const cuerpo = (await respuesta.json()) as { estado: string; motivo: string; mensaje: string };

    expect(respuesta.status).toBe(500);
    expect(cuerpo.estado).toBe('error');
    expect(cuerpo.motivo).toBe('error-del-servidor');
    expect(cuerpo.mensaje).not.toMatch(/connection refused|detalle interno/);
  });

  it('si falta configuración en el puerto responde 503 sin-configuracion', async () => {
    const { puerto } = puertoFalso({ faltaConfiguracion: true });

    const respuesta = await manejarCron(peticion(`Bearer ${SECRETO}`), puerto, SECRETO);
    const cuerpo = (await respuesta.json()) as { estado: string; motivo: string; mensaje: string };

    expect(respuesta.status).toBe(503);
    expect(cuerpo.estado).toBe('error');
    expect(cuerpo.motivo).toBe('sin-configuracion');
    expect(cuerpo.mensaje).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

describe('B4 · puertoCronServidor distingue configuración de fallo de base', () => {
  it('sin claves de entorno lanza FaltaConfiguracion al cancelar', async () => {
    const urlPrevia = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const llavePrevia = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const puerto = puertoCronServidor();
      await expect(puerto.cancelarVencidos()).rejects.toBeInstanceOf(FaltaConfiguracion);
    } finally {
      if (urlPrevia !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = urlPrevia;
      if (llavePrevia !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = llavePrevia;
    }
  });

  it('un fallo de la RPC lanza el error de base original y no FaltaConfiguracion', async () => {
    const errorBd = new Error('connection refused: postgres offline');
    const clienteFalso = {
      rpc: async () => ({ data: null, error: errorBd }),
    };

    const puerto = puertoSobre(clienteFalso);
    await expect(puerto.cancelarVencidos()).rejects.toThrow('connection refused: postgres offline');
    await expect(puerto.cancelarVencidos()).rejects.not.toBeInstanceOf(FaltaConfiguracion);
  });
});

describe('B4 · el cron queda versionado y con su horario explicado', () => {
  it('vercel.json agenda el viernes 23:59 ART (sábado 02:59 UTC)', () => {
    const crons = JSON.parse(readFileSync(join(RAIZ, 'vercel.json'), 'utf8')) as {
      crons: Array<{ path: string; schedule: string }>;
    };

    expect(crons.crons).toEqual([
      { path: '/api/cron/vencidos', schedule: '59 2 * * 6' },
    ]);
  });

  it('la ruta usa la service role y el manejador testeable', () => {
    const ruta = leer('src/app/api/cron/vencidos/route.ts');
    expect(ruta).toMatch(/manejarCron\s*\(/);
    expect(ruta).toMatch(/puertoCronServidor\s*\(/);
    expect(ruta).toMatch(/runtime\s*=\s*["']nodejs["']/);
    expect(ruta).not.toMatch(/SERVICE_ROLE/);
  });

  it('responde GET (Vercel Cron) y POST (disparo manual) con el mismo borde', async () => {
    const previo = process.env.CRON_SECRET;
    process.env.CRON_SECRET = SECRETO;

    try {
      const intentoGet = new Request('http://localhost/api/cron/vencidos', {
        headers: { authorization: 'Bearer otro' },
      });
      const intentoPost = new Request('http://localhost/api/cron/vencidos', {
        method: 'POST',
        headers: { authorization: 'Bearer otro' },
      });

      expect((await GET(intentoGet)).status).toBe(401);
      expect((await POST(intentoPost)).status).toBe(401);
    } finally {
      if (previo === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previo;
    }

    // Sin CRON_SECRET, GET (el que dispara Vercel) también responde 503.
    const previoSinSecreto = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      const sinSecreto = new Request('http://localhost/api/cron/vencidos', {
        headers: { authorization: `Bearer ${SECRETO}` },
      });
      expect((await GET(sinSecreto)).status).toBe(503);
    } finally {
      if (previoSinSecreto !== undefined) process.env.CRON_SECRET = previoSinSecreto;
    }
  });

  it('con CRON_SECRET pero sin claves de Supabase, GET y POST responden 503 sin-configuracion', async () => {
    const previoCron = process.env.CRON_SECRET;
    const previoUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const previaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    process.env.CRON_SECRET = SECRETO;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const peticionGet = new Request('http://localhost/api/cron/vencidos', {
        headers: { authorization: `Bearer ${SECRETO}` },
      });
      const peticionPost = new Request('http://localhost/api/cron/vencidos', {
        method: 'POST',
        headers: { authorization: `Bearer ${SECRETO}` },
      });

      const resGet = await GET(peticionGet);
      const resPost = await POST(peticionPost);

      expect(resGet.status).toBe(503);
      expect(resPost.status).toBe(503);

      const cuerpoGet = (await resGet.json()) as { estado: string; motivo: string };
      const cuerpoPost = (await resPost.json()) as { estado: string; motivo: string };

      expect(cuerpoGet.motivo).toBe('sin-configuracion');
      expect(cuerpoPost.motivo).toBe('sin-configuracion');
    } finally {
      if (previoCron !== undefined) process.env.CRON_SECRET = previoCron;
      else delete process.env.CRON_SECRET;

      if (previoUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = previoUrl;
      else delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (previaKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = previaKey;
      else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  });

  it('el adaptador llama a la RPC con la service role', () => {
    const adaptador = leer('src/lib/cron-servidor.ts');
    expect(adaptador).toMatch(/rpc\(\s*["']cancelar_pedidos_vencidos["']/);
    expect(adaptador).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('el fallback manual queda documentado en la spec bd-mvp', () => {
    const spec = leer('docs/specs/bd-mvp/spec.md');
    expect(spec).toMatch(/select\s+cancelar_pedidos_vencidos\(\)/i);
    expect(spec).toMatch(/fallback/i);
  });
});
