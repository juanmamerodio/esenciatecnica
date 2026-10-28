import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import {
  LIMITES_DE_ARCHIVO,
  bucketDe,
  claveDelArchivo,
  revisarArchivo,
  revisarTipoYTamano,
  type ArchivoSubido,
} from '../../src/lib/archivo';
import {
  ESTADO_HTTP,
  FaltaConfiguracion,
  camposDeZod,
  codigoDeError,
  estadoHttp,
  motivoDeBd,
} from '../../src/lib/errores-bd';
import { respuestaDeError, respuestaDeFalla } from '../../src/lib/admin-http';
import { fechaEnHoraArgentina } from '../../src/lib/fecha';
import { RAIZ, archivosFuente, leer } from './ayudantes';

/**
 * #35 · Nacen el módulo de archivo subido y el de errores de base (issue #25, hallazgos 8, 9 y 11).
 *
 * Los dos módulos son profundos: interfaz chica (revisar, derivar una clave, traducir un motivo) y
 * la lógica adentro. Se testea su comportamiento con entradas literales y, con tests estructurales,
 * que la definición quedó en **un solo** archivo: el comprobante y la foto ya no tienen su propia
 * tabla de límites ni su propio mapa de errores.
 */

const ARCHIVO: ArchivoSubido = {
  nombre: 'comprobante.png',
  tipo: 'image/png',
  tamano: 1024,
  bytes: new Uint8Array([1, 2, 3]),
};

describe('#35 · una sola tabla de límites y una sola revisión', () => {
  it('la tabla es la de los dos buckets: 5 MB y tres tipos de imagen', () => {
    expect(LIMITES_DE_ARCHIVO.tamanoMaximo).toBe(5 * 1024 * 1024);
    expect([...LIMITES_DE_ARCHIVO.tipos]).toEqual(['image/png', 'image/jpeg', 'image/webp']);
  });

  it('acepta los tres tipos y devuelve nulo', () => {
    for (const tipo of LIMITES_DE_ARCHIVO.tipos) {
      expect(revisarTipoYTamano({ tipo, tamano: 1024 }, 'comprobante')).toBeNull();
      expect(revisarTipoYTamano({ tipo, tamano: 1024 }, 'foto')).toBeNull();
    }
  });

  it('rechaza otro tipo, un archivo vacío y uno más grande que el tope', () => {
    expect(revisarTipoYTamano({ tipo: 'application/pdf', tamano: 1024 }, 'comprobante')).toMatch(
      /PNG, JPEG o WebP/,
    );
    expect(revisarTipoYTamano({ tipo: 'image/png', tamano: 0 }, 'foto')).toMatch(/vacío/);
    expect(
      revisarTipoYTamano(
        { tipo: 'image/png', tamano: LIMITES_DE_ARCHIVO.tamanoMaximo + 1 },
        'comprobante',
      ),
    ).toMatch(/5 MB/);
  });

  it('el mensaje nombra el uso: comprobante o foto', () => {
    expect(revisarTipoYTamano({ tipo: 'application/pdf', tamano: 1 }, 'comprobante')).toMatch(
      /^El comprobante/,
    );
    expect(revisarTipoYTamano({ tipo: 'application/pdf', tamano: 1 }, 'foto')).toMatch(
      /^La foto del producto/,
    );
  });

  it('la revisión completa valida el archivo crudo y tipa el resultado', () => {
    expect(revisarArchivo(ARCHIVO, 'comprobante')).toEqual({ ok: true, archivo: ARCHIVO });

    const ilegible = revisarArchivo({ nombre: '', bytes: 'no' }, 'comprobante');
    expect(ilegible.ok).toBe(false);
    if (!ilegible.ok) expect(ilegible.mensaje).toMatch(/no llegó bien/);

    const vacio = revisarArchivo({ ...ARCHIVO, tamano: 0, bytes: new Uint8Array() }, 'foto');
    expect(vacio.ok).toBe(false);
    if (!vacio.ok) expect(vacio.mensaje).toMatch(/^La foto del producto llegó vacío/);

    expect(revisarArchivo(null, 'comprobante').ok).toBe(false);
  });
});

describe('#35 · una sola forma de derivar la clave del objeto', () => {
  it('el bucket sale del uso, no de una constante suelta', () => {
    expect(bucketDe('comprobante')).toBe('comprobantes');
    expect(bucketDe('foto')).toBe('productos');
  });

  it('sanea el nombre igual en los dos usos: sin rutas ni `..`', () => {
    const comprobante = claveDelArchivo('comprobante', 42, {
      ...ARCHIVO,
      nombre: '../../etc/Passwd Final.PNG',
    });
    const foto = claveDelArchivo('foto', 5, {
      ...ARCHIVO,
      nombre: '../../etc/Passwd Final.PNG',
    });

    expect(comprobante).toBe('comprobantes/42/passwd-final.png');
    expect(foto).toBe('productos/5/passwd-final.png');
    expect(comprobante).not.toContain('..');
    expect(foto.split('/')).toHaveLength(3);
  });

  it('si el nombre no deja nada usable, usa el de respaldo del uso', () => {
    expect(claveDelArchivo('comprobante', 42, { ...ARCHIVO, nombre: '...' })).toBe(
      'comprobantes/42/comprobante.png',
    );
    expect(claveDelArchivo('foto', 5, { ...ARCHIVO, nombre: '...', tipo: 'image/webp' })).toBe(
      'productos/5/foto.webp',
    );
  });

  it('la extensión sale del tipo declarado, no del nombre', () => {
    expect(
      claveDelArchivo('foto', 9, { ...ARCHIVO, nombre: 'Calendula Foto.PNG', tipo: 'image/jpeg' }),
    ).toBe('productos/9/calendula-foto.jpg');
  });
});

