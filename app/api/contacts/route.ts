import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth({ requiredFeature: "contacts" });

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const tag = searchParams.get("tag") || ""
    const phone = searchParams.get("phone") || ""
    const mode = searchParams.get("mode") || ""
    const rootOwnerId = user.rootOwnerId

    let contacts

    // 🔥 PRIORIDAD 1: BÚSQUEDA EXACTA POR TELÉFONO (El que faltaba)
    // Esto es VITAL para que el panel derecho encuentre el ID al vuelo
    if (phone) {
        contacts = await sql`
            SELECT id, phone, name, tags, pipeline_stage_id, notes, deal_value
            FROM "Contact"
            WHERE usuario_id = ${rootOwnerId} AND phone = ${phone}
            LIMIT 1
        `
        return NextResponse.json(contacts)
    }

    // 🔥 PRIORIDAD 0: MODO SELECTOR (Para Modales de Ventas y Campañas)
    else if (mode === "selector") {
        contacts = await sql`
            SELECT id, phone, name, tags
            FROM "Contact"
            WHERE usuario_id = ${rootOwnerId}
              AND is_group = false
              AND LENGTH(phone) < 20 -- Aumentado a 20 para admitir números internacionales
            ORDER BY last_message DESC NULLS LAST, created_at DESC
            LIMIT 500
        `
        return NextResponse.json(contacts)
    }
    
    // 🔥 PRIORIDAD 2: Búsqueda por texto y tag
    else if (search && tag) {
      contacts = await sql`
        SELECT id, phone, name, created_at, last_message, tags, notes, is_group, deal_value, pipeline_stage_id
        FROM "Contact"
        WHERE usuario_id = ${rootOwnerId}
          AND is_group = false 
          AND LENGTH(phone) < 20
          AND (name ILIKE ${"%" + search + "%"} OR phone ILIKE ${"%" + search + "%"})
          AND ${tag} = ANY(tags)
        ORDER BY last_message DESC NULLS LAST, created_at DESC
      `
    } 
    // 🔥 PRIORIDAD 3: Solo búsqueda por texto
    else if (search) {
      contacts = await sql`
        SELECT id, phone, name, created_at, last_message, tags, notes, is_group, deal_value, pipeline_stage_id
        FROM "Contact"
        WHERE usuario_id = ${rootOwnerId}
          AND is_group = false
          AND LENGTH(phone) < 20
          AND (name ILIKE ${"%" + search + "%"} OR phone ILIKE ${"%" + search + "%"})
        ORDER BY last_message DESC NULLS LAST, created_at DESC
      `
    } 
    // 🔥 PRIORIDAD 4: Solo filtro por tag
    else if (tag) {
      contacts = await sql`
        SELECT id, phone, name, created_at, last_message, tags, notes, is_group, deal_value, pipeline_stage_id
        FROM "Contact"
        WHERE usuario_id = ${rootOwnerId}
          AND is_group = false
          AND LENGTH(phone) < 20
          AND ${tag} = ANY(tags)
        ORDER BY last_message DESC NULLS LAST, created_at DESC
      `
    } 
    // 🔥 PRIORIDAD 5: Traer todos (Default)
    else {
      contacts = await sql`
        SELECT id, phone, name, created_at, last_message, tags, notes, is_group, deal_value, pipeline_stage_id
        FROM "Contact"
        WHERE usuario_id = ${rootOwnerId}
          AND is_group = false
          AND LENGTH(phone) < 20
        ORDER BY last_message DESC NULLS LAST, created_at DESC
      `
    }

    return NextResponse.json(contacts)
  } catch (error) {
    console.error("[v0] Error fetching contacts:", error)
    return NextResponse.json({ error: "Error fetching contacts" }, { status: 500 })
  }
}
