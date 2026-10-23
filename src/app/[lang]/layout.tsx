import type { Locale } from '@/lib/i18n';

// Layout para las rutas con idioma: /es/*, /en/*
export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <div className="flex flex-col min-h-screen w-full" lang={lang as Locale}>
      {children}
    </div>
  );
}