import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { sql } from "@/lib/db";

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const user = await requireAuth(req);
        
        await sql`UPDATE usuarios SET last_active_at = NOW() WHERE id = ${user.id}`;
        // Buscamos ambas billeteras
        const result = await sql`SELECT ia_credits, ia_credits_extra FROM usuarios WHERE id = ${user.id}`;
        
        if (result.length > 0) {
            return NextResponse.json({ 
                ia_credits: result[0].ia_credits || 0,
                ia_credits_extra: result[0].ia_credits_extra || 0
            });
        }
        
        return NextResponse.json({ ia_credits: 0, ia_credits_extra: 0 });
    } catch (error) {
        return NextResponse.json({ ia_credits: 0, ia_credits_extra: 0 });
    }
}
