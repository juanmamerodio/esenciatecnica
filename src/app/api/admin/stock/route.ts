import { NextResponse } from "next/server";
import {
  leerCuerpo,
  objeto,
  panelDelAdministrador,
  respuestaDeError,
  respuestaDeFalla,
} from "@/lib/admin-http";

/**
 * Stock editable — T7 · issue #13.
 *
 * `PATCH { idProducto, cantidad_actual, cantidad_warning }`. La base recalcula la alerta con su
 * trigger; el panel sólo valida el borde y devuelve el stock actualizado.
 */

export const runtime = "nodejs";

export async function PATCH(peticion: Request) {
  const cuerpo = await leerCuerpo(peticion);
  if (!cuerpo.ok) return cuerpo.respuesta;

  const datos = objeto(cuerpo.datos);

  try {
    const resultado = await panelDelAdministrador().editarStock(datos.idProducto, datos);
    if (resultado.estado === "error") return respuestaDeError(resultado);

    return NextResponse.json(resultado);
  } catch (error) {
    return respuestaDeFalla(error);
  }
}
