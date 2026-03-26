import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { sql } from "@/lib/db";

export const dynamic = 'force-dynamic';

// 1. OBTENER: Revisa si el usuario ya tiene un webhook conectado
export async function GET(req: Request) {
    try {
        const user = await requireAuth(req);
        const webhooks = await sql`
            SELECT url FROM webhooks 
            WHERE owner_id = ${user.rootOwnerId} AND event_type = 'pago_aprobado' AND is_active = true
            LIMIT 1
        `;
        
        return NextResponse.json({ 
            connected: webhooks.length > 0,
            url: webhooks.length > 0 ? webhooks[0].url : null
        });
    } catch (error) {
        return NextResponse.json({ connected: false }, { status: 500 });
    }
}

// 2. GUARDAR: Cuando el usuario pega su URL en el SweetAlert
export async function POST(req: Request) {
    try {
        const user = await requireAuth(req);
        const { url } = await req.json();

        if (!url || !url.startsWith('http')) {
            return NextResponse.json({ error: "URL inválida" }, { status: 400 });
        }

        // Limpiamos webhooks viejos para este evento (para que no haya duplicados)
        await sql`DELETE FROM webhooks WHERE owner_id = ${user.rootOwnerId} AND event_type = 'pago_aprobado'`;

        // Insertamos la nueva URL
        await sql`
            INSERT INTO webhooks (owner_id, url, event_type, is_active)
            VALUES (${user.rootOwnerId}, ${url}, 'pago_aprobado', true)
        `;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error guardando webhook:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

// 3. BORRAR: Cuando el usuario hace clic en "Desconectar"
export async function DELETE(req: Request) {
    try {
        const user = await requireAuth(req);
        await sql`DELETE FROM webhooks WHERE owner_id = ${user.rootOwnerId} AND event_type = 'pago_aprobado'`;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
