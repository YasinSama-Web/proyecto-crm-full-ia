import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth({ ownerOrAdmin: true })
    // 🔥 CORRECCIÓN NEXT.JS: params debe ser await
    const { id } = await context.params

    const result = await sql`
      DELETE FROM omni_channels 
      WHERE id = ${id} AND "userId" = ${user.rootOwnerId}
      RETURNING id
    `

    if (result.length === 0) {
        return NextResponse.json({ error: "No se pudo eliminar: El canal no existe o no te pertenece." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error eliminando canal omni:", error)
    return NextResponse.json({ error: "Error al eliminar canal" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    console.log("🟢 INICIANDO PATCH OMNI-CHANNELS")
    const user = await requireAuth({ ownerOrAdmin: true })
    
    // 🔥 CORRECCIÓN NEXT.JS: params debe ser await
    const { id } = await context.params
    const body = await req.json()
    const { name, chatbot_id } = body

    console.log(`Intentando guardar Bot ID: ${chatbot_id} en el canal: ${id}`)

    // 🔥 ACTUALIZACIÓN EN NEON/PRISMA
    const result = await sql`
      UPDATE omni_channels 
      SET name = COALESCE(${name}, name), 
          chatbot_id = ${chatbot_id !== undefined && chatbot_id !== 'none' ? chatbot_id : null}
      WHERE id = ${id} AND "userId" = ${user.rootOwnerId}
      RETURNING *
    `

    if (result.length === 0) {
        console.log("❌ No se encontró el canal para actualizar");
        return NextResponse.json({ error: "Canal no encontrado" }, { status: 404 })
    }

    console.log("✅ Canal actualizado en BD:", result[0])

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error: any) {
    console.error("❌ Error actualizando canal omni:", error)
    return NextResponse.json({ error: "Error al actualizar canal" }, { status: 500 })
  }
}