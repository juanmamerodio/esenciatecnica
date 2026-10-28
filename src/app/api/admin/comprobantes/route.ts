import { NextResponse } from "next/server";
import {
  leerCuerpo,
  objeto,
  panelDelAdministrador,
  respuestaDeError,
  respuestaDeFalla,
} from "@/lib/admin-http";
import { emitirRemito } from "@/lib/remito";
import { buzonDelRemito } from "@/lib/remito-servidor";

/**
 * Decisión sobre un comprobante — T7 · issue #13, con el remito de T8 · issue #14.
 *
 * `POST { idComprobante, decision }`. Aprobar y rechazar llaman a los RPC de la base
 * (`aprobar_comprobante` / `rechazar_comprobante`): acá no se reimplementa la regla, no se toca
 * el stock y no se numera ningún remito (AGENTS §5.10). La respuesta trae el número y el total
 * del remito que emitió la base, y nada del bucket privado.
 *
 * **El email del remito es posterior y no bloqueante:** la base ya cerró la venta, así que un
 * fallo de Resend vuelve como `aviso` y el panel ofrece reenviar. La venta no se revierte ni se
 * duplica (`specs/remito/spec.md` §2.4).
 */

export const runtime = "nodejs";

export async function POST(peticion: Request) {
  const cuerpo = await leerCuerpo(peticion);
  if (!cuerpo.ok) return cuerpo.respuesta;

  const datos = objeto(cuerpo.datos);

  try {
    const resultado = await panelDelAdministrador().decidirComprobante(
      datos.idComprobante,
      datos.decision,
    );
    if (resultado.estado === "error") return respuestaDeError(resultado);

    let aviso: string | undefined;
    if (resultado.decision === "aprobar") {
      const envio = await emitirRemito(buzonDelRemito(), resultado.idComprobante);
      if (envio.estado === "error") aviso = envio.mensaje;
    }

    return NextResponse.json(aviso ? { ...resultado, aviso } : resultado);
  } catch (error) {
    return respuestaDeFalla(error);
  }
}
