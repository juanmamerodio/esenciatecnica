import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  confirmarPedido,
  leerRespuestaCheckout,
  totalAVisualizar,
  type EntradaCheckout,
  type PuertoCheckout,
} from '../../src/lib/checkout';
import { LIMITES_DE_ARCHIVO, type ArchivoSubido } from '../../src/lib/archivo';
import type { EstadoPedido, ItemPedido } from '../../src/lib/database.types';
import { RAIZ, archivosFuente, leer } from './ayudantes';

/**
 * T5 · Checkout y comprobante (issue #10).
 *
 * El seam es el módulo puro `src/lib/checkout.ts` con un puerto falso: sin DOM, sin red y sin
 * Supabase. Se verifica el **orden** de los pasos (validar antes de tocar la base, crear el
 * pedido antes de subir, subir antes de registrar), que el reintento no duplique el pedido y
 * que los errores de la base lleguen como mensajes del dominio.
 */

const CLIENTE_OK = { nombre: 'Juan Pérez', email: 'juan@ejemplo.com', dni: '40111222' };

function archivo(overrides: Partial<ArchivoSubido> = {}): ArchivoSubido {
  return {
    nombre: 'comprobante.png',
    tipo: 'image/png',
    tamano: 1024,
    bytes: new Uint8Array([1, 2, 3]),
    ...overrides,
  };
}

function entrada(overrides: Partial<EntradaCheckout> = {}): EntradaCheckout {
  return {
    cliente: { ...CLIENTE_OK },
    items: [{ id_producto: 1, cantidad: 2 }],
    // Coincide con el total del pedido falso: lo que se testea aparte es la no coincidencia.
    monto: 2500,
    archivo: archivo(),
    idPedido: null,
    ...overrides,
  };
}

type EstadoFalso = {
  clienteExistente: { id_cliente: number } | null;
  pedido: { id_pedido: number; total: number; estado_actual: EstadoPedido };
  comprobantePendiente: { id_comprobante: number } | null;
  falla: { en: 'crearPedido' | 'subirArchivo'; error: unknown } | null;
};

/** Puerto falso: registra el orden de las llamadas y no toca nada real. */
function puertoFalso(overrides: Partial<EstadoFalso> = {}) {
  const llamadas: string[] = [];
  const comprobantesRegistrados: Array<{ idPedido: number; clave: string; monto: number; idComprobante?: number }> = [];
  const clavesSubidas: string[] = [];

  const estado: EstadoFalso = {
    clienteExistente: null,
    pedido: { id_pedido: 42, total: 2500, estado_actual: 'Pendiente de Pago' },
    comprobantePendiente: null,
    falla: null,
    ...overrides,
  };

  const puerto: PuertoCheckout = {
    async buscarCliente() {
      llamadas.push('buscarCliente');
      return estado.clienteExistente;
    },
    async crearCliente() {
      llamadas.push('crearCliente');
      return { id_cliente: 7 };
    },
    async buscarPedido() {
      llamadas.push('buscarPedido');
      return estado.pedido;
    },
    async crearPedido(_idCliente: number, items: ItemPedido[]) {
      llamadas.push('crearPedido');
      if (estado.falla?.en === 'crearPedido') throw estado.falla.error;
      expect(items.length).toBeGreaterThan(0);
      return estado.pedido;
    },
    async comprobantePendiente() {
      llamadas.push('comprobantePendiente');
      return estado.comprobantePendiente;
    },
    async subirArchivo(clave: string) {
      llamadas.push('subirArchivo');
      if (estado.falla?.en === 'subirArchivo') throw estado.falla.error;
      clavesSubidas.push(clave);
    },
    async registrarComprobante(datos) {
      llamadas.push('registrarComprobante');
      comprobantesRegistrados.push(datos);
      return { id_comprobante: datos.idComprobante ?? 99 };
    },
  };

  return { puerto, llamadas, comprobantesRegistrados, clavesSubidas, estado };
}

