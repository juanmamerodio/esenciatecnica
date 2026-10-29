/**
 * Contrato de las imágenes de producto — #49.
 *
 * `next/image` valida el `src` **durante el render**: si el host no está en
 * `images.remotePatterns` de `next.config.ts` (hoy `**.supabase.co`, el bucket público
 * `productos`) lanza y tumba la página entera. El `onError` del componente no llega a
 * correr, así que una sola fila con un host ajeno —un dato de demo en `ejemplo.com`— deja
 * la Home en 500.
 *
 * La decisión vive acá, en un módulo puro, para que el componente pueda preguntar antes de
 * renderizar y para que se pueda testear sin navegador: el componente no repite la regla.
 */

/** Host del bucket público del proyecto: `https://<ref>.supabase.co/storage/v1/...`. */
const HOST_DE_SUPABASE = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.supabase\.co$/i;

export function esUrlDeImagenPermitida(url: string | null | undefined): boolean {
  if (typeof url !== "string") return false;

  const limpia = url.trim();
  if (!limpia) return false;

  // Ruta local de `public/`: la sirve el optimizador; si el archivo no está, ahí sí corre
  // el `onError` del componente. `//host/x` es una URL de otro host disfrazada de ruta.
  if (limpia.startsWith("/")) return !limpia.startsWith("//");

  try {
    const analizada = new URL(limpia);
    return analizada.protocol === "https:" && HOST_DE_SUPABASE.test(analizada.hostname);
  } catch {
    // No es una URL: `next/image` tampoco la aceptaría.
    return false;
  }
}
