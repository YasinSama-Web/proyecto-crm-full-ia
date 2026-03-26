import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req)
    
    // Solo Dueños o Admins deberían ver esto
    if (user.role !== 'OWNER' && user.permissions?.tier !== 'ADMIN') {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") || "7d" // today, yesterday, 7d, 30d, all

    // 1. Total gastado en el período
    // Usamos u.owner_id en vez de u."rootOwnerId" y pasamos el filtro de fecha directo al WHERE
    const totalQuery = await sql`
        SELECT COALESCE(SUM(credits_cost), 0) as total
        FROM ia_usage_logs l
        JOIN usuarios u ON l.usuario_id = u.id
        WHERE (u.id = ${user.rootOwnerId} OR u.owner_id = ${user.rootOwnerId})
        AND (
            (${range} = 'today' AND l.created_at >= CURRENT_DATE) OR
            (${range} = 'yesterday' AND l.created_at >= CURRENT_DATE - INTERVAL '1 day' AND l.created_at < CURRENT_DATE) OR
            (${range} = '7d' AND l.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
            (${range} = '30d' AND l.created_at >= CURRENT_DATE - INTERVAL '30 days') OR
            (${range} = 'all')
        )
    `
    const totalCredits = Number(totalQuery[0]?.total || 0)

    // 2. Gasto agrupado por Función (Feature)
    const byFeature = await sql`
        SELECT feature, COALESCE(SUM(credits_cost), 0) as total
        FROM ia_usage_logs l
        JOIN usuarios u ON l.usuario_id = u.id
        WHERE (u.id = ${user.rootOwnerId} OR u.owner_id = ${user.rootOwnerId})
        AND (
            (${range} = 'today' AND l.created_at >= CURRENT_DATE) OR
            (${range} = 'yesterday' AND l.created_at >= CURRENT_DATE - INTERVAL '1 day' AND l.created_at < CURRENT_DATE) OR
            (${range} = '7d' AND l.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
            (${range} = '30d' AND l.created_at >= CURRENT_DATE - INTERVAL '30 days') OR
            (${range} = 'all')
        )
        GROUP BY feature
    `

    // 3. Gráfico de evolución diaria (Timeline)
    const timeline = await sql`
        SELECT TO_CHAR(l.created_at, 'DD/MM') as date, COALESCE(SUM(credits_cost), 0) as cost
        FROM ia_usage_logs l
        JOIN usuarios u ON l.usuario_id = u.id
        WHERE (u.id = ${user.rootOwnerId} OR u.owner_id = ${user.rootOwnerId})
        AND (
            (${range} = 'today' AND l.created_at >= CURRENT_DATE) OR
            (${range} = 'yesterday' AND l.created_at >= CURRENT_DATE - INTERVAL '1 day' AND l.created_at < CURRENT_DATE) OR
            (${range} = '7d' AND l.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
            (${range} = '30d' AND l.created_at >= CURRENT_DATE - INTERVAL '30 days') OR
            (${range} = 'all')
        )
        GROUP BY TO_CHAR(l.created_at, 'DD/MM'), DATE(l.created_at)
        ORDER BY DATE(l.created_at) ASC
    `

    // 4. Últimos registros para la tabla
    const recentLogs = await sql`
        SELECT l.id, l.feature, l.credits_cost, l.details, l.created_at, u.nombre as agent_name
        FROM ia_usage_logs l
        JOIN usuarios u ON l.usuario_id = u.id
        WHERE (u.id = ${user.rootOwnerId} OR u.owner_id = ${user.rootOwnerId})
        AND (
            (${range} = 'today' AND l.created_at >= CURRENT_DATE) OR
            (${range} = 'yesterday' AND l.created_at >= CURRENT_DATE - INTERVAL '1 day' AND l.created_at < CURRENT_DATE) OR
            (${range} = '7d' AND l.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
            (${range} = '30d' AND l.created_at >= CURRENT_DATE - INTERVAL '30 days') OR
            (${range} = 'all')
        )
        ORDER BY l.created_at DESC
        LIMIT 15
    `

    return NextResponse.json({
        totalCredits,
        byFeature: byFeature.map(f => ({ name: f.feature, value: Number(f.total) })),
        timeline,
        recentLogs
    })

  } catch (error) {
    console.error("Error en AI Audit:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
