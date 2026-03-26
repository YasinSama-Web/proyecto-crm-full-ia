import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request)
    const { id } = await params

    // 🔥 Agregamos todas las nuevas columnas al SELECT
    const result = await sql`
      SELECT 
        ai_mode, 
        ai_prompt, 
        ai_knowledge,
        ai_auto_wakeup,
        ai_bot_tone,
        ai_auto_followup,
        ai_auto_archive,
        ai_intent_stage,
        ai_escalate_human,
        ai_transcribe_audio,
        ai_jefe_total,
        ai_auto_receipt,
        ai_datos_bancarios
        
      FROM chatbots 
      WHERE id = ${id} AND usuario_id = ${user.rootOwnerId} 
    `
    if (result.length === 0) return NextResponse.json({ error: "Chatbot no encontrado" }, { status: 404 })

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

    // 🔥 Extraemos TODOS los campos que nos envía AIBotSettings.tsx
    const { 
      ai_mode, 
      ai_prompt, 
      ai_knowledge,
      ai_auto_wakeup,
      ai_bot_tone,
      ai_auto_followup,
      ai_auto_archive,
      ai_intent_stage,
      ai_escalate_human,
      ai_transcribe_audio,
      ai_jefe_total,
      ai_auto_receipt,
      ai_datos_bancarios
    } = body

    // 🔥 Actualizamos la base de datos con los nuevos valores
    const result = await sql`
      UPDATE chatbots
      SET 
        ai_mode = ${ai_mode},
        ai_prompt = ${ai_prompt},
        ai_knowledge = ${ai_knowledge},
        ai_auto_wakeup = ${ai_auto_wakeup},
        ai_bot_tone = ${ai_bot_tone},
        ai_auto_followup = ${ai_auto_followup},
        ai_auto_archive = ${ai_auto_archive},
        ai_intent_stage = ${ai_intent_stage},
        ai_escalate_human = ${ai_escalate_human},
        ai_transcribe_audio = ${ai_transcribe_audio},
        ai_jefe_total = ${ai_jefe_total},
        ai_auto_receipt = ${ai_auto_receipt},
        ai_datos_bancarios = ${ai_datos_bancarios}
      WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}
      RETURNING *
    `
    // Nota: Usé RETURNING * para que devuelva todo actualizado y el código quede más limpio.

    if (result.length === 0) return NextResponse.json({ error: "Chatbot no encontrado" }, { status: 404 })

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error guardando config IA:", error)
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
  }
}
