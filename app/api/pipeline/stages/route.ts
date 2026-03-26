import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

// CREAR NUEVA COLUMNA
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) return new NextResponse("Unauthorized", { status: 401 });
    
    const { name } = await req.json();

    // Calculamos el orden (para ponerla al final)
    const maxOrderRes = await sql`SELECT MAX(order_index) as max_val FROM pipeline_stages WHERE usuario_id = ${session.userId}`;
    const nextOrder = (maxOrderRes[0]?.max_val || 0) + 1;

    // Generamos un ID único rápido
    const newId = 'stg_' + Math.random().toString(36).substring(2, 11);

    await sql`
      INSERT INTO pipeline_stages (id, usuario_id, name, order_index) 
      VALUES (${newId}, ${session.userId}, ${name}, ${nextOrder})
    `;
    
    return NextResponse.json({ id: newId, name, order_index: nextOrder });
  } catch (e) { 
    return new NextResponse("Error interno", { status: 500 }); 
  }
}

// EDITAR NOMBRE DE COLUMNA
export async function PATCH(req: Request) {
   try {
     const session = await getSession();
     if (!session?.userId) return new NextResponse("Unauthorized", { status: 401 });
     
     const { id, name } = await req.json();
     await sql`UPDATE pipeline_stages SET name = ${name} WHERE id = ${id} AND usuario_id = ${session.userId}`;
     
     return NextResponse.json({ success: true });
   } catch(e) {
     return new NextResponse("Error interno", { status: 500 });
   }
}

// BORRAR COLUMNA
export async function DELETE(req: Request) {
  try {
    const user = await requireAuth(req as any);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    // 🔥 PROTECCIÓN: Buscamos si es la última columna
    const stages = await sql`SELECT id FROM pipeline_stages WHERE usuario_id = ${user.rootOwnerId} ORDER BY order_index ASC`;
    if (stages.length > 0 && stages[stages.length - 1].id === id) {
        return NextResponse.json({ error: "No puedes eliminar la última columna. Es la encargada de registrar las ventas cerradas." }, { status: 400 });
    }

    const deals = await sql`SELECT id FROM "Contact" WHERE pipeline_stage_id = ${id} AND usuario_id = ${user.rootOwnerId}`;
    if (deals.length > 0) return NextResponse.json({ error: "No puedes borrar una etapa con contactos." }, { status: 400 });

    await sql`DELETE FROM pipeline_stages WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}`;
    return NextResponse.json({ success: true });
  } catch(e) { return new NextResponse("Error interno", { status: 500 }); }
}
