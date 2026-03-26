"use server"

import { neon } from "@neondatabase/serverless"
import { requireAuth } from "@/lib/auth-middleware"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

// 🔥 FIX 1: Cambiamos el default a 'dark' para evitar el flashazo blanco
const DEFAULT_SETTINGS = {
  language: "es",
  timezone: "america_argentina",
  theme: "light", // Antes era "light"
  soundEnabled: true,
  desktopNotifications: true,
  inactivityThreshold: 15,
  workStart: "09:00",
  workEnd: "18:00",
  weekendWork: false,
}

export async function getUserSettings() {
  const user = await requireAuth()
  
  const result = await sql`
    SELECT settings, nombre, email 
    FROM usuarios 
    WHERE id = ${user.id}
  `

  if (result.length === 0) return null

  // Mezclamos lo que venga de la DB con los defaults
  const dbSettings = result[0].settings || {}
  
  return {
    settings: { ...DEFAULT_SETTINGS, ...dbSettings },
    profile: {
      name: result[0].nombre,
      email: result[0].email
    }
  }
}

// ... El resto de tus funciones updateSettings, updateProfile, changePassword quedan igual ...
// Solo asegúrate de copiar el resto del archivo que ya tenías.
export async function updateSettings(newSettings: any) {
  try {
    const user = await requireAuth()
    await sql`UPDATE usuarios SET settings = ${newSettings} WHERE id = ${user.id}`
    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch (error) {
    console.error("Error saving settings:", error)
    return { success: false, error: "Error al guardar" }
  }
}

export async function updateProfile(name: string) {
  try {
    const user = await requireAuth()
    await sql`UPDATE usuarios SET nombre = ${name} WHERE id = ${user.id}`
    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Error al actualizar perfil" }
  }
}

export async function changePassword(currentPass: string, newPass: string) {
  try {
    const user = await requireAuth()
    const result = await sql`SELECT password FROM usuarios WHERE id = ${user.id}`
    if (result.length === 0) return { success: false, error: "Usuario no encontrado" }
    const storedHash = result[0].password
    const match = await bcrypt.compare(currentPass, storedHash)
    if (!match) return { success: false, error: "La contraseña actual es incorrecta" }
    const newHash = await bcrypt.hash(newPass, 10)
    await sql`UPDATE usuarios SET password = ${newHash} WHERE id = ${user.id}`
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: "Error al cambiar contraseña" }
  }
}
