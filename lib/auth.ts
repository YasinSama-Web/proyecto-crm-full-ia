import { sql } from "./db"
import bcrypt from "bcryptjs"

export interface User {
  id: number
  nombre: string
  email: string
  fecha_creacion: Date
  role?: string
  owner_id?: number
  permissions?: any
}

export interface EnrichedUser {
  id: string
  nombre: string
  email: string
  role: string
  rootOwnerId: string
  subscription_status?: string
  plan?: string
  billing_cycle?: string
  plan_expires_at?: Date | string | null
  trial_ends_at?: Date | string | null
  mensajes_plan?: number
  mensajes_extra?: number
  ia_credits?: number // 🔥 NUEVO: Agregamos a la interfaz
  ia_bots_extra?: number
  addon_voice_clone?: boolean 
  addon_pdf_quotes?: boolean 
  addon_magic_fitting?: boolean 
  addon_prescription_reader?: boolean 
  addon_addon_ecommerce?: boolean 
  permissions: {
    tier: string
    features: Record<string, boolean>
    allowedLineIds: string[]
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createUser(nombre: string, email: string, password: string): Promise<User | null> {
  try {
    const passwordHash = await hashPassword(password)
    const result = await sql`
      INSERT INTO usuarios (nombre, email, password_hash)
      VALUES (${nombre}, ${email}, ${passwordHash})
      RETURNING id, nombre, email, fecha_creacion
    `
    return result[0] as User
  } catch (error) {
    console.error("Error creating user:", error)
    return null
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT id, nombre, email, password_hash, fecha_creacion
      FROM usuarios
      WHERE email = ${email}
    `

    if (result.length === 0) {
      return null
    }

    const user = result[0]
    const isValid = await verifyPassword(password, user.password_hash)

    if (!isValid) {
      return null
    }

    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      fecha_creacion: user.fecha_creacion,
    }
  } catch (error) {
    console.error("Error authenticating user:", error)
    return null
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const result = await sql`
      SELECT id, nombre, email, fecha_creacion
      FROM usuarios
      WHERE id = ${id}
    `
    return result.length > 0 ? (result[0] as User) : null
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}

export async function getEnrichedUser(userId: number): Promise<EnrichedUser | null> {
  try {
    // 🔥 NUEVO: Agregamos ia_credits al SELECT de SQL
    const result = await sql`
      SELECT id, nombre, email, role, owner_id, subscription_status, permissions, fecha_creacion,
             plan, ia_bots_extra, billing_cycle, plan_expires_at, trial_ends_at, mensajes_plan, mensajes_extra, ia_credits,
             addon_voice_clone, addon_pdf_quotes, addon_magic_fitting, addon_prescription_reader, addon_ecommerce
      FROM usuarios
      WHERE id = ${userId}
    `

    if (result.length === 0) {
      return null
    }

    const user = result[0]

    const rootOwnerId = user.role === "OWNER" || !user.owner_id ? user.id.toString() : user.owner_id.toString()

    let parsedPermissions = {
      tier: "HELPER",
      features: {
        messages: true,
        tasks: true,
      } as Record<string, boolean>,
      allowedLineIds: [] as string[],
    }

    if (user.permissions) {
      try {
        const perms = typeof user.permissions === "string" ? JSON.parse(user.permissions) : user.permissions
        
        parsedPermissions = {
          tier: perms.tier || "HELPER",
          features: {
            messages: true,
            tasks: true,
            ...(perms.features || {}),
          },
          allowedLineIds: Array.isArray(perms.allowedLineIds) ? perms.allowedLineIds : [],
        }
      } catch (e) {
        console.error("Error parsing permissions:", e)
      }
    }

    if (user.role === "OWNER") {
      parsedPermissions.tier = "OWNER"
      parsedPermissions.features = {
        contacts: true,
        tags: true,
        tasks: true,
        sales: true,
        campaigns: true,
        automations: true,
        marketing: true,
        landings: true,
        metrics: true,
        messages: true,
      }
    }

    return {
      id: user.id.toString(),
      nombre: user.nombre,
      email: user.email,
      role: user.role || "OWNER",
      rootOwnerId,
      permissions: parsedPermissions,
      subscription_status: user.subscription_status,
      plan: user.plan,
      billing_cycle: user.billing_cycle,
      plan_expires_at: user.plan_expires_at,
      trial_ends_at: user.trial_ends_at,
      mensajes_plan: user.mensajes_plan,   
      mensajes_extra: user.mensajes_extra,
      ia_credits: user.ia_credits || 0, // 🔥 NUEVO: Lo pasamos al objeto final
      ia_bots_extra: user.ia_bots_extra || 0,
      addon_voice_clone: user.addon_voice_clone || false,
      addon_pdf_quotes: user.addon_pdf_quotes || false,
      addon_magic_fitting: user.addon_magic_fitting || false,
      addon_prescription_reader: user.addon_prescription_reader || false,
      addon_ecommerce: user.addon_ecommerce || false,
    }
  } catch (error) {
    console.error("Error getting enriched user:", error)
    return null
  }
}

export const authOptions = {
  providers: [],
  pages: {
    signIn: "/login",
  },
}
