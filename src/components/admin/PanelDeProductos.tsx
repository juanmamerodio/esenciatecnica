"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ImagePlus, Loader2, Plus, Save } from "lucide-react";
import ImagenProducto from "@/components/ImagenProducto";
import { LIMITES_DE_FOTO, type StockDelPanel } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { pedirAlPanel } from "./comun";

/**
 * Alta, edición, baja lógica y foto de los productos — T7 · issue #13 (HU-8).
 *
 * La baja es **lógica** (`activo = false`): nunca se borra un producto con historial
 * (AGENTS §5.12). La foto se sube al bucket público `productos` desde el servidor y su URL queda
 * en `producto.imagen_url`.
 */

type Formulario = {
  nombre: string;
  categoria: string;
  tipo: string;
  descripcion: string;
  precio: string;
  tiempo_produccion: string;
};

const VACIO: Formulario = {
  nombre: "",
  categoria: "",
  tipo: "",
  descripcion: "",
  precio: "",
  tiempo_produccion: "1",
};

function formularioDe(fila: StockDelPanel): Formulario {
  return {
    nombre: fila.nombre,
    categoria: fila.categoria,
    tipo: fila.tipo,
    descripcion: fila.descripcion,
    precio: String(fila.precio),
    tiempo_produccion: String(fila.tiempoProduccion),
  };
}

/** Cuerpo que viaja al borde: los nombres son los del modelo (`tiempo_produccion`). */
function cuerpoDe(formulario: Formulario): Record<string, unknown> {
  return {
    nombre: formulario.nombre,
    categoria: formulario.categoria,
    tipo: formulario.tipo,
    descripcion: formulario.descripcion,
    precio: Number(formulario.precio.replace(",", ".")),
    tiempo_produccion: Number(formulario.tiempo_produccion.replace(",", ".")),
  };
}

