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

// 🔥 TIPO GLOBAL PARA ETIQUETAS
export type Tag = { id: string; name: string; color: string; usage_count?: number }

type ConversacionConStatus = Conversacion & { 
  unread_count: number; 
  last_message: string | null;
  last_message_is_incoming?: boolean;
  status?: string;
  tags?: string[];
  usuario_id?: string;
}

interface Props {
  userId: string 
  initialConversations: ConversacionConStatus[]
  lines: LineaWhatsApp[]
  agents?: any[]
}

export function MessageCenter({ userId, initialConversations, lines, agents = [] }: Props) {
  const [conversations, setConversations] = useState<ConversacionConStatus[]>(initialConversations)
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

  // 🔥 EFECTO: Carga los colores reales de las etiquetas para la lista de chats
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

  useEffect(() => {
      setConversations(initialConversations)
  }, [initialConversations])

  const handleUpdateConversationTags = (conversationId: string, newTags: string[]) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, tags: newTags } : c)))
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation((prev) => (prev ? { ...prev, tags: newTags } : null))
    }
  }

  const handleUpdateContactData = (conversationId: string, newData: { name?: string, notes?: string }) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, contact_name: newData.name ?? c.contact_name, notes: newData.notes ?? c.notes } : c)))
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
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)))

    try {
      await fetch(`/api/conversations/${conv.id}/read`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true })
    } catch (error) {}
  }

  async function handleToggleStatus(newStatus: string) {
    if (!selectedConversation) return
    const updatedConv = { ...selectedConversation, status: newStatus }
    setSelectedConversation(updatedConv)
    setConversations((prev) => prev.map((c) => c.id === selectedConversation.id ? { ...c, status: newStatus } : c))
    try {
      await fetch(`/api/conversations/${selectedConversation.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) })
    } catch (error) {}
  }

  useEffect(() => {
    if (!socket) return

    function onNewMessage(data: { conversationId: string, message: Mensaje, lineId: string, contactPhone: string, contactName?: string, conversationStatus?: string, usuario_id?: string | number }) {
      if (String(data.usuario_id) !== String(userId)) return;

      const isIncoming = data.message.is_incoming === true

      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => c.id === data.conversationId)
        let updatedList = [...prev]

        if (existingIndex !== -1) {
          const existingConv = prev[existingIndex]
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
    }
    socket.on("new_message", onNewMessage)
    return () => { socket.off("new_message", onNewMessage) }
  }, [socket, selectedConversation, clearNotificationsByConversation, userId])

  const handleDraftChange = (conversationId: string, text: string) => {
    setDrafts(prev => {
      const newDrafts = { ...prev }
      if (!text || !text.trim()) delete newDrafts[conversationId]
      else newDrafts[conversationId] = text
      if (typeof window !== "undefined") localStorage.setItem("crm_whatsapp_drafts", JSON.stringify(newDrafts))
      return newDrafts
    })
  }

  useEffect(() => {
    const conversationIdFromUrl = searchParams.get("id")
    if (conversationIdFromUrl && conversations.length > 0) {
      const targetConversation = conversations.find(c => c.id === conversationIdFromUrl)
      if (targetConversation) {
        if (selectedConversation?.id !== targetConversation.id) {
            setSelectedConversation(targetConversation)
            setMobileShowChat(true)
        }
      }
    }
  }, [searchParams, conversations])

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
