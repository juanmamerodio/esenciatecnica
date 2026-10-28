import { z } from "zod";

/**
 * Módulo del **archivo subido** — `deuda-codigo-25-10` · hallazgo 8 (#35 · issue #25).
 *
 * Una sola definición para los dos usos del sistema —el comprobante del checkout y la foto del
 * producto—: la tabla de tipos permitidos, el tope de tamaño, la revisión del archivo (con sus
 * mensajes de dominio) y la clave del objeto en el bucket. Antes eran tres pares de funciones
 * gemelas (`checkout.revisarArchivo`, `admin.revisarArchivoDeFoto` y el `revisar` del componente),
 * y una de ellas se desincronizaba sin que nadie lo notara.
 *
 * Interfaces chicas: `revisarTipoYTamano` (lo que un `File` del navegador ya sabe), `revisarArchivo`
 * (el archivo entero, ya en el servidor) y `claveDelArchivo`.
 */

/** Los dos usos del sistema. El uso decide el bucket y el nombre de respaldo. */
export type UsoDeArchivo = "comprobante" | "foto";

/** Archivo ya materializado: es lo que sube el servidor al bucket. */
export type ArchivoSubido = {
  nombre: string;
  tipo: string;
  tamano: number;
  bytes: Uint8Array;
};

/** Lo mínimo para revisar tipo y tamaño: un `File` del navegador también encaja acá. */
export type ArchivoPesado = { tipo: string; tamano: number };

/** Límites de los dos buckets de Storage (migraciones 04 y 05). Una sola tabla. */
export const LIMITES_DE_ARCHIVO = {
  tamanoMaximo: 5 * 1024 * 1024,
  tipos: ["image/png", "image/jpeg", "image/webp"],
} as const;

type ConfiguracionDeUso = {
  bucket: string;
  /** Cómo se nombra el uso en los mensajes del dominio. */
  etiqueta: string;
  /** Nombre del objeto cuando el archivo original no deja nada usable. */
  respaldo: string;
};

const POR_USO: Record<UsoDeArchivo, ConfiguracionDeUso> = {
  comprobante: { bucket: "comprobantes", etiqueta: "El comprobante", respaldo: "comprobante" },
  foto: { bucket: "productos", etiqueta: "La foto del producto", respaldo: "foto" },
};

const EXTENSIONES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function bucketDe(uso: UsoDeArchivo): string {
  return POR_USO[uso].bucket;
}

/**
 * Clave del objeto en el bucket: bajo la carpeta del uso, saneada y sin poder salir de ella
 * (`..`, barras del nombre original y mayúsculas quedan afuera).
 */
export function claveDelArchivo(uso: UsoDeArchivo, id: number, archivo: ArchivoSubido): string {
  const { bucket, respaldo } = POR_USO[uso];
  const extension = EXTENSIONES[archivo.tipo] ?? "png";
  const ultimoSegmento = archivo.nombre.split(/[\\/]/).pop() ?? "";
  const base = ultimoSegmento
    .replace(/\.[^.]*$/, "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${bucket}/${id}/${base || respaldo}.${extension}`;
}

/** Los mensajes del dominio del archivo viven acá y en ningún otro lado. */
const MENSAJES = {
  ilegible: (etiqueta: string) => `${etiqueta} no llegó bien: volvé a seleccionarlo.`,
  tipo: (etiqueta: string) => `${etiqueta} tiene que ser una imagen PNG, JPEG o WebP.`,
  vacio: (etiqueta: string) => `${etiqueta} llegó vacío: volvé a seleccionarlo.`,
  grande: (etiqueta: string) => `${etiqueta} no puede superar los 5 MB.`,
};

/**
 * Revisa tipo y tamaño y devuelve el mensaje del dominio, o nulo si el archivo sirve. Es la parte
 * que el navegador puede usar sin leer los bytes; el servidor vuelve a revisar con `revisarArchivo`.
 */
export function revisarTipoYTamano(archivo: ArchivoPesado, uso: UsoDeArchivo): string | null {
  const { etiqueta } = POR_USO[uso];

  if (!(LIMITES_DE_ARCHIVO.tipos as readonly string[]).includes(archivo.tipo)) {
    return MENSAJES.tipo(etiqueta);
  }
  if (archivo.tamano <= 0) return MENSAJES.vacio(etiqueta);
  if (archivo.tamano > LIMITES_DE_ARCHIVO.tamanoMaximo) return MENSAJES.grande(etiqueta);
  return null;
}

const ESQUEMA_DE_ARCHIVO = z.object({
  nombre: z.string().trim().min(1),
  tipo: z.string().trim().min(1),
  tamano: z.coerce.number().finite().nonnegative(),
  bytes: z.instanceof(Uint8Array),
});

export type RevisionDeArchivo =
  | { ok: true; archivo: ArchivoSubido }
  | { ok: false; mensaje: string };

/**
 * Revisión completa en el servidor: el archivo llega crudo por el borde, así que primero se valida
 * la forma (Zod) y después los límites del bucket. Una sola forma de revisar para los dos usos.
 */
export function revisarArchivo(archivo: unknown, uso: UsoDeArchivo): RevisionDeArchivo {
  const revision = ESQUEMA_DE_ARCHIVO.safeParse(archivo);
  const { etiqueta } = POR_USO[uso];
  if (!revision.success) {
    return { ok: false, mensaje: MENSAJES.ilegible(etiqueta) };
  }

  const datos = revision.data;
  // El archivo que llegó sin un solo byte se dice antes que nada: es el caso más común de los tres.
  if (datos.bytes.length === 0) {
    return { ok: false, mensaje: MENSAJES.vacio(etiqueta) };
  }

  const problema = revisarTipoYTamano(datos, uso);
  if (problema) return { ok: false, mensaje: problema };

  return { ok: true, archivo: datos };
}
