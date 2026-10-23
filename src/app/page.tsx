import Link from "next/link";
import { ArrowRight, GraduationCap, HandHeart, Info, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import EncabezadoSeccion from "@/components/EncabezadoSeccion";
import GrillaProductos from "@/components/GrillaProductos";
import ImagenProducto from "@/components/ImagenProducto";
import { leerCatalogo } from "@/lib/catalogo-servidor";

// El catálogo cambia con el stock: no se cachea una foto vieja de la tienda.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const resultado = await leerCatalogo();
  const portada = resultado.estado === "ok" ? resultado.productos[0] : undefined;

  return (
    <div className="space-y-24 pb-20">
      {/* 1 · Hero editorial: quiénes somos y a dónde ir */}
      <section className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            <GraduationCap aria-hidden className="h-3.5 w-3.5" />
            Proyecto educativo · E.E.S.T N°1 Luciano Reyes
          </span>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-text sm:text-5xl lg:text-6xl">
            Cosmética e higiene{" "}
            <span className="text-accent">elaboradas en la escuela.</span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Jabones, cremas y champús formulados por el Departamento de Química y elaborados por
            alumnos de 7mo año. Cada compra sostiene las prácticas y los materiales del taller.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/catalog" className="btn-primary gap-2 text-base">
              Ver el catálogo
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Link>
            <Link href="/about" className="btn-secondary gap-2 text-base">
              <Info aria-hidden className="h-5 w-5" />
              Sobre el proyecto
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
            <ImagenProducto
              url={portada?.imagenUrl ?? null}
              nombre={portada?.nombre ?? "Elaboración del Departamento de Química"}
              categoria={portada?.categoria ?? "Cosmética"}
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div className="card absolute -bottom-6 left-4 flex items-center gap-3 p-4 sm:left-6">
            <span className="rounded-2xl bg-accent-lt p-2 text-accent">
              <Sparkles aria-hidden className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Hecho por estudiantes
              </span>
              <span className="block text-sm font-semibold text-text">7mo año · Ciclo Lectivo 2026</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2 · Productos publicados: una sola grilla, ordenada por nombre */}
      <section className="space-y-10 pt-6">
        <EncabezadoSeccion
          titulo="Nuestros productos"
          subtitulo="Lo que el Departamento de Química tiene publicado hoy. Si algo no está disponible, se avisa en la card."
          accion={
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent underline-offset-4 hover:underline"
            >
              Ver el catálogo completo
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          }
        />
        <GrillaProductos resultado={resultado} mensajeVacio="Todavía no hay productos publicados" />
      </section>

      {/* 3 · Confianza en el pago: transferencia validada a mano */}
      <section className="card grid grid-cols-1 gap-8 p-8 md:grid-cols-2 md:p-12">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            <Wallet aria-hidden className="h-4 w-4" />
            Cómo se paga
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            Transferencia con validación manual
          </h2>
          <p className="text-sm leading-relaxed text-muted sm:text-base">
            Confirmás el pedido, transferís y subís el comprobante. Un Administrador de Química compara
            la imagen con el total del pedido y lo aprueba a mano; te avisamos por email cuando queda
            validado.
          </p>
        </div>
        <ul className="space-y-4 text-sm text-muted">
          <li className="flex gap-3">
            <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span>
              <strong className="block font-semibold text-text">Sin pago automático</strong>
              Nadie valida tu pago con un algoritmo: lo revisa una persona del Departamento de Química.
            </span>
          </li>
          <li className="flex gap-3">
            <HandHeart aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span>
              <strong className="block font-semibold text-text">Sin fines de lucro</strong>
              Lo recaudado se reinvierte en los materiales que necesitan las prácticas del taller.
            </span>
          </li>
          <li className="flex gap-3">
            <GraduationCap aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span>
              <strong className="block font-semibold text-text">Entrega a coordinar</strong>
              El retiro o la entrega se acuerda después de la aprobación: el proyecto no incluye envío ni
              seguimiento.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