describe('#35 · un solo mapa de error de base a motivo', () => {
  it('lee el código crudo de Postgres/Supabase y no inventa con otro error', () => {
    expect(codigoDeError({ code: 'ET001' })).toBe('ET001');
    expect(codigoDeError({ code: 42 })).toBeNull();
    expect(codigoDeError(new Error('boom'))).toBeNull();
    expect(codigoDeError(null)).toBeNull();
  });

  it('traduce todos los códigos del modelo a motivos del dominio', () => {
    const esperado: Record<string, string> = {
      ET001: 'stock-insuficiente',
      ET002: 'producto-no-disponible',
      ET003: 'items-invalidos',
      ET004: 'comprobante-no-pendiente',
      ET005: 'monto-no-coincide',
      ET006: 'pedido-no-pendiente',
      ET007: 'stock-bajo-reserva',
      '23505': 'datos-duplicados',
      '23514': 'datos-invalidos',
    };

    for (const [codigo, motivo] of Object.entries(esperado)) {
      expect(motivoDeBd({ code: codigo }), codigo).toBe(motivo);
    }
    expect(motivoDeBd({ code: 'ET999' })).toBeNull();
    expect(motivoDeBd(new Error('boom'))).toBeNull();
  });

  it('el mapa de motivo a HTTP es uno solo y cubre todos los motivos', () => {
    expect(estadoHttp('datos-invalidos')).toBe(400);
    expect(estadoHttp('items-invalidos')).toBe(400);
    expect(estadoHttp('archivo-invalido')).toBe(400);
    expect(estadoHttp('stock-insuficiente')).toBe(409);
    expect(estadoHttp('producto-no-disponible')).toBe(409);
    expect(estadoHttp('stock-bajo-reserva')).toBe(409);
    expect(estadoHttp('comprobante-no-pendiente')).toBe(409);
    expect(estadoHttp('pedido-no-pendiente')).toBe(409);
    expect(estadoHttp('nombre-duplicado')).toBe(409);
    expect(estadoHttp('datos-duplicados')).toBe(409);
    expect(estadoHttp('monto-no-coincide')).toBe(422);
    expect(estadoHttp('datos-inconsistentes')).toBe(500);
    expect(estadoHttp('error-del-servidor')).toBe(500);

    for (const estado of Object.values(ESTADO_HTTP)) expect(Number.isInteger(estado)).toBe(true);
  });

  it('la conversión de los campos de Zod vive en el mapa', () => {
    const esquema = z.object({
      nombre: z.string().min(2, 'El nombre es corto.'),
      precio: z.number().positive('El precio tiene que ser mayor que cero.'),
    });
    const revision = esquema.safeParse({ nombre: 'a', precio: -1 });
    expect(revision.success).toBe(false);
    if (revision.success) return;

    expect(camposDeZod(revision.error)).toEqual({
      nombre: 'El nombre es corto.',
      precio: 'El precio tiene que ser mayor que cero.',
    });
  });
});

describe('#35 · falta de configuración no es una falla real', () => {
  it('sin configuración responde 503 con el mensaje del entorno', () => {
    const respuesta = respuestaDeFalla(new FaltaConfiguracion('falta la llave'));
    expect(respuesta.status).toBe(503);

    return respuesta.json().then((cuerpo: { mensaje: string; motivo: string }) => {
      expect(cuerpo.motivo).toBe('error-del-servidor');
      expect(cuerpo.mensaje).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
      expect(cuerpo.mensaje).toMatch(/configurado/);
    });
  });

  it('una falla real responde 500, sin el diagnóstico del entorno, y deja el motivo en el log', async () => {
    const registro = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const falla = new Error('permission denied for table pedido');
      const respuesta = respuestaDeFalla(falla);
      expect(respuesta.status).toBe(500);

      const cuerpo = (await respuesta.json()) as { mensaje: string; motivo: string };
      expect(cuerpo.motivo).toBe('error-del-servidor');
      expect(cuerpo.mensaje).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);

      expect(registro).toHaveBeenCalled();
      expect(JSON.stringify(registro.mock.calls)).toMatch(/permission denied for table pedido/);
    } finally {
      registro.mockRestore();
    }
  });

  it('el error de configuración es distinguible de cualquier otro', () => {
    expect(new FaltaConfiguracion('x')).toBeInstanceOf(Error);
    expect(new FaltaConfiguracion('x').name).toBe('FaltaConfiguracion');
  });

  it('el borde del panel traduce el motivo con el mapa compartido', async () => {
    const respuesta = respuestaDeError({
      estado: 'error',
      motivo: 'monto-no-coincide',
      mensaje: 'no coincide',
    });
    expect(respuesta.status).toBe(422);
  });
});

describe('#35 · el formato de la fecha se separa del transporte', () => {
  it('la fecha del panel vive en su módulo puro', () => {
    const formateada = fechaEnHoraArgentina('2026-10-28T18:36:46-03:00');
    expect(formateada).toMatch(/28\/10\/26/);
    expect(formateada).toMatch(/6:36/);
    // El huso es el de la Argentina: el mismo instante en UTC da la misma fecha del panel.
    expect(fechaEnHoraArgentina('2026-10-28T21:36:46Z')).toBe(formateada);
    // Una fecha ilegible se devuelve tal cual: el panel no muestra "Invalid Date".
    expect(fechaEnHoraArgentina('no es una fecha')).toBe('no es una fecha');
  });

  it('`comun.ts` queda con el transporte y sin formato de fecha', () => {
    const comun = leer('src/components/admin/comun.ts');
    expect(comun).toMatch(/pedirAlPanel/);
    expect(comun).not.toMatch(/Intl|DateTimeFormat|timeZone/);
  });
});

describe('#35 · una sola definición en el repo', () => {
  /** Los archivos de `src/` vienen con ruta absoluta: acá se leen directo. */
  const fuente = (archivo: string) => readFileSync(archivo, 'utf8');
  const fuentes = archivosFuente(join(RAIZ, 'src'));

  function ofensores(patron: RegExp, permitido: string): string[] {
    return fuentes
      .filter((archivo) => patron.test(fuente(archivo)))
      .map((archivo) => archivo.replace(/\\/g, '/').split('/src/')[1] ?? archivo)
      .map((ruta) => (ruta.startsWith('src/') ? ruta : `src/${ruta}`))
      .filter((ruta) => ruta !== permitido);
  }

  it('el tope de tamaño está definido en un solo lugar', () => {
    expect(ofensores(/tamanoMaximo\s*:/, 'src/lib/archivo.ts')).toEqual([]);
    expect(ofensores(/5 \* 1024 \* 1024/, 'src/lib/archivo.ts')).toEqual([]);
  });

  it('el comprobante y la foto importan del módulo, no de una copia', () => {
    for (const ruta of ['src/lib/checkout.ts', 'src/lib/admin.ts']) {
      const fuente = leer(ruta);
      expect(fuente, ruta).toMatch(/@\/lib\/archivo/);
      expect(fuente, ruta).not.toMatch(/EXTENSIONES/);
    }
    expect(leer('src/lib/admin.ts')).not.toMatch(/LIMITES_DE_FOTO|claveDeLaFoto|revisarArchivoDeFoto/);
    expect(leer('src/lib/checkout.ts')).not.toMatch(/claveDelComprobante|export const LIMITES\b/);
  });

  it('los componentes cliente usan la misma tabla y la misma revisión', () => {
    const comprobante = leer('src/components/SubirComprobante.tsx');
    expect(comprobante).toMatch(/LIMITES_DE_ARCHIVO|revisarTipoYTamano/);
    expect(comprobante).toMatch(/@\/lib\/archivo/);
    expect(comprobante).not.toMatch(/@\/lib\/checkout/);

    const productos = leer('src/components/admin/PanelDeProductos.tsx');
    expect(productos).toMatch(/LIMITES_DE_ARCHIVO/);
    expect(productos).toMatch(/@\/lib\/archivo/);
  });

  it('los dos bordes HTTP comparten el mapa de motivo a HTTP', () => {
    for (const ruta of ['src/lib/admin-http.ts', 'src/app/api/checkout/route.ts']) {
      const fuente = leer(ruta);
      expect(fuente, ruta).toMatch(/@\/lib\/errores-bd/);
      expect(fuente, ruta).not.toMatch(/const ESTADO_HTTP: Record/);
    }
  });

  it('el código crudo y los campos de Zod no se mapean dos veces', () => {
    for (const ruta of ['src/lib/checkout.ts', 'src/lib/admin.ts']) {
      const fuente = leer(ruta);
      expect(fuente, ruta).toMatch(/@\/lib\/errores-bd/);
      expect(fuente, ruta).not.toMatch(/function codigoDeError/);
      expect(fuente, ruta).not.toMatch(/function camposDe\(/);
    }
  });

  it('ningún componente cliente arrastra el módulo de errores ni los adaptadores', () => {
    const clientes = fuentes.filter((archivo) => /^\s*["']use client["']/.test(fuente(archivo)));
    const ofensoras = clientes
      .filter((archivo) =>
        /@\/lib\/errores-bd|@\/lib\/checkout-servidor|@\/lib\/admin-servidor|SERVICE_ROLE/.test(
          fuente(archivo),
        ),
      )
      .map((archivo) => archivo.replace(/\\/g, '/'));

    expect(ofensoras).toEqual([]);
  });
});
