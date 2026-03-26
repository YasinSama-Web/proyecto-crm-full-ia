"use server"

import { neon } from "@neondatabase/serverless"
import { requireAuth } from "@/lib/auth-middleware"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

// --- TYPES ---
export interface SmartLink {
  id: string
  slug: string
  name: string
  destination_url: string
  clicks: number
  is_active: boolean
  created_at: string
}

export interface MarketingEvent {
  id: string
  event_id: string
  fuente: string
  estado: string
  valor: number
  created_at: string
}

// --- 1. SMART LINKS ---

export async function getSmartLinks() {
  const user = await requireAuth()
  
  // 🔥 CORRECCIÓN: Usamos SELECT * para traer 'name' y 'destination_url' tal cual están en la DB
  // sin alias en español.
  const links = await sql`
    SELECT * FROM marketing_links 
    WHERE owner_id = ${user.rootOwnerId} 
    ORDER BY created_at DESC
  `
  return links as unknown as SmartLink[]
}

function generateRandomSlug() {
  return Math.random().toString(36).substring(2, 8);
}

export async function createSmartLink(nombre: string, slug: string, url_destino: string) {
  try {
    const user = await requireAuth()

    if (!nombre || !url_destino) {
        return { success: false, error: "Faltan datos (Nombre o URL Destino)" }
    }

    let finalSlug = slug
    if (!finalSlug || finalSlug.trim() === "") {
        const cleanName = nombre.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 5);
        finalSlug = `${cleanName}-${generateRandomSlug()}`;
    }

    await sql`
      INSERT INTO marketing_links (
        id, 
        owner_id, 
        name, 
        slug,        
        destination_url,
        clicks, 
        is_active, 
        created_at
      )
      VALUES (
        ${`lnk_${Date.now()}_${generateRandomSlug()}`}, 
        ${user.rootOwnerId}, 
        ${nombre}, 
        ${finalSlug},    
        ${url_destino}, 
        0, 
        true, 
        NOW()
      )
    `

    revalidatePath("/dashboard/marketing")
    return { success: true }

  } catch (error: any) {
    console.error("Error creating smart link:", error)
    if (error.code === '23505') {
        return { success: false, error: "El nombre corto (slug) ya existe." }
    }
    return { success: false, error: `Error DB: ${error.message}` }
  }
}

export async function deleteSmartLink(id: string) {
  try {
    const user = await requireAuth()
    await sql`DELETE FROM marketing_links WHERE id = ${id} AND owner_id = ${user.rootOwnerId}`
    revalidatePath("/dashboard/marketing")
    return { success: true }
  } catch (e) { return { success: false } }
}

// --- 2. EVENTOS & TRACKING ---

export async function getMarketingEvents() {
  const user = await requireAuth()
  try {
      const events = await sql`
        SELECT * FROM marketing_events 
        WHERE owner_id = ${user.rootOwnerId} 
        ORDER BY created_at DESC 
        LIMIT 50
      `
      return events as unknown as MarketingEvent[]
  } catch (e) {
      return []
  }
}

export async function reportConversionCAPI(eventId: string, type: 'LEAD' | 'PURCHASE', value?: number) {
  try {
    const user = await requireAuth()
    revalidatePath("/dashboard/marketing")
    return { success: true }
  } catch (e) { return { success: false, error: "Error de conexión" } }
}

// --- 3. CONFIGURACIÓN DE PIXELES ---

export async function getPixelSettings() {
  const user = await requireAuth()
  try {
      // Intenta leer de 'usuarios'
      const result = await sql`SELECT marketing_settings_json FROM usuarios WHERE id = ${user.rootOwnerId}`
      const settings = result[0]?.marketing_settings_json || {}
      
      return {
        meta_pixel_id: settings.meta_pixel_id || "",
        meta_access_token: settings.meta_access_token || "",
        tiktok_pixel_id: settings.tiktok_pixel_id || "",
        tiktok_access_token: settings.tiktok_access_token || ""
      }
  } catch (e) {
      // Si falla, retornamos vacío para que no rompa la UI
      return { meta_pixel_id: "", meta_access_token: "", tiktok_pixel_id: "", tiktok_access_token: "" }
  }
}

export async function savePixelSettings(data: any) {
  try {
    const user = await requireAuth()
    
    // Obtener actual
    const result = await sql`SELECT marketing_settings_json FROM usuarios WHERE id = ${user.rootOwnerId}`
    const currentSettings = result[0]?.marketing_settings_json || {}
    const newSettings = { ...currentSettings, ...data }

    // Guardar
    await sql`UPDATE usuarios SET marketing_settings_json = ${newSettings} WHERE id = ${user.rootOwnerId}`
    
    revalidatePath("/dashboard/marketing")
    return { success: true }
  } catch (e) { return { success: false } }
}

export async function trackSmartLinkClick(linkId: string) {
  if (!linkId) return
  try {
    // Incrementamos el contador de forma atómica
    await sql`
      UPDATE marketing_links 
      SET clicks = clicks + 1 
      WHERE id = ${linkId}
    `
    return { success: true }
  } catch (error) {
    console.error("Error tracking smart link click:", error)
    return { success: false }
  }
}
