"use server"

import { sql } from "@/lib/db"

export async function markConversationAsRead(lineId: string, conversationId: string) {
  try {
    const whatsappServerUrl = process.env.WHATSAPP_SERVER_URL
    const whatsappSecret = process.env.WHATSAPP_SECRET

    if (!whatsappServerUrl) return { success: false }

    const response = await fetch(`${whatsappServerUrl}/api/mark-read`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "x-api-secret": whatsappSecret || ""
        },
        body: JSON.stringify({ lineId, conversationId }),
        cache: 'no-store'
    })

    // 🔥 BLINDAJE CONTRA EL ERROR 429
    // Si la respuesta no es OK, leemos el texto para no romper el JSON.parse
    if (!response.ok) {
        const textError = await response.text(); // Leemos como texto, no json
        console.warn(`⚠️ No se pudo marcar leído (Status ${response.status}): ${textError.substring(0, 50)}...`)
        return { success: false, error: textError }
    }

    // Si es OK, intentamos parsear, pero con cuidado
    try {
        return await response.json()
    } catch (e) {
        return { success: true } // Si no hay JSON pero fue 200 OK, asumimos éxito
    }

  } catch (error) {
    // Error de red o similar
    console.error("Error action markRead:", error)
    return { success: false }
  }
}
