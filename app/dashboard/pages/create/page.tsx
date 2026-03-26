import { LandingEditor } from "@/components/dashboard/landing-editor" 
import { requireAuth } from "@/lib/auth-middleware"
import { getLandingsStats } from "../actions"
import { redirect } from "next/navigation"
// 🔥 OJO: Agregué la 's' al final, suele ser 'actions' no 'action'
import { getSmartLinks } from "@/app/dashboard/marketing/action"

export default async function CreateLandingPage() {
  const user = await requireAuth()
  
  // 1. Verificación de Límite del Plan
  const stats = await getLandingsStats()
  if (stats.isLimitReached) {
      redirect("/dashboard/pages?error=limit_reached")
  }

  // 2. Obtener SOLO los Smart Links (No buscamos landing porque es nueva)
  const smartLinks = await getSmartLinks()

  // 3. Objeto vacío para inicializar el editor
  const newLanding = {
    id: "",
    title: "", 
    slug: "",
    design_settings: {}
  }

  return <LandingEditor landing={newLanding} smartLinks={smartLinks} />
}
