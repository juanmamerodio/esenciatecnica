import { z } from 'zod';

/**
 * SCHEMA: ITEM DE PEDIDO
 * Validación para los items dentro de un carrito/pedido.
 */
export const OrderItemSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad: z.number().int().positive(),
  precio_unitario: z.number().nonnegative(),
  nombre: z.string().min(1),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

/**
 * SCHEMA: CREACIÓN DE PEDIDO
 * Validación para la entrada del endpoint /api/orders
 */
export const CreateOrderSchema = z.object({
  nombre_cliente: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  telefono: z.string().nullable().optional(),
  items: z.array(OrderItemSchema).min(1, "El pedido debe tener al menos un producto"),
  total_ars: z.number().positive("El total debe ser un valor positivo"),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

/**
 * SCHEMA: VERIFICACIÓN DE PAGO
 * Validación para la entrada del endpoint /api/verify-payment
 */
export const VerifyPaymentSchema = z.object({
  imageBase64: z.string().min(100, "Imagen base64 inválida o demasiado corta"),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/jpg']),
  pedidoId: z.string().uuid("ID de pedido inválido"),
  totalEsperado: z.number().positive("El monto esperado debe ser positivo"),
});

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
