import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const lines = await sql`
      SELECT * FROM lineas_whatsapp 
      WHERE "userId" = ${user.id}
      AND (is_archived = false OR is_archived IS NULL)
      ORDER BY fecha_creacion DESC
    `
    return NextResponse.json(lines)
  } catch (error) {
    console.error("[v0] Error fetching lines:", error)
    return NextResponse.json({ error: "Failed to fetch lines" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth({ ownerOrAdmin: true });
    const body = await req.json()
    const { phone, nombre } = body

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 })
    }

    const cleanPhone = phone.trim()
    const lineName = nombre?.trim() || `Línea ${cleanPhone}`

    console.log("[POST Line] Intentando crear/restaurar:", cleanPhone)

    // 1. PASO INTELIGENTE: Verificamos si ya existe antes de insertar
    const existingLine = await sql`
        SELECT * FROM lineas_whatsapp 
        WHERE phone = ${cleanPhone} 
        LIMIT 1
    `

    // A. ESCENARIO: La línea ya existe en la Base de Datos
    if (existingLine.length > 0) {
        const line = existingLine[0]

        // Caso 1: Existe y está ARCHIVADA (Es un "Zombie") 🧟‍♂️ -> ¡LA REVIVIMOS!
        if (line.is_archived) {
            console.log(`♻️ Restaurando línea archivada: ${cleanPhone}`)
            
            const restoredLine = await sql`
                UPDATE lineas_whatsapp
                SET 
                    is_archived = false,      -- La hacemos visible de nuevo
                    status = 'PENDING',       -- Lista para escanear QR
                    nombre = ${lineName},     -- Actualizamos el nombre si el usuario puso uno nuevo
                    "userId" = ${user.id}     -- Aseguramos la propiedad (por si acaso)
                WHERE id = ${line.id}
                RETURNING *
            `
            return NextResponse.json(restoredLine[0], { status: 200 }) // 200 OK (Restaurada)
        } 
        
        // Caso 2: Existe y está ACTIVA -> Error (No podemos duplicar)
        else {
            return NextResponse.json({ error: "Este número ya está registrado y activo." }, { status: 409 })
        }
    }

    // B. ESCENARIO: No existe -> INSERTAMOS DE CERO (Comportamiento normal)
    const result = await sql`
      INSERT INTO lineas_whatsapp (phone, nombre, "userId", status, is_archived)
      VALUES (${cleanPhone}, ${lineName}, ${user.id}, 'PENDING', false)
      RETURNING *
    `

    console.log("[POST Line] Nueva línea creada:", result[0].id)
    return NextResponse.json(result[0], { status: 201 }) // 201 Created

  } catch (error: any) {
    console.error("[POST Line] Error:", error)
    return NextResponse.json({ error: "Failed to process line" }, { status: 500 })
  }
}
