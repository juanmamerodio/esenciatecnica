// GENERADO por scripts/generar-tipos-bd.mjs — no editar a mano.
// Fuente: supabase/migrations/*.sql · Regenerar con `npm run db:types`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [clave: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      alerta_de_estado: {
        Row: {
          id_alerta: number;
          id_stock: number;
          fecha: string;
          mensaje: string;
          atendida: boolean;
        };
        Insert: {
          id_stock: number;
          fecha?: string;
          mensaje: string;
          atendida?: boolean;
        };
        Update: {
          id_stock?: number;
          fecha?: string;
          mensaje?: string;
          atendida?: boolean;
        };
        Relationships: [];
      };
      cliente: {
        Row: {
          id_cliente: number;
          dni: string;
          nombre: string;
          email: string;
          telefono: string | null;
          creado_en: string;
        };
        Insert: {
          dni: string;
          nombre: string;
          email: string;
          telefono?: string | null;
          creado_en?: string;
        };
        Update: {
          dni?: string;
          nombre?: string;
          email?: string;
          telefono?: string | null;
          creado_en?: string;
        };
        Relationships: [];
      };
      comprobante: {
        Row: {
          id_comprobante: number;
          id_pedido: number;
          foto_url: string;
          fecha: string;
          monto: number;
          estado_actual: 'Comprobante Subido' | 'Aprobado por Admin' | 'Rechazado';
          subido_en: string;
        };
        Insert: {
          id_pedido: number;
          foto_url: string;
          fecha?: string;
          monto: number;
          estado_actual?: 'Comprobante Subido' | 'Aprobado por Admin' | 'Rechazado';
          subido_en?: string;
        };
        Update: {
          id_pedido?: number;
          foto_url?: string;
          fecha?: string;
          monto?: number;
          estado_actual?: 'Comprobante Subido' | 'Aprobado por Admin' | 'Rechazado';
          subido_en?: string;
        };
        Relationships: [];
      };
      detalle_del_pedido: {
        Row: {
          id_detalle_pedido: number;
          id_pedido: number;
          id_producto: number;
          cantidad: number;
          precio_unitario: number;
          subtotal: number;
        };
        Insert: {
          id_pedido: number;
          id_producto: number;
          cantidad: number;
          precio_unitario: number;
        };
        Update: {
          id_pedido?: number;
          id_producto?: number;
          cantidad?: number;
          precio_unitario?: number;
        };
        Relationships: [];
      };
      estados_comprobante: {
        Row: {
          id_estado_comprobante: number;
          id_comprobante: number;
          estado: string;
          fecha: string;
        };
        Insert: {
          id_comprobante: number;
          estado: string;
          fecha?: string;
        };
        Update: {
          id_comprobante?: number;
          estado?: string;
          fecha?: string;
        };
        Relationships: [];
      };
      estados_pedidos: {
        Row: {
          id_estado_pedido: number;
          id_pedido: number;
          estado: string;
          fecha: string;
        };
        Insert: {
          id_pedido: number;
          estado: string;
          fecha?: string;
        };
        Update: {
          id_pedido?: number;
          estado?: string;
          fecha?: string;
        };
        Relationships: [];
      };
      pedido: {
        Row: {
          id_pedido: number;
          id_cliente: number;
          fecha: string;
          total: number;
          estado_actual: 'Pendiente de Pago' | 'Pago Validado' | 'Rechazado' | 'Cancelado';
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id_cliente: number;
          fecha?: string;
          total?: number;
          estado_actual?: 'Pendiente de Pago' | 'Pago Validado' | 'Rechazado' | 'Cancelado';
          creado_en?: string;
          actualizado_en?: string;
        };
        Update: {
          id_cliente?: number;
          fecha?: string;
          total?: number;
          estado_actual?: 'Pendiente de Pago' | 'Pago Validado' | 'Rechazado' | 'Cancelado';
          creado_en?: string;
          actualizado_en?: string;
        };
        Relationships: [];
      };
      producto: {
        Row: {
          id_producto: number;
          nombre: string;
          categoria: string;
          tipo: string;
          descripcion: string;
          precio: number;
          tiempo_produccion: number;
          activo: boolean;
          imagen_url: string | null;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          nombre: string;
          categoria: string;
          tipo: string;
          descripcion?: string;
          precio: number;
          tiempo_produccion?: number;
          activo?: boolean;
          imagen_url?: string | null;
          creado_en?: string;
          actualizado_en?: string;
        };
        Update: {
          nombre?: string;
          categoria?: string;
          tipo?: string;
          descripcion?: string;
          precio?: number;
          tiempo_produccion?: number;
          activo?: boolean;
          imagen_url?: string | null;
          creado_en?: string;
          actualizado_en?: string;
        };
        Relationships: [];
      };
      remitos_de_venta: {
        Row: {
          id_remito: number;
          id_comprobante: number;
          id_cliente: number;
          fecha: string;
          total: number;
          numero: string;
        };
        Insert: {
          id_comprobante: number;
          id_cliente: number;
          fecha?: string;
          total: number;
          numero?: string;
        };
        Update: {
          id_comprobante?: number;
          id_cliente?: number;
          fecha?: string;
          total?: number;
          numero?: string;
        };
        Relationships: [];
      };
      stock: {
        Row: {
          id_stock: number;
          id_producto: number;
          cantidad_actual: number;
          cantidad_reservada: number;
          cantidad_warning: number;
          actualizado_en: string;
        };
        Insert: {
          id_producto: number;
          cantidad_actual?: number;
          cantidad_reservada?: number;
          cantidad_warning?: number;
          actualizado_en?: string;
        };
        Update: {
          id_producto?: number;
          cantidad_actual?: number;
          cantidad_reservada?: number;
          cantidad_warning?: number;
          actualizado_en?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      vista_catalogo: {
        Row: {
          id_producto: number | null;
          nombre: string | null;
          categoria: string | null;
          tipo: string | null;
          descripcion: string | null;
          precio: number | null;
          tiempo_produccion: number | null;
          imagen_url: string | null;
          cantidad_actual: number | null;
          cantidad_reservada: number | null;
          disponible: number | null;
          cantidad_warning: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      aprobar_comprobante: {
        Args: { p_id_comprobante: number };
        Returns: Database['public']['Tables']['remitos_de_venta']['Row'];
      };
      cancelar_pedidos_vencidos: {
        Args: Record<string, never>;
        Returns: number;
      };
      crear_pedido: {
        Args: { p_id_cliente: number; p_items: Json };
        Returns: Database['public']['Tables']['pedido']['Row'];
      };
      rechazar_comprobante: {
        Args: { p_id_comprobante: number };
        Returns: Database['public']['Tables']['pedido']['Row'];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ── Alias de dominio (los usan el front y los servicios) ───────────────────────
type Tabla<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Cliente = Tabla<'cliente'>;
export type NuevoCliente = Insertable<'cliente'>;
export type Producto = Tabla<'producto'>;
export type NuevoProducto = Insertable<'producto'>;
export type Stock = Tabla<'stock'>;
export type Pedido = Tabla<'pedido'>;
export type DetallePedido = Tabla<'detalle_del_pedido'>;
export type Comprobante = Tabla<'comprobante'>;
export type RemitoVenta = Tabla<'remitos_de_venta'>;
export type AlertaStock = Tabla<'alerta_de_estado'>;
export type VistaCatalogo = Database['public']['Views']['vista_catalogo']['Row'];

export type EstadoPedido = Pedido['estado_actual'];
export type EstadoComprobante = Comprobante['estado_actual'];

export type ItemPedido = { id_producto: number; cantidad: number };
export type CrearPedidoArgs = Database['public']['Functions']['crear_pedido']['Args'];

export const ESTADOS_PEDIDO = [
  'Pendiente de Pago',
  'Pago Validado',
  'Rechazado',
  'Cancelado',
] as const satisfies readonly EstadoPedido[];

export const ESTADOS_COMPROBANTE = [
  'Comprobante Subido',
  'Aprobado por Admin',
  'Rechazado',
] as const satisfies readonly EstadoComprobante[];
