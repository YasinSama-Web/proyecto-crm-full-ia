import { requireAuth } from "@/lib/auth-middleware"
import { sql } from "@/lib/db"
import { TeamManagement } from "@/components/dashboard/team-management"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function TeamPage() {
  const user = await requireAuth({ ownerOrAdmin: true })

  const isOwner = user.role === "OWNER"
  const isAdmin = user.role === "AGENT" && user.permissions?.tier === "ADMIN"

  if (!isOwner && !isAdmin) {
    redirect("/dashboard?error=unauthorized")
  }

  const ownerId = user.rootOwnerId

  // 🔥 1. Traemos la info del Dueño (Saldo de IA, Plan y Extras de Equipo)
  const ownerData = await sql`
    SELECT ia_credits, ia_credits_extra, plan, agentes_extra 
    FROM usuarios 
    WHERE id = ${ownerId} 
    LIMIT 1
  `
  const ownerRecord = ownerData[0] || {}
  const ownerCredits = Number(ownerRecord.ia_credits || 0) + Number(ownerRecord.ia_credits_extra || 0)
  
  // 🔥 MATEMÁTICA DE LÍMITES PARA AGENTES
  const plan = (ownerRecord.plan || "STARTER").toUpperCase()
  const agentesExtra = ownerRecord.agentes_extra || 0
  const baseAgents = plan === 'ENTERPRISE' ? 9999 : plan === 'PRO' ? 8 : 1
  const limit = baseAgents + agentesExtra

  // 🔥 2. Traemos a los agentes, líneas y analíticas
  const [agents, lines, analyticsQuery] = await Promise.all([
    sql`
      SELECT 
        u.id, u.nombre, u.email, u.fecha_creacion, u.role, 
        u.permissions, u.ia_credits, u.ia_credits_extra, u.last_active_at,
        (SELECT COUNT(*)::int FROM conversaciones c WHERE c.usuario_id = u.id AND c.status = 'OPEN') as chats_activos
      FROM usuarios u
      WHERE u.owner_id = ${ownerId} AND u.role = 'AGENT' AND u.id != ${ownerId}
      ORDER BY u.fecha_creacion DESC
    `,
    sql`SELECT id, nombre, phone, status FROM lineas_whatsapp WHERE "userId" = ${ownerId} AND status = 'CONECTADA'`,
    
    sql`
      SELECT 
        u.id as user_id,
        u.nombre as agente,
        (SELECT COUNT(*)::int FROM conversaciones c WHERE c.usuario_id = u.id) as leads,
        (SELECT COUNT(*)::int FROM ventas v WHERE v.usuario_id = u.id) as ventas,
        COALESCE((SELECT SUM(amount) FROM ventas v WHERE v.usuario_id = u.id), 0)::float as facturado,
        COALESCE(u.mensajes_ia, 0)::int as ia_usados,
        COALESCE((
          SELECT EXTRACT(EPOCH FROM AVG(m.timestamp - c.fecha_creacion))/60
          FROM mensajes m JOIN conversaciones c ON m.conversation_id = c.id
          WHERE m.usuario_id = u.id AND m.is_incoming = false
        ), 0)::int as tiempo_resp_min
      FROM usuarios u
      WHERE u.owner_id = ${ownerId} AND u.role = 'AGENT' AND u.id != ${ownerId}
    `
  ])

  // Lógica de límites
  const used = agents.length
  const isLimitReached = plan !== 'ENTERPRISE' && used >= limit

  // Procesamos los datos analíticos
  const realAnalyticsData = analyticsQuery.map(row => {
    let efectividad = 0;
    if (row.leads > 0) efectividad = Math.round((row.ventas / row.leads) * 100);
    else if (row.ventas > 0) efectividad = 100;

    return {
      name: row.agente, // 👈 Cambiado a 'name' para que el gráfico (Recharts) lo lea bien
      leads: row.leads,
      ventas: row.ventas,
      facturado: row.facturado,
      efectividad: efectividad,
      ia_usados: row.ia_usados,
      tiempo_resp_min: row.tiempo_resp_min
    }
  })

  return (
    <div className="p-6">
      <TeamManagement 
        agents={agents as any} 
        ownerId={ownerId} 
        whatsappLines={lines as any} 
        ownerCredits={ownerCredits}
        realSalesData={realAnalyticsData} 
        
        // 🔥 NUEVOS PROPS
        usedAgents={used}
        limitAgents={limit}
        isLimitReached={isLimitReached}
        plan={plan}
      />
    </div>
  )
}
