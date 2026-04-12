import { sql } from "@/lib/db"
import { MessageCenter } from "@/components/dashboard/message-center"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

// 1. OBTENER CONVERSACIONES 
async function getConversations(rootOwnerId: string, allowedLineIds: string[]) {
  try {
    if (allowedLineIds.length === 0) return []

    const conversations = await sql`
      SELECT 
        c.*,
        l.nombre as line_name,   
        co.tags,                 
        co.name as contact_name, 
        co.notes,
        (SELECT COUNT(*) FROM mensajes m WHERE m.conversation_id = c.id AND m.is_incoming = true AND m.is_read = false) as unread_count,
        (SELECT content FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message,
        (SELECT is_incoming FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_is_incoming,
        (SELECT m.status FROM mensajes m WHERE m.conversation_id = c.id ORDER BY m.timestamp DESC LIMIT 1) as last_message_status
      FROM conversaciones c
      LEFT JOIN lineas_whatsapp l ON c."lineId" = l.id
      LEFT JOIN "Contact" co ON c.contact_phone = co.phone AND co.usuario_id = ${rootOwnerId}
      WHERE c.usuario_id = ${rootOwnerId}
        AND c."lineId" = ANY(${allowedLineIds})
      ORDER BY c.last_activity DESC
    `
    
    return conversations.map((c: any) => ({
      ...c,
      tags: Array.isArray(c.tags) ? c.tags : [],
      unread_count: Number(c.unread_count || 0)
    }))
  } catch (error) {
    console.error("[v0] Error fetching conversations:", error)
    return []
  }
}

// 2. OBTENER LÍNEAS
async function getLines(rootOwnerId: string, allowedLineIds: string[]) {
  try {
    if (allowedLineIds.length === 0) return []

    const lines = await sql`
      SELECT 
        l.id, l.nombre, l.phone, l.status, l.chatbot_id,
        b.ai_mode,         
        b.ai_jefe_total    
      FROM lineas_whatsapp l
      LEFT JOIN chatbots b ON l.chatbot_id = b.id
      WHERE l.status = 'CONECTADA' 
        AND l."userId" = ${rootOwnerId}
        AND l.id = ANY(${allowedLineIds})
      ORDER BY l.nombre ASC
    `
    return lines
  } catch (error) {
    console.error("[v0] Error fetching lines:", error)
    return []
  }
}

// 3. OBTENER AGENTES
async function getAgents(rootOwnerId: string) {
  try {
    const agents = await sql`
      SELECT id, nombre as name, email 
      FROM usuarios 
      WHERE owner_id = ${rootOwnerId} 
         OR id = ${rootOwnerId}
      ORDER BY nombre ASC
    `
    return agents
  } catch (error) {
    console.error("[v0] Error fetching agents:", error)
    return []
  }
}

export default async function MessagesPage() {
  const user = await requireAuth()
  const rootOwnerId = user.rootOwnerId
  const allowedLineIds = user.permissions?.allowedLineIds || []
  
  // 🔥 CONSULTA SEGURA EN EL SERVIDOR
  const userQuery = await sql`SELECT addon_ecommerce FROM usuarios WHERE id = ${rootOwnerId}`;
  const tieneEcommerce = userQuery[0]?.addon_ecommerce || false;

  // LÓGICA DE OWNER vs AGENT
  let effectiveLineIds = allowedLineIds;
  
  if (user.role === 'OWNER') {
      try {
        const allLines = await sql`SELECT id FROM lineas_whatsapp WHERE "userId" = ${user.id}`;
        effectiveLineIds = allLines.map((l: any) => l.id);
      } catch (e) {
        effectiveLineIds = []
      }
  }

  if (effectiveLineIds.length === 0) effectiveLineIds = ['NO_LINES'];

  // CARGA PARALELA
  const [conversations, lines, agents] = await Promise.all([
    getConversations(rootOwnerId, effectiveLineIds),
    getLines(rootOwnerId, effectiveLineIds),
    getAgents(rootOwnerId)
  ])
  
  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <MessageCenter 
          initialConversations={conversations as any} 
          lines={lines as any} 
          userId={user.id} 
          agents={agents as any}
          // 🔥 ENVIAMOS AL COMPONENTE HIJO
          hasEcommerceAddon={tieneEcommerce}
      />
    </div>
  ) 
}