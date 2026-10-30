import { NextResponse } from "next/server";
import { manejarCron } from "@/lib/cron";
import { puertoCronServidor } from "@/lib/cron-servidor";
import { esFaltaDeConfiguracion } from "@/lib/errores-bd";

/**
 * Cron de vencidos — B4 · issue #18.
 *
 * Vercel Cron invoca el path con **GET** y `Authorization: Bearer <CRON_SECRET>` según
 * `vercel.json` (`59 2 * * 6` UTC = viernes 23:59 en Argentina). También se acepta **POST** para
 * poder dispararlo a mano con `curl` sin esperar al viernes. No es ejecutable por `anon`: sin el
 * secreto correcto responde `401` y sin configuración en el entorno (`CRON_SECRET` o llaves del
 * servidor), `503` explícito. Un fallo transitorio de conexión o de la base responde `500`.
 *
 * Fallback manual documentado en la spec `bd-mvp` §9.3: `select cancelar_pedidos_vencidos();`
 * desde el SQL Editor de Supabase.
 */

export const runtime = "nodejs";

async function manejar(peticion: Request) {
  try {
    return await manejarCron(peticion, puertoCronServidor());
  } catch (error) {
    if (esFaltaDeConfiguracion(error)) {
      console.error("Cron de vencidos no disponible:", error.message);
      return NextResponse.json(
        {
          estado: "error",
          motivo: "sin-configuracion",
          mensaje: error.message,
        },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }

    console.error(
      "Cron de vencidos: no se pudo cancelar los pedidos:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        estado: "error",
        motivo: "error-del-servidor",
        mensaje:
          "No pudimos cancelar los pedidos vencidos. El cron volverá a intentarlo el próximo viernes.",
      },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

export async function GET(peticion: Request) {
  return manejar(peticion);
}

export async function POST(peticion: Request) {
  return manejar(peticion);
}
