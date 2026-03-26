import {
  DollarSign,
  MessageSquare,
  UserCheck,
  ClipboardList,
} from "lucide-react"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"
import { KpiCardWrapper } from "./kpi-card-wrapper"
import { ActivityFeed } from "./activity-feed"
import { TransactionsList } from "./transactions-list"

// 1. ESTADÍSTICAS GENERALES
async function getStats(rootOwnerId: string) {
  try {
    const [conversaciones, conversiones, ingresos] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM conversaciones WHERE usuario_id = ${rootOwnerId}`,
      sql`SELECT COUNT(*) as count FROM conversaciones WHERE is_conversion = true AND usuario_id = ${rootOwnerId}`,
      sql`SELECT COALESCE(SUM(amount), 0) as total FROM ventas WHERE usuario_id = ${rootOwnerId}`, // 🔥 Directo de ventas
    ])
    return { conversaciones: Number(conversaciones[0]?.count || 0), conversiones: Number(conversiones[0]?.count || 0), ingresos: Number(ingresos[0]?.total || 0) }
  } catch (error) { return { conversaciones: 0, conversiones: 0, ingresos: 0 } }
}

// 2. TAREAS PENDIENTES
async function getMyPendingTasks(userId: string) {
  try {
    const res = await sql`
      SELECT COUNT(*) as count FROM tasks 
      WHERE assigned_to = ${userId} AND is_completed = false
    `
    return Number(res[0]?.count || 0)
  } catch (error) {
    console.error("Error getTasks:", error);
    return 0
  }
}

// 3. ACTIVIDAD RECIENTE
// 3. ACTIVIDAD RECIENTE (Adaptado al nuevo motor SQL)
async function getRecentActivity(rootOwnerId: string, allowedLineIds: string[], isAgent: boolean) {
  try {
    if (isAgent && allowedLineIds.length === 0) return []

    // 🔥 Separamos la consulta en dos bloques limpios para que el nuevo parser 
    // no se confunda con condicionales anidados.
    
    if (isAgent) {
        // Consulta PARA AGENTES (con el filtro de lineId)
        return await sql`
            SELECT 
              m.id, m.content, m.type, m.timestamp, m.is_incoming, m.conversation_id,
              c.contact_name, c.contact_phone, c.status, 
              l.nombre as line_name, u.nombre as agent_name, co.tags
            FROM mensajes m
            JOIN conversaciones c ON m.conversation_id = c.id
            LEFT JOIN lineas_whatsapp l ON c."lineId" = l.id
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            LEFT JOIN "Contact" co ON c.contact_phone = co.phone AND co.usuario_id = ${rootOwnerId}
            
            WHERE m.id IN (
              SELECT DISTINCT ON (conversation_id) id
              FROM mensajes
              ORDER BY conversation_id, timestamp DESC
            )
            AND c.usuario_id = ${rootOwnerId}
            AND c.status != 'RESOLVED' 
            AND c."lineId" = ANY(${allowedLineIds})
            
            ORDER BY m.timestamp DESC
            LIMIT 5
        `
    } else {
        // Consulta PARA ADMINS (sin el filtro de lineId)
        return await sql`
            SELECT 
              m.id, m.content, m.type, m.timestamp, m.is_incoming, m.conversation_id,
              c.contact_name, c.contact_phone, c.status, 
              l.nombre as line_name, u.nombre as agent_name, co.tags
            FROM mensajes m
            JOIN conversaciones c ON m.conversation_id = c.id
            LEFT JOIN lineas_whatsapp l ON c."lineId" = l.id
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            LEFT JOIN "Contact" co ON c.contact_phone = co.phone AND co.usuario_id = ${rootOwnerId}
            
            WHERE m.id IN (
              SELECT DISTINCT ON (conversation_id) id
              FROM mensajes
              ORDER BY conversation_id, timestamp DESC
            )
            AND c.usuario_id = ${rootOwnerId}
            AND c.status != 'RESOLVED' 
            
            ORDER BY m.timestamp DESC
            LIMIT 5
        `
    }
  } catch (error) {
    console.error("Error getRecentActivity:", error);
    return []
  }
}

// 4. TRANSACCIONES RECIENTES
async function getRecentTransactions(rootOwnerId: string) {
  try {
    const transactions = await sql`
      SELECT 
        v.id, v.amount, v.created_at as timestamp, 
        c.name as contact_name, c.phone as contact_phone,
        (SELECT id FROM conversaciones WHERE contact_phone = c.phone AND usuario_id = ${rootOwnerId} LIMIT 1) as conversation_id
      FROM ventas v
      JOIN "Contact" c ON v.contact_id = c.id
      WHERE v.usuario_id = ${rootOwnerId} 
      ORDER BY v.created_at DESC LIMIT 5
    `
    return transactions
  } catch { return [] }
}

// 5. CONTEO DE EQUIPO
async function getTeamMemberCount(rootOwnerId: string) {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM usuarios WHERE owner_id = ${rootOwnerId} AND role = 'AGENT'`
    return Number(result[0]?.count || 0)
  } catch {
    return 0
  }
}

// --- COMPONENTE PRINCIPAL ---
export async function DashboardContent() {
  const user = await requireAuth()

  if (!user) return <div className="p-8 text-center text-red-500">No autorizado</div>

  const isAgent = user.role === "AGENT"
  const allowedLineIds = user.permissions?.allowedLineIds || []

  const [stats, recentActivity, recentTransactions, teamCount, myTasksCount] = await Promise.all([
    !isAgent ? getStats(user.rootOwnerId) : { conversaciones: 0, conversiones: 0, ingresos: 0 },
    getRecentActivity(user.rootOwnerId, allowedLineIds, isAgent),
    !isAgent ? getRecentTransactions(user.rootOwnerId) : [],
    !isAgent ? getTeamMemberCount(user.rootOwnerId) : 0,
    getMyPendingTasks(user.id), 
  ])

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

return (
    // 🔥 LIMPIEZA: Quitamos el 'bg-...' y el 'p-6' de aquí porque ya están en el padre.
    // Solo dejamos space-y-8 para separar los elementos.
    <div className="space-y-8"> 
      
      <KpiCardWrapper 
        userName={user.nombre || "Usuario"} 
        today={today} 
        isAgent={isAgent}
        stats={{
            ingresos: stats.ingresos,
            conversaciones: stats.conversaciones,
            tareas: myTasksCount,
            equipo: teamCount
        }}
      />

      <div className={`grid gap-6 ${!isAgent ? "lg:grid-cols-5" : "lg:grid-cols-1"}`}>
        <div className={!isAgent ? "lg:col-span-3" : "lg:col-span-1"}>
            <ActivityFeed recentActivity={recentActivity as any} isAgent={isAgent} />
        </div>

        {!isAgent && (
             <div className="lg:col-span-2">
                <TransactionsList recentPayments={recentTransactions as any} />
             </div>
        )}
      </div>
    </div>
  )
}
