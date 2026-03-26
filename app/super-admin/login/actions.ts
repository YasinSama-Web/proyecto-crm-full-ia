"use server"

import { sql } from "@/lib/db"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs";


export async function superAdminLogin(formData: FormData) {
  const email = formData.get("email")?.toString()
  const password = formData.get("password")?.toString()

  if (!email || !password) {
    return { error: "Faltan credenciales" }
  }

  try {
    console.log(`🔎 Intentando login Super Admin para: ${email}`);

    // 1. Buscamos al usuario (Cuidado: si tu columna no se llama 'password', fallará aquí)
 const users = await sql`
      SELECT id, email, password_hash, role 
      FROM usuarios 
      WHERE email = ${email} AND role = 'SUPER_ADMIN'
    `
    
    console.log(`✅ Consulta SQL exitosa. Usuarios encontrados: ${users.length}`);

    if (users.length === 0) {
      return { error: "Acceso denegado. Usuario no encontrado o sin rol SUPER_ADMIN." }
    }

    const admin = users[0]

    // 2. Verificamos contraseña
    // NOTA: Si en tu base de datos las contraseñas están encriptadas (hasheadas), 
    // esta validación fallará. Me avisas si es el caso.
    const passwordMatch = await bcrypt.compare(password, admin.password_hash)
    
if (!passwordMatch) {
      return { error: "Acceso denegado. Contraseña incorrecta." }
    }

    // 3. Seteamos la sesión
    const cookieStore = await cookies()
    cookieStore.set("super_admin_session", admin.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 // 1 día
    })

    console.log("✅ Cookie de sesión creada con éxito.");

  } catch (error) {
    // 🔥 AQUÍ CAPTURAMOS EL ERROR REAL
    console.error("💥 ERROR CRÍTICO EN LOGIN SUPER ADMIN:", error);
    
    // Y lo mandamos al Frontend para que lo veas en el cartel rojo
    if (error instanceof Error) {
        return { error: `Error del Servidor: ${error.message}` }
    }
    return { error: "Error interno del servidor desconocido" }
  }

  // 🔥 El redirect DEBE ir fuera del try/catch en Next.js
  console.log("🚀 Redirigiendo al panel...");
  redirect("/super-admin")
}
