import { NextResponse } from "next/server";
import { confirmarPedido, type EntradaCheckout, type MotivoDeError } from "@/lib/checkout";
import { puertoCheckoutServidor } from "@/lib/checkout-servidor";

/**
 * Borde del checkout — T5 · issue #10.
 *
 * Una sola ruta server-side. Recibe `datos` (JSON con Cliente, items, monto y el `idPedido` del
 * reintento) y `archivo` (la imagen del comprobante), y devuelve solo lo que la pantalla
 * muestra: nunca la service role, ni el DNI de otro Cliente, ni un listado de comprobantes.
 */

export const runtime = "nodejs";

const ESTADO_HTTP: Record<MotivoDeError, number> = {
  "datos-invalidos": 400,
  "items-invalidos": 400,
  "archivo-invalido": 400,
  "stock-insuficiente": 409,
  "producto-no-disponible": 409,
  "monto-no-coincide": 422,
  "pedido-no-pendiente": 409,
  "error-del-servidor": 500,
};

type DatosDelFormulario = {
  cliente?: unknown;
  items?: unknown;
  monto?: unknown;
  idPedido?: unknown;
};

export async function POST(peticion: Request) {
  let formulario: FormData;
  try {
    formulario = await peticion.formData();
  } catch {
    return errorDeEntrada("No pudimos leer el formulario del pedido.");
  }

  const crudos = formulario.get("datos");
  const archivo = formulario.get("archivo");

  if (typeof crudos !== "string" || !esArchivo(archivo)) {
    return errorDeEntrada("Faltan los datos del pedido o la imagen del comprobante.");
  }

  let datos: DatosDelFormulario;
  try {
    datos = JSON.parse(crudos) as DatosDelFormulario;
  } catch {
    return errorDeEntrada("Los datos del pedido llegaron ilegibles.");
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const entrada: EntradaCheckout = {
    cliente: (datos.cliente ?? {}) as EntradaCheckout["cliente"],
    items: datos.items,
    monto: datos.monto,
    idPedido: typeof datos.idPedido === "number" ? datos.idPedido : null,
    archivo: { nombre: archivo.name, tipo: archivo.type, tamano: archivo.size, bytes },
  };

  try {
    const resultado = await confirmarPedido(puertoCheckoutServidor(), entrada);

    if (resultado.estado === "ok") {
      return NextResponse.json(resultado, { status: 201 });
    }

    return NextResponse.json(resultado, { status: ESTADO_HTTP[resultado.motivo] });
  } catch (error) {
    // Falta de configuración o falla inesperada: se dice, no se devuelve un 500 opaco (AGENTS §7.10).
    console.error("Checkout no disponible:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        estado: "error",
        motivo: "error-del-servidor",
        mensaje: "El checkout no está configurado en este entorno. Avisá al equipo del proyecto.",
      },
      { status: 503 },
    );
  }
}

function esArchivo(valor: FormDataEntryValue | null): valor is File {
  return typeof valor === "object" && valor !== null && "arrayBuffer" in valor;
}

function errorDeEntrada(mensaje: string) {
  return NextResponse.json(
    { estado: "error", motivo: "datos-invalidos", mensaje },
    { status: 400 },
  );
}
