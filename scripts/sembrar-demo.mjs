// Siembra la demo de la beta (#22 · B5) contra el proyecto vivo de otjph.
//
// Qué hace, en orden:
//   1. Reconoce los productos del catálogo de demo por nombre y los **actualiza** —nunca los
//      duplica—; los que no existen, los crea.
//   2. Deja el stock en los valores de la demo (uno por debajo del umbral y uno en cero).
//   3. Baja cada foto de Wikimedia Commons y la sube al bucket público `productos`, dejando la URL
//      pública en `producto.imagen_url`.
//   4. Crea los Clientes de demo y un Pedido por Cliente, cubriendo los cuatro desenlaces del MVP
//      (pendiente, aprobado, rechazado, cancelado) más uno sin comprobante.
//   5. Sube la imagen de cada comprobante al bucket privado y guarda su **clave** en `foto_url`.
//
// Los datos y las reglas están en `scripts/demo-reglas.mjs` (una sola fuente, con su test). Acá
// sólo vive la charla con PostgREST y Storage.
//
// Uso:
//   npm run demo:sembrar             aplica lo que falte (idempotente por Cliente)
//   npm run demo:sembrar -- --limpiar  borra la demo anterior y la vuelve a sembrar
//
// No usa la anon key: `cliente`, `pedido`, `comprobante` y las escrituras de `producto`/`stock`
// están cerradas para `anon` (migración 03). Necesita `SUPABASE_SERVICE_ROLE_KEY`.

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CLIENTES,
  FOTOS,
  PEDIDOS,
  PRODUCTOS,
  claveDeComprobante,
  claveDeFotoDeProducto,
  ordenDeSiembra,
  preciosDeCatalogo,
  productoPorNombre,
  totalDePedido,
  urlPublicaDeFoto,
} from './demo-reglas.mjs';

const RAIZ = process.cwd();
const ENV_LOCAL = path.join(RAIZ, '.env.local');
const COMPROBANTES_DEMO = path.join(RAIZ, 'supabase', 'demo', 'comprobantes');
const AGENTE = 'esenciatecnica-demo/1.0 (proyecto escolar; proyectos@esenciatecnica.edu.ar)';
const LIMPIAR = process.argv.includes('--limpiar');

