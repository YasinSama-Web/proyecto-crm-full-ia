import { getWorkspacesSummary, toggleWorkspaceStatus, updatePlanReal } from "./actions"
import { Badge } from "@/components/ui/badge"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Search, Eye, History, User } from "lucide-react"
import { AdminSearch } from "./components/AdminSearch"
import Link from "next/link"
import { PlanSelectClient } from "./components/planSelectClient"
import { StatusToggleClient } from "./components/StatusToggleClient"

export default async function SuperAdminPage({ searchParams }: { searchParams: { q?: string } }) {
  const cookieStore = await cookies()
  const superAdminSession = cookieStore.get("super_admin_session")
  const query = searchParams.q || "";
  const workspaces = await getWorkspacesSummary(query);

  if (!superAdminSession) {
    redirect("/super-admin/login")
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">CORE COMMAND</h1>
          <p className="text-slate-500 font-medium">Gestión global de infraestructura y suscripciones.</p>
        </div>
        <div className="flex gap-4">
            <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Workspaces</p>
                <p className="text-2xl font-black text-blue-600">{workspaces.length}</p>
            </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <AdminSearch defaultValue={query} /> 
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="p-5 text-xs uppercase font-bold text-slate-400">Workspace / Owner</th>
              <th className="p-5 text-xs uppercase font-bold text-slate-400 text-center">Consumo IA</th>
              <th className="p-5 text-xs uppercase font-bold text-slate-400 text-center">Plan Actual</th>
              <th className="p-5 text-xs uppercase font-bold text-slate-400 text-center">Vencimiento</th>
              <th className="p-5 text-xs uppercase font-bold text-slate-400 text-center">Estado</th>
              <th className="p-5 text-xs uppercase font-bold text-slate-400 text-right">Acciones Rápidas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {workspaces.map((ws: any) => (
              <tr key={ws.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="p-5">
                  <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{ws.email}</div>
                  <div className="text-[10px] font-mono text-slate-400">ID: {ws.id}</div>
                </td>
                
                <td className="p-5 text-center">
                   <div className="flex flex-col items-center">
                     <span className="text-lg font-bold text-slate-700">{ws.ai_tokens_used || 0}</span>
                     <span className="text-[10px] text-slate-400 uppercase">Mensajes IA</span>
                   </div>
                </td>

             <td className="p-5 text-center">
  <PlanSelectClient workspaceId={ws.id} currentPlan={ws.plan} />
</td>

                <td className="p-5 text-center">
                  <div className="text-sm font-medium text-slate-600">
                    {ws.plan_expires_at ? format(new Date(ws.plan_expires_at), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                  </div>
                </td>

                <td className="p-5 text-center text-[10px] font-bold text-slate-500 uppercase">
    {ws.payment_method === 'mercadopago' ? (
        <Badge className="bg-blue-100 text-blue-600 border-none">Mercado Pago</Badge>
    ) : ws.payment_method}
  </td>

                <td className="p-5 text-center">
    <div className="flex flex-col">
        <span className="text-[10px] font-bold text-slate-600">
            {ws.plan === 'trial' ? 'Finaliza Prueba:' : 'Vencimiento:'}
        </span>
        <span className="text-xs font-medium text-slate-400">
            {ws.plan === 'trial' 
              ? format(new Date(ws.trial_ends_at), 'dd MMM yyyy') 
              : format(new Date(ws.plan_expires_at), 'dd MMM yyyy')}
        </span>
    </div>
  </td>

                <td className="p-5">
  <div className="flex justify-center">
    <StatusToggleClient workspaceId={ws.id} currentStatus={ws.subscription_status} />
  </div>
</td>

              <td className="p-5 text-right">
                  <div className="flex justify-end gap-2">
                    {/* 🔥 BOTÓN HISTORIAL */}
                    <Link 
    href={`/super-admin/workspace/${ws.id}`} 
    className="text-blue-600 font-bold text-xs hover:underline hover:text-blue-800 transition-colors flex items-center justify-end gap-1"
  >
    Ver Historial <span className="text-lg leading-none">→</span>
  </Link>

                    {/* 🔥 BOTÓN MODO ESPEJO (Solo Lectura) */}
                    <form action={async () => {
                        "use server"
                        // Aquí crearíamos una cookie 'session' con el ID del usuario
                        // pero con un flag de 'read-only'
                        console.log("Entrando como:", ws.id)
                    }}>
                        <button className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm title='Entrar como usuario'">
                            <Eye className="w-4 h-4" />
                        </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
