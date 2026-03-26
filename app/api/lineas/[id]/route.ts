import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth({ ownerOrAdmin: true })
    const { id } = await params
    const lineId = id

    if (!lineId || typeof lineId !== "string") {
      return NextResponse.json({ error: "Invalid line ID" }, { status: 400 })
    }

    const whatsappServerUrl = process.env.WHATSAPP_SERVER_URL
    const whatsappSecret = process.env.WHATSAPP_SECRET

    if (whatsappServerUrl) {
        try {
            await fetch(`${whatsappServerUrl}/api/lineas/logout`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-api-secret": whatsappSecret || ""
                },
                body: JSON.stringify({ lineId })
            });
        } catch (e) {
            console.error("⚠️ No se pudo contactar a Railway para logout.", e)
        }
    }

    await sql`
      UPDATE lineas_whatsapp 
      SET 
        status = 'DESCONECTADA', 
        is_archived = true 
      WHERE id = ${lineId} AND "userId" = ${user.rootOwnerId}
    `
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error archiving line:", error)
    return NextResponse.json({ error: "Error archiving line" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log("=== 🛠️ INICIANDO ACTUALIZACIÓN DE LÍNEA ===");
    
    const user = await requireAuth({ ownerOrAdmin: true })
    console.log("👤 Usuario validado:", user.email, "| Root ID:", user.rootOwnerId);

    const { id } = await params
    const lineId = id
    console.log("📱 ID de la línea a editar:", lineId);

    if (!lineId || typeof lineId !== "string") {
      return NextResponse.json({ error: "Invalid line ID" }, { status: 400 })
    }

    const body = await request.json()
    console.log("📦 Payload recibido desde el Frontend:", body);

    const status = body.status ?? null;
    const phone = body.phone ?? null;
    const nombre = body.nombre ?? null;

    let result;

    // Ejecutamos el SQL y capturamos cualquier queja de Postgres
 try {
      if (body.chatbot_id === null) {
          console.log("🤖 Acción: Quitar bot (Seteando a NULL)");
          result = await sql`
            UPDATE lineas_whatsapp 
            SET 
              status = COALESCE(${status}, status),
              phone = COALESCE(${phone}, phone),
              nombre = COALESCE(${nombre}, nombre),
              chatbot_id = NULL
            WHERE id = ${lineId} AND "userId" = ${user.rootOwnerId}
            RETURNING *
          `
      } else if (body.chatbot_id !== undefined) {
          console.log("🤖 Acción: Asignar bot ID ->", body.chatbot_id);
          result = await sql`
            UPDATE lineas_whatsapp 
            SET 
              status = COALESCE(${status}, status),
              phone = COALESCE(${phone}, phone),
              nombre = COALESCE(${nombre}, nombre),
              chatbot_id = ${body.chatbot_id}
            WHERE id = ${lineId} AND "userId" = ${user.rootOwnerId}
            RETURNING *
          `
      } else {
          console.log("🤖 Acción: Actualización simple (Sin tocar el bot)");
          result = await sql`
            UPDATE lineas_whatsapp 
            SET 
              status = COALESCE(${status}, status),
              phone = COALESCE(${phone}, phone),
              nombre = COALESCE(${nombre}, nombre)
            WHERE id = ${lineId} AND "userId" = ${user.rootOwnerId}
            RETURNING *
          `
      }
    } catch (sqlError: any) {
      console.error("💥 ERROR SQL CRÍTICO:", sqlError);
      return NextResponse.json({ error: "Error en base de datos", details: sqlError.message }, { status: 500 })
    }

    console.log("✅ Filas afectadas:", result.length);

    if (result.length === 0) {
      console.log("⚠️ No se encontró la línea o no pertenece a este rootOwnerId");
      // Sospecha: Tu tabla original quizás usaba "userId" en lugar de ""userId"".
      return NextResponse.json({ error: "Line not found or unauthorized. Revisa si el dueño coincide." }, { status: 404 })
    }

    console.log("🎉 Línea actualizada con éxito");
    return NextResponse.json(result[0])
  } catch (error: any) {
    console.error("💥 ERROR GENERAL:", error)
    return NextResponse.json({ error: "Error updating line", details: error.message }, { status: 500 })
  }
}
