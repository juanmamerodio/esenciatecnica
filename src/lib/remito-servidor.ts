import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import type { Database } from "@/lib/database.types";
import type { PuertoDeCorreo, PuertoDelRemito, PuertosDelRemito } from "@/lib/remito";

/**
 * Adaptador del remito — T8 · issue #14.
 *
 * Server-side y con la service role: `remitos_de_venta`, `pedido`, `detalle_del_pedido` y
 * `cliente` no tienen políticas para la anon key (migración 03). Resend se instancia **por
 * llamada** y no al importar: así el build no depende de `RESEND_API_KEY` y un entorno sin la
 * clave sigue compilando (`AGENTS.md` §8).
 */

const REMITENTE_POR_DEFECTO = "Esencia Técnica <ventas@ascender.uno>";

/** Los tres puertos que necesita la emisión del remito. */
export function buzonDelRemito(): PuertosDelRemito {
  return { datos: datosDelRemitoServidor(), correo: puertoCorreoResend() };
}

/** Sólo lectura del remito emitido: lo usa la página imprimible del panel. */
export function datosDelRemitoServidor(): PuertoDelRemito {
  const cliente = clienteDeServicio();

  return {
    async leerDatos(idComprobante: number) {
      const remito = await cliente
        .from("remitos_de_venta")
        .select("numero, fecha, total, id_cliente, id_comprobante")
        .eq("id_comprobante", idComprobante)
        .maybeSingle();
      if (remito.error) throw remito.error;
      if (!remito.data) return null;

      const comprobante = await cliente
        .from("comprobante")
        .select("id_pedido")
        .eq("id_comprobante", idComprobante)
        .maybeSingle();
      if (comprobante.error) throw comprobante.error;
      if (!comprobante.data) return null;

      const [duenio, detalle] = await Promise.all([
        cliente
          .from("cliente")
          .select("nombre, email")
          .eq("id_cliente", remito.data.id_cliente)
          .maybeSingle(),
        cliente
          .from("detalle_del_pedido")
          .select("id_producto, cantidad, precio_unitario, subtotal")
          .eq("id_pedido", comprobante.data.id_pedido)
          .order("id_producto"),
      ]);
      if (duenio.error) throw duenio.error;
      if (!duenio.data) return null;
      if (detalle.error) throw detalle.error;

      const lineas = detalle.data ?? [];
      const ids = [...new Set(lineas.map((linea) => linea.id_producto))];

      // Los nombres salen de `producto` y no de `vista_catalogo`: un producto dado de baja
      // después de la venta igual tiene que aparecer en su remito.
      const productos = ids.length
        ? await cliente.from("producto").select("id_producto, nombre").in("id_producto", ids)
        : { data: [], error: null };
      if (productos.error) throw productos.error;

      const nombreDe = new Map(
        (productos.data ?? []).map((producto) => [producto.id_producto, producto.nombre]),
      );

      return {
        numero: remito.data.numero,
        fecha: remito.data.fecha,
        total: Number(remito.data.total),
        cliente: { nombre: duenio.data.nombre, email: duenio.data.email },
        items: lineas.map((linea) => ({
          nombre: nombreDe.get(linea.id_producto) ?? `Producto ${linea.id_producto}`,
          cantidad: linea.cantidad,
          precio_unitario: Number(linea.precio_unitario),
          subtotal: Number(linea.subtotal),
        })),
      };
    },
  };
}

export function puertoCorreoResend(): PuertoDeCorreo {
  return {
    async enviar({ para, asunto, html, texto }) {
      const llave = process.env.RESEND_API_KEY;
      if (!llave) {
        throw new Error("Falta RESEND_API_KEY en el entorno del servidor: el remito no se puede enviar.");
      }

      const clienteDeCorreo = new Resend(llave);
      const { data, error } = await clienteDeCorreo.emails.send({
        from: remitenteDelRemito(),
        to: para,
        subject: asunto,
        html,
        text: texto,
      });

      if (error) throw new Error(error.message || "Resend rechazó el envío del remito.");
      return { id: data?.id ?? "" };
    },
  };
}

export function remitenteDelRemito(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || REMITENTE_POR_DEFECTO;
}

function clienteDeServicio(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_URL): el remito no se puede leer.",
    );
  }
  return createClient<Database>(url, llave, { auth: { persistSession: false } });
}