describe('T5 · validación del borde antes de tocar la base', () => {
  it('rechaza un DNI que no tiene 7 u 8 dígitos y no llama al puerto', async () => {
    const { puerto, llamadas } = puertoFalso();

    const resultado = await confirmarPedido(puerto, entrada({ cliente: { ...CLIENTE_OK, dni: '123' } }));

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('datos-invalidos');
    expect(resultado.campos?.dni).toBeTruthy();
    expect(llamadas).toEqual([]);
  });

  it('rechaza un email inválido y un nombre vacío', async () => {
    const { puerto, llamadas } = puertoFalso();

    const sinEmail = await confirmarPedido(puerto, entrada({ cliente: { ...CLIENTE_OK, email: 'no-es-email' } }));
    const sinNombre = await confirmarPedido(puerto, entrada({ cliente: { ...CLIENTE_OK, nombre: '  ' } }));

    expect(sinEmail.estado).toBe('error');
    expect(sinNombre.estado).toBe('error');
    expect(llamadas).toEqual([]);
  });

  it('rechaza el mismo producto repetido antes de llamar al RPC', async () => {
    const { puerto, llamadas } = puertoFalso();

    const resultado = await confirmarPedido(
      puerto,
      entrada({ items: [{ id_producto: 1, cantidad: 2 }, { id_producto: 1, cantidad: 1 }] }),
    );

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('items-invalidos');
    expect(resultado.mensaje).toMatch(/una sola vez|repetid/i);
    expect(llamadas).toEqual([]);
  });

  it('rechaza un carrito sin items o con cantidades no positivas', async () => {
    const { puerto, llamadas } = puertoFalso();

    expect((await confirmarPedido(puerto, entrada({ items: [] }))).estado).toBe('error');
    expect((await confirmarPedido(puerto, entrada({ items: [{ id_producto: 1, cantidad: 0 }] }))).estado).toBe('error');
    expect(llamadas).toEqual([]);
  });

  it('rechaza un monto que no es un número positivo', async () => {
    const { puerto, llamadas } = puertoFalso();

    const resultado = await confirmarPedido(puerto, entrada({ monto: 'nada' }));

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.campos?.monto).toBeTruthy();
    expect(llamadas).toEqual([]);
  });

  it('rechaza un archivo de otro tipo o más grande que el límite del bucket, antes de crear el pedido', async () => {
    const { puerto, llamadas } = puertoFalso();

    const pdf = await confirmarPedido(puerto, entrada({ archivo: archivo({ tipo: 'application/pdf' }) }));
    const enorme = await confirmarPedido(
      puerto,
      entrada({ archivo: archivo({ tamano: LIMITES_DE_ARCHIVO.tamanoMaximo + 1 }) }),
    );

    expect(pdf.estado).toBe('error');
    if (pdf.estado === 'error') expect(pdf.motivo).toBe('archivo-invalido');
    expect(enorme.estado).toBe('error');
    if (enorme.estado === 'error') expect(enorme.mensaje).toMatch(/5 MB/i);
    expect(llamadas).toEqual([]);
  });

  it('acepta los tres formatos del bucket', async () => {
    for (const tipo of LIMITES_DE_ARCHIVO.tipos) {
      const { puerto } = puertoFalso();
      const resultado = await confirmarPedido(puerto, entrada({ archivo: archivo({ tipo }) }));
      expect(resultado.estado).toBe('ok');
    }
  });
});

