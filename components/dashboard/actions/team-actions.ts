"use server"

import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function createAgent(formData: FormData, ownerId: string) {
  try {
    const nombre = formData.get("nombre") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const tier = formData.get("role") as string
    const permissionsStr = formData.get("permissions") as string

    if (!nombre || !email || !password) {
      return { success: false, error: "Todos los campos son requeridos" }
    }

    // Verificar email
    const existing = await sql`SELECT id FROM usuarios WHERE email = ${email}`
    if (existing.length > 0) {
      return { success: false, error: "Este email ya está registrado" }
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10)

    // Armar el JSON de permisos final
    const permissions = permissionsStr ? JSON.parse(permissionsStr) : {}
    permissions.tier = tier

    await sql`
      INSERT INTO usuarios (nombre, email, password_hash, owner_id, role, permissions)
      VALUES (${nombre}, ${email}, ${passwordHash}, ${ownerId}, 'AGENT', ${JSON.stringify(permissions)})
    `

    revalidatePath("/dashboard/team")
    return { success: true }
  } catch (error: any) {
    console.error("Error creating agent:", error)
    return { success: false, error: error.message || "Error al crear el agente" }
  }
}

export async function updateAgent(agentId: string, data: { nombre: string; role: string; permissions: any; password?: string }) {
  try {
    const updatedPermissions = {
      ...data.permissions,
      tier: data.role, 
    }

    // Si el administrador escribió una nueva contraseña:
    if (data.password && data.password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      await sql`
        UPDATE usuarios
        SET nombre = ${data.nombre},
            permissions = ${JSON.stringify(updatedPermissions)},
            password = ${hashedPassword}
        WHERE id = ${agentId}
      `
    } else {
      // Si la dejó en blanco, actualizamos todo menos la contraseña:
      await sql`
        UPDATE usuarios
        SET nombre = ${data.nombre},
            permissions = ${JSON.stringify(updatedPermissions)}
        WHERE id = ${agentId}
      `
    }

    revalidatePath("/dashboard/team")
    return { success: true }
  } catch (error: any) {
    console.error("Error updating agent:", error)
    return { success: false, error: error.message || "Error al actualizar el agente" }
  }
}

export async function deleteAgent(agentId: string) {
  try {
    // 1. Buscamos al agente para ver cuántos créditos tiene antes de borrarlo
    const agentData = await sql`
      SELECT owner_id, ia_credits, ia_credits_extra 
      FROM usuarios 
      WHERE id = ${agentId}
    `
    
    if (agentData.length > 0) {
      const agent = agentData[0];
      const totalRefund = Number(agent.ia_credits || 0) + Number(agent.ia_credits_extra || 0);
      
      // 2. Si tiene créditos, se los devolvemos al Dueño (Banco Central) al monedero extra
      if (totalRefund > 0 && agent.owner_id) {
         await sql`
           UPDATE usuarios 
           SET ia_credits_extra = COALESCE(ia_credits_extra, 0) + ${totalRefund} 
           WHERE id = ${agent.owner_id}
         `
      }
    }

    // 3. Ahora sí, lo eliminamos con seguridad
    await sql`DELETE FROM usuarios WHERE id = ${agentId}`
    
    revalidatePath("/dashboard/team")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting agent:", error)
    return { success: false, error: error.message || "Error al eliminar el agente" }
  }
}

// 🔥 EL NUEVO MOTOR CONTABLE INTELIGENTE (Corregido)
export async function transferCredits(ownerId: string, agentId: string, amount: number, type: "GIVE" | "TAKE") {
  try {
    if (amount <= 0) return { success: false, error: "Monto inválido" }

    if (type === "GIVE") {
      // 1. Descontamos al Dueño (Saca del extra primero, luego del plan)
      await sql`
        UPDATE usuarios 
        SET 
          ia_credits = ia_credits - CASE WHEN ${amount} > COALESCE(ia_credits_extra, 0) THEN ${amount} - COALESCE(ia_credits_extra, 0) ELSE 0 END,
          ia_credits_extra = GREATEST(0, COALESCE(ia_credits_extra, 0) - ${amount})
        WHERE id = ${ownerId}
      `
      // 2. Sumamos al Agente (Directo a su billetera IA principal)
      await sql`
        UPDATE usuarios 
        SET ia_credits = COALESCE(ia_credits, 0) + ${amount} 
        WHERE id = ${agentId}
      `
    } else if (type === "TAKE") {
      // 1. Descontamos al Agente (Lo sacamos de su IA principal y evitamos que quede en negativo)
      await sql`
        UPDATE usuarios 
        SET ia_credits = GREATEST(0, COALESCE(ia_credits, 0) - ${amount})
        WHERE id = ${agentId}
      `
      // 2. Sumamos al Dueño (🔥 AHORA SÍ: VUELVEN A TU CUENTA PRINCIPAL)
      await sql`
        UPDATE usuarios 
        SET ia_credits = COALESCE(ia_credits, 0) + ${amount} 
        WHERE id = ${ownerId}
      `
    }

    revalidatePath("/dashboard/team")
    return { success: true }
  } catch (error: any) {
    console.error("Error transferring credits:", error)
    return { success: false, error: "Error en la base de datos al transferir" }
  }
}
