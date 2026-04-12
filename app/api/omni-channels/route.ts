import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth({ ownerOrAdmin: true })
    const body = await req.json()
    const { platform, name, token } = body

    if (!platform || !name || !token) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Generamos un ID único seguro (ej: ch_telegram_123abc)
    const newId = `ch_${platform}_${Math.random().toString(36).substring(2, 10)}`

    const result = await sql`
      INSERT INTO omni_channels (id, "userId", platform, name, token, status, fecha_creacion)
      VALUES (${newId}, ${user.rootOwnerId}, ${platform}, ${name}, ${token}, 'ACTIVE', NOW())
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error: any) {
    console.error("Error creando canal omni:", error)
    return NextResponse.json({ error: "Error al crear canal" }, { status: 500 })
  }
}