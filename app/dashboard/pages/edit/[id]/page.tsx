import { sql } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { LandingEditor } from "@/components/dashboard/landing-editor" // Asegúrate que la ruta al componente sea correcta
import { requireAuth } from "@/lib/auth-middleware"
import { getSmartLinks } from "@/app/dashboard/marketing/action"
export const dynamic = "force-dynamic"

export default async function EditLandingPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. Autenticación
  const user = await requireAuth()

  // 2. Obtener ID de la URL
  const { id } = await params

  // 3. Buscar Landing por ID y Usuario (Seguridad)
  // 🔥 CORREGIDO: usuario_id
  const result = await sql`
    SELECT * FROM landings 
    WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}
  `

  const [landingResult, smartLinks] = await Promise.all([
    sql`SELECT * FROM landings WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}`,
    getSmartLinks() // Traemos los links del usuario
  ])

  const landing = result[0]

  // 4. Si no existe, al dashboard
  if (!landing) {
    redirect("/dashboard/pages")
  }

  // 5. Cargar editor
  return <LandingEditor landing={landing} smartLinks={smartLinks} />
}
