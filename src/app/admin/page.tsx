import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import EncabezadoSeccion from "@/components/EncabezadoSeccion";
import AvisoDeAlertas from "@/components/admin/AvisoDeAlertas";
import PanelDePedidos from "@/components/admin/PanelDePedidos";
import PanelDeProductos from "@/components/admin/PanelDeProductos";
import PanelDeStock from "@/components/admin/PanelDeStock";
import type { PanelAdmin } from "@/lib/admin";
import { crearPanelServidor } from "@/lib/admin-servidor";

/**
 * Panel `/admin` — T7 · issue #13.
 *
 * Server Component: lee los pedidos, el stock y las alertas con el módulo del panel y deja las
 * acciones en componentes cliente. La entrada la protege el middleware con Basic Auth
 * (`ADMIN_PASSWORD`); acá no se maneja ninguna contraseña ni clave de servicio.
 *
 * Sin `SUPABASE_SERVICE_ROLE_KEY` no hay datos: se dice explícitamente en vez de mostrar una
 * pantalla vacía que parezca “no hay pedidos” (AGENTS §7.10). No se siembran datos de muestra.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel de gestión | Esencia Técnica",
  description:
    "Validación manual de comprobantes, stock, alertas de stock y productos del e-commerce.",
};

export default async function AdminPage() {
  let panel: PanelAdmin;
  try {
    panel = crearPanelServidor();
  } catch (error) {
    return <PanelSinConfigurar mensaje={error instanceof Error ? error.message : null} />;
  }

  const [pedidos, stock, alertas] = await Promise.all([
    panel.pedidos(),
    panel.stock(),
    panel.alertas(),
  ]);

  return (
    <div className="space-y-12 pb-20">
      <EncabezadoSeccion
        titulo="Panel de gestión"
        subtitulo="Pedidos con su estado actual, validación manual de comprobantes, stock, alertas y productos de la tienda."
      />

      {alertas.estado === "ok" ? (
        <AvisoDeAlertas alertas={alertas.alertas} />
      ) : (
        <ErrorDeSeccion mensaje={alertas.mensaje} />
      )}

      <section aria-labelledby="titulo-pedidos" className="space-y-4">
        <h2 id="titulo-pedidos" className="text-xl font-bold tracking-tight text-text">
          Pedidos
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Compará la imagen y el monto del comprobante contra el total del pedido antes de aprobar:
          la validación es manual y el MVP termina en “Pago Validado” con su remito. Aprobar descuenta
          el stock y libera la reserva; rechazar sólo libera la reserva.
        </p>

        {pedidos.estado === "ok" ? (
          <PanelDePedidos pedidos={pedidos.pedidos} />
        ) : (
          <ErrorDeSeccion mensaje={pedidos.mensaje} />
        )}
      </section>

      <section aria-labelledby="titulo-stock" className="space-y-4">
        <h2 id="titulo-stock" className="text-xl font-bold tracking-tight text-text">
          Stock
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Corregí la cantidad actual y el umbral de aviso. El disponible lo calcula la base como
          cantidad actual menos reservada; cuando toca el umbral, aparece la alerta del panel.
        </p>

        {stock.estado === "ok" ? (
          <PanelDeStock stock={stock.stock} />
        ) : (
          <ErrorDeSeccion mensaje={stock.mensaje} />
        )}
      </section>

      <section aria-labelledby="titulo-productos" className="space-y-4">
        <h2 id="titulo-productos" className="text-xl font-bold tracking-tight text-text">
          Productos
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Alta, edición, baja lógica y foto real de cada producto. Dar de baja no borra nada: el
          producto deja de publicarse y conserva su historial.
        </p>

        {stock.estado === "ok" ? (
          <PanelDeProductos productos={stock.stock} />
        ) : (
          <ErrorDeSeccion mensaje={stock.mensaje} />
        )}
      </section>

      <p className="flex items-start gap-3 text-xs leading-relaxed text-muted">
        <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <span>
          El panel está protegido con la contraseña del Administrador. Las alertas de stock se ven
          sólo acá: no se envían por email. El email del remito es para el Cliente (T8).
        </span>
      </p>
    </div>
  );
}

function ErrorDeSeccion({ mensaje }: { mensaje: string }) {
  return (
    <p role="alert" className="card border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
      {mensaje}
    </p>
  );
}

function PanelSinConfigurar({ mensaje }: { mensaje: string | null }) {
  return (
    <div className="mx-auto max-w-lg space-y-6 py-20 text-center">
      <ShieldCheck aria-hidden className="mx-auto h-12 w-12 text-accent" />
      <h1 className="text-2xl font-bold tracking-tight text-text">Panel sin configurar</h1>
      <p role="alert" className="text-sm leading-relaxed text-muted">
        Falta la clave de servicio de Supabase en el entorno del servidor, así que el panel no puede
        leer pedidos ni stock. No se muestran datos de muestra: avisale al equipo del proyecto.
      </p>
      {mensaje ? (
        <p className="break-words font-mono text-xs leading-relaxed text-muted">{mensaje}</p>
      ) : null}
      <Link href="/" className="btn-secondary gap-2">
        Volver a la tienda
        <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </div>
  );
}
