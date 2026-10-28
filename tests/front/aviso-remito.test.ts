import { afterEach, describe, expect, it, vi } from 'vitest';
import { pedirAlPanel } from '../../src/components/admin/comun';
import { leer } from './ayudantes';

/**
 * A1 · el panel avisa cuando el remito no salió (issue #19).
 *
 * La aprobación ya cerró la venta en la base; si Resend falla, `POST /api/admin/comprobantes`
 * devuelve `{ estado: "ok", aviso }`. El helper no puede descartar ese aviso y el panel no puede
 * mostrarlo como un éxito pleno (HU-13 de la spec `admin`).
 */

type RespuestaFalsa = { estado?: string; mensaje?: string; aviso?: string };

function responderCon(cuerpo: RespuestaFalsa, ok = true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      json: async () => cuerpo,
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('A1 · pedirAlPanel conserva el aviso de remito', () => {
  it('devuelve el aviso cuando la aprobación salió pero el email no', async () => {
    responderCon({
      estado: 'ok',
      aviso: 'El remito R-2026-000001 quedó emitido, pero no se pudo enviar el email.',
    });

    const resultado = await pedirAlPanel('/api/admin/comprobantes', { method: 'POST' });

    expect(resultado).toEqual({
      ok: true,
      aviso: 'El remito R-2026-000001 quedó emitido, pero no se pudo enviar el email.',
    });
  });

  it('un éxito sin aviso no inventa uno', async () => {
    responderCon({ estado: 'ok' });

    const resultado = await pedirAlPanel('/api/admin/comprobantes', { method: 'POST' });

    expect(resultado).toEqual({ ok: true });
    expect(resultado).not.toHaveProperty('aviso');
  });

  it('un error del dominio sigue devolviendo el mensaje y no un aviso', async () => {
    responderCon(
      { estado: 'error', mensaje: 'El monto del comprobante no coincide con el total del pedido.' },
      false,
    );

    const resultado = await pedirAlPanel('/api/admin/comprobantes', { method: 'POST' });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.mensaje).toMatch(/monto/i);
    expect(resultado).not.toHaveProperty('aviso');
  });

  it('si no hay respuesta, el mensaje de conexión no promete nada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );

    const resultado = await pedirAlPanel('/api/admin/comprobantes', { method: 'POST' });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.mensaje).toMatch(/conexión|conexion/i);
  });

  it('una respuesta que no es un objeto JSON no se toma como éxito', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [] })),
    );

    const resultado = await pedirAlPanel('/api/admin/comprobantes', { method: 'POST' });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.mensaje).toMatch(/respuesta/i);
  });
});

describe('A1 · el panel no convierte un fallo de correo en éxito', () => {
  const panel = leer('src/components/admin/PanelDePedidos.tsx');

  it('usa el aviso de la respuesta en la confirmación', () => {
    expect(panel).toMatch(/resultado\.aviso/);
  });

  it('anuncia el aviso con role="alert"', () => {
    expect(panel).toMatch(/role="alert"/);
    expect(panel).toMatch(/avisoRemito/);
  });

  it('ofrece reenviar el remito y no afirma que el Cliente lo recibió', () => {
    expect(panel).toMatch(/Reenviar el remito/);
    expect(panel).not.toMatch(/el Cliente lo recibi[oó]/i);
    expect(panel).toMatch(/el remito existe, pero el email no salió/i);
  });
});