describe('T5 · camino completo del pedido', () => {
  it('resuelve el Cliente, crea el pedido, sube la imagen y registra el comprobante, en ese orden', async () => {
    const { puerto, llamadas, clavesSubidas, comprobantesRegistrados } = puertoFalso();

    const resultado = await confirmarPedido(puerto, entrada({ monto: 2500 }));

    expect(llamadas).toEqual([
      'buscarCliente',
      'crearCliente',
      'crearPedido',
      'subirArchivo',
      'registrarComprobante',
    ]);
    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado.idPedido).toBe(42);
    expect(resultado.total).toBe(2500);
    expect(clavesSubidas[0]).toMatch(/^comprobantes\/42\/[a-z0-9-]+\.png$/);
    expect(comprobantesRegistrados[0]).toMatchObject({ idPedido: 42, monto: 2500, clave: clavesSubidas[0] });
    expect(comprobantesRegistrados[0].idComprobante).toBeUndefined();
  });

  it('reutiliza el Cliente que ya existe por email y no crea un segundo', async () => {
    const { puerto, llamadas } = puertoFalso({ clienteExistente: { id_cliente: 3 } });

    await confirmarPedido(puerto, entrada({ monto: 2500 }));

    expect(llamadas).not.toContain('crearCliente');
    expect(llamadas[0]).toBe('buscarCliente');
  });

  it('manda una sola línea por producto y sin precios desde el cliente', async () => {
    const { puerto } = puertoFalso();
    let recibidos: ItemPedido[] = [];
    const espia: PuertoCheckout = {
      ...puerto,
      async crearPedido(_id: number, items: ItemPedido[]) {
        recibidos = items;
        return { id_pedido: 42, total: 2500, estado_actual: 'Pendiente de Pago' };
      },
    };

    await confirmarPedido(
      espia,
      entrada({ items: [{ id_producto: 4, cantidad: 1 }, { id_producto: 9, cantidad: 3 }], monto: 2500 }),
    );

    expect(recibidos).toEqual([{ id_producto: 4, cantidad: 1 }, { id_producto: 9, cantidad: 3 }]);
  });

  it('normaliza el monto declarado a dos decimales', async () => {
    // El dinero del modelo es NUMERIC(12,2): un monto con más decimales se redondea.
    const { puerto, comprobantesRegistrados } = puertoFalso({
      pedido: { id_pedido: 42, total: 2500.01, estado_actual: 'Pendiente de Pago' },
    });

    await confirmarPedido(puerto, entrada({ monto: 2500.007 }));

    expect(comprobantesRegistrados[0].monto).toBe(2500.01);
  });
});

describe('T5 · el monto lo declara el Cliente y no se completa solo', () => {
  it('si el monto no coincide con el total de la base, no sube nada y devuelve el total real', async () => {
    const { puerto, llamadas } = puertoFalso();

    const resultado = await confirmarPedido(puerto, entrada({ monto: 1000 }));

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('monto-no-coincide');
    expect(resultado.total).toBe(2500);
    expect(resultado.mensaje).toMatch(/monto|importe/i);
    expect(resultado.idPedido).toBe(42);
    expect(llamadas).not.toContain('subirArchivo');
    expect(llamadas).not.toContain('registrarComprobante');
  });
});

describe('T5 · reintento sin duplicar', () => {
  it('con idPedido no vuelve a crear el pedido ni a resolver el Cliente', async () => {
    const { puerto, llamadas } = puertoFalso();

    const resultado = await confirmarPedido(puerto, entrada({ idPedido: 42, monto: 2500 }));

    expect(llamadas).toEqual(['buscarPedido', 'comprobantePendiente', 'subirArchivo', 'registrarComprobante']);
    expect(resultado.estado).toBe('ok');
  });

  it('reemplaza el comprobante pendiente en la misma fila', async () => {
    const { puerto, comprobantesRegistrados } = puertoFalso({
      comprobantePendiente: { id_comprobante: 7 },
    });

    const resultado = await confirmarPedido(puerto, entrada({ idPedido: 42, monto: 2500 }));

    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado.numeroDeComprobante).toBe(7);
    expect(comprobantesRegistrados[0].idComprobante).toBe(7);
  });

  it('no reintenta un pedido que ya no está pendiente de pago', async () => {
    const { puerto, llamadas } = puertoFalso({
      pedido: { id_pedido: 42, total: 2500, estado_actual: 'Pago Validado' },
    });

    const resultado = await confirmarPedido(puerto, entrada({ idPedido: 42, monto: 2500 }));

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('pedido-no-pendiente');
    expect(llamadas).not.toContain('subirArchivo');
  });

  it('si el pedido no existe, lo dice sin inventar uno nuevo', async () => {
    const { puerto, llamadas } = puertoFalso();
    const sinPedido: PuertoCheckout = { ...puerto, async buscarPedido() { llamadas.push('buscarPedido'); return null; } };

    const resultado = await confirmarPedido(sinPedido, entrada({ idPedido: 999, monto: 2500 }));

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('pedido-no-pendiente');
    expect(llamadas).not.toContain('crearPedido');
  });
});

describe('T5 · errores de la base con mensaje del dominio', () => {
  it('mapea stock insuficiente sin tocar el carrito del Cliente', async () => {
    const { puerto, llamadas } = puertoFalso({
      falla: { en: 'crearPedido', error: { code: 'ET001', message: 'stock insuficiente para Jabón' } },
    });

    const resultado = await confirmarPedido(puerto, entrada({ monto: 2500 }));

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('stock-insuficiente');
    expect(resultado.mensaje).toMatch(/stock/i);
    expect(llamadas).not.toContain('subirArchivo');
  });

  it('mapea producto inexistente o inactivo', async () => {
    const { puerto } = puertoFalso({
      falla: { en: 'crearPedido', error: { code: 'ET002', message: 'producto 9 no está disponible' } },
    });

    const resultado = await confirmarPedido(puerto, entrada({ monto: 2500 }));

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('producto-no-disponible');
  });

  it('mapea una falla de subida sin perder el pedido ya creado', async () => {
    const { puerto } = puertoFalso({
      falla: { en: 'subirArchivo', error: new Error('NoSuchBucket') },
    });

    const resultado = await confirmarPedido(puerto, entrada({ monto: 2500 }));

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.idPedido).toBe(42);
    expect(resultado.mensaje).toMatch(/comprobante/i);
  });
});

describe('T5 · la clave del objeto no sale del bucket', () => {
  it('sanea el nombre del archivo: sin rutas ni ".."', async () => {
    const { puerto, clavesSubidas } = puertoFalso();

    await confirmarPedido(puerto, entrada({ monto: 2500, archivo: archivo({ nombre: '../../etc/Passwd Final.PNG' }) }));

    expect(clavesSubidas[0]).toBe('comprobantes/42/passwd-final.png');
    expect(clavesSubidas[0]).not.toContain('..');
  });

  it('si el nombre no deja nada usable, usa uno propio', async () => {
    const { puerto, clavesSubidas } = puertoFalso();

    await confirmarPedido(puerto, entrada({ monto: 2500, archivo: archivo({ nombre: '...' }) }));

    expect(clavesSubidas[0]).toBe('comprobantes/42/comprobante.png');
  });
});

