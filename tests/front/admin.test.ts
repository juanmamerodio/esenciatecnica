import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIMITES_DE_ARCHIVO } from '../../src/lib/archivo';
import { crearPanel, type ArchivoDeFoto, type PuertoAdmin } from '../../src/lib/admin';
import { revisarBasicAuth } from '../../src/lib/admin-auth';
import { RAIZ, archivosFuente, leer } from './ayudantes';

/**
 * T7 · Panel `/admin` (issue #13).
 *
 * El seam es el módulo puro `src/lib/admin.ts` con un `PuertoAdmin` falso: sin DOM, sin red y sin
 * Supabase. Se verifica la **validación del borde antes de llamar al puerto**, que aprobar y
 * rechazar van a los RPC del dominio (la regla no se reimplementa en el front), que los códigos
 * `ET001`/`ET004`/`ET005`/`ET006` llegan como mensajes del dominio, que la baja de producto es
 * lógica y que la clave de la foto se sanea.
 *
 * La autenticación se testea sobre `revisarBasicAuth`, el módulo puro que decide; el middleware
 * sólo lo invoca y se cubre con aserciones estructurales.
 */

// ── Fixtures del contrato canónico ─────────────────────────────────────────────

const FILA_PEDIDO = {
  id_pedido: 42,
  fecha: '2026-10-23T10:00:00-03:00',
  total: 2500,
  estado_actual: 'Pendiente de Pago',
  cliente: { nombre: 'Juan Pérez', email: 'juan@ejemplo.com' },
  detalle: [
    { id_producto: 1, nombre: 'Jabón de avena', cantidad: 2, precio_unitario: 1250, subtotal: 2500 },
  ],
  comprobantes: [
    {
      id_comprobante: 7,
      monto: 2500,
      estado_actual: 'Comprobante Subido',
      foto_url: 'comprobantes/42/transferencia.png',
    },
  ],
  remito: null,
};

const FILA_STOCK = {
  id_stock: 3,
  id_producto: 1,
  nombre: 'Jabón de avena',
  categoria: 'Cosmética',
  tipo: 'Emulsión',
  descripcion: 'Jabón elaborado con avena.',
  precio: 1250,
  tiempo_produccion: 2,
  activo: true,
  imagen_url: null,
  cantidad_actual: 10,
  cantidad_reservada: 2,
  cantidad_warning: 3,
  /** La alerta la decide la base: la fila trae si hay una alerta sin atender para ese stock (#36). */
  alerta_pendiente: false,
};

const FILA_ALERTA = {
  id_alerta: 5,
  id_stock: 3,
  id_producto: 1,
  nombre: 'Jabón de avena',
  fecha: '2026-10-24T09:00:00-03:00',
  mensaje: 'Stock bajo: quedan 2 unidades disponibles (umbral 3).',
  atendida: false,
};

function foto(overrides: Partial<ArchivoDeFoto> = {}): ArchivoDeFoto {
  return {
    nombre: 'foto.png',
    tipo: 'image/png',
    tamano: 1024,
    bytes: new Uint8Array([1, 2, 3]),
    ...overrides,
  };
}

/** Error de PostgreSQL con su `errcode` del dominio (migración 02). */
function errorDeLaBase(codigo: string): unknown {
  return { code: codigo, message: `error crudo de PostgreSQL: ${codigo}` };
}

// ── Puerto falso: registra las llamadas y no toca nada real ────────────────────

type MetodoDelPuerto =
  | 'leerPedidos'
  | 'leerStock'
  | 'leerAlertas'
  | 'firmarComprobante'
  | 'aprobarComprobante'
  | 'rechazarComprobante'
  | 'actualizarStock'
  | 'crearProducto'
  | 'actualizarProducto'
  | 'cambiarActividad'
  | 'subirFoto'
  | 'atenderAlerta';

type EstadoFalso = {
  falla: { en: MetodoDelPuerto; error: unknown } | null;
  firmaFalla: boolean;
  pedidos: unknown[] | null;
  stock: unknown[] | null;
  alertas: unknown[] | null;
  errorDeLectura: unknown;
};

