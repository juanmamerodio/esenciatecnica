"use client";

import Link from "next/link";
import { ArrowRight, ShoppingCart, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Dictionary } from "@/lib/types";
import { formatPrice } from "@/lib/format";

interface CartItem {
  id: string;
  priceArs: number;
  quantity: number;
}

interface CartSummaryProps {
  items: CartItem[];
  lang: string;
  dict: Dictionary;
}

export default function CartSummary({ items, lang, dict }: CartSummaryProps) {
  const subtotal = items.reduce((acc, item) => acc + item.priceArs * item.quantity, 0);
  const total = subtotal;

  return (
    <motion.div
      layout
      className="card p-6 sticky top-24 shadow-soft border border-border bg-glass backdrop-blur-xl"
    >
      {/* HEADER: Icono y Título */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-accent-lt rounded-2xl text-accent shadow-sm">
          <ShoppingCart className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-text tracking-tight">
          {dict.cart.summary.title}
        </h2>
      </div>

      {/* BREAKDOWN: Detalle de Precios */}
      <div className="space-y-5 mb-10">
        <div className="flex justify-between items-center group">
          <span className="text-muted font-medium group-hover:text-text transition-colors duration-300">
            {dict.cart.summary.subtotal}
          </span>
          <motion.span
            key={subtotal}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-mono font-semibold text-text tabular-nums"
          >
            {formatPrice(subtotal)}
          </motion.span>
        </div>

        {/* Divisor Animado Sutil */}
        <div className="h-px bg-border/60 w-full relative overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-accent/30 to-transparent"
          />
        </div>

        {/* TOTAL: El elemento hero del componente */}
        <div className="flex justify-between items-end">
          <span className="text-text font-bold text-lg tracking-tight">
            {dict.cart.summary.total}
          </span>
          <div className="flex flex-col items-end">
            <motion.div
              key={total}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex items-baseline gap-1"
            >
              <span className="font-mono font-bold text-3xl tracking-tighter text-accent tabular-nums">
                {formatPrice(total)}
              </span>
              <span className="text-[10px] font-bold text-accent/60 font-mono uppercase">ARS</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ACTION: Botón de Checkout con AnimatePresence */}
      <AnimatePresence mode="wait">
        {items.length > 0 ? (
          <motion.div
            key="checkout-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative group"
          >
            {/* Efecto de brillo (Shimmer) detrás del botón */}
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-accent/0 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500" />

            <Link
              href={`/${lang}/checkout`}
              className="btn-primary relative w-full flex items-center justify-center gap-3 font-bold text-lg py-4 group overflow-hidden"
            >
              <span className="relative z-10">{dict.cart.summary.cta}</span>
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="relative z-10"
              >
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.div>

              {/* Reflejo de luz que cruza el botón al hacer hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"
                style={{ width: '50%' }}
              />
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="empty-notice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-gray-lt rounded-2xl text-center border border-border/50"
          >
            <p className="text-sm font-medium text-muted">{dict.cart.emptyNotice}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER: Confianza e Institucionalidad */}
      <div className="mt-8 space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-accent-lt/40 border border-accent/10">
          <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[11px] text-accent font-medium leading-relaxed">
            {dict.cart.summary.disclaimer}
          </p>
        </div>

        <div className="flex justify-center items-center gap-2 opacity-40">
          <span className="text-[9px] font-mono font-bold tracking-widest text-muted uppercase">
            Secure Checkout
          </span>
          <div className="w-1 h-1 rounded-full bg-muted" />
          <span className="text-[9px] font-mono font-bold tracking-widest text-muted uppercase">
            SSL Encrypted
          </span>
        </div>
      </div>
    </motion.div>
  );
}