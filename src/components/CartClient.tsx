"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingBag, Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import CartSummary from "@/components/CartSummary";
import CartItem from "@/components/CartItem";
import { useCartStore } from "@/lib/store";
import type { Dictionary } from "@/lib/types";

interface CartClientProps {
  dict: Dictionary;
  lang: string;
}

export default function CartClient({ dict, lang }: CartClientProps) {
  const { items } = useCartStore();
  const isEmpty = items.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* HEADER: Navegación y Título */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="flex flex-col gap-6"
      >
        <Link
          href={`/${lang}`}
          className="inline-flex items-center gap-2 text-muted hover:text-accent font-medium transition-all group w-fit"
        >
          <div className="p-2 rounded-full bg-gray-lt group-hover:bg-accent-lt transition-colors">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="text-sm">{dict.cart.continueShopping}</span>
        </Link>

        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-text tracking-tight">
            {dict.cart.title} <span className="text-accent relative">
              {dict.cart.titleAccent}
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="absolute bottom-1 left-0 h-1.5 bg-accent/20 rounded-full"
              />
            </span>
          </h1>
          <p className="text-muted text-sm md:text-base max-w-2xl">
            Revisá tus productos seleccionados antes de proceder al pago.
            Toda la producción es artesanal y limitada.
          </p>
        </div>
      </motion.header>

      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* LISTA DE PRODUCTOS */}
        <div className="flex-grow w-full min-h-[400px]">
          <AnimatePresence mode="popLayout">
            {isEmpty ? (
              <motion.div
                key="empty-cart"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 20 }}
                className="flex flex-col items-center justify-center py-24 px-6 card border-dashed border-border/60 bg-gray-lt/20 text-center"
              >
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="w-28 h-28 bg-accent-lt rounded-full flex items-center justify-center mb-8 shadow-inner"
                >
                  <ShoppingBag className="w-12 h-12 text-accent opacity-60" />
                </motion.div>

                <h2 className="text-2xl font-bold text-text mb-3">{dict.cart.emptyTitle}</h2>
                <p className="text-muted max-w-sm mb-10 leading-relaxed">
                  {dict.cart.emptyDescription}
                </p>

                <Link
                  href={`/${lang}`}
                  className="btn-primary flex items-center gap-2 px-8 py-4 text-lg shadow-lg shadow-accent/20 active:scale-95 transition-all"
                >
                  {dict.cart.exploreProducts}
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="cart-items"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-4"
              >
                {items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={{
                      id: item.id,
                      name: item.name,
                      priceArs: item.priceArs,
                      quantity: item.quantity
                    }}
                    lang={lang}
                    dict={dict}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PANEL LATERAL DE RESUMEN */}
        <aside className="w-full lg:w-[420px] shrink-0 sticky top-24 space-y-6">
          <CartSummary
            items={items}
            lang={lang}
            dict={dict}
          />

          {/* AVISO INSTITUCIONAL - Estilo M3 Alert */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="p-5 rounded-[24px] bg-surface border border-border shadow-soft flex gap-4"
          >
            <div className="shrink-0 p-2 rounded-xl bg-accent-lt text-accent">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-text font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>Nota Institucional</span>
              </div>
              <p className="text-[12px] text-muted leading-relaxed">
                Este es un proyecto educativo de la <span className="text-text font-medium">E.E.S.T N°1 Luciano Reyes</span>.
                Los pagos se verifican manualmente por el departamento de Química para asegurar la transparencia del fondo escolar.
              </p>
            </div>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}