function puertoFalso(overrides: Partial<EstadoFalso> = {}) {
  const llamadas: MetodoDelPuerto[] = [];
  const recibido: Record<string, unknown> = {};
  const clavesSubidas: string[] = [];

  const estado: EstadoFalso = {
    falla: null,
    firmaFalla: false,
    pedidos: [FILA_PEDIDO],
    stock: [FILA_STOCK],
    alertas: [FILA_ALERTA],
    errorDeLectura: null,
    ...overrides,
  };

  function fallar(metodo: MetodoDelPuerto): void {
    if (estado.falla?.en === metodo) throw estado.falla.error;
  }

  const puerto: PuertoAdmin = {
    async leerPedidos() {
      llamadas.push('leerPedidos');
      if (estado.errorDeLectura) return { filas: null, error: estado.errorDeLectura };
      return { filas: estado.pedidos, error: null };
    },
    async leerStock() {
      llamadas.push('leerStock');
      if (estado.errorDeLectura) return { filas: null, error: estado.errorDeLectura };
      return { filas: estado.stock, error: null };
    },
    async leerAlertas() {
      llamadas.push('leerAlertas');
      if (estado.errorDeLectura) return { filas: null, error: estado.errorDeLectura };
      return { filas: estado.alertas, error: null };
    },
    async firmarComprobante(clave: string) {
      llamadas.push('firmarComprobante');
      if (estado.firmaFalla) throw new Error('storage: no se pudo firmar');
      return `https://storage.test/${clave}?token=firma`;
    },
    async aprobarComprobante(idComprobante: number) {
      llamadas.push('aprobarComprobante');
      fallar('aprobarComprobante');
      recibido.aprobarComprobante = idComprobante;
      return { numero: 'R-2026-000001', total: 2500 };
    },
    async rechazarComprobante(idComprobante: number) {
      llamadas.push('rechazarComprobante');
      fallar('rechazarComprobante');
      recibido.rechazarComprobante = idComprobante;
      return { estado_actual: 'Rechazado' as const };
    },
    async actualizarStock(idProducto: number, datos) {
      llamadas.push('actualizarStock');
      fallar('actualizarStock');
      recibido.actualizarStock = { idProducto, ...datos };
      return {
        id_producto: idProducto,
        cantidad_actual: datos.cantidad_actual,
        cantidad_reservada: 2,
        cantidad_warning: datos.cantidad_warning,
      };
    },
    async crearProducto(datos) {
      llamadas.push('crearProducto');
      fallar('crearProducto');
      recibido.crearProducto = datos;
      return { id_producto: 99 };
    },
    async actualizarProducto(idProducto: number, datos) {
      llamadas.push('actualizarProducto');
      fallar('actualizarProducto');
      recibido.actualizarProducto = { idProducto, ...datos };
    },
    async cambiarActividad(idProducto: number, activo: boolean) {
      llamadas.push('cambiarActividad');
      fallar('cambiarActividad');
      recibido.cambiarActividad = { idProducto, activo };
    },
    async subirFoto(idProducto: number, clave: string) {
      llamadas.push('subirFoto');
      fallar('subirFoto');
      clavesSubidas.push(clave);
      recibido.subirFoto = { idProducto, clave };
      return { url: `https://storage.test/object/public/${clave}` };
    },
    async atenderAlerta(idAlerta: number) {
      llamadas.push('atenderAlerta');
      fallar('atenderAlerta');
      recibido.atenderAlerta = idAlerta;
    },
  };

  return { puerto, llamadas, recibido, clavesSubidas, estado };
}

const DATOS_DE_PRODUCTO = {
  nombre: '  Crema de caléndula  ',
  categoria: 'Cosmética',
  tipo: 'Crema',
  descripcion: 'Crema corporal.',
  precio: 1800.5,
  tiempo_produccion: 3,
};

// ── HU-6 y HU-8 · validación del borde antes de tocar la base ─────────────────

