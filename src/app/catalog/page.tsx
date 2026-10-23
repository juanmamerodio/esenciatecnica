import EncabezadoSeccion from "@/components/EncabezadoSeccion";
import GrillaProductos from "@/components/GrillaProductos";
import { leerCatalogo } from "@/lib/catalogo-servidor";

// El catálogo cambia con el stock: no se cachea una foto vieja de la tienda.
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const resultado = await leerCatalogo();

  return (
    <div className="space-y-12 pb-20">
      <EncabezadoSeccion
        titulo="Catálogo de productos"
        subtitulo="Cosmética e higiene elaboradas por el Departamento de Química. Los precios están expresados en pesos argentinos."
      />
      <GrillaProductos resultado={resultado} mensajeVacio="Todavía no hay productos publicados" />
    </div>
  );
}
