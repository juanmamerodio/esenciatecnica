import 'server-only';

// Tipo literal para los idiomas soportados
export type Locale = 'es' | 'en';

export const locales: Locale[] = ['es', 'en'];
export const defaultLocale: Locale = 'es';

// Carga dinámica de diccionarios — solo se importa el idioma solicitado
const dictionaries = {
  es: () => import('@/dictionaries/es.json').then((m) => m.default),
  en: () => import('@/dictionaries/en.json').then((m) => m.default),
};

export const getDictionary = async (locale: Locale) => {
  if (!locales.includes(locale)) {
    return dictionaries[defaultLocale]();
  }
  return dictionaries[locale]();
};