describe('T7 · el módulo valida el borde antes de llamar al puerto', () => {
  it('rechaza una cantidad de stock o un umbral negativos', async () => {
    const { puerto, llamadas } = puertoFalso();
    const panel = crearPanel(puerto);

    const negativo = await panel.editarStock(1, { cantidad_actual: -1, cantidad_warning: 3 });
    const umbral = await panel.editarStock(1, { cantidad_actual: 5, cantidad_warning: -2 });

    expect(negativo.estado).toBe('error');
    if (negativo.estado !== 'error') return;
    expect(negativo.motivo).toBe('datos-invalidos');
    expect(negativo.campos?.cantidad_actual).toBeTruthy();
    expect(umbral.estado).toBe('error');
    expect(llamadas).toEqual([]);
  });

  it('rechaza una cantidad de stock que no es un entero', async () => {
    const { puerto, llamadas } = puertoFalso();

    const resultado = await crearPanel(puerto).editarStock(1, {
      cantidad_actual: 2.5,
      cantidad_warning: 1,
    });

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.campos?.cantidad_actual).toBeTruthy();
    expect(llamadas).toEqual([]);
  });

  it('un campo de stock vacío no se interpreta como cero', async () => {
    const { puerto, llamadas } = puertoFalso();

    const resultado = await crearPanel(puerto).editarStock(1, {
      cantidad_actual: '',
      cantidad_warning: '3',
    });

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.campos?.cantidad_actual).toBeTruthy();
    expect(llamadas).toEqual([]);
  });

  it('rechaza un producto sin nombre o sin precio mayor que cero', async () => {
    const { puerto, llamadas } = puertoFalso();
    const panel = crearPanel(puerto);

    const sinNombre = await panel.crearProducto({ ...DATOS_DE_PRODUCTO, nombre: '   ' });
    const sinPrecio = await panel.crearProducto({ ...DATOS_DE_PRODUCTO, precio: 0 });
    const precioIlegible = await panel.crearProducto({ ...DATOS_DE_PRODUCTO, precio: 'nada' });
    const sinCategoria = await panel.crearProducto({ ...DATOS_DE_PRODUCTO, categoria: '' });

    for (const resultado of [sinNombre, sinPrecio, precioIlegible, sinCategoria]) {
      expect(resultado.estado).toBe('error');
      if (resultado.estado !== 'error') return;
      expect(resultado.motivo).toBe('datos-invalidos');
    }
    expect(llamadas).toEqual([]);
  });

  it('rechaza una foto de otro tipo o más grande que el límite del bucket, antes de subir nada', async () => {
    const { puerto, llamadas } = puertoFalso();
    const panel = crearPanel(puerto);

    const pdf = await panel.subirFotoProducto(1, foto({ tipo: 'application/pdf' }));
    const enorme = await panel.subirFotoProducto(1, foto({ tamano: LIMITES_DE_ARCHIVO.tamanoMaximo + 1 }));
    const vacia = await panel.subirFotoProducto(1, foto({ tamano: 0, bytes: new Uint8Array() }));

    expect(pdf.estado).toBe('error');
    if (pdf.estado === 'error') expect(pdf.mensaje).toMatch(/PNG, JPEG o WebP/);
    expect(enorme.estado).toBe('error');
    if (enorme.estado === 'error') expect(enorme.mensaje).toMatch(/5 MB/);
    expect(vacia.estado).toBe('error');
    expect(llamadas).toEqual([]);
  });

  it('acepta los tres formatos del bucket de fotos', async () => {
    for (const tipo of LIMITES_DE_ARCHIVO.tipos) {
      const { puerto, llamadas } = puertoFalso();
      const resultado = await crearPanel(puerto).subirFotoProducto(
        1,
        foto({ tipo, nombre: `foto.${tipo.split('/')[1]}` }),
      );
      expect(resultado.estado).toBe('ok');
      expect(llamadas).toContain('subirFoto');
    }
  });

  it('rechaza una decisión que no es aprobar ni rechazar, y un comprobante inexistente', async () => {
    const { puerto, llamadas } = puertoFalso();
    const panel = crearPanel(puerto);

    const decision = await panel.decidirComprobante(7, 'cancelar');
    const idInvalido = await panel.decidirComprobante(0, 'aprobar');

    expect(decision.estado).toBe('error');
    if (decision.estado !== 'error') return;
    expect(decision.campos?.decision).toBeTruthy();
    expect(idInvalido.estado).toBe('error');
    expect(llamadas).toEqual([]);
  });

  it('rechaza una alerta sin identificador válido', async () => {
    const { puerto, llamadas } = puertoFalso();

    const resultado = await crearPanel(puerto).atenderAlerta('nada');

    expect(resultado.estado).toBe('error');
    expect(llamadas).toEqual([]);
  });
});

// ── HU-3, HU-4 y HU-5 · la decisión la toma la base ───────────────────────────

