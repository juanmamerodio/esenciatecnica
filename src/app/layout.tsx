import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500"],
});

const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
  style: "normal",
});

export const metadata: Metadata = {
  title: "Esencia Técnica | E.E.S.T N°1 Luciano Reyes",
  description:
    "Cosmética e higiene elaboradas por el Departamento de Química - Campana, Buenos Aires",
};

// En Next.js 15+ viewport se exporta por separado.
// Sin `maximumScale`: bloquear el zoom rompe la accesibilidad (WCAG 1.4.4).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Las variables de next/font van en <html>: `:root` declara --font-sans/--font-mono
    // como `var(--font-dm-*)`, y una custom property se sustituye en el elemento donde se
    // declara. En <body> la referencia quedaría sin resolver y el navegador usaría su
    // fuente por defecto (ver `tests/front/identidad-shell.test.ts`).
    <html lang="es" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body className="bg-bg font-sans text-text antialiased">
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-grow px-4 pt-24 sm:px-6 lg:px-8">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
