import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

// 🔥 1. OBTENER TODAS LAS ETIQUETAS DEL USUARIO
// 🔥 1. OBTENER TODAS LAS ETIQUETAS Y SU ESTADÍSTICA DE USO
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth({ requiredFeature: "tags" });

    // Subconsulta inteligente: Cuenta cuántas veces aparece el nombre de la etiqueta
    // dentro del array "tags" de la tabla de Contactos de este usuario.
    const tags = await sql`
      SELECT e.id, e.name, e.color, 
             (SELECT COUNT(*) FROM "Contact" c WHERE e.name = ANY(c.tags) AND c.usuario_id = ${user.rootOwnerId}) as usage_count
      FROM etiquetas e
      WHERE e.usuario_id = ${user.rootOwnerId}
      ORDER BY e.created_at ASC
    `
    return NextResponse.json(tags)
  } catch (error) {
    console.error("Error fetching tags:", error)
    return NextResponse.json({ error: "Error al obtener etiquetas" }, { status: 500 })
  }
}

// 🔥 2. CREAR UNA NUEVA ETIQUETA
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { name, color } = body

    if (!name || !color) {
      return NextResponse.json({ error: "Nombre y color son obligatorios" }, { status: 400 })
    }

    const newTag = await sql`
      INSERT INTO etiquetas (usuario_id, name, color)
      VALUES (${user.rootOwnerId}, ${name.trim()}, ${color})
      RETURNING id, name, color
    `
    return NextResponse.json(newTag[0])
  } catch (error: any) {
    console.error("Error creating tag:", error)
    // Manejo del error UNIQUE de SQL (si ya existe una con ese nombre)
    if (error.code === '23505') {
        return NextResponse.json({ error: "Ya existe una etiqueta con ese nombre" }, { status: 400 })
    }
    return NextResponse.json({ error: "Error al crear la etiqueta" }, { status: 500 })
  }
}

// 3. EDITAR UNA ETIQUETA
// 3. EDITAR UNA ETIQUETA (Con actualización en cascada de contactos)
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { id, name, color } = body

    if (!id || !name || !color) {
      return NextResponse.json({ error: "ID, nombre y color son obligatorios" }, { status: 400 })
    }

    const newName = name.trim();

    // 🔥 1. BUSCAMOS EL NOMBRE VIEJO ANTES DE CAMBIARLO
    const oldTagQuery = await sql`
      SELECT name FROM etiquetas 
      WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}
    `;
    
    if (oldTagQuery.length === 0) {
      return NextResponse.json({ error: "Etiqueta no encontrada" }, { status: 404 });
    }
    
    const oldName = oldTagQuery[0].name;

    // 🔥 2. SI EL NOMBRE CAMBIÓ, ACTUALIZAMOS TODOS LOS CONTACTOS EN CASCADA
    if (oldName !== newName) {
        console.log(`[Tags] Renombrando en cascada: '${oldName}' -> '${newName}'`);
        
        await sql`
          UPDATE "Contact"
          SET tags = array_replace(tags, ${oldName}, ${newName})
          WHERE usuario_id = ${user.rootOwnerId} 
            AND ${oldName} = ANY(tags)
        `;
    }

    // 3. ACTUALIZAMOS LA ETIQUETA GLOBALMENTE
    const updated = await sql`
      UPDATE etiquetas 
      SET name = ${newName}, color = ${color}
      WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}
      RETURNING id, name, color
    `

    return NextResponse.json(updated[0])
  } catch (error: any) {
    console.error("Error updating tag:", error)
    if (error.code === '23505') {
      return NextResponse.json({ error: "Ya existe una etiqueta con ese nombre" }, { status: 400 })
    }
    return NextResponse.json({ error: "Error al actualizar la etiqueta" }, { status: 500 })
  }
}

// 4. ELIMINAR UNA ETIQUETA
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    await sql`
      DELETE FROM etiquetas 
      WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}
    `
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting tag:", error)
    return NextResponse.json({ error: "Error al eliminar la etiqueta" }, { status: 500 })
  }
}
