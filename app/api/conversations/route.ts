import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireAuth } from "@/lib/auth-middleware"

const sql = neon(process.env.DATABASE_URL!)
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req)
    
    // 1. ¿Es jefe o es agente?
    const isBoss = user.role === 'OWNER' || user.role === 'ADMIN' || user.id === user.rootOwnerId;
    
    let conversations = [];

    // 🔥 EL NUEVO PARCHE MÁGICO: CASE WHEN
    // Regla: Usa el nombre del CRM SOLO si no es el número de teléfono. Si es el número, usa el nombre que sacó WhatsApp.

    if (isBoss) {
        conversations = await sql`
          SELECT 
            c.id, 
            CASE 
              WHEN cont.name IS NOT NULL AND cont.name != '' AND cont.name != c.contact_phone THEN cont.name 
              ELSE c.contact_name 
            END as contact_name, 
            c.contact_phone, c.unread_count, c.unread_ia_payment, c.status, c.last_activity, c."lineId", c.usuario_id, c.is_group, c.assigned_to, cont.tags,
            (SELECT content FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_content,
            (SELECT type FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_type,
            (SELECT status FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_status,
            (SELECT is_incoming FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_is_incoming,
            (SELECT timestamp FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_time
          FROM conversaciones c
          LEFT JOIN "Contact" cont ON c.contact_phone = cont.phone AND cont.usuario_id = ${user.rootOwnerId}
          WHERE c.usuario_id = ${user.rootOwnerId}
          ORDER BY c.last_activity DESC
        `
    } else {
        const dbUser = await sql`SELECT permissions FROM usuarios WHERE id = ${user.id}`;
        const perms = dbUser[0]?.permissions || {};
        const parsedPerms = typeof perms === 'string' ? JSON.parse(perms) : perms;
        const allowedLines = parsedPerms.allowedLineIds || [];

       if (allowedLines.length > 0) {
            conversations = await sql`
              SELECT 
                c.id, 
                CASE 
                  WHEN cont.name IS NOT NULL AND cont.name != '' AND cont.name != c.contact_phone THEN cont.name 
                  ELSE c.contact_name 
                END as contact_name, 
                c.contact_phone, c.unread_count, c.unread_ia_payment, c.status, c.last_activity, c."lineId", c.usuario_id, c.is_group, c.assigned_to, cont.tags,
                (SELECT content FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_content,
                (SELECT type FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_type,
                (SELECT status FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_status,
                (SELECT is_incoming FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_is_incoming,
                (SELECT timestamp FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_time
              FROM conversaciones c
              LEFT JOIN "Contact" cont ON c.contact_phone = cont.phone AND cont.usuario_id = ${user.rootOwnerId}
              WHERE c.usuario_id = ${user.rootOwnerId}
              AND (c.assigned_to = ${user.id} OR c."lineId" = ANY(${allowedLines}))
              ORDER BY c.last_activity DESC
            `
        } else {
            conversations = await sql`
              SELECT 
                c.id, 
                CASE 
                  WHEN cont.name IS NOT NULL AND cont.name != '' AND cont.name != c.contact_phone THEN cont.name 
                  ELSE c.contact_name 
                END as contact_name, 
                c.contact_phone, c.unread_count, c.unread_ia_payment, c.status, c.last_activity, c."lineId", c.usuario_id, c.is_group, c.assigned_to, cont.tags,
                (SELECT content FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_content,
                (SELECT type FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_type,
                (SELECT status FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_status,
                (SELECT is_incoming FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_is_incoming,
                (SELECT timestamp FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_time
              FROM conversaciones c
              LEFT JOIN "Contact" cont ON c.contact_phone = cont.phone AND cont.usuario_id = ${user.rootOwnerId}
              WHERE c.usuario_id = ${user.rootOwnerId}
              AND c.assigned_to = ${user.id}
              ORDER BY c.last_activity DESC
            `
        }
    }

    // 3. Normalización
    const safeData = conversations.map(c => {
        let preview = c.last_message_content || "";
        if ((c.last_message_type === 'image' || c.last_message_type === 'imagen') && (!preview || preview.startsWith('http'))) {
            preview = "📷 Imagen";
        }

        return {
            id: c.id,
            // Aquí ya viene purificado por la base de datos
            contact_name: c.contact_name || c.contact_phone, 
            contact_phone: c.contact_phone,
            unread_count: Number(c.unread_count || 0),
            unread_ia_payment: c.unread_ia_payment === true,
            status: c.status || 'INBOX',
            is_group: c.is_group === true,
            assigned_to: c.assigned_to,
            tags: c.tags || [], 
            lineId: c.lineId,
            line_id: c.lineId,
            usuario_id: c.usuario_id,
            last_message: preview,
            last_message_status: c.last_message_status || 'sent',
            last_message_is_incoming: c.last_message_is_incoming === true,
            last_activity: c.last_message_time || c.last_activity || new Date().toISOString()
        }
    })

    return NextResponse.json(safeData)

  } catch (error: any) {
    console.error("❌ Error API Conversations:", error)
    return NextResponse.json(
        { error: "Failed to fetch conversations", details: error.message }, 
        { status: 500 }
    )
  }
}
