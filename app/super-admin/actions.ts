"use server"

import { sql } from "@/lib/db"
import { requireSuperAdmin } from "@/lib/auth-middleware"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function updateWorkspacePlan(workspaceId: string, tier: string, daysToAdd: number) {
  await requireSuperAdmin();
  try {
    await sql`
      UPDATE usuarios 
      SET plan = ${tier},
          plan_expires_at = NOW() + (${daysToAdd} || ' days')::interval
      WHERE id = ${workspaceId} OR "rootOwnerId" = ${workspaceId}
    `;
    revalidatePath("/super-admin");
    return { success: true };
  } catch (error) { return { success: false }; }
}

export async function getWorkspacesSummary(searchQuery?: string) {
  await requireSuperAdmin();
  try {
    const search = searchQuery ? `%${searchQuery}%` : '%';

    const workspaces = await sql`
      SELECT 
        u.id, u.email, u.nombre, u.subscription_status, u.fecha_creacion, 
        u.plan, u.plan_expires_at, u.trial_ends_at, 
        u.payment_method, u.billing_cycle, u.mp_subscription_id,
        COALESCE(u.mensajes_ia, 0) as ai_tokens_used, 
        (SELECT COUNT(*) FROM lineas_whatsapp WHERE "userId" = u.id) as total_lineas,
        (SELECT COUNT(*) FROM usuarios WHERE owner_id = u.id) as total_agentes
      FROM usuarios u
      WHERE (u.id = u.owner_id OR u.owner_id IS NULL)
        AND (u.email ILIKE ${search} OR u.nombre ILIKE ${search})
      ORDER BY u.fecha_creacion DESC
    `;
    return workspaces;
  } catch (e: any) { 
    console.error("Error:", e.message);
    return []; 
  }
}

// Nueva acción para actualizar el plan real
// Nueva acción para actualizar el plan real (no hardcodeado)
export async function updatePlanReal(workspaceId: string, planName: string) {
    await requireSuperAdmin();
    try {
        await sql`
            UPDATE usuarios 
            SET plan = ${planName} 
            WHERE id = ${workspaceId} OR owner_id = ${workspaceId}
        `;
        revalidatePath("/super-admin");
        
        // 🔥 ESTO ES LO QUE FALTABA: Avisarle al Frontend que todo salió bien
        return { success: true }; 
    } catch (error) {
        console.error("Error cambiando plan:", error);
        return { success: false, error: "Fallo en la base de datos" };
    }
}

// EL INTERRUPTOR DE LA MUERTE
export async function toggleWorkspaceStatus(workspaceId: string, currentStatus: boolean) {
  await requireSuperAdmin();
  try {
    const newStatus = currentStatus ? 'CANCELED' : 'ACTIVE'
    await sql`
      UPDATE usuarios 
      SET subscription_status = ${newStatus}
      WHERE id = ${workspaceId} OR owner_id = ${workspaceId}
    `;
    revalidatePath("/super-admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: "No se pudo cambiar el estado" };
  }
}

// Traer los datos de un solo workspace
export async function getWorkspaceDetails(workspaceId: string) {
  await requireSuperAdmin();
  try {
    const data = await sql`
      SELECT id, email, nombre, plan, subscription_status, fecha_creacion, 
      plan_expires_at, trial_ends_at, payment_method, mp_subscription_id
      FROM usuarios 
      WHERE id = ${workspaceId}
      LIMIT 1
    `;
    return data[0] || null;
  } catch (error) { return null; }
}

// 🔥 AQUÍ ESTÁ LA CORRECCIÓN: Traer historial de PAGOS DE SUSCRIPCIÓN (Tu dinero)
export async function getWorkspacePayments(workspaceId: string) {
  await requireSuperAdmin();
  try {
    return await sql`
      SELECT id, amount, status, mp_payment_id, created_at 
      FROM pagos_suscripcion 
      WHERE usuario_id = ${workspaceId}
      ORDER BY created_at DESC 
      LIMIT 50
    `;
  } catch (error) { 
    console.error("Error trayendo historial:", error);
    return []; 
  }
}

// EL MODO ESPEJO (Entrar como el cliente)
export async function impersonateUser(workspaceId: string) {
  await requireSuperAdmin();
  const cookieStore = await cookies();
  
  const myAdminToken = cookieStore.get("super_admin_session")?.value;
  if (myAdminToken) {
      cookieStore.set("admin_return_id", myAdminToken, { path: "/" });
  }

  cookieStore.set("session", workspaceId, { path: "/" });
  redirect("/dashboard");
}
