import { describe, expect, it } from 'vitest';
import {
  BUCKETS,
  COLUMNAS_LEGACY,
  COLUMNAS_PUBLICAS,
  COLUMNAS_VISTA,
  RPC,
  TABLAS_CERRADAS,
  TABLAS_LEGACY_AUSENTES,
  columnasFaltantes,
  columnasProhibidas,
  esPermisoDenegado,
  evaluarEscrituraCerrada,
  evaluarLecturaCerrada,
  evaluarRpc,
  evaluarBucket,
} from '../../scripts/bd-viva-reglas.mjs';
import { leer } from './ayudantes';

/**
 * B2 · `bd:viva` prueba toda la superficie pública (issue #21).
 *
 * `npm test` corre en PGlite y queda verde con la base rota: este script es el único control que
 * mira `otjph`. Acá se testea la **decisión** de cada control con entradas literales (el script no
 * se conecta en los tests); el proyecto vivo se verifica con `npm run bd:viva`.
 *
 * La trampa que originó el ticket: un `200 []` con RLS apagada parece "sin datos" y es una fuga.
 * Sólo `401`/`403` prueban que la tabla está cerrada.
 */

describe('B2 · la matriz de tablas cerradas es la del contrato', () => {
  it('cubre las diez tablas cerradas de la spec bd-mvp §3.6', () => {
    expect([...TABLAS_CERRADAS].sort()).toEqual([
      'admin',
      'alerta_de_estado',
      'cliente',
      'comprobante',
      'detalle_del_pedido',
      'estados_comprobante',
      'estados_pedidos',
      'pedido',
      'remitos_de_venta',
      'roll',
    ]);
  });

  it('las tablas retiradas incluyen detalle_carrito', () => {
    expect(TABLAS_LEGACY_AUSENTES).toEqual(
      expect.arrayContaining(['productos', 'pedidos', 'verificaciones', 'detalle_carrito']),
    );
  });

  it('la vista expone exactamente las doce columnas del contrato', () => {
    expect(COLUMNAS_VISTA).toEqual([
      'id_producto',
      'nombre',
      'categoria',
      'tipo',
      'descripcion',
      'precio',
      'tiempo_produccion',
      'imagen_url',
      'cantidad_actual',
      'cantidad_reservada',
      'disponible',
      'cantidad_warning',
    ]);
    expect(COLUMNAS_VISTA).not.toContain('activo');
    expect(COLUMNAS_VISTA).not.toContain('stock_actual');
  });

  it('las columnas legacy que sobran quedan nombradas, incluida detalle_del_pedido.id_detalle', () => {
    expect(COLUMNAS_LEGACY.stock).toContain('porcentaje');
    expect(COLUMNAS_LEGACY.vista_catalogo).toEqual(
      expect.arrayContaining(['stock_actual', 'stock_warning', 'porcentaje', 'activo']),
    );
    expect(COLUMNAS_LEGACY.detalle_del_pedido).toContain('id_detalle');
    expect(COLUMNAS_PUBLICAS).toEqual(expect.arrayContaining(['producto', 'stock', 'vista_catalogo']));
  });

  it('declara los dos buckets y las cuatro RPC', () => {
    expect(BUCKETS).toEqual(['comprobantes', 'productos']);
    expect(Object.keys(RPC).sort()).toEqual([
      'aprobar_comprobante',
      'cancelar_pedidos_vencidos',
      'crear_pedido',
      'rechazar_comprobante',
    ]);
  });
});

