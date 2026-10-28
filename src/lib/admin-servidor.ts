import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { crearPanel, type PanelAdmin, type PuertoAdmin } from "@/lib/admin";
import { bucketDe } from "@/lib/archivo";
import { FaltaConfiguracion } from "@/lib/errores-bd";
import type { Database } from "@/lib/database.types";

/**
 * Adaptador del panel contra el contrato canónico (T7 · issue #13).
 *
 * Es **server-side** y usa la service role: `cliente`, `pedido`, `comprobante`, `remito`,
 * `alerta_de_estado` y las escrituras de `producto`/`stock` no tienen políticas para la anon key
 * (migración 03). La clave nunca viaja al navegador (AGENTS §7.8).
 *
 * Las decisiones llaman a los **RPC** `aprobar_comprobante` / `rechazar_comprobante`: la regla
 * del dominio vive en la base y el panel no la reimplementa (AGENTS §5.10).
 *
 * Este adaptador **no** decide nada: une las tablas y devuelve las filas crudas; el módulo
 * `src/lib/admin.ts` es el único que las valida y las convierte en modelo del panel.
 */

const BUCKET_COMPROBANTES = bucketDe("comprobante");
const BUCKET_PRODUCTOS = bucketDe("foto");

/** La signed URL del comprobante vence rápido: el panel la vuelve a pedir en cada carga. */
const SEGUNDOS_DE_FIRMA = 10 * 60;

export function crearPanelServidor(): PanelAdmin {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) {
    // Se distingue de una falla real: sólo esto responde 503 con el mensaje del entorno (#35).
    throw new FaltaConfiguracion(
      "Falta SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_URL): el panel no puede leer pedidos ni escribir stock.",
    );
  }

  return crearPanel(
    puertoAdminSobre(createClient<Database>(url, llave, { auth: { persistSession: false } })),
  );
}

