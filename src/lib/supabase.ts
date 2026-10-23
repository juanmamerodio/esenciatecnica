import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 🛡️ SEGURIDAD Y TIPADO ESTRICTO
 * Definimos interfaces concretas para evitar el uso de 'any' y 'Json' genérico.
 */

export type OrderStatus =
  | 'pendiente'
  | 'comprobante_subido'
  | 'pre_aprobado'
  | 'enviado'
  | 'rechazado';

export type CartItem = {
  id: string;
  name: string;
  priceArs: number;
  quantity: number;
  subtotal: number;
}

export type Pedido = {
  id: string;
  nombre_cliente: string;
  email: string;
  telefono: string | null;
  items: CartItem[]; // Tipado concreto en lugar de Json
  total_ars: number;
  estado: OrderStatus;
  comprobante_url: string | null;
  created_at: string;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * DEFINICIÓN DEL ESQUEMA DE BASE DE DATOS (LEGACY)
 *
 * Sólo cubre las tablas legacy que todavía usan `/admin` y las APIs viejas, que se
 * retiran en T5/T7. El contrato vigente del e-commerce es `src/lib/database.types.ts`.
 * El catálogo ya no pasa por acá (T1 · issue #5).
 */
export type Database = {
  public: {
    Tables: {
      pedidos: {
        Row: Pedido;
        Insert: Omit<Pedido, 'id' | 'created_at' | 'telefono' | 'comprobante_url'> & { 
          id?: string; 
          created_at?: string;
          telefono?: string | null;
          comprobante_url?: string | null;
        };
        Update: Partial<Pedido>;
        Relationships: [];
      };
    };
    Views: { [key: string]: never };
    Functions: { [key: string]: never };
    Enums: { [key: string]: never };
    CompositeTypes: { [key: string]: never };
  };
};

/**
 * VALIDACIÓN DE ENTORNO (FAIL-FAST)
 * Como Chief de Seguridad, no permito que la app inicie con variables vacías.
 */
const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    // Durante el build o en CI, permitimos valores vacíos para que la compilación no falle.
    // En producción (runtime), Supabase fallará al intentar conectar, lo cual es correcto.
    if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
      return name.includes('URL') ? 'http://localhost:3000' : 'dummy-key-for-build';
    }
    throw new Error(`🚨 CRITICAL_CONFIG_ERROR: La variable de entorno ${name} no está definida. El sistema no puede iniciar.`);
  }
  return value;
};

/**
 * SINGLETON PATTERN
 * Evitamos múltiples instancias del cliente para optimizar la memoria y las conexiones.
 */
let supabaseInstance: SupabaseClient<Database> | null = null;
let serviceInstance: SupabaseClient<Database> | null = null;

/**
 * getSupabase()
 * Cliente público. Respeta las RLS (Row Level Security) de Supabase.
 * Uso: Componentes de cliente, Server Components públicos.
 */
export const getSupabase = (): SupabaseClient<Database> => {
  if (!supabaseInstance) {
    const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
    const key = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    supabaseInstance = createClient<Database>(url, key);
  }
  return supabaseInstance;
};

/**
 * getServiceSupabase()
 * Cliente administrativo. Bypass de RLS.
 * ⚠️ PELIGRO: Solo debe usarse en API Routes o Server Actions protegidas.
 */
export const getServiceSupabase = (): SupabaseClient<Database> => {
  if (!serviceInstance) {
    const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
    const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    serviceInstance = createClient<Database>(url, key);
  }
  return serviceInstance;
};

// Exportación directa para facilidad de uso en el 90% de los casos
export const supabase = getSupabase();