export default function PanelDeProductos({ productos }: { productos: StockDelPanel[] }) {
  const router = useRouter();
  const [nuevo, setNuevo] = useState<Formulario>(VACIO);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const limpiarMensajes = () => {
    setError(null);
    setAviso(null);
  };

  const crear = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setCreando(true);
    limpiarMensajes();

    const resultado = await pedirAlPanel("/api/admin/productos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpoDe(nuevo)),
    });

    setCreando(false);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }

    setNuevo(VACIO);
    setAviso("Producto creado. La base le armó su fila de stock.");
    router.refresh();
  };

  const actualizar = async (fila: StockDelPanel, formulario: Formulario) => {
    setGuardando(fila.idProducto);
    limpiarMensajes();

    const resultado = await pedirAlPanel("/api/admin/productos", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idProducto: fila.idProducto,
        accion: "actualizar",
        ...cuerpoDe(formulario),
      }),
    });

    setGuardando(null);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }

    setAviso(`Producto ${formulario.nombre} actualizado.`);
    router.refresh();
  };

  const cambiarActividad = async (fila: StockDelPanel) => {
    setGuardando(fila.idProducto);
    limpiarMensajes();

    const resultado = await pedirAlPanel("/api/admin/productos", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idProducto: fila.idProducto,
        accion: "actividad",
        activo: !fila.activo,
      }),
    });

    setGuardando(null);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }

    setAviso(
      fila.activo
        ? `${fila.nombre} quedó sin publicar: deja de aparecer en el catálogo.`
        : `${fila.nombre} volvió a publicarse.`,
    );
    router.refresh();
  };

  const subirFoto = async (fila: StockDelPanel, archivo: File | null) => {
    if (!archivo) {
      setError("Elegí la foto del producto antes de subirla.");
      return;
    }

    setSubiendo(fila.idProducto);
    limpiarMensajes();

    const formulario = new FormData();
    formulario.set("idProducto", String(fila.idProducto));
    formulario.set("archivo", archivo);

    const resultado = await pedirAlPanel("/api/admin/productos/foto", {
      method: "POST",
      body: formulario,
    });

    setSubiendo(null);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }

    setAviso(`Foto de ${fila.nombre} actualizada.`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {aviso ? (
        <p role="alert" className="card border-accent/30 bg-accent-lt p-4 text-sm text-accent">
          {aviso}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="card border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <details className="card p-4 sm:p-6">
        <summary className="flex cursor-pointer items-center gap-2 text-base font-bold tracking-tight text-text">
          <Plus aria-hidden className="h-4 w-4 text-accent" />
          Nuevo producto
        </summary>

        <form onSubmit={crear} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          <Campo
            id="nuevo-nombre"
            etiqueta="Nombre"
            valor={nuevo.nombre}
            onCambio={(valor) => setNuevo({ ...nuevo, nombre: valor })}
          />
          <Campo
            id="nuevo-categoria"
            etiqueta="Categoría"
            valor={nuevo.categoria}
            onCambio={(valor) => setNuevo({ ...nuevo, categoria: valor })}
          />
          <Campo
            id="nuevo-tipo"
            etiqueta="Tipo"
            valor={nuevo.tipo}
            onCambio={(valor) => setNuevo({ ...nuevo, tipo: valor })}
          />
          <Campo
            id="nuevo-precio"
            etiqueta="Precio (ARS)"
            tipo="number"
            valor={nuevo.precio}
            onCambio={(valor) => setNuevo({ ...nuevo, precio: valor })}
          />
          <Campo
            id="nuevo-tiempo"
            etiqueta="Tiempo de producción (días)"
            tipo="number"
            valor={nuevo.tiempo_produccion}
            onCambio={(valor) => setNuevo({ ...nuevo, tiempo_produccion: valor })}
          />
          <Campo
            id="nuevo-descripcion"
            etiqueta="Descripción"
            valor={nuevo.descripcion}
            onCambio={(valor) => setNuevo({ ...nuevo, descripcion: valor })}
          />

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creando}
              className="btn-primary gap-2 px-5 py-2.5 text-sm disabled:opacity-60"
            >
              {creando ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Plus aria-hidden className="h-4 w-4" />
              )}
              Crear producto
            </button>
          </div>
        </form>
      </details>

      <ul className="space-y-4">
        {productos.map((fila) => (
          <FilaDeProducto
            key={fila.idProducto}
            fila={fila}
            guardando={guardando === fila.idProducto}
            subiendo={subiendo === fila.idProducto}
            onActualizar={actualizar}
            onCambiarActividad={cambiarActividad}
            onSubirFoto={subirFoto}
          />
        ))}
      </ul>
    </div>
  );
}