/** Se separa para poder probar el adaptador con un cliente ya construido. */
export function puertoAdminSobre(cliente: SupabaseClient<Database>): PuertoAdmin {
  return {
    async leerPedidos() {
      const pedidos = await cliente
        .from("pedido")
        .select("id_pedido, id_cliente, fecha, total, estado_actual")
        .order("id_pedido", { ascending: false });
      if (pedidos.error) return { filas: null, error: pedidos.error };

      const filasDePedidos = pedidos.data ?? [];
      if (filasDePedidos.length === 0) return { filas: [], error: null };

      const idsPedidos = filasDePedidos.map((fila) => fila.id_pedido);
      const idsClientes = unicos(filasDePedidos.map((fila) => fila.id_cliente));

      const clientes = await cliente
        .from("cliente")
        .select("id_cliente, nombre, email")
        .in("id_cliente", idsClientes);
      if (clientes.error) return { filas: null, error: clientes.error };

      const comprobantes = await cliente
        .from("comprobante")
        .select("id_comprobante, id_pedido, monto, estado_actual, foto_url")
        .in("id_pedido", idsPedidos)
        .order("id_comprobante", { ascending: true });
      if (comprobantes.error) return { filas: null, error: comprobantes.error };

      const detalles = await cliente
        .from("detalle_del_pedido")
        .select("id_pedido, id_producto, cantidad, precio_unitario, subtotal")
        .in("id_pedido", idsPedidos);
      if (detalles.error) return { filas: null, error: detalles.error };

      const idsProductos = unicos((detalles.data ?? []).map((fila) => fila.id_producto));
      const productos =
        idsProductos.length > 0
          ? await cliente.from("producto").select("id_producto, nombre").in("id_producto", idsProductos)
          : null;
      if (productos?.error) return { filas: null, error: productos.error };

      const idsComprobantes = unicos((comprobantes.data ?? []).map((fila) => fila.id_comprobante));
      const remitos =
        idsComprobantes.length > 0
          ? await cliente
              .from("remitos_de_venta")
              .select("id_comprobante, numero, total")
              .in("id_comprobante", idsComprobantes)
          : null;
      if (remitos?.error) return { filas: null, error: remitos.error };

      const clientePorId = new Map((clientes.data ?? []).map((fila) => [fila.id_cliente, fila]));
      const productoPorId = new Map((productos?.data ?? []).map((fila) => [fila.id_producto, fila]));
      const remitoPorComprobante = new Map(
        (remitos?.data ?? []).map((fila) => [fila.id_comprobante, fila]),
      );

      const filas = filasDePedidos.map((pedido) => {
        const comprobantesDelPedido = (comprobantes.data ?? []).filter(
          (fila) => fila.id_pedido === pedido.id_pedido,
        );

        return {
          id_pedido: pedido.id_pedido,
          fecha: pedido.fecha,
          total: pedido.total,
          estado_actual: pedido.estado_actual,
          cliente: clientePorId.get(pedido.id_cliente) ?? null,
          detalle: (detalles.data ?? [])
            .filter((fila) => fila.id_pedido === pedido.id_pedido)
            .map((fila) => ({
              id_producto: fila.id_producto,
              nombre: productoPorId.get(fila.id_producto)?.nombre ?? "",
              cantidad: fila.cantidad,
              precio_unitario: fila.precio_unitario,
              subtotal: fila.subtotal,
            })),
          comprobantes: comprobantesDelPedido.map((fila) => ({
            id_comprobante: fila.id_comprobante,
            monto: fila.monto,
            estado_actual: fila.estado_actual,
            foto_url: fila.foto_url,
          })),
          remito:
            comprobantesDelPedido
              .map((fila) => remitoPorComprobante.get(fila.id_comprobante))
              .find((fila) => fila !== undefined) ?? null,
        };
      });

      return { filas, error: null };
    },

    async leerStock() {
      const stock = await cliente
        .from("stock")
        .select("id_stock, id_producto, cantidad_actual, cantidad_reservada, cantidad_warning")
        .order("id_producto", { ascending: true });
      if (stock.error) return { filas: null, error: stock.error };

      const filasDeStock = stock.data ?? [];
      if (filasDeStock.length === 0) return { filas: [], error: null };

      const idsProductos = unicos(filasDeStock.map((fila) => fila.id_producto));
      const productos = await cliente
        .from("producto")
        .select(
          "id_producto, nombre, categoria, tipo, descripcion, precio, tiempo_produccion, activo, imagen_url",
        )
        .in("id_producto", idsProductos);
      if (productos.error) return { filas: null, error: productos.error };

      const productoPorId = new Map((productos.data ?? []).map((fila) => [fila.id_producto, fila]));

      // La alerta es de la base: se trae, en una sola consulta, qué stock tiene una alerta sin
      // atender. El panel no la recalcula con el disponible ni con el umbral (#36).
      const alertas = await cliente
        .from("alerta_de_estado")
        .select("id_stock")
        .eq("atendida", false)
        .in("id_stock", filasDeStock.map((fila) => fila.id_stock));
      if (alertas.error) return { filas: null, error: alertas.error };

      const stockConAlerta = new Set((alertas.data ?? []).map((fila) => fila.id_stock));

      return {
        filas: filasDeStock.map((fila) => ({
          ...fila,
          ...(productoPorId.get(fila.id_producto) ?? {}),
          alerta_pendiente: stockConAlerta.has(fila.id_stock),
        })),
        error: null,
      };
    },

    async leerAlertas() {
      const alertas = await cliente
        .from("alerta_de_estado")
        .select("id_alerta, id_stock, fecha, mensaje, atendida")
        .order("fecha", { ascending: false });
      if (alertas.error) return { filas: null, error: alertas.error };

      const filasDeAlertas = alertas.data ?? [];
      if (filasDeAlertas.length === 0) return { filas: [], error: null };

      const idsStock = unicos(filasDeAlertas.map((fila) => fila.id_stock));
      const stocks = await cliente.from("stock").select("id_stock, id_producto").in("id_stock", idsStock);
      if (stocks.error) return { filas: null, error: stocks.error };

      const idsProductos = unicos((stocks.data ?? []).map((fila) => fila.id_producto));
      const productos =
        idsProductos.length > 0
          ? await cliente.from("producto").select("id_producto, nombre").in("id_producto", idsProductos)
          : null;
      if (productos?.error) return { filas: null, error: productos.error };

      const stockPorId = new Map((stocks.data ?? []).map((fila) => [fila.id_stock, fila]));
      const productoPorId = new Map((productos?.data ?? []).map((fila) => [fila.id_producto, fila]));

      return {
        filas: filasDeAlertas.map((alerta) => {
          const idProducto = stockPorId.get(alerta.id_stock)?.id_producto ?? null;
          return {
            ...alerta,
            id_producto: idProducto,
            nombre: idProducto === null ? null : (productoPorId.get(idProducto)?.nombre ?? null),
          };
        }),
        error: null,
      };
    },

    async firmarComprobante(clave) {
      const { data, error } = await cliente.storage
        .from(BUCKET_COMPROBANTES)
        .createSignedUrl(clave, SEGUNDOS_DE_FIRMA);
      if (error) throw error;
      return data.signedUrl;
    },

    async aprobarComprobante(idComprobante) {
      const { data, error } = await cliente.rpc("aprobar_comprobante", {
        p_id_comprobante: idComprobante,
      });
      if (error) throw error;
      return { numero: data.numero, total: Number(data.total) };
    },

    async rechazarComprobante(idComprobante) {
      const { data, error } = await cliente.rpc("rechazar_comprobante", {
        p_id_comprobante: idComprobante,
      });
      if (error) throw error;
      return { estado_actual: data.estado_actual };
    },

    async actualizarStock(idProducto, datos) {
      const { data, error } = await cliente
        .from("stock")
        .update({
          cantidad_actual: datos.cantidad_actual,
          cantidad_warning: datos.cantidad_warning,
        })
        .eq("id_producto", idProducto)
        .select("id_producto, cantidad_actual, cantidad_reservada, cantidad_warning")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(`El producto ${idProducto} no tiene fila de stock.`);
      return data;
    },

    async crearProducto(datos) {
      const { data, error } = await cliente
        .from("producto")
        .insert({
          nombre: datos.nombre,
          categoria: datos.categoria,
          tipo: datos.tipo,
          descripcion: datos.descripcion,
          precio: datos.precio,
          tiempo_produccion: datos.tiempo_produccion,
        })
        .select("id_producto")
        .single();
      if (error) throw error;
      return data;
    },

    async actualizarProducto(idProducto, datos) {
      const { data, error } = await cliente
        .from("producto")
        .update({
          nombre: datos.nombre,
          categoria: datos.categoria,
          tipo: datos.tipo,
          descripcion: datos.descripcion,
          precio: datos.precio,
          tiempo_produccion: datos.tiempo_produccion,
        })
        .eq("id_producto", idProducto)
        .select("id_producto")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(`El producto ${idProducto} no existe.`);
    },

    async cambiarActividad(idProducto, activo) {
      // Baja y alta lógica: se apaga `activo`; la fila y su historial quedan (AGENTS §5.12).
      const { data, error } = await cliente
        .from("producto")
        .update({ activo })
        .eq("id_producto", idProducto)
        .select("id_producto")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(`El producto ${idProducto} no existe.`);
    },

    async subirFoto(idProducto, clave, archivo) {
      const subida = await cliente.storage.from(BUCKET_PRODUCTOS).upload(clave, archivo.bytes, {
        contentType: archivo.tipo,
        // La misma clave reemplaza la foto anterior: no se acumulan objetos sueltos.
        upsert: true,
      });
      if (subida.error) throw subida.error;

      const url = cliente.storage.from(BUCKET_PRODUCTOS).getPublicUrl(clave).data.publicUrl;

      const actualizacion = await cliente
        .from("producto")
        .update({ imagen_url: url })
        .eq("id_producto", idProducto)
        .select("id_producto")
        .maybeSingle();
      if (actualizacion.error) throw actualizacion.error;
      if (!actualizacion.data) throw new Error(`El producto ${idProducto} no existe.`);

      return { url };
    },

    async atenderAlerta(idAlerta) {
      const { data, error } = await cliente
        .from("alerta_de_estado")
        .update({ atendida: true })
        .eq("id_alerta", idAlerta)
        .select("id_alerta")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(`La alerta ${idAlerta} no existe.`);
    },
  };
}

function unicos(valores: number[]): number[] {
  return [...new Set(valores)];
}
