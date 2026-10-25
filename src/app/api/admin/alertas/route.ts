import { NextResponse } from "next/server";
import {
  leerCuerpo,
  objeto,
  panelDelAdministrador,
  respuestaDeError,
  sinConfiguracion,
} from "@/lib/admin-http";

/**
 * Alertas de stock — T7 · issue #13.
 *
 * `PATCH { idAlerta }` sólo marca `atendida = true`: la fila se conserva como auditoría y la
 * alerta es un aviso del panel, no un email al Administrador (AGENTS §5.7).
 */

export const runtime = "nodejs";

export async function PATCH(peticion: Request) {
  const cuerpo = await leerCuerpo(peticion);
  if (!cuerpo.ok) return cuerpo.respuesta;

  const datos = objeto(cuerpo.datos);

  try {
    const resultado = await panelDelAdministrador().atenderAlerta(datos.idAlerta);
    if (resultado.estado === "error") return respuestaDeError(resultado);

    return NextResponse.json(resultado);
  } catch (error) {
    return sinConfiguracion(error);
  }
}
