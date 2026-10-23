"use client";

import Image from "next/image";
import { useState } from "react";
import { FlaskConical } from "lucide-react";

/**
 * Imagen del producto con su plan B: si no hay `imagen_url` o la URL no resuelve, se
 * muestra el placeholder de la identidad (fondo tonal + categoría en mono) en lugar del
 * ícono de imagen rota (HU-5).
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

  if (!url || fallo) {
    return (
      <div
        role="img"
        aria-label={`${nombre} — sin foto, categoría ${categoria}`}
        className="flex aspect-square w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-lt to-surface"
      >
        <FlaskConical aria-hidden className="h-10 w-10 text-accent/60" />
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
