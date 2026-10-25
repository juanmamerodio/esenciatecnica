import { NextResponse } from "next/server";
import { leerCuerpo, objeto } from "@/lib/admin-http";
import { emitirRemito } from "@/lib/remito";
import { buzonDelRemito } from "@/lib/remito-servidor";

/**
 * Reenvío del remito — T8 · issue #14.
 *
 * `POST { idComprobante }`. Sirve para el caso en que la aprobación cerró la venta pero el email
 * no salió (o el Cliente lo perdió). **No** aprueba nada ni emite un remito nuevo: sólo lee el
 * que ya existe y lo vuelve a mandar (`specs/remito/spec.md` §2.4).
 */

export const runtime = "nodejs";

export async function POST(peticion: Request) {
  const cuerpo = await leerCuerpo(peticion);
  if (!cuerpo.ok) return cuerpo.respuesta;

  const datos = objeto(cuerpo.datos);

  try {
    const resultado = await emitirRemito(buzonDelRemito(), datos.idComprobante);

    if (resultado.estado === "error") {
      return NextResponse.json(resultado, {
        status: resultado.motivo === "remito-inexistente" ? 404 : 502,
      });
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("No se pudo reenviar el remito:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        estado: "error",
        motivo: "error-del-servidor",
        mensaje:
          "El panel no está configurado en este entorno: falta SUPABASE_SERVICE_ROLE_KEY o RESEND_API_KEY. Avisá al equipo del proyecto.",
      },
      { status: 503 },
    );
  }
}
