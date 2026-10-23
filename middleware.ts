import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

/**
 * CONFIGURACIÓN DE INTERNACIONALIZACIÓN
 */
const i18n = {
  defaultLocale: 'es',
  locales: ['es', 'en'],
} as const;

type Locale = (typeof i18n.locales)[number];

/**
 * DETECCIÓN DE IDIOMA DEL NAVEGADOR
 * Utiliza el header 'Accept-Language' para sugerir el mejor idioma.
 */
function getLocale(request: NextRequest): Locale {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();

  try {
    return matchLocale(languages, [...i18n.locales], i18n.defaultLocale) as Locale;
  } catch (error) {
    return i18n.defaultLocale;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. EXCLUSIONES CRÍTICAS
  // No procesamos archivos estáticos, API routes ni el favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. PROTECCIÓN DE /ADMIN (Basic Auth - Senior Hardening)
  if (pathname.startsWith('/admin')) {
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Falla por seguridad si la variable no está configurada en producción
    if (!adminPassword || adminPassword.length < 4) {
      console.error("CRITICAL: ADMIN_PASSWORD no está configurada correctamente.");
      return new NextResponse('Error de configuración del servidor', { status: 500 });
    }

    const authHeader = request.headers.get('authorization');

    if (authHeader) {
      try {
        const authValue = authHeader.split(' ')[1];
        const [user, pwd] = atob(authValue).split(':');

        if (user === 'admin' && pwd === adminPassword) {
          return NextResponse.next();
        }
      } catch (e) {
        // Error de decodificación atob: ignorar y relanzar el prompt de auth
        console.warn("Falla en decodificación de Basic Auth:", e);
      }
    }

    // Si no hay auth o es incorrecto, lanzamos el prompt nativo del navegador
    return new NextResponse('Autenticación requerida', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Acceso Administrativo EEST1"',
      },
    });
  }

  // 3. LÓGICA DE REDIRECCIÓN I18N
  // Verificamos si la ruta ya comienza con uno de los locales soportados
  const pathnameHasLocale = i18n.locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // Si no tiene locale, detectamos el idioma y redirigimos
  const locale = getLocale(request);

  // Construcción limpia de la URL para evitar dobles barras (//)
  const redirectedPathname = pathname === '/'
    ? `/${locale}`
    : `/${locale}${pathname}`;

  return NextResponse.redirect(new URL(redirectedPathname, request.url));
}

export const config = {
  // Matcher optimizado para evitar ejecuciones innecesarias
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};