"use server"

import { neon } from "@neondatabase/serverless"
import { requireAuth } from "@/lib/auth-middleware"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

// --- TYPES ---
export interface Campaign {
  id: string
  name: string
  template: string
  status: 'draft' | 'running' | 'paused' | 'completed' | 'scheduled'
  audience_type: 'crm' | 'csv'
  filters: any
  total_targets: number
  sent_count: number
  failed_count: number
  created_at: string
  scheduled_at?: string
}

// --- OBTENER CAMPAÑAS ---
export async function getCampaigns() {
  const user = await requireAuth()
  const res = await sql`
    SELECT *
    FROM campaigns 
    WHERE owner_id = ${user.rootOwnerId} 
    ORDER BY created_at DESC
  `
  
  return res.map((c: any) => ({
      ...c,
      audience_type: c.filters?.audience_type || 'crm'
  })) as Campaign[]
}

// --- CREAR CAMPAÑA ---
export async function createCampaign(data: {
  name: string
  template: string
  audienceType: 'crm' | 'csv'
  filters?: any 
  csvTargets?: any[] 
  speedConfig: { min: number, max: number }
  status?: string          
  scheduledAt?: string | null     
}) {
  try {
    const user = await requireAuth()
    const id = `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    
    let totalTargets = 0

    // Calculamos el total de contactos
    if (data.audienceType === 'crm' && !data.csvTargets) {
      let query = sql`SELECT COUNT(*) as count FROM "Contact" WHERE usuario_id = ${user.rootOwnerId}`
      if (data.filters?.phonePrefix) {
        const prefix = `${data.filters.phonePrefix}%`
        query = sql`SELECT COUNT(*) as count FROM "Contact" WHERE usuario_id = ${user.rootOwnerId} AND phone LIKE ${prefix}`
      }
      const res = await query
      totalTargets = Number(res[0].count)
    } else {
      totalTargets = data.csvTargets?.length || 0
    }

    if (totalTargets === 0) {
      return { success: false, error: "No hay contactos que coincidan con los filtros seleccionados." }
    }

    // 💰 CANDADO DE DOBLE BILLETERA: Verificamos si hay créditos suficientes
    const creditCheck = await sql`
      SELECT COALESCE(mensajes_plan, 0) as plan, COALESCE(mensajes_extra, 0) as extra 
      FROM usuarios 
      WHERE id = ${user.rootOwnerId}
    `
    const availableCredits = Number(creditCheck[0].plan) + Number(creditCheck[0].extra)

    if (totalTargets > availableCredits) {
      return { 
        success: false, 
        error: `Créditos insuficientes. Intentas enviar a ${totalTargets} contactos, pero solo tienes ${availableCredits} mensajes disponibles.` 
      }
    }

    // Filtros + Línea + Fecha
    const filtersToSave = {
        audience_type: data.audienceType, 
        ...data.filters, 
        ...(data.csvTargets ? { targets: data.csvTargets } : {}),
        scheduledAt: data.scheduledAt 
    }

    const initialStatus = data.status || 'draft'

    // Insertamos la campaña
    await sql`
      INSERT INTO campaigns (
        id, name, template, status, scheduled_at, filters, total_targets, speed_config, owner_id, created_at
      )
      VALUES (
        ${id}, 
        ${data.name}, 
        ${data.template}, 
        ${initialStatus}, 
        ${data.scheduledAt || null},
        ${JSON.stringify(filtersToSave)}, 
        ${totalTargets}, 
        ${JSON.stringify(data.speedConfig)}, 
        ${user.rootOwnerId},
        NOW()
      )
    `

    revalidatePath("/dashboard/campaigns")
    return { success: true, id }
  } catch (error) {
    console.error("[CreateCampaign Error]", error)
    return { success: false, error: "Error de base de datos al crear campaña" }
  }
}

// --- OBTENER OBJETIVOS ---
export async function getCampaignTargets(campaignId: string) {
  const user = await requireAuth()
  
  const campRes = await sql`
    SELECT filters 
    FROM campaigns 
    WHERE id = ${campaignId} AND owner_id = ${user.rootOwnerId}
  `
  if (campRes.length === 0) return []
  
  const camp = campRes[0]
  const isCsvInternal = camp.filters.audience_type === 'csv' || camp.filters.targets;

  let targets = []

  if (isCsvInternal) {
    targets = (camp.filters.targets || []).map((t: any) => ({
      phone: t.number || t.phone, 
      name: t.name || "",
      vars: t 
    }))
  } else {
    let query = sql`SELECT phone, name FROM "Contact" WHERE usuario_id = ${user.rootOwnerId}`
    if (camp.filters?.phonePrefix) {
       const prefix = `${camp.filters.phonePrefix}%`
       query = sql`SELECT phone, name FROM "Contact" WHERE usuario_id = ${user.rootOwnerId} AND phone LIKE ${prefix}`
    }
    targets = await query
  }

  const logs = await sql`SELECT contact_phone FROM campaign_logs WHERE campaign_id = ${campaignId}`
  const sentPhones = new Set(logs.map((l: any) => l.contact_phone))

  return targets.filter((t: any) => !sentPhones.has(t.phone))
}

// --- REGISTRAR ENVÍO ---
export async function logCampaignSend(campaignId: string, phone: string, status: 'sent' | 'failed') {
  const user = await requireAuth()
  
  await sql`
    INSERT INTO campaign_logs (campaign_id, contact_phone, status, owner_id)
    VALUES (${campaignId}, ${phone}, ${status}, ${user.rootOwnerId})
  `

  if (status === 'sent') {
    await sql`UPDATE campaigns SET sent_count = COALESCE(sent_count, 0) + 1 WHERE id = ${campaignId}`

    // 💰 DESCUENTO INTELIGENTE: Restamos de la billetera del plan, si está vacía, restamos de los extra.
    await sql`
      UPDATE usuarios 
      SET 
        mensajes_extra = CASE 
          WHEN COALESCE(mensajes_plan, 0) <= 0 THEN GREATEST(0, COALESCE(mensajes_extra, 0) - 1)
          ELSE COALESCE(mensajes_extra, 0)
        END,
        mensajes_plan = GREATEST(0, COALESCE(mensajes_plan, 0) - 1)
      WHERE id = ${user.rootOwnerId}
    `
  } else {
    await sql`UPDATE campaigns SET failed_count = COALESCE(failed_count, 0) + 1 WHERE id = ${campaignId}`
  }

  revalidatePath("/dashboard/campaigns")
  return { success: true }
}

// --- ACTUALIZAR ESTADO ---
export async function updateCampaignStatus(campaignId: string, status: string) {
    const user = await requireAuth()
    await sql`
        UPDATE campaigns 
        SET status = ${status} 
        WHERE id = ${campaignId} AND owner_id = ${user.rootOwnerId}
    `
    revalidatePath("/dashboard/campaigns")
}

// --- ELIMINAR CAMPAÑA ---
export async function deleteCampaign(campaignId: string) {
    const user = await requireAuth()
    await sql`DELETE FROM campaign_logs WHERE campaign_id = ${campaignId}`
    await sql`DELETE FROM campaigns WHERE id = ${campaignId} AND owner_id = ${user.rootOwnerId}`
    revalidatePath("/dashboard/campaigns")
    return { success: true }
}

// --- UTILIDADES ---
export async function getConnectedLines() {
  const user = await requireAuth()
  try {
    const lines = await sql`SELECT * FROM lineas_whatsapp WHERE "userId" = ${user.rootOwnerId}`
    return lines
  } catch (error) {
    return []
  }
}

export async function getTagsWithCount() {
  const user = await requireAuth()
  const contacts = await sql`SELECT tags FROM "Contact" WHERE usuario_id = ${user.rootOwnerId}`
  const tagCounts: Record<string, number> = {}
  
  contacts.forEach((c: any) => {
    if (Array.isArray(c.tags)) {
      c.tags.forEach((tag: string) => { tagCounts[tag] = (tagCounts[tag] || 0) + 1 })
    }
  })
  return Object.entries(tagCounts).map(([tag, count]) => ({ tag, count }))
}

export async function getAllContactsForSelector() {
  const user = await requireAuth()
  return await sql`SELECT id, phone, name, tags, deal_value FROM "Contact" WHERE usuario_id = ${user.rootOwnerId} ORDER BY name ASC`
}

export async function saveCampaignMessageToChat(phone: string, content: string, lineId: string) {
    const user = await requireAuth()
    
    const conv = await sql`
        SELECT id FROM conversaciones 
        WHERE contact_phone = ${phone} AND usuario_id = ${user.rootOwnerId} AND "lineId" = ${lineId} LIMIT 1
    `
    
    let conversationId = ""
    
    if (conv.length > 0) {
        conversationId = conv[0].id
        await sql`UPDATE conversaciones SET last_activity = NOW() WHERE id = ${conversationId}`
    } else {
        const newConvId = `conv_${Date.now()}_${Math.random().toString(36).substr(2,5)}`
        await sql`
            INSERT INTO conversaciones (id, contact_phone, "lineId", usuario_id, last_activity, status, fecha_creacion)
            VALUES (${newConvId}, ${phone}, ${lineId}, ${user.rootOwnerId}, NOW(), 'OPEN', NOW())
        `
        conversationId = newConvId
    }

    await sql`
        INSERT INTO mensajes (conversation_id, content, type, is_incoming, timestamp, is_read, usuario_id)
        VALUES (${conversationId}, ${content}, 'text', false, NOW(), true, ${user.rootOwnerId})
    `
    return { success: true }
}
