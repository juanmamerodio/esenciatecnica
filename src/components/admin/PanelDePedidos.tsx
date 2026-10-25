"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, FileText, Loader2, Send, ShieldQuestion, X } from "lucide-react";
import type { DecisionSobreComprobante, PedidoDelPanel } from "@/lib/admin";
import type { EstadoPedido } from "@/lib/database.types";
import { formatPrice } from "@/lib/format";
import { fechaEnHoraArgentina, pedirAlPanel } from "./comun";

/**
 * Pedidos con su estado actual — T7 · issue #13 (HU-2, HU-3, HU-4 y HU-5).
 *
 * El panel lee `estado_actual` (el historial es la auditoría, AGENTS §5.10). Aprobar y rechazar
 * llaman al RPC de la base: acá no se descuenta stock ni se numera ningún remito. Antes de
 * decidir, se confirma **mostrando el monto** del comprobante y el total del pedido, porque la
 * validación la hace una persona (GLOSSARY, *Validación manual*).
 */

const ESTILO_DE_ESTADO: Record<EstadoPedido, string> = {
  "Pendiente de Pago": "border-amber-300 bg-amber-50 text-amber-900",
  "Pago Validado": "border-accent/30 bg-accent-lt text-accent",
  Rechazado: "border-red-200 bg-red-50 text-red-700",
  Cancelado: "border-border bg-gray-lt text-muted",
};

type Confirmacion = { idComprobante: number; decision: DecisionSobreComprobante; monto: number };

export default function PanelDePedidos({ pedidos }: { pedidos: PedidoDelPanel[] }) {
  const router = useRouter();
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // T8: el remito se reenvía a mano cuando el email de la aprobación no salió.
  const [enviandoRemito, setEnviandoRemito] = useState<number | null>(null);
  const [avisoRemito, setAvisoRemito] = useState<string | null>(null);

  const reenviar = async (idComprobante: number) => {
    setEnviandoRemito(idComprobante);
    setAvisoRemito(null);

    const resultado = await pedirAlPanel("/api/admin/remito", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idComprobante }),
    });

    setEnviandoRemito(null);
    setAvisoRemito(
      resultado.ok
        ? "El remito se reenvió al Cliente por email."
        : `No se pudo reenviar el remito: ${resultado.mensaje}`,
    );
  };

  const decidir = async () => {
    if (!confirmacion) return;

    setEnviando(true);
    setError(null);
    setAviso(null);

    const resultado = await pedirAlPanel("/api/admin/comprobantes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idComprobante: confirmacion.idComprobante,
        decision: confirmacion.decision,
      }),
    });

    setEnviando(false);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }

    setAviso(
      confirmacion.decision === "aprobar"
        ? "El comprobante quedó aprobado y la base emitió el remito."
        : "El comprobante quedó rechazado y la reserva se liberó.",
    );
    setConfirmacion(null);
    router.refresh();
  };

  if (pedidos.length === 0) {
    return (
      <p className="card p-6 text-sm text-muted">
        Todavía no hay pedidos registrados. Cuando un Cliente confirme su compra, aparece acá con su
        comprobante para validar.
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
        <p
          role="alert"
          className="card border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}

      {avisoRemito ? (
        <p role="alert" className="card border-accent/30 bg-accent-lt p-4 text-sm text-accent">
          {avisoRemito}
        </p>
      ) : null}

      <ul className="space-y-4">
        {pedidos.map((pedido) => {
          const pendiente = pedido.comprobantes.find(
            (comprobante) => comprobante.estado === "Comprobante Subido",
          );
          // El comprobante aprobado es el que tiene el remito: su id abre la página imprimible.
          const aprobado = pedido.comprobantes.find(
            (comprobante) => comprobante.estado === "Aprobado por Admin",
          );
          const puedeDecidir = Boolean(pendiente) && pedido.estado === "Pendiente de Pago";

          return (
            <li key={pedido.id} className="card space-y-4 p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-base font-bold tracking-tight text-text">
                    Pedido #{pedido.id}
                  </h3>
                  <p className="text-sm text-muted">
                    {pedido.cliente.nombre} ·{" "}
                    <a
                      href={`mailto:${pedido.cliente.email}`}
                      className="underline underline-offset-4"
                    >
                      {pedido.cliente.email}
                    </a>
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                    {fechaEnHoraArgentina(pedido.fecha)}
                  </p>
                </div>

                <span className={`chip border ${ESTILO_DE_ESTADO[pedido.estado]}`}>
                  {pedido.estado}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-sm">
                  <caption className="sr-only">Productos del pedido #{pedido.id}</caption>
                  <thead>
                    <tr className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      <th scope="col" className="py-2">Producto</th>
                      <th scope="col" className="py-2 text-right">Cantidad</th>
                      <th scope="col" className="py-2 text-right">Precio unitario</th>
                      <th scope="col" className="py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.lineas.map((linea) => (
                      <tr key={linea.idProducto} className="border-t border-border-soft">
                        <td className="py-2 pr-3 text-text">{linea.nombre}</td>
                        <td className="py-2 text-right font-mono text-text">{linea.cantidad}</td>
                        <td className="py-2 text-right font-mono text-text">
                          {formatPrice(linea.precioUnitario)}
                        </td>
                        <td className="py-2 text-right font-mono text-text">
                          {formatPrice(linea.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <th scope="row" colSpan={3} className="py-2 text-right text-text">
                        Total del pedido
                      </th>
                      <td className="py-2 text-right font-mono text-lg font-bold text-text">
                        {formatPrice(pedido.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="space-y-2 border-t border-border-soft pt-4">
                <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Comprobantes
                </h4>

                {pedido.comprobantes.length === 0 ? (
                  <p className="text-sm text-muted">
                    El Cliente todavía no subió el comprobante. Si no lo hace antes del cierre del
                    viernes, el pedido se cancela y la reserva se libera.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {pedido.comprobantes.map((comprobante) => (
                      <li
                        key={comprobante.id}
                        className="flex flex-wrap items-center justify-between gap-3 text-sm"
                      >
                        <span className="flex flex-wrap items-center gap-2 text-text">
                          <span className="font-mono">{formatPrice(comprobante.monto)}</span>
                          <span className="chip border border-border">{comprobante.estado}</span>
                        </span>

                        {comprobante.urlFirmada ? (
                          <a
                            href={comprobante.urlFirmada}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary gap-2 px-4 py-2 text-xs"
                          >
                            <ExternalLink aria-hidden className="h-4 w-4" />
                            Ver la imagen
                            <span className="sr-only">
                              {" "}
                              del comprobante {comprobante.id} del pedido {pedido.id}
                            </span>
                          </a>
                        ) : (
                          <span className="text-xs text-muted">
                            No pudimos generar el link de la imagen: probá recargar el panel.
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {pedido.remito ? (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-text">
                    <p className="flex items-center gap-2">
                      <FileText aria-hidden className="h-4 w-4 text-accent" />
                      Remito {pedido.remito.numero} · {formatPrice(pedido.remito.total)}
                    </p>

                    {aprobado ? (
                      <Link
                        href={`/admin/remito/${aprobado.id}`}
                        className="btn-secondary gap-2 px-4 py-2 text-xs"
                      >
                        <ExternalLink aria-hidden className="h-4 w-4" />
                        Ver el remito
                      </Link>
                    ) : null}

                    {aprobado ? (
                      <button
                        type="button"
                        onClick={() => reenviar(aprobado.id)}
                        disabled={enviandoRemito !== null}
                        className="btn-secondary gap-2 px-4 py-2 text-xs disabled:opacity-60"
                        aria-label={`Reenviar el remito ${pedido.remito.numero} al Cliente`}
                      >
                        {enviandoRemito === aprobado.id ? (
                          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send aria-hidden className="h-4 w-4" />
                        )}
                        Reenviar el remito
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {puedeDecidir && pendiente ? (
                <div className="space-y-3 border-t border-border-soft pt-4">
                  {confirmacion?.idComprobante === pendiente.id ? (
                    <div
                      role="alert"
                      className="space-y-3 rounded-card border border-amber-300 bg-amber-50 p-4"
                    >
                      <p className="flex items-start gap-2 text-sm text-amber-900">
                        <ShieldQuestion aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {confirmacion.decision === "aprobar"
                            ? "Vas a aprobar el comprobante"
                            : "Vas a rechazar el comprobante"}{" "}
                          #{pendiente.id} por{" "}
                          <strong className="font-mono font-semibold">
                            {formatPrice(confirmacion.monto)}
                          </strong>
                          . El total del pedido es{" "}
                          <strong className="font-mono font-semibold">
                            {formatPrice(pedido.total)}
                          </strong>
                          . Revisá que la imagen coincida antes de confirmar.
                        </span>
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={decidir}
                          disabled={enviando}
                          className="btn-primary gap-2 px-4 py-2 text-xs disabled:opacity-60"
                        >
                          {enviando ? (
                            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check aria-hidden className="h-4 w-4" />
                          )}
                          Sí, confirmar{" "}
                          {confirmacion.decision === "aprobar" ? "la aprobación" : "el rechazo"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmacion(null)}
                          disabled={enviando}
                          className="btn-secondary gap-2 px-4 py-2 text-xs disabled:opacity-60"
                        >
                          <X aria-hidden className="h-4 w-4" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmacion({
                            idComprobante: pendiente.id,
                            decision: "aprobar",
                            monto: pendiente.monto,
                          })
                        }
                        className="btn-primary gap-2 px-4 py-2 text-xs"
                        aria-label={`Aprobar el comprobante ${pendiente.id} del pedido ${pedido.id}`}
                      >
                        <Check aria-hidden className="h-4 w-4" />
                        Aprobar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmacion({
                            idComprobante: pendiente.id,
                            decision: "rechazar",
                            monto: pendiente.monto,
                          })
                        }
                        className="btn-secondary gap-2 px-4 py-2 text-xs"
                        aria-label={`Rechazar el comprobante ${pendiente.id} del pedido ${pedido.id}`}
                      >
                        <X aria-hidden className="h-4 w-4" />
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