describe('B2 · las decisiones no confunden cerrar con estar vacío', () => {
  it('un 200 vacío no prueba RLS: la lectura cerrada falla', () => {
    expect(esPermisoDenegado(200)).toBe(false);
    expect(esPermisoDenegado(401)).toBe(true);
    expect(esPermisoDenegado(403)).toBe(true);

    const fuga = evaluarLecturaCerrada(200);
    expect(fuga.ok).toBe(false);
    expect(fuga.motivo).toMatch(/200/);

    expect(evaluarLecturaCerrada(401).ok).toBe(true);
    expect(evaluarLecturaCerrada(403).ok).toBe(true);
  });

  it('una tabla de dominio ausente no se acepta como "cerrada"', () => {
    const ausente = evaluarLecturaCerrada(404);
    expect(ausente.ok).toBe(false);
    expect(ausente.motivo).toMatch(/no existe|404/i);
  });

  it('admin y roll pueden no existir (fase 2) sin ser una fuga', () => {
    expect(evaluarLecturaCerrada(404, { permitirAusente: true }).ok).toBe(true);
  });

  it('la escritura anónima exige 401/403', () => {
    expect(evaluarEscrituraCerrada(401).ok).toBe(true);
    expect(evaluarEscrituraCerrada(403).ok).toBe(true);
    expect(evaluarEscrituraCerrada(200).ok).toBe(false);
    expect(evaluarEscrituraCerrada(404).ok).toBe(false);
  });

  it('una RPC existe sólo si la anon key no puede ejecutarla', () => {
    expect(evaluarRpc(404, { code: 'PGRST202' }).ok).toBe(false);
    expect(evaluarRpc(404).ok).toBe(false);
    expect(evaluarRpc(401).ok).toBe(true);
    expect(evaluarRpc(403).ok).toBe(true);
    expect(evaluarRpc(204).ok).toBe(false);
    expect(evaluarRpc(200).ok).toBe(false);
  });

  it('el cron se detecta sin ejecutarlo: el read-only prueba que anon tiene EXECUTE', () => {
    expect(evaluarRpc(405, { code: '25006' }).ok).toBe(false);
    expect(evaluarRpc(405, { code: '25006' }).motivo).toMatch(/anon/i);
    expect(evaluarRpc(401).motivo).toMatch(/cerrada/);
  });

  it('un bucket ausente (NoSuchBucket) no se confunde con uno privado sin permiso', () => {
    expect(evaluarBucket(200, []).ok).toBe(true);
    expect(evaluarBucket(400, { code: 'NoSuchBucket', statusCode: '404' }).ok).toBe(false);
    expect(evaluarBucket(400, { statusCode: '403', error: 'Unauthorized' }).ok).toBe(true);
    expect(evaluarBucket(403, null).ok).toBe(true);
    expect(evaluarBucket(400, { message: 'otra cosa' }).ok).toBe(false);
  });

  it('detecta columnas del contrato faltantes y columnas legacy que sobran', () => {
    expect(columnasFaltantes(COLUMNAS_VISTA, COLUMNAS_VISTA)).toEqual([]);
    expect(columnasFaltantes(COLUMNAS_VISTA, COLUMNAS_VISTA.filter((c) => c !== 'disponible'))).toEqual([
      'disponible',
    ]);

    expect(columnasProhibidas(COLUMNAS_LEGACY.vista_catalogo, ['id_producto', 'activo'])).toEqual([
      'activo',
    ]);
    expect(columnasProhibidas(COLUMNAS_LEGACY.vista_catalogo, COLUMNAS_VISTA)).toEqual([]);
  });
});

describe('B2 · el script usa las reglas y no la service role', () => {
  const script = leer('scripts/verificar-bd-viva.mjs');

  it('importa las reglas y no habla con la service role', () => {
    expect(script).toMatch(/bd-viva-reglas\.mjs/);
    expect(script).not.toMatch(/SERVICE_ROLE|service_role/i);
    expect(script).not.toMatch(/supabase-js/);
  });

  it('sale con código distinto de cero y resume los desajustes', () => {
    expect(script).toMatch(/process\.exit\(1\)/);
    expect(script).toMatch(/desajuste/i);
  });

  it('cubre la vista, los buckets y las diez tablas cerradas', () => {
    expect(script).toMatch(/COLUMNAS_VISTA/);
    expect(script).toMatch(/BUCKETS/);
    expect(script).toMatch(/TABLAS_CERRADAS/);
  });
});
