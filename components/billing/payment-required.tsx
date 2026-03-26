"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Lock, CreditCard, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export function PaymentRequiredScreen({ userId, status }: { userId: string, status: string }) {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [isMounted, setIsMounted] = useState(false) // 🔥 Anti-parpadeos

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleExportContacts = async () => {
    setIsExporting(true)
    setTimeout(() => {
      alert("Se ha descargado una muestra parcial (10 contactos). Para descargar tu base de datos completa, debes regularizar tu pago.")
      setIsExporting(false)
    }, 1500)
  }

  // Si no está montado, o NO está suspendido -> No renderiza NADA
  if (!isMounted || status !== 'SUSPENDED') return null

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 z-50 fixed inset-0">
      <Card className="w-full max-w-lg border-red-900 shadow-2xl shadow-red-900/50 bg-slate-950 text-slate-100">
        <CardHeader className="text-center space-y-4 pb-6 border-b border-slate-800">
          <div className="mx-auto w-16 h-16 bg-red-900/50 text-red-500 rounded-full flex items-center justify-center mb-2">
            <Lock className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Servicio Suspendido
          </CardTitle>
          <p className="text-slate-400 text-sm px-4">
            Tu cuenta ha sido bloqueada por falta de pago. Renueva tu suscripción para recuperar el acceso inmediato a tus chats, agentes y métricas.
          </p>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3 pt-8 pb-8">
          <Button className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white" onClick={() => window.open('LINK_DE_PAGO', '_blank')}>
            <CreditCard className="w-4 h-4 mr-2" />
            Renovar Suscripción Ahora
          </Button>
          <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800" onClick={handleExportContacts} disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Generando muestra..." : "Exportar últimos 10 contactos"}
          </Button>
          <Button variant="ghost" className="w-full text-slate-500 hover:text-slate-300 mt-2" onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' }) 
              router.push('/login')
          }}>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