describe('T7 · aprobar y rechazar llaman a los RPC del dominio', () => {
  it('aprobar va al RPC, devuelve el remito emitido y no toca el stock desde el front', async () => {
    const { puerto, llamadas, recibido } = puertoFalso();

    const resultado = await crearPanel(puerto).decidirComprobante(7, 'aprobar');

    expect(llamadas).toEqual(['aprobarComprobante']);
    expect(recibido.aprobarComprobante).toBe(7);
    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado.decision).toBe('aprobar');
    expect(resultado.estadoPedido).toBe('Pago Validado');
    expect(resultado.remito).toEqual({ numero: 'R-2026-000001', total: 2500 });
  });

  it('rechazar va al RPC de rechazo y reporta el estado que devolvió la base', async () => {
    const { puerto, llamadas, recibido } = puertoFalso();

    const resultado = await crearPanel(puerto).decidirComprobante(7, 'rechazar');

    expect(llamadas).toEqual(['rechazarComprobante']);
    expect(recibido.rechazarComprobante).toBe(7);
    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado.decision).toBe('rechazar');
    expect(resultado.estadoPedido).toBe('Rechazado');
    expect(resultado.remito).toBeNull();
  });

  it('un monto que no coincide llega como mensaje del dominio y no cambia el stock', async () => {
    const { puerto, llamadas } = puertoFalso({
      falla: { en: 'aprobarComprobante', error: errorDeLaBase('ET005') },
    });

    const resultado = await crearPanel(puerto).decidirComprobante(7, 'aprobar');

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('monto-no-coincide');
    expect(resultado.mensaje).toMatch(/monto/i);
    expect(resultado.mensaje).not.toMatch(/ET005/);
    expect(llamadas).toEqual(['aprobarComprobante']);
    expect(llamadas).not.toContain('actualizarStock');
  });

  it('traduce ET001, ET004 y ET006 a mensajes del dominio', async () => {
    const casos: Array<{ codigo: string; motivo: string }> = [
      { codigo: 'ET001', motivo: 'stock-insuficiente' },
      { codigo: 'ET004', motivo: 'comprobante-no-pendiente' },
      { codigo: 'ET006', motivo: 'pedido-no-pendiente' },
    ];

    for (const caso of casos) {
      const { puerto } = puertoFalso({
        falla: { en: 'aprobarComprobante', error: errorDeLaBase(caso.codigo) },
      });

      const resultado = await crearPanel(puerto).decidirComprobante(7, 'aprobar');

      expect(resultado.estado).toBe('error');
      if (resultado.estado !== 'error') return;
      expect(resultado.motivo).toBe(caso.motivo);
      expect(resultado.mensaje).not.toMatch(new RegExp(caso.codigo));
    }
  });

  it('traduce ET007, 23505 y 23514 a mensajes del dominio (issue #17)', async () => {
    const bajoReserva = puertoFalso({
      falla: { en: 'actualizarStock', error: errorDeLaBase('ET007') },
    });
    const et007 = await crearPanel(bajoReserva.puerto).editarStock(1, {
      cantidad_actual: 1,
      cantidad_warning: 1,
    });

    expect(et007.estado).toBe('error');
    if (et007.estado !== 'error') return;
    expect(et007.motivo).toBe('stock-bajo-reserva');
    expect(et007.campos?.cantidad_actual).toMatch(/reservad/i);
    expect(et007.mensaje).toMatch(/reservad/i);
    expect(et007.mensaje).not.toMatch(/ET007/);

    const nombreRepetido = puertoFalso({
      falla: { en: 'crearProducto', error: errorDeLaBase('23505') },
    });
    const duplicado = await crearPanel(nombreRepetido.puerto).crearProducto(DATOS_DE_PRODUCTO);

    expect(duplicado.estado).toBe('error');
    if (duplicado.estado !== 'error') return;
    expect(duplicado.motivo).toBe('nombre-duplicado');
    expect(duplicado.campos?.nombre).toMatch(/nombre/i);
    expect(duplicado.mensaje).not.toMatch(/23505/);

    const checkGenerico = puertoFalso({
      falla: { en: 'actualizarProducto', error: errorDeLaBase('23514') },
    });
    const otroCheck = await crearPanel(checkGenerico.puerto).actualizarProducto(
      1,
      DATOS_DE_PRODUCTO,
    );

    expect(otroCheck.estado).toBe('error');
    if (otroCheck.estado !== 'error') return;
    expect(otroCheck.motivo).toBe('datos-invalidos');
    expect(otroCheck.mensaje).not.toMatch(/23514/);
    expect(otroCheck.mensaje).toMatch(/reglas|datos/i);

    // Un 23505 fuera del alta/edición de producto no es "nombre duplicado": hay otros índices
    // únicos en el modelo (cliente, comprobante pendiente, remito, alerta, detalle).
    const otroUnico = puertoFalso({
      falla: { en: 'atenderAlerta', error: errorDeLaBase('23505') },
    });
    const duplicadoAjeno = await crearPanel(otroUnico.puerto).atenderAlerta(5);

    expect(duplicadoAjeno.estado).toBe('error');
    if (duplicadoAjeno.estado !== 'error') return;
    expect(duplicadoAjeno.motivo).toBe('datos-duplicados');
    expect(duplicadoAjeno.mensaje).not.toMatch(/producto activo/i);
    expect(duplicadoAjeno.mensaje).toMatch(/ya existe|datos/i);
  });

  it('una falla que no es del dominio queda como error del servidor con su propio mensaje', async () => {
    const { puerto } = puertoFalso({
      falla: { en: 'rechazarComprobante', error: new Error('connection refused') },
    });

    const resultado = await crearPanel(puerto).decidirComprobante(7, 'rechazar');

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('error-del-servidor');
    expect(resultado.mensaje).not.toMatch(/connection refused/);
  });
});

// ── HU-6 y HU-7 · stock y alertas ─────────────────────────────────────────────

