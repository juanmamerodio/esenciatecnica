import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  normalizarEmail,
  type ArchivoDeComprobante,
  type DatosDelCliente,
  type PuertoCheckout,
} from "@/lib/checkout";
import type { Database, Json } from "@/lib/database.types";

/**
 * Adaptador del checkout contra el contrato canónico (T5 · issue #10).
 *
 * Es **server-side** y usa la service role: las tablas `cliente`, `pedido` y `comprobante` no
 * tienen políticas para la anon key (migración 03) y la RPC `crear_pedido` está revocada para
 * `anon`/`authenticated`. La clave nunca viaja al navegador (AGENTS §7.8).
 *
 * `foto_url` guarda la **clave** del objeto, no una URL: el bucket `comprobantes` es privado y
 * la imagen se sirve con una signed URL generada desde el servidor.
 */

const BUCKET = "comprobantes";

export function puertoCheckoutServidor(): PuertoCheckout {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_URL): el checkout no puede registrar pedidos ni comprobantes.",
    );
  }

  return puertoSobre(createClient<Database>(url, llave, { auth: { persistSession: false } }));
}

/** Se separa para poder probar el adaptador con un cliente ya construido. */
export function puertoSobre(cliente: SupabaseClient<Database>): PuertoCheckout {
  return {
    async buscarCliente(email) {
      const { data, error } = await cliente
        .from("cliente")
        .select("id_cliente")
        // Igualdad contra el email normalizado, nunca un patrón: `%` y `_` son texto, no comodines
        // (#33). La fila se guarda en minúsculas y la unicidad de la base es `lower(email)`.
        .eq("email", normalizarEmail(email))
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async crearCliente(datos: DatosDelCliente) {
      const { data, error } = await cliente
        .from("cliente")
        // Se guarda normalizado: así la búsqueda por igualdad siempre encuentra esta fila.
        .insert({
          nombre: datos.nombre,
          email: normalizarEmail(datos.email),
          dni: datos.dni,
          telefono: datos.telefono,
        })
        .select("id_cliente")
        .single();

      if (error) {
        // Carrera: otro intento con el mismo email lo creó primero. Se reutiliza ese, por igualdad.
        if (error.code === "23505") {
          const existente = await cliente
            .from("cliente")
            .select("id_cliente")
            .eq("email", normalizarEmail(datos.email))
            .maybeSingle();
          if (!existente.error && existente.data) return existente.data;
        }
        throw error;
      }

      return data;
    },

    async buscarPedido(idPedido) {
      const { data, error } = await cliente
        .from("pedido")
        .select("id_pedido, total, estado_actual")
        .eq("id_pedido", idPedido)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...data, total: Number(data.total) } : null;
    },

    async crearPedido(idCliente, items) {
      const { data, error } = await cliente.rpc("crear_pedido", {
        p_id_cliente: idCliente,
        p_items: items as unknown as Json,
      });
      if (error) throw error;
      return { id_pedido: data.id_pedido, total: Number(data.total), estado_actual: data.estado_actual };
    },

    async comprobantePendiente(idPedido) {
      const { data, error } = await cliente
        .from("comprobante")
        .select("id_comprobante")
        .eq("id_pedido", idPedido)
        .eq("estado_actual", "Comprobante Subido")
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async subirArchivo(clave: string, archivo: ArchivoDeComprobante) {
      const { error } = await cliente.storage.from(BUCKET).upload(clave, archivo.bytes, {
        contentType: archivo.tipo,
        // Reintentar la subida del mismo comprobante reemplaza la imagen, no duplica el objeto.
        upsert: true,
      });
      if (error) throw error;
    },

    async registrarComprobante(datos) {
      if (datos.idComprobante) {
        // Una sola fila por pedido pendiente: se reemplaza imagen y monto del mismo comprobante.
        const { data, error } = await cliente
          .from("comprobante")
          .update({ foto_url: datos.clave, monto: datos.monto })
          .eq("id_comprobante", datos.idComprobante)
          .select("id_comprobante")
          .single();
        if (error) throw error;
        return { id_comprobante: data.id_comprobante };
      }

      const { data, error } = await cliente
        .from("comprobante")
        .insert({ id_pedido: datos.idPedido, foto_url: datos.clave, monto: datos.monto })
        .select("id_comprobante")
        .single();
      if (error) throw error;
      return { id_comprobante: data.id_comprobante };
    },
  };
}

/** Nombre del bucket privado de comprobantes: una sola fuente (lo usa el panel en T7). */
export const BUCKET_COMPROBANTES = BUCKET;
