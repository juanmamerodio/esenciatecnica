"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import type { ProductoCatalogo } from "@/lib/catalogo";
import { useCartStore } from "@/lib/store";

/**
 * Agregar al carrito desde la card (HU-1). La card no lo muestra si el producto está sin
 * stock, así que acá no hace falta un estado deshabilitado por disponibilidad.
 */
export default function AgregarAlCarrito({ producto }: { producto: ProductoCatalogo }) {
  const agregar = useCartStore((estado) => estado.agregar);
  const [agregado, setAgregado] = useState(false);

  const alAgregar = () => {
    agregar({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      disponible: producto.disponible,
    });
    setAgregado(true);
    window.setTimeout(() => setAgregado(false), 1600);
  };

  return (
    <>
      <button
        type="button"
        onClick={alAgregar}
        aria-label={`Agregar ${producto.nombre} al carrito`}
        className={`inline-flex items-center gap-2 rounded-pill border px-4 py-2 text-xs font-semibold transition-colors ${
          agregado
            ? "border-accent bg-accent text-surface"
            : "border-accent bg-surface text-accent hover:bg-accent hover:text-surface"
        }`}
      >
        {agregado ? (
          <>
            <Check aria-hidden className="h-4 w-4" />
            Agregado
          </>
        ) : (
          <>
            <ShoppingCart aria-hidden className="h-4 w-4" />
            Agregar
          </>
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {agregado ? `${producto.nombre} agregado al carrito` : ""}
      </span>
    </>
  );
}
