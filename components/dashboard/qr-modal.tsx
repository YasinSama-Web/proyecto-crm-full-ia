"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Smartphone, Loader2, CheckCircle2, XCircle, RefreshCw, AlertTriangle, ScanLine, Wifi } from "lucide-react"
import { io } from "socket.io-client"
import { motion, AnimatePresence } from "framer-motion"

interface LineaWhatsApp {
  id: string
  phone: string
  nombre: string
  status: string
}

type BackendStatus =
  | "PENDING"
  | "CONECTADA"
  | "DESCONECTADA"
  | "QR_EXPIRED"
  | "RETRY_REQUIRED"
  | "RETRYING"
  | "LOGGED_OUT"
  
type UIStatus = "IDLE" | "CONNECTING" | "FINISHING" | BackendStatus

export function QRModal({
  open,
  onOpenChange,
  line,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  line: LineaWhatsApp | null
}) {
  const [uiStatus, setUiStatus] = useState<UIStatus>("IDLE")
  const [qr, setQr] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset al abrir
  useEffect(() => {
    if (open) {
        setUiStatus("IDLE")
        setQr(null)
        setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open || !line) return

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL

    if (!socketUrl) {
      console.error("[v0] [QR] Missing Socket URL")
      setError("Error de configuración del servidor")
      return
    }

    const socket = io(socketUrl, {
      transports: ["websocket"],
      withCredentials: true,
    })

    socket.on("qr", (payload) => {
      if (payload.lineId === line.id) {
        setQr(payload.qr)
        setUiStatus("PENDING")
        setError(null)
      }
    })

    socket.on("status", (payload) => {
      if (payload.lineId !== line.id) return

      const status = payload.status as BackendStatus

      if (status === "CONECTADA") {
        // 🔥 TRUCO UX: Mostramos "Finalizando..." primero
        setUiStatus("FINISHING") 
        setError(null)
        
        // Luego mostramos el éxito
        setTimeout(() => {
            setUiStatus("CONECTADA")
            // Cerramos y recargamos después de mostrar el éxito
            setTimeout(() => {
              onOpenChange(false)
              window.location.reload()
            }, 2000)
        }, 1500)

      } else if (status === "QR_EXPIRED") {
        setUiStatus("QR_EXPIRED")
        setQr(null)
        setError("El código QR expiró")
      } else if (status === "DESCONECTADA" || status === "LOGGED_OUT") {
        setUiStatus("DESCONECTADA")
        setQr(null)
      } else if (status === "PENDING") {
        setUiStatus("PENDING")
      } else if (status === "RETRY_REQUIRED" || status === "RETRYING") {
        setUiStatus("RETRY_REQUIRED")
        setQr(null)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [open, line, onOpenChange])

  const startConnection = async () => {
    if (!line) return
    setUiStatus("CONNECTING") // Generando QR...
    setError(null)
    setQr(null)

    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: line.phone }),
      })

      if (!res.ok) throw new Error("Error al iniciar conexión")
    } catch (err) {
      setUiStatus("IDLE")
      setError("No se pudo contactar al servidor")
    }
  }

  if (!line) return null

  const isIdle = uiStatus === "IDLE" || uiStatus === "DESCONECTADA" || uiStatus === "QR_EXPIRED" || uiStatus === "RETRY_REQUIRED" || !!error

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md bg-slate-900/95 backdrop-blur-2xl border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-3xl">
        
        {/* Header Glass */}
        <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <div>
                <DialogTitle className="text-xl font-bold text-white">Vincular Dispositivo</DialogTitle>
                <p className="text-xs text-slate-400 mt-1">Línea: {line.phone}</p>
            </div>
            {/* Badge de Estado */}
            <Badge 
                variant="outline" 
                className={`
                    ${uiStatus === "CONECTADA" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : 
                      uiStatus === "PENDING" ? "bg-blue-500/20 text-blue-400 border-blue-500/50" : 
                      "bg-slate-800 text-slate-400 border-slate-700"}
                `}
            >
                {uiStatus === "PENDING" ? "ESPERANDO ESCANEO" : 
                 uiStatus === "FINISHING" ? "VINCULANDO..." :
                 uiStatus === "CONECTADA" ? "ONLINE" : "OFFLINE"}
            </Badge>
        </div>

        <div className="p-8 flex flex-col items-center justify-center min-h-[320px]">
          <AnimatePresence mode="wait">
            
            {/* ESTADO 1: IDLE / ERROR (Botón Inicial) */}
            {isIdle && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-6"
              >
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                    <div className="relative h-24 w-24 bg-slate-800 rounded-full flex items-center justify-center border border-white/10 mx-auto">
                        {error ? <AlertTriangle className="h-10 w-10 text-red-400" /> : <Smartphone className="h-10 w-10 text-blue-400" />}
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{error ? "Algo salió mal" : "Listo para conectar"}</h3>
                    <p className="text-sm text-slate-400 max-w-[250px] mx-auto">
                        {error || "Asegúrate de tener tu teléfono con WhatsApp abierto y listo para escanear."}
                    </p>
                </div>

                <Button 
                    onClick={startConnection} 
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-8 py-6 shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
                >
                    {error ? <RefreshCw className="mr-2 h-5 w-5" /> : <Wifi className="mr-2 h-5 w-5" />}
                    {error ? "Reintentar Conexión" : "Generar Código QR"}
                </Button>
              </motion.div>
            )}

            {/* ESTADO 2: CARGANDO (Generando QR) */}
            {uiStatus === "CONNECTING" && (
               <motion.div 
                 key="connecting"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="flex flex-col items-center gap-4"
               >
                  <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
                  <p className="text-sm text-slate-300">Contactando servidor...</p>
               </motion.div>
            )}

            {/* ESTADO 3: MOSTRANDO QR (Esperando Escaneo) */}
            {uiStatus === "PENDING" && qr && (
              <motion.div 
                key="qr"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-4"
              >
                <div className="relative p-1 bg-white rounded-xl shadow-2xl shadow-white/10 mx-auto w-fit">
                    <img src={qr} alt="QR WhatsApp" className="h-64 w-64 rounded-lg" />
                    {/* Scan Line Animation */}
                    <motion.div 
                        initial={{ top: 0 }}
                        animate={{ top: "100%" }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                    />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-white flex items-center justify-center gap-2">
                        <ScanLine className="h-4 w-4 text-blue-400" /> Escanea con tu celular
                    </p>
                    <p className="text-xs text-slate-500">Configuración {">"} Dispositivos Vinculados</p>
                </div>
              </motion.div>
            )}

            {/* ESTADO 4: FINALIZANDO (Transición Spinner) */}
            {uiStatus === "FINISHING" && (
                <motion.div
                    key="finishing"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="text-center space-y-4"
                >
                    <div className="relative h-24 w-24 mx-auto">
                        <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full" />
                        <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <Smartphone className="absolute inset-0 m-auto h-8 w-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Verificando...</h3>
                    <p className="text-sm text-slate-400">Estableciendo conexión segura</p>
                </motion.div>
            )}

            {/* ESTADO 5: ÉXITO (Check Verde) */}
            {uiStatus === "CONECTADA" && (
                <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-6"
                >
                    <div className="h-28 w-28 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                        <CheckCircle2 className="h-14 w-14 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-white">¡Conectado!</h3>
                        <p className="text-slate-400">Tu línea está lista para recibir mensajes.</p>
                    </div>
                </motion.div>
            )}

          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
