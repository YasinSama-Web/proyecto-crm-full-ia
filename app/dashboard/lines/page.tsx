import { sql } from "@/lib/db"
import { LinesTable } from "@/components/dashboard/lines-table" 
import { requireAuth } from "@/lib/auth-middleware"
import { getChatbots } from "@/app/dashboard/automations/actions" 

export const dynamic = "force-dynamic"

export default async function LinesPage() {
  const user = await requireAuth({ ownerOrAdmin: true })
  
  const lines = await sql`
    SELECT * FROM lineas_whatsapp
    WHERE "userId" = ${user.rootOwnerId}
    ORDER BY fecha_creacion DESC
  `

  const omniChannels = await sql`
    SELECT * FROM omni_channels
    WHERE "userId" = ${user.rootOwnerId}
    ORDER BY fecha_creacion DESC
  `

  const chatbots = await getChatbots()

  // 🔥 MATEMÁTICA DE LÍMITES OMNICANAL
  const dbUser = await sql`SELECT plan, lineas_extra FROM usuarios WHERE id = ${user.rootOwnerId}`;
  const currentUser = dbUser[0] || {};
  
  const plan = (currentUser.plan || "STARTER").toUpperCase();
  const lineasExtra = currentUser.lineas_extra || 0;

  // 1. Calculamos el límite base de conexiones según el plan
  let baseLimit = 1; // Starter por defecto
  if (plan === 'PRO') baseLimit = 3;
  if (plan === 'ENTERPRISE') baseLimit = 4;

  // 2. Sumamos lo que el usuario tiene en uso actualmente (WA + Todas las demás)
  const totalUsed = lines.length + omniChannels.length;

  // 3. Calculamos el techo máximo (Plan Base + Addons de Conexión Extra)
  const totalMax = baseLimit + lineasExtra;

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Conexiones Multicanal</h1>
          <p className="text-slate-500 mt-1">Gestiona tu ecosistema de WhatsApp, Telegram, Instagram y LINE</p>
        </div>
      </div>

      <LinesTable 
        lines={lines} 
        omniChannels={omniChannels} 
        chatbots={chatbots} 
        unifiedLimit={{ used: totalUsed, max: totalMax }}
      />
    </div>
  )
}