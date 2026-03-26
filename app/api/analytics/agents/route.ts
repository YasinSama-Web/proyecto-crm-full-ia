import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth({ requiredFeature: "analytics" });
    const rootId = user.rootOwnerId;

    // 🔥 LA MEGA-CONSULTA DE RENDIMIENTO (Corregida)
    const performanceData = await sql`
      SELECT 
          u.id as agent_id,
          u.nombre as agent_name,
          u.email as agent_email,
          
          -- Métricas de Conversaciones
          COUNT(DISTINCT c.id) as total_chats,
          COUNT(DISTINCT CASE WHEN c.status = 'OPEN' OR c.status = 'PENDING' THEN c.id END) as chats_pendientes,
          COUNT(DISTINCT CASE WHEN c.status = 'CLOSED' OR c.status = 'RESOLVED' THEN c.id END) as chats_resueltos,
          
          -- Métricas de Mensajes (Solo los que el agente envió)
          (
            SELECT COUNT(m.id) 
            FROM mensajes m 
            WHERE m.usuario_id = u.id 
            AND m.is_incoming = false 
            AND m.type != 'system'
          ) as mensajes_enviados

      FROM usuarios u
      LEFT JOIN conversaciones c ON c.assigned_to = u.id AND c.usuario_id = ${rootId}
      -- 🔥 AQUÍ ESTABA EL ERROR: Tu base de datos usa owner_id, no rootOwnerId
      WHERE u.owner_id = ${rootId} AND u.role != 'OWNER'
      GROUP BY u.id, u.nombre, u.email
      ORDER BY chats_resueltos DESC
    `;

    return NextResponse.json(performanceData);
  } catch (error) {
    console.error("[AGENT_ANALYTICS_ERROR]", error);
    return NextResponse.json({ error: "Error obteniendo analíticas de agentes" }, { status: 500 });
  }
}
