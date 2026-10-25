import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  componerRemito,
  emitirRemito,
  leerRemito,
  type DatosDelRemito,
  type PuertoDeCorreo,
  type PuertoDelRemito,
} from '../../src/lib/remito';
import { RAIZ, archivosFuente, leer } from './ayudantes';

/**
 * T8 · Remito y email al Cliente (issue #14).
 *
 * El remito lo emite la base dentro de la transacción de aprobación; este módulo lo **lee**, lo
 * compone y lo envía. Los seams son puros: un puerto de datos falso y un puerto de correo falso,
 * sin red y sin Supabase. Lo que se verifica es el contenido del documento, que no prometa envío,
 * que escape lo que escribió el Cliente y que un fallo de correo no toque la venta.
 */

const FILA = {
  numero: 'R-2026-000007',
  fecha: '2026-10-25',
  total: 2500,
  cliente: { nombre: 'Juan Pérez', email: 'juan@ejemplo.com' },
  items: [{ nombre: 'Jabón de avena', cantidad: 2, precio_unitario: 1250, subtotal: 2500 }],
};

function datos(overrides: Partial<DatosDelRemito> = {}): DatosDelRemito {
  return {
    numero: 'R-2026-000007',
    fecha: '2026-10-25',
    total: 2500,
    cliente: { nombre: 'Juan Pérez', email: 'juan@ejemplo.com' },
    items: [{ nombre: 'Jabón de avena', cantidad: 2, precioUnitario: 1250, subtotal: 2500 }],
    ...overrides,
  };
}

function puertos(overrides: { fila?: unknown; fallaCorreo?: boolean } = {}) {
  const enviados: Array<{ para: string; asunto: string; html: string; texto: string }> = [];

  const datosPuerto: PuertoDelRemito = {
    async leerDatos() {
      return overrides.fila === undefined ? FILA : overrides.fila;
    },
  };

  const correo: PuertoDeCorreo = {
    async enviar(mensaje) {
      if (overrides.fallaCorreo) throw new Error('Resend respondió 500');
      enviados.push(mensaje);
      return { id: 'correo-1' };
    },
  };

  return { puertos: { datos: datosPuerto, correo }, enviados };
}

describe('T8 · lectura del remito que emitió la base', () => {
  it('valida la fila y la convierte en el dominio del remito', async () => {
    const { puertos: puerto } = puertos();

    const resultado = await leerRemito(puerto.datos, 7);

    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado.datos).toEqual(datos());
  });

  it('un comprobante sin remito no inventa uno', async () => {
    const { puertos: puerto } = puertos({ fila: null });

    const resultado = await leerRemito(puerto.datos, 7);

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('remito-inexistente');
  });

  it('una fila que no cumple el contrato no se compone a medias', async () => {
    for (const fila of [
      { ...FILA, items: [] },
      { ...FILA, total: -1 },
      { ...FILA, cliente: { nombre: '', email: 'no-es-email' } },
      { ...FILA, numero: '' },
    ]) {
      const { puertos: puerto } = puertos({ fila });
      const resultado = await leerRemito(puerto.datos, 7);
      expect(resultado.estado).toBe('error');
      if (resultado.estado !== 'error') continue;
      expect(resultado.motivo).toBe('datos-inconsistentes');
    }
  });

  it('un id de comprobante inválido no llega al puerto', async () => {
    let llamado = false;
    const puerto: PuertoDelRemito = {
      async leerDatos() {
        llamado = true;
        return FILA;
      },
    };

    const resultado = await leerRemito(puerto, 'nada');

    expect(resultado.estado).toBe('error');
    expect(llamado).toBe(false);
  });
});

describe('T8 · el documento del remito', () => {
  it('lleva número, fecha, cliente, líneas y total', () => {
    const compuesto = componerRemito(datos());

    expect(compuesto.numero).toBe('R-2026-000007');
    expect(compuesto.asunto).toMatch(/remito/i);
    expect(compuesto.asunto).toContain('R-2026-000007');
    for (const contenido of [compuesto.html, compuesto.texto]) {
      expect(contenido).toContain('R-2026-000007');
      expect(contenido).toContain('Juan Pérez');
      expect(contenido).toContain('Jabón de avena');
      expect(contenido).toContain('2');
      expect(contenido).toMatch(/2[.,]500/);
      expect(contenido).toContain('Esencia Técnica');
      expect(contenido).toContain('E.E.S.T N°1 Luciano Reyes');
    }
  });

  it('no promete envío, seguimiento ni estados posteriores, y no inventa datos fiscales', () => {
    const compuesto = componerRemito(datos());

    for (const contenido of [compuesto.html, compuesto.texto]) {
      expect(contenido).not.toMatch(
        /enviamos|llega en|entrega en \d|seguimiento del pedido|En Preparación|Enviado|Entregado/i,
      );
      expect(contenido).not.toMatch(/CUIT|IVA|factura fiscal|domicilio fiscal/i);
      expect(contenido).toMatch(/retiro|entrega/i);
    }
  });

  it('escapa lo que escribió el Cliente: el nombre no puede inyectar HTML', () => {
    const compuesto = componerRemito(
      datos({ cliente: { nombre: 'Jabón <script>alert(1)</script>', email: 'juan@ejemplo.com' } }),
    );

    expect(compuesto.html).toContain('&lt;script&gt;');
    expect(compuesto.html).not.toContain('<script>alert(1)</script>');
  });
});

describe('T8 · envío al Cliente', () => {
  it('manda el remito al email del Cliente del pedido', async () => {
    const { puertos: puerto, enviados } = puertos();

    const resultado = await emitirRemito(puerto, 7);

    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado.numero).toBe('R-2026-000007');
    expect(resultado.para).toBe('juan@ejemplo.com');
    expect(enviados).toHaveLength(1);
    expect(enviados[0].para).toBe('juan@ejemplo.com');
    expect(enviados[0].asunto).toContain('R-2026-000007');
  });

  it('un fallo de correo se informa y no revierte la venta', async () => {
    const { puertos: puerto, enviados } = puertos({ fallaCorreo: true });

    const resultado = await emitirRemito(puerto, 7);

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('correo');
    expect(resultado.numero).toBe('R-2026-000007');
    expect(resultado.mensaje).toMatch(/reintent|reenv/i);
    expect(enviados).toEqual([]);
  });

  it('sin remito no se envía nada', async () => {
    const { puertos: puerto, enviados } = puertos({ fila: null });

    const resultado = await emitirRemito(puerto, 7);

    expect(resultado.estado).toBe('error');
    expect(enviados).toEqual([]);
  });

  it('el módulo no crea ni numera remitos: eso es de la base', () => {
    const modulo = leer('src/lib/remito.ts');
    expect(modulo).not.toMatch(/remitos_de_venta|\.insert\(|nextval|supabase/i);
  });
});

describe('T8 · el remito es visible y reenviable desde el panel', () => {
  it('la aprobación emite el remito y avisa si el correo falló', () => {
    const ruta = leer('src/app/api/admin/comprobantes/route.ts');
    expect(ruta).toMatch(/emitirRemito\(/);
    expect(ruta).toMatch(/aviso/);
  });

  it('hay un borde propio para reenviar, y no toca la aprobación', () => {
    const ruta = 'src/app/api/admin/remito/route.ts';
    expect(existsSync(join(RAIZ, ruta))).toBe(true);
    const fuente = leer(ruta);
    expect(fuente).toMatch(/emitirRemito\(/);
    expect(fuente).not.toMatch(/use client|aprobar_comprobante|panelDelAdministrador\(/);
  });

  it('existe la página imprimible del remito', () => {
    const ruta = 'src/app/admin/remito/[idComprobante]/page.tsx';
    expect(existsSync(join(RAIZ, ruta))).toBe(true);
    const fuente = leer(ruta);
    expect(fuente).not.toMatch(/use client/);
    expect(fuente).toMatch(/leerRemito\(/);
    expect(fuente).not.toMatch(/resend|RESEND_API_KEY/i);
  });

  it('el panel ofrece ver y reenviar el remito de una venta aprobada', () => {
    const panel = leer('src/components/admin/PanelDePedidos.tsx');
    expect(panel).toMatch(/\/admin\/remito\//);
    expect(panel).toMatch(/api\/admin\/remito/);
  });
});

describe('T8 · Resend vive solo en el servidor', () => {
  it('ningún archivo de cliente importa el adaptador ni lee la clave', () => {
    const ofensores = archivosFuente(join(RAIZ, 'src'))
      .filter((archivo) => /^\s*["']use client["']/m.test(readFileSync(archivo, 'utf8')))
      .filter((archivo) => /RESEND_API_KEY|remito-servidor|from ["']resend["']/.test(readFileSync(archivo, 'utf8')))
      .map((archivo) => relative(RAIZ, archivo).replace(/\\/g, '/'));
    expect(ofensores).toEqual([]);
  });

  it('el adaptador del remito inicializa Resend por llamada, no al importar', () => {
    const adaptador = leer('src/lib/remito-servidor.ts');
    expect(adaptador).toMatch(/RESEND_API_KEY/);
    // Nada de `const resend = new Resend(...)` en el ámbito del módulo: eso ataba el build a la clave.
    expect(adaptador).not.toMatch(/^(const|let|var)\s+\w+\s*=\s*new Resend\(/m);
    expect(adaptador).not.toMatch(/^\s*const\s+resend\s*=/m);
  });

  it('el puente de Teams tampoco instancia Resend al importar', () => {
    const puente = leer('src/app/api/notifications/route.ts');
    expect(puente).not.toMatch(/^(const|let|var)\s+\w+\s*=\s*new Resend\(/m);
  });
});
