import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { sql } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const user = await requireAuth(req);
        
        // Traemos todas las tareas del owner ordenadas por fecha
        // Traemos el ID, título, fecha y estado para pintarlo en el calendario
        const tareas = await sql`
            SELECT 
                id, 
                title as titulo, 
                due_date as fecha_vencimiento, 
                is_completed as completada,
                task_type as tipo
            FROM tasks 
            WHERE owner_id = ${user.rootOwnerId}
            ORDER BY due_date ASC
        `;
        
        return NextResponse.json({ success: true, tareas });
    } catch (error) {
        console.error("Error cargando tasks para el calendario:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
