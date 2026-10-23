import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { consultarCatalogo, type LectorCatalogo, type ResultadoCatalogo } from "@/lib/catalogo";
import type { Database } from "@/lib/database.types";

/**
 * Lector de catálogo contra el contrato canónico (`vista_catalogo`).
 *
 * Es la única deuda de transición: `src/lib/supabase.ts` sigue siendo el cliente legacy
 * de `/admin` y las APIs viejas, que se retiran en T5/T7. Este cliente habla sólo del
 * esquema aprobado (`src/lib/database.types.ts`).
 */

let cliente: SupabaseClient<Database> | null = null;

function clientePublico(): SupabaseClient<Database> {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !llave) {
      throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
    cliente = createClient<Database>(url, llave, { auth: { persistSession: false } });
  }
  return cliente;
}

export function lectorSupabase(instancia: SupabaseClient<Database>): LectorCatalogo {
  return {
    async leer() {
      // Sin `order` ni `limit`: el orden es una regla del módulo, una sola fuente.
      const { data, error } = await instancia.from("vista_catalogo").select("*");
      return { filas: data, error };
    },
  };
}

/**
 * Catálogo público listo para la UI. Cuando la base no está migrada o no responde, esto
 * devuelve `estado: 'error'`: la tienda muestra su estado de error, nunca un catálogo
 * vacío que parezca una tienda sin productos.
 */
export async function leerCatalogo(): Promise<ResultadoCatalogo> {
  try {
    return await consultarCatalogo(lectorSupabase(clientePublico()));
  } catch (error) {
    return {
      estado: "error",
      mensaje: error instanceof Error ? error.message : "No se pudo abrir el catálogo.",
    };
  }
}
