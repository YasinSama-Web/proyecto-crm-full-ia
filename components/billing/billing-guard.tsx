"use client"
import { useState, useEffect } from "react"
import { AlertTriangle, Lock, CreditCard, Download, LogOut, X, Loader2, XCircle, Clock, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export function ClientBillingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // Asumimos que es bueno para que el CRM cargue a la velocidad de la luz
  const [isSuspended, setIsSuspended] = useState(false)
  const [isPastDue, setIsPastDue] = useState(false)
  
  const [showGrace, setShowGrace] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Consultamos en segundo plano sin interrumpir los Sockets
useEffect(() => {
    // 🔥 1. Le agregamos 'no-store' para apagar el caché maldito de Next.js
    // 🔥 2. Le sumamos un timestamp a la URL para que siempre sea "nueva"
    const url = `/api/auth/me?t=${Date.now()}`
    
    fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
      .then(res => res.json())
      .then(data => {
        // 🕵️‍♂️ PONEMOS TRAMPAS EN LA CONSOLA (F12)
        console.log("🕵️‍♂️ RESPUESTA DEL API:", data) 
        
        const status = data?.user?.subscription_status?.toUpperCase()
        console.log("🕵️‍♂️ ESTADO DETECTADO POR EL GUARDIA:", status)

        if (status === 'SUSPENDED') {
          setIsSuspended(true)
        } else if (status === 'PAST_DUE') {
          setIsPastDue(true)
          
          try {
            const lastClosed = localStorage.getItem("gracePopupClosedAt")
            if (!lastClosed || (Date.now() - parseInt(lastClosed)) > 3600000) {
              setShowGrace(true)
            } else {
               console.log("⏳ Popup oculto porque no pasó 1 hora desde que se cerró.")
            }
          } catch(e) { 
            setShowGrace(true) 
          }
        }
      })
      .catch(console.error)
  }, [])

  const handleCloseGrace = () => {
    try { localStorage.setItem("gracePopupClosedAt", Date.now().toString()) } catch(e) {}
    setShowGrace(false)
  }

  const handleExport = () => {
    setIsExporting(true)
    setTimeout(() => {
      window.location.href = "/api/contacts/export-sample"
      setIsExporting(false)
    }, 1000)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch(e) { setLoggingOut(false) }
  }

  // 🛑 SEGURIDAD INHACKEABLE: Si está suspendido, NO retornamos {children}. 
  // El CRM se borra del DOM, DevTools no sirve para nada.
 if (isSuspended) {
    return (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://i.ibb.co/yF2230WN/vibrate-with-me-presentation.png')" }}
      >
        {/* Capa oscura superpuesta para que el texto siga siendo 100% legible */}
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"></div>

        {/* Tarjeta Glassmorphism */}
        <div className="relative z-10 w-full max-w-lg bg-slate-950/80 border border-red-900/50 shadow-[0_0_50px_-12px_rgba(220,38,38,0.25)] rounded-2xl overflow-hidden backdrop-blur-md">
          
          <div className="text-center space-y-3 p-6 pt-8">
            <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4 ring-1 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Servicio Suspendido</h2>
            <p className="text-slate-400 text-sm px-4">
              Tu cuenta ha sido bloqueada por falta de pago. Regulariza tu situación para reactivar tu espacio de trabajo.
            </p>
          </div>

          {/* 🧠 LOS PUNTOS PSICOLÓGICOS DE DOLOR */}
          <div className="px-6 pb-2">
            <div className="bg-red-950/30 border border-red-900/30 rounded-xl p-5">
              <h3 className="text-red-400 font-semibold text-xs mb-3 uppercase tracking-wider flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                Acceso temporalmente bloqueado a:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start text-slate-300 text-sm">
                  <XCircle className="w-4 h-4 text-red-500/70 mr-3 mt-0.5 flex-shrink-0" />
                  <span><strong>Historial completo</strong> de clientes y conversaciones.</span>
                </li>
                <li className="flex items-start text-slate-300 text-sm">
                  <XCircle className="w-4 h-4 text-red-500/70 mr-3 mt-0.5 flex-shrink-0" />
                  <span><strong>Operatividad de agentes</strong> (No pueden responder chats).</span>
                </li>
                <li className="flex items-start text-slate-300 text-sm">
                  <XCircle className="w-4 h-4 text-red-500/70 mr-3 mt-0.5 flex-shrink-0" />
                  <span><strong>Base de datos</strong> de contactos y segmentaciones.</span>
                </li>
                <li className="flex items-start text-slate-300 text-sm">
                  <XCircle className="w-4 h-4 text-red-500/70 mr-3 mt-0.5 flex-shrink-0" />
                  <span><strong>Landing pages</strong> y herramientas de captación de leads.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3 p-6 pb-8">
            <button onClick={() => window.open('LINK_DE_PAGO', '_blank')} className="group flex items-center justify-center w-full h-12 text-base font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-lg hover:shadow-red-600/25 active:scale-[0.98]">
              <CreditCard className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
              Renovar Suscripción Ahora
            </button>
            
            <div className="flex gap-3 mt-2">
              <button onClick={handleExport} disabled={isExporting} className="flex items-center justify-center flex-1 h-11 text-sm font-medium bg-slate-900/50 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors disabled:opacity-50">
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {isExporting ? "Preparando..." : "Muestra (10)"}
              </button>
              <button onClick={handleLogout} disabled={loggingOut} className="flex items-center justify-center flex-1 h-11 text-sm font-medium bg-slate-900/50 border border-slate-700 hover:bg-slate-800 text-slate-400 rounded-lg transition-colors">
                {loggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                {loggingOut ? "Saliendo..." : "Cerrar Sesión"}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    )
  }



  // ✅ FLUJO NORMAL Y GRACIA

  return (
    <>
      {/* ⚠️ POPUP DE GRACIA (Aversión a la pérdida) */}
      {isPastDue && showGrace && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)] border border-amber-500/20 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Cabecera de Alerta */}
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-6 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-full backdrop-blur-md">
                  <AlertTriangle className="w-8 h-8 text-amber-950" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-amber-950 tracking-tight">Acción Requerida: Pago Fallido</h2>
                  <p className="text-amber-900 text-sm font-medium mt-0.5">Tu cuenta está en riesgo inminente de suspensión.</p>
                </div>
              </div>
              <button onClick={handleCloseGrace} className="text-amber-950 hover:bg-amber-600/30 p-2 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Cuerpo del Popup */}
            <div className="p-8">
              <p className="text-slate-600 dark:text-slate-300 text-base mb-6">
                No hemos podido procesar la renovación de tu suscripción. Si no actualizas tu método de pago pronto, <strong>tu entorno de trabajo se bloqueará automáticamente</strong>.
              </p>

              {/* 🧠 CAJA DE DOLOR PSICOLÓGICO */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-5 mb-8">
                <h3 className="text-amber-800 dark:text-amber-500 font-bold text-xs mb-4 uppercase tracking-wider flex items-center">
                  <Clock className="w-4 h-4 mr-2 animate-pulse" />
                  Al suspenderse, perderás el acceso a:
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4">
                  <li className="flex items-start text-slate-700 dark:text-slate-300 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-500 mr-2.5 flex-shrink-0 mt-0.5" />
                    <span><strong>Equipos y Agentes</strong> inactivos.</span>
                  </li>
                  <li className="flex items-start text-slate-700 dark:text-slate-300 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-500 mr-2.5 flex-shrink-0 mt-0.5" />
                    <span><strong>Base de Contactos</strong> bloqueada.</span>
                  </li>
                  <li className="flex items-start text-slate-700 dark:text-slate-300 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-500 mr-2.5 flex-shrink-0 mt-0.5" />
                    <span><strong>Métricas y Pagos</strong> en pausa.</span>
                  </li>
                  <li className="flex items-start text-slate-700 dark:text-slate-300 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-500 mr-2.5 flex-shrink-0 mt-0.5" />
                    <span><strong>Mensajes Guardados</strong> sin acceso.</span>
                  </li>
                  <li className="flex items-start text-slate-700 dark:text-slate-300 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-500 mr-2.5 flex-shrink-0 mt-0.5" />
                    <span><strong>Conexiones API</strong> rechazadas.</span>
                  </li>
                  <li className="flex items-start text-slate-700 dark:text-slate-300 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-500 mr-2.5 flex-shrink-0 mt-0.5" />
                    <span><strong>Landings y Tracking Links</strong> caídos.</span>
                  </li>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => window.open('LINK_DE_PAGO', '_blank')} className="group flex-1 flex items-center justify-center h-12 text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg hover:shadow-amber-500/25 transition-all active:scale-[0.98]">
                  <CreditCard className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                  Actualizar Pago Ahora
                </button>
                <button onClick={handleCloseGrace} className="flex-1 h-12 text-base font-medium border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
                  Recordarme más tarde
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* RENDERIZAMOS EL CRM */}
      {children}
    </>
  )
}
