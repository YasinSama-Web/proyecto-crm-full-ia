"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Mensaje } from "@/lib/db-types"

interface NotificationData {
  conversationId: string
  contactName: string
  contactPhone?: string
  message: Mensaje | any
  timestamp: string
  isPayment?: boolean
  isFurious?: boolean // 🔥 NUEVO: Identificador de alerta roja
}

interface NotificationContextType {
  notifications: NotificationData[]
  unreadCount: number
  unreadPaymentsCount: number
  addNotification: (notification: NotificationData) => void
  clearNotifications: () => void
  clearAllNotifications: () => void // 🔥 NUEVO: Función para limpiar todo
  clearNotificationsByConversation: (conversationId: string) => void
  syncOfflineNotifications: (notifications: NotificationData[]) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("crm_notifications")
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setNotifications(Array.isArray(parsed) ? parsed : [])
        } catch (error) { setNotifications([]) }
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
        localStorage.setItem("crm_notifications", JSON.stringify(notifications))
    }
  }, [notifications])

  const addNotification = (notification: NotificationData) => {
    // Si no es un mensaje entrante Y tampoco es un pago, lo ignoramos
    if (notification.message?.is_incoming === false && !notification.isPayment) return

    setNotifications((prev) => {
      const currentNotifications = Array.isArray(prev) ? prev : []
      
      // Evitar duplicados (Si es pago o furioso, NO bloqueamos por tiempo para asegurar que entre)
      if (!notification.isPayment && !notification.isFurious) {
          const isDuplicate = currentNotifications.some(
            (n) =>
              n.conversationId === notification.conversationId &&
              !n.isPayment && !n.isFurious &&
              Math.abs(new Date(n.timestamp).getTime() - new Date(notification.timestamp).getTime()) < 10000
          )
          if (isDuplicate) return currentNotifications
      }
      
      return [notification, ...currentNotifications].slice(0, 50)
    })
  }

  const syncOfflineNotifications = (offlineNotifs: NotificationData[]) => {
    setNotifications((prev) => {
      const current = Array.isArray(prev) ? prev : []
      const merged = [...offlineNotifs, ...current]
      
      const unique = Array.from(new Map(merged.map(item => [item.conversationId, item])).values())
      
      return unique.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50)
    })
  }

  const clearNotifications = () => setNotifications([])
  const clearAllNotifications = () => setNotifications([]) // 🔥 La función que faltaba

  const clearNotificationsByConversation = (conversationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.conversationId !== conversationId))
  }

  const unreadCount = notifications.length
  const unreadPaymentsCount = notifications.filter(n => n.isPayment).length;

  return (
    <NotificationContext.Provider value={{ 
        notifications, unreadCount, unreadPaymentsCount, addNotification, clearNotifications, 
        clearAllNotifications, // 🔥 Exportada
        clearNotificationsByConversation, syncOfflineNotifications 
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error("useNotifications must be used within NotificationProvider")
  return context
}