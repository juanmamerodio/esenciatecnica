import { NextResponse } from "next/server";
import { leerCatalogo } from "@/lib/catalogo-servidor";

/**
 * Catálogo público en JSON. Una sola fuente con la UI: el módulo de catálogo.
 * Si la base no está migrada o no responde, devuelve 503 con el motivo — nunca una
 * lista vacía que se confunda con una tienda sin productos.
 */
export async function GET() {
  const resultado = await leerCatalogo();

  if (resultado.estado === "error") {
    // En producción no se filtra el detalle interno: el motivo queda en el log del server.
    console.error("Catálogo no disponible:", resultado.mensaje);
    return NextResponse.json(
      { error: "El catálogo no está disponible en este momento." },
      { status: 503 },
    );
  }

  return NextResponse.json({ productos: resultado.productos });
}
