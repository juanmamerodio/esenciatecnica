import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyReceiptWithGemini } from '@/lib/gemini';
import { OrderService } from '@/services/order.service';
import { VerifyPaymentSchema } from '@/lib/schemas';
import { Resend } from 'resend';

// RATELIMIT EN MEMORIA (MVP)
// Para producción se recomienda Upstash Redis (ratelimit)
const ATTEMPT_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora
const rateLimitMap = new Map<string, { count: number, lastAttempt: number }>();

/**
 * API ROUTE: /api/verify-payment
 * Flujo Hardened: Rate Limit -> Validation -> Idempotency -> Analysis -> Persistence -> Notification
 */
export async function POST(req: Request) {
  try {
    // 1. VALIDACIÓN CON ZOD
    const body = await req.json();
    const result = VerifyPaymentSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Datos inválidos', 
        details: result.error.format() 
      }, { status: 400 });
    }

    const { imageBase64, mimeType, pedidoId, totalEsperado } = result.data;

    // 2. RATE LIMITING (Protección contra DoS de Wallet Gemini)
    const now = Date.now();
    const rateData = rateLimitMap.get(pedidoId) || { count: 0, lastAttempt: now };
    
    if (now - rateData.lastAttempt > WINDOW_MS) {
      rateData.count = 0; // Reiniciamos si pasó la ventana
    }

    if (rateData.count >= ATTEMPT_LIMIT) {
      return NextResponse.json({ 
        error: 'Demasiados intentos. Por favor espera una hora.' 
      }, { status: 429 });
    }
    
    rateLimitMap.set(pedidoId, { count: rateData.count + 1, lastAttempt: now });

    // 3. IDEMPOTENCIA (Protección contra duplicados)
    const isAlreadyProcessed = await OrderService.isProcessed(pedidoId);
    if (isAlreadyProcessed) {
      const order = await OrderService.getById(pedidoId);
      return NextResponse.json({ 
        success: true, 
        estado: order?.estado, 
        url: order?.comprobante_url, 
        message: 'Este pedido ya ha sido procesado previamente.' 
      });
    }

    const serviceClient = getServiceSupabase();

    // 4. PROCESAMIENTO DE ARCHIVO
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (buffer.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen excede el límite de 4MB.' }, { status: 400 });
    }

    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    const filename = `comprobantes/${pedidoId}_${Date.now()}.${extension}`;

    const { error: uploadError } = await serviceClient.storage
      .from('comprobantes')
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

    const { data: publicUrlData } = serviceClient.storage
      .from('comprobantes')
      .getPublicUrl(filename);

    const comprobanteUrl = publicUrlData.publicUrl;

    // 5. ANÁLISIS IA (GEMINI)
    const iaResponse = await verifyReceiptWithGemini(imageBase64, mimeType, totalEsperado);

    // 6. PERSISTENCIA Y CAMBIO DE ESTADO
    // Guardamos auditoría
    await serviceClient.from('verificaciones').insert({
      pedido_id: pedidoId,
      respuesta_gemini: iaResponse,
      verificado: iaResponse.valid
    });

    const nuevoEstado = iaResponse.valid ? 'pre_aprobado' : 'comprobante_subido';
    await OrderService.updateStatus(pedidoId, nuevoEstado, {
      comprobante_url: comprobanteUrl,
      log_ia: iaResponse
    });

    // 7. NOTIFICACIÓN RESEND
    try {
      const pedidoInfo = await OrderService.getById(pedidoId);
      const apiKey = process.env.RESEND_API_KEY;

      if (pedidoInfo?.email && apiKey) {
        const resend = new Resend(apiKey);
        const isSuccess = iaResponse.valid;

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'quimica@eest1.edu.ar',
          to: pedidoInfo.email,
          subject: isSuccess ? '✅ Pago Pre-Aprobado - Química Shop' : '📩 Comprobante Recibido - Química Shop',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 16px;">
              <h2 style="color: ${isSuccess ? '#3d8c6e' : '#1c1c1e'};">${isSuccess ? '¡Pago Validado!' : 'Comprobante Recibido'}</h2>
              <p>Hola <strong>${pedidoInfo.nombre_cliente}</strong>,</p>
              <p>${isSuccess
              ? `Tu comprobante de <strong>$${totalEsperado} ARS</strong> fue validado exitosamente. Tu pedido ha sido pre-aprobado.`
              : `Recibimos tu comprobante de <strong>$${totalEsperado} ARS</strong>. Un administrador lo revisará manualmente pronto.`
            }</p>
              <div style="margin-top: 20px; padding: 15px; background: #f7f7f5; border-radius: 12px; font-size: 12px; color: #8e8e93; text-align: center;">
                E.E.S.T N°1 Luciano Reyes · Departamento de Química
              </div>
            </div>
          `
        });
      }
    } catch (emailErr) {
      console.error("Non-blocking notification error:", emailErr);
    }

    return NextResponse.json({
      success: true,
      estado: nuevoEstado,
      url: comprobanteUrl,
      ia_valid: iaResponse.valid
    });

  } catch (error) {
    const err = error as Error;
    console.error("VERIFY_PAYMENT_FAILED:", err);
    return NextResponse.json(
      { error: err.message || 'Error en el proceso de verificación' },
      { status: 500 }
    );
  }
}