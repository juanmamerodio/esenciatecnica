"use client";

import { motion } from "framer-motion";
import { Trash2, Minus, Plus, Beaker } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/lib/store";
import type { Dictionary } from "@/lib/types";

interface CartItemProps {
  item: {
    id: string;
    name: string;
    priceArs: number;
    quantity: number;
    image?: string; // Añadido soporte para imagen real
  };

  dict: Dictionary;
}

export default function CartItem({ item, dict }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();

  const handleIncrement = () => updateQuantity(item.id, item.quantity + 1);
  const handleDecrement = () => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    } else {
      removeItem(item.id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="card group flex flex-col sm:flex-row items-center justify-between p-4 gap-6 hover:shadow-soft transition-all duration-300"
    >
      {/* SECCIÓN IZQUIERDA: Producto e Info */}
      <div className="flex items-center gap-5 w-full sm:w-auto">
        <div className="relative w-24 h-24 shrink-0">
          {/* Thumbnail con efecto Glassmorphism */}
          <div className="w-full h-full bg-accent-lt rounded-3xl flex items-center justify-center border border-accent/20 overflow-hidden group-hover:border-accent/40 transition-colors duration-300 shadow-inner">
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Beaker className="w-8 h-8 text-accent opacity-60" />
                <span className="text-[10px] font-bold text-accent/60 font-mono uppercase">Lab</span>
              </div>
            )}
          </div>
          {/* Badge de cantidad flotante (estilo iOS) */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent text-surface text-[10px] font-bold rounded-full flex items-center justify-center shadow-md border-2 border-bg">
            {item.quantity}
          </div>
        </div>

        <div className="flex-grow text-center sm:text-left">
          <h3 className="font-semibold text-text tracking-tight text-lg line-clamp-1 group-hover:text-accent transition-colors duration-300">
            {item.name}
          </h3>
          <p className="text-sm font-mono text-muted mt-1 flex items-center justify-center sm:justify-start gap-1">
            <span className="text-text font-medium">{formatPrice(item.priceArs)}</span>
            <span className="opacity-50 text-[11px] uppercase tracking-tighter">{dict.cart.each}</span>
          </p>
        </div>
      </div>

      {/* SECCIÓN DERECHA: Controles y Precio */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-6 bg-gray-lt/50 sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-transparent sm:border-0">

        {/* Selector de Cantidad - Estilo M3 Pill */}
        <div className="flex items-center bg-surface rounded-full border border-border p-1 shadow-sm">
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleDecrement}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-accent hover:bg-accent-lt rounded-full transition-all duration-200"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </motion.button>

          <motion.span
            key={item.quantity}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="font-mono text-sm px-3 min-w-[2.5rem] text-center font-bold text-text"
          >
            {item.quantity}
          </motion.span>

          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleIncrement}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-accent hover:bg-accent-lt rounded-full transition-all duration-200"
            aria-label="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        {/* Precio Final y Acción de Borrado */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <motion.p
              key={item.priceArs * item.quantity}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-mono font-bold text-text text-xl tracking-tighter"
            >
              {formatPrice(item.priceArs * item.quantity)}
            </motion.p>
          </div>

          <motion.button
            whileHover={{ scale: 1.1, color: "#ef4444" }}
            whileTap={{ scale: 0.9 }}
            onClick={() => removeItem(item.id)}
            className="p-3 text-muted transition-all duration-200 rounded-2xl hover:bg-red-50 border border-transparent hover:border-red-100"
            title={dict.cart.remove}
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}