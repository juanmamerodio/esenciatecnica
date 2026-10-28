import { NextResponse } from "next/server";
import type { ErrorDelPanel, MotivoDeErrorAdmin, PanelAdmin } from "@/lib/admin";
import { crearPanelServidor } from "@/lib/admin-servidor";

/**
 * Pegamento HTTP del panel — T7 · issue #13.
 *
 * Traduce el resultado del módulo a una respuesta y el estado del dominio a un código HTTP.
 * Todas las rutas de `src/app/api/admin/` son server-side y comparten esto para no repetir la
 * misma decisión cinco veces.
 */

export const ESTADO_HTTP: Record<MotivoDeErrorAdmin, number> = {
  "datos-invalidos": 400,
  "datos-inconsistentes": 500,
  "stock-insuficiente": 409,
  "stock-bajo-reserva": 409,
  "comprobante-no-pendiente": 409,
  "monto-no-coincide": 422,
  "pedido-no-pendiente": 409,
  "nombre-duplicado": 409,
  "datos-duplicados": 409,
  "error-del-servidor": 500,
};

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

/** Falta configuración del entorno: se dice, no se devuelve un 500 opaco (AGENTS §7.10). */
export function sinConfiguracion(error: unknown): NextResponse {
  console.error("Panel no disponible:", error instanceof Error ? error.message : error);
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
