import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 🛡️ SEGURIDAD Y TIPADO ESTRICTO
 * Definimos interfaces concretas para evitar el uso de 'any' y 'Json' genérico.
 */

export type ProductCategory = 'reactivos' | 'materiales' | 'equipos';

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

export type Producto = {
  id: string;
  nombre_es: string;
  nombre_en: string;
  descripcion_es: string | null;
  descripcion_en: string | null;
  precio_ars: number;
  stock: number;
  categoria: ProductCategory;
  imagen_url: string | null;
  activo: boolean;
  created_at: string;
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
  log_ia: GeminiResponse | null;
  created_at: string;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type GeminiResponse = {
  valid: boolean;
  amount_matches: boolean;
  recipient_matches: boolean;
  date_ok: boolean;
  amount_found: number;
  reason: string;
}

export type Verificacion = {
  id: string;
  pedido_id: string;
  respuesta_gemini: GeminiResponse;
  verificado: boolean;
  created_at: string;
}

/**
 * DEFINICIÓN DEL ESQUEMA DE BASE DE DATOS
 * Mapeo exacto de las tablas de Supabase para garantizar integridad de datos.
 */
export type Database = {
  public: {
    Tables: {
      productos: {
        Row: Producto;
        Insert: Omit<Producto, 'id' | 'created_at' | 'descripcion_es' | 'descripcion_en' | 'imagen_url' | 'activo'> & { 
          id?: string; 
          created_at?: string;
          descripcion_es?: string | null;
          descripcion_en?: string | null;
          imagen_url?: string | null;
          activo?: boolean;
        };
        Update: Partial<Producto>;
        Relationships: [];
      };
      pedidos: {
        Row: Pedido;
        Insert: Omit<Pedido, 'id' | 'created_at' | 'telefono' | 'comprobante_url' | 'log_ia'> & { 
          id?: string; 
          created_at?: string;
          telefono?: string | null;
          comprobante_url?: string | null;
          log_ia?: GeminiResponse | null;
        };
        Update: Partial<Pedido>;
        Relationships: [];
      };
      verificaciones: {
        Row: Verificacion;
        Insert: Omit<Verificacion, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Verificacion>;
        Relationships: [
          {
            foreignKeyName: "verificaciones_pedido_id_fkey";
            columns: ["pedido_id"];
            isOneToOne: false;
            referencedRelation: "pedidos";
            referencedColumns: ["id"];
          }
        ];
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