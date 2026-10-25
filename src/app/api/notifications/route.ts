import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// El cliente de correo se arma por llamada y no al importar: instanciarlo arriba ataba
// `npm run build` a que RESEND_API_KEY existiera en el entorno (AGENTS §8).
let clienteDeCorreo: Resend | null = null;

function correo(): Resend {
  if (!clienteDeCorreo) clienteDeCorreo = new Resend(process.env.RESEND_API_KEY || '');
  return clienteDeCorreo;
}

// Este endpoint es un puente temporal hacia el proyecto Supabase de Teams.
// Si TEAMS_SUPABASE_* no está definido, cae al proyecto del e-commerce para no romper el flujo actual.
const supabaseUrl =
  process.env.TEAMS_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://uchyattzuhaltsaxazce.supabase.co';
const supabaseKey =
  process.env.TEAMS_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Correos oficiales del equipo sincronizados con Supabase team_members
const DEFAULT_FALLBACK_EMAILS: Record<string, string> = {
  Juanma: 'juanmamerodio@gmail.com',
  Enzo: 'enzo.queipo23@gmail.com',
  Celeste: 'celestecaceres100@gmail.com',
  Isabella: 'isainfante.zapata@gmail.com'
};

export type NotificationEventType =
  | 'MEETING_CREATED'     // Convocatoria a reunión
  | 'MEETING_CONFIRMED'   // Unanimidad 4/4 y link Meet activo
  | 'MEETING_CLOSED'      // Cierre de llamada y minuta archivada
  | 'PRESENCIAL_SAVED'    // Minuta presencial de los jueves asentada
  | 'TASK_COMPLETED'      // Tarea marcada como completada
  | 'TASK_CREATED'        // Nueva tarea asignada
  | 'TASK_NOTE_ADDED'     // Bitácora / avance agregado a una tarea
  | 'DISCUSSION_CREATED'  // Nueva nota en bandeja de entrada (bloqueo, ayuda, avance)
  | 'DISCUSSION_COMMENT'; // Comentario / respuesta en debate

interface NotificationPayload {
  eventType: NotificationEventType;
  actorKey: string;
  actorName: string;
  title: string;
  details?: string;
  link?: string;
  category?: string;
  meta?: Record<string, unknown>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET: Obtiene la lista oficial de miembros y sus correos electrónicos configurados en Supabase
 */
export async function GET() {
  try {
    const { data: members, error } = await supabase
      .from('team_members')
      .select('key, name, role, email, notify_on_meetings, notify_on_tasks, notify_on_discussions');

    if (error) {
      console.warn('Advertencia leyendo team_members en Supabase:', error.message);
      return NextResponse.json({
        members: Object.entries(DEFAULT_FALLBACK_EMAILS).map(([key, email]) => ({
          key,
          name: key,
          email,
          source: 'fallback'
        }))
      }, { headers: corsHeaders });
    }

    // Si la tabla devolvió datos, combinamos con fallback si algún email está vacío
    const mapped = (members || []).map((m: { key: string; name?: string; role?: string; email?: string }) => ({
      key: m.key,
      name: m.name || m.key,
      role: m.role || '',
      email: m.email || DEFAULT_FALLBACK_EMAILS[m.key] || '',
      source: m.email ? 'supabase' : 'fallback'
    }));

    return NextResponse.json({ members: mapped }, { headers: corsHeaders });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500, headers: corsHeaders });
  }
}

/**
 * POST: Procesa el evento de Teams y despacha los correos con plantillas M3 Expressive
 */