describe('T7 · stock editable y alertas en el panel', () => {
  it('editarStock devuelve el stock actualizado con su disponible recalculado', async () => {
    const { puerto, recibido } = puertoFalso();

    const resultado = await crearPanel(puerto).editarStock(1, {
      cantidad_actual: 20,
      cantidad_warning: 4,
    });

    expect(recibido.actualizarStock).toEqual({
      idProducto: 1,
      cantidad_actual: 20,
      cantidad_warning: 4,
    });
    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado.stock).toMatchObject({
      idProducto: 1,
      cantidadActual: 20,
      cantidadReservada: 2,
      cantidadWarning: 4,
      disponible: 18,
    });
  });

  it('una falla de la base al editar el stock se mapea a un mensaje del dominio', async () => {
    const { puerto } = puertoFalso({
      falla: { en: 'actualizarStock', error: errorDeLaBase('ET001') },
    });

    const resultado = await crearPanel(puerto).editarStock(1, {
      cantidad_actual: 3,
      cantidad_warning: 1,
    });

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('stock-insuficiente');
    expect(resultado.mensaje).toMatch(/stock/i);
  });

  it('stock() calcula el disponible y la alerta la toma de la base, no del umbral (#36)', async () => {
    const { puerto } = puertoFalso({
      stock: [
        // Disponible alto, sin alerta pendiente: sin alerta.
        {
          ...FILA_STOCK,
          id_producto: 1,
          cantidad_actual: 10,
          cantidad_reservada: 2,
          cantidad_warning: 3,
          alerta_pendiente: false,
        },
        // Disponible bajo y una alerta sin atender: con alerta.
        {
          ...FILA_STOCK,
          id_producto: 2,
          cantidad_actual: 3,
          cantidad_reservada: 1,
          cantidad_warning: 3,
          alerta_pendiente: true,
        },
        // Disponible bajo pero la alerta ya se atendió: **no** vuelve a pedir atención.
        {
          ...FILA_STOCK,
          id_producto: 3,
          cantidad_actual: 1,
          cantidad_reservada: 0,
          cantidad_warning: 3,
          alerta_pendiente: false,
        },
        // Sin umbral configurado y sin alerta pendiente: sin alerta.
        {
          ...FILA_STOCK,
          id_producto: 4,
          cantidad_actual: 1,
          cantidad_reservada: 0,
          cantidad_warning: 0,
          alerta_pendiente: false,
        },
      ],
    });

    const resultado = await crearPanel(puerto).stock();

    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado.stock.map((fila) => fila.disponible)).toEqual([8, 2, 1, 1]);
    expect(resultado.stock.map((fila) => fila.alerta)).toEqual([false, true, false, false]);
    expect(resultado.stock[1]).toMatchObject({
      idProducto: 2,
      nombre: 'Jabón de avena',
      activo: true,
      cantidadWarning: 3,
    });
  });

  it('el panel no recalcula la alerta: la fila y el popup salen de `alerta_de_estado` (#36)', () => {
    const modulo = leer('src/lib/admin.ts');
    expect(modulo).not.toMatch(/hayAlerta/);
    expect(modulo).toMatch(/alerta_pendiente/);

    const adaptador = leer('src/lib/admin-servidor.ts');
    expect(adaptador).toMatch(/alerta_de_estado/);
    expect(adaptador).toMatch(/atendida/);
  });

  it('atender una alerta la marca atendida sin borrarla', async () => {
    const { puerto, llamadas, recibido } = puertoFalso();

    const resultado = await crearPanel(puerto).atenderAlerta(5);

    expect(llamadas).toEqual(['atenderAlerta']);
    expect(recibido.atenderAlerta).toBe(5);
    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado).toMatchObject({ idAlerta: 5, atendida: true });
  });

  it('alertas() muestra primero las pendientes y conserva las atendidas', async () => {
    const { puerto } = puertoFalso({
      alertas: [
        { ...FILA_ALERTA, id_alerta: 6, atendida: true, fecha: '2026-10-25T09:00:00-03:00' },
        { ...FILA_ALERTA, id_alerta: 5, atendida: false, fecha: '2026-10-24T09:00:00-03:00' },
      ],
    });

    const resultado = await crearPanel(puerto).alertas();

    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado.alertas.map((alerta) => alerta.id)).toEqual([5, 6]);
    expect(resultado.alertas[0]).toMatchObject({
      nombreProducto: 'Jabón de avena',
      atendida: false,
      mensaje: FILA_ALERTA.mensaje,
    });
  });
});

// ── HU-8 · productos: alta, edición, baja lógica y foto ───────────────────────

describe('T7 · alta, edición y baja lógica de productos', () => {
  it('crearProducto normaliza los datos y devuelve el id que asignó la base', async () => {
    const { puerto, recibido } = puertoFalso();

    const resultado = await crearPanel(puerto).crearProducto(DATOS_DE_PRODUCTO);

    expect(recibido.crearProducto).toEqual({
      nombre: 'Crema de caléndula',
      categoria: 'Cosmética',
      tipo: 'Crema',
      descripcion: 'Crema corporal.',
      precio: 1800.5,
      tiempo_produccion: 3,
    });
    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado.idProducto).toBe(99);
  });

  it('actualizarProducto valida antes de llamar al puerto', async () => {
    const { puerto, recibido, llamadas } = puertoFalso();
    const panel = crearPanel(puerto);

    const invalido = await panel.actualizarProducto(1, { ...DATOS_DE_PRODUCTO, precio: -5 });
    expect(invalido.estado).toBe('error');
    expect(llamadas).toEqual([]);

    const resultado = await panel.actualizarProducto(1, DATOS_DE_PRODUCTO);
    expect(resultado.estado).toBe('ok');
    expect(recibido.actualizarProducto).toMatchObject({ idProducto: 1, precio: 1800.5 });
  });

  it('la baja es lógica: se cambia activo, nunca se borra la fila', async () => {
    const { puerto, recibido, llamadas } = puertoFalso();

    const resultado = await crearPanel(puerto).cambiarActividad(1, false);

    expect(llamadas).toEqual(['cambiarActividad']);
    expect(recibido.cambiarActividad).toEqual({ idProducto: 1, activo: false });
    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado).toMatchObject({ idProducto: 1, activo: false });
  });

  it('vuelve a publicar un producto dado de baja', async () => {
    const { puerto, recibido } = puertoFalso();

    const resultado = await crearPanel(puerto).cambiarActividad(1, true);

    expect(resultado.estado).toBe('ok');
    expect(recibido.cambiarActividad).toEqual({ idProducto: 1, activo: true });
  });
});

