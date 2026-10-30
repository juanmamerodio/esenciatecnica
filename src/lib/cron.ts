import { NextResponse } from "next/server";
import { revisarCron } from "@/lib/cron-auth";
import { esFaltaDeConfiguracion } from "@/lib/errores-bd";

/**
 * Manejador del cron de vencidos — B4 · issue #18.
 *
 * `POST /api/cron/vencidos` con `Authorization: Bearer <CRON_SECRET>` llama a la RPC
 * `cancelar_pedidos_vencidos()` con la service role y devuelve la cantidad de pedidos cancelados.
 * La regla —qué pedidos, cómo se libera la reserva, la idempotencia— vive en la base (migración
 * `02`); acá sólo se autoriza y se informa (AGENTS §5.10).
 *
 * El puerto se inyecta para testear el borde sin red: la ruta pasa `puertoCronServidor()`.
 */

export interface PuertoCron {
  /** RPC `cancelar_pedidos_vencidos()`: devuelve cuántos pedidos pasaron a `Cancelado`. */
  cancelarVencidos(): Promise<number>;
}

type CuerpoDeError = {
  estado: "error";
  motivo: "sin-secreto" | "no-autorizado" | "sin-configuracion" | "error-del-servidor";
  mensaje: string;
};

const SIN_SECRETO: CuerpoDeError = {
  estado: "error",
  motivo: "sin-secreto",
  mensaje:
    "El cron no está configurado: falta CRON_SECRET en el entorno del servidor. Avisá al equipo del proyecto.",
};

const SIN_CONFIGURACION: CuerpoDeError = {
  estado: "error",
  motivo: "sin-configuracion",
  mensaje:
    "El cron no está configurado: falta SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_URL) en el entorno del servidor. Avisá al equipo del proyecto.",
};

const NO_AUTORIZADO: CuerpoDeError = {
  estado: "error",
  motivo: "no-autorizado",
  mensaje: "El cron necesita el secreto correcto en el encabezado Authorization.",
};

const ERROR_DEL_SERVIDOR: CuerpoDeError = {
  estado: "error",
  motivo: "error-del-servidor",
  mensaje:
    "No pudimos cancelar los pedidos vencidos. El cron volverá a intentarlo el próximo viernes.",
};

export async function manejarCron(
  peticion: Request,
  puerto: PuertoCron,
  secreto: string | null | undefined = process.env.CRON_SECRET,
): Promise<NextResponse> {
  const revision = revisarCron(peticion.headers.get("authorization"), secreto);

  if (revision === "sin-secreto") {
    console.error("Cron de vencidos: falta CRON_SECRET en el entorno.");
    return sinCache(NextResponse.json(SIN_SECRETO, { status: 503 }));
  }

  if (revision === "no-autorizado") {
    return sinCache(NextResponse.json(NO_AUTORIZADO, { status: 401 }));
  }

  try {
    const cancelados = await puerto.cancelarVencidos();
    if (!Number.isInteger(cancelados) || cancelados < 0) {
      throw new Error(`La RPC devolvió una cantidad inválida: ${String(cancelados)}`);
    }
    return sinCache(NextResponse.json({ estado: "ok", cancelados }, { status: 200 }));
  } catch (error) {
    if (esFaltaDeConfiguracion(error)) {
      console.error("Cron de vencidos no disponible:", error.message);
      return sinCache(NextResponse.json(SIN_CONFIGURACION, { status: 503 }));
    }

    // Nada se silencia: el detalle queda en el log del servidor, no en la respuesta.
    console.error(
      "Cron de vencidos: no se pudo cancelar los pedidos:",
      error instanceof Error ? error.message : error,
    );
    return sinCache(NextResponse.json(ERROR_DEL_SERVIDOR, { status: 500 }));
  }
}

/** Un cron no se cachea: cada ejecución tiene que llegar a la base. */
function sinCache(respuesta: NextResponse): NextResponse {
  respuesta.headers.set("cache-control", "no-store");
  return respuesta;
}
