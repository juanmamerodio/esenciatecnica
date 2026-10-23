import { NextResponse } from 'next/server';
import { getServiceSupabase, type OrderStatus } from '@/lib/supabase';

// Ruta llamada desde Google Apps Script (GAS) para sincronizar un pedido
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const systemToken = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Validación rústica (básica) de seguridad para evitar bots
    if (!authHeader || authHeader !== `Bearer ${systemToken}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, nuevoEstado } = body;

    if (!orderId || !nuevoEstado) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const serviceClient = getServiceSupabase();
    
    // Actualizamos el pedido
    const { data: order, error } = await serviceClient
      .from('pedidos')
      .update({ estado: nuevoEstado as OrderStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Error en sync-sheets:", error);
    return NextResponse.json({ error: 'Error procesando sincronización' }, { status: 500 });
  }
}
