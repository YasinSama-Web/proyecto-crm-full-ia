"use client"

import { useEffect } from "react"
import { useSocket } from "@/hooks/use-socket" 
import { useRouter } from "next/navigation"
import Swal from "sweetalert2"

export function ConnectionMonitor() {
  const { socket } = useSocket()
  const router = useRouter()

  useEffect(() => {
    if (!socket) return

    // 🔥 AHORA ESCUCHAMOS 'status', que es lo que tu backend emite
    const handleStatusUpdate = (data: { lineId: string, status: string }) => {
      console.log("📡 Cambio de estado recibido:", data)

      // CASO 1: SE CAYÓ LA CONEXIÓN (Logout / Bloqueo / Desconexión manual)
      if (data.status === "DESCONECTADA") {
        
        // 1. Actualiza la UI (Pone el badge en rojo)
        router.refresh()

        // 2. Alerta Visual (Estilo Argon)
        Swal.fire({
          title: '<span class="text-slate-700">¡Whatsapp Desconectado!</span>',
          html: `
            <div class="flex flex-col items-center gap-3">
               <div class="p-4 bg-red-100/50 rounded-full animate-pulse border-4 border-red-50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.17-2.69"/><path d="M22 8.82a15 15 0 0 0-11.21-3.136"/><line x1="1" x2="23" y1="1" y2="23"/></svg>
               </div>
               <p class="text-slate-500 text-sm px-4 text-center">
                 La sesión de WhatsApp se ha cerrado. Necesitas escanear el QR nuevamente para seguir enviando mensajes.
               </p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Ir a Reconectar',
          cancelButtonText: 'Cerrar',
          confirmButtonColor: '#f5365c', // Rojo Argon
          cancelButtonColor: '#e2e8f0',
          
          // Estilos del SweetAlert para que parezca Glass
          background: '#ffffff',
          backdrop: `rgba(15, 23, 42, 0.6) left top no-repeat`,
          customClass: {
            popup: 'rounded-3xl shadow-2xl border border-white/20',
            confirmButton: 'rounded-xl px-6 py-3 font-bold shadow-lg shadow-red-500/30',
            cancelButton: 'rounded-xl px-6 py-3 text-slate-500 hover:bg-slate-100'
          }
        }).then((result) => {
          if (result.isConfirmed) {
            router.push('/dashboard/lines') 
          }
        })
      }
      
      // CASO 2: CONEXIÓN EXITOSA
      if (data.status === "CONECTADA") {
        router.refresh() // Pone el badge en verde
        
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        })
        
        Toast.fire({
            icon: 'success',
            title: 'WhatsApp Conectado',
            background: '#ffffff',
            color: '#1e293b'
        })
      }
    }

    // Escuchar el evento exacto de tu backend
    socket.on("status", handleStatusUpdate)

    return () => {
      socket.off("status", handleStatusUpdate)
    }
  }, [socket, router])

  return null
}
