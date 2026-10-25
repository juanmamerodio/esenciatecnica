import { NextResponse, type NextRequest } from "next/server";
import { revisarBasicAuth } from "@/lib/admin-auth";

/**
 * Entrada del panel — T7 · issue #13.
 *
 * Protege **sólo** el panel y sus APIs con Basic Auth (`ADMIN_PASSWORD`, AGENTS §5.9). El resto
 * de la tienda no pasa por acá.
 *
 * T0 retiró el andamiaje de traducción y T7 reintroduce este archivo únicamente para autenticar:
 * el proyecto es español único, así que acá no se negocia ningún idioma (ver
 * `docs/adr/0005-basic-auth-en-middleware.md`). Su única responsabilidad es decidir si la
 * petición puede seguir; la decisión vive en `src/lib/admin-auth.ts`, que sí se testea.
 *
 * Vive en `src/` y no en la raíz del repo porque Next resuelve el middleware en la raíz de las
 * páginas (`src/app` → `src/`): en la raíz del repo no se compilaría y el panel quedaría abierto.
 */

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

const TEXTO_DE_CONFIGURACION =
  "El panel no está configurado: falta ADMIN_PASSWORD en el entorno del servidor.";

const TEXTO_DE_CREDENCIALES = "Necesitás las credenciales del panel para ver esta sección.";

export function middleware(peticion: NextRequest) {
  const revision = revisarBasicAuth(
    peticion.headers.get("authorization"),
    process.env.ADMIN_PASSWORD,
  );

  if (revision === "ok") return NextResponse.next();

  if (revision === "sin-configurar") {
    return new NextResponse(TEXTO_DE_CONFIGURACION, {
      status: 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  return new NextResponse(TEXTO_DE_CREDENCIALES, {
    status: 401,
    headers: {
      "www-authenticate": 'Basic realm="Panel de Esencia Técnica", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
