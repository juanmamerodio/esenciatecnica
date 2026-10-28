"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  ShieldCheck,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import EncabezadoSeccion from "@/components/EncabezadoSeccion";
import SubirComprobante from "@/components/SubirComprobante";
import { subtotalDeLinea, totalDelPedido } from "@/lib/carrito";
import { totalAVisualizar, type ResultadoCheckout } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/lib/store";
import { datosDeTransferencia } from "@/lib/transferencia";

/**
 * Checkout — T5 · issue #10.
 *
 * Confirmar el pedido (reserva de stock en la base), declarar el monto transferido y subir el
 * comprobante. La validación es manual: acá no se aprueba nada. Si el pedido ya se creó y algo
 * falla después, se conserva su `idPedido` para que el reintento no duplique la reserva.
 */

type Confirmacion = { idPedido: number; total: number };

export default function CheckoutPage() {
  const items = useCartStore((estado) => estado.items);
  const vaciar = useCartStore((estado) => estado.vaciar);

  const [montado, setMontado] = useState(false);
  const [cliente, setCliente] = useState({ nombre: "", email: "", dni: "", telefono: "" });
  const [monto, setMonto] = useState("");
  const [montoEditado, setMontoEditado] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [idPedido, setIdPedido] = useState<number | null>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  /** Total que devolvió la base: apenas existe, manda sobre el del carrito (#34). */
  const [totalDeLaBase, setTotalDeLaBase] = useState<number | null>(null);

  const total = totalDelPedido(items);
  const transferencia = datosDeTransferencia();

  // El carrito vive en localStorage: hasta hidratar no se puede afirmar que esté vacío.
  useEffect(() => setMontado(true), []);

  // El monto llega precargado con el total a transferir; si el Cliente lo editó, se respeta.
  useEffect(() => {
    if (montado && !montoEditado) {
      const aTransferir = totalAVisualizar(totalDeLaBase, total);
      setMonto(aTransferir > 0 ? aTransferir.toFixed(2) : "");
    }
  }, [montado, montoEditado, total, totalDeLaBase]);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!archivo) {
      setError("Adjuntá la imagen del comprobante de la transferencia.");
      return;
    }

    setEnviando(true);
    setError(null);
    setCampos({});

    try {
      const formulario = new FormData();
      formulario.set(
        "datos",
        JSON.stringify({
          cliente: {
            nombre: cliente.nombre,
            email: cliente.email,
            dni: cliente.dni,
            telefono: cliente.telefono,
          },
          items: items.map((item) => ({ id_producto: item.id, cantidad: item.cantidad })),
          monto: Number(monto.replace(",", ".")),
          idPedido,
        }),
      );
      formulario.set("archivo", archivo);

      const respuesta = await fetch("/api/checkout", { method: "POST", body: formulario });
      const cuerpo = (await respuesta.json()) as ResultadoCheckout;

      if (cuerpo.estado === "ok") {
        vaciar();
        setConfirmacion({ idPedido: cuerpo.idPedido, total: cuerpo.total });
        return;
      }

      setError(cuerpo.mensaje);
      setCampos(cuerpo.campos ?? {});
      if (cuerpo.idPedido) setIdPedido(cuerpo.idPedido);
      // La base ya calculó el total del pedido: desde acá es el número que se muestra y se cobra.
      if (typeof cuerpo.total === "number") setTotalDeLaBase(cuerpo.total);
      if (cuerpo.motivo === "monto-no-coincide" && typeof cuerpo.total === "number") {
        setMonto(cuerpo.total.toFixed(2));
        setMontoEditado(false);
      }
    } catch {
      setError("No pudimos enviar el pedido. Revisá tu conexión y volvé a intentar.");
    } finally {
      setEnviando(false);
    }
  };

  if (!montado) {
    return <p className="py-24 text-center text-sm text-muted">Cargando tu pedido…</p>;
  }

  if (confirmacion) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-20 text-center">
        <CheckCircle2 aria-hidden className="mx-auto h-14 w-14 text-accent" />
        <h1 className="text-3xl font-bold tracking-tight text-text">
          Pedido #{confirmacion.idPedido} registrado
        </h1>
        <p className="font-mono text-2xl font-bold text-accent">{formatPrice(confirmacion.total)}</p>
        <p className="text-sm leading-relaxed text-muted">
          Ya reservamos tus productos. Un Administrador de Química revisa el comprobante a mano y te
          avisamos por email cuando el pago quede validado. El retiro o la entrega se coordinan después de
          la aprobación: el proyecto no incluye envío ni seguimiento.
        </p>
        <Link href="/catalog" className="btn-primary gap-2">
          Volver al catálogo
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-20 text-center">
        <ShoppingBag aria-hidden className="mx-auto h-12 w-12 text-accent" />
        <h1 className="text-2xl font-bold tracking-tight text-text">Tu carrito está vacío</h1>
        <p className="text-sm leading-relaxed text-muted">
          Agregá productos antes de confirmar un pedido.
        </p>
        <Link href="/catalog" className="btn-primary gap-2">
          Ver el catálogo
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <EncabezadoSeccion
        titulo="Confirmar pedido"
        subtitulo="Al confirmar reservamos el stock. El pago es por transferencia y lo valida a mano un Administrador de Química."
      />

      {idPedido ? (
        <p className="card border-dashed p-4 text-sm text-muted">
          Tu pedido <strong className="font-semibold text-text">#{idPedido}</strong> ya quedó registrado con
          su reserva: solo falta subir el comprobante.
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_380px]">
        <form onSubmit={enviar} className="card space-y-8 p-6 sm:p-8" noValidate>
          <fieldset className="space-y-5">
            <legend className="text-lg font-bold tracking-tight text-text">Tus datos</legend>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Campo
                id="nombre"
                etiqueta="Nombre y apellido"
                valor={cliente.nombre}
                error={campos.nombre}
                autoComplete="name"
                onCambio={(valor) => setCliente({ ...cliente, nombre: valor })}
              />
              <Campo
                id="email"
                etiqueta="Email de contacto"
                tipo="email"
                valor={cliente.email}
                error={campos.email}
                autoComplete="email"
                ayuda="Ahí te llega el aviso cuando el pago quede validado."
                onCambio={(valor) => setCliente({ ...cliente, email: valor })}
              />
              <Campo
                id="dni"
                etiqueta="DNI"
                valor={cliente.dni}
                error={campos.dni}
                inputMode="numeric"
                autoComplete="off"
                ayuda="7 u 8 dígitos, sin puntos."
                onCambio={(valor) => setCliente({ ...cliente, dni: valor })}
              />
              <Campo
                id="telefono"
                etiqueta="Teléfono (opcional)"
                tipo="tel"
                valor={cliente.telefono}
                error={campos.telefono}
                autoComplete="tel"
                requerido={false}
                onCambio={(valor) => setCliente({ ...cliente, telefono: valor })}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-lg font-bold tracking-tight text-text">Monto y comprobante</legend>

            <Campo
              id="monto"
              etiqueta="Monto transferido (ARS)"
              valor={monto}
              error={campos.monto}
              inputMode="decimal"
              ayuda="Tiene que coincidir con el total del pedido: es lo que el Administrador compara con la imagen."
              onCambio={(valor) => {
                setMonto(valor);
                setMontoEditado(true);
              }}
            />

            <SubirComprobante onCambio={setArchivo} error={campos.archivo} />
          </fieldset>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-3 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={enviando} className="btn-primary w-full gap-2 disabled:opacity-60">
            {enviando ? (
              <>
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                Confirmando el pedido…
              </>
            ) : (
              <>
                Confirmar pedido y subir el comprobante
                <ArrowRight aria-hidden className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <aside className="space-y-6">
          <section className="card space-y-4 p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-text">
              <Wallet aria-hidden className="h-5 w-5 text-accent" />
              Transferencia
            </h2>

            {transferencia ? (
              <dl className="space-y-3 text-sm">
                <Dato etiqueta="Alias" valor={transferencia.alias} mono />
                <Dato etiqueta="CBU" valor={transferencia.cbu} mono />
                <Dato etiqueta="Titular" valor={transferencia.titular} />
              </dl>
            ) : (
              <p className="text-sm leading-relaxed text-muted">
                Los datos de la transferencia los confirma la Cooperadora de la escuela. Escribinos a{" "}
                <a href="mailto:proyectos@esenciatecnica.edu.ar" className="underline underline-offset-4">
                  proyectos@esenciatecnica.edu.ar
                </a>{" "}
                y te los pasamos junto con el número de pedido.
              </p>
            )}

            <p className="flex items-center justify-between border-t border-border-soft pt-4">
              <span className="font-semibold text-text">Total a transferir</span>
              <span className="font-mono text-2xl font-bold tracking-tight text-text">
                {formatPrice(totalAVisualizar(totalDeLaBase, total))}
              </span>
            </p>
          </section>

          <section className="card space-y-3 p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Resumen</h2>
            <ul className="space-y-2 text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-muted">
                    {item.cantidad}× {item.nombre}
                  </span>
                  <span className="shrink-0 font-mono text-text">
                    {formatPrice(subtotalDeLinea(item.precio, item.cantidad))}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <p className="flex items-start gap-3 text-xs leading-relaxed text-muted">
            <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              La reserva se libera si el comprobante no queda aprobado antes del cierre del viernes.
            </span>
          </p>

          <p className="flex items-start gap-3 text-xs leading-relaxed text-muted">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              El comprobante lo revisa una persona: no hay validación automática ni lectura de la imagen por
              un sistema.
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  valor,
  error,
  ayuda,
  tipo = "text",
  inputMode,
  autoComplete,
  requerido = true,
  onCambio,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  error?: string;
  ayuda?: string;
  tipo?: string;
  inputMode?: "numeric" | "decimal" | "text";
  autoComplete?: string;
  requerido?: boolean;
  onCambio: (valor: string) => void;
}) {
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {etiqueta}
      </label>
      <input
        id={id}
        name={id}
        type={tipo}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={valor}
        required={requerido}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idAyuda, idError].filter(Boolean).join(" ") || undefined}
        onChange={(evento) => onCambio(evento.target.value)}
        className={`w-full rounded-2xl border bg-surface px-4 py-3 text-sm text-text outline-none transition-colors focus:border-accent ${
          error ? "border-red-300" : "border-border"
        }`}
      />
      {ayuda ? (
        <p id={idAyuda} className="text-xs leading-relaxed text-muted">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={idError} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Dato({ etiqueta, valor, mono }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{etiqueta}</dt>
      <dd className={`break-all text-text ${mono ? "font-mono text-sm" : "text-sm"}`}>{valor}</dd>
    </div>
  );
}
