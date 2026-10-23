import { z } from "zod";
import type { VistaCatalogo } from "@/lib/database.types";

/**
 * Módulo de catálogo — T1 · issue #5.
 *
 * Una sola función pública, `consultarCatalogo`, que envuelve todo el catálogo: valida
 * las filas que llegan del borde (Zod), descarta lo que no sirve, resuelve la
 * disponibilidad, ordena por nombre y **distingue tienda vacía de error de lectura**.
 * Nunca devuelve un catálogo vacío cuando en realidad falló la consulta.
 *
 * El orden vive acá y no en la query: `PRODUCTO` no tiene `created_at`, así que "lo más
 * nuevo" no existe en el modelo y no se inventa (spec §3.3).
 */

/** Producto tal como lo consume la tienda: sin campos legacy ni unidades crudas. */
export type ProductoCatalogo = {
  id: number;
  nombre: string;
  categoria: string;
  tipo: string;
  descripcion: string;
  precio: number;
  tiempoProduccion: number;
  imagenUrl: string | null;
  disponible: number;
  sinStock: boolean;
  sinImagen: boolean;
};

export type ResultadoCatalogo =
  | { estado: "ok"; productos: ProductoCatalogo[] }
  | { estado: "error"; mensaje: string };

/**
 * Puerto de lectura. En producción lo implementa Supabase (`vista_catalogo`); en los
 * tests, PGlite con las migraciones aplicadas. Es el único seam del slice 1.
 */
export interface LectorCatalogo {
  leer(): Promise<{ filas: VistaCatalogo[] | null; error: unknown }>;
}

/**
 * Validación del borde: la vista expone columnas nulables y PostgREST/PGlite no
 * coinciden en el formato de `numeric`, así que se coerciona y se descarta la fila
 * que no identifica un producto.
 */
const FILA_DE_CATALOGO = z.object({
  id_producto: z.number().int().positive(),
  nombre: z.string().trim().min(1),
  categoria: z.string().trim().min(1).catch("Sin categoría"),
  tipo: z.string().trim().catch(""),
  descripcion: z.string().catch(""),
  precio: z.coerce.number().finite().nonnegative().catch(0),
  tiempo_produccion: z.coerce.number().int().nonnegative().catch(0),
  imagen_url: z.string().trim().min(1).nullable().catch(null),
  disponible: z.coerce.number().int().catch(0),
});

export async function consultarCatalogo(lector: LectorCatalogo): Promise<ResultadoCatalogo> {
  let filas: VistaCatalogo[] | null;

  try {
    const lectura = await lector.leer();
    if (lectura.error) return { estado: "error", mensaje: describir(lectura.error) };
    filas = lectura.filas;
  } catch (error) {
    return { estado: "error", mensaje: describir(error) };
  }

  if (!filas) {
    return { estado: "error", mensaje: "La vista del catálogo no devolvió filas." };
  }

  return { estado: "ok", productos: normalizar(filas) };
}

function normalizar(filas: VistaCatalogo[]): ProductoCatalogo[] {
  return filas
    .flatMap((fila) => {
      const intento = FILA_DE_CATALOGO.safeParse(fila);
      if (!intento.success) return [];

      const { id_producto, nombre, categoria, tipo, descripcion, precio, tiempo_produccion, imagen_url } =
        intento.data;
      const disponible = Math.max(0, intento.data.disponible);

      return [
        {
          id: id_producto,
          nombre,
          categoria,
          tipo,
          descripcion,
          precio,
          tiempoProduccion: tiempo_produccion,
          imagenUrl: imagen_url,
          disponible,
          sinStock: disponible === 0,
          sinImagen: imagen_url === null,
        },
      ];
    })
    .sort((uno, otro) => uno.nombre.localeCompare(otro.nombre, "es"));
}

function describir(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const mensaje = error.message;
    if (typeof mensaje === "string" && mensaje.trim()) return mensaje;
  }
  return "Error desconocido al leer el catálogo.";
}
