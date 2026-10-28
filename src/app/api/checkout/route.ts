import { NextResponse } from "next/server";
import { confirmarPedido, type EntradaCheckout } from "@/lib/checkout";
import { ESTADO_HTTP, esFaltaDeConfiguracion } from "@/lib/errores-bd";
import { puertoCheckoutServidor } from "@/lib/checkout-servidor";

/**
 * Borde del checkout — T5 · issue #10.
 *
 * Una sola ruta server-side. Recibe `datos` (JSON con Cliente, items, monto y el `idPedido` del
 * reintento) y `archivo` (la imagen del comprobante), y devuelve solo lo que la pantalla
 * muestra: nunca la service role, ni el DNI de otro Cliente, ni un listado de comprobantes.
 *
 * El mapa de motivo a HTTP es el compartido con el panel (`src/lib/errores-bd.ts`): una sola
 * definición para las dos superficies (#35 · #25).
 */

export const runtime = "nodejs";

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
    if (esFaltaDeConfiguracion(error)) {
      console.error("Checkout no disponible:", error.message);
      return NextResponse.json(
        {
          estado: "error",
          motivo: "error-del-servidor",
          mensaje:
            "El checkout no está configurado en este entorno. Avisá al equipo del proyecto.",
        },
        { status: 503 },
      );
    }

    // Falla real: se dice que es un error del servidor y el motivo queda en el log, sin disfrazarlo
    // de entorno mal configurado (AGENTS §7.10).
    console.error(
      "Checkout · falló la operación:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        estado: "error",
        motivo: "error-del-servidor",
        mensaje: "No pudimos completar el pedido. Volvé a intentar en unos minutos.",
      },
      { status: 500 },
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
