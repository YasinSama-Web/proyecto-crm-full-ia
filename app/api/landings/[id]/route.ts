import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

// ✅ GET: Obtener una landing específica (Solo si es mía)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Corrección de tipo para Next.js 15
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params // Esperamos los params

    const landing = await sql`
      SELECT * FROM landings 
      WHERE id = ${id} AND usuario_id = ${user.id}
    `

    if (landing.length === 0) {
      return NextResponse.json({ error: "Landing no encontrada" }, { status: 404 })
    }

    return NextResponse.json(landing[0])
  } catch (error) {
    console.error("Error fetching landing:", error)
    return NextResponse.json({ error: "Error fetching landing" }, { status: 500 })
  }
}

// ✅ PATCH: Actualizar cualquier campo (Solo si es mía)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    
    // Leemos todo el body de una vez
    const body = await request.json()
    const { configuracion_json, activa, nombre, slug } = body

    // Lógica inteligente con COALESCE:
    // Si envías un dato nuevo, lo usa. Si envías null/undefined, mantiene el valor viejo en la DB.
    // Esto elimina la necesidad de todos los "if/else" que tenías antes.
    
    const result = await sql`
      UPDATE landings 
      SET 
        configuracion_json = COALESCE(${configuracion_json ? JSON.stringify(configuracion_json) : null}, configuracion_json),
        activa = COALESCE(${activa}, activa),
        nombre = COALESCE(${nombre}, nombre),
        slug = COALESCE(${slug}, slug),
        fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = ${id} AND usuario_id = ${user.id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Landing no encontrada o no autorizada" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error updating landing:", error)
    return NextResponse.json({ error: "Error updating landing" }, { status: 500 })
  }
}

// ✅ DELETE: Borrar landing (Solo si es mía)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params

    const result = await sql`
      DELETE FROM landings 
      WHERE id = ${id} AND usuario_id = ${user.id}
      RETURNING id
    `
    
    // Es buena práctica avisar si no se borró nada (porque no existía o no era suya)
    if (result.length === 0) {
        return NextResponse.json({ error: "Landing no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting landing:", error)
    return NextResponse.json({ error: "Error deleting landing" }, { status: 500 })
  }
}
