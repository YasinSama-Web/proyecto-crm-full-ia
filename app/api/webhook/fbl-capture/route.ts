import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Permitir CORS para que cualquier web externa pueda enviar el ping
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
    const { fbc, fbp, source, ownerId } = await req.json();

    if (!fbc || !ownerId) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400, headers: corsHeaders });
    }

    const sessionId = `sess_${Math.random().toString(36).substring(2, 15)}`;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "0.0.0.0";
    const userAgent = req.headers.get("user-agent") || "";

    // Guardar en la Bóveda (FBL Logs)
    await sql`
      INSERT INTO fbl_logs (session_id, fbc, fbp, ip, user_agent, source, owner_id)
      VALUES (${sessionId}, ${fbc}, ${fbp}, ${ip}, ${userAgent}, ${source || "web_externa"}, ${ownerId})
    `;

    return NextResponse.json({ success: true, sessionId }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Error capturando FBL:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: corsHeaders });
  }
}