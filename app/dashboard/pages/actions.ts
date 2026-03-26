"use server"

import { neon } from "@neondatabase/serverless"
import { requireAuth } from "@/lib/auth-middleware"
import { revalidatePath } from "next/cache"
import { headers, cookies } from "next/headers"

const sql = neon(process.env.DATABASE_URL!)

// 🔒 LÍMITES POR PLAN
const PLAN_LIMITS = {
  'STARTER': 1,
  'PRO': 5,
  'AGENCY': 100
}

export async function getLandingsStats() {
 const user = await requireAuth({ requiredFeature: "pages" })
  const countResult = await sql`SELECT COUNT(*) as total FROM landings WHERE usuario_id = ${user.rootOwnerId}`
  const totalUsed = Number(countResult[0].total)
  const userPlan = user.permissions?.tier || 'STARTER' 
  // @ts-ignore
  const limit = PLAN_LIMITS[userPlan] || 1
  return { used: totalUsed, limit, planName: userPlan, isLimitReached: totalUsed >= limit }
}

export async function getLandings() {
 const user = await requireAuth({ requiredFeature: "pages" })
  return await sql`
    SELECT id, nombre, slug, activa, clics_boton as clicks, visitas, fecha_creacion, configuracion_json 
    FROM landings 
    WHERE usuario_id = ${user.rootOwnerId} 
    ORDER BY fecha_creacion DESC
  `
}

// 🔥 FUNCIÓN PARA SLUG ÚNICO (Optimizada)
async function ensureUniqueSlug(baseSlug: string, currentId?: string) {
    let slug = baseSlug
    let isUnique = false
    
    // Intentamos hasta encontrar uno libre
    while (!isUnique) {
        // Buscamos colisiones (excluyendo el propio ID si estamos editando)
       let existing;
        if (currentId) {
          existing = await sql`
            SELECT id FROM landings 
            WHERE slug = ${slug} AND id != ${currentId}
            LIMIT 1
          `;
        } else {
            existing = await sql`
                SELECT id FROM landings 
                WHERE slug = ${slug} 
                LIMIT 1
            `;
        }
        
        if (existing.length === 0) {
            isUnique = true
        } else {
            // Generamos sufijo aleatorio de 4 caracteres (ej: estetica-x9j2)
            const randomSuffix = Math.random().toString(36).substring(2, 6)
            slug = `${baseSlug}-${randomSuffix}`
        }
    }
    return slug
}

export async function saveLanding(data: any) {
  try {
   const user = await requireAuth({ requiredFeature: "pages" })

    // Validar límites
    if (!data.id) {
      const stats = await getLandingsStats()
      if (stats.isLimitReached) return { success: false, error: `Límite alcanzado.` }
    }

    const nombreFinal = data.title || data.nombre || "Nueva Landing"
    
    // 1. Limpieza del slug
    let baseSlug = data.slug || nombreFinal.toLowerCase()
    const cleanSlug = baseSlug.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')

    // 🔥 2. VERIFICACIÓN ESTRICTA (Sin auto-fix)
    // Verificamos si ya existe el slug en OTRO landing
    let existing;
    if (data.id) {
      existing = await sql`
        SELECT id FROM landings 
        WHERE slug = ${cleanSlug} AND id != ${data.id}
        LIMIT 1
      `;
    } else {
        existing = await sql`
            SELECT id FROM landings 
            WHERE slug = ${cleanSlug} 
            LIMIT 1
        `;
    }

  if (existing.length > 0) {
        return { success: false, error: "Esta URL ya está en uso. Por favor cámbiala." }
    }

    // 3. Preparar JSON
    const { id, title, nombre, slug, usuario_id, fecha_creacion, clics_boton, visitas, activa, ...jsonContent } = data

    if (!jsonContent.layoutOrder) jsonContent.layoutOrder = ["logo", "headline", "hero", "text", "button", "footer"]

    if (id) {
      // UPDATE
      await sql`
        UPDATE landings 
        SET nombre = ${nombreFinal}, 
            slug = ${cleanSlug}, -- Guardamos el slug limpio, tal cual lo mandó el usuario
            configuracion_json = ${jsonContent},
            activa = ${activa !== undefined ? activa : true},
            fecha_actualizacion = NOW()
        WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}
      `
    } else {
      // INSERT
      const newId = `land_${Date.now()}`
      await sql`
        INSERT INTO landings (id, nombre, slug, configuracion_json, usuario_id, activa, visitas, clics_boton)
        VALUES (${newId}, ${nombreFinal}, ${cleanSlug}, ${jsonContent}, ${user.rootOwnerId}, true, 0, 0)
      `
    }

    revalidatePath("/dashboard/pages")
    revalidatePath(`/dashboard/pages/edit/${id || ''}`)
    
    return { success: true }

  } catch (error: any) {
    console.error("Error saving landing:", error)
    // Manejo de error de clave duplicada (por si acaso pasa la verificación manual)
    if (error.code === '23505') return { success: false, error: "El SLUG ya existe." }
    return { success: false, error: `Error técnico: ${error.message}` }
  }
}

export async function deleteLanding(id: string) {
    try {
       const user = await requireAuth({ requiredFeature: "pages" })
        await sql`DELETE FROM landings WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}`
        revalidatePath("/dashboard/pages")
        return { success: true }
    } catch (e) { return { success: false, error: "Error al eliminar" } }
}

