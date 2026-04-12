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
      LIMIT 12
    `;
    return history;
  } catch (error) {
    console.error("Error trayendo historial:", error);
    return [];
  }
}

export async function getMyAddons() {
  const session = await getSession();
  if (!session || !session.userId) return [];

  try {
    // 🔥 Traemos las cantidades numéricas Y los booleanos VIP
    const dbUser = await sql`
      SELECT 
        agentes_extra, lineas_extra, bots_extra, ia_bots_extra,
        addon_voice_clone, addon_pdf_quotes, addon_magic_fitting, addon_prescription_reader,
        current_period_end
      FROM usuarios 
      WHERE id = ${session.userId}
    `;
    
    if (dbUser.length === 0) return [];
    
    const u = dbUser[0];
    const addons = [];

    // Addons Cuantitativos
    if (u.agentes_extra > 0) addons.push({ id: 'EXTRA_AGENT', name: 'Agentes Adicionales', quantity: u.agentes_extra, current_period_end: u.current_period_end });
    if (u.lineas_extra > 0) addons.push({ id: 'EXTRA_LINE', name: 'Líneas WhatsApp', quantity: u.lineas_extra, current_period_end: u.current_period_end });
    if (u.bots_extra > 0) addons.push({ id: 'EXTRA_BOT', name: 'Bots de Flujo', quantity: u.bots_extra, current_period_end: u.current_period_end });
    if (u.ia_bots_extra > 0) addons.push({ id: 'EXTRA_AI_BOT', name: 'Bots IA (Jefe)', quantity: u.ia_bots_extra, current_period_end: u.current_period_end });

    // Addons VIP (Booleanos) -> Si los tiene, los metemos con cantidad 1
    if (u.addon_voice_clone) addons.push({ id: 'VIP_VOICE', name: 'Clonación de Voz', quantity: 1, isVip: true, current_period_end: u.current_period_end });
    if (u.addon_pdf_quotes) addons.push({ id: 'VIP_PDF', name: 'Presupuestos en PDF', quantity: 1, isVip: true, current_period_end: u.current_period_end });
    if (u.addon_magic_fitting) addons.push({ id: 'VIP_MAGIC', name: 'Probador Mágico', quantity: 1, isVip: true, current_period_end: u.current_period_end });
    if (u.addon_prescription_reader) addons.push({ id: 'VIP_MEDICAL', name: 'Lector de Recetas', quantity: 1, isVip: true, current_period_end: u.current_period_end });

    return addons;
  } catch (error) {
    console.error("Error trayendo mis addons:", error);
    return [];
  }
}