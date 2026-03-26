"use server"

import { neon } from "@neondatabase/serverless"
import { requireAuth } from "@/lib/auth-middleware"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

export async function guardarWebhookUrl(eventType: string, url: string, isActive: boolean = true) {
  try {
    const user = await requireAuth()
    
    // 1. Verificamos si ya existe una conexión para este tipo de evento
    const existente = await sql`
      SELECT id FROM webhooks 
      WHERE owner_id = ${user.rootOwnerId} AND event_type = ${eventType} 
      LIMIT 1
    `

    if (existente.length > 0) {
      // 2. Si existe, lo actualizamos con la nueva URL
      await sql`
        UPDATE webhooks 
        SET url = ${url}, is_active = ${isActive} 
        WHERE id = ${existente[0].id}
      `
    } else {
      // 3. Si no existe, creamos uno nuevo
      await sql`
        INSERT INTO webhooks (owner_id, url, event_type, is_active)
        VALUES (${user.rootOwnerId}, ${url}, ${eventType}, ${isActive})
      `
    }

    // Refrescamos la ruta para que los cambios se apliquen
    revalidatePath("/dashboard/integrations")
    return { success: true }

  } catch (error) {
    console.error("Error al guardar webhook:", error)
    return { success: false, error: "No se pudo guardar la integración" }
  }
}

// En tu archivo actions.ts (al final)

export async function obtenerWebhooksActivos() {
  try {
    const user = await requireAuth()
    
    // Buscamos todas las apps que el usuario conectó
    const webhooks = await sql`
      SELECT event_type 
      FROM webhooks 
      WHERE owner_id = ${user.rootOwnerId} AND is_active = true
    `
    
    // Devolvemos solo un array con los nombres (ej: ['gcalendar', 'hubspot'])
    return { success: true, conectadas: webhooks.map(w => w.event_type) }
  } catch (error) {
    console.error("Error al obtener webhooks:", error)
    return { success: false, conectadas: [] }
  }
}
