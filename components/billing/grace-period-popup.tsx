"use client"
import { useState, useEffect } from "react"
import { AlertTriangle, X } from "lucide-react"

export function GracePopup() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Al cargar en el navegador, revisamos si debemos mostrarlo
    try {
      const lastClosed = localStorage.getItem("gracePopupClosedAt")
      const now = Date.now()
      if (!lastClosed || now - parseInt(lastClosed) > 3600000) {
        setIsOpen(true)
      }
    } catch (e) {
      setIsOpen(true)
    }
  }, [])

  const handleClose = () => {
    try { localStorage.setItem("gracePopupClosedAt", Date.now().toString()) } catch(e) {}
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="bg-yellow-500 p-6 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-900" />
            <div>
              <h2 className="text-xl font-bold text-yellow-900">Problema con tu pago</h2>
              <p className="text-yellow-800 text-sm">Tu suscripción vence en menos de 24 horas.</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-yellow-900 hover:bg-yellow-600/50 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8">
          <p className="text-slate-700 dark:text-slate-300 text-lg mb-6">
            Hemos intentado procesar tu pago sin éxito. Si no actualizas tu método de pago pronto, tu cuenta pasará a estado <strong>Suspendido</strong>.
          </p>
          <div className="flex gap-4">
            <button onClick={() => window.open('LINK_DE_PAGO', '_blank')} className="flex items-center justify-center flex-1 h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-md">
              Pagar ahora y evitar suspensión
            </button>
            <button onClick={handleClose} className="flex-1 h-12 text-base font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors">
              Recordarme en 1 hora
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