describe('T7 · la clave de la foto no sale de su carpeta', () => {
  it('sanea el nombre: sin rutas ni ".."', async () => {
    const { puerto, clavesSubidas } = puertoFalso();

    const resultado = await crearPanel(puerto).subirFotoProducto(
      5,
      foto({ nombre: '../../etc/Passwd Final.PNG' }),
    );

    expect(clavesSubidas).toEqual(['productos/5/passwd-final.png']);
    expect(clavesSubidas[0]).not.toContain('..');
    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado.url).toContain('productos/5/passwd-final.png');
  });

  it('si el nombre no deja nada usable, usa uno propio con la extensión del tipo', async () => {
    const { puerto, clavesSubidas } = puertoFalso();

    await crearPanel(puerto).subirFotoProducto(5, foto({ nombre: '...', tipo: 'image/webp' }));

    expect(clavesSubidas).toEqual(['productos/5/foto.webp']);
  });

  it('la clave queda bajo la carpeta del producto, sin barras del nombre original', async () => {
    const { puerto, clavesSubidas } = puertoFalso();

    await crearPanel(puerto).subirFotoProducto(
      9,
      foto({ nombre: 'fotos/2026/crema\\calendula.jpeg', tipo: 'image/jpeg' }),
    );

    expect(clavesSubidas[0]).toBe('productos/9/calendula.jpg');
    expect(clavesSubidas[0]).not.toMatch(/\.\./);
    expect(clavesSubidas[0].split('/').length).toBe(3);
  });
});

// ── HU-2 · lectura del panel y firma del comprobante ─────────────────────────

describe('T7 · lectura de pedidos y URL firmada', () => {
  it('pedidos() devuelve el estado actual, el comprobante firmado y el remito', async () => {
    const { puerto, llamadas } = puertoFalso({
      pedidos: [
        {
          ...FILA_PEDIDO,
          estado_actual: 'Pago Validado',
          comprobantes: [{ ...FILA_PEDIDO.comprobantes[0], estado_actual: 'Aprobado por Admin' }],
          remito: { numero: 'R-2026-000001', total: 2500 },
        },
      ],
    });

    const resultado = await crearPanel(puerto).pedidos();

    expect(llamadas).toContain('firmarComprobante');
    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    const pedido = resultado.pedidos[0];
    expect(pedido).toMatchObject({
      id: 42,
      estado: 'Pago Validado',
      total: 2500,
      cliente: { nombre: 'Juan Pérez', email: 'juan@ejemplo.com' },
      remito: { numero: 'R-2026-000001', total: 2500 },
    });
    expect(pedido.lineas[0]).toEqual({
      idProducto: 1,
      nombre: 'Jabón de avena',
      cantidad: 2,
      precioUnitario: 1250,
      subtotal: 2500,
    });
    expect(pedido.comprobantes[0].urlFirmada).toContain('token=firma');
    // La clave del objeto privado es del servidor: no viaja al navegador del panel (AGENTS §7.8).
    expect(pedido.comprobantes[0]).not.toHaveProperty('clave');
  });

  it('un comprobante que no se puede firmar no oculta el pedido', async () => {
    const { puerto } = puertoFalso({ firmaFalla: true });

    const resultado = await crearPanel(puerto).pedidos();

    expect(resultado.estado).toBe('ok');
    if (resultado.estado !== 'ok') return;
    expect(resultado.pedidos).toHaveLength(1);
    expect(resultado.pedidos[0].comprobantes[0].urlFirmada).toBeNull();
  });

  it('una fila que no cumple el contrato detiene la sección en vez de mostrar una lista incompleta', async () => {
    const { puerto } = puertoFalso({ pedidos: [{ id_pedido: 42, estado_actual: 'Pendiente de Pago' }] });

    const resultado = await crearPanel(puerto).pedidos();

    expect(resultado.estado).toBe('error');
    if (resultado.estado !== 'error') return;
    expect(resultado.motivo).toBe('datos-inconsistentes');
    expect(resultado.mensaje).toMatch(/contrato|inconsistente/i);
  });

  it('una falla de lectura se distingue de una tienda sin pedidos', async () => {
    const { puerto } = puertoFalso({ errorDeLectura: new Error('base no migrada') });
    const panel = crearPanel(puerto);

    const pedidos = await panel.pedidos();
    const stock = await panel.stock();
    const alertas = await panel.alertas();

    for (const resultado of [pedidos, stock, alertas]) {
      expect(resultado.estado).toBe('error');
    }
    const vacio = await crearPanel(puertoFalso({ pedidos: [], stock: [], alertas: [] }).puerto).pedidos();
    expect(vacio.estado).toBe('ok');
    if (vacio.estado !== 'ok') return;
    expect(vacio.pedidos).toEqual([]);
  });

  it('la superficie pública del panel no expone la firma suelta del comprobante (#34)', () => {
    const modulo = leer('src/lib/admin.ts');

    // El símbolo sin consumidor se retiró: si vuelve, este test falla.
    expect(modulo).not.toMatch(/urlFirmadaDelComprobante/);
    expect(modulo).not.toMatch(/ResultadoUrlFirmada/);
    expect(modulo).not.toMatch(/ESQUEMA_CLAVE/);

    // El panel sigue firmando dentro de su lectura de pedidos, que es su único consumidor real.
    expect(modulo).toMatch(/firmarComprobante/);
    expect(modulo).toMatch(/urlFirmada/);
  });
});

