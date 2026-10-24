import { z } from "zod";
import type { VistaCatalogo } from "@/lib/database.types";

/**
 * Módulo de catálogo — T1 (#5) y T2 (#6).
 *
 * Una sola función pública, `consultarCatalogo`, que envuelve todo el catálogo: valida
 * las filas que llegan del borde (Zod), descarta lo que no sirve, resuelve la
 * disponibilidad, ordena por nombre, aplica la consulta del Cliente y **distingue tienda
 * vacía de error de lectura**. Nunca devuelve un catálogo vacío cuando en realidad falló
 * la consulta.
 *
 * El orden y el filtrado viven acá y no en la query: `PRODUCTO` no tiene `created_at`,
 * así que "lo más nuevo" no existe en el modelo y no se inventa (spec §3.3).
 */

/** Consulta del Cliente: búsqueda libre y categoría exacta. */
export type ConsultaCatalogo = {
  busqueda?: string;
  categoria?: string;
};

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
  | { estado: "ok"; productos: ProductoCatalogo[]; categorias: string[] }
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
 * coinciden en el formato de `numeric`, así que se coerciona.
 *
 * Sin valores de relleno: si un campo del dominio viene vacío o inválido, la fila se
 * descarta — antes que inventar una categoría o un precio, el producto no se publica.
 * Sólo dos tolerancias, las que ya define el modelo: `imagen_url` nula es "sin imagen"
 * (HU-5) y un producto sin fila en `stock` vale `disponible = 0` (HU-3).
 */
const FILA_DE_CATALOGO = z.object({
  id_producto: z.number().int().positive(),
  nombre: z.string().trim().min(1),
  categoria: z.string().trim().min(1),
  tipo: z.string().trim(),
  descripcion: z.string(),
  precio: z.coerce.number().finite().nonnegative(),
  tiempo_produccion: z.coerce.number().int().nonnegative(),
  imagen_url: z
    .string()
    .nullish()
    .transform((valor) => (valor && valor.trim() ? valor.trim() : null)),
  disponible: z
    .coerce.number()
    .int()
    .nullish()
    .transform((valor) => Math.max(0, valor ?? 0)),
});

export async function consultarCatalogo(
  lector: LectorCatalogo,
  consulta: ConsultaCatalogo = {},
): Promise<ResultadoCatalogo> {
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

  const catalogo = normalizar(filas);

  return {
    estado: "ok",
    productos: filtrar(catalogo, consulta),
    // Las categorías salen del catálogo completo: los chips no se vacían al filtrar.
    categorias: [...new Set(catalogo.map((producto) => producto.categoria))].sort((uno, otro) =>
      uno.localeCompare(otro, "es"),
    ),
  };
}

function filtrar(productos: ProductoCatalogo[], consulta: ConsultaCatalogo): ProductoCatalogo[] {
  const termino = sinAcentos(consulta.busqueda ?? "").trim();
  const categoria = consulta.categoria?.trim() ?? "";

  return productos.filter((producto) => {
    if (categoria && producto.categoria !== categoria) return false;
    if (!termino) return true;

    const campos = [producto.nombre, producto.categoria, producto.tipo, producto.descripcion].join(" ");
    return sinAcentos(campos).includes(termino);
  });
}

/** La búsqueda del Cliente no distingue mayúsculas ni acentos. */
function sinAcentos(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
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
