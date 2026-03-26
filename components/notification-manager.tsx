"use client"

import { useEffect, useState } from "react"
import { useSocket } from "@/hooks/use-socket"
import { useNotifications } from "@/contexts/notification-context"
import { usePathname, useRouter } from "next/navigation"
import { useSettings } from "@/hooks/use-settings"
import { MessageCircle } from "lucide-react" 
// 🔥 1. Importamos la función toast de sileo y eliminamos SweetAlert
import { sileo } from 'sileo'

export function NotificationManager() {
  const { socket } = useSocket()
  const { addNotification, syncOfflineNotifications } = useNotifications()
  const pathname = usePathname()
  const { soundEnabled } = useSettings()
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data?.user?.id) {
            setCurrentUserId(String(data.user.id))
            
            // Apenas sabemos quién eres, vamos a buscar lo que te perdiste
            fetchOfflineNotifications()
        }
      })
      .catch(() => {})
  }, [pathname]) 

  const fetchOfflineNotifications = async () => {
    try {
      const res = await fetch('/api/conversations?t=' + Date.now(), { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.data || data.conversations || [])

      const unreadConvs = list.filter((c: any) => 
        c.unread_count && c.unread_count > 0 && c.status !== 'RESOLVED' && c.status !== 'CLOSED'
      )

      if (unreadConvs.length > 0) {
        const offlineNotifs = unreadConvs.map((c: any) => ({
          conversationId: c.id,
          contactName: c.contact_name || c.contact_phone,
          contactPhone: c.contact_phone,
          message: { 
            content: c.last_message || "Tienes mensajes sin leer", 
            type: 'text', 
            is_incoming: true 
          },
          timestamp: c.last_activity || new Date().toISOString()
        }))
        
        syncOfflineNotifications(offlineNotifs)
      }
    } catch (error) {
      console.error("Error sincronizando notificaciones offline:", error)
    }
  }

  const playSound = () => {
    if (!soundEnabled) return;
    try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3")
        audio.volume = 0.5
        audio.play().catch(() => {})
    } catch (e) {}
  }

  // 🔥 2. Eliminamos todo el bloque de "const Toast = Swal.mixin({...})" porque Sileo lo hace solo

  const formatToastContent = (msg: any) => {
    if (!msg) return "Nuevo mensaje recibido";
    const content = msg.content || "";
    const type = msg.type || "";

    if (type === 'audio') return "🎤 Audio recibido";
    if (type === 'document') return "📄 Documento recibido";
    if (type === 'image' || type === 'imagen' || (content.includes("supabase.co") && content.startsWith("http"))) {
        return "📷 Imagen adjunta";
    }
    return content || "Nuevo mensaje recibido";
  }

  useEffect(() => {
    if (!socket || !currentUserId) return

   const handleNewMessage = (data: any) => {
      if (!data.message) return
      if (String(data.usuario_id) !== String(currentUserId)) return;

      // 🔥 1. DETECCIÓN DE PAGO (Punto Verde)
      const isPayment = data.unreadIaPayment === true;

      // Solo notificamos si es entrante o si es un pago (el bot autocompletó el cobro)
      if (data.message.is_incoming === false && !isPayment) return

      addNotification({
        conversationId: data.conversationId,
        contactName: data.contactName || data.contactPhone,
        message: data.message,
        timestamp: new Date().toISOString(),
        isPayment: isPayment // Le pasamos la bandera al contexto
      })

      playSound()
      
      const cleanText = formatToastContent(data.message)
      const nombre = data.contactName || data.contactPhone || 'Desconocido'
      const initial = nombre.charAt(0).toUpperCase()

      // 🔥 2. SI ES UN PAGO (Notificación VIP Verde)
      if (isPayment) {
          const AvatarIcon = (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-sm ring-2 ring-emerald-900">
              <span className="animate-pulse text-xs">💸</span>
            </div>
          )

          sileo.success({
            title: (
               <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-400">
                 ¡Venta IA Confirmada!
               </span>
            ),
            icon: AvatarIcon,
            description: (
               <div className="flex flex-col gap-1 mt-1">
                 <span className="text-xs text-emerald-100/90 font-medium">
                   La IA acaba de cobrarle a {nombre}. Por favor, audita el chat.
                 </span>
               </div>
            ),
            className: "!bg-slate-900/95 !backdrop-blur-md !border-emerald-500/30 !shadow-[0_0_30px_rgba(16,185,129,0.2)]",
            button: {
              title: "Auditar Pago",
              onClick: () => {
                 router.push(`/dashboard/messages?id=${data.conversationId}`)
              },
            },
          })
          return; // Salimos para no mostrar la notificación normal abajo
      }

      // 🔥 3. SI ES UN MENSAJE NORMAL (Notificación Estándar)
      const AvatarIcon = (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white shadow-sm ring-2 ring-slate-800">
          {initial}
        </div>
      )

      sileo.action({
        title: (
           <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
             Nuevo mensaje de {nombre}
           </span>
        ),
        icon: AvatarIcon,
        description: (
           <div className="flex flex-col gap-1 mt-1">
             <span className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-medium">
               "{cleanText}"
             </span>
           </div>
        ),
        className: "!bg-slate-900/95 !backdrop-blur-md !border-slate-800 !shadow-2xl",
        button: {
          title: "Ir al chat",
          onClick: () => {
             router.push(`/dashboard/messages?id=${data.conversationId}`)
          },
        },
      })
    }

    socket.on("new_message", handleNewMessage)
    return () => { socket.off("new_message", handleNewMessage) }
  }, [socket, pathname, addNotification, soundEnabled, currentUserId, router]) 

  return null
}
