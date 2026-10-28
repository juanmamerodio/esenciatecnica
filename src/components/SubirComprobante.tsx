"use client";

import { useRef, useState } from "react";
import { FileCheck2, Paperclip, X } from "lucide-react";
import { LIMITES_DE_ARCHIVO, revisarTipoYTamano } from "@/lib/archivo";

/**
 * Selector del comprobante (T5 · issue #10). Valida contra los límites del bucket y avisa en
 * el momento; el módulo del checkout vuelve a validar en el servidor, que es donde manda.
 *
 * No usa `<img>`: la vista previa de un archivo local obliga a un data URL y a un elemento sin
 * optimizar. Se muestra nombre y peso, que es lo que el Cliente necesita para confirmar.
 */
export default function SubirComprobante({
  onCambio,
  error,
}: {
  onCambio: (archivo: File | null) => void;
  error?: string;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const elegir = (seleccionado: File | null) => {
    if (!seleccionado) {
      setArchivo(null);
      setProblema(null);
      onCambio(null);
      return;
    }

    const motivo = revisar(seleccionado);
    if (motivo) {
      setArchivo(null);
      setProblema(motivo);
      onCambio(null);
      if (entrada.current) entrada.current.value = "";
      return;
    }

    setArchivo(seleccionado);
    setProblema(null);
    onCambio(seleccionado);
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor="comprobante"
        className="flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-dashed border-border bg-gray-lt/40 px-6 py-8 text-center transition-colors hover:border-accent"
      >
        <Paperclip aria-hidden className="h-7 w-7 text-accent" />
        <span className="text-sm font-semibold text-text">
          Adjuntá la foto de la transferencia
        </span>
        <span className="font-mono text-[11px] text-muted">PNG, JPEG o WebP · hasta 5 MB</span>
        <input
          ref={entrada}
          id="comprobante"
          name="comprobante"
          type="file"
          accept={LIMITES_DE_ARCHIVO.tipos.join(",")}
          className="text-xs text-muted file:mr-3 file:rounded-pill file:border file:border-border file:bg-surface file:px-4 file:py-2 file:text-xs file:font-semibold file:text-accent"
          aria-describedby={problema || error ? "comprobante-error" : undefined}
          onChange={(evento) => elegir(evento.target.files?.[0] ?? null)}
        />
      </label>

      {archivo ? (
        <p className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3">
          <span className="flex min-w-0 items-center gap-2 text-sm text-text">
            <FileCheck2 aria-hidden className="h-4 w-4 shrink-0 text-accent" />
            <span className="truncate">{archivo.name}</span>
            <span className="shrink-0 font-mono text-[11px] text-muted">{peso(archivo.size)}</span>
          </span>
          <button
            type="button"
            onClick={() => elegir(null)}
            aria-label={`Quitar ${archivo.name}`}
            className="rounded-full border border-border p-1.5 text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </p>
      ) : null}

      <p id="comprobante-error" aria-live="polite" className="text-xs text-red-600">
        {problema ?? error ?? ""}
      </p>
    </div>
  );
}

function revisar(archivo: File): string | null {
  // Es la misma revisión del servidor, con los mismos mensajes: el borde no tiene su propia copia.
  return revisarTipoYTamano({ tipo: archivo.type, tamano: archivo.size }, "comprobante");
}

function peso(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
