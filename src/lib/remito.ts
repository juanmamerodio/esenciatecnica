import { z } from "zod";
import { formatPrice } from "@/lib/format";

/**
 * Remito de venta — T8 · issue #14.
 *
 * El remito lo **emite la base** dentro de la transacción de aprobación (`aprobar_comprobante`):
 * acá no se crea ni se numera nada, sólo se lee, se compone y se envía (`AGENTS.md` §5.10).
 *
 * Tres funciones públicas, con los seams en puertos para no depender de la red:
 *
 * - `leerRemito(puerto, idComprobante)`: lee el remito emitido y lo valida contra el modelo.
 * - `componerRemito(datos)`: arma el asunto, el HTML y el texto plano del documento.
 * - `emitirRemito(puertos, idComprobante)`: lee, compone y envía. Un fallo de correo **no** toca
 *   la venta: la aprobación ya pasó y el reenvío es manual (`specs/remito/spec.md` §2).
 *
 * El adaptador real vive en `src/lib/remito-servidor.ts`: este módulo no conoce Resend ni la
 * clave del correo.
 */

export type DatosDelRemito = {
  numero: string;
  fecha: string;
  total: number;
  cliente: { nombre: string; email: string };
  items: Array<{
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
};

export type MotivoDelRemito = "remito-inexistente" | "datos-inconsistentes" | "correo";

export type ResultadoLecturaDelRemito =
  | { estado: "ok"; datos: DatosDelRemito }
  | { estado: "error"; motivo: MotivoDelRemito; mensaje: string };

export type ResultadoDelRemito =
  | { estado: "ok"; numero: string; para: string }
  | { estado: "error"; motivo: MotivoDelRemito; mensaje: string; numero?: string };

export type RemitoCompuesto = {
  numero: string;
  asunto: string;
  html: string;
  texto: string;
};

/** Puerto de lectura: devuelve la fila cruda del remito unida a su pedido y su Cliente. */
export interface PuertoDelRemito {
  leerDatos(idComprobante: number): Promise<unknown>;
}

export interface PuertoDeCorreo {
  enviar(mensaje: {
    para: string;
    asunto: string;
    html: string;
    texto: string;
  }): Promise<{ id: string }>;
}

export type PuertosDelRemito = {
  datos: PuertoDelRemito;
  correo: PuertoDeCorreo;
};

const ESQUEMA_ID = z.coerce.number().int().positive();

const ESQUEMA_REMITO_LEIDO = z.object({
  numero: z.string().trim().min(1),
  fecha: z.string().trim().min(1),
  total: z.coerce.number().finite().nonnegative(),
  cliente: z.object({
    nombre: z.string().trim().min(1),
    email: z
      .string()
      .trim()
      .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "El email del Cliente no es válido."),
  }),
  items: z
    .array(
      z.object({
        nombre: z.string().trim().min(1),
        cantidad: z.coerce.number().int().positive(),
        precio_unitario: z.coerce.number().finite().nonnegative(),
        subtotal: z.coerce.number().finite().nonnegative(),
      }),
    )
    .min(1, "El remito no tiene productos."),
});

export async function leerRemito(
  puerto: PuertoDelRemito,
  idComprobante: unknown,
): Promise<ResultadoLecturaDelRemito> {
  const revision = ESQUEMA_ID.safeParse(idComprobante);
  if (!revision.success) {
    return {
      estado: "error",
      motivo: "datos-inconsistentes",
      mensaje: "El comprobante del remito no es válido.",
    };
  }

  let fila: unknown;
  try {
    fila = await puerto.leerDatos(revision.data);
  } catch (error) {
    return {
      estado: "error",
      motivo: "datos-inconsistentes",
      mensaje: error instanceof Error ? error.message : "No pudimos leer el remito.",
    };
  }

  if (fila === null || fila === undefined) {
    return {
      estado: "error",
      motivo: "remito-inexistente",
      mensaje: "Ese comprobante todavía no tiene remito: la venta no está aprobada.",
    };
  }

  const intento = ESQUEMA_REMITO_LEIDO.safeParse(fila);
  if (!intento.success) {
    return {
      estado: "error",
      motivo: "datos-inconsistentes",
      mensaje:
        "El remito no coincide con el contrato del modelo, así que no se compone un documento incompleto. Avisá al equipo del proyecto.",
    };
  }

  return {
    estado: "ok",
    datos: {
      numero: intento.data.numero,
      fecha: intento.data.fecha,
      total: intento.data.total,
      cliente: {
        nombre: intento.data.cliente.nombre,
        email: intento.data.cliente.email.toLowerCase(),
      },
      items: intento.data.items.map((item) => ({
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precio_unitario,
        subtotal: item.subtotal,
      })),
    },
  };
}

