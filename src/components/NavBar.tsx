"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Beaker } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { useEffect, useState } from "react";

const ENLACES = [
  { nombre: "Inicio", href: "/" },
  { nombre: "Catálogo", href: "/catalog" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { getTotalItems } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Hook de scroll para efecto de transparencia dinámica
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 20);
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const itemCount = mounted ? getTotalItems() : 0;

  return (
    <motion.header
      animate={{
        backgroundColor: isScrolled ? "rgba(247, 247, 245, 0.8)" : "rgba(247, 247, 245, 0)",
        backdropFilter: isScrolled ? "blur(32px) saturate(180%)" : "blur(0px) saturate(100%)",
        borderBottomColor: isScrolled ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0)",
        y: isScrolled ? 0 : -10,
        opacity: isScrolled ? 1 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 z-50 w-full border-b transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* LOGO SECTION */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-80"
          >
            <Beaker className="w-6 h-6 text-accent" strokeWidth={2.5} />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-bold text-lg tracking-wider">
                <span className="text-accent">E.E.S.T N°1</span> <span className="text-text">QUÍMICA</span>
              </span>
            </div>
          </Link>

          {/* NAV LINKS */}
          <nav className="hidden md:flex items-center gap-1">
            {ENLACES.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 text-sm font-medium transition-colors group"
                >
                  <span className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-accent' : 'text-muted group-hover:text-text'}`}>
                    {link.nombre}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-accent-lt rounded-full -z-0"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}

            <Link
              href="/admin"
              className={`ml-2 px-4 py-2 rounded-full text-sm font-medium border border-border transition-all duration-300 ${pathname.startsWith('/admin')
                ? 'bg-accent text-surface border-accent'
                : 'text-accent hover:bg-gray-lt border-accent/20'
                }`}
            >
              Gestión
            </Link>
          </nav>
        </div>

        {/* ACTIONS SECTION */}
        <div className="flex items-center gap-4">
          {/* CART BUTTON */}
          <Link
            href="/cart"
            aria-label="Ver carrito"
            className="relative p-2.5 rounded-full bg-surface/50 border border-border text-text hover:bg-surface hover:shadow-soft transition-all duration-300 group"
          >
            <motion.div
              whileHover={{ rotate: -10, scale: 1.1 }}
              className="flex items-center justify-center"
            >
              <ShoppingCart className="w-5 h-5 group-hover:text-accent transition-colors" />
            </motion.div>

            <AnimatePresence>
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  key={itemCount}
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-surface text-[10px] font-bold shadow-md border-2 border-bg"
                >
                  {itemCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

      </div>
    </motion.header>
  );
}
