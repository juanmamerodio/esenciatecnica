import { NextResponse } from "next/server";
import { ESTADO_HTTP, esFaltaDeConfiguracion } from "@/lib/errores-bd";
import type { ErrorDelPanel, PanelAdmin } from "@/lib/admin";
import { crearPanelServidor } from "@/lib/admin-servidor";

/**
 * Pegamento HTTP del panel — T7 · issue #13.
 *
 * Traduce el resultado del módulo a una respuesta y el motivo del dominio a un código HTTP. Todas
 * las rutas de `src/app/api/admin/` comparten esto para no repetir la misma decisión cinco veces.
 *
 * El mapa de motivo a HTTP **no** vive acá: es el mismo del checkout
 * (`ESTADO_HTTP` en `src/lib/errores-bd.ts`), así que las dos superficies no pueden divergir (#35).
 */

export function panelDelAdministrador(): PanelAdmin {
  return crearPanelServidor();
}

export function respuestaDeError(resultado: ErrorDelPanel): NextResponse {
  const estado = ESTADO_HTTP[resultado.motivo];
  // Nada se silencia: lo que no es un dato del Administrador queda en el log del servidor.
  if (estado >= 500) {
    console.error(`Panel · ${resultado.motivo}:`, resultado.mensaje);
  }
  return NextResponse.json(resultado, { status: estado });
}

/**
 * Falla del borde del panel. Sólo la configuración ausente responde 503 con el mensaje del entorno;
 * una falla real responde 500, deja su motivo en el log y **no** inventa el diagnóstico de la
 * service role (AGENTS §7.10 · hallazgo 9 de #25).
 */
export function respuestaDeFalla(error: unknown): NextResponse {
  if (esFaltaDeConfiguracion(error)) {
    console.error("Panel no disponible:", error.message);
    return NextResponse.json(
      {
        estado: "error",
        motivo: "error-del-servidor",
        mensaje:
          "El panel no está configurado en este entorno: falta SUPABASE_SERVICE_ROLE_KEY. Avisá al equipo del proyecto.",
      },
      { status: 503 },
    );
  }

  console.error("Panel · falló la operación:", error instanceof Error ? error.message : error);
  return NextResponse.json(
    {
      estado: "error",
      motivo: "error-del-servidor",
      mensaje: "No pudimos completar la operación en el panel. Volvé a intentar en unos minutos.",
    },
    { status: 500 },
  );
}

export function errorDeEntrada(mensaje: string, campos?: Record<string, string>): NextResponse {
  return NextResponse.json(
    { estado: "error", motivo: "datos-invalidos", mensaje, campos },
    { status: 400 },
  );
}

/** El cuerpo tiene que ser un objeto JSON: una lista o un texto no es una entrada del panel. */
export function objeto(valor: unknown): Record<string, unknown> {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return {};
  return valor as Record<string, unknown>;
}

export async function leerCuerpo(
  peticion: Request,
): Promise<{ ok: true; datos: unknown } | { ok: false; respuesta: NextResponse }> {
  try {
    return { ok: true, datos: await peticion.json() };
  } catch {
    return {
      ok: false,
      respuesta: errorDeEntrada("El cuerpo de la petición no es un JSON válido."),
    };
  }
}
