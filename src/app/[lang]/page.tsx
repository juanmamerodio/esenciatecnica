import { getSupabase, type Producto } from "@/lib/supabase";
import { getDictionary } from "@/lib/i18n";
import ProductCard from "@/components/ProductCard";
import {
  Beaker,
  GraduationCap,
  Heart,
  Sparkles,
  ArrowRight,
  Flame,
  Info
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'es' | 'en');
  const supabase = getSupabase();

  // Fetch de productos activos
  const { data: allProducts, error } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true);

  if (error || !allProducts) {
    console.error("Error fetching products:", error);
  }

  // Lógica de segmentación (Simulada hasta agregar columnas a la DB)
  // En un entorno real, usaríamos .eq('is_popular', true)
  const popularProducts = (allProducts as Producto[])?.slice(0, 4) || [];
  const offerProducts = (allProducts as Producto[])?.filter(p => p.precio_ars < 2000).slice(0, 4) || [];

  return (
    <div className="space-y-24 pb-20">

      {/* 1. HERO SECTION - Identidad y Propósito */}
      <section className="relative overflow-hidden rounded-[40px] bg-accent-lt p-8 md:p-20 text-center">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface text-accent text-xs font-bold uppercase tracking-widest shadow-sm border border-accent/10">
            <GraduationCap className="w-3 h-3" />
            Proyecto Educativo · E.E.S.T N°1 Luciano Reyes
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-text tracking-tight leading-[1.1]">
            Ciencia que se siente, <br />
            <span className="text-accent italic font-serif">calidad artesanal.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray max-w-2xl mx-auto leading-relaxed">
            Transformamos el aprendizaje de química en productos reales.
            Jabones, champús y fórmulas creadas por alumnos de 7mo año.
          </p>

          {/* BOTONES DE NAVEGACIÓN PRINCIPAL */}
          <div className="flex flex-wrap justify-center gap-4 pt-6">
            <Link
              href={`/${lang}/catalog`}
              className="btn-primary flex items-center gap-2 text-lg px-8 group"
            >
              Ver Catálogo Completo
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href={`/${lang}/about`}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-white/50 backdrop-blur-md text-text font-medium border border-border hover:bg-white transition-all"
            >
              <Info className="w-5 h-5" />
              Sobre el Proyecto
            </Link>
          </div>
        </div>
      </section>

      {/* 2. SECCIÓN DE POPULARES - "Lo más buscado" */}
      <section className="space-y-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-lt text-accent">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-bold text-text tracking-tight">Favoritos de la Comunidad</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularProducts.map((product: Producto) => (
            <ProductCard key={product.id} product={product} lang={lang} dict={dict} />
          ))}
        </div>
      </section>

      {/* 3. SECCIÓN DE OFERTAS - "Oportunidades" */}
      <section className="relative p-8 md:p-12 rounded-[40px] bg-text text-surface overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <Flame className="w-64 h-64 rotate-12" />
        </div>

        <div className="relative z-10 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-accent font-bold uppercase tracking-widest text-sm">
                <Flame className="w-4 h-4" />
                Ofertas Especiales
              </div>
              <h2 className="text-4xl font-bold tracking-tight">Precios Promocionales</h2>
              <p className="text-gray-400 max-w-md">
                Productos seleccionados con descuento para apoyar la producción del laboratorio.
              </p>
            </div>
            <Link href={`/${lang}/catalog`} className="text-accent font-semibold flex items-center gap-2 hover:underline">
              Ver todas las ofertas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {offerProducts.map((product: Producto) => (
              <div key={product.id} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[20px] p-4 transition-transform hover:scale-[1.02]">
                <ProductCard product={product} lang={lang} dict={dict} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. VALORES DEL PROYECTO - El "Por qué" */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            icon: <Beaker className="w-6 h-6" />,
            title: "Ciencia Aplicada",
            desc: "Cada jabón y champú es el resultado de una práctica de laboratorio real y controlada."
          },
          {
            icon: <Heart className="w-6 h-6" />,
            title: "Sin Fines de Lucro",
            desc: "Los fondos recaudados se reinvierten en materiales para el departamento de química."
          },
          {
            icon: <GraduationCap className="w-6 h-6" />,
            title: "Formación Técnica",
            desc: "Apoyando este proyecto, impulsás la educación técnica de los alumnos de 7mo año."
          },
        ].map((item, i) => (
          <div key={i} className="card p-8 flex flex-col items-center text-center space-y-4 group">
            <div className="p-4 rounded-3xl bg-accent-lt text-accent group-hover:bg-accent group-hover:text-surface transition-all duration-300">
              {item.icon}
            </div>
            <h4 className="text-xl font-semibold text-text">{item.title}</h4>
            <p className="text-muted leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>

    </div>
  );
}