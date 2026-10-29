"use client";

import Image from "next/image";
import { useState } from "react";
import { Droplets } from "lucide-react";
import { esUrlDeImagenPermitida } from "@/lib/imagen";

/**
 * Imagen del producto con su plan B: si no hay `imagen_url`, la URL no resuelve o el host
 * queda fuera del contrato de `next/image`, se muestra el placeholder de la identidad
 * (fondo tonal + categoría en mono) en lugar del ícono de imagen rota (HU-5).
 *
 * El chequeo del host corre **antes** del `Image`: `next/image` tira durante el render si el
 * host no está en `images.remotePatterns` y el `onError` no llega a correr, así que un dato
 * de demo en `ejemplo.com` dejaba la Home en 500 (#49). El ícono es de cosmética e higiene,
 * no un vaso de laboratorio (#43): el Producto no es un insumo de laboratorio.
 */
export default function ImagenProducto({
  url,
  nombre,
  categoria,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
}: {
  url: string | null;
  nombre: string;
  categoria: string;
  sizes?: string;
}) {
  const [fallo, setFallo] = useState(false);
  const permitida = esUrlDeImagenPermitida(url);

  if (!url || !permitida || fallo) {
    return (
      <div
        role="img"
        aria-label={`${nombre} — sin foto, categoría ${categoria}`}
        className="flex aspect-square w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-lt to-surface"
      >
        <Droplets aria-hidden className="h-10 w-10 text-accent/60" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{categoria}</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-gray-lt">
      <Image
        src={url}
        alt={`${nombre} — ${categoria}`}
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        onError={() => setFallo(true)}
      />
    </div>
  );
}