// ── HU-1 · Basic Auth ─────────────────────────────────────────────────────────

describe('T7 · Basic Auth del panel', () => {
  const CONTRASENA = 'secreta-del-panel';
  const CORRECTA = `Basic ${btoa('admin:secreta-del-panel')}`;

  it('sin encabezado no hay credenciales', () => {
    expect(revisarBasicAuth(null, CONTRASENA)).toBe('sin-credenciales');
    expect(revisarBasicAuth('', CONTRASENA)).toBe('sin-credenciales');
    expect(revisarBasicAuth('   ', CONTRASENA)).toBe('sin-credenciales');
  });

  it('un encabezado mal formado es inválido', () => {
    expect(revisarBasicAuth('Basic', CONTRASENA)).toBe('invalido');
    expect(revisarBasicAuth('Bearer abc123', CONTRASENA)).toBe('invalido');
    expect(revisarBasicAuth('Basic !!!no-es-base64!!!', CONTRASENA)).toBe('invalido');
    expect(revisarBasicAuth(`Basic ${btoa('sin-dos-puntos')}`, CONTRASENA)).toBe('invalido');
  });

  it('una contraseña incorrecta es inválida', () => {
    expect(revisarBasicAuth(`Basic ${btoa('admin:otra-cosa')}`, CONTRASENA)).toBe('invalido');
    expect(revisarBasicAuth(`Basic ${btoa('admin:')}`, CONTRASENA)).toBe('invalido');
  });

  it('la contraseña correcta entra, sin importar el nombre de usuario ni las mayúsculas del esquema', () => {
    expect(revisarBasicAuth(CORRECTA, CONTRASENA)).toBe('ok');
    expect(revisarBasicAuth(`basic ${btoa('admin:secreta-del-panel')}`, CONTRASENA)).toBe('ok');
    expect(revisarBasicAuth(`Basic ${btoa(':secreta-del-panel')}`, CONTRASENA)).toBe('ok');
  });

  it('acepta una contraseña con dos puntos y con acentos', () => {
    expect(revisarBasicAuth(`Basic ${btoa('admin:se:creta')}`, 'se:creta')).toBe('ok');
    const conAcentos = Buffer.from('admin:contraseña-ñ', 'utf8').toString('base64');
    expect(revisarBasicAuth(`Basic ${conAcentos}`, 'contraseña-ñ')).toBe('ok');
  });

  it('sin ADMIN_PASSWORD el panel no está configurado, aunque el encabezado sea correcto', () => {
    expect(revisarBasicAuth(CORRECTA, undefined)).toBe('sin-configurar');
    expect(revisarBasicAuth(CORRECTA, '')).toBe('sin-configurar');
    expect(revisarBasicAuth(null, undefined)).toBe('sin-configurar');
  });
});

// ── Estructura: middleware, secretos y retiro de la deuda legacy ──────────────

/** El middleware vive en `src/` (Next lo resuelve en la raíz de las páginas). */
function rutaDelMiddleware(): string | null {
  for (const candidato of ['src/middleware.ts', 'middleware.ts']) {
    if (existsSync(join(RAIZ, candidato))) return candidato;
  }
  return null;
}

