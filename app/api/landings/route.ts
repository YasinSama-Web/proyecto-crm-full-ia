import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

// GET: Trae solo las landings del equipo (rootOwnerId)
export async function GET(request: NextRequest) {
  try {
    // 🔥 1. BLOQUEAMOS EL ACCESO AL GET
    const user = await requireAuth({ requiredFeature: "pages" })
    const rootId = user.rootOwnerId; // 🔥 Usamos rootOwnerId para ver lo de todo el equipo

    const landings = await sql`
      SELECT * FROM landings 
      WHERE usuario_id = ${rootId} 
      ORDER BY fecha_creacion DESC
    `
    return NextResponse.json(landings)
  } catch (error) {
    console.error("Error fetching landings:", error)
    return NextResponse.json({ error: "Error fetching landings o sin permisos" }, { status: 500 })
  }
}

// POST: Crea una landing asignada al equipo (rootOwnerId)
export async function POST(request: NextRequest) {
  try {
    // 🔥 2. BLOQUEAMOS EL ACCESO AL POST
    const user = await requireAuth({ requiredFeature: "landings" })
    const rootId = user.rootOwnerId; // 🔥 Todo se guarda bajo la cuenta del dueño

    const { nombre, slug } = await request.json()

    if (!nombre || !slug) {
      return NextResponse.json({ error: "Nombre y slug son requeridos" }, { status: 400 })
    }

    const existing = await sql`
      SELECT id FROM landings 
      WHERE slug = ${slug} AND usuario_id = ${rootId}
    `
    
    if (existing.length > 0) {
      return NextResponse.json({ error: "Ya tienes una landing con este slug" }, { status: 400 })
    }

    // Configuración inicial visual
    const defaultConfig = {
      titulo: nombre,
      subtitulo: "Subtítulo descriptivo de tu oferta",
      descripcion: "Descripción detallada de lo que ofreces a tus clientes.",
      color_primario: "#22c55e",
      color_fondo: "#ffffff",
      imagen_hero: "",
      whatsapp_numero: "",
      whatsapp_mensaje: "Hola! Me interesa tu oferta",
      meta_pixel_id: "",
      boton_texto: "Contactar por WhatsApp",
    }

    const result = await sql`
      INSERT INTO landings (usuario_id, nombre, slug, configuracion_json)
      VALUES (${rootId}, ${nombre}, ${slug}, ${JSON.stringify(defaultConfig)})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error: any) {
    console.error("Error creating landing:", error)
    return NextResponse.json({ error: error.message || "Error creating landing" }, { status: 500 })
  }
}
