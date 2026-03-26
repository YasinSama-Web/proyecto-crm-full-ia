"use client"

import { useState, useMemo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Search, Filter, Inbox, Check, CheckCheck, Loader2, RefreshCcw, DollarSign, MessageSquare, AlertCircle, Archive, Users, ListChecks, X, Tag, UserPlus } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { NewChatDialog } from "@/app/dashboard/chat/new-chat-dialog" 
import { markConversationAsRead } from "@/app/dashboard/conversations/actions"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSocket } from "@/hooks/use-socket" 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

// --- HELPERS VISUALES ---
function SidebarStatus({ status }: { status?: string }) {
  if (status === "read") return <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /> 
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-gray-500" /> 
  if (status === "sent") return <Check className="w-3.5 h-3.5 text-gray-400" /> 
  return <Check className="w-3.5 h-3.5 text-gray-300" /> 
}

function formatTime(dateString: string) {
  if (!dateString) return ""
  try {
    const date = new Date(dateString)
    const now = new Date()
    if (isNaN(date.getTime())) return "" 
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
        return "Ayer"
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
  } catch (e) { return "" }
}

const truncateText = (text: string | null, maxLength: number = 25): string => {
  if (!text) return "..."
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

// --- PROPS ---
interface ConversationListProps {
  userId: string
  selectedId: string
  onSelect: (conv: any) => void
  lines: any[]
  drafts: Record<string, string>
  availableTags: any[] 
  agents?: any[]
  isBoss?: boolean
}

export function ConversationList({ 
  userId, 
  selectedId, 
  onSelect, 
  lines, 
  drafts, 
  availableTags = [],
  agents = [],
  isBoss = false
}: ConversationListProps) {
  
  const queryClient = useQueryClient()
  const { socket } = useSocket()

  // Estados
  const [searchTerm, setSearchTerm] = useState("")
  const [tab, setTab] = useState<"TODOS" | "OPEN" | "INBOX" | "RESOLVED" | "GROUPS">("OPEN")
  const [selectedLines, setSelectedLines] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])    

  const [optimisticSelectedId, setOptimisticSelectedId] = useState<string | null>(null);

  // 🔥 ESTADOS PARA ACCIONES MASIVAS
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  // 🔥 ESTADOS PARA EL MODAL DE ASIGNACIÓN
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedAgentToAssign, setSelectedAgentToAssign] = useState<string | null>(null)
  const [assignNote, setAssignNote] = useState("")

  const [selectedChats, setSelectedChats] = useState<string[]>([])
  const [isProcessingBulk, setIsProcessingBulk] = useState(false)

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  useEffect(() => {
    setOptimisticSelectedId(selectedId);
  }, [selectedId]);

  // --- REACT QUERY ---
  const { data: conversations = [], isLoading, isError } = useQuery({
    queryKey: ['conversations'], 
    queryFn: async () => {
      const res = await fetch('/api/conversations')
      if (!res.ok) throw new Error("Error API")
      const data = await res.json()
      return Array.isArray(data) ? data : (data.data || data.conversations || [])
    },
    staleTime: 0, 
    refetchOnWindowFocus: true, 
    refetchInterval: 30000, 
  })

  // --- SOCKETS Y EVENTOS GLOBALES ---
  useEffect(() => {
      const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ['conversations'] })
      
      if(socket) {
          socket.on('new_message', handleRefresh)
          socket.on('conversation_update', handleRefresh) 
      }
      window.addEventListener('refresh_conversations', handleRefresh)
      
      return () => { 
        if(socket) {
            socket.off('new_message', handleRefresh)
            socket.off('conversation_update', handleRefresh)
        }
        window.removeEventListener('refresh_conversations', handleRefresh)
      }
  }, [socket, queryClient])


// 🔥 REEMPLAZAR toda la lógica de filteredConversations

const isPeerAgent = (assignedId: string) => {
  if (!assignedId || assignedId.length < 10 || assignedId === "null" || assignedId === "undefined") return false;
  const agent = agents.find(a => String(a.id) === assignedId);
  if (!agent) return false; // Si no está en la lista de agentes, lo ignoramos
  const role = String(agent.role || '').toUpperCase();
  const name = String(agent.nombre || agent.name || '').toLowerCase();
  // 🔥 Si se llama soporte o es owner, NO ES UN AGENTE COMPETIDOR
  if (role === 'OWNER' || role === 'SUPER_ADMIN' || name.includes('soporte')) return false;
  return true;
};

const filteredConversations = useMemo(() => {
  if (!conversations || !Array.isArray(conversations)) return [];
  
  const currentUserIdStr = String(userId).trim();
  
  return conversations.filter((c: any) => {
    const status = (c.status || 'INBOX').toUpperCase();
    const isGroup = c.is_group === true || (c.contact_phone && c.contact_phone.includes('-'));
    
    const assignedId = c.assigned_to ? String(c.assigned_to).trim() : "";
    
    // 🔥 REGLA DE ORO: Es de otro agente SOLO SI es un Agente Real Y no soy yo.
    // Si es Soporte, isPeerAgent dará false, por lo que isAssignedToOtherAgent será FALSE.
    const isAssignedToOtherAgent = isPeerAgent(assignedId) && assignedId !== currentUserIdStr;

    let matchesTab = false;

    if (tab === "GROUPS") {
      matchesTab = isGroup && status !== "RESOLVED" && status !== "CLOSED";
    } else if (isGroup) {
      return false;
    } else if (tab === "TODOS") {
      // 🔥 TODOS: Veo todos los activos (Míos y de otros), pero NO los Archivados.
      matchesTab = status === "OPEN" || status === "INBOX" || status === "PENDING";
    } else if (tab === "INBOX") {
      matchesTab = (status === "INBOX" || status === "PENDING");
    } else if (tab === "OPEN") {
      // 🔥 BANDEJA PRINCIPAL (Míos y libres): Veo lo abierto, MENOS lo que tienen los otros Agentes Reales.
      matchesTab = status === "OPEN" && !isAssignedToOtherAgent;
    } else if (tab === "RESOLVED") {
      // 🔥 Le sumamos ABANDONED a la lista
      matchesTab = ['RESOLVED', 'CLOSED', 'FIXED', 'ABANDONED'].includes(status);
    }

    if (!matchesTab) return false;

    const term = searchTerm.toLowerCase();
    const name = (c.contact_name || "").toLowerCase();
    const phone = (c.contact_phone || "");
    if (term && !name.includes(term) && !phone.includes(term)) return false;

    if (selectedLines.length > 0 && !selectedLines.includes(c.line_id || c.lineId)) return false;
    
    // Filtros de etiquetas
    if (selectedTags.length > 0) {
      if (!c.tags || c.tags.length === 0) return false;
      const hasTag = c.tags.some((tagItem: string) => {
        return selectedTags.includes(tagItem) || selectedTags.some(selectedId => {
          const foundTag = availableTags.find(at => at.id === selectedId);
          return foundTag && (foundTag.name === tagItem || foundTag.id === tagItem);
        });
      });
      if (!hasTag) return false;
    }
    
  if (tab === "RESOLVED" && selectedStatuses.length > 0) {
        // Agrupamos los estados de éxito antiguos para que no desaparezcan
        const isSuccess = ['RESOLVED', 'CLOSED', 'FIXED'].includes(status);
        const mappedStatus = isSuccess ? 'RESOLVED' : status;
        
        if (!selectedStatuses.includes(mappedStatus)) return false;
    }
    
    return true;

    
  }).sort((a, b) => {
    const dateA = new Date(a.last_activity || 0).getTime();
    const dateB = new Date(b.last_activity || 0).getTime();
    return dateB - dateA;
  });
}, [conversations, searchTerm, tab, selectedLines, selectedTags, availableTags, userId, agents, selectedStatuses]);

const formatPreview = (text: string | null) => {
  if (!text) return "Sin mensajes";
  if (text.includes("supabase.co/storage")) {
      if (text.includes("-audio-")) return "🎤 Audio";
      if (text.includes("-image-")) return "📷 Imagen";
      return "📎 Archivo adjunto"; 
  }
  return text;
};

// --- CONTADORES ---
const checkIsGroup = (c: any) => c.is_group === true || (c.contact_phone || "").length > 15 || (c.remote_jid && c.remote_jid.endsWith('@g.us'));

const countInbox = Array.isArray(conversations) ? conversations.filter(c => !checkIsGroup(c) && ['INBOX', 'PENDING'].includes((c.status || 'INBOX').toUpperCase())).length : 0;

const countOpen = Array.isArray(conversations) ? conversations.filter((c: any) => {
    const status = (c.status || '').toUpperCase();
    const isGroup = checkIsGroup(c);
    
    const assignedId = c.assigned_to ? String(c.assigned_to).trim() : "";
    const currentUserIdStr = String(userId).trim();
    
    // 🔥 EL MISMO FILTRO DEL RENDERIZADO
    const isAssignedToOtherAgent = isPeerAgent(assignedId) && assignedId !== currentUserIdStr;
    
    return !isGroup && status === 'OPEN' && !isAssignedToOtherAgent;
}).length : 0;

const countResolved = Array.isArray(conversations) ? conversations.filter(c => !checkIsGroup(c) && ['RESOLVED', 'CLOSED', 'FIXED', 'ABANDONED'].includes((c.status || '').toUpperCase())).length : 0;
const countGroups = Array.isArray(conversations) ? conversations.filter(c => checkIsGroup(c) && c.unread_count > 0).length : 0;

const activeFiltersCount = selectedLines.length + selectedTags.length + selectedStatuses.length


// 🔥 FUNCIONES DE ACCIONES MASIVAS
  const toggleSelection = (id: string) => {
    setSelectedChats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Selecciona todos los IDs que estén actualmente filtrados en la pantalla
      setSelectedChats(filteredConversations.map((c: any) => c.id));
    } else {
      // Desmarca todos
      setSelectedChats([]);
    }
  }

  const isAllSelected = filteredConversations.length > 0 && selectedChats.length === filteredConversations.length;

  const handleBulkAction = async (actionType: 'archive' | 'open') => {
    if (selectedChats.length === 0) return;
    setIsProcessingBulk(true);
    try {
      await fetch('/api/conversations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationIds: selectedChats, action: actionType })
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedChats([]);
      setIsSelectionMode(false);
    } catch (error) {
      console.error("Error bulk action", error);
    } finally {
      setIsProcessingBulk(false);
    }
  }

  const handleAssignAction = async () => {
    if (selectedChats.length === 0 || !selectedAgentToAssign) return;
    setIsProcessingBulk(true);
    try {
      await fetch('/api/conversations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationIds: selectedChats, 
          action: 'assign', 
          agentId: selectedAgentToAssign,
          note: assignNote 
        })
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedChats([]);
      setIsSelectionMode(false);
      setIsAssignModalOpen(false); // Cerramos el modal
      setAssignNote(""); // Limpiamos la nota
      setSelectedAgentToAssign(null);
    } catch (error) {
      console.error("Error asignando", error);
    } finally {
      setIsProcessingBulk(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background/50 border-r border-border relative">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 pb-2">
        <h2 className="text-xl font-bold tracking-tight">Conversaciones</h2>
        <NewChatDialog userId={userId} />
      </div>

      {/* TABS (PESTAÑAS) - MEJORADAS CON SCROLL Y TAMAÑO */}
      <div className="px-2 pb-2">
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg overflow-x-auto no-scrollbar">
              <button onClick={() => setTab("TODOS")} className={`shrink-0 px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${tab === "TODOS" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Todos
              </button>
              <button onClick={() => setTab("OPEN")} className={`shrink-0 px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${tab === "OPEN" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Principal {countOpen > 0 && `(${countOpen})`}
              </button>
              <button onClick={() => setTab("INBOX")} className={`shrink-0 px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${tab === "INBOX" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Solicitudes {countInbox > 0 && <span className="ml-1 text-blue-500 font-bold">●</span>}
              </button>
              <button onClick={() => setTab("RESOLVED")} className={`shrink-0 px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${tab === "RESOLVED" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Listos {countResolved > 0 && `(${countResolved})`}
              </button>
              <button onClick={() => setTab("GROUPS")} className={`shrink-0 px-3 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${tab === "GROUPS" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                 <Users className="w-3.5 h-3.5"/> Grupos {countGroups > 0 && `(${countGroups})`}
              </button>
          </div>
      </div>

     {/* BUSCADOR Y FILTROS */}
      <div className="px-4 pb-3 flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        {/* BOTÓN MODO SELECCIÓN MASIVA */}
        <Button 
          variant={isSelectionMode ? "default" : "outline"} 
          onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedChats([]); }} 
          size="icon" 
          className="h-9 w-9 shrink-0 cursor-pointer"
          title="Selección Masiva"
        >
          {isSelectionMode ? <X className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant={activeFiltersCount > 0 ? "secondary" : "outline"} size="icon" className="h-9 w-9 shrink-0 cursor-pointer">
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="end">
             <div className="space-y-4">
                <h4 className="font-semibold text-sm">Filtros</h4>
                
                <div className="space-y-2">
                    <Label className="text-xs">Líneas</Label>
                    {lines.map(line => (
                        <div key={line.id} className="flex items-center space-x-2">
                            <Checkbox checked={selectedLines.includes(line.id)} onCheckedChange={(c) => c ? setSelectedLines([...selectedLines, line.id]) : setSelectedLines(selectedLines.filter(id => id !== line.id))} />
                            <Label className="text-sm">{line.phone}</Label>
                        </div>
                    ))}
                </div>
                
                {availableTags.length > 0 && (
                   <div className="space-y-2">
                       <Label className="text-xs">Etiquetas</Label>
                       <div className="flex flex-wrap gap-2">
                           {availableTags.map(tag => (
                               <div key={tag.id} 
                                   onClick={() => selectedTags.includes(tag.id) ? setSelectedTags(selectedTags.filter(t => t !== tag.id)) : setSelectedTags([...selectedTags, tag.id])}
                                   className={`text-[10px] px-2 py-1 rounded-full cursor-pointer border transition-colors ${selectedTags.includes(tag.id) ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-muted border-transparent text-muted-foreground'}`}
                               >
                                   {tag.name}
                               </div>
                           ))}
                       </div>
                   </div>
                )}

                {/* 🔥 NUEVA SECCIÓN DE ESTADOS (Solo visible en pestaña Listos) */}
                {tab === "RESOLVED" && (
                    <div className="space-y-2 pt-2 border-t border-border">
                        <Label className="text-xs">Estado de Cierre</Label>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox checked={selectedStatuses.includes('RESOLVED')} onCheckedChange={(c) => c ? setSelectedStatuses([...selectedStatuses, 'RESOLVED']) : setSelectedStatuses(selectedStatuses.filter(s => s !== 'RESOLVED'))} />
                                <Label className="text-sm text-emerald-600 font-medium cursor-pointer">Resueltos (Éxito)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox checked={selectedStatuses.includes('ABANDONED')} onCheckedChange={(c) => c ? setSelectedStatuses([...selectedStatuses, 'ABANDONED']) : setSelectedStatuses(selectedStatuses.filter(s => s !== 'ABANDONED'))} />
                                <Label className="text-sm text-slate-500 font-medium cursor-pointer">Descartados</Label>
                            </div>
                        </div>
                    </div>
                )}

             </div>
          </PopoverContent>
        </Popover>
      </div>

      {isSelectionMode && filteredConversations.length > 0 && (
        <div className="px-4 pb-2 flex items-center gap-2 border-b border-border/30 animate-in fade-in slide-in-from-top-2">
          <Checkbox 
            id="select-all" 
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <Label htmlFor="select-all" className="text-xs font-medium text-muted-foreground cursor-pointer select-none">
            Seleccionar todos ({filteredConversations.length})
          </Label>
        </div>
      )}
      
      {/* LISTA DE CHATS */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
          <ScrollArea className="h-full w-full">
            <div className="flex flex-col px-3 pb-20 pt-1 gap-1.5">
              {isLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>}
              {isError && <div className="text-center py-10 text-red-500 text-sm">Error cargando chats</div>}

              {/* 🔥 MENSAJE DE VACÍO (CORREGIDO) */}
              {!isLoading && !isError && filteredConversations.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-sm flex flex-col items-center">
                    {tab === "RESOLVED" ? <Archive className="h-10 w-10 opacity-20 mb-2" /> : <Inbox className="h-10 w-10 opacity-20 mb-2" />}
                    <p>No hay chats en esta sección.</p>
                </div>
              )}

              {/* 🔥 RENDERIZADO DE CHATS (YA NO ESTÁ ATRAPADO) */}
              {filteredConversations.map((conv: any) => {
                  const isSelected = optimisticSelectedId === conv.id || selectedId === conv.id
                  const hasDraft = drafts[conv.id] && drafts[conv.id].trim().length > 0
                  const isChecked = selectedChats.includes(conv.id)
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={(e) => {
                          if (isSelectionMode) {
                              e.preventDefault();
                              toggleSelection(conv.id);
                              return;
                          }
                          setOptimisticSelectedId(conv.id); 
                          onSelect(conv);                    
                          if (conv.unread_count > 0) {
                              markConversationAsRead(conv.lineId || conv.line_id, conv.id).catch(() => {})
                              conv.unread_count = 0 ;
                              conv.unread_ia_payment = false;
                          }
                      }}
                      className={`
                        w-full text-left p-3 rounded-xl transition-all duration-200 group relative border overflow-hidden cursor-pointer
                        ${isSelected && !isSelectionMode ? "bg-primary text-primary-foreground shadow-md border-primary/50" : "bg-card hover:bg-muted/50 border-border/40 hover:border-border"}
                        ${isChecked && isSelectionMode ? "ring-2 ring-primary bg-primary/5" : ""}
                      `}
                    >
                       <div className="flex items-center gap-3 w-full min-w-0">
                         
                         {/* MODO SELECCIÓN CHECKBOX */}
                         {isSelectionMode && (
                           <div className="shrink-0">
                             <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 bg-background'}`}>
                               {isChecked && <Check className="h-3 w-3" />}
                             </div>
                           </div>
                         )}

                         {/* AVATAR */}
                         <div className="relative shrink-0">
                             <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${isSelected && !isSelectionMode ? "bg-white/20 text-white" : "bg-muted text-foreground"}`}>
                                 {(conv.contact_name?.[0] || conv.contact_phone?.[0] || "#").toUpperCase()}
                             </div>
                             
                             {/* 🔥 LÓGICA DE PUNTOS: Verde (Venta IA) vs Rojo (Mensaje Normal) */}
                             {conv.unread_ia_payment ? (
                                <span className="absolute -top-1 -right-4 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm shadow-emerald-500/50 animate-pulse ring-2 ring-background z-10" title="Pago procesado por IA">
                                    <DollarSign className="w-3 h-3" /> IA
                                </span>
                             ) : conv.unread_count > 0 ? (
                                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold ring-2 ring-background z-10 shadow-sm shadow-red-500/30">
                                    {conv.unread_count}
                                </span>
                             ) : null}
                         </div>

                         {/* CONTENIDO PRINCIPAL */}
                         <div className="flex flex-col flex-1 min-w-0">
                             
                             {/* 1. Nombre y Hora */}
                              <div className="flex justify-between items-start mb-1 w-full min-w-0">
                                  <span className={`font-semibold truncate text-sm flex-1 min-w-0 pr-2 pt-0.5 ${isSelected && !isSelectionMode ? 'text-white' : 'text-foreground'}`}>
                                      {conv.contact_name || conv.contact_phone}
                                  </span>
                                  
                                  {/* 🔥 COLUMNA DERECHA: Etiquetas + Hora */}
                                  <div className="flex flex-col items-end shrink-0 gap-1">
                                      {tab === "RESOLVED" && (conv.status === 'ABANDONED' || conv.status === 'abandoned') && (
                                          <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded-[4px] border border-slate-200 font-bold uppercase tracking-wider">Descartado</span>
                                      )}
                                      {tab === "RESOLVED" && (conv.status === 'RESOLVED' || conv.status === 'resolved') && (
                                          <span className="bg-emerald-50 text-emerald-600 text-[9px] px-1.5 py-0.5 rounded-[4px] border border-emerald-200 font-bold uppercase tracking-wider">Resuelto</span>
                                      )}
                                      
                                      <span className={`text-[10px] ${isSelected && !isSelectionMode ? 'text-white/70' : 'text-muted-foreground/70'}`}>
                                          {formatTime(conv.last_activity)}
                                      </span>
                                  </div>
                              </div>
                             
                            {/* 2. Etiquetas y Estado de Asignación Interno */}
                             <div className="flex flex-wrap gap-1 mb-1 overflow-hidden h-4.5">
                                 
                                 {/* 🔥 ETIQUETA INTERNA (Limpia de Owners) */}
                                 {(() => {
                                     const assignedId = conv.assigned_to ? String(conv.assigned_to).trim() : "";
                                     const currentUserIdStr = String(userId).trim();
                                     
                                     // 1. Si es mío, no muestro etiqueta
                                     if (assignedId === currentUserIdStr) return null;
                                     
                                     // 2. Si no es un "Agente Real" (es decir, es Soporte o null), no muestro etiqueta
                                     if (!isPeerAgent(assignedId)) return null;

                                     const assignedAgent = agents.find(a => String(a.id) === assignedId);
                                     if (!assignedAgent) return null;

                                     // No mostrar badge para OWNER/ADMIN
                                     const agentRole = (assignedAgent.role || '').toUpperCase();
                                     if (agentRole === 'OWNER' || agentRole === 'ADMIN') return null;

                                     const agentName = assignedAgent.nombre || assignedAgent.name || (assignedAgent.email ? assignedAgent.email.split('@')[0] : "Agente");
                                     
                                     return (
                                         <span 
                                             className="text-[9px] px-1.5 rounded-[3px] font-bold border truncate max-w-[90px] flex items-center" 
                                             style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#f3e8ff', color: isSelected ? '#fff' : '#7e22ce', borderColor: isSelected ? 'transparent' : '#e9d5ff' }}
                                         >
                                             👤 {agentName}
                                         </span>
                                     );
                                 })()}

                                 {/* 🔥 Etiquetas Oficiales (Deduplicación Extrema) */}
                                 {conv.tags && conv.tags.length > 0 && (
                                     <>
                                         {Array.from(new Set(
                                             conv.tags
                                             .filter((t: any) => typeof t === 'string' && t.length < 25) 
                                             .map((t: string) => {
                                                 const clean = t.trim().toLowerCase();
                                                 const found = availableTags?.find(at => at.name.trim().toLowerCase() === clean || at.id === t);
                                                 return found ? found.name.trim() : t.trim(); 
                                             })
                                         )).map((displayName: any) => {
                                             const tagObj = availableTags?.find(at => at.name.trim() === displayName);
                                             const color = tagObj?.color || "#888888";
                                             
                                             return (
                                                 <span key={displayName} className="text-[9px] px-1.5 rounded-[3px] font-bold border truncate max-w-[80px]" style={{ backgroundColor: isSelected && !isSelectionMode ? 'rgba(255,255,255,0.2)' : `${color}15`, color: isSelected && !isSelectionMode ? '#fff' : color, borderColor: isSelected && !isSelectionMode ? 'transparent' : `${color}30` }}>
                                                     {displayName}
                                                 </span>
                                             )
                                         })}
                                     </>
                                 )}
                             </div>

                             {/* 3. Mensaje / Borrador */}
                             <div className="flex items-center gap-1.5 w-full min-w-0 mt-0.5">
                                 {!conv.last_message_is_incoming && !hasDraft && (
                                     <div className={`shrink-0 ${isSelected && !isSelectionMode ? 'text-white/80' : 'text-muted-foreground'}`}>
                                         <SidebarStatus status={conv.last_message_status} />
                                     </div>
                                 )}
                                 
                                 {hasDraft ? (
                                     <p className="text-red-500 italic text-[13px] min-w-0 flex-1">
                                       Borrador: {truncateText(drafts[conv.id], 20)}
                                     </p>
                                 ) : (
                                    <p className={`text-[13px] min-w-0 flex-1 ${isSelected && !isSelectionMode ? 'text-white/90' : 'text-muted-foreground'}`}>
                                      {!conv.last_message_is_incoming && <span className="opacity-70 font-medium mr-1 shrink-0">Tú:</span>}
                                      {truncateText(formatPreview(conv.last_message), 25)}
                                    </p>
                                 )}
                             </div>

                         </div>
                       </div>
                    </button>
                  )
              })}
            </div>
          </ScrollArea>

          {/* 🔥 BARRA FLOTANTE DE ACCIONES MASIVAS */}
         {/* 🔥 BARRA FLOTANTE DE ACCIONES MASIVAS */}
          {isSelectionMode && selectedChats.length > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl px-4 py-3 flex items-center justify-between z-50 animate-in slide-in-from-bottom-5">
              <span className="text-sm font-bold bg-primary text-primary-foreground h-6 w-6 flex items-center justify-center rounded-full shrink-0">
                {selectedChats.length}
              </span>
              
              <div className="flex gap-2">
                
                {/* BOTÓN PRINCIPAL DINÁMICO SEGÚN LA PESTAÑA */}
                {tab === "RESOLVED" ? (
                  <Button size="sm" variant="secondary" onClick={() => handleBulkAction('open')} disabled={isProcessingBulk} className="h-8 cursor-pointer hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/50">
                    {isProcessingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-1.5" />}
                    A Principal
                  </Button>
                ) : tab === "INBOX" ? (
                  <Button size="sm" variant="secondary" onClick={() => handleBulkAction('open')} disabled={isProcessingBulk} className="h-8 cursor-pointer hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/50">
                    {isProcessingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-1.5" />}
                    Atender
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => handleBulkAction('archive')} disabled={isProcessingBulk} className="h-8 cursor-pointer hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/50">
                    {isProcessingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4 mr-1.5" />}
                    Archivar
                  </Button>
                )}
                
                {/* BOTÓN ETIQUETAR (CON MENÚ DESPLEGABLE) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 cursor-pointer" title="Etiquetar">
                      <Tag className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="center" side="top">
                    <p className="text-xs font-bold text-muted-foreground mb-2 px-2">Aplicar etiqueta a {selectedChats.length} chats</p>
                    <div className="space-y-1">
                      {availableTags.map(tag => (
                        <button 
                          key={tag.id}
                          onClick={async () => {
                            setIsProcessingBulk(true);
                            try {
                              await fetch('/api/conversations/bulk', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ conversationIds: selectedChats, action: 'tag', tagId: tag.id, tagName: tag.name })
                              });
                              queryClient.invalidateQueries({ queryKey: ['conversations'] });
                              setSelectedChats([]);
                              setIsSelectionMode(false);
                            } catch (error) { console.error("Error tagging", error); } 
                            finally { setIsProcessingBulk(false); }
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-muted transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#888' }} />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* BOTÓN ASIGNAR (Lo dejamos preparado visualmente) */}
                <Button size="sm" variant="outline" className="h-8 cursor-pointer" title="Asignar a agente" onClick={() => setIsAssignModalOpen(true)}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

      </div>
      {/* 🚀 MODAL DE ASIGNACIÓN DE AGENTES */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-md border-border bg-background">
          <DialogHeader>
            <DialogTitle>Transferir {selectedChats.length} conversación(es)</DialogTitle>
            <DialogDescription>
              Selecciona al agente que se hará cargo y déjale una nota de contexto.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Equipo Disponible</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto no-scrollbar p-1">
                {agents
                  // 🔥 1. FILTRO: Sacamos al usuario actual Y al Dueño (OWNER)
                  .filter(a => a.id !== userId && a.role !== 'OWNER')
                  .map(agent => {
                    // 🔥 2. SALVAVIDAS: Si no viene "nombre", buscamos "name" o usamos el email
                    const agentName = agent.nombre || agent.name || (agent.email ? agent.email.split('@')[0] : "Agente");
                    const initial = agentName.charAt(0).toUpperCase();

                    return (
                      <div 
                        key={agent.id}
                        onClick={() => setSelectedAgentToAssign(agent.id)}
                        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer border-2 transition-all ${selectedAgentToAssign === agent.id ? 'border-violet-500 bg-violet-500/10' : 'border-border/50 hover:border-violet-500/30'}`}
                      >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{agentName}</p>
                          {/* Opcional: Mostramos el rol pequeñito abajo */}
                          <p className="text-[10px] text-muted-foreground capitalize">{agent.role?.toLowerCase() || 'Agente'}</p>
                        </div>
                        {selectedAgentToAssign === agent.id && <Check className="w-4 h-4 text-violet-500 shrink-0" />}
                      </div>
                    )
                })}
                
                {agents.filter(a => a.id !== userId && a.role !== 'OWNER').length === 0 && (
                  <p className="text-xs text-muted-foreground col-span-2 text-center py-4">No hay agentes disponibles para transferir.</p>
                )}
                {agents.length <= 1 && (
                  <p className="text-xs text-muted-foreground col-span-2 text-center py-4">No hay otros agentes disponibles en tu equipo.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nota Interna (Opcional)</Label>
              <Textarea 
                placeholder="Ej: Te paso este cliente, está enojado por un retraso..."
                className="resize-none h-20 text-sm bg-muted/50 border-border"
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-2">
            <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleAssignAction} 
              disabled={!selectedAgentToAssign || isProcessingBulk}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isProcessingBulk ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
              Transferir Chats
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
