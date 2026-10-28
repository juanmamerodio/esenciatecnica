"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Loader2, Save } from "lucide-react";
import type { StockDelPanel } from "@/lib/admin";
import { pedirAlPanel } from "./comun";

/**
 * Stock editable — T7 · issue #13 (HU-6).
 *
 * Se editan la cantidad actual y el umbral de aviso. El disponible lo calcula la base (actual menos
 * reservada) y la alerta de la fila es la que la base ya registró en `alerta_de_estado`: acá sólo se
 * validan los campos antes de mandarlos y no se recalcula ninguna alerta (#36).
 */

type Borrador = { cantidad_actual: string; cantidad_warning: string };

export default function PanelDeStock({ stock }: { stock: StockDelPanel[] }) {
  const router = useRouter();
  const [borradores, setBorradores] = useState<Record<number, Borrador>>({});
  const [guardando, setGuardando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const borradorDe = (fila: StockDelPanel): Borrador =>
    borradores[fila.idProducto] ?? {
      cantidad_actual: String(fila.cantidadActual),
      cantidad_warning: String(fila.cantidadWarning),
    };

  const editar = (idProducto: number, cambio: Partial<Borrador>, fila: StockDelPanel) => {
    setBorradores({ ...borradores, [idProducto]: { ...borradorDe(fila), ...cambio } });
  };

  const guardar = async (fila: StockDelPanel) => {
    const borrador = borradorDe(fila);
    setGuardando(fila.idProducto);
    setError(null);
    setAviso(null);

    const resultado = await pedirAlPanel("/api/admin/stock", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idProducto: fila.idProducto,
        cantidad_actual: Number(borrador.cantidad_actual.replace(",", ".")),
        cantidad_warning: Number(borrador.cantidad_warning.replace(",", ".")),
      }),
    });

    setGuardando(null);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }

    const siguientes = { ...borradores };
    delete siguientes[fila.idProducto];
    setBorradores(siguientes);
    setAviso(`Stock de ${fila.nombre} actualizado.`);
    router.refresh();
  };

  if (stock.length === 0) {
    return (
      <p className="card p-6 text-sm text-muted">
        No hay productos con fila de stock. Creá un producto y la base le arma su stock.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {aviso ? (
        <p role="alert" className="card border-accent/30 bg-accent-lt p-4 text-sm text-accent">
          {aviso}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="card border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="card overflow-x-auto p-4 sm:p-6">
        <table className="w-full min-w-[44rem] text-sm">
          <caption className="sr-only">
            Stock por producto: cantidad actual, reservada, disponible, umbral de aviso y edición.
          </caption>
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              <th scope="col" className="py-2">Producto</th>
              <th scope="col" className="py-2 text-right">Reservada</th>
              <th scope="col" className="py-2 text-right">Disponible</th>
              <th scope="col" className="py-2 text-right">Cantidad actual</th>
              <th scope="col" className="py-2 text-right">Umbral de aviso</th>
              <th scope="col" className="py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((fila) => {
              const borrador = borradorDe(fila);

              return (
                <tr key={fila.idProducto} className="border-t border-border-soft align-top">
                  <td className="py-3 pr-4">
                    <span className="block font-semibold text-text">{fila.nombre}</span>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      {fila.categoria} · {fila.activo ? "publicado" : "sin publicar"}
                    </span>
                    {fila.alerta ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-900">
                        <BellRing aria-hidden className="h-3.5 w-3.5" />
                        En el umbral de aviso, sin atender
                      </span>
                    ) : null}
                  </td>

                  <td className="py-3 text-right font-mono text-text">{fila.cantidadReservada}</td>
                  <td className="py-3 text-right font-mono text-text">{fila.disponible}</td>

                  <td className="py-3 text-right">
                    <label htmlFor={`actual-${fila.idProducto}`} className="sr-only">
                      Cantidad actual de {fila.nombre}
                    </label>
                    <input
                      id={`actual-${fila.idProducto}`}
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={borrador.cantidad_actual}
                      onChange={(evento) =>
                        editar(fila.idProducto, { cantidad_actual: evento.target.value }, fila)
                      }
                      className="w-24 rounded-2xl border border-border bg-surface px-3 py-2 text-right font-mono text-sm text-text outline-none focus:border-accent"
                    />
                  </td>

                  <td className="py-3 text-right">
                    <label htmlFor={`umbral-${fila.idProducto}`} className="sr-only">
                      Umbral de aviso de {fila.nombre}
                    </label>
                    <input
                      id={`umbral-${fila.idProducto}`}
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={borrador.cantidad_warning}
                      onChange={(evento) =>
                        editar(fila.idProducto, { cantidad_warning: evento.target.value }, fila)
                      }
                      className="w-24 rounded-2xl border border-border bg-surface px-3 py-2 text-right font-mono text-sm text-text outline-none focus:border-accent"
                    />
                  </td>

                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => guardar(fila)}
                      disabled={guardando === fila.idProducto}
                      className="btn-secondary gap-2 px-4 py-2 text-xs disabled:opacity-60"
                      aria-label={`Guardar el stock de ${fila.nombre}`}
                    >
                      {guardando === fila.idProducto ? (
                        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save aria-hidden className="h-4 w-4" />
                      )}
                      Guardar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        El umbral 0 significa “sin umbral configurado”: la base no dispara la alerta. La alerta de la
        fila es la que la base registró y todavía no se atendió; el disponible es la cantidad actual
        menos la reservada.
      </p>
    </div>
  );
}
