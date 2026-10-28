import { z } from "zod";
import { claveDelArchivo, revisarArchivo, type ArchivoSubido } from "@/lib/archivo";
import {
  camposDeZod,
  motivoDeBd,
  type MotivoDelCheckout,
} from "@/lib/errores-bd";
import type { EstadoPedido, ItemPedido } from "@/lib/database.types";
import { redondearACentavos } from "@/lib/format";

/**
 * Módulo de checkout — T5 · issue #10.
 *
 * Una sola función pública, `confirmarPedido(puerto, entrada)`, que envuelve el camino de
 * compra en el orden que exige el dominio (spec §2):
 *
 *   1. valida el borde (Cliente, items, monto y archivo) antes de tocar la base;
 *   2. resuelve el Cliente por email (reutiliza el que existe o lo crea);
 *   3. llama a la RPC `crear_pedido`: el pedido nace `Pendiente de Pago`, el total lo calcula
 *      la base y la reserva de stock pasa en la misma transacción;
 *   4. sube la imagen al bucket privado y guarda en `COMPROBANTE.foto_url` la **clave** del
 *      objeto, no una URL pública;
 *   5. registra el comprobante con el monto que declaró el Cliente.
 *
 * Si un intento anterior ya creó el pedido, el reintento llega con `idPedido` y **no** vuelve
 * a llamar a `crear_pedido`: solo reintenta la subida. El historial lo escribe la base.
 *
 * El adaptador real vive en `src/lib/checkout-servidor.ts`; acá no hay red, ni Supabase, ni
 * `SUPABASE_SERVICE_ROLE_KEY`.
 */

export type DatosDelCliente = {
  nombre: string;
  email: string;
  dni: string;
  telefono: string | null;
};

/**
 * El email del Cliente se guarda y se busca **normalizado**.
 *
 * La unicidad de la base es `unique (lower(email))` (migración 01) y el borde ya lo baja a
 * minúsculas antes de tocar la base; el adaptador vuelve a normalizar porque el puerto es público
 * y un `%` o un `_` no puede convertirse en un patrón que alcance la fila de otra persona (#33).
 */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Lo que llega del borde, todavía sin validar: los campos de un formulario son texto y los
 * items viajan como JSON. El módulo es el único que los convierte en datos del dominio.
 */
export type EntradaCheckout = {
  cliente: { nombre: unknown; email: unknown; dni: unknown; telefono?: unknown };
  items: unknown;
  monto: unknown;
  archivo: ArchivoSubido;
  /** Presente solo si un intento anterior ya creó el pedido. */
  idPedido?: number | null;
};

/** Lo que el checkout puede devolver: subconjunto de los motivos del dominio (#35). */
export type MotivoDeError = MotivoDelCheckout;

export type ResultadoCheckout =
  | { estado: "ok"; idPedido: number; total: number; numeroDeComprobante: number }
  | {
      estado: "error";
      motivo: MotivoDeError;
      mensaje: string;
      campos?: Record<string, string>;
      /** Total que calculó la base, cuando el error fue por el monto declarado. */
      total?: number;
      /** Pedido ya creado: el reintento lo reutiliza para no duplicar la reserva. */
      idPedido?: number;
    };

/**
 * Puerto del checkout. En producción lo implementa Supabase (`crear_pedido`, `cliente`,
 * `comprobante` y Storage) con la service role; en los tests, un falso sin red.
 */
export interface PuertoCheckout {
  buscarCliente(email: string): Promise<{ id_cliente: number } | null>;
  crearCliente(datos: DatosDelCliente): Promise<{ id_cliente: number }>;
  buscarPedido(
    idPedido: number,
  ): Promise<{ id_pedido: number; total: number; estado_actual: EstadoPedido } | null>;
  crearPedido(
    idCliente: number,
    items: ItemPedido[],
  ): Promise<{ id_pedido: number; total: number; estado_actual: EstadoPedido }>;
  comprobantePendiente(idPedido: number): Promise<{ id_comprobante: number } | null>;
  subirArchivo(clave: string, archivo: ArchivoSubido): Promise<void>;
  registrarComprobante(datos: {
    idPedido: number;
    clave: string;
    monto: number;
    /** Si ya había un comprobante pendiente, se reemplaza esa misma fila. */
    idComprobante?: number;
  }): Promise<{ id_comprobante: number }>;
}

