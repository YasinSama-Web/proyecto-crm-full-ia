"use server"

import { revalidatePath } from "next/cache"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"
import { requireAuth } from "@/lib/auth-middleware"

export async function createAgent(formData: FormData, ownerId: string) {
  try {
    // Verify the current user is an owner
    const currentUser = await requireAuth()

    // Get form data
    const nombre = formData.get("nombre") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!nombre || !email || !password) {
      return { success: false, error: "Todos los campos son requeridos" }
    }

    // Check if email already exists
    const existing = await sql`
      SELECT id FROM usuarios WHERE email = ${email}
    `

    if (existing.length > 0) {
      return { success: false, error: "El email ya está registrado" }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create agent
    await sql`
      INSERT INTO usuarios (nombre, email, password_hash, role, owner_id, permissions)
      VALUES (
        ${nombre},
        ${email},
        ${passwordHash},
        'AGENT',
        ${ownerId},
        '{"all": true}'::jsonb
      )
    `

    // Revalidate the team page
    revalidatePath("/dashboard/team")

    return { success: true }
  } catch (error: any) {
    console.error("Error creating agent:", error)
    return { success: false, error: error.message || "Error al crear el agente" }
  }
}
