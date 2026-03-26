'use server'

import { neon } from "@neondatabase/serverless"
import { Resend } from 'resend'

// Clientes
const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY)

// Tipos de notificación soportados
type NotificationType = 'DISCONNECTION' | 'PLAN_LIMIT' | 'WELCOME' | 'PAYMENT_SUCCESS'

interface EmailPayload {
  userId?: string
  linePhone?: string // Alternativa si no tienes userId a mano
  type: NotificationType
  data?: any // Datos extra (ej: fecha, monto, etc)
}

export async function sendSystemNotification({ userId, linePhone, type, data }: EmailPayload) {
  try {
    let targetEmail = ""
    let userName = "Usuario"

    // 1. Obtener Email del Usuario (Dinámicamente)
    if (userId) {
        const user = await sql`SELECT email, nombre FROM usuarios WHERE id = ${userId}`
        if (user.length > 0) {
            targetEmail = user[0].email
            userName = user[0].nombre || "Usuario"
        }
    } else if (linePhone) {
        // Buscar dueño de la línea
        const line = await sql`
            SELECT u.email, u.nombre 
            FROM lineas_whatsapp l
            JOIN usuarios u ON l."userId" = u.id
            WHERE l.phone = ${linePhone}
        `
        if (line.length > 0) {
            targetEmail = line[0].email
            userName = line[0].nombre || "Usuario"
        }
    }

    if (!targetEmail) {
        console.error("❌ Error Email: No se encontró email para enviar notificación.")
        return { success: false, error: "User email not found" }
    }

    // 2. Construir el Email según el tipo
    let subject = ""
    let htmlContent = ""

    switch (type) {
case 'DISCONNECTION':
    const reason = data?.reason || "Pérdida de conexión con el servidor"; // Capturamos la razón
    
    subject = `🚨 ALERTA CRÍTICA: Tu línea ${linePhone || ''} está DESCONECTADA` // Título más fuerte
    
    htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #e5e7eb; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 40px;">🔌</span>
            </div>
            <h2 style="color: #e11d48; text-align: center; margin-top: 0;">¡Acción Requerida!</h2>
            
            <p>Hola <strong>${userName}</strong>,</p>
            
            <p>El sistema ha detectado que tu línea de WhatsApp <strong>${linePhone}</strong> ha entrado en estado <span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: bold;">DESCONECTADA</span>.</p>
            
            <p><strong>Razón detectada:</strong> ${reason}</p>
            
            <div style="background: #fff7ed; padding: 15px; border-radius: 8px; border-left: 4px solid #f97316; margin: 20px 0;">
                <strong>⚠️ Impacto:</strong> Tus bots están detenidos y no estás recibiendo mensajes en el CRM.
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" 
                   style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Escanear QR Nuevamente
                </a>
            </div>
            
            <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280;">
                Si ya reconectaste la línea, ignora este mensaje.
            </p>
        </div>
    `
    break;
            
        // ... Agregar más casos aquí ...
    }

    // 3. Enviar con Resend
    const { data: emailData, error } = await resend.emails.send({
      from: 'CRM Alertas <onboarding@resend.dev>', // Cambia esto por tu dominio verificado
      to: [targetEmail],
      subject: subject,
      html: htmlContent,
    })

    if (error) {
        console.error("❌ Error Resend:", error)
        return { success: false, error }
    }

    console.log(`📧 Email enviado a ${targetEmail} (Tipo: ${type})`)
    return { success: true, id: emailData?.id }

  } catch (e: any) {
    console.error("❌ Error System Notification:", e)
    return { success: false, error: e.message }
  }
}
