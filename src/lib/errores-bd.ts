import type { z } from "zod";

/**
 * Módulo de **errores de base** — `deuda-codigo-25-10` · hallazgos 8, 9 y 11 (#35 · issue #25).
 *
 * El error crudo de Postgres/Supabase entra acá una sola vez y sale como **motivo del dominio**;
 * el mapa de motivo a estado HTTP también vive acá y lo comparten el checkout y el panel. Antes
 * cada superficie traducía el mismo código a su manera y los dos mapas de HTTP podían divergir.
 *
 * Interfaces chicas: `motivoDeBd`, `estadoHttp`, `camposDeZod` y `FaltaConfiguracion`.
 */

/**
 * Lo que el checkout puede devolver al Cliente, como **tupla**: es la única fuente del tipo y la
 * que alimenta el `z.enum` del esquema que valida la respuesta en el borde del cliente (#46).
 */
export const MOTIVOS_DEL_CHECKOUT = [
  "datos-invalidos",
  "items-invalidos",
  "archivo-invalido",
  "stock-insuficiente",
  "producto-no-disponible",
  "monto-no-coincide",
  "pedido-no-pendiente",
  "error-del-servidor",
] as const;

export type MotivoDelCheckout = (typeof MOTIVOS_DEL_CHECKOUT)[number];

/** Lo que el panel puede devolver al Administrador: misma regla, misma única fuente. */
export const MOTIVOS_DEL_PANEL = [
  "datos-invalidos",
  "datos-inconsistentes",
  "stock-insuficiente",
  "stock-bajo-reserva",
  "comprobante-no-pendiente",
  "monto-no-coincide",
  "pedido-no-pendiente",
  "nombre-duplicado",
  "datos-duplicados",
  "error-del-servidor",
] as const;

export type MotivoDelPanel = (typeof MOTIVOS_DEL_PANEL)[number];

/** Todos los motivos del sistema: la unión de las dos superficies. */
export type MotivoDeError = MotivoDelCheckout | MotivoDelPanel;

/**
 * Código crudo → motivo. Los `ET00x` son los `errcode` de las migraciones 02 y 06; `23505` y
 * `23514` son los SQLSTATE de unicidad y de `check` de PostgreSQL. Un código desconocido devuelve
 * nulo: la superficie decide qué decir en vez de adivinar.
 */
export const MOTIVO_POR_CODIGO: Record<string, MotivoDeError> = {
  ET001: "stock-insuficiente",
  ET002: "producto-no-disponible",
  ET003: "items-invalidos",
  ET004: "comprobante-no-pendiente",
  ET005: "monto-no-coincide",
  ET006: "pedido-no-pendiente",
  ET007: "stock-bajo-reserva",
  "23505": "datos-duplicados",
  "23514": "datos-invalidos",
};

/** Motivo → estado HTTP. Una sola tabla, compartida por el checkout y el panel. */
export const ESTADO_HTTP: Record<MotivoDeError, number> = {
  "datos-invalidos": 400,
  "items-invalidos": 400,
  "archivo-invalido": 400,
  "stock-insuficiente": 409,
  "producto-no-disponible": 409,
  "stock-bajo-reserva": 409,
  "comprobante-no-pendiente": 409,
  "monto-no-coincide": 422,
  "pedido-no-pendiente": 409,
  "nombre-duplicado": 409,
  "datos-duplicados": 409,
  "datos-inconsistentes": 500,
  "error-del-servidor": 500,
};

export function estadoHttp(motivo: MotivoDeError): number {
  return ESTADO_HTTP[motivo];
}

/** El `errcode` de PostgreSQL/Supabase, si el error lo trae. */
export function codigoDeError(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const codigo = (error as { code?: unknown }).code;
    if (typeof codigo === "string" && codigo.trim()) return codigo.trim();
  }
  return null;
}

/** El motivo del dominio para un error de base, o nulo si el código no está en el mapa. */
export function motivoDeBd(error: unknown): MotivoDeError | null {
  const codigo = codigoDeError(error);
  return codigo ? (MOTIVO_POR_CODIGO[codigo] ?? null) : null;
}

/** Los campos inválidos de un `ZodError`, con su mensaje, en la forma que espera el borde. */
export function camposDeZod(error: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = problema.path.join(".");
    if (campo && !campos[campo]) {
      campos[campo] = problema.message;
    }
  }
  return campos;
}

/**
 * La infraestructura que falta no es un error de base: es configuración ausente. Se distingue con
 * un tipo propio para que el borde responda 503 sólo en este caso y 500 ante una falla real
 * (hallazgo 9): un error de permisos no puede disfrazarse de «falta la service role».
 */
export class FaltaConfiguracion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "FaltaConfiguracion";
  }
}

export function esFaltaDeConfiguracion(error: unknown): error is FaltaConfiguracion {
  return error instanceof FaltaConfiguracion;
}
