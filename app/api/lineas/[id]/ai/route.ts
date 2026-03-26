import { NextResponse } from "next/server"
import { sql } from "@/lib/db" // Ajusta la ruta a tu lib de base de datos
import { requireAuth } from "@/lib/auth-middleware"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request)
    const { id } = await params

    const result = await sql`
      SELECT ai_mode, ai_prompt, ai_knowledge 
      FROM lineas_whatsapp 
      WHERE id = ${id} AND "userId" = ${user.rootOwnerId}
    `
    if (result.length === 0) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 })

    return NextResponse.json(result[0])
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()

    const { ai_mode, ai_prompt, ai_knowledge } = body

    const result = await sql`
      UPDATE lineas_whatsapp
      SET 
        ai_mode = ${ai_mode},
        ai_prompt = ${ai_prompt},
        ai_knowledge = ${ai_knowledge}
      WHERE id = ${id} AND "userId" = ${user.rootOwnerId}
      RETURNING ai_mode, ai_prompt, ai_knowledge
    `

    if (result.length === 0) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 })

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error guardando config IA:", error)
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
  }
}
