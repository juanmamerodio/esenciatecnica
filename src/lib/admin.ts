import { z } from "zod";
import {
  ESTADOS_COMPROBANTE,
  ESTADOS_PEDIDO,
  type EstadoComprobante,
  type EstadoPedido,
} from "@/lib/database.types";

/**
 * Módulo del panel `/admin` — T7 · issue #13.
 *
 * Una sola función pública, `crearPanel(puerto)`, que devuelve un objeto cohesivo: leer pedidos,
 * stock y alertas, decidir sobre un comprobante, editar stock, mantener productos y subir su foto.
 *
 * Reglas que este módulo **no** implementa, porque viven en la base (`AGENTS.md` §5.10):
 * la reserva, el descuento de stock, los estados y la numeración del remito. Acá se valida el
 * borde con Zod, se arma el modelo de lectura y se traducen los códigos del dominio
 * (`ET001`, `ET004`, `ET005`, `ET006`) a mensajes.
 *
 * El adaptador real vive en `src/lib/admin-servidor.ts`; acá no hay red, ni Supabase, ni la
 * clave de servicio: eso es de la capa de infraestructura.
 */

/** Límites del bucket público `productos` (migración 05). */
export const LIMITES_DE_FOTO = {
  tamanoMaximo: 5 * 1024 * 1024,
  tipos: ["image/png", "image/jpeg", "image/webp"],
} as const;

const EXTENSIONES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type ArchivoDeFoto = {
  nombre: string;
  tipo: string;
  tamano: number;
  bytes: Uint8Array;
};

export type DecisionSobreComprobante = "aprobar" | "rechazar";

export type MotivoDeErrorAdmin =
  | "datos-invalidos"
  /** La fila leída no cumple el contrato del modelo. */
  | "datos-inconsistentes"
  | "stock-insuficiente"
  /** `ET007`: la cantidad quedaría por debajo de lo que ya está reservado (migración 06). */
  | "stock-bajo-reserva"
  | "comprobante-no-pendiente"
  | "monto-no-coincide"
  | "pedido-no-pendiente"
  /** `23505`: ya hay un producto activo con ese nombre (alta o edición de producto). */
  | "nombre-duplicado"
  /** `23505` en cualquier otra tabla: el dato choca con un índice único del modelo. */
  | "datos-duplicados"
  | "error-del-servidor";

export type ErrorDelPanel = {
  estado: "error";
  motivo: MotivoDeErrorAdmin;
  mensaje: string;
  campos?: Record<string, string>;
};

// ── Modelo de lectura del panel ───────────────────────────────────────────────

export type LineaDelPedido = {
  idProducto: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

export type ComprobanteDelPedido = {
  id: number;
  monto: number;
  estado: EstadoComprobante;
  /**
   * Signed URL de vida corta; `null` si Storage no pudo firmar. La **clave** del objeto en el
   * bucket privado no se expone: el módulo la usa para firmar y la descarta, así que no viaja al
   * navegador del panel (AGENTS §7.8).
   */
  urlFirmada: string | null;
};

export type RemitoDelPanel = { numero: string; total: number };

export type PedidoDelPanel = {
  id: number;
  fecha: string;
  total: number;
  /** Estado actual del pedido: el historial es la auditoría (AGENTS §5.10). */
  estado: EstadoPedido;
  cliente: { nombre: string; email: string };
  lineas: LineaDelPedido[];
  comprobantes: ComprobanteDelPedido[];
  remito: RemitoDelPanel | null;
};

export type StockDelPanel = {
  idProducto: number;
  nombre: string;
  categoria: string;
  tipo: string;
  descripcion: string;
  precio: number;
  tiempoProduccion: number;
  activo: boolean;
  imagenUrl: string | null;
  cantidadActual: number;
  cantidadReservada: number;
  cantidadWarning: number;
  disponible: number;
  /** `cantidad_warning = 0` significa "sin umbral configurado". */
  alerta: boolean;
};

export type StockActualizado = {
  idProducto: number;
  cantidadActual: number;
  cantidadReservada: number;
  cantidadWarning: number;
  disponible: number;
};

export type AlertaDelPanel = {
  id: number;
  idStock: number;
  idProducto: number | null;
  nombreProducto: string | null;
  fecha: string;
  mensaje: string;
  atendida: boolean;
};

/**
 * Datos que el borde manda para crear o editar un producto. Los nombres son los del modelo
 * (`tiempo_produccion`): el mismo que escribe la base y el mismo que viaja por la API, sin
 * traducciones intermedias.
 */
export type DatosDeProducto = {
  nombre: string;
  categoria: string;
  tipo: string;
  descripcion: string;
  precio: number;
  tiempo_produccion: number;
};

// ── Resultados: distinguen `ok` de `error` (criterio de `src/lib/catalogo.ts`) ──

export type ResultadoPedidos = { estado: "ok"; pedidos: PedidoDelPanel[] } | ErrorDelPanel;

export type ResultadoDecision =
  | {
      estado: "ok";
      idComprobante: number;
      decision: DecisionSobreComprobante;
      estadoPedido: EstadoPedido;
      remito: RemitoDelPanel | null;
    }
  | ErrorDelPanel;

export type ResultadoStock = { estado: "ok"; stock: StockDelPanel[] } | ErrorDelPanel;

export type ResultadoStockEditado = { estado: "ok"; stock: StockActualizado } | ErrorDelPanel;

export type ResultadoAlertas = { estado: "ok"; alertas: AlertaDelPanel[] } | ErrorDelPanel;

export type ResultadoAlertaAtendida =
  | { estado: "ok"; idAlerta: number; atendida: true }
  | ErrorDelPanel;

export type ResultadoProductoCreado = { estado: "ok"; idProducto: number } | ErrorDelPanel;

export type ResultadoProductoActualizado = { estado: "ok"; idProducto: number } | ErrorDelPanel;

export type ResultadoActividad =
  | { estado: "ok"; idProducto: number; activo: boolean }
  | ErrorDelPanel;

export type ResultadoFoto = { estado: "ok"; idProducto: number; url: string } | ErrorDelPanel;

export type ResultadoUrlFirmada = { estado: "ok"; url: string } | ErrorDelPanel;

/**
 * Puerto del panel. En producción lo implementa Supabase con la service role
 * (`src/lib/admin-servidor.ts`); en los tests, un falso sin red.
 *
 * Los métodos de lectura devuelven filas ya unidas por el adaptador; el módulo es el único que
 * las valida y las convierte en modelo del panel.
 */
export interface PuertoAdmin {
  leerPedidos(): Promise<{ filas: unknown[] | null; error: unknown }>;
  leerStock(): Promise<{ filas: unknown[] | null; error: unknown }>;
  leerAlertas(): Promise<{ filas: unknown[] | null; error: unknown }>;
  /** Signed URL del bucket privado `comprobantes` a partir de la clave guardada. */
  firmarComprobante(clave: string): Promise<string>;
  /** RPC `aprobar_comprobante`: la base descuenta stock, libera la reserva y emite el remito. */
  aprobarComprobante(idComprobante: number): Promise<RemitoDelPanel>;
  /** RPC `rechazar_comprobante`: la base libera la reserva sin tocar la cantidad actual. */
  rechazarComprobante(idComprobante: number): Promise<{ estado_actual: EstadoPedido }>;
  actualizarStock(
    idProducto: number,
    datos: { cantidad_actual: number; cantidad_warning: number },
  ): Promise<unknown>;
  crearProducto(datos: DatosDeProducto): Promise<{ id_producto: number }>;
  actualizarProducto(idProducto: number, datos: DatosDeProducto): Promise<void>;
  /** Baja y alta lógica: `activo`, nunca un `delete` (AGENTS §5.12). */
  cambiarActividad(idProducto: number, activo: boolean): Promise<void>;
  /** Sube la foto al bucket público y deja su URL en `producto.imagen_url`. */
  subirFoto(idProducto: number, clave: string, archivo: ArchivoDeFoto): Promise<{ url: string }>;
  atenderAlerta(idAlerta: number): Promise<void>;
}

export type PanelAdmin = {
  pedidos(): Promise<ResultadoPedidos>;
  decidirComprobante(idComprobante: unknown, decision: unknown): Promise<ResultadoDecision>;
  stock(): Promise<ResultadoStock>;
  editarStock(idProducto: unknown, datos: unknown): Promise<ResultadoStockEditado>;
  alertas(): Promise<ResultadoAlertas>;
  atenderAlerta(idAlerta: unknown): Promise<ResultadoAlertaAtendida>;
  crearProducto(datos: unknown): Promise<ResultadoProductoCreado>;
  actualizarProducto(idProducto: unknown, datos: unknown): Promise<ResultadoProductoActualizado>;
  cambiarActividad(idProducto: unknown, activo: unknown): Promise<ResultadoActividad>;
  subirFotoProducto(idProducto: unknown, archivo: ArchivoDeFoto): Promise<ResultadoFoto>;
  urlFirmadaDelComprobante(clave: unknown): Promise<ResultadoUrlFirmada>;
};

// ── Validación del borde ──────────────────────────────────────────────────────

const ESQUEMA_ID = z.coerce.number().int().positive();

const ESQUEMA_DECISION = z.enum(["aprobar", "rechazar"]);

/**
 * Entero no negativo de un formulario. Un campo vacío se rechaza en vez de interpretarse como
 * `0`: limpiar el input y guardar no puede poner el stock en cero sin querer.
 */
const enteroDeStock = (nombre: string) =>
  z.preprocess(
    (valor) => (typeof valor === "string" && valor.trim() === "" ? undefined : valor),
    z.coerce
      .number({ invalid_type_error: `${nombre} tiene que ser un número entero.` })
      .int(`${nombre} tiene que ser un número entero.`)
      .nonnegative(`${nombre} no puede ser negativa.`),
  );

const ESQUEMA_STOCK_EDITABLE = z.object({
  cantidad_actual: enteroDeStock("La cantidad"),
  cantidad_warning: enteroDeStock("El umbral"),
});

const ESQUEMA_PRODUCTO = z.object({
  nombre: z.string().trim().min(2, "El producto necesita un nombre."),
  categoria: z.string().trim().min(1, "Elegí una categoría."),
  tipo: z.string().trim().min(1, "Escribí el tipo de producto."),
  descripcion: z
    .string()
    .trim()
    .nullish()
    .transform((valor) => valor ?? ""),
  precio: z.coerce
    .number()
    .finite("El precio tiene que ser un número.")
    .positive("El precio tiene que ser mayor que cero."),
  tiempo_produccion: z.coerce
    .number()
    .int("El tiempo de producción tiene que ser un número entero de días.")
    .nonnegative("El tiempo de producción no puede ser negativo.")
    .nullish()
    .transform((valor) => valor ?? 0),
});

const ESQUEMA_CLAVE = z
  .string()
  .trim()
  .min(1, "Falta la clave del comprobante.")
  .refine(
    (valor) => !valor.includes("..") && !valor.startsWith("/") && !valor.includes("\\"),
    "La clave del comprobante no es válida.",
  );

const ESQUEMA_DETALLE = z.object({
  id_producto: ESQUEMA_ID,
  nombre: z.string().trim().min(1),
  cantidad: z.coerce.number().int().positive(),
  precio_unitario: z.coerce.number().finite().nonnegative(),
  subtotal: z.coerce.number().finite().nonnegative(),
});

const ESQUEMA_COMPROBANTE_LEIDO = z.object({
  id_comprobante: ESQUEMA_ID,
  monto: z.coerce.number().finite().nonnegative(),
  estado_actual: z.enum(ESTADOS_COMPROBANTE),
  foto_url: z.string().trim().min(1),
});

const ESQUEMA_REMITO = z.object({
  numero: z.string().trim().min(1),
  total: z.coerce.number().finite().nonnegative(),
});

const ESQUEMA_PEDIDO_LEIDO = z.object({
  id_pedido: ESQUEMA_ID,
  fecha: z.string().trim().min(1),
  total: z.coerce.number().finite().nonnegative(),
  estado_actual: z.enum(ESTADOS_PEDIDO),
  cliente: z.object({
    nombre: z.string().trim().min(1),
    email: z.string().trim().min(1),
  }),
  detalle: z
    .array(ESQUEMA_DETALLE)
    .nullish()
    .transform((valor) => valor ?? []),
  comprobantes: z
    .array(ESQUEMA_COMPROBANTE_LEIDO)
    .nullish()
    .transform((valor) => valor ?? []),
  remito: ESQUEMA_REMITO.nullish().transform((valor) => valor ?? null),
});

const ESQUEMA_STOCK_LEIDO = z.object({
  id_producto: ESQUEMA_ID,
  nombre: z.string().trim().min(1),
  categoria: z.string().trim().min(1),
  tipo: z.string().trim(),
  descripcion: z.string(),
  precio: z.coerce.number().finite().nonnegative(),
  tiempo_produccion: z.coerce.number().int().nonnegative(),
  activo: z.boolean(),
  imagen_url: z
    .string()
    .nullish()
    .transform((valor) => (valor && valor.trim() ? valor.trim() : null)),
  cantidad_actual: z.coerce.number().int().nonnegative(),
  cantidad_reservada: z.coerce.number().int().nonnegative(),
  cantidad_warning: z.coerce.number().int().nonnegative(),
});

const ESQUEMA_STOCK_ACTUALIZADO = z.object({
  id_producto: ESQUEMA_ID,
  cantidad_actual: z.coerce.number().int().nonnegative(),
  cantidad_reservada: z.coerce.number().int().nonnegative(),
  cantidad_warning: z.coerce.number().int().nonnegative(),
});

const ESQUEMA_ALERTA_LEIDA = z.object({
  id_alerta: ESQUEMA_ID,
  id_stock: ESQUEMA_ID,
  id_producto: ESQUEMA_ID.nullish().transform((valor) => valor ?? null),
  nombre: z
    .string()
    .nullish()
    .transform((valor) => (valor && valor.trim() ? valor.trim() : null)),
  fecha: z.string().trim().min(1),
  mensaje: z.string().trim().min(1),
  atendida: z.boolean(),
});

// ── El panel ──────────────────────────────────────────────────────────────────

export function crearPanel(puerto: PuertoAdmin): PanelAdmin {
  return {
    async pedidos() {
      const lectura = await leerFilas(() => puerto.leerPedidos());
      if (!lectura.ok) return lectura.resultado;

      const pedidos: PedidoDelPanel[] = [];
      for (const fila of lectura.datos) {
        const intento = ESQUEMA_PEDIDO_LEIDO.safeParse(fila);
        if (!intento.success) return filasInconsistentes("pedidos");

        const comprobantes: ComprobanteDelPedido[] = [];
        for (const comprobante of intento.data.comprobantes) {
          comprobantes.push({
            id: comprobante.id_comprobante,
            monto: comprobante.monto,
            estado: comprobante.estado_actual,
            urlFirmada: await firmarSinRomper(puerto, comprobante.foto_url),
          });
        }

        pedidos.push({
          id: intento.data.id_pedido,
          fecha: intento.data.fecha,
          total: intento.data.total,
          estado: intento.data.estado_actual,
          cliente: {
            nombre: intento.data.cliente.nombre,
            email: intento.data.cliente.email,
          },
          lineas: intento.data.detalle.map((linea) => ({
            idProducto: linea.id_producto,
            nombre: linea.nombre,
            cantidad: linea.cantidad,
            precioUnitario: linea.precio_unitario,
            subtotal: linea.subtotal,
          })),
          comprobantes,
          remito: intento.data.remito,
        });
      }

      return { estado: "ok", pedidos };
    },

    async decidirComprobante(idComprobante, decision) {
      const revision = revisarDecision(idComprobante, decision);
      if (!revision.ok) return revision.resultado;

      try {
        if (revision.decision === "aprobar") {
          // La base descuenta stock, libera la reserva y emite el remito: el front no lo toca.
          const remito = await puerto.aprobarComprobante(revision.idComprobante);
          return {
            estado: "ok",
            idComprobante: revision.idComprobante,
            decision: "aprobar",
            estadoPedido: "Pago Validado",
            remito: { numero: remito.numero, total: remito.total },
          };
        }

        const pedido = await puerto.rechazarComprobante(revision.idComprobante);
        return {
          estado: "ok",
          idComprobante: revision.idComprobante,
          decision: "rechazar",
          estadoPedido: pedido.estado_actual,
          remito: null,
        };
      } catch (error) {
        return describirError(error);
      }
    },

    async stock() {
      const lectura = await leerFilas(() => puerto.leerStock());
      if (!lectura.ok) return lectura.resultado;

      const stock: StockDelPanel[] = [];
      for (const fila of lectura.datos) {
        const intento = ESQUEMA_STOCK_LEIDO.safeParse(fila);
        if (!intento.success) return filasInconsistentes("stock");

        const { cantidad_actual, cantidad_reservada, cantidad_warning } = intento.data;
        stock.push({
          idProducto: intento.data.id_producto,
          nombre: intento.data.nombre,
          categoria: intento.data.categoria,
          tipo: intento.data.tipo,
          descripcion: intento.data.descripcion,
          precio: intento.data.precio,
          tiempoProduccion: intento.data.tiempo_produccion,
          activo: intento.data.activo,
          imagenUrl: intento.data.imagen_url,
          cantidadActual: cantidad_actual,
          cantidadReservada: cantidad_reservada,
          cantidadWarning: cantidad_warning,
          disponible: disponibleDe(cantidad_actual, cantidad_reservada),
          alerta: hayAlerta(cantidad_actual, cantidad_reservada, cantidad_warning),
        });
      }

      return { estado: "ok", stock };
    },

    async editarStock(idProducto, datos) {
      const revisionId = ESQUEMA_ID.safeParse(idProducto);
      const revisionDatos = ESQUEMA_STOCK_EDITABLE.safeParse(datos);

      if (!revisionId.success || !revisionDatos.success) {
        const campos: Record<string, string> = {};
        if (!revisionId.success) campos.idProducto = "El producto no es válido.";
        if (!revisionDatos.success) Object.assign(campos, camposDe(revisionDatos.error));
        return errorDeDatos("Revisá la cantidad y el umbral de aviso.", campos);
      }

      try {
        const actualizado = await puerto.actualizarStock(revisionId.data, revisionDatos.data);
        const intento = ESQUEMA_STOCK_ACTUALIZADO.safeParse(actualizado);
        if (!intento.success) return filasInconsistentes("stock");

        return {
          estado: "ok",
          stock: {
            idProducto: intento.data.id_producto,
            cantidadActual: intento.data.cantidad_actual,
            cantidadReservada: intento.data.cantidad_reservada,
            cantidadWarning: intento.data.cantidad_warning,
            disponible: disponibleDe(intento.data.cantidad_actual, intento.data.cantidad_reservada),
          },
        };
      } catch (error) {
        return describirError(error);
      }
    },

    async alertas() {
      const lectura = await leerFilas(() => puerto.leerAlertas());
      if (!lectura.ok) return lectura.resultado;

      const alertas: AlertaDelPanel[] = [];
      for (const fila of lectura.datos) {
        const intento = ESQUEMA_ALERTA_LEIDA.safeParse(fila);
        if (!intento.success) return filasInconsistentes("alertas");

        alertas.push({
          id: intento.data.id_alerta,
          idStock: intento.data.id_stock,
          idProducto: intento.data.id_producto,
          nombreProducto: intento.data.nombre,
          fecha: intento.data.fecha,
          mensaje: intento.data.mensaje,
          atendida: intento.data.atendida,
        });
      }

      // Primero lo que hay que atender; dentro de cada grupo, lo más reciente.
      alertas.sort((uno, otro) => {
        if (uno.atendida !== otro.atendida) return uno.atendida ? 1 : -1;
        return otro.fecha.localeCompare(uno.fecha);
      });

      return { estado: "ok", alertas };
    },

    async atenderAlerta(idAlerta) {
      const revision = ESQUEMA_ID.safeParse(idAlerta);
      if (!revision.success) {
        return errorDeDatos("La alerta no es válida.", { idAlerta: "Alerta inválida." });
      }

      try {
        await puerto.atenderAlerta(revision.data);
        return { estado: "ok", idAlerta: revision.data, atendida: true };
      } catch (error) {
        return describirError(error);
      }
    },

    async crearProducto(datos) {
      const revision = ESQUEMA_PRODUCTO.safeParse(datos);
      if (!revision.success) {
        return errorDeDatos("Revisá los datos del producto.", camposDe(revision.error));
      }

      try {
        const creado = await puerto.crearProducto(revision.data);
        return { estado: "ok", idProducto: creado.id_producto };
      } catch (error) {
        return describirError(error, "producto");
      }
    },

    async actualizarProducto(idProducto, datos) {
      const revisionId = ESQUEMA_ID.safeParse(idProducto);
      const revision = ESQUEMA_PRODUCTO.safeParse(datos);

      if (!revisionId.success || !revision.success) {
        const campos: Record<string, string> = {};
        if (!revisionId.success) campos.idProducto = "El producto no es válido.";
        if (!revision.success) Object.assign(campos, camposDe(revision.error));
        return errorDeDatos("Revisá los datos del producto.", campos);
      }

      try {
        await puerto.actualizarProducto(revisionId.data, revision.data);
        return { estado: "ok", idProducto: revisionId.data };
      } catch (error) {
        return describirError(error, "producto");
      }
    },

    async cambiarActividad(idProducto, activo) {
      const revisionId = ESQUEMA_ID.safeParse(idProducto);
      const revisionActivo = z.boolean().safeParse(activo);

      if (!revisionId.success || !revisionActivo.success) {
        const campos: Record<string, string> = {};
        if (!revisionId.success) campos.idProducto = "El producto no es válido.";
        if (!revisionActivo.success) campos.activo = "La publicación tiene que ser sí o no.";
        return errorDeDatos("No pudimos cambiar la publicación del producto.", campos);
      }

      try {
        // Baja lógica: se apaga `activo` y se conserva la fila con su historial (AGENTS §5.12).
        await puerto.cambiarActividad(revisionId.data, revisionActivo.data);
        return { estado: "ok", idProducto: revisionId.data, activo: revisionActivo.data };
      } catch (error) {
        return describirError(error);
      }
    },

    async subirFotoProducto(idProducto, archivo) {
      const revisionId = ESQUEMA_ID.safeParse(idProducto);
      if (!revisionId.success) {
        return errorDeDatos("El producto no es válido.", { idProducto: "Producto inválido." });
      }

      const revisionArchivo = revisarArchivoDeFoto(archivo);
      if (!revisionArchivo.ok) {
        return errorDeDatos(revisionArchivo.mensaje, { archivo: revisionArchivo.mensaje });
      }

      const clave = claveDeLaFoto(revisionId.data, revisionArchivo.archivo);
      try {
        const subida = await puerto.subirFoto(revisionId.data, clave, revisionArchivo.archivo);
        return { estado: "ok", idProducto: revisionId.data, url: subida.url };
      } catch (error) {
        return describirError(error);
      }
    },

    async urlFirmadaDelComprobante(clave) {
      const revision = ESQUEMA_CLAVE.safeParse(clave);
      if (!revision.success) {
        return errorDeDatos("La clave del comprobante no es válida.", {
          clave: revision.error.issues[0]?.message ?? "Clave inválida.",
        });
      }

      try {
        return { estado: "ok", url: await puerto.firmarComprobante(revision.data) };
      } catch (error) {
        return describirError(error);
      }
    },
  };
}

const ESQUEMA_ARCHIVO_DE_FOTO = z.object({
  nombre: z.string().trim().min(1, "La foto necesita un nombre de archivo."),
  tipo: z.string().trim().min(1),
  tamano: z.coerce.number().finite().nonnegative(),
  bytes: z.instanceof(Uint8Array),
});

/** Clave del objeto en el bucket público: bajo la carpeta del producto y sin poder salir de ella. */
function claveDeLaFoto(idProducto: number, archivo: ArchivoDeFoto): string {
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

  return `productos/${idProducto}/${base || "foto"}.${extension}`;
}

function revisarArchivoDeFoto(
  archivo: unknown,
): { ok: true; archivo: ArchivoDeFoto } | { ok: false; mensaje: string } {
  const revision = ESQUEMA_ARCHIVO_DE_FOTO.safeParse(archivo);
  if (!revision.success) {
    return { ok: false, mensaje: "El archivo de la foto no llegó bien: volvé a seleccionarlo." };
  }

  const datos = revision.data;
  if (!(LIMITES_DE_FOTO.tipos as readonly string[]).includes(datos.tipo)) {
    return { ok: false, mensaje: "La foto tiene que ser una imagen PNG, JPEG o WebP." };
  }
  if (datos.tamano <= 0 || datos.bytes.length === 0) {
    return { ok: false, mensaje: "El archivo de la foto llegó vacío: volvé a seleccionarlo." };
  }
  if (datos.tamano > LIMITES_DE_FOTO.tamanoMaximo) {
    return { ok: false, mensaje: "La foto del producto no puede superar los 5 MB." };
  }

  return { ok: true, archivo: datos };
}

function revisarDecision(
  idComprobante: unknown,
  decision: unknown,
):
  | { ok: true; idComprobante: number; decision: DecisionSobreComprobante }
  | { ok: false; resultado: ErrorDelPanel } {
  const revisionId = ESQUEMA_ID.safeParse(idComprobante);
  const revisionDecision = ESQUEMA_DECISION.safeParse(decision);

  if (!revisionId.success || !revisionDecision.success) {
    const campos: Record<string, string> = {};
    if (!revisionId.success) campos.idComprobante = "El comprobante no es válido.";
    if (!revisionDecision.success) campos.decision = "La decisión tiene que ser aprobar o rechazar.";
    return { ok: false, resultado: errorDeDatos("Revisá la decisión sobre el comprobante.", campos) };
  }

  return { ok: true, idComprobante: revisionId.data, decision: revisionDecision.data };
}

type RevisionDeLectura =
  | { ok: true; datos: unknown[] }
  | { ok: false; resultado: ErrorDelPanel };

async function leerFilas(
  leer: () => Promise<{ filas: unknown[] | null; error: unknown }>,
): Promise<RevisionDeLectura> {
  try {
    const lectura = await leer();
    if (lectura.error) return { ok: false, resultado: describirError(lectura.error) };
    if (!lectura.filas) {
      return {
        ok: false,
        resultado: errorDeContrato(
          "La consulta del panel no devolvió filas: no se muestra una sección vacía que se confunda con una sin datos.",
        ),
      };
    }
    return { ok: true, datos: lectura.filas };
  } catch (error) {
    return { ok: false, resultado: describirError(error) };
  }
}

async function firmarSinRomper(puerto: PuertoAdmin, clave: string): Promise<string | null> {
  try {
    return await puerto.firmarComprobante(clave);
  } catch (error) {
    // Un fallo de Storage no puede ocultar un pedido: la fila queda sin link, pero se ve.
    console.error(
      "No se pudo firmar el comprobante del pedido:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

function disponibleDe(cantidadActual: number, cantidadReservada: number): number {
  return Math.max(0, cantidadActual - cantidadReservada);
}

/** `cantidad_warning = 0` es "sin umbral configurado" (migración 02). */
function hayAlerta(
  cantidadActual: number,
  cantidadReservada: number,
  cantidadWarning: number,
): boolean {
  if (cantidadWarning <= 0) return false;
  return disponibleDe(cantidadActual, cantidadReservada) <= cantidadWarning;
}

function errorDeDatos(mensaje: string, campos?: Record<string, string>): ErrorDelPanel {
  return { estado: "error", motivo: "datos-invalidos", mensaje, campos };
}

/**
 * Una fila que no cumple el contrato detiene la sección: a diferencia del catálogo —donde el
 * producto inválido no se publica—, acá una lista incompleta podría hacer que un Administrador
 * no vea un pedido a validar.
 */
function filasInconsistentes(origen: string): ErrorDelPanel {
  return errorDeContrato(
    `Los datos de ${origen} no coinciden con el contrato del modelo, así que no se muestra una lista incompleta. Avisá al equipo del proyecto.`,
  );
}

function errorDeContrato(mensaje: string): ErrorDelPanel {
  return { estado: "error", motivo: "datos-inconsistentes", mensaje };
}

function camposDe(error: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const problema of error.issues) {
    const clave = problema.path.join(".");
    if (clave && !campos[clave]) campos[clave] = problema.message;
  }
  return campos;
}

/**
 * Los errores de la base llegan con su `errcode` (ET001..ET007, `23505` y `23514`; migraciones
 * 02 y 06): el panel los convierte en mensajes del dominio en vez de mostrar el texto crudo de
 * PostgreSQL.
 *
 * `23505` no siempre es el nombre del producto: `01` tiene índices únicos en cliente, comprobante,
 * remito, alerta y detalle. El contexto de la operación decide el mensaje.
 */
function describirError(error: unknown, contexto: "producto" | "general" = "general"): ErrorDelPanel {
  switch (codigoDeError(error)) {
    case "ET001":
      return {
        estado: "error",
        motivo: "stock-insuficiente",
        mensaje: "No hay stock suficiente para completar la operación. Revisá las cantidades.",
      };
    case "ET004":
      return {
        estado: "error",
        motivo: "comprobante-no-pendiente",
        mensaje:
          "Ese comprobante ya no está pendiente: otro Administrador lo resolvió o el pedido venció.",
      };
    case "ET005":
      return {
        estado: "error",
        motivo: "monto-no-coincide",
        mensaje:
          "El monto del comprobante no coincide con el total del pedido: revisá la imagen y el importe.",
      };
    case "ET006":
      return {
        estado: "error",
        motivo: "pedido-no-pendiente",
        mensaje: "El pedido ya no está pendiente de pago, así que el comprobante no se puede validar.",
      };
    case "ET007":
      return {
        estado: "error",
        motivo: "stock-bajo-reserva",
        mensaje:
          "No podés dejar la cantidad por debajo de lo reservado: hay pedidos pendientes que ya tomaron esas unidades. Revisá las cantidades.",
        campos: {
          cantidad_actual:
            "No podés dejar la cantidad por debajo de lo reservado: revisá la cantidad actual.",
        },
      };
    case "23505":
      if (contexto === "producto") {
        return {
          estado: "error",
          motivo: "nombre-duplicado",
          mensaje: "Ya hay un producto activo con ese nombre.",
          campos: { nombre: "Ya hay un producto activo con ese nombre." },
        };
      }
      return {
        estado: "error",
        motivo: "datos-duplicados",
        mensaje:
          "Ya existe otro registro con esos datos. Revisá los valores antes de volver a intentar.",
      };
    case "23514":
      // Último recurso: una constraint sin código de dominio. No se muestra el texto crudo.
      return {
        estado: "error",
        motivo: "datos-invalidos",
        mensaje:
          "Alguno de los datos no cumple las reglas del catálogo. Revisá los valores e intentá de nuevo.",
      };
    default:
      return {
        estado: "error",
        motivo: "error-del-servidor",
        mensaje: "No pudimos completar la operación en el panel. Volvé a intentar en unos minutos.",
      };
  }
}

function codigoDeError(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const codigo = error.code;
    if (typeof codigo === "string" && codigo) return codigo;
  }
  return null;
}
