import { NextResponse } from "next/server";
import {
  errorDeEntrada,
  panelDelAdministrador,
  respuestaDeError,
  sinConfiguracion,
} from "@/lib/admin-http";

/**
 * Foto de un producto — T7 · issue #13.
 *
 * `POST` multipart con `idProducto` y `archivo` (PNG, JPEG o WebP de hasta 5 MB). El módulo
 * sanea el nombre del objeto, el adaptador lo sube al bucket **público** `productos` y deja su
 * URL en `producto.imagen_url`. La respuesta devuelve sólo la URL pública.
 */

export const runtime = "nodejs";

export async function POST(peticion: Request) {
  let formulario: FormData;
  try {
    formulario = await peticion.formData();
  } catch {
    return errorDeEntrada("No pudimos leer el formulario de la foto.");
  }

  const archivo = formulario.get("archivo");
  if (!esArchivo(archivo)) {
    return errorDeEntrada("Adjuntá la foto del producto.");
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer());

  try {
    const resultado = await panelDelAdministrador().subirFotoProducto(formulario.get("idProducto"), {
      nombre: archivo.name,
      tipo: archivo.type,
      tamano: archivo.size,
      bytes,
    });
    if (resultado.estado === "error") return respuestaDeError(resultado);

    return NextResponse.json(resultado);
  } catch (error) {
    return sinConfiguracion(error);
  }
}

function esArchivo(valor: FormDataEntryValue | null): valor is File {
  return typeof valor === "object" && valor !== null && "arrayBuffer" in valor;
}
