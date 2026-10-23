import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Beaker } from "lucide-react";
import type { Producto } from "@/lib/supabase";
import type { Dictionary } from "@/lib/types";

interface ProductCardProps {
    product: Producto;
    lang: string;
    dict: Dictionary;
}

export default function ProductCard({ product, lang, dict }: ProductCardProps) {
    const nombre = lang === 'es' ? product.nombre_es : product.nombre_en;
    const descripcion = lang === 'es' ? product.descripcion_es : product.descripcion_en;

    // SOLUCIÓN AL ERROR 'dict is defined but never used':
    // Usamos el diccionario para traducir la categoría técnica a un nombre legible
    const categoryLabel = dict.catalog.categories[product.categoria as keyof typeof dict.catalog.categories] || product.categoria;

    return (
        <div className="card group flex flex-col h-full overflow-hidden">
            {/* Imagen con overlay de laboratorio */}
            <div className="relative aspect-square overflow-hidden bg-gray-lt">
                {product.imagen_url ? (
                    <Image
                        src={product.imagen_url}
                        alt={nombre}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                        <Beaker className="w-12 h-12 opacity-20" />
                    </div>
                )}
                <div className="absolute top-3 right-3">
                    <span className="chip text-[10px] uppercase tracking-wider font-bold">
                        {categoryLabel}
                    </span>
                </div>
            </div>

            {/* Contenido */}
            <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold text-text mb-2 leading-tight group-hover:text-accent transition-colors">
                    {nombre}
                </h3>
                <p className="text-muted text-sm line-clamp-2 mb-4 flex-grow">
                    {descripcion}
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                    <span className="font-mono font-bold text-lg text-text">
                        ${product.precio_ars.toLocaleString("es-AR")}
                    </span>

                    <Link
                        href={`/${lang}/cart`}
                        className="p-2.5 rounded-full bg-accent-lt text-accent hover:bg-accent hover:text-surface transition-all duration-200 active:scale-90"
                    >
                        <ShoppingCart className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}