describe('#34 · el total que se muestra en el resumen', () => {
  it('antes de confirmar manda el total del carrito', () => {
    expect(totalAVisualizar(null, 2500)).toBe(2500);
  });

  it('apenas la base devuelve su total, ese número manda', () => {
    // El caso que originó el hallazgo: tras `monto-no-coincide` el pedido vale 3000, no 2500.
    expect(totalAVisualizar(3000, 2500)).toBe(3000);
  });

  it('un total de la base en cero sigue siendo un número de la base', () => {
    expect(totalAVisualizar(0, 2500)).toBe(0);
  });

  it('la pantalla muestra el total de la base y no el del carrito', () => {
    const pagina = leer('src/app/checkout/page.tsx');
    expect(pagina).toMatch(/totalAVisualizar\(/);
    expect(pagina).toMatch(/setTotalDeLaBase\(cuerpo\.total\)/);
    // El bug era renderizar el total del carrito en el resumen de la transferencia.
    expect(pagina).not.toMatch(/\{formatPrice\(total\)\}/);
  });
});

describe('#46 · el borde del cliente valida la respuesta, no la castea', () => {
  it('el camino feliz sigue igual: el mismo cuerpo que responde la ruta se entiende', async () => {
    const { puerto } = puertoFalso();
    const resultado = await confirmarPedido(puerto, entrada({ monto: 2500 }));
    const cuerpo = JSON.stringify(resultado);

    expect(leerRespuestaCheckout(cuerpo)).toEqual(resultado);
  });

  it('el error del dominio con total también se entiende', () => {
    const cuerpo = JSON.stringify({
      estado: 'error',
      motivo: 'monto-no-coincide',
      mensaje: 'El importe tiene que coincidir con el total del pedido.',
      total: 3000,
      idPedido: 42,
      campos: { monto: 'Revisá el monto.' },
    });

    const leido = leerRespuestaCheckout(cuerpo);
    expect(leido?.estado).toBe('error');
    if (leido?.estado !== 'error') return;
    expect(leido.total).toBe(3000);
    expect(leido.idPedido).toBe(42);
  });

  it('un cuerpo inesperado devuelve nulo en vez de explotar', () => {
    expect(leerRespuestaCheckout('no es json')).toBeNull();
    expect(leerRespuestaCheckout('')).toBeNull();
    expect(leerRespuestaCheckout('[]')).toBeNull();
    expect(leerRespuestaCheckout('null')).toBeNull();
    expect(leerRespuestaCheckout('{"estado":"ok"}')).toBeNull();
    expect(leerRespuestaCheckout('{"estado":"error"}')).toBeNull();
    expect(
      leerRespuestaCheckout('{"estado":"error","motivo":"inventado","mensaje":"hola"}'),
    ).toBeNull();
    expect(
      leerRespuestaCheckout('{"estado":"ok","idPedido":"42","total":"2500","numeroDeComprobante":9}'),
    ).toBeNull();
  });

  it('el esquema que valida el borde es el que define el contrato', () => {
    const modulo = leer('src/lib/checkout.ts');
    expect(modulo).toMatch(/ESQUEMA_RESULTADO_CHECKOUT/);
    expect(modulo).toMatch(/z\.infer<typeof ESQUEMA_RESULTADO_CHECKOUT>/);
    // El tipo no se escribe a mano: sale del esquema.
    expect(modulo).not.toMatch(/export type ResultadoCheckout = \{/);
  });

  it('la pantalla valida el cuerpo y no lo castea', () => {
    const pagina = leer('src/app/checkout/page.tsx');
    expect(pagina).toMatch(/leerRespuestaCheckout\(/);
    expect(pagina).toMatch(/respuesta\.text\(\)/);
    expect(pagina).not.toMatch(/as ResultadoCheckout/);
    expect(pagina).not.toMatch(/await respuesta\.json\(\)/);
  });
});

describe('T5 · borde HTTP y retiro del camino legacy', () => {
  it('existe una sola ruta de checkout, server-side', () => {
    expect(existsSync(join(RAIZ, 'src/app/api/checkout/route.ts'))).toBe(true);
    expect(leer('src/app/api/checkout/route.ts')).toMatch(/confirmarPedido\(/);
    expect(leer('src/app/api/checkout/route.ts')).not.toMatch(/SERVICE_ROLE_KEY/);
  });

  it('el camino legacy de compra se retiró del repo', () => {
    for (const retirado of [
      'src/app/api/orders',
      'src/app/api/verify-payment',
      'src/services/order.service.ts',
      'src/lib/schemas.ts',
      'src/components/ReceiptUploader.tsx',
    ]) {
      expect(existsSync(join(RAIZ, retirado))).toBe(false);
    }
  });

  it('ninguna fuente del front importa el camino legacy de compra', () => {
    const ofensores = archivosFuente(join(RAIZ, 'src'))
      .filter((ruta) => /order\.service|@\/lib\/schemas|api\/orders|verify-payment|ReceiptUploader/.test(readFileSync(ruta, 'utf8')))
      .map((ruta) => relative(RAIZ, ruta).replace(/\\/g, '/'));
    expect(ofensores).toEqual([]);
  });

  it('la key de servicio no aparece en el cliente', () => {
    const page = leer('src/app/checkout/page.tsx');
    expect(page).toMatch(/use client/);
    expect(page).not.toMatch(/SERVICE_ROLE|service_role/);
  });
});
