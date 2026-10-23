import { getServiceSupabase, type Pedido, type OrderStatus } from '@/lib/supabase';
import { CreateOrderInput } from '@/lib/schemas';
import { Resend } from 'resend';

/**
 * ORDER SERVICE
 * Centraliza la lógica de negocio de los pedidos. 
 * Utiliza el Service Role de Supabase para saltar RLS en operaciones críticas de servidor.
 */
export class OrderService {

  /**
   * Crea un pedido de forma atómica.
   */
  static async createOrder(input: CreateOrderInput): Promise<{ id: string; order: Pedido }> {
    const supabase = getServiceSupabase();

    // @ts-expect-error - La función RPC no está en los tipos generados pero existe en PostgreSQL
    const { data, error } = await supabase.rpc('crear_pedido_con_stock', {
      p_nombre: input.nombre_cliente,
      p_email: input.email,
      p_telefono: input.telefono || null,
      p_items: input.items,
      p_total: input.total_ars,
    });

    if (error) {
      console.error('[OrderService] Error en creación atómica:', error);
      throw new Error(error.message || 'Error al procesar el pedido y validar stock');
    }

    const orderId = data as string;
    const order = await this.getById(orderId);

    if (!order) {
      throw new Error('Pedido creado pero no se pudo recuperar la información.');
    }

    this.sendInitialEmail(order).catch(err =>
      console.error('[OrderService] Error enviando email inicial:', err)
    );

    return { id: orderId, order };
  }

  /**
   * Obtiene un pedido por su ID utilizando privilegios de administrador.
   */
  static async getById(id: string): Promise<Pedido | null> {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error recuperando pedido: ${error.message}`);
    }

    return data as Pedido;
  }

  /**
   * Actualiza el estado de un pedido y gestiona efectos secundarios (Webhooks).
   * SOLUCIÓN AL ERROR DE TIPADO: Usamos Pedido['log_ia'] para asegurar compatibilidad.
   */
  static async updateStatus(
    pedidoId: string,
    status: OrderStatus,
    log_ia: Pedido['log_ia'] = {} as Pedido['log_ia'] // <--- CORRECCIÓN AQUÍ
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getServiceSupabase();

    // Definimos el payload explícitamente como Partial<Pedido> para evitar errores de asignación
    const updatePayload: Partial<Pedido> = {
      estado: status,
      log_ia: log_ia
    };

    const { error } = await supabase
      .from('pedidos')
      .update(updatePayload)
      .eq('id', pedidoId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (status === 'pre_aprobado') {
      this.notifySheetsWebhook(pedidoId).catch(err =>
        console.error('[OrderService] Error en Webhook de Sheets:', err)
      );
    }

    return { success: true, error: null };
  }

  /**
   * Envía el email de instrucciones de pago inicial mediante Resend.
   */
  static async sendInitialEmail(order: Pedido): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'quimica@eest1.edu.ar',
      to: order.email,
      subject: '🧪 Tu pedido en QuimicaShop - Instrucciones de Pago',
      html: `
        <div style="font-family: sans-serif; color: #1c1c1e; max-width: 600px; border: 1px solid #f0f0ee; padding: 24px; border-radius: 12px;">
          <h2 style="color: #3d8c6e;">¡Hola ${order.nombre_cliente}!</h2>
          <p>Hemos recibido tu pedido correctamente. Para que podamos procesarlo, por favor realiza la transferencia por el total de:</p>
          <h1 style="background: #f7f7f5; padding: 12px; border-radius: 8px; text-align: center; font-family: monospace;">$${order.total_ars} ARS</h1>
          
          <div style="background: #e8f3ef; border-left: 4px solid #3d8c6e; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Datos para la transferencia:</p>
            <p style="margin: 8px 0 0 0;"><strong>Alias:</strong> PRODUCTOS.QUIMICA.EEST1</p>
            <p style="margin: 4px 0 0 0;"><strong>CBU:</strong> 0000003100012345678901</p>
            <p style="margin: 4px 0 0 0;"><strong>Titular:</strong> Cooperadora EEST N1</p>
          </div>

          <p>Una vez realizada la transferencia, <strong>sube el comprobante</strong> en nuestra web para que la IA lo valide automáticamente.</p>
          <p style="font-size: 12px; color: #8e8e93; border-top: 1px solid #f0f0ee; margin-top: 20px; padding-top: 20px;">
            Este es un proyecto educativo de los alumnos de 7mo año - E.E.S.T N°1 Luciano Reyes.
          </p>
        </div>
      `
    });
  }

  private static async notifySheetsWebhook(orderId: string) {
    const webhookUrl = process.env.SHEETS_WEBHOOK_URL;
    if (!webhookUrl) return;

    const order = await this.getById(orderId);
    if (!order) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'ORDER_PAID',
        order: order,
        timestamp: new Date().toISOString()
      }),
    });
  }

  static async getOrdersForSync(limit = 50) {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}