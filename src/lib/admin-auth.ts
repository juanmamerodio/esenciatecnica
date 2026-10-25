/**
 * Decisión del Basic Auth del panel — T7 · issue #13.
 *
 * Una sola función pública, `revisarBasicAuth(encabezado, contrasena)`, que traduce el
 * encabezado `Authorization` y el `ADMIN_PASSWORD` del entorno a un veredicto. Vive acá y no
 * en `middleware.ts` porque el runtime Edge no se puede testear con Vitest en `environment:
 * node`: el middleware resuelve el encabezado, este módulo decide.
 *
 * - `sin-configurar`: falta `ADMIN_PASSWORD`. El borde responde 503 y no 401: un 401 mudo
 *   mandaría al Administrador a buscar una contraseña que no existe (AGENTS §7.10).
 * - `sin-credenciales`: no vino encabezado; el navegador tiene que pedir las credenciales.
 * - `invalido`: el encabezado está mal formado o la contraseña no coincide.
 * - `ok`: adelante.
 *
 * El MVP no tiene Administradores en base (`ADMIN`/`ROL` son fase 2): el nombre de usuario se
 * ignora y el único secreto es la contraseña compartida (spec `admin` §6.3).
 */

export type RevisionBasicAuth = "ok" | "sin-credenciales" | "invalido" | "sin-configurar";

/** Esquema Basic: `Basic` + espacio + credenciales en base64 (`usuario:contrasena`). */
const ESQUEMA_BASIC = /^basic\s+(\S+)$/i;

export function revisarBasicAuth(
  encabezado: string | null,
  contrasena: string | null | undefined,
): RevisionBasicAuth {
  if (!contrasena) return "sin-configurar";
  if (!encabezado || !encabezado.trim()) return "sin-credenciales";

  const coincidencia = encabezado.trim().match(ESQUEMA_BASIC);
  if (!coincidencia) return "invalido";

  const credenciales = decodificar(coincidencia[1]);
  if (credenciales === null) return "invalido";

  // El separador es el primer `:`: la contraseña puede tener dos puntos.
  const separador = credenciales.indexOf(":");
  if (separador < 0) return "invalido";

  const declarada = credenciales.slice(separador + 1);
  return coinciden(declarada, contrasena) ? "ok" : "invalido";
}

/**
 * Base64 → texto. El encabezado viaja en Base64 de bytes UTF-8 (el `charset="UTF-8"` que
 * anuncia el 401), así que se decodifica como bytes y no como Latin-1: una contraseña con
 * acentos tiene que entrar.
 */
function decodificar(valor: string): string | null {
  try {
    const binario = atob(valor);
    const bytes = new Uint8Array(binario.length);
    for (let indice = 0; indice < binario.length; indice += 1) {
      bytes[indice] = binario.charCodeAt(indice);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    // Base64 inválido: `atob` tira. No se filtra el detalle.
    return null;
  }
}

/** Comparación en tiempo constante: no se filtra cuántos caracteres coincidieron. */
function coinciden(uno: string, otro: string): boolean {
  const a = new TextEncoder().encode(uno);
  const b = new TextEncoder().encode(otro);

  let diferencia = a.length ^ b.length;
  const largo = Math.max(a.length, b.length);
  for (let indice = 0; indice < largo; indice += 1) {
    diferencia |= (a[indice] ?? 0) ^ (b[indice] ?? 0);
  }

  return diferencia === 0;
}