function leerEnvLocal() {
  if (!existsSync(ENV_LOCAL)) return {};
  const valores = {};
  for (const linea of readFileSync(ENV_LOCAL, 'utf8').split(/\r?\n/)) {
    const match = linea.match(/^([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
    if (match) valores[match[1]] = match[2];
  }
  return valores;
}

const entorno = { ...leerEnvLocal(), ...process.env };
const URL_BASE = (entorno.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const LLAVE = entorno.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !LLAVE) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (.env.local).');
  process.exit(2);
}

const sb = createClient(URL_BASE, LLAVE, { auth: { persistSession: false } });
const correos = CLIENTES.map((cliente) => cliente.email);
const localParte = (correo) => correo.split('@')[0];

const log = (etiqueta, detalle) => console.log(`  ${etiqueta.padEnd(11)} ${detalle}`);

/** Corre una consulta o un RPC y corta con el mensaje de la base si falla (nada de errores mudos). */
async function exigir(consulta, que) {
  const { data, error } = await consulta;
  if (error) throw new Error(`${que}: ${error.message}`);
  return data;
}

console.log(`\nSiembra de demo · ${URL_BASE}${LIMPIAR ? ' · --limpiar' : ''}\n`);

// ── Estado previo: hace falta para no duplicar y para no pisar reservas reales ──────────────────
const clientesPrevios = await exigir(
  sb.from('cliente').select('id_cliente, email').in('email', correos),
  'leer los Clientes de demo',
);
const idsClientesPrevios = (clientesPrevios ?? []).map((fila) => fila.id_cliente);

const pedidosPrevios =
  idsClientesPrevios.length > 0
    ? await exigir(
        sb.from('pedido').select('id_pedido, id_cliente').in('id_cliente', idsClientesPrevios),
        'leer los Pedidos de demo',
      )
    : [];

let clientesConPedido = new Set((pedidosPrevios ?? []).map((fila) => fila.id_cliente));

// ── 0. Limpieza opcional ───────────────────────────────────────────────────────────────────────
if (LIMPIAR && idsClientesPrevios.length > 0) {
  const idsPedidos = (pedidosPrevios ?? []).map((fila) => fila.id_pedido);
  const comprobantes =
    idsPedidos.length > 0
      ? await exigir(
          sb.from('comprobante').select('id_comprobante').in('id_pedido', idsPedidos),
          'leer los comprobantes de demo',
        )
      : [];
  const idsComprobantes = (comprobantes ?? []).map((fila) => fila.id_comprobante);

  // El orden lo imponen las FK `on delete restrict`: remito → comprobante → pedido → cliente.
  if (idsComprobantes.length > 0) {
    await exigir(
      sb.from('remitos_de_venta').delete().in('id_comprobante', idsComprobantes),
      'borrar los remitos de demo',
    );
    await exigir(
      sb.from('estados_comprobante').delete().in('id_comprobante', idsComprobantes),
      'borrar el historial de comprobantes',
    );
  }
  if (idsPedidos.length > 0) {
    await exigir(sb.from('comprobante').delete().in('id_pedido', idsPedidos), 'borrar los comprobantes');
    await exigir(sb.from('estados_pedidos').delete().in('id_pedido', idsPedidos), 'borrar el historial de pedidos');
    await exigir(sb.from('detalle_del_pedido').delete().in('id_pedido', idsPedidos), 'borrar los detalles');
    await exigir(sb.from('pedido').delete().in('id_pedido', idsPedidos), 'borrar los pedidos');
  }
  await exigir(sb.from('cliente').delete().in('id_cliente', idsClientesPrevios), 'borrar los Clientes de demo');

  clientesConPedido = new Set();
  log('limpieza', `${idsPedidos.length} pedido(s) y ${idsClientesPrevios.length} Cliente(s) de demo`);
}

// ── 1. Productos: actualizar los que ya están, crear los que faltan ────────────────────────────
const productosVivos = await exigir(
  sb.from('producto').select('id_producto, nombre, activo').eq('activo', true),
  'leer el catálogo vivo',
);

const idPorNombre = new Map();
console.log('\nCatálogo');
for (const producto of PRODUCTOS) {
  const campos = {
    nombre: producto.nombre,
    categoria: producto.categoria,
    tipo: producto.tipo,
    descripcion: producto.descripcion,
    precio: producto.precio,
    tiempo_produccion: producto.tiempoProduccion,
    activo: true,
  };
  const existente = productoPorNombre(productosVivos ?? [], producto.nombre);

  if (existente) {
    await exigir(
      sb.from('producto').update(campos).eq('id_producto', existente.id_producto),
      `actualizar ${producto.nombre}`,
    );
    idPorNombre.set(producto.nombre, existente.id_producto);
    log('actualizado', producto.nombre);
  } else {
    const creado = await exigir(
      sb.from('producto').insert(campos).select('id_producto').single(),
      `crear ${producto.nombre}`,
    );
    idPorNombre.set(producto.nombre, creado.id_producto);
    log('creado', producto.nombre);
  }
}

// ── 2. Stock ───────────────────────────────────────────────────────────────────────────────────
// La reserva sólo se puede poner en cero cuando no queda ningún pedido de demo: si hay pedidos
// abiertos, la reserva es un dato real y pisarla dejaría el stock mintiendo.
console.log('\nStock');
const pisarReserva = LIMPIAR || clientesConPedido.size === 0;
for (const producto of PRODUCTOS) {
  const parche = {
    cantidad_actual: producto.stock.actual,
    cantidad_warning: producto.stock.warning,
    ...(pisarReserva ? { cantidad_reservada: 0 } : {}),
  };
  await exigir(
    sb.from('stock').update(parche).eq('id_producto', idPorNombre.get(producto.nombre)),
    `actualizar el stock de ${producto.nombre}`,
  );
  const alerta = producto.stock.actual <= producto.stock.warning ? ' · alerta' : '';
  log('stock', `${producto.nombre}: ${producto.stock.actual} (umbral ${producto.stock.warning})${alerta}`);
}
if (!pisarReserva) log('nota', 'había Pedidos de demo: no se tocó `cantidad_reservada`');

// ── 3. Fotos de producto ───────────────────────────────────────────────────────────────────────
console.log('\nFotos');
for (const producto of PRODUCTOS) {
  const foto = FOTOS[producto.foto];
  if (!foto) throw new Error(`El producto ${producto.nombre} apunta a una foto inexistente`);

  const idProducto = idPorNombre.get(producto.nombre);
  const clave = claveDeFotoDeProducto(idProducto, producto.nombre);

  const respuesta = await fetch(foto.origen, { headers: { 'User-Agent': AGENTE } });
  if (!respuesta.ok) {
    throw new Error(`No se pudo bajar la foto de ${producto.nombre} (${respuesta.status} ${foto.origen})`);
  }
  const bytes = new Uint8Array(await respuesta.arrayBuffer());
  await exigir(
    sb.storage.from('productos').upload(clave, bytes, { contentType: 'image/jpeg', upsert: true }),
    `subir la foto de ${producto.nombre}`,
  );
  await exigir(
    sb.from('producto').update({ imagen_url: urlPublicaDeFoto(URL_BASE, clave) }).eq('id_producto', idProducto),
    `guardar la URL de la foto de ${producto.nombre}`,
  );
  log('subida', `${producto.nombre} → ${clave} (${foto.autor}, ${foto.licencia})`);
}

// ── 4. Clientes ────────────────────────────────────────────────────────────────────────────────
console.log('\nClientes');
const idDeCliente = new Map();
for (const cliente of CLIENTES) {
  const previo = (clientesPrevios ?? []).find(
    (fila) => fila.email.toLowerCase() === cliente.email.toLowerCase(),
  );
  if (previo) {
    idDeCliente.set(cliente.email, previo.id_cliente);
    log('existente', `${cliente.nombre} <${cliente.email}>`);
    continue;
  }
  const creado = await exigir(
    sb
      .from('cliente')
      .insert({
        nombre: cliente.nombre,
        dni: cliente.dni,
        email: cliente.email,
        telefono: cliente.telefono,
      })
      .select('id_cliente')
      .single(),
    `crear el Cliente ${cliente.nombre}`,
  );
  idDeCliente.set(cliente.email, creado.id_cliente);
  log('creado', `${cliente.nombre} <${cliente.email}>`);
}

// ── 5. Pedidos y comprobantes ──────────────────────────────────────────────────────────────────
const precios = preciosDeCatalogo(PRODUCTOS);

/**
 * Crea un Pedido de demo y le aplica su desenlace. Devuelve `true` si creó algo, para que el cron
 * se corra sólo cuando hay un pedido vencido recién creado: si se corriera igual, cancelaría los
 * pedidos que la demo necesita abiertos.
 */
async function sembrarPedido(pedido) {
  const idCliente = idDeCliente.get(pedido.cliente);
  if (clientesConPedido.has(idCliente)) {
    log('salteado', `${pedido.cliente} ya tiene un Pedido de demo`);
    return false;
  }

  const items = pedido.items.map((item) => ({
    id_producto: idPorNombre.get(item.producto),
    cantidad: item.cantidad,
  }));

  const creado = await exigir(
    sb.rpc('crear_pedido', { p_id_cliente: idCliente, p_items: items }),
    `crear el Pedido de ${pedido.cliente}`,
  );
  clientesConPedido.add(idCliente);

  const total = Number(creado.total);
  const esperado = totalDePedido(pedido, precios);
  if (Math.abs(total - esperado) > 0.001) {
    throw new Error(
      `El Pedido de ${pedido.cliente} quedó en ${total} y el catálogo de demo calcula ${esperado}. ` +
        'Revisá `precio` en demo-reglas.mjs.',
    );
  }
  log('pedido', `#${creado.id_pedido} ${pedido.cliente} · ${pedido.desenlace} · total ${total}`);

  if (pedido.desenlace === 'sinComprobante') return true;

  if (pedido.montoDelComprobante !== null && Math.abs(total - pedido.montoDelComprobante) > 0.001) {
    throw new Error(
      `El comprobante de ${pedido.cliente} muestra ${pedido.montoDelComprobante} y el Pedido quedó en ` +
        `${total}: regenerá la imagen en supabase/demo/comprobantes/ antes de sembrar.`,
    );
  }

  const clave = claveDeComprobante(creado.id_pedido);
  const archivo = path.join(COMPROBANTES_DEMO, `${localParte(pedido.cliente)}.png`);
  if (!existsSync(archivo)) throw new Error(`Falta la imagen del comprobante: ${archivo}`);

  await exigir(
    sb.storage
      .from('comprobantes')
      .upload(clave, readFileSync(archivo), { contentType: 'image/png', upsert: true }),
    `subir el comprobante de ${pedido.cliente}`,
  );
  const comprobante = await exigir(
    sb
      .from('comprobante')
      .insert({ id_pedido: creado.id_pedido, foto_url: clave, monto: total })
      .select('id_comprobante')
      .single(),
    `registrar el comprobante de ${pedido.cliente}`,
  );
  log('comprobante', `#${comprobante.id_comprobante} por ${total} → ${clave}`);

  if (pedido.desenlace === 'aprobado') {
    const remito = await exigir(
      sb.rpc('aprobar_comprobante', { p_id_comprobante: comprobante.id_comprobante }),
      `aprobar el comprobante de ${pedido.cliente}`,
    );
    log('remito', `${remito.numero} · ${remito.total}`);
  }
  if (pedido.desenlace === 'rechazado') {
    await exigir(
      sb.rpc('rechazar_comprobante', { p_id_comprobante: comprobante.id_comprobante }),
      `rechazar el comprobante de ${pedido.cliente}`,
    );
    log('rechazo', `comprobante #${comprobante.id_comprobante}`);
  }

  return true;
}

console.log('\nPedidos');
const orden = ordenDeSiembra(PEDIDOS);
const vencidos = orden.filter((pedido) => pedido.desenlace === 'cancelado');
const resto = orden.filter((pedido) => pedido.desenlace !== 'cancelado');

// Los vencidos van primero y se cancelan antes de crear el resto: `cancelar_pedidos_vencidos()`
// recorre todos los `Pendiente de Pago`, así que después arrasaría con los que quedan abiertos.
let vencidosCreados = 0;
for (const pedido of vencidos) {
  if (await sembrarPedido(pedido)) vencidosCreados += 1;
}
if (vencidosCreados > 0) {
  const cancelados = await exigir(sb.rpc('cancelar_pedidos_vencidos'), 'correr el cron de vencidos');
  log('cron', `${cancelados} Pedido(s) cancelado(s) por el cierre del viernes`);
}

for (const pedido of resto) {
  await sembrarPedido(pedido);
}

// ── Cierre: el estado que va a mostrar el panel ────────────────────────────────────────────────
console.log('\nQuedó así');
const pedidosFinales = await exigir(
  sb.from('pedido').select('id_pedido, estado_actual, total').in('id_cliente', [...idDeCliente.values()]),
  'leer el estado final',
);
const porEstado = new Map();
for (const fila of pedidosFinales ?? []) {
  porEstado.set(fila.estado_actual, (porEstado.get(fila.estado_actual) ?? 0) + 1);
}
for (const [estado, cantidad] of porEstado) log('pedidos', `${estado}: ${cantidad}`);

const catalogo = await exigir(
  sb.from('vista_catalogo').select('nombre, disponible, imagen_url'),
  'leer la vista del catálogo',
);
const sinFoto = (catalogo ?? []).filter((fila) => !fila.imagen_url);
log('catálogo', `${catalogo?.length ?? 0} producto(s) publicados, ${sinFoto.length} sin foto`);
for (const fila of catalogo ?? []) log('·', `${fila.nombre} · disponible ${fila.disponible}`);

console.log('\nListo. Entrá a /admin con ADMIN_PASSWORD y mirá Pedidos y Stock.\n');
