import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { FaltaConfiguracion } from "@/lib/errores-bd";
import type { Database } from "@/lib/database.types";

/**
 * Obtiene un cliente de Supabase con clave de servicio en tiempo de ejecución.
 *
 * Cumple con HU-2 y AGENTS §7.4, §7.13:
 * - Se instancia dentro del cuerpo de la función invocada, nunca a nivel de módulo.
 * - Valida en el momento `SUPABASE_SERVICE_ROLE_KEY` y `NEXT_PUBLIC_SUPABASE_URL`.
 * - Lanza la excepción canónica tipada `FaltaConfiguracion` si alguna falta.
 * - Deshabilita la persistencia de sesión (`persistSession: false`).
 * - Permite que `npm run build` compile sin secretos en CI con el entorno vacío (#50).
 */
export function obtenerClienteServicio(contexto?: string): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !llave) {
    const detalle = contexto ? `: ${contexto}` : ".";
    throw new FaltaConfiguracion(
      `Falta SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_URL)${detalle}`,
    );
  }

  return createClient<Database>(url, llave, {
    auth: { persistSession: false },
  });
}
