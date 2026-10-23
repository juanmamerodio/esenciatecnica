import { GraduationCap, Beaker, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AboutPageProps {
   params: Promise<{ lang: string }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
   const { lang } = await params;


   return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
         <section className="space-y-6 text-center">
            <Link
               href={`/${lang}`}
               className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium transition-colors group mb-4"
            >
               <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
               Volver al Inicio
            </Link>
            <div className="w-20 h-20 bg-accent-lt rounded-[24px] flex items-center justify-center mx-auto shadow-sm">
               <GraduationCap className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-4xl font-extrabold text-text tracking-tight sm:text-6xl">
               Sobre el <span className="text-accent underline decoration-accent/20 underline-offset-8">Proyecto</span>
            </h1>
            <p className="text-lg text-muted max-w-2xl mx-auto leading-relaxed">
               E.E.S.T N°1 Luciano Reyes · Departamento de Química · Campana, Buenos Aires.
            </p>
         </section>

         <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card p-8 space-y-4">
               <div className="p-3 bg-accent-lt border border-accent/10 rounded-2xl w-fit text-accent">
                  <Beaker className="w-6 h-6" />
               </div>
               <h2 className="text-2xl font-bold text-text">Educación Técnica</h2>
               <p className="text-muted leading-relaxed">
                  Este e-commerce es el proyecto final de los alumnos de 7mo año del área de Programación, integrando saberes con el departamento de Química.
               </p>
            </div>
            <div className="card p-8 space-y-4">
               <div className="p-3 bg-accent-lt border border-accent/10 rounded-2xl w-fit text-accent">
                  <Users className="w-6 h-6" />
               </div>
               <h2 className="text-2xl font-bold text-text">Impacto Social</h2>
               <p className="text-muted leading-relaxed">
                  Todo lo recaudado se destina a la compra de reactivos e insumos para que los alumnos de años menores puedan realizar sus prácticas de laboratorio.
               </p>
            </div>
         </section>

         <footer className="text-center pt-8">
            <p className="text-sm text-muted">
               Desarrollado con ❤️ por la promoción 2026.
            </p>
         </footer>
      </div>
   );
}
