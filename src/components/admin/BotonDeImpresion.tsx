"use client";

import { Printer } from "lucide-react";

/**
 * Botón de impresión del remito (T8 · issue #14). Es lo único que necesita el navegador: el
 * documento se imprime o se guarda como PDF desde el diálogo del sistema, sin dependencias.
 */
export default function BotonDeImpresion() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-secondary gap-2 px-4 py-2 text-sm"
    >
      <Printer aria-hidden className="h-4 w-4" />
      Imprimir o guardar en PDF
    </button>
  );
}
