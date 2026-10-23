import { getDictionary, type Locale } from "@/lib/i18n";
import CartClient from "@/components/CartClient";
import type { Dictionary } from "@/lib/types";

interface CartPageProps {
  params: Promise<{ lang: string }>;
}

export default async function CartPage({ params }: CartPageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);

  return <CartClient dict={dict as Dictionary} lang={lang} />;
}