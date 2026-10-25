import { NextResponse } from "next/server";
import {
  errorDeEntrada,
  leerCuerpo,
  objeto,
  panelDelAdministrador,
  respuestaDeError,
  sinConfiguracion,
} from "@/lib/admin-http";

/**
 * Productos del catálogo — T7 · issue #13.
 *
 * `POST` crea un producto; la fila de stock la crea el trigger de la base. `PATCH` discrimina por
 * `accion`: `actualizar` edita los campos y `actividad` publica o da de baja. La baja es
 * **lógica** (`activo = false`): ningún camino de acá borra un producto con historial
 * (AGENTS §5.12).
 */

export const runtime = "nodejs";

export async function POST(peticion: Request) {
  const cuerpo = await leerCuerpo(peticion);
  if (!cuerpo.ok) return cuerpo.respuesta;

  try {
    const resultado = await panelDelAdministrador().crearProducto(objeto(cuerpo.datos));
    if (resultado.estado === "error") return respuestaDeError(resultado);

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return sinConfiguracion(error);
  }
}

export async function PATCH(peticion: Request) {
  const cuerpo = await leerCuerpo(peticion);
  if (!cuerpo.ok) return cuerpo.respuesta;

  const datos = objeto(cuerpo.datos);

  try {
    const panel = panelDelAdministrador();

    if (datos.accion === "actividad") {
      const resultado = await panel.cambiarActividad(datos.idProducto, datos.activo);
      if (resultado.estado === "error") return respuestaDeError(resultado);

      return NextResponse.json(resultado);
    }

    if (datos.accion === "actualizar") {
      const resultado = await panel.actualizarProducto(datos.idProducto, datos);
      if (resultado.estado === "error") return respuestaDeError(resultado);

      return NextResponse.json(resultado);
    }

    return errorDeEntrada("La acción tiene que ser actualizar o actividad.", {
      accion: "Acción inválida.",
    });
  } catch (error) {
    return sinConfiguracion(error);
  }
}
