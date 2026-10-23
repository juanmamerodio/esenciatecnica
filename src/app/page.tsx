import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirigir siempre a español por defecto si el middleware no lo hace
  // (El middleware ya debería manejarlo, pero esto es un fallback seguro)
  redirect('/es');
}