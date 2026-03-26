import { redirect } from "next/navigation"
import { getSession } from "./session"
import { getEnrichedUser, type EnrichedUser } from "./auth"
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

// 👑 1. EL GUARDIA DEL SUPER ADMIN (Solo revisa que seas el dueño)
export async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const superAdminId = cookieStore.get("super_admin_session")?.value;

  if (!superAdminId) {
    throw new Error("No hay sesión de Super Admin activa.");
  }

  const users = await sql`
    SELECT id, email, role 
    FROM usuarios 
    WHERE id = ${superAdminId} AND role = 'SUPER_ADMIN'
  `;

  if (users.length === 0) {
    throw new Error("Acceso denegado: Se requieren privilegios de Super Administrador.");
  }

  return users[0];
}

// 🔥 Opciones del guardia para clientes
type AuthGuardOptions = {
  ownerOnly?: boolean;
  ownerOrAdmin?: boolean;
  requiredFeature?: string;
}

// 🛡️ 2. EL GUARDIA NORMAL (Para tus clientes)
export async function requireAuth(options?: AuthGuardOptions): Promise<EnrichedUser> {
  const session = await getSession()
  if (!session || !session.userId) redirect("/login")

  const enrichedUser = await getEnrichedUser(session.userId)
  if (!enrichedUser) redirect("/login")

  // 🔥 AQUÍ ES DONDE SÍ VA EL BLOQUEO: Si el cliente está cancelado/inactivo, lo pateamos
  if (enrichedUser.subscription_status?.toUpperCase() === 'CANCELED') {
    redirect("/login?error=account_suspended"); 
  }

  // EL MOTOR DE PROTECCIÓN DE RUTAS (Backend)
  if (options) {
    const isOwner = enrichedUser.role === "OWNER";
    const isAdmin = enrichedUser.role === "AGENT" && enrichedUser.permissions?.tier === "ADMIN";

    // Ruta exclusiva para dueños (ej: Facturación)
    if (options.ownerOnly && !isOwner) {
      redirect("/dashboard");
    }

    // Ruta para Dueños o Admins
    if (options.ownerOrAdmin && !isOwner && !isAdmin) {
      redirect("/dashboard");
    }

    // Ruta de Módulos (ej: Ventas, Contactos)
    if (options.requiredFeature && !isOwner && !isAdmin) {
      const hasFeature = enrichedUser.permissions?.features?.[options.requiredFeature] === true;
      if (!hasFeature) {
        redirect("/dashboard"); 
      }
    }
  }

  return enrichedUser
}
