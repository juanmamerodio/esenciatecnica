import { NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { CreateOrderSchema } from '@/lib/schemas';

/**
 * Helper para extraer el mensaje de error de forma segura
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  if (typeof error === 'string') return error;
  return 'Ocurrió un error inesperado';
}

/**
 * GET: Obtener todos los pedidos (para el panel admin)
 */
export async function GET() {
  try {
    const orders = await OrderService.getOrdersForSync();
    return NextResponse.json({ orders });
  } catch (error: unknown) {
    console.error("Error GET orders:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * POST: Crear un nuevo pedido con validación atómica de stock.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. VALIDACIÓN CON ZOD
    const result = CreateOrderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({
        error: 'Datos de pedido inválidos',
        details: result.error.format()
      }, { status: 400 });
    }

    // 2. CREACIÓN ATÓMICA
    const { id: orderId } = await OrderService.createOrder(result.data);
    const order = await OrderService.getById(orderId);

    return NextResponse.json({ order }, { status: 201 });

  } catch (error: unknown) {
    console.error("Error POST orders:", error);

    const message = getErrorMessage(error);

    // Manejo específico de errores de stock (provenientes de la RPC de Postgres)
    if (message.includes('Stock insuficiente')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: 'No se pudo procesar el pedido' }, { status: 500 });
  }
}

/**
 * PATCH: Actualizar el estado de un pedido.
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Falta id o status' }, { status: 400 });
    }

    // El OrderService.updateStatus devuelve { success, error }
    const result = await OrderService.updateStatus(id, status);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updatedOrder = await OrderService.getById(id);
    return NextResponse.json({ order: updatedOrder });

  } catch (error: unknown) {
    console.error("Error PATCH order:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}