import { getWorkspaceDetails, getWorkspacePayments, impersonateUser } from "../../actions"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { ArrowLeft, CreditCard, Eye, User, Calendar, Phone, AlertTriangle } from "lucide-react"

// 🔥 Fíjate que cambiamos el tipo de params a Promise
export default async function WorkspaceDetail({ params }: { params: Promise<{ id: string }> }) {
  
  // 🔥 LA MAGIA: Esperamos que Next.js resuelva la URL en producción
  const resolvedParams = await params;
  const workspaceId = resolvedParams.id; 
  
  try {
      const workspace = await getWorkspaceDetails(workspaceId);
      const payments = await getWorkspacePayments(workspaceId);

      // Si sigue sin encontrarlo, mostrará el ID real que intentó buscar
      if (!workspace) {
          return (
            <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center mt-20">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-slate-800">Cliente no encontrado</h1>
                <p className="text-slate-500 mt-2">La base de datos no devolvió datos para el ID: <span className="font-mono bg-slate-100 p-1">{workspaceId}</span></p>
                <Link href="/super-admin" className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                    Volver al panel
                </Link>
            </div>
          )
      }

      return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
          
          {/* HEADER Y NAVEGACIÓN */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/super-admin" className="p-2 bg-white rounded-full hover:bg-slate-100 transition shadow-sm border">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                  {workspace.nombre || "Sin Nombre"}
                  <Badge variant={workspace.subscription_status === 'ACTIVE' ? 'default' : 'destructive'}>
                    {workspace.subscription_status}
                  </Badge>
                </h1>
                <p className="text-slate-500 font-mono text-sm mt-1">{workspace.email} | ID: {workspace.id}</p>
              </div>
            </div>

            {/* BOTÓN MODO ESPEJO */}
            <form action={async () => { "use server"; await impersonateUser(workspace.id); }}>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg transition-all">
                <Eye className="w-4 h-4" />
                Entrar como este usuario
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* COLUMNA IZQUIERDA: DATOS DEL CLIENTE */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest mb-4 border-b pb-2">Datos de Contacto</h3>
                
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">{workspace.nombre || "No especificado"}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-400 italic">Próximamente (Landing Page)</span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">
                    Registrado: {workspace.fecha_creacion ? format(new Date(workspace.fecha_creacion), "d MMM yyyy", { locale: es }) : "Desconocida"}
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-sm space-y-4 text-white">
                <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest mb-4 border-b border-slate-700 pb-2">Suscripción Actual</h3>
                
                <div>
                  <p className="text-xs text-slate-400">Plan</p>
                  <p className="text-xl font-black uppercase tracking-wide">{workspace.plan || "Ninguno"}</p>
                </div>
                
                <div>
                  <p className="text-xs text-slate-400">Método de Pago</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    {workspace.payment_method === 'mercadopago' ? 'Mercado Pago' : workspace.payment_method || 'Manual / No asigado'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">{workspace.plan === 'trial' ? 'Fin de Prueba' : 'Próximo Vencimiento'}</p>
                  <p className="text-sm font-medium text-emerald-400">
                    {workspace.plan === 'trial' && workspace.trial_ends_at 
                      ? format(new Date(workspace.trial_ends_at), "d MMM yyyy", { locale: es })
                      : workspace.plan_expires_at 
                        ? format(new Date(workspace.plan_expires_at), "d MMM yyyy", { locale: es }) 
                        : "Ilimitado"}
                  </p>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: HISTORIAL DE PAGOS */}
            <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Historial de Pagos de Suscripción</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-0">
                {!payments || payments.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center justify-center text-slate-400 h-full">
                    <CreditCard className="w-12 h-12 mb-3 opacity-20" />
                    <p>Aún no hay pagos registrados por este usuario.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white sticky top-0 shadow-sm text-xs text-slate-500 uppercase z-10">
                      <tr>
                        <th className="p-4 font-semibold">Fecha</th>
                        <th className="p-4 font-semibold text-right">Monto</th>
                        <th className="p-4 font-semibold text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-medium text-slate-700">
                            {p.created_at ? format(new Date(p.created_at), "d MMM yyyy, HH:mm", { locale: es }) : "N/A"}
                          </td>
                          <td className="p-4 font-black text-slate-900 text-right">
                            ${Number(p.amount || 0).toLocaleString('es-AR')}
                          </td>
                          <td className="p-4 text-center">
                            <Badge className={`border-none ${p.status === 'APROBADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                              {p.status || 'APROBADO'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer Pegajoso con el Total */}
              <div className="shrink-0 bg-slate-900 p-6 border-t border-slate-800 flex justify-between items-center text-white">
                 <span className="font-bold text-slate-400 uppercase text-xs tracking-widest">LTV (Total Histórico)</span>
                 <span className="text-2xl font-black text-emerald-400">
                   ${payments?.reduce((total: number, p: any) => total + Number(p.amount || 0), 0).toLocaleString('es-AR') || 0}
                 </span>
              </div>
            </div>

          </div>
        </div>
      )
  } catch (error) {
      console.error("Error cargando WorkspaceDetail:", error);
      return (
        <div className="p-8 text-center mt-20">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-800">Error del Servidor</h1>
          <p className="text-slate-500">Hubo un problema al cargar los datos. Revisa los logs de Vercel.</p>
        </div>
      )
  }
}
