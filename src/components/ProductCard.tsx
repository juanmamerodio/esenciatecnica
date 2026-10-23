"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Check, Beaker } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/lib/store";
import { type Producto } from "@/lib/supabase";
import type { Dictionary } from "@/lib/types";

interface ProductCardProps {
  product: Producto;
  lang: string;
  dict: Dictionary;
}

export default function ProductCard({
  product,
  lang,
  dict,
}: ProductCardProps) {
  const { id, nombre_es, nombre_en, descripcion_es, descripcion_en, precio_ars, categoria, imagen_url } = product;
  const { addItem } = useCartStore();
  const [isAdded, setIsAdded] = useState(false);

  const name = lang === 'en' ? nombre_en : nombre_es;
  const description = lang === 'en' ? (descripcion_en || "") : (descripcion_es || "");
  const categoryLabel = dict.catalog.categories[categoria] || categoria;
  const addToCartText = dict.catalog.addToCart;

  const handleAddToCart = () => {
    addItem({
      id,
      name,
      priceArs: precio_ars,
      quantity: 1
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <motion.div
      layout
      whileHover={{ y: -8 }}
      className="card group flex flex-col overflow-hidden h-full border border-border hover:border-accent/30 transition-all duration-500 shadow-soft hover:shadow-xl hover:shadow-accent/10"
    >
      {/* IMAGEN: Contenedor con profundidad */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-lt">
        {imagen_url ? (
          <motion.img
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
            src={imagen_url}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-lt to-surface">
            <div className="w-16 h-16 rounded-3xl bg-accent-lt flex items-center justify-center border border-accent/10 text-accent">
              <Beaker className="w-8 h-8 opacity-60" />
            </div>
            <span className="text-muted/40 text-[10px] font-mono font-bold uppercase tracking-widest">
              Lab Sample {id.substring(0, 4)}
            </span>
          </div>
        )}

        {/* Category Chip - Estilo M3 Assist */}
        <div className="absolute top-3 left-3 chip shadow-sm uppercase text-[10px] font-bold tracking-wider z-10">
          {categoryLabel}
        </div>

        {/* Overlay de brillo al hacer hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* INFO: Contenido con jerarquía clara */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-text leading-tight transition-colors group-hover:text-accent duration-300">
            {name}
          </h3>
          <p className="text-sm text-muted line-clamp-2 mt-1 leading-relaxed opacity-80">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted font-bold uppercase tracking-tighter opacity-60">Precio</span>
            <span className="font-mono text-xl text-text font-bold tracking-tighter">
              {formatPrice(precio_ars)}
            </span>
          </div>

          {/* BOTÓN: Acción con feedback háptico visual */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleAddToCart}
            className={`relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 border shadow-sm ${isAdded
                ? 'bg-accent text-surface border-accent'
                : 'bg-surface text-accent border-accent/20 hover:bg-accent hover:text-surface hover:border-accent'
              }`}
          >
            <AnimatePresence mode="wait">
              {isAdded ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 45 }}
                  className="flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Añadido</span>
                </motion.div>
              ) : (
                <motion.div
                  key="cart"
                  initial={{ scale: 0, rotate: 45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: -45 }}
                  className="flex items-center gap-1"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{addToCartText}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Efecto de pulso al añadir */}
            {isAdded && (
              <motion.div
                initial={{ scale: 0, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-white rounded-full"
              />
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}