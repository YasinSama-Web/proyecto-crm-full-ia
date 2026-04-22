import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📥 PING RECIBIDO EN CRM:", body); // Para ver en logs de Vercel

    const { fbc, fbp, source, ownerId } = body;

    if (!fbc || !ownerId) {
      return NextResponse.json({ error: "Faltan fbc u ownerId" }, { status: 400, headers: corsHeaders });
    }

    const sessionId = `sess_${Math.random().toString(36).substring(2, 15)}`;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "0.0.0.0";
    const userAgent = req.headers.get("user-agent") || "desconocido";

    // Intentamos guardar en la BD
    await sql`
      INSERT INTO fbl_logs (session_id, fbc, fbp, ip, user_agent, source, owner_id)
      VALUES (${sessionId}, ${fbc}, ${fbp || null}, ${ip}, ${userAgent}, ${source || "web_externa"}, ${ownerId})
    `;

    console.log("✅ FBL GUARDADO EN NEON CON ÉXITO");
    return NextResponse.json({ success: true, sessionId }, { headers: corsHeaders });

  } catch (error: any) {
    // 🔥 AQUÍ ATRAPAMOS EL ERROR EXACTO 🔥
    console.error("❌ ERROR FATAL CAPTURANDO FBL:", error.message);
    
    // Le devolvemos el mensaje real al Front-end para que lo veas en Chrome
    return NextResponse.json({ 
      error: "Error interno guardando en BD", 
      details: error.message 
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}