import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: 'swap',
  weight: ["300", "400", "500"],
});

const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: 'swap',
  style: 'normal',
});

export const metadata: Metadata = {
  title: "Química Shop | E.E.S.T N°1 Luciano Reyes",
  description: "Tienda educativa del Departamento de Química - Campana, Buenos Aires",
};

// En Next.js 15+, viewport se exporta por separado
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        className={`${dmSans.variable} ${dmMono.variable} font-sans bg-bg text-text antialiased selection:bg-accent-lt selection:text-accent`}
      >
        <div className="relative min-h-screen flex flex-col">
          <NavBar />
          <main className="flex-grow pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
          <footer className="py-8 text-center text-muted text-sm border-t border-border bg-surface/50 backdrop-blur-md">
            <p>© 2026 E.E.S.T N°1 Luciano Reyes · Departamento de Química</p>
          </footer>
        </div>
      </body>
    </html>
  );
}