function archivosCliente(): string[] {
  return archivosFuente(join(RAIZ, 'src')).filter((archivo) =>
    /^\s*["']use client["']/.test(readFileSync(archivo, 'utf8')),
  );
}

const RUTAS_DEL_PANEL = [
  'src/app/api/admin/comprobantes/route.ts',
  'src/app/api/admin/stock/route.ts',
  'src/app/api/admin/productos/route.ts',
  'src/app/api/admin/productos/foto/route.ts',
  'src/app/api/admin/alertas/route.ts',
];

const COMPONENTES_DEL_PANEL = [
  'src/components/admin/AvisoDeAlertas.tsx',
  'src/components/admin/PanelDePedidos.tsx',
  'src/components/admin/PanelDeStock.tsx',
  'src/components/admin/PanelDeProductos.tsx',
];

describe('T7 · estructura del panel y del borde', () => {
  it('el middleware del panel existe y su matcher cubre sólo /admin y /api/admin', () => {
    const ruta = rutaDelMiddleware();
    expect(ruta).not.toBeNull();
    if (!ruta) return;

    const fuente = leer(ruta);
    const matcher = fuente.match(/matcher:\s*\[([^\]]*)\]/);
    expect(matcher).not.toBeNull();

    const rutas = [...(matcher?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((encontrado) => encontrado[1]);
    expect(rutas).toEqual(['/admin/:path*', '/api/admin/:path*']);
    expect(fuente).toMatch(/revisarBasicAuth/);
    // Sin ADMIN_PASSWORD el borde dice que falta configuración, no que la clave es incorrecta.
    expect(fuente).toMatch(/503/);
  });

  it('el middleware no negocia idioma: T7 lo reintroduce sólo para autenticar', () => {
    const ruta = rutaDelMiddleware();
    expect(ruta).not.toBeNull();
    if (!ruta) return;

    expect(leer(ruta)).not.toMatch(/locale|i18n|negotiator|accept-language|dictionaries/i);
  });

  it('los secretos y el adaptador no aparecen en ningún archivo "use client"', () => {
    const ofensores = archivosCliente()
      .filter((archivo) => /SERVICE_ROLE|service_role|ADMIN_PASSWORD|admin-servidor/.test(readFileSync(archivo, 'utf8')))
      .map((archivo) => relative(RAIZ, archivo).replace(/\\/g, '/'));

    expect(ofensores).toEqual([]);
  });

  it('existe una ruta server-side por operación y ninguna devuelve la clave del bucket', () => {
    for (const ruta of RUTAS_DEL_PANEL) {
      expect(existsSync(join(RAIZ, ruta))).toBe(true);
      const fuente = leer(ruta);
      expect(fuente).not.toMatch(/use client/);
      expect(fuente).toMatch(/panelDelAdministrador\(/);
      expect(fuente).not.toMatch(/clave|foto_url|SERVICE_ROLE|ADMIN_PASSWORD/);
    }
  });

  it('el adaptador usa los RPC de la base y el módulo no habla con Supabase', () => {
    const adaptador = leer('src/lib/admin-servidor.ts');
    expect(adaptador).toMatch(/rpc\(\s*["']aprobar_comprobante["']/);
    expect(adaptador).toMatch(/rpc\(\s*["']rechazar_comprobante["']/);
    expect(adaptador).toMatch(/createSignedUrl|createSignedUrls/);

    const modulo = leer('src/lib/admin.ts');
    expect(modulo).not.toMatch(/supabase|SERVICE_ROLE|\.rpc\(/);
  });

  it('ningún camino del panel borra un producto: la baja es lógica', () => {
    for (const ruta of [
      'src/lib/admin.ts',
      'src/lib/admin-servidor.ts',
      'src/components/admin/PanelDeProductos.tsx',
    ]) {
      expect(leer(ruta)).not.toMatch(/\.delete\(|\bdelete from\b/i);
    }
  });

  it('/admin deja de ser el aviso de migración y lee el contrato canónico', () => {
    const pagina = leer('src/app/admin/page.tsx');
    expect(pagina).not.toMatch(/Panel en migración/);
    expect(pagina).not.toMatch(/use client/);
    expect(pagina).toMatch(/crearPanelServidor\(/);
    expect(pagina).toMatch(/force-dynamic/);
  });

  it('el panel tiene sus componentes cliente para las acciones', () => {
    for (const ruta of COMPONENTES_DEL_PANEL) {
      expect(existsSync(join(RAIZ, ruta))).toBe(true);
      const fuente = leer(ruta);
      expect(fuente).toMatch(/^\s*["']use client["']/);
      expect(fuente).toMatch(/\/api\/admin\//);
    }

    // La alerta de stock es un aviso del panel, nunca un email al Administrador.
    const alertas = leer('src/components/admin/AvisoDeAlertas.tsx');
    expect(alertas).toMatch(/role="alert"/);
    expect(alertas).not.toMatch(/resend|nodemailer/i);

    // Aprobar y rechazar confirman mostrando el monto.
    const pedidos = leer('src/components/admin/PanelDePedidos.tsx');
    expect(pedidos).toMatch(/role="alert"/);
    expect(pedidos).toMatch(/monto/i);
    expect(pedidos).toMatch(/confirmar/i);
  });

  it('la deuda legacy del esquema viejo se retiró del repo', () => {
    expect(existsSync(join(RAIZ, 'src/lib/supabase.ts'))).toBe(false);
    expect(existsSync(join(RAIZ, 'src/app/api/sync-sheets'))).toBe(false);

    const ofensores = archivosFuente(join(RAIZ, 'src'))
      .filter((archivo) => /@\/lib\/supabase|api\/sync-sheets/.test(readFileSync(archivo, 'utf8')))
      .map((archivo) => relative(RAIZ, archivo).replace(/\\/g, '/'));

    expect(ofensores).toEqual([]);
    // El catálogo canónico en JSON no era deuda legacy: se conserva.
    expect(existsSync(join(RAIZ, 'src/app/api/products/route.ts'))).toBe(true);
  });
});
