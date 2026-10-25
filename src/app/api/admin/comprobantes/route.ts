import { NextResponse } from "next/server";
import {
  leerCuerpo,
  objeto,
  panelDelAdministrador,
  respuestaDeError,
  sinConfiguracion,
} from "@/lib/admin-http";

/**
 * Decisión sobre un comprobante — T7 · issue #13.
 *
 * `POST { idComprobante, decision }`. Aprobar y rechazar llaman a los RPC de la base
 * (`aprobar_comprobante` / `rechazar_comprobante`): acá no se reimplementa la regla, no se toca
 * el stock y no se numera ningún remito (AGENTS §5.10). La respuesta trae el número y el total
 * del remito que emitió la base, y nada del bucket privado.
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

    return NextResponse.json(resultado);
  } catch (error) {
    return sinConfiguracion(error);
  }
}
