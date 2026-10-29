# ADR 0005 · Basic Auth del panel en `middleware.ts`

- **Fecha:** 2026-10-25
- **Estado:** aceptada
- **Responsable:** Enzo Queipo (Remito, `/admin`, Resend y Basic Auth)
- **Contexto:** [`AGENTS.md`](../../AGENTS.md) §5.9 · [`MODELO.md`](../MODELO.md) §5 ·
  [`specs/admin/spec.md`](../specs/admin/spec.md) · [`adr/0004-reconstruccion-esquema-mvp.md`](0004-reconstruccion-esquema-mvp.md)

## Contexto

El panel `/admin` tiene que quedar detrás de una contraseña antes de existir. El modelo aprobado dice que el
MVP se protege con **Basic Auth** y `ADMIN_PASSWORD`, y que `ADMIN`/`ROL` en base son fase 2 (`MODELO.md` §5).

El repositorio ya tuvo un `middleware.ts` y T0 lo retiró: era el de i18n, que negociaba idioma y redirigía a
`/es`. Ese archivo no vuelve: lo que vuelve es un middleware con otra responsabilidad.

Hay tres lugares posibles para autenticar:

1. **En cada ruta y en la página**: repetir la verificación del encabezado en `/admin` y en cada
   `src/app/api/admin/*`. Es fácil olvidar una ruta nueva y dejarla abierta.
2. **En un layout del panel**: un layout no corre para las rutas de `src/app/api/`, que están fuera del
   árbol de páginas; las APIs quedarían sin protección o duplicarían la verificación.
3. **En `middleware.ts`**, con el matcher acotado a `/admin/:path*` y `/api/admin/:path*`. Una sola puerta
   para todas las rutas del panel, incluidas las que se agreguen después.

Además, la decisión de si un encabezado es válido no debería vivir en el runtime Edge, donde no se puede
testear con Vitest en `environment: node` sin red.

## Decisión

1. `src/middleware.ts` protege **sólo** `/admin/:path*` y `/api/admin/:path*` (el resto de la tienda no
   cambia) y **no** contiene negociación de idioma: la única responsabilidad del archivo es autenticar.
2. La decisión es de un **módulo puro**, `src/lib/admin-auth.ts`: `revisarBasicAuth(header, password)`
   devuelve `'ok' | 'sin-credenciales' | 'invalido' | 'sin-configurar'`. Se testea sin red y sin Edge.
3. Sin `ADMIN_PASSWORD` la respuesta es **`503`** con un mensaje explícito de configuración, nunca un `401`
   mudo que mande al Administrador a buscar una contraseña inexistente (`AGENTS.md` §7.10).
4. La comparación de la contraseña es en tiempo constante y el nombre de usuario se ignora: el MVP no tiene
   Administradores en base, así que no hay usuario con el que comparar (decisión registrada en
   `specs/admin/spec.md` §4.3).
5. **La tienda no prefetchea el panel.** Las entradas a `/admin` del header y del footer se hacen con
   navegación de documento (un `<a>`), no con `<Link>`. Un `<Link>` prefetchea `/admin` en cuanto entra al
   viewport, y esa petición de fondo recibe el `401` con `WWW-Authenticate`: el navegador abría el diálogo
   de usuario y contraseña **en la tienda**, sin que nadie hubiera pedido el panel (bug del 28-10, medido con
   Chrome contra el deploy y contra un build local). El reto queda para quien pide el panel. Lo fija
   `tests/front/entrada-al-panel.test.ts`.

El archivo vive en `src/`, al lado de `src/app/`: con el directorio `src` en uso, Next resuelve el middleware
en la raíz de las páginas (`rootDir = join(pagesDir || appDir, '..')` → `src/`), así que un `middleware.ts` en
la raíz del repo **no** se compilaría y el panel quedaría abierto en producción.

## Consecuencias

- **Positivas:** una sola puerta para el panel y sus APIs; la lógica de autenticación es un módulo puro con
  tests; el resto de la tienda no se toca; el fallo de configuración se distingue de una contraseña
  incorrecta.
- **Negativas:** el middleware corre en el runtime Edge y no puede usar APIs de Node (por eso sólo `atob`,
  `TextEncoder` y comparación manual). El navegador aplica Basic Auth por origen y realm: tras entrar al
  panel, las llamadas `fetch` del mismo origen llevan el encabezado, de modo que la protección es a nivel de
  origen y no por sesión con expiración.
- **El `WWW-Authenticate` es del navegador, no de la app:** cualquier petición a `/admin` sin credenciales
  —incluida una de prefetch, que nadie pidió— recibe el reto, y el navegador decide si lo muestra. Por eso la
  regla 5 es del lado del cliente: no se prefetchea una ruta que reta.
- **Riesgo:** en desarrollo, un `.env.local` sin `ADMIN_PASSWORD` deja el panel en `503`. Es el
  comportamiento buscado y está documentado en la spec (`specs/admin/spec.md` §3, HU-1).

## Alternativas descartadas

- **Verificar en cada ruta y en la página:** una ruta nueva sin verificación deja el panel abierto; el error
  se descubre en producción.
- **Verificar en un layout de `src/app/admin/`:** no cubre `src/app/api/admin/*`.
- **Supabase Auth o cuentas de Administrador:** fase 2 por decisión del modelo; el MVP no tiene tabla de
  Administradores.
- **Sesión con cookie firmada emitida por una ruta de login:** más piezas (página de login, cookie, cierre de
  sesión) para un MVP con un solo Administrador y una contraseña compartida.
- **`prefetch={false}` en el `<Link>` del panel:** en Next 15 apaga el prefetch de viewport, pero **no** el de
  hover (`next/dist/client/link.js`: `prefetchEnabled` gatea el efecto de intersección; `onMouseEnter`
  prefetchea siempre), así que el diálogo volvería al pasar el mouse por «Gestión». Y deja la entrada al panel
  dependiendo de un detalle del router. La navegación de documento es explícita y no depende de Next.
- **Responder el prefetch sin `WWW-Authenticate` (o con `403`):** calla el síntoma en el borde y desvía la
  regla del `401` documentado, medido por los tests y por `bd:viva`. La tienda no debe pedir el panel en
  segundo plano: eso se arregla en la tienda.