// 🔥🔥 TRACKING BLINDADO 🔥🔥

export async function trackLandingVisit(landingId: string) {
    try {
        const cookieStore = await cookies()
        const cookieName = `viewed_${landingId}`
        
        // 🛑 1. CHECK ANTI-SPAM
        const hasViewed = cookieStore.get(cookieName)
        if (hasViewed) {
            console.log(`[Visit Ignored] Cookie found for ${landingId}`)
            return // Salimos sin contar
        }

        const headersList = await headers()
        const userAgent = headersList.get("user-agent") || "Unknown"
        const referer = headersList.get("referer") || "Directo"
        
        // Detección Geo + Región
        const country = headersList.get("x-vercel-ip-country") || (process.env.NODE_ENV === 'development' ? 'AR' : 'Unknown')
        const region = headersList.get("x-vercel-ip-country-region") || "" 
        let cityRaw = headersList.get("x-vercel-ip-city") || (process.env.NODE_ENV === 'development' ? 'Mendoza' : 'Unknown')
        
        try { cityRaw = decodeURIComponent(cityRaw) } catch {}
        const city = region ? `${cityRaw} (${region})` : cityRaw

        // Detección Dispositivo
        const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
        const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent)
        let deviceType = "desktop"
        if (isTablet) deviceType = "tablet"
        else if (isMobile) deviceType = "mobile"

        // ✅ 2. GUARDAR VISITA
        await sql`
            INSERT INTO landing_analytics (landing_id, event_type, country, city, device_type, referrer, created_at)
            VALUES (${landingId}, 'visit', ${country}, ${city}, ${deviceType}, ${referer}, NOW())
        `
        await sql`UPDATE landings SET visitas = COALESCE(visitas, 0) + 1 WHERE id = ${landingId}`

        // 🍪 3. SET COOKIE (Configuración Robusta)
        // Usamos sameSite: 'lax' para asegurar que se guarde en navegaciones normales
        cookieStore.set(cookieName, 'true', { 
            maxAge: 60 * 60 * 24, // 24 horas
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/' 
        })
        console.log(`[Visit Counted] New visitor for ${landingId}`)

    } catch (e) {
        console.error("Error tracking visit:", e)
    }
}

export async function trackLandingClick(landingId: string) {
    try {
        const cookieStore = await cookies()
        const cookieName = `clicked_${landingId}`

        // 🛑 ANTI-SPAM CLICK
        if (cookieStore.get(cookieName)) {
             console.log(`[Click Ignored] Cookie found for ${landingId}`)
             return
        }

        const headersList = await headers()
        const userAgent = headersList.get("user-agent") || "Unknown"
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
        const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent)
        let deviceType = "desktop"
        if (isTablet) deviceType = "tablet"
        else if (isMobile) deviceType = "mobile"

        const country = headersList.get("x-vercel-ip-country") || (process.env.NODE_ENV === 'development' ? 'AR' : 'Unknown')

        await sql`
            INSERT INTO landing_analytics (landing_id, event_type, country, device_type, created_at)
            VALUES (${landingId}, 'click', ${country}, ${deviceType}, NOW())
        `
        await sql`UPDATE landings SET clics_boton = COALESCE(clics_boton, 0) + 1 WHERE id = ${landingId}`

        // 🍪 SET COOKIE
        cookieStore.set(cookieName, 'true', { 
            maxAge: 60 * 60 * 24, // 24 horas
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/' 
        })

    } catch (e) {
        console.error("Error tracking click:", e)
    }
}

export async function checkSlugAvailability(slug: string, currentId?: string) {
  try {
   const user = await requireAuth({ requiredFeature: "pages" })
    
    // 1. Limpieza estándar (igual que al guardar)
    const cleanSlug = slug.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
    
    if (!cleanSlug) return { available: false, error: "Slug vacío" }

    // 2. Buscamos si existe
   let existing;
    if (currentId) {
      existing = await sql`
        SELECT id FROM landings 
        WHERE slug = ${cleanSlug} AND id != ${currentId}
        LIMIT 1
      `;
    } else {
      existing = await sql`
            SELECT id FROM landings 
            WHERE slug = ${cleanSlug} 
            LIMIT 1
        `;
    }

    if (existing.length === 0) {
        return { available: true, slug: cleanSlug }
    } else {
        // 3. Si existe, generamos una sugerencia rápida
        // Intentamos con sufijos simples primero: -1, -2, -3 (más amigable que hash)
        let suggestedSlug = `${cleanSlug}-1`
        let isUnique = false
        let counter = 1

        // Loop rápido para encontrar el siguiente libre (limitado a 5 intentos simples)
        while (!isUnique && counter <= 5) {
            suggestedSlug = `${cleanSlug}-${counter}`
            const check = await sql`SELECT id FROM landings WHERE slug = ${suggestedSlug} LIMIT 1`
            if (check.length === 0) isUnique = true
            counter++
        }

        // Si sigue ocupado después de 5 intentos, usamos random
        if (!isUnique) {
             const random = Math.random().toString(36).substring(2, 6)
             suggestedSlug = `${cleanSlug}-${random}`
        }

        return { available: false, suggestion: suggestedSlug }
    }

  } catch (error) {
    return { available: false, error: "Error al verificar" }
  }
}