export async function emitirRemito(
  puertos: PuertosDelRemito,
  idComprobante: unknown,
): Promise<ResultadoDelRemito> {
  const lectura = await leerRemito(puertos.datos, idComprobante);
  if (lectura.estado === "error") return lectura;

  const compuesto = componerRemito(lectura.datos);

  try {
    await puertos.correo.enviar({
      para: lectura.datos.cliente.email,
      asunto: compuesto.asunto,
      html: compuesto.html,
      texto: compuesto.texto,
    });
  } catch (error) {
    // La venta ya está cerrada: el remito existe y sólo falló el aviso.
    console.error(
      `Remito ${compuesto.numero}: no se pudo enviar el email:`,
      error instanceof Error ? error.message : error,
    );
    return {
      estado: "error",
      motivo: "correo",
      numero: compuesto.numero,
      mensaje: `El remito ${compuesto.numero} quedó emitido, pero no se pudo enviar el email. Reintentá el reenvío desde el panel.`,
    };
  }

  return { estado: "ok", numero: compuesto.numero, para: lectura.datos.cliente.email };
}

export function componerRemito(datos: DatosDelRemito): RemitoCompuesto {
  const asunto = `Remito de venta ${datos.numero} · Esencia Técnica`;
  const fecha = fechaLegible(datos.fecha);
  const total = formatPrice(datos.total);

  const filasHtml = datos.items
    .map(
      (item) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #ededeb;color:#1c1c1e;">${escapar(item.nombre)}</td>
                <td style="padding:10px 0;border-bottom:1px solid #ededeb;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#1c1c1e;">${item.cantidad}</td>
                <td style="padding:10px 0;border-bottom:1px solid #ededeb;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#1c1c1e;">${formatPrice(item.precioUnitario)}</td>
                <td style="padding:10px 0;border-bottom:1px solid #ededeb;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#1c1c1e;">${formatPrice(item.subtotal)}</td>
              </tr>`,
    )
    .join("");

  const lineasTexto = datos.items
    .map(
      (item) =>
        `  · ${item.cantidad} × ${item.nombre} — ${formatPrice(item.precioUnitario)} c/u = ${formatPrice(item.subtotal)}`,
    )
    .join("\n");

  const pie =
    "El retiro o la entrega se acuerdan después de la aprobación del pago: este proyecto no incluye envío ni seguimiento.";

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapar(asunto)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e6e3;border-radius:20px;overflow:hidden;">
      <div style="padding:24px 28px;border-bottom:1px solid #ededeb;">
        <span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.06em;padding:4px 10px;border-radius:8px;background:#e8f3ef;color:#3d8c6e;">REMITO DE VENTA</span>
        <h1 style="margin:12px 0 4px;font-size:20px;line-height:1.3;">Remito ${escapar(datos.numero)}</h1>
        <p style="margin:0;font-size:13px;color:#8e8e93;">${escapar(fecha)} · E.E.S.T N°1 Luciano Reyes</p>
      </div>

      <div style="padding:24px 28px;">
        <p style="margin:0 0 4px;font-size:13px;color:#8e8e93;">Cliente</p>
        <p style="margin:0 0 20px;font-size:15px;font-weight:600;">${escapar(datos.cliente.nombre)}</p>

        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr>
              <th style="padding:0 0 8px;text-align:left;font-size:11px;letter-spacing:0.06em;color:#8e8e93;text-transform:uppercase;">Producto</th>
              <th style="padding:0 0 8px;text-align:right;font-size:11px;letter-spacing:0.06em;color:#8e8e93;text-transform:uppercase;">Cantidad</th>
              <th style="padding:0 0 8px;text-align:right;font-size:11px;letter-spacing:0.06em;color:#8e8e93;text-transform:uppercase;">Precio unitario</th>
              <th style="padding:0 0 8px;text-align:right;font-size:11px;letter-spacing:0.06em;color:#8e8e93;text-transform:uppercase;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${filasHtml}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3" style="padding:14px 0 0;text-align:right;font-size:14px;">Total</th>
              <td style="padding:14px 0 0;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:700;">${total}</td>
            </tr>
          </tfoot>
        </table>

        <p style="margin:24px 0 0;padding:14px 16px;background:#fafaf9;border:1px solid #ededeb;border-radius:12px;font-size:13px;line-height:1.6;color:#3a3a3c;">${escapar(pie)}</p>
      </div>

      <div style="padding:16px 28px;border-top:1px solid #ededeb;background:#fafaf9;font-size:11px;line-height:1.6;color:#8e8e93;text-align:center;">
        Esencia Técnica · E.E.S.T N°1 Luciano Reyes · Departamento de Química · Campana, Buenos Aires<br />
        Cosmética e higiene elaboradas por alumnos de 7mo año.
      </div>
    </div>
  </body>
</html>`;

  const texto = [
    `REMITO DE VENTA ${datos.numero}`,
    `Fecha: ${fecha}`,
    "Esencia Técnica · E.E.S.T N°1 Luciano Reyes · Departamento de Química",
    "",
    `Cliente: ${datos.cliente.nombre}`,
    "",
    "Productos:",
    lineasTexto,
    "",
    `Total: ${total}`,
    "",
    pie,
  ].join("\n");

  return { numero: datos.numero, asunto, html, texto };
}

/** Fecha `AAAA-MM-DD` del modelo a algo legible en español, sin depender del navegador. */
function fechaLegible(fecha: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim());
  if (!partes) return fecha;
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

/**
 * El nombre del producto y del Cliente los escribió una persona: en el HTML del email se
 * escapan, o un `<script>` en el nombre viajaría dentro del correo.
 */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