const ESQUEMA_CLIENTE = z.object({
  nombre: z.string().trim().min(2, "Escribí tu nombre completo."),
  email: z
    .string()
    .trim()
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Revisá el email: no tiene un formato válido.")
    .transform(normalizarEmail),
  dni: z.string().trim().regex(/^[0-9]{7,8}$/, "El DNI tiene que tener 7 u 8 dígitos."),
  telefono: z
    .string()
    .trim()
    .max(30, "El teléfono es demasiado largo.")
    .nullish()
    .transform((valor) => (valor ? valor : null)),
});

const ESQUEMA_MONTO = z.coerce
  .number()
  .finite("El monto tiene que ser un número.")
  .positive("El monto tiene que ser mayor que cero.");

const ESQUEMA_ITEMS = z
  .array(
    z.object({
      id_producto: z.coerce.number().int().positive(),
      cantidad: z.coerce.number().int().positive(),
    }),
  )
  .min(1, "El pedido no tiene productos.")
  .max(50, "El pedido tiene demasiados productos.")
  .refine((items) => new Set(items.map((item) => item.id_producto)).size === items.length, {
    message: "Cada producto va una sola vez: revisá el carrito.",
  });

export async function confirmarPedido(
  puerto: PuertoCheckout,
  entrada: EntradaCheckout,
): Promise<ResultadoCheckout> {
  const revision = revisarEntrada(entrada);
  if (!revision.ok) return revision.resultado;

  const { cliente, items, monto, idPedido } = revision;
  let pedidoCreado: number | null = idPedido;

  try {
    // Reintento: el pedido ya existe, así que no se vuelve a crear ni se re-reserva stock.
    if (idPedido !== null) {
      const pedido = await puerto.buscarPedido(idPedido);
      if (!pedido) {
        return {
          estado: "error",
          motivo: "pedido-no-pendiente",
          mensaje: "No encontramos ese pedido. Volvé a confirmarlo desde el carrito.",
        };
      }
      if (pedido.estado_actual !== "Pendiente de Pago") {
        return {
          estado: "error",
          motivo: "pedido-no-pendiente",
          mensaje:
            "Ese pedido ya no está pendiente de pago, así que no se le puede agregar un comprobante nuevo.",
          idPedido,
        };
      }
      if (!coincideElMonto(pedido.total, monto)) {
        return montoQueNoCoincide(pedido.id_pedido, pedido.total);
      }

      return await completarComprobante(
        puerto,
        { idPedido, archivo: entrada.archivo, monto, total: pedido.total },
        true,
      );
    }

    const existente = await puerto.buscarCliente(cliente.email);
    const clienteFinal = existente ?? (await puerto.crearCliente(cliente));
    const pedido = await puerto.crearPedido(clienteFinal.id_cliente, items);
    // Desde acá el pedido ya existe y su reserva con él: los errores lo devuelven.
    pedidoCreado = pedido.id_pedido;

    if (!coincideElMonto(pedido.total, monto)) {
      return montoQueNoCoincide(pedido.id_pedido, pedido.total);
    }

    return await completarComprobante(
      puerto,
      { idPedido: pedido.id_pedido, archivo: entrada.archivo, monto, total: pedido.total },
      false,
    );
  } catch (error) {
    const { motivo, mensaje } = describirError(error);
    return { estado: "error", motivo, mensaje, idPedido: pedidoCreado ?? undefined };
  }
}

/**
 * El total que el Cliente ve en el resumen de la transferencia.
 *
 * **Manda el de la base** apenas lo devuelve la respuesta (por ejemplo, tras `monto-no-coincide`):
 * el Cliente tiene que transferir el número del pedido que el Administrador va a comparar. El total
 * del carrito sólo manda antes de confirmar (#34 · hallazgo 5 de `deuda-codigo-25-10`).
 */
export function totalAVisualizar(totalDeLaBase: number | null, totalDelCarrito: number): number {
  return totalDeLaBase ?? totalDelCarrito;
}

type Revision =
  | { ok: true; cliente: DatosDelCliente; items: ItemPedido[]; monto: number; idPedido: number | null }
  | { ok: false; resultado: ResultadoCheckout };

