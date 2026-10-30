import { createClient } from "@supabase/supabase-js";
import type { PuertoCron } from "@/lib/cron";
import type { Database } from "@/lib/database.types";
import { FaltaConfiguracion } from "@/lib/errores-bd";

/**
 * Cliente mínimo para ejecutar la RPC de cancelación de vencidos.
 * Permite probar el adaptador sin depender de credenciales reales ni red.
 */
export interface ClienteRpcCron {
  rpc(funcion: "cancelar_pedidos_vencidos"): PromiseLike<{ data: unknown; error: unknown }>;
}

/**
 * Adaptador del cron contra Supabase — B4 · issue #18.
 *
 * Usa la **service role** y se instancia por llamada: `cancelar_pedidos_vencidos()` no tiene
 * EXECUTE para `anon` (migración 03), y el cliente no se crea al importar para que el build no
 * dependa de las claves (AGENTS §8).
 */
export function puertoCronServidor(): PuertoCron {
  return {
    async cancelarVencidos() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !llave) {
        throw new FaltaConfiguracion(
          "Falta SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_URL): el cron no puede cancelar los vencidos.",
        );
      }

      const cliente = createClient<Database>(url, llave, { auth: { persistSession: false } });
      return puertoSobre(cliente).cancelarVencidos();
    },
  };
}

/**
 * Adaptador sobre un cliente con la RPC `cancelar_pedidos_vencidos`.
 * Permite testear el comportamiento ante respuestas y fallos de la RPC.
 */
export function puertoSobre(cliente: ClienteRpcCron): PuertoCron {
  return {
    async cancelarVencidos() {
      const { data, error } = await cliente.rpc("cancelar_pedidos_vencidos");
      if (error) throw error;

      return Number(data);
    },
  };
}
