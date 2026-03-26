"use client"

import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSettings } from "@/hooks/use-settings"
import Swal from "sweetalert2"

export function AttentionMonitor() {
  const { soundEnabled, desktopNotifications, attentionTimeMinutes } = useSettings()
  
  // Traemos las conversaciones del caché (sin hacer fetch extra si ya están cargadas)
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => [], // 🔥 AGREGA ESTA LÍNEA EXACTAMENTE ASÍ
    staleTime: Infinity
  })

  // Ref para no spamear la misma alerta
  const alertedConversations = useRef<Set<string>>(new Set())

  // 1. LÓGICA DEL TÍTULO DE PESTAÑA (1)
  useEffect(() => {
    if (!desktopNotifications) {
        document.title = "WhatsApp CRM"
        return
    }

    const unreadTotal = Array.isArray(conversations) 
        ? conversations.reduce((acc: number, curr: any) => acc + (curr.unread_count || 0), 0)
        : 0

    if (unreadTotal > 0) {
        document.title = `(${unreadTotal}) 💬 WhatsApp CRM`
    } else {
        document.title = "WhatsApp CRM"
    }
  }, [conversations, desktopNotifications])


  // 2. LÓGICA DEL SEMÁFORO (Traffic Light)
  useEffect(() => {
    if (attentionTimeMinutes <= 0) return

    const checkTrafficLight = () => {
        if (!Array.isArray(conversations)) return

        const now = new Date().getTime()
        const limitMs = attentionTimeMinutes * 60 * 1000 // Minutos a MS

        let dangerCount = 0

        conversations.forEach((c: any) => {
            // Solo nos importan los chats ABIERTOS (OPEN)
            if (c.status !== 'OPEN') return

            const lastActivity = c.last_activity ? new Date(c.last_activity).getTime() : 0
            const diff = now - lastActivity
            
            // CONDICIÓN DE ALERTA:
            // 1. Pasó el tiempo límite
            // 2. Y (Tengo mensajes sin leer O el último mensaje es de ellos y no respondí)
            const isUnread = c.unread_count > 0
            const lastIsTheirs = c.last_message_is_incoming === true
            
            if (diff > limitMs && (isUnread || lastIsTheirs)) {
                // Verificamos si ya alertamos de este chat recientemente para no enloquecer
                if (!alertedConversations.current.has(c.id)) {
                    dangerCount++
                    alertedConversations.current.add(c.id)
                }
            }
        })

        if (dangerCount > 0) {
            // 🔥 SONIDO DE ALERTA (INDEPENDIENTE DEL SWITCH DE CHAT)
            try {
                const alarm = new Audio("/sound/alert-urgent.mp3") // Pon un sonido distinto/fuerte aquí
                alarm.volume = 0.5
                alarm.play().catch(() => {})
            } catch(e) {}

            // 🔥 SWEET ALERT
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 6000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            })

            Toast.fire({
                icon: 'warning',
                title: '¡Atención! Clientes esperando',
                text: `Tienes ${dangerCount} chat(s) superando el tiempo límite de ${attentionTimeMinutes} min.`,
                background: '#fff1f2', // Rojizo
                color: '#be123c'
            })
        }
    }

    // Revisar cada 1 minuto
    const interval = setInterval(checkTrafficLight, 60000)
    return () => clearInterval(interval)

  }, [conversations, attentionTimeMinutes])

  return null // Este componente no renderiza nada visual, es lógico
}
