import { requireAuth } from "@/lib/auth-middleware"
import AutomationsClient from "./automations-client"

export default async function AutomationsRoute() {
  // 🔥 El Guardia: Si no tiene permiso de automations, lo patea al inicio
  const user = await requireAuth({ requiredFeature: "automations" })

  // Si pasa la validación, le cargamos la pantalla
  return <AutomationsClient />
}
