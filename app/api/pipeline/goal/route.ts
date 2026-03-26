import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = 'force-dynamic';

// 🚀 1. OBTENER PROGRESO Y META
export async function GET(req: Request) {
  try {
    const user = await requireAuth(req as any);
    const rootId = user.rootOwnerId;

    // Fechas actuales
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();

    // A. Buscar la meta en la BD (Si no configuras nada, asume 1 Millón)
    const goalRes = await sql`
      SELECT monto FROM "MetaMensual"
      WHERE usuario_id = ${rootId} AND mes = ${currentMonth} AND anio = ${currentYear}
    `;
    const currentGoal = goalRes.length > 0 ? Number(goalRes[0].monto) : 1000000;

    // B. Progreso actual (Plata REAL que entró este mes)
    const currentTotalRes = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM ventas
      WHERE usuario_id = ${rootId}
      AND EXTRACT(MONTH FROM created_at) = ${currentMonth}
      AND EXTRACT(YEAR FROM created_at) = ${currentYear}
    `;
    const currentTotal = Number(currentTotalRes[0].total);

    // C. Progreso del mes pasado (Calculado hasta el MISMO DÍA para una comparación justa)
    const lastMonthTotalRes = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM ventas
      WHERE usuario_id = ${rootId}
      AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
      AND created_at <= CURRENT_DATE - INTERVAL '1 month'
    `;
    const lastMonthTotal = Number(lastMonthTotalRes[0].total);

    // D. Calcular tendencia (El "condimento" visual)
    let trendPercentage = 0;
    if (lastMonthTotal > 0) {
        trendPercentage = ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100;
    } else if (currentTotal > 0) {
        trendPercentage = 100; // Si el mes pasado fue 0 y este vendiste, es +100%
    }

    return NextResponse.json({
        goal: currentGoal,
        currentTotal,
        lastMonthTotal,
        trendPercentage
    });
  } catch (error) {
    console.error("[GET_GOAL_ERROR]", error);
    return NextResponse.json({ goal: 1000000, currentTotal: 0, lastMonthTotal: 0, trendPercentage: 0 });
  }
}

// 🚀 2. GUARDAR O ACTUALIZAR LA META
export async function POST(req: Request) {
  try {
    const user = await requireAuth(req as any);
    const rootId = user.rootOwnerId;
    const { amount } = await req.json();

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Guardado Inteligente (Upsert): Si ya hay meta este mes, la actualiza. Si no, la crea.
    await sql`
      INSERT INTO "MetaMensual" (id, usuario_id, mes, anio, monto)
      VALUES (gen_random_uuid(), ${rootId}, ${currentMonth}, ${currentYear}, ${amount})
      ON CONFLICT (usuario_id, mes, anio)
      DO UPDATE SET monto = EXCLUDED.monto
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST_GOAL_ERROR]", error);
    return NextResponse.json({ error: "No se pudo guardar la meta" }, { status: 500 });
  }
}
