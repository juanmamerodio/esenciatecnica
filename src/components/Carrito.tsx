"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { subtotalDeLinea, totalDelPedido, totalUnidades } from "@/lib/carrito";
import { useCartStore } from "@/lib/store";
import EncabezadoSeccion from "@/components/EncabezadoSeccion";

/**
 * Carrito del Cliente (T4 · issue #9). Vive en el navegador: no escribe en la base ni
 * reserva stock. El total sale del módulo de carrito, la misma cuenta que se testea sin
 * DOM.
 */
export default function Carrito() {
  const items = useCartStore((estado) => estado.items);
  const cambiarCantidad = useCartStore((estado) => estado.cambiarCantidad);
  const quitar = useCartStore((estado) => estado.quitar);
  const vaciar = useCartStore((estado) => estado.vaciar);
  const [montado, setMontado] = useState(false);

  // El carrito vive en localStorage: hasta hidratar no se puede afirmar que esté vacío.
  useEffect(() => setMontado(true), []);

  if (!montado) {
    return <p className="py-24 text-center text-sm text-muted">Cargando tu carrito…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-20 text-center">
        <ShoppingBag aria-hidden className="mx-auto h-12 w-12 text-accent" />
        <h1 className="text-2xl font-bold tracking-tight text-text">Tu carrito está vacío</h1>
        <p className="text-sm leading-relaxed text-muted">
          Todavía no agregaste productos. Explorá el catálogo para armar tu pedido.
        </p>
        <Link href="/catalog" className="btn-primary gap-2">
          Ver el catálogo
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const total = totalDelPedido(items);
  const unidades = totalUnidades(items);

  return (
    <div className="space-y-10 pb-20">
      <EncabezadoSeccion
        titulo="Tu carrito"
        subtitulo="Revisá las unidades antes de confirmar el pedido. La producción es artesanal y limitada."
      />

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="card flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text">{item.nombre}</p>
                <p className="mt-1 font-mono text-xs text-muted">{formatPrice(item.precio)} c/u</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                  aria-label={
                    item.cantidad === 1
                      ? `Quitar ${item.nombre} del carrito`
                      : `Quitar una unidad de ${item.nombre}`
                  }
                  className="rounded-full border border-border bg-surface p-2 text-text transition-colors hover:border-accent hover:text-accent"
                >
                  <Minus aria-hidden className="h-4 w-4" />
                </button>
                <span aria-live="polite" className="w-8 text-center font-mono text-sm text-text">
                  {item.cantidad}
                </span>
                <button
                  type="button"
                  onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                  disabled={item.cantidad >= item.disponible}
                  aria-label={`Agregar una unidad de ${item.nombre}`}
                  className="rounded-full border border-border bg-surface p-2 text-text transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                </button>
              </div>

              <p className="w-24 text-right font-mono font-bold text-text">
                {formatPrice(subtotalDeLinea(item.precio, item.cantidad))}
              </p>

              <button
                type="button"
                onClick={() => quitar(item.id)}
                aria-label={`Quitar ${item.nombre} del carrito`}
                className="rounded-full border border-transparent p-2 text-muted transition-colors hover:border-border hover:text-accent"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <aside className="card space-y-6 p-6">
          <h2 className="text-lg font-bold tracking-tight text-text">Resumen</h2>

          <p className="flex items-center justify-between text-sm text-muted">
            <span>Unidades</span>
            <span className="font-mono">{unidades}</span>
          </p>

          <p className="flex items-center justify-between border-t border-border-soft pt-4">
            <span className="font-semibold text-text">Total</span>
            <span className="font-mono text-2xl font-bold tracking-tight text-text">{formatPrice(total)}</span>
          </p>

          <p className="text-xs leading-relaxed text-muted">
            El pago es por transferencia y lo valida a mano un Administrador de Química. No incluye envío: el
            retiro o la entrega se coordinan después de aprobar el pago.
          </p>

          <Link href="/checkout" className="btn-primary w-full gap-2">
            Ir al checkout
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={vaciar}
            className="w-full text-xs font-medium text-muted underline underline-offset-4 hover:text-accent"
          >
            Vaciar carrito
          </button>
        </aside>
      </div>
    </div>
  );
}