function revisarEntrada(entrada: EntradaCheckout): Revision {
  const cliente = ESQUEMA_CLIENTE.safeParse(entrada.cliente);
  if (!cliente.success) {
    return {
      ok: false,
      resultado: {
        estado: "error",
        motivo: "datos-invalidos",
        mensaje: "Revisá tus datos: hay campos que no son válidos.",
        campos: camposDeZod(cliente.error),
      },
    };
  }

  const items = ESQUEMA_ITEMS.safeParse(entrada.items);
  if (!items.success) {
    return {
      ok: false,
      resultado: {
        estado: "error",
        motivo: "items-invalidos",
        mensaje: items.error.issues[0]?.message ?? "El pedido no tiene productos válidos.",
      },
    };
  }

  const archivo = revisarArchivo(entrada.archivo, "comprobante");
  if (!archivo.ok) {
    return {
      ok: false,
      resultado: { estado: "error", motivo: "archivo-invalido", mensaje: archivo.mensaje },
    };
  }

  const monto = ESQUEMA_MONTO.safeParse(entrada.monto);
  if (!monto.success) {
    return {
      ok: false,
      resultado: {
        estado: "error",
        motivo: "datos-invalidos",
        mensaje: "Revisá el monto transferido.",
        campos: { monto: monto.error.issues[0]?.message ?? "Monto inválido." },
      },
    };
  }

  const idPedido = entrada.idPedido ?? null;
  if (idPedido !== null && (!Number.isSafeInteger(idPedido) || idPedido <= 0)) {
    return {
      ok: false,
      resultado: {
        estado: "error",
        motivo: "datos-invalidos",
        mensaje: "El pedido del reintento no es válido.",
        campos: { idPedido: "Pedido inválido." },
      },
    };
  }

  return {
    ok: true,
    cliente: cliente.data,
    items: items.data,
    // El monto se guarda como lo declaró el Cliente, en la precisión del modelo (NUMERIC(12,2)).
    monto: redondearACentavos(monto.data),
    idPedido,
  };
}

async function completarComprobante(
  puerto: PuertoCheckout,
  datos: { idPedido: number; archivo: ArchivoSubido; monto: number; total: number },
  buscarPendiente: boolean,
): Promise<ResultadoCheckout> {
  const pendiente = buscarPendiente ? await puerto.comprobantePendiente(datos.idPedido) : null;
  const clave = claveDelArchivo("comprobante", datos.idPedido, datos.archivo);

  await puerto.subirArchivo(clave, datos.archivo);

  const guardado = await puerto.registrarComprobante({
    idPedido: datos.idPedido,
    clave,
    monto: datos.monto,
    idComprobante: pendiente?.id_comprobante,
  });

  return {
    estado: "ok",
    idPedido: datos.idPedido,
    total: datos.total,
    numeroDeComprobante: guardado.id_comprobante,
  };
}

function montoQueNoCoincide(idPedido: number, total: number): ResultadoCheckout {
  return {
    estado: "error",
    motivo: "monto-no-coincide",
    mensaje:
      "El importe tiene que coincidir con el total del pedido. Corregí el monto y volvé a subir el comprobante.",
    total,
    idPedido,
  };
}

function coincideElMonto(uno: number, otro: number): boolean {
  return redondearACentavos(uno) === redondearACentavos(otro);
}

/**
 * Los errores de la base llegan con su `errcode` (ET001..ET006, migración 02): el módulo del
 * archivo y el de errores de base traducen el código a un **motivo del dominio** una sola vez
 * (#35 · #25) y acá sólo se elige el mensaje que lee el Cliente.
 */
function describirError(error: unknown): { motivo: MotivoDeError; mensaje: string } {
  switch (motivoDeBd(error)) {
    case "stock-insuficiente":
      return {
        motivo: "stock-insuficiente",
        mensaje: "No hay stock suficiente de uno de los productos. Ajustá las cantidades y volvé a intentar.",
      };
    case "producto-no-disponible":
      return {
        motivo: "producto-no-disponible",
        mensaje: "Uno de los productos del pedido ya no está disponible. Quitalo del carrito y volvé a intentar.",
      };
    case "items-invalidos":
      return {
        motivo: "items-invalidos",
        mensaje: "El pedido tiene un producto repetido o una cantidad inválida. Revisá el carrito.",
      };
    case "monto-no-coincide":
      return {
        motivo: "monto-no-coincide",
        mensaje: "El importe tiene que coincidir con el total del pedido.",
      };
    case "pedido-no-pendiente":
      return {
        motivo: "pedido-no-pendiente",
        mensaje: "El pedido ya no está pendiente de pago.",
      };
    default:
      break;
  }

  return {
    motivo: "error-del-servidor",
    mensaje: fallaDeStorage(error)
      ? "No pudimos subir el comprobante. El pedido quedó registrado: volvé a intentar la subida."
      : "No pudimos completar el pedido. Volvé a intentar en unos minutos.",
  };
}

/** Una falla de Storage no trae `code` de Postgres: se reconoce por el mensaje del cliente. */
function fallaDeStorage(error: unknown): boolean {
  return error instanceof Error && /bucket|storage|subir/i.test(error.message);
}
