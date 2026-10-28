"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BellRing, EyeOff, Loader2 } from "lucide-react";
import type { AlertaDelPanel } from "@/lib/admin";
import { fechaEnHoraArgentina } from "@/lib/fecha";
import { pedirAlPanel } from "./comun";

/**
 * Aviso de stock del panel — T7 · issue #13 (HU-7).
 *
 * Las alertas las genera la base cuando el disponible toca el umbral. Se muestran **acá**, como
 * aviso del panel: no se envía ningún email al Administrador (AGENTS §5.7). Atender una alerta
 * sólo marca `atendida`; la fila se conserva como auditoría.
 */
export default function AvisoDeAlertas({ alertas }: { alertas: AlertaDelPanel[] }) {
  const router = useRouter();
  const [oculto, setOculto] = useState(false);
  const [atendiendo, setAtendiendo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendientes = alertas.filter((alerta) => !alerta.atendida);
  if (oculto || pendientes.length === 0) return null;

  const atender = async (idAlerta: number) => {
    setAtendiendo(idAlerta);
    setError(null);

    const resultado = await pedirAlPanel("/api/admin/alertas", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idAlerta }),
    });

    setAtendiendo(null);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }

    router.refresh();
  };

  return (
    <section
      role="alert"
      aria-labelledby="titulo-alertas"
      className="card space-y-4 border-amber-300 bg-amber-50 p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2
          id="titulo-alertas"
          className="flex items-center gap-2 text-base font-bold tracking-tight text-amber-900"
        >
          <BellRing aria-hidden className="h-5 w-5" />
          {pendientes.length === 1
            ? "Hay 1 alerta de stock sin atender"
            : `Hay ${pendientes.length} alertas de stock sin atender`}
        </h2>

        <button
          type="button"
          onClick={() => setOculto(true)}
          className="btn-secondary gap-2 px-4 py-2 text-xs"
          aria-label="Ocultar el aviso de alertas de stock"
        >
          <EyeOff aria-hidden className="h-4 w-4" />
          Ocultar aviso
        </button>
      </div>

      <ul className="space-y-3">
        {pendientes.map((alerta) => (
          <li
            key={alerta.id}
            className="flex flex-wrap items-start justify-between gap-3 border-t border-amber-200 pt-3 first:border-t-0 first:pt-0"
          >
            <p className="min-w-0 space-y-1 text-sm text-amber-900">
              <span className="font-semibold">
                {alerta.nombreProducto ?? "Producto sin identificar"}
              </span>
              <span className="block leading-relaxed">{alerta.mensaje}</span>
              <span className="block font-mono text-[11px] uppercase tracking-[0.14em] text-amber-800">
                {fechaEnHoraArgentina(alerta.fecha)}
              </span>
            </p>

            <button
              type="button"
              onClick={() => atender(alerta.id)}
              disabled={atendiendo === alerta.id}
              className="btn-secondary gap-2 px-4 py-2 text-xs disabled:opacity-60"
              aria-label={`Marcar como atendida la alerta de ${alerta.nombreProducto ?? "producto sin identificar"}`}
            >
              {atendiendo === alerta.id ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle aria-hidden className="h-4 w-4" />
              )}
              Marcar como atendida
            </button>
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
