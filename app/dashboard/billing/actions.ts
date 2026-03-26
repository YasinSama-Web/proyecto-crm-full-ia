"use server"

import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"

export async function getMyBillingHistory() {
  const session = await getSession();
  if (!session || !session.userId) return [];

  try {
    const history = await sql`
      SELECT id, amount, status, created_at, mp_payment_id 
      FROM pagos_suscripcion 
      WHERE usuario_id = ${session.userId} 
      ORDER BY created_at DESC 
      LIMIT 12 -- Traemos los últimos 12 meses
    `;
    return history;
  } catch (error) {
    console.error("Error trayendo historial de facturación:", error);
    return [];
  }
}
