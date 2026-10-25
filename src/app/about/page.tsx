import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  FlaskConical,
  GraduationCap,
  HandHeart,
  Leaf,
  Mail,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import EncabezadoSeccion from "@/components/EncabezadoSeccion";

/**
 * Página institucional — T6 · issue #12 (decisiones G3 y G1).
 *
 * Cosmética e higiene del Departamento de Química, sin vocabulario de laboratorio ni de
 * validación automática. Acá vive la franja de valores que G1 adjudicó a esta página: la Home
 * no la repite. No monta navegación propia: el shell ya marca la ruta activa.
 */

const VALORES = [
  {
    titulo: "Ciencia Aplicada",
    icono: FlaskConical,
    texto:
      "Cada fórmula sale del trabajo de laboratorio del Departamento de Química y se convierte en un producto de cosmética o higiene listo para usar.",
  },
  {
    titulo: "Sin Fines de Lucro",
    icono: HandHeart,
    texto:
      "Lo recaudado se reinvierte en los materiales y las prácticas del taller: la tienda sostiene el proyecto, no al revés.",
  },
  {
    titulo: "Formación Técnica",
    icono: GraduationCap,
    texto:
      "El e-commerce es el proyecto final de 7mo año del área de Programación, integrado con el Departamento de Química.",
  },
] as const;

const PASOS = [
  {
    titulo: "Transferís el total",
    icono: Wallet,
    texto:
      "Al confirmar el pedido ves el total y los datos de la transferencia. La reserva de stock queda hecha en ese momento.",
  },
  {
    titulo: "Un Administrador de Química valida a mano",
    icono: ShieldCheck,
    texto:
      "Subís el comprobante y un Administrador de Química compara la imagen con el monto del pedido. No hay validación automática.",
  },
  {
    titulo: "Coordinamos la entrega",
    icono: CalendarClock,
    texto:
      "Aprobado el pago, acordamos el retiro o la entrega. Si el comprobante no se aprueba antes del cierre del viernes, la reserva se libera.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="space-y-20 pb-20">
      {/* 1 · Qué es el proyecto */}
      <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            <GraduationCap aria-hidden className="h-3.5 w-3.5" />
            Proyecto educativo · Ciclo Lectivo 2026
          </span>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-text sm:text-5xl">
            Sobre el proyecto
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Esencia Técnica es la tienda de <strong className="font-semibold text-text">cosmética e
            higiene</strong> de la E.E.S.T N°1 Luciano Reyes, de Campana, Buenos Aires. Las fórmulas las
            desarrolla el Departamento de Química y las elaboran alumnos de 7mo año: jabones, cremas y
            champús pensados para el cuidado diario.
          </p>

          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            El sitio es, además, el proyecto final del área de Programación: catálogo, carrito, checkout y
            panel de gestión los construimos nosotros, integrando el trabajo del taller con el del aula.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/catalog" className="btn-primary gap-2 text-base">
              Ver el catálogo
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <ul className="card space-y-5 p-8">
          <li className="flex items-start gap-3">
            <Leaf aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span className="text-sm leading-relaxed text-muted">
              <strong className="block font-semibold text-text">Cosmética e higiene</strong>
              Productos de uso diario formulados en la escuela, pensados para el cuidado de la piel y el
              cabello.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <GraduationCap aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span className="text-sm leading-relaxed text-muted">
              <strong className="block font-semibold text-text">Elaborado por estudiantes</strong>
              7mo año del Departamento de Química, con la supervisión de sus docentes.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <HandHeart aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span className="text-sm leading-relaxed text-muted">
              <strong className="block font-semibold text-text">Con impacto en el taller</strong>
              Cada compra sostiene las prácticas y los materiales de los años menores.
            </span>
          </li>
        </ul>
      </section>

      {/* 2 · Cómo se compra */}
      <section className="space-y-10">
        <EncabezadoSeccion
          titulo="Cómo se compra"
          subtitulo="El pago se valida a mano: no hay cobro automático, ni envío, ni seguimiento dentro del sitio."
        />

        <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PASOS.map((paso, indice) => (
            <li key={paso.titulo} className="card space-y-3 p-6">
              <span className="flex items-center gap-3">
                <span className="rounded-2xl bg-accent-lt p-2 text-accent">
                  <paso.icono aria-hidden className="h-5 w-5" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Paso {indice + 1}
                </span>
              </span>
              <h3 className="text-lg font-bold tracking-tight text-text">{paso.titulo}</h3>
              <p className="text-sm leading-relaxed text-muted">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 3 · Franja de valores (G1) */}
      <section className="space-y-10">
        <EncabezadoSeccion titulo="Lo que sostiene la tienda" />
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {VALORES.map((valor) => (
            <li key={valor.titulo} className="card space-y-3 p-6">
              <span className="rounded-2xl bg-accent-lt p-2 text-accent">
                <valor.icono aria-hidden className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-bold tracking-tight text-text">{valor.titulo}</h3>
              <p className="text-sm leading-relaxed text-muted">{valor.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 4 · Contacto */}
      <section className="card grid grid-cols-1 gap-8 p-8 md:grid-cols-2 md:p-12">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-text">Contacto</h2>
          <p className="text-sm leading-relaxed text-muted">
            Dudas sobre un pedido, un comprobante o la entrega: escribinos y te responde el equipo del
            proyecto.
          </p>
          <a
            href="mailto:proyectos@esenciatecnica.edu.ar"
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            <Mail aria-hidden className="h-4 w-4" />
            proyectos@esenciatecnica.edu.ar
          </a>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-text">Institución</h2>
          <p className="text-sm leading-relaxed text-muted">
            E.E.S.T N°1 Luciano Reyes · Campana, Buenos Aires · Departamento de Química.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Ciclo Lectivo 2026</p>
        </div>
      </section>
    </div>
  );
}
