import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: Request) {
    try {
        const user = await requireAuth(req as any);
        // Reseteamos todas las alertas del usuario
        await sql`
            UPDATE conversaciones 
            SET unread_count = 0, unread_ia_payment = false, unread_ia_furious = false 
            WHERE usuario_id = ${user.rootOwnerId}
        `;
        return NextResponse.json({ success: true });
    } catch(e) {
        return new NextResponse("Error", { status: 500 });
    }
}