function FilaDeProducto({
  fila,
  guardando,
  subiendo,
  onActualizar,
  onCambiarActividad,
  onSubirFoto,
}: {
  fila: StockDelPanel;
  guardando: boolean;
  subiendo: boolean;
  onActualizar: (fila: StockDelPanel, formulario: Formulario) => void;
  onCambiarActividad: (fila: StockDelPanel) => void;
  onSubirFoto: (fila: StockDelPanel, archivo: File | null) => void;
}) {
  const [formulario, setFormulario] = useState<Formulario>(() => formularioDe(fila));
  const [archivo, setArchivo] = useState<File | null>(null);

  return (
    <li className="card space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-24 shrink-0 overflow-hidden rounded-card border border-border-soft">
          <ImagenProducto
            url={fila.imagenUrl}
            nombre={fila.nombre}
            categoria={fila.categoria}
            sizes="96px"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-base font-bold tracking-tight text-text">{fila.nombre}</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {fila.categoria} · {fila.tipo}
          </p>
          <p className="text-sm text-text">
            {formatPrice(fila.precio)} · producción {fila.tiempoProduccion}{" "}
            {fila.tiempoProduccion === 1 ? "día" : "días"}
          </p>
          <p className="text-sm text-muted">
            {fila.descripcion || "Sin descripción cargada."}
          </p>
          <span className={`chip border ${fila.activo ? "border-accent/30" : "border-border bg-gray-lt text-muted"}`}>
            {fila.activo ? "Publicado" : "Sin publicar"}
          </span>
        </div>
      </div>

      <details className="border-t border-border-soft pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-accent">
          Editar {fila.nombre}
        </summary>

        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            onActualizar(fila, formulario);
          }}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
          noValidate
        >
          <Campo
            id={`nombre-${fila.idProducto}`}
            etiqueta="Nombre"
            valor={formulario.nombre}
            onCambio={(valor) => setFormulario({ ...formulario, nombre: valor })}
          />
          <Campo
            id={`categoria-${fila.idProducto}`}
            etiqueta="Categoría"
            valor={formulario.categoria}
            onCambio={(valor) => setFormulario({ ...formulario, categoria: valor })}
          />
          <Campo
            id={`tipo-${fila.idProducto}`}
            etiqueta="Tipo"
            valor={formulario.tipo}
            onCambio={(valor) => setFormulario({ ...formulario, tipo: valor })}
          />
          <Campo
            id={`precio-${fila.idProducto}`}
            etiqueta="Precio (ARS)"
            tipo="number"
            valor={formulario.precio}
            onCambio={(valor) => setFormulario({ ...formulario, precio: valor })}
          />
          <Campo
            id={`tiempo-${fila.idProducto}`}
            etiqueta="Tiempo de producción (días)"
            tipo="number"
            valor={formulario.tiempo_produccion}
            onCambio={(valor) => setFormulario({ ...formulario, tiempo_produccion: valor })}
          />
          <Campo
            id={`descripcion-${fila.idProducto}`}
            etiqueta="Descripción"
            valor={formulario.descripcion}
            onCambio={(valor) => setFormulario({ ...formulario, descripcion: valor })}
          />

          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={guardando}
              className="btn-primary gap-2 px-4 py-2 text-xs disabled:opacity-60"
            >
              {guardando ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden className="h-4 w-4" />
              )}
              Guardar cambios
            </button>

            <button
              type="button"
              onClick={() => onCambiarActividad(fila)}
              disabled={guardando}
              className="btn-secondary gap-2 px-4 py-2 text-xs disabled:opacity-60"
              aria-label={
                fila.activo
                  ? `Dar de baja ${fila.nombre} sin borrarlo`
                  : `Volver a publicar ${fila.nombre}`
              }
            >
              {fila.activo ? (
                <EyeOff aria-hidden className="h-4 w-4" />
              ) : (
                <Eye aria-hidden className="h-4 w-4" />
              )}
              {fila.activo ? "Dar de baja" : "Publicar"}
            </button>
          </div>
        </form>

        <div className="mt-5 space-y-2 border-t border-border-soft pt-4">
          <label
            htmlFor={`foto-${fila.idProducto}`}
            className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted"
          >
            Foto del producto (PNG, JPEG o WebP · hasta 5 MB)
          </label>
          <input
            id={`foto-${fila.idProducto}`}
            type="file"
            accept={LIMITES_DE_FOTO.tipos.join(",")}
            onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)}
            className="text-xs text-muted file:mr-3 file:rounded-pill file:border file:border-border file:bg-surface file:px-4 file:py-2 file:text-xs file:font-semibold file:text-accent"
          />
          <button
            type="button"
            onClick={() => onSubirFoto(fila, archivo)}
            disabled={subiendo}
            className="btn-secondary gap-2 px-4 py-2 text-xs disabled:opacity-60"
            aria-label={`Subir la foto de ${fila.nombre}`}
          >
            {subiendo ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus aria-hidden className="h-4 w-4" />
            )}
            Subir foto
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted">
          Dar de baja no borra el producto: se marca como sin publicar y deja de aparecer en el
          catálogo, conservando su historial de ventas.
        </p>
      </details>
    </li>
  );
}

function Campo({
  id,
  etiqueta,
  valor,
  tipo = "text",
  onCambio,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  tipo?: string;
  onCambio: (valor: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {etiqueta}
      </label>
      <input
        id={id}
        name={id}
        type={tipo}
        value={valor}
        onChange={(evento) => onCambio(evento.target.value)}
        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition-colors focus:border-accent"
      />
    </div>
  );
}
