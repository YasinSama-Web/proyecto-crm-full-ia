import { sql } from "@/lib/db"
import { LinesTable } from "@/components/dashboard/lines-table"
import { CreateLineButton } from "@/components/dashboard/create-line-button"
import { requireAuth } from "@/lib/auth-middleware"
import { getChatbots } from "@/app/dashboard/automations/actions" 

export const dynamic = "force-dynamic"

async function getLines(rootOwnerId: string) {
  try {
    const lines = await sql`
      SELECT * FROM lineas_whatsapp
      WHERE "userId" = ${rootOwnerId}
      ORDER BY fecha_creacion DESC
    `
    return lines
  } catch (error) {
    console.error("Error obteniendo líneas:", error)
    return []
  }
}

export default async function LinesPage() {
  const user = await requireAuth({ ownerOrAdmin: true })
  
  const lines = await getLines(user.rootOwnerId)
  const chatbots = await getChatbots()

  // 🔥 MATEMÁTICA DE LÍMITES
  // 1. Buscamos el plan actual y los extras comprados por este usuario
  const dbUser = await sql`SELECT plan, lineas_extra FROM usuarios WHERE id = ${user.rootOwnerId}`;
  const currentUser = dbUser[0] || {};
  
  const plan = (currentUser.plan || "STARTER").toUpperCase();
  const lineasExtra = currentUser.lineas_extra || 0;

  // 2. Definimos las líneas base de cada plan (Modifícalo según tu negocio)
  const baseLines = plan === 'ENTERPRISE' ? 10 : plan === 'PRO' ? 3 : 1;
  
  // 3. Calculamos el Total y validamos
  const limit = baseLines + lineasExtra;
  const used = lines.length;
  const isLimitReached = used >= limit;

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Líneas WhatsApp</h1>
          <p className="text-slate-500 mt-1">Gestiona tus líneas de WhatsApp conectadas</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 🔥 LE PASAMOS LOS DATOS AL COMPONENTE CLIENTE */}
          <CreateLineButton used={used} limit={limit} isLimitReached={isLimitReached} />
        </div>
      </div>

      <LinesTable lines={lines} chatbots={chatbots} />
    </div>
  )
}
