"use client"

import { useState, useEffect } from "react"
import { ConversationList } from "./conversation-list"
import { ChatView } from "./chat-view"
import { ContactDetails } from "./contact-details"
import { useSocket } from "@/hooks/use-socket"
import { useNotifications } from "@/contexts/notification-context"
import { MessageSquare } from "lucide-react"
import type { Conversacion, LineaWhatsApp, Mensaje } from "@/lib/db-types"
import { useSearchParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

export type Tag = { id: string; name: string; color: string; usage_count?: number }

// 🔥 TIPO ACTUALIZADO CON IA
type ConversacionConStatus = Conversacion & { 
  unread_count: number; 
  last_message: string | null;
  last_message_is_incoming?: boolean;
  status?: string;
  tags?: string[];
  usuario_id?: string;
  ai_profile?: string | null;
  lead_score?: number | null;
  lead_score_reason?: string | null;
  unread_ia_payment?: boolean;
}

// 🔥 AQUÍ ESTABA EL ERROR ANTES: Hay que decirle a TS que vamos a recibir esto
interface Props {
  userId: string 
  initialConversations: ConversacionConStatus[]
  lines: LineaWhatsApp[]
  agents?: any[]
  hasEcommerceAddon: boolean // <--- ¡Esta línea es obligatoria!
}

// 🔥 Y hay que recibirlo aquí en los parámetros
export function MessageCenter({ userId, initialConversations, lines, agents = [], hasEcommerceAddon }: Props) {
  const queryClient = useQueryClient()
  
  const [selectedConversation, setSelectedConversation] = useState<ConversacionConStatus | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const { socket } = useSocket()
  const { clearNotificationsByConversation } = useNotifications()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const searchParams = useSearchParams()
  const router = useRouter()
  const [tab, setTab] = useState("OPEN")
  useEffect(() => {
    fetch('/api/tags')
      .then(res => res.ok ? res.json() : [])
      .then(data => setAvailableTags(data))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
        const savedDrafts = localStorage.getItem("crm_whatsapp_drafts")
        if (savedDrafts) try { setDrafts(JSON.parse(savedDrafts)) } catch (e) {}
    }
  }, [])

  // Inicializar Caché
  // useEffect(() => {
  //     queryClient.setQueryData(['conversations'], initialConversations)
  // }, [initialConversations, queryClient])

  // Modificar Tags fluido
  const handleUpdateConversationTags = (conversationId: string, newTags: string[]) => {
    queryClient.setQueryData(['conversations'], (old: any[]) => {
      if (!old) return old;
      return old.map(c => c.id === conversationId ? { ...c, tags: newTags } : c);
    });
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation((prev) => (prev ? { ...prev, tags: newTags } : null))
    }
  }

  // Modificar Info fluido
  const handleUpdateContactData = (conversationId: string, newData: { name?: string, notes?: string }) => {
    queryClient.setQueryData(['conversations'], (old: any[]) => {
      if (!old) return old;
      return old.map(c => c.id === conversationId ? { ...c, contact_name: newData.name ?? c.contact_name, notes: newData.notes ?? c.notes } : c);
    });
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation((prev) => (prev ? { ...prev, contact_name: newData.name ?? prev.contact_name, notes: newData.notes ?? prev.notes } : null))
    }
  }

  const openConversation = async (conv: any) => {
    if (!conv || !conv.id) return;
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set("id", conv.id)
    router.push(`/dashboard/messages?${newParams.toString()}`, { scroll: false })
    
    if (selectedConversation?.id !== conv.id) setSelectedConversation(conv)
    setMobileShowChat(true)
    clearNotificationsByConversation(conv.id)
    
    // Quitar no leídos de la caché al instante
    queryClient.setQueryData(['conversations'], (old: any[]) => {
      if (!old) return old;
      return old.map(c => c.id === conv.id ? { ...c, unread_count: 0, unread_ia_payment: false } : c);
    });

    try {
      await fetch(`/api/conversations/${conv.id}/read`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true })
    } catch (error) {}
  }

  async function handleToggleStatus(newStatus: string) {
    if (!selectedConversation) return
    const updatedConv = { ...selectedConversation, status: newStatus }
    setSelectedConversation(updatedConv)
    
    queryClient.setQueryData(['conversations'], (old: any[]) => {
      if (!old) return old;
      return old.map(c => c.id === selectedConversation.id ? { ...c, status: newStatus } : c);
    });
    try {
      await fetch(`/api/conversations/${selectedConversation.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) })
    } catch (error) {}
  }

  // 🔥 WEBSOCKETS INYECTANDO A LA CACHÉ (FLUIDEZ) 🔥
  useEffect(() => {
    if (!socket) return

    function onNewMessage(data: { conversationId: string, message: Mensaje, lineId: string, contactPhone: string, contactName?: string, conversationStatus?: string, usuario_id?: string | number }) {
      if (String(data.usuario_id) !== String(userId)) return;

      const isIncoming = data.message.is_incoming === true

      // 🔥 Usamos queryClient en lugar de setConversations para que no haya lag
      queryClient.setQueryData(['conversations'], (old: any[]) => {
        if (!old) return old;
        const existingIndex = old.findIndex((c) => c.id === data.conversationId)
        let updatedList = [...old]

        if (existingIndex !== -1) {
          const existingConv = old[existingIndex]
          const currentCount = Number(existingConv.unread_count || 0)
          const newUnreadCount = isIncoming && selectedConversation?.id !== existingConv.id ? currentCount + 1 : 0

          const updatedConv = {
            ...existingConv,
            last_message: data.message.type === 'audio' ? '🎤 Audio' : (data.message.type === 'image' ? '📷 Imagen' : data.message.content || 'Nuevo mensaje'),
            last_message_is_incoming: isIncoming,
            last_activity: data.message.timestamp,
            contact_name: data.contactName ?? existingConv.contact_name,
            unread_count: newUnreadCount,
            status: data.conversationStatus || existingConv.status,
            unread_ia_payment: data.unreadIaPayment !== undefined ? data.unreadIaPayment : existingConv.unread_ia_payment
          }
          updatedList.splice(existingIndex, 1)
          updatedList.unshift(updatedConv)
        } else {
          const newConv = {
            id: data.conversationId, line_id: data.lineId, contact_phone: data.contactPhone,
            contact_name: data.contactName ?? null, last_message: data.message.content,
            last_message_is_incoming: isIncoming, last_activity: data.message.timestamp,
            unread_count: isIncoming ? 1 : 0, status: data.conversationStatus || 'INBOX', 
            is_conversion: false, conversion_amount: null, fecha_creacion: data.message.timestamp,
            usuario_id: userId, tags: [],
            unread_ia_payment: data.unreadIaPayment || false
          } as any
          updatedList.unshift(newConv)
        }
        return updatedList
      })

      // Actualizar ChatView si estamos en él (Para no perder cerebrito)
      if (selectedConversation?.id === data.conversationId) {
         setSelectedConversation(prev => prev ? {
             ...prev,
             ai_profile: data.ai_profile !== undefined ? data.ai_profile : prev.ai_profile,
             lead_score: data.lead_score !== undefined ? data.lead_score : prev.lead_score,
             unread_ia_payment: data.unreadIaPayment !== undefined ? data.unreadIaPayment : prev.unread_ia_payment
         } : prev);
      }
    }
    
    socket.on("new_message", onNewMessage)
    return () => { socket.off("new_message", onNewMessage) }
  }, [socket, selectedConversation?.id, userId, queryClient])

  const handleDraftChange = (conversationId: string, text: string) => {
    setDrafts(prev => {
      const newDrafts = { ...prev }
      if (!text || !text.trim()) delete newDrafts[conversationId]
      else newDrafts[conversationId] = text
      if (typeof window !== "undefined") localStorage.setItem("crm_whatsapp_drafts", JSON.stringify(newDrafts))
      return newDrafts
    })
  }

  // URL Fluida (Lee de caché, no del estado)
  useEffect(() => {
    const conversationIdFromUrl = searchParams.get("id")
    if (conversationIdFromUrl) {
      const cachedConversations = queryClient.getQueryData<ConversacionConStatus[]>(['conversations']) || initialConversations;
      const targetConversation = cachedConversations.find(c => c.id === conversationIdFromUrl)
      
      if (targetConversation && selectedConversation?.id !== targetConversation.id) {
          setSelectedConversation(targetConversation)
          setMobileShowChat(true)
      }
    }
  }, [searchParams, queryClient])

  const handleMobileBack = () => {
    setMobileShowChat(false)
    setShowDetails(false)
  }

  return (
    <div className="flex flex-row h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] w-full overflow-hidden bg-background">
      <div className={`h-full flex flex-col shrink-0 overflow-hidden border-r border-border w-full md:w-[350px] md:min-w-[300px] md:block ${mobileShowChat ? "hidden md:flex" : "flex"}`}>
          <ConversationList
            userId={userId} 
            selectedId={selectedConversation?.id || ""} 
            onSelect={openConversation}
            lines={lines} 
            drafts={drafts} 
            availableTags={availableTags} 
            agents={agents} 
        />
      </div>

      <div className={`flex-1 flex flex-col relative min-w-0 h-full overflow-hidden ${mobileShowChat ? "flex" : "hidden md:flex"}`}>
        {selectedConversation ? (
          <ChatView
               key={selectedConversation.id} 
               conversation={selectedConversation}
               onToggleDetails={() => setShowDetails(!showDetails)} 
               showDetails={showDetails}
               initialDraft={drafts[selectedConversation.id] || ""} 
               onDraftChange={(text) => handleDraftChange(selectedConversation.id, text)}
               availableTags={availableTags} 
               lines={lines}
               onBack={handleMobileBack} 
               currentUserId={userId} 
               hasEcommerceAddon={hasEcommerceAddon}
               onToggleStatus={(nuevoEstado) => {
                   handleToggleStatus(nuevoEstado); 
                   if (nuevoEstado === "OPEN") setTab("OPEN");
               }}
            />
        ) : (
            <div className="flex flex-col h-full items-center justify-center text-muted-foreground bg-muted/30 dark:bg-[#222e35] border-b-[6px] border-emerald-500">
                <div className="text-center">
                    <MessageSquare className="w-12 h-12 mb-4 mx-auto opacity-20" />
                    <p className="text-sm text-slate-400">Selecciona un chat</p>
                </div>
            </div>
        )}
      </div>

      {showDetails && selectedConversation && (
        <div className="hidden md:block w-[320px] h-full bg-card dark:bg-[#111b21] shrink-0 overflow-y-auto border-l border-border dark:border-gray-800">
          <ContactDetails 
             key={selectedConversation.id} 
             conversation={selectedConversation} 
             onClose={() => setShowDetails(false)} 
             onUpdateConversationTags={handleUpdateConversationTags}
             onUpdateContactData={handleUpdateContactData}
          />
        </div>
      )}
    </div>
  )
}