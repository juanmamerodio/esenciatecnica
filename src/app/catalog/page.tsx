import { getSupabase, type Producto, type ProductCategory } from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";
import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

const ETIQUETAS_CATEGORIA: Record<ProductCategory, string> = {
  reactivos: "Reactivos",
  materiales: "Materiales",
  equipos: "Equipos",
};

interface CatalogPageProps {
  searchParams: Promise<{ categoria?: string }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { categoria } = await searchParams;
  const supabase = getSupabase();

  let query = supabase
    .from('productos')
    .select('*')
    .eq('activo', true);

  if (categoria) {
    query = query.eq('categoria', categoria as ProductCategory);
  }

  const { data: products, error } = await query;

  if (error) {
    console.error("Error fetching products:", error);
  }

  return (
    <div className="space-y-12 pb-20">
      {/* HEADER DEL CATÁLOGO */}
      <section className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Continuar comprando
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold text-text tracking-tight sm:text-5xl">
              Catálogo de <span className="text-accent underline decoration-accent/20 underline-offset-8">Productos</span>
            </h1>
            <p className="text-muted max-w-xl text-lg leading-relaxed">
              Productos de cosmética e higiene elaborados por el Departamento de Química.
            </p>
          </div>

          {/* BUSCADOR & FILTROS (Placeholders para UX) */}
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-grow md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                   disabled
                   type="text"
                   placeholder="Buscar productos..."
                   className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-surface border border-border focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-muted/60 opacity-50 cursor-not-allowed"
                />
             </div>
             <button disabled className="p-2.5 rounded-2xl bg-surface border border-border text-muted opacity-50 cursor-not-allowed">
                <SlidersHorizontal className="w-5 h-5" />
             </button>
          </div>
        </div>
      </section>

      {/* CATEGORÍAS RÁPIDAS */}
      <section className="flex flex-wrap gap-2">
        {Object.entries(ETIQUETAS_CATEGORIA).map(([key, label]) => (
          <Link
             key={key}
             href={`/catalog?categoria=${key}`}
             className={`px-6 py-2 rounded-full border transition-all duration-300 font-medium text-sm ${
                categoria === key
                ? 'bg-accent text-surface border-accent shadow-lg shadow-accent/20'
                : 'bg-surface text-muted border-border hover:border-accent/40 hover:text-accent'
             }`}
          >
            {label}
          </Link>
        ))}
        {categoria && (
           <Link
              href="/catalog"
              className="px-6 py-2 rounded-full bg-gray-lt text-muted text-sm hover:text-text transition-colors"
           >
              Ver todos
           </Link>
        )}
      </section>

      {/* GRILLA DE PRODUCTOS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in duration-700">
        {products && products.length > 0 ? (
          products.map((product: Producto) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="col-span-full py-32 text-center card bg-gray-lt/20 border-dashed">
             <p className="text-muted font-medium">No se encontraron productos en esta categoría.</p>
          </div>
        )}
      </section>
    </div>
  );
}
