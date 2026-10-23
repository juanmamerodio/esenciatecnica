"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CARRITO_VACIO,
  agregar as agregarAlCarrito,
  cambiarCantidad as cambiarCantidadDelCarrito,
  quitar as quitarDelCarrito,
  type ItemCarrito,
  type ProductoParaAgregar,
} from "@/lib/carrito";

/**
 * Adaptador de persistencia del carrito (T4 · issue #9).
 *
 * Toda la aritmética vive en `src/lib/carrito.ts`; acá sólo se guarda en `localStorage`.
 * El carrito no escribe en la base ni reserva stock: eso pasa al confirmar el pedido (T5).
 */
type EstadoDelCarrito = {
  items: ItemCarrito[];
  agregar: (producto: ProductoParaAgregar, cantidad?: number) => void;
  cambiarCantidad: (id: number, cantidad: number) => void;
  quitar: (id: number) => void;
  vaciar: () => void;
};

export const useCartStore = create<EstadoDelCarrito>()(
  persist(
    (set) => ({
      items: CARRITO_VACIO,

      agregar: (producto, cantidad = 1) =>
        set((estado) => ({ items: agregarAlCarrito(estado.items, producto, cantidad) })),

      cambiarCantidad: (id, cantidad) =>
        set((estado) => ({ items: cambiarCantidadDelCarrito(estado.items, id, cantidad) })),

      quitar: (id) => set((estado) => ({ items: quitarDelCarrito(estado.items, id) })),

      vaciar: () => set({ items: CARRITO_VACIO }),
    }),
    { name: "esenciatecnica-carrito" },
  ),
);