export async function POST(req: Request) {
  try {
    const body: NotificationPayload = await req.json();
    // URL pública del Hub/Teams para los botones del email. Se puede sobreescribir por entorno.
    const teamsHubUrl =
      process.env.TEAMS_HUB_URL ||
      'https://juanmamerodio.github.io/quimicashop/tasks.html';
    const { eventType, actorKey, actorName, title, details = '', link = teamsHubUrl, category = 'INFO' } = body;

    if (!eventType || !title) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: eventType o title' }, { status: 400, headers: corsHeaders });
    }

    // 1. Obtener correos oficiales de la base de datos (team_members)
    let recipientList: Array<{ key: string; name: string; email: string }> = [];

    try {
      const { data: members } = await supabase
        .from('team_members')
        .select('key, name, email');

      if (members && members.length > 0) {
        recipientList = members
          .map((m: { key: string; name?: string; email?: string }) => ({
            key: m.key,
            name: m.name || m.key,
            email: m.email || DEFAULT_FALLBACK_EMAILS[m.key] || ''
          }))
          .filter((m: { email: string }) => m.email && m.email.includes('@'));
      }
    } catch (e) {
      console.warn('Fallo consulta a Supabase team_members, usando fallback:', e);
    }

    // Si no se obtuvieron receptores de la DB, usar fallback
    if (recipientList.length === 0) {
      recipientList = Object.entries(DEFAULT_FALLBACK_EMAILS).map(([key, email]) => ({
        key,
        name: key,
        email
      }));
    }

    // 2. Filtrar destinatarios: excluimos al actor que originó la acción si es notificación a los demás
    const otherRecipients = recipientList.filter(r => r.key.toLowerCase() !== actorKey.toLowerCase());
    const finalRecipients = otherRecipients.length > 0 ? otherRecipients : recipientList;
    const recipientEmails = finalRecipients.map(r => r.email);

    // 3. Generar contenido y asunto del correo según el tipo de evento
    let subject = '';
    let badgeText = 'TEAMS NOTIFICATION';
    let badgeColor = '#3d8c6e';
    let badgeBg = '#e8f3ef';
    let actionLabel = 'Abrir Teams Hub';

    switch (eventType) {
      case 'MEETING_CREATED':
        subject = `📢 Convocatoria a Reunión: ${title}`;
        badgeText = 'VOTACIÓN UNÁNIME REQUERIDA (4/4)';
        badgeColor = '#b45309';
        badgeBg = '#fef3c7';
        actionLabel = 'Ingresar y Votar';
        break;

      case 'MEETING_CONFIRMED':
        subject = `✅ Reunión Confirmada (4/4): ${title}`;
        badgeText = 'LLAMADA GOOGLE MEET ACTIVA';
        badgeColor = '#15803d';
        badgeBg = '#dcfce7';
        actionLabel = 'Unirse a Google Meet';
        break;

      case 'MEETING_CLOSED':
        subject = `🔒 Minuta Archivada y Sesión Cerrada: ${title}`;
        badgeText = 'ACTA INMUTABLE CERRADA';
        badgeColor = '#0369a1';
        badgeBg = '#e0f2fe';
        actionLabel = 'Ver Minuta en Historial';
        break;

      case 'PRESENCIAL_SAVED':
        subject = `🏫 Minuta Presencial de Cátedra Asentada`;
        badgeText = 'TALLER E.E.S.T N°1 (JUEVES)';
        badgeColor = '#0284c7';
        badgeBg = '#e0f2fe';
        actionLabel = 'Consultar Acuerdos';
        break;

      case 'TASK_COMPLETED':
        subject = `🚀 Tarea Completada: ${title}`;
        badgeText = 'SPRINT BACKLOG · COMPLETADO';
        badgeColor = '#3d8c6e';
        badgeBg = '#e8f3ef';
        actionLabel = 'Ver Tablero Kanban';
        break;

      case 'TASK_CREATED':
        subject = `📋 Nueva Tarea en Backlog: ${title}`;
        badgeText = 'NUEVA ASIGNACIÓN';
        badgeColor = '#6d28d9';
        badgeBg = '#ede9fe';
        actionLabel = 'Ver Tarea Asignada';
        break;

      case 'TASK_NOTE_ADDED':
        subject = `📝 Avance / Bitácora en Tarea: ${title}`;
        badgeText = 'BITÁCORA TÉCNICA';
        badgeColor = '#4b5563';
        badgeBg = '#f3f4f6';
        actionLabel = 'Ver Comentarios de Tarea';
        break;

      case 'DISCUSSION_CREATED':
        if (category === 'BLOQUEO') {
          subject = `🚨 [BLOQUEO TÉCNICO] ${actorName}: ${title}`;
          badgeText = 'TRABA / BLOQUEO';
          badgeColor = '#b91c1c';
          badgeBg = '#fef2f2';
        } else if (category === 'AYUDA') {
          subject = `🆘 [PETICIÓN DE AYUDA] ${actorName}: ${title}`;
          badgeText = 'AYUDA REQUERIDA';
          badgeColor = '#b45309';
          badgeBg = '#fffbeb';
        } else if (category === 'DEBATE') {
          subject = `💡 [DEBATE DE EQUIPO] ${actorName}: ${title}`;
          badgeText = 'DEBATE ABIERTO';
          badgeColor = '#6d28d9';
          badgeBg = '#f5f3ff';
        } else {
          subject = `📌 [AVANCE DE EQUIPO] ${actorName}: ${title}`;
          badgeText = 'NOTA DE AVANCE';
          badgeColor = '#047857';
          badgeBg = '#ecfdf5';
        }
        actionLabel = 'Responder en la Bandeja';
        break;

      case 'DISCUSSION_COMMENT':
        subject = `💬 Nueva Respuesta de ${actorName} en: ${title}`;
        badgeText = 'HILO DE DEBATE';
        badgeColor = '#2563eb';
        badgeBg = '#eff6ff';
        actionLabel = 'Ver Hilo y Debatir';
        break;

      default:
        subject = `Notificación de Teams: ${title}`;
    }

    // 4. Plantilla de correo con estética M3 Expressive + iOS 26
    const htmlEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f5; margin: 0; padding: 24px; color: #1c1c1e; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 18px; border: 1px solid rgba(0,0,0,0.08); overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
          .header { padding: 24px 28px 18px; border-bottom: 1px solid rgba(0,0,0,0.05); }
          .badge { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; padding: 4px 10px; border-radius: 6px; background-color: ${badgeBg}; color: ${badgeColor}; }
          .title { font-size: 18px; font-weight: 750; color: #1c1c1e; margin: 12px 0 6px; line-height: 1.35; }
          .author { font-size: 13px; color: #8e8e93; }
          .body { padding: 24px 28px; font-size: 14px; line-height: 1.6; color: #3a3a3c; }
          .details-card { background: #fafaf9; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 13.5px; white-space: pre-wrap; font-family: inherit; }
          .btn-wrap { margin-top: 24px; text-align: center; }
          .btn { display: inline-block; background-color: #3d8c6e; color: #ffffff !important; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 10px; text-decoration: none; }
          .footer { padding: 16px 28px; background: #fafaf9; border-top: 1px solid rgba(0,0,0,0.05); font-size: 11px; color: #8e8e93; text-align: center; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="badge">${badgeText}</span>
            <h1 class="title">${title}</h1>
            <div class="author">Acción realizada por <strong>${actorName}</strong></div>
          </div>
          <div class="body">
            <div class="details-card">${details || 'Sin observaciones adicionales.'}</div>
            <div class="btn-wrap">
              <a href="${link}" class="btn">${actionLabel}</a>
            </div>
          </div>
          <div class="footer">
            <strong>Esencia Técnica · QuimicaShop 2026</strong><br>
            Departamento de Química & 7mo Año Programación · E.E.S.T N°1 Luciano Reyes (Campana)
          </div>
        </div>
      </body>
      </html>
    `;

    // 5. Envío mediante Resend con dominio verificado ascender.uno
    const fromSender = process.env.RESEND_FROM || 'QuimicaShop Teams <notificaciones@ascender.uno>';

    const resendResponse = await correo().emails.send({
      from: fromSender,
      to: recipientEmails,
      subject: subject,
      html: htmlEmail
    });

    if (resendResponse.error) {
      console.warn('Resend API returned error:', resendResponse.error);
      return NextResponse.json({
        success: false,
        error: resendResponse.error.message || resendResponse.error,
        recipients: recipientEmails
      }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({
      success: true,
      data: resendResponse.data,
      recipientsCount: recipientEmails.length,
      recipients: recipientEmails
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error procesando notificación:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500, headers: corsHeaders });
  }
}
