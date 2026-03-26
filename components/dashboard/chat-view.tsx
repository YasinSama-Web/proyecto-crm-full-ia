"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo  } from "react"
import { Button } from "@/components/ui/button"
import {
  Bot, Send, Loader2, PanelRightClose, PanelRight, CheckCheck, Check,
  RefreshCcw, Paperclip, X, Sparkles, CheckCircle, UserPlus, Smile, Mic, CheckCircle2,
  MoreVertical, LogOut, Info, ChevronLeft, Pause, Trash2, Reply, ChevronDown, XCircle, DollarSign, TrendingUp
} from "lucide-react"
import type { Conversacion, Mensaje } from "@/lib/db-types"
import { useSocket } from "@/hooks/use-socket"
import { uploadImage } from "@/lib/supabase-client"
import Swal from 'sweetalert2'
import { getQuickReplies } from "@/app/dashboard/automations/actions"
import { registerSale, sendMessage, registerSaleFromChat } from "@/app/dashboard/messages/actions"
import { motion, AnimatePresence } from "framer-motion"
import EmojiPicker, { Theme } from "emoji-picker-react"
import { useTheme } from "next-themes"
import { markConversationAsRead } from "@/app/dashboard/conversations/actions"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSettings } from "@/hooks/use-settings"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AudioMessage } from "@/components/AudioMessage"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

type ConversacionConStatus = Conversacion & {
  unread_count: number; 
  last_message: string | null; 
  status?: string;
  line_id?: string; 
  lineId?: string; 
  usuario_id?: string
  contact_name?: string; 
  contact_phone?: string; 
  is_group?: boolean;
  assigned_to?: string | null;
  transferred_from?: string | null;
  transfer_note?: string | null;
  assigned_at?: Date | null;
  bot_enabled?: boolean;
}

type MensajeExtendido = Mensaje & { 
    amount?: number; processed_by_ai?: boolean; sender_name?: string;
    quoted_content?: string; quoted_participant?: string;
    whatsapp_id?: string; 
    quoted_message_id?: string; 
}

interface ChatViewProps {
  conversation: ConversacionConStatus | null
  onToggleDetails: () => void
  showDetails: boolean
  initialDraft?: string
  currentUserId: string
  onDraftChange?: (text: string) => void
  availableTags?: any[]
  onBack?: () => void
  onToggleStatus?: (nuevoEstado: string) => void;
  agents?: any[];
  lines?: any[];
}

const formatMessageText = (text: string | undefined | null) => {
    if (!text) return null;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline break-all">
                    {part}
                </a>
            );
        }

        const mentionRegex = /@(\d{8,15})/g; 
        const mentionParts = part.split(mentionRegex);

        return mentionParts.map((mPart, mIndex) => {
            if (mIndex % 2 === 1) { 
                return (
                    <span key={`${index}-${mIndex}`} className="text-blue-200 dark:text-blue-400 font-bold cursor-pointer hover:underline bg-black/10 px-1 rounded-md">
                        @{mPart}
                    </span>
                );
            }
            return mPart;
        });
    });
};

function MessageStatus({ status }: { status?: string }) {
  if (status === "read") return <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /> 
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-white/70" /> 
  if (status === "sent") return <Check className="w-3.5 h-3.5 text-white/70" /> 
  return <Check className="w-3.5 h-3.5 text-white/40" /> 
}

function ImageMessageWithAI({ message, imageSource, conversationId, isIncoming }: { message: MensajeExtendido, imageSource: string, conversationId: string, isIncoming: boolean }) {
  const [loading, setLoading] = useState(false)
  const [localData, setLocalData] = useState({ amount: message.amount, processed: message.processed_by_ai })

  const handleAnalyze = async () => {
    setLoading(true)
    let fraudTimer; 

    Swal.fire({
      title: 'Analizando comprobante...',
      html: 'Extrayendo datos con IA 🤖',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
        fraudTimer = setTimeout(() => {
          const b = Swal.getHtmlContainer();
          if (b) {
            b.innerHTML = '<span style="color: #f59e0b; font-weight: bold;">⚠️ Análisis en curso...<br/>Evaluando reglas de seguridad 🛡️</span>';
          }
        }, 3500);
      }
    });

    try {
      const resAnalysis = await fetch('/api/messages/analyze', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ imageUrl: imageSource }) 
      })
      const dataAnalysis = await resAnalysis.json()
      clearTimeout(fraudTimer);

      if (dataAnalysis.success) {
        const isSuspicious = dataAnalysis.needs_manual_review;
        const reasonText = dataAnalysis.review_reason || "Revisión manual requerida";
        const creditosRestantes = dataAnalysis.remaining_credits;
        
        let badgesHtml = '';
        if (isSuspicious) {
            badgesHtml = `<div class="mt-4 flex justify-center">
                <span style="background-color: #fee2e2; color: #b91c1c; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid #fca5a5;">
                  🛑 ${reasonText}
                </span>
            </div>`;
        }

        const titleText = isSuspicious ? '⚠️ Retención de Seguridad' : 'Confirmar Ingreso';
        const iconType = isSuspicious ? 'warning' : 'question';
        const colorHex = isSuspicious ? '#f59e0b' : '#059669'; 
        const btnText = isSuspicious ? 'Aprobar visualmente' : 'Confirmar';
        
        const htmlContent = isSuspicious
            ? `<div class="flex flex-col items-center gap-2">
                 <div class="text-4xl font-bold text-amber-500">$${dataAnalysis.amount}</div>
                 <p class="text-sm text-amber-700 mt-2">El sistema ha retenido este pago por políticas de seguridad. Revise la imagen original.</p>
                 ${badgesHtml}
               </div>`
            : `<div class="flex flex-col items-center gap-2"><div class="text-4xl font-bold text-emerald-600">$${dataAnalysis.amount}</div></div>`;

        const result = await Swal.fire({
          title: titleText,
          html: htmlContent,
          icon: iconType, 
          showCancelButton: true, 
          confirmButtonText: btnText, 
          cancelButtonText: 'Cancelar', 
          confirmButtonColor: colorHex, 
          footer: `<span style="color: #64748b; font-size: 13px; font-weight: 500;">✨ Te quedan ${creditosRestantes} créditos IA</span>`,
          preConfirm: async () => {
             const res = await fetch('/api/messages/confirm-payment', { 
               method: 'POST', 
               headers: { 'Content-Type': 'application/json' }, 
               body: JSON.stringify({ 
                 messageId: message.id, 
                 amount: dataAnalysis.amount, 
                 conversationId,
                 needsManualReview: isSuspicious,
                 imageUrl: imageSource
               }) 
             })
             if(!res.ok) throw new Error("DB Error");
             await registerSale(conversationId, dataAnalysis.amount)
             return res.json()
          }
        })

        if (result.isConfirmed) {
           Swal.fire({ title: 'Pago registrado!', icon: 'success', timer: 1500, showConfirmButton: false })
           setLocalData({ amount: dataAnalysis.amount, processed: true })
        }
      } else { 
        if (dataAnalysis.error === "insufficient_credits") {
            Swal.fire({
              title: '¡Sin mensajes de IA!',
              html: `No te quedan más mensajes de IA en tu plan.<br><br>
                     Puedes esperar a que se renueve tu plan para obtener los mensajes que incluye, o bien puedes <b>comprar packs extra</b> aquí.<br><br>
                     <span style="font-size: 12px; color: #64748b;">En caso de que quieras esperar, siempre puedes registrar tus ventas de forma manual en el módulo "Ventas".</span>`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: '⚡ Comprar Packs Extra',
              cancelButtonText: 'Cerrar',
              confirmButtonColor: '#8b5cf6',
            }).then((res) => {
               if(res.isConfirmed) {
                  window.dispatchEvent(new CustomEvent('open-ia-modal'));
               }
            });
            setLocalData({ ...localData, processed: false })
        } else if (dataAnalysis.error === "server_error" || !resAnalysis.ok) {
            Swal.fire('Error del Sistema', 'Ocurrió un error interno en el servidor.', 'error');
            setLocalData({ ...localData, processed: false })
        } else {
            Swal.fire({ title: 'No es un comprobante válido', text: 'La IA no detectó un pago.', icon: 'info' })
            setLocalData({ ...localData, processed: true })
        }
      } 
    } catch (e) { 
      clearTimeout(fraudTimer);
      Swal.fire('Error', 'Error de conexión con el sistema.', 'error') 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="flex flex-col space-y-1.5 max-w-full">
      <img src={imageSource || "/placeholder.svg"} alt="Mensaje" onClick={() => window.open(imageSource, "_blank")} className="rounded-xl w-auto h-auto max-w-[240px] max-h-[300px] object-cover cursor-pointer shadow-sm" />
      <div className="flex items-center justify-between w-full max-w-[240px] px-1">
        {isIncoming && !localData.amount && !localData.processed && (
          <Button variant="ghost" size="sm" disabled={loading} onClick={handleAnalyze} className="h-7 text-[10px] px-2.5 bg-white text-indigo-600 shadow-sm border cursor-pointer">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />} Analizar Pago
          </Button>
        )}
        {localData.amount && (
          <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg flex gap-1 items-center shadow-sm">
            <CheckCircle2 className="w-3 h-3"/> ${localData.amount}
          </div>
        )}
      </div>
    </div>
  )
}

// =========================================================================
// 🚀 INICIO DEL COMPONENTE PRINCIPAL (Ordenado por Reglas de React)
// =========================================================================

export function ChatView({ conversation, onToggleDetails, showDetails, onToggleStatus, initialDraft = "", onDraftChange, onBack, currentUserId, agents = [], lines = [] }: ChatViewProps) {
  
  // 1. GLOBAL HOOKS & CONTEXTOS
  const { socket } = useSocket()
  const queryClient = useQueryClient() 
  const { theme } = useTheme()
  const { soundEnabled } = useSettings()

  // 2. REFS
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isCancelingRef = useRef(false)

  // 3. ESTADOS (useState)
  const [localText, setLocalText] = useState(initialDraft)
  const [sending, setSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [tempContent, setTempContent] = useState<string | null>(null) 
  
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null)
  const [optimisticBotEnabled, setOptimisticBotEnabled] = useState<boolean | null>(null)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [replyingTo, setReplyingTo] = useState<MensajeExtendido | null>(null)

  const [quickReplies, setQuickReplies] = useState<any[]>([])
  const [showQuickMenu, setShowQuickMenu] = useState(false)
  const [filteredReplies, setFilteredReplies] = useState<any[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordingState, setRecordingState] = useState<'inactive' | 'recording' | 'paused'>('inactive')

  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false)
  const [saleAmount, setSaleAmount] = useState("")
  const [saleConcept, setSaleConcept] = useState("")
  const [isSubmittingSale, setIsSubmittingSale] = useState(false)

  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [isChangingChat, setIsChangingChat] = useState(false);
  const [displayedConversationId, setDisplayedConversationId] = useState<string | null>(null);

  // 4. USE MEMOS
  const isAssignedToOther = useMemo(() => {
    const assignedId = conversation?.assigned_to ? String(conversation.assigned_to).trim() : "";
    const currentUserIdStr = String(currentUserId).trim();
    if (!assignedId || assignedId.length < 10 || assignedId === "null" || assignedId === "undefined") return false;
    if (assignedId === currentUserIdStr) return false;
    const agent = agents.find(a => String(a.id) === assignedId);
    if (!agent) return false;
    const role = String(agent.role || '').toUpperCase();
    const name = String(agent.nombre || agent.name || '').toLowerCase();
    if (role === 'OWNER' || role === 'SUPER_ADMIN' || name.includes('soporte')) return false;
    return true;
  }, [conversation?.assigned_to, currentUserId, agents]);

  const transferInfo = useMemo(() => {
    if (!conversation?.transferred_from) return null;
    if (conversation.transferred_from !== currentUserId) return null;
    return {
      note: conversation.transfer_note,
      assignedTo: conversation.assigned_to
    };
  }, [conversation?.transferred_from, conversation?.transfer_note, conversation?.assigned_to, currentUserId]);

  // 5. CONSTANTES Y VARIABLES DERIVADAS
  const currentLine = lines?.find(l => String(l.id) === String(conversation?.line_id || conversation?.lineId));
  const hasSuperBot = String(currentLine?.ai_mode).toUpperCase() === 'FULL' && String(currentLine?.ai_jefe_total).toUpperCase() === 'TOTAL';
  const currentBotState = optimisticBotEnabled !== null ? optimisticBotEnabled : conversation?.bot_enabled;
  
  const status = optimisticStatus || conversation?.status || "OPEN"
  const isInbox = status === "INBOX" || status === "PENDING"
  const isResolved = status === "RESOLVED" || status === "CLOSED" || status === "ABANDONED"
  const showEnableAIBtn = currentBotState === false && hasSuperBot && !isResolved && !isInbox && !conversation?.is_group && !isAssignedToOther;

  // 6. QUERIES (useQuery)
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', conversation?.id], 
    queryFn: async () => {
      if (!conversation?.id) return [];
      try {
        const res = await fetch(`/api/messages?conversationId=${conversation.id}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Error fetch');
        return await res.json() as MensajeExtendido[];
      } catch (error) { return []; }
    },
    enabled: !!conversation?.id,
    staleTime: 0, 
    refetchOnWindowFocus: true 
  });

  const showLoader = isChangingChat || (isLoadingMessages && conversation?.id === displayedConversationId);

  // 7. EFECTOS (useEffect)
  useEffect(() => {
      if (currentBotState === false) {
          console.log("🎯 ESTADO DEL BOTÓN:", { 
              modoBot: currentLine?.ai_mode, 
              jefeBot: currentLine?.ai_jefe_total, 
              superPoderesActivos: hasSuperBot,
              botonVisible: showEnableAIBtn 
          });
      }
  }, [currentBotState, currentLine, hasSuperBot, showEnableAIBtn]);

  useEffect(() => {
    if (conversation?.id && conversation.id !== displayedConversationId) {
      setIsChangingChat(true);
      setDisplayedConversationId(conversation.id);
      
      setLocalText(initialDraft || ""); 
      setReplyingTo(null);
      setOptimisticStatus(null);
      setOptimisticBotEnabled(null); 
      clearImage();
      setShowQuickMenu(false);
      setShowEmojiPicker(false);
    }
  }, [conversation?.id]);

  useEffect(() => {
    if (!isLoadingMessages && conversation?.id === displayedConversationId) {
      const timer = setTimeout(() => setIsChangingChat(false), 150);
      return () => clearTimeout(timer);
    }
  }, [isLoadingMessages, conversation?.id, displayedConversationId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => { if (onDraftChange) onDraftChange(localText) }, 500)
    return () => clearTimeout(timeoutId)
  }, [localText, onDraftChange])

  useEffect(() => {
    if (!socket || !conversation?.id) return
    const handleNewMessage = (data: any) => {
      const incomingConvId = data.conversationId || data.conversation_id
      if (String(incomingConvId) !== String(conversation.id)) return
      queryClient.setQueryData(['messages', conversation.id], (old: any[] = []) => {
         if (old.some(m => String(m.id) === String(data.message.id))) return old
         return [...old, data.message]
      })
    }
    const handleStatusUpdate = (data: any) => {
       if (String(data.conversationId) !== String(conversation.id)) return
       queryClient.setQueryData(['messages', conversation.id], (old: any[] = []) => {
          return old.map(m => String(m.id) === String(data.messageId) ? { ...m, status: data.status, is_read: data.status === 'read' } : m)
       })
    }
    socket.on('new_message', handleNewMessage)
    socket.on('message_status_update', handleStatusUpdate)
    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('message_status_update', handleStatusUpdate)
    }
  }, [socket, conversation?.id, queryClient])

  // 8. HANDLERS Y FUNCIONES
  const handleScrollToMessage = (messageId?: string) => {
      if (!messageId) return;
      const element = document.getElementById(`msg-${messageId}`) || document.querySelector(`[data-whatsapp-id="${messageId}"]`);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const internalId = element.getAttribute('id')?.replace('msg-', '');
          if (internalId) {
              setHighlightedMsgId(internalId);
              setTimeout(() => setHighlightedMsgId(null), 2000); 
          }
      } else {
          console.warn("Mensaje no encontrado en la pantalla:", messageId);
      }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setLocalText(text);
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
      if (text.startsWith('/')) {
          const query = text.substring(1).toLowerCase()
          const matches = quickReplies.filter(r => r.atajo.toLowerCase().includes(query))
          matches.length > 0 ? (setFilteredReplies(matches), setShowQuickMenu(true)) : setShowQuickMenu(false)
      } else { setShowQuickMenu(false) }
  }

  const selectQuickReply = (reply: any) => { setLocalText(reply.mensaje); setShowQuickMenu(false); }
  const onEmojiClick = (emojiData: any) => { setLocalText(prev => prev + emojiData.emoji); setShowEmojiPicker(false); }
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; 
      if (file) { setSelectedImage(file); setImagePreview(URL.createObjectURL(file)); e.target.value = ''; }
  }
  
  const clearImage = () => { 
      setSelectedImage(null); 
      setImagePreview(null); 
      if (fileInputRef.current) fileInputRef.current.value = ""; 
  }

  const handleSend = async () => {
    if ((!localText.trim() && !selectedImage) || !conversation) return
    if (soundEnabled) try { new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sent-mfTXcHLLUP4hL8i8ybKBvyzCPQUZvA.mp3").play().catch(() => {}) } catch(e) {}

    setSending(true)
    setShowQuickMenu(false)
    const uniqueId = crypto.randomUUID(); 
    const currentText = localText.trim() 
    
    setTempContent(currentText || "📷 Enviando imagen...") 
    setLocalText("") 
    const fileToSend = selectedImage
    clearImage()
    setOptimisticBotEnabled(false)

    try {
      let messageContent = currentText
      let messageType: "texto" | "image" = "texto"

      if (fileToSend) {
        setUploadingImage(true)
        const imageUrl = await uploadImage(fileToSend) 
        if (!imageUrl) throw new Error("Error subiendo imagen")
        messageContent = imageUrl
        messageType = "image"
      }

      await sendMessage({ 
          conversationId: conversation.id, body: messageContent, type: messageType,
          lineId: conversation.line_id || conversation.lineId || "", contactPhone: conversation.contact_phone || "",
          mobileId: uniqueId, quotedMessageId: replyingTo?.whatsapp_id || replyingTo?.id,
          quotedParticipant: replyingTo?.sender_phone || (replyingTo?.is_incoming ? conversation.contact_phone : 'me'),
          quotedContent: replyingTo ? (replyingTo.type === 'image' ? '📷 Imagen' : replyingTo.type === 'audio' ? '🎤 Audio' : replyingTo.content) : null
      }) 
      
      const msgReal: MensajeExtendido = {
          id: uniqueId, conversation_id: conversation.id, content: messageContent, type: messageType,
          is_incoming: false, timestamp: new Date(), status: 'sent', usuario_id: 'me', is_read: false,
          media_url: messageType === 'image' ? messageContent : null,
          quoted_content: replyingTo ? (replyingTo.type === 'image' ? '📷 Imagen' : replyingTo.type === 'audio' ? '🎤 Audio' : replyingTo.content) : null,
          quoted_participant: replyingTo?.sender_phone || (replyingTo?.is_incoming ? conversation.contact_phone : 'me'),
          quoted_message_id: replyingTo?.whatsapp_id || replyingTo?.id // 🔥 GUARDAMOS EL ID DEL PADRE
      }

      setReplyingTo(null);
      queryClient.setQueryData(['messages', conversation.id], (old: any[] = []) => [...old, msgReal])
      queryClient.invalidateQueries({ queryKey: ['conversations'] })

    } catch (error) { setLocalText(currentText) } 
    finally { setSending(false); setUploadingImage(false); setTempContent(null); }
  }

const startTimer = () => { 
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000); 
  };

const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };

          mediaRecorder.onstop = () => {
              // Solo lo enviamos si no fue cancelado (basurero)
              if (!isCancelingRef.current) {
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                  handleSendAudio(audioBlob);
              }
              // Apagamos la lucecita roja del micrófono del navegador
              stream.getTracks().forEach(track => track.stop());
          };

          mediaRecorder.start();
          setRecordingState('recording');
          setRecordingTime(0);
          isCancelingRef.current = false;
          startTimer();
      } catch (error) {
          console.error("Error accediendo al micrófono:", error);
          Swal.fire({
              title: 'Micrófono bloqueado',
              text: 'Por favor, permite el acceso al micrófono en tu navegador para enviar audios.',
              icon: 'warning'
          });
      }
  };

  const pauseRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.pause();
          setRecordingState('paused');
          if (timerRef.current) clearInterval(timerRef.current);
      }
  };

  const resumeRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
          mediaRecorderRef.current.resume();
          setRecordingState('recording');
          startTimer();
      }
  };

  const cancelRecording = () => {
      isCancelingRef.current = true; // Activamos la bandera de cancelación
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
      setRecordingState('inactive');
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
  };

  const sendRecording = () => {
      isCancelingRef.current = false; // Nos aseguramos de que se envíe
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop(); // El evento onstop se encargará de llamar a handleSendAudio
      }
      setRecordingState('inactive');
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSendAudio = async (blob: Blob) => {
      setSending(true); setTempContent("🎤 Procesando audio..."); 
      try {
          const reader = new FileReader(); reader.readAsDataURL(blob);
          reader.onloadend = async () => {
              const base64Audio = reader.result as string;
              const uniqueId = crypto.randomUUID();
              await sendMessage({ 
                  conversationId: conversation.id, body: base64Audio, type: 'audio',
                  lineId: conversation.line_id || conversation.lineId || "", contactPhone: conversation.contact_phone || "",
                  mobileId: uniqueId, quotedMessageId: replyingTo?.whatsapp_id || replyingTo?.id,
                  quotedParticipant: replyingTo?.sender_phone || (replyingTo?.is_incoming ? conversation.contact_phone : 'me')
              });
              setReplyingTo(null); setSending(false); setTempContent(null);
          };
      } catch (error) { setSending(false); setTempContent(null); }
  };

const changeConversationStatus = async (newStatus: "OPEN" | "RESOLVED" | "ABANDONED") => {
      if (!conversation) return
      setIsChangingStatus(true);
      try {
          // 🔥 Solo mandamos el status nuevo, dejamos el bot_enabled en paz
          await fetch(`/api/conversations/${conversation.id}`, { 
              method: 'PATCH', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ 
                  status: newStatus 
              }) 
          })
          
          await new Promise(resolve => setTimeout(resolve, 800));
          setOptimisticStatus(newStatus); 
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          if (onToggleStatus) onToggleStatus(newStatus);
      } catch (error) { 
          console.error(error) 
      } finally { 
          setIsChangingStatus(false); 
      }
  }


  const handleEnableAI = async () => {
      if (!conversation) return;
      setIsChangingStatus(true); 
      try {
          await fetch(`/api/conversations/${conversation.id}`, { 
              method: 'PATCH', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ 
                  bot_enabled: true // Solo prendemos el bot, se queda en tu bandeja (OPEN)
              }) 
          });
          setOptimisticBotEnabled(true);
          await new Promise(resolve => setTimeout(resolve, 800));
          
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          
          Swal.fire({
              title: '¡IA Reactivada!',
              text: 'La IA responderá el próximo mensaje en este chat.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
          });
      } catch (error) { 
          console.error("Error activando IA:", error); 
      } finally { 
          setIsChangingStatus(false); 
      }
  }

  if (!conversation) {
    return <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#111b21] h-full border-b-[6px] border-emerald-600"><h2 className="text-2xl font-light text-gray-500">Selecciona un chat</h2></div>
  }

  const handleRegisterSale = async () => {
    if (!saleAmount || isNaN(Number(saleAmount))) return;
    setIsSubmittingSale(true);

    try {
      await registerSaleFromChat({
        conversationId: conversation.id,
        contactPhone: conversation.contact_phone,
        contactName: conversation.contact_name,
        amount: Number(saleAmount),
        descripcion: saleConcept
      });
      
      setIsSaleModalOpen(false);
      setSaleAmount("");
      setSaleConcept("");
      // Opcional: Mostrar un Toast de éxito
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingSale(false);
    }
  }


  return (
    <div className="flex flex-col h-full w-full bg-muted/20 relative overflow-hidden">
      
    {/* HEADER */}
      <div className="flex items-center justify-between px-2 md:px-4 py-3 pt-4 md:pt-6 bg-background/80 backdrop-blur-md border-b border-border shrink-0 z-10 shadow-sm">
        
        {/* Lado Izquierdo: Info del contacto */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {onBack && (<Button variant="ghost" size="icon" className="md:hidden h-9 w-9 shrink-0 cursor-pointer" onClick={onBack}><ChevronLeft className="h-5 w-5" /></Button>)}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold text-base shrink-0">
              {(conversation.contact_name?.[0] || conversation.contact_phone?.[0] || "#").toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm md:text-base truncate">{conversation.contact_name || conversation.contact_phone}</h3>
            <p className="text-xs md:text-sm text-muted-foreground truncate">{conversation.contact_phone}</p>
            {transferInfo && (
              <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-200 mt-0.5 inline-block">
                Transferido por ti {transferInfo.note && `• ${transferInfo.note}`}
              </span>
            )}
          </div>
        </div>
        
        {/* Lado Derecho: Botones de Acción */}
        <div className="flex gap-2 items-center">

             {showEnableAIBtn && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-violet-600 border-violet-200 hover:bg-violet-50 hidden sm:flex cursor-pointer transition-all animate-in fade-in zoom-in" 
                    onClick={handleEnableAI} 
                    disabled={isChangingStatus}
                    title="Delegar nuevamente a la Inteligencia Artificial"
                >
                    {isChangingStatus ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin"/> : <Bot className="h-4 w-4 mr-1.5"/>}
                    Activar IA
                </Button>
            )}
            
            {!isInbox && !isResolved && !conversation.is_group && !isAssignedToOther && (
                <div className="flex items-center gap-2">
             

                    {/* 🔥 BOTÓN GRIS (FRACASO/VISTO) */}
                    <Button variant="outline" size="sm" className="text-slate-500 border-slate-200 hover:bg-slate-100 hidden sm:flex cursor-pointer" onClick={() => changeConversationStatus("ABANDONED")} title="El cliente no respondió o no le interesó">
                        <XCircle className="h-4 w-4 mr-1.5"/> Descartar
                    </Button>
                    
                    {/* 🔥 BOTÓN VERDE (ÉXITO) */}
                    <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hidden sm:flex cursor-pointer" onClick={() => changeConversationStatus("RESOLVED")} title="Consulta resuelta con éxito">
                        <CheckCircle className="h-4 w-4 mr-1.5"/> Resolver
                    </Button>
                </div>
            )}
            <Button variant="ghost" size="icon" onClick={onToggleDetails} className="hidden md:inline-flex cursor-pointer">
                {showDetails ? <PanelRightClose className="h-5 w-5" /> : <PanelRight className="h-5 w-5" />}
            </Button>
        </div>

      </div>

      {/* ÁREA DE MENSAJES */}
      <div className="flex-1 flex flex-col min-h-0 relative bg-[#efeae2] dark:bg-[#0b141a]">
          <div className="absolute inset-0 z-0 opacity-40 mix-blend-multiply dark:mix-blend-overlay bg-fixed bg-center" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')" }} />

          {showLoader && (
              <div className="absolute inset-0 z-20 bg-[#efeae2] dark:bg-[#0b141a] flex flex-col items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-500 animate-pulse">Abriendo chat seguro...</p>
              </div>
          )}

          {!showLoader && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse gap-2 relative z-10">
                <AnimatePresence>
                    {tempContent && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full justify-end">
                        <div className="px-3 py-1.5 max-w-[85%] bg-emerald-600 text-white rounded-lg opacity-70">
                            {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin"/> : <p>{tempContent}</p>}
                        </div>
                    </motion.div>
                    )}

                    {messages.slice().reverse().map((msg: MensajeExtendido) => {
                    const isIncoming = msg.is_incoming === true
                    const isHighlighted = highlightedMsgId === msg.id 
                    // 🔥 DETECTAMOS SI ES UN MENSAJE DE SISTEMA O TIENE EL EMOJI VIOLETA
                    const isSystemMsg = msg.content?.startsWith('🟣') || msg.type === 'system';

                    return (
                        <motion.div 
                            key={msg.id} 
                            data-whatsapp-id={msg.whatsapp_id}
                            id={`msg-${msg.id}`} 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                            // Centramos el mensaje si es del sistema
                            className={`flex w-full ${isSystemMsg ? "justify-center my-3" : isIncoming ? "justify-start" : "justify-end"} group`}
                        >
                            <div className={`px-3 py-1.5 max-w-[85%] md:max-w-[70%] text-[15px] rounded-lg shadow-sm relative transition-all duration-700 
                                ${isSystemMsg 
                                    ? "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-800 text-center text-sm shadow-none" // 🟣 ESTILO VIOLETA PREMIUM
                                    : isIncoming 
                                        ? "bg-card text-foreground" 
                                        : (msg.is_receipt && msg.processed_by_ai !== true)
                                            ? "bg-blue-600 text-white" 
                                            : "bg-emerald-600 text-white" 
                                }
                                ${isHighlighted ? "ring-4 ring-emerald-400 scale-[1.02] shadow-2xl z-50 bg-emerald-100 dark:bg-emerald-900/80" : ""}
                            `}>
                                
                                {/* ⛔ Ocultamos el Dropdown de Responder si es mensaje de sistema */}
                                {!isSystemMsg && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full bg-black/20 text-white z-20 cursor-pointer`}><ChevronDown className="w-4 h-4" /></button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-32">
                                        <DropdownMenuItem onClick={() => setReplyingTo(msg)} className="cursor-pointer"><Reply className="w-4 h-4 mr-2" /> Responder</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                )}

                                {conversation.is_group && isIncoming && msg.sender_name && !isSystemMsg && <p className="text-[10px] font-bold text-orange-500 mb-0.5 mt-1">{msg.sender_name}</p>}

                                {/* CITA CLICKEABLE */}
                                {(msg.quoted_content && msg.quoted_content !== "null" && msg.quoted_content !== "undefined") && !isSystemMsg && (
                                    <div 
                                        onClick={() => handleScrollToMessage(msg.quoted_message_id)}
                                        className={`mt-1 mb-1.5 p-1.5 rounded text-xs border-l-4 opacity-90 cursor-pointer hover:opacity-100 transition-opacity ${isIncoming ? 'bg-gray-100 dark:bg-gray-800 border-emerald-500 text-gray-700' : 'bg-emerald-700 border-emerald-300 text-emerald-50'}`}
                                    >
                                        <span className="font-bold block mb-0.5 text-[10px] opacity-80 cursor-pointer">{msg.quoted_participant?.includes('me') ? 'Tú' : (msg.quoted_participant?.includes(conversation.contact_phone || 'x') ? conversation.contact_name : 'Usuario')}</span>
                                        <span className="truncate block max-w-[200px] italic cursor-pointer">{msg.quoted_content}</span>
                                    </div>
                                )}

                                {/* CONTENIDO */}
                                {msg.type === 'image' || msg.media_url ? (
                                    <div className={msg.quoted_content ? "mt-1" : ""}><ImageMessageWithAI message={msg} imageSource={msg.media_url || msg.content} conversationId={conversation.id} isIncoming={isIncoming} /></div>
                                ) : msg.type === 'audio' ? (
                                    <div className={msg.quoted_content ? "mt-1" : ""}><AudioMessage src={msg.content} isIncoming={isIncoming} /></div>
                                ) : (
                                    // Agregamos font-medium si es mensaje de sistema para que destaque
                                    <p className={`text-[14.5px] leading-[1.35] whitespace-pre-wrap break-words overflow-wrap-anywhere pt-0.5 ${isSystemMsg ? 'font-medium' : ''}`}>
                                        {formatMessageText(msg.content)}
                                    </p>
                                )}

                                {/* ⛔ Ocultamos la Hora y el Check si es mensaje de sistema */}
                                {!isSystemMsg && (
                                    <div className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${
                                        isIncoming 
                                            ? "text-muted-foreground" 
                                            : (msg.is_receipt && msg.processed_by_ai !== true)
                                                ? "text-blue-100" 
                                                : "text-emerald-100"
                                    }`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                                        {!isIncoming && <MessageStatus status={msg.status} />}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )
                    })}
                </AnimatePresence>
              </div>
          )}
      </div>

      {/* FOOTER / INPUT */}
     {/* FOOTER / INPUT */}
      <div className="z-50 bg-background flex flex-col relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {/* 🔥 BARRERA DE SOLO LECTURA */}
          {isAssignedToOther ? (
              <div className="p-4 bg-muted/40 text-center border-t w-full flex flex-col items-center justify-center h-20">
                  <div className="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm">
                      <span className="text-base">🔒</span>
                      <p className="text-[13px] font-bold tracking-tight">Chat en modo Solo Lectura. Asignado a otro agente.</p>
                  </div>
              </div>
          ) : (
              // 👇 AQUÍ EMPIEZA TU CÓDIGO ORIGINAL INTACTO 👇
              <>
                  {replyingTo && !isResolved && !isInbox && (
                      <div className="px-4 py-2 bg-muted/80 border-t flex items-center justify-between border-l-4 border-l-emerald-500">
                          <div className="flex flex-col overflow-hidden">
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Respondiendo a {replyingTo.is_incoming ? conversation.contact_name : 'ti mismo'}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-sm">{replyingTo.type === 'image' ? '📷 Imagen' : replyingTo.type === 'audio' ? '🎤 Audio' : replyingTo.content}</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)} className="h-6 w-6 cursor-pointer"><X className="h-4 w-4"/></Button>
                      </div>
                  )}
                  
                  {imagePreview && !isResolved && !isInbox && (
                      <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
                          <div className="flex items-center gap-2">
                              <img src={imagePreview} className="h-16 w-16 object-cover rounded-md border" alt="Preview"/>
                              <span className="text-xs text-muted-foreground">Imagen seleccionada</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={clearImage} className="cursor-pointer"><X className="h-4 w-4"/></Button>
                      </div>
                  )}

                  {isInbox ? (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-center border-t border-blue-100 w-full">
                          <p className="text-sm text-blue-800 dark:text-blue-300 mb-3 font-medium">Esta es una nueva solicitud</p>
                          <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-100 mx-2 cursor-pointer" onClick={() => changeConversationStatus('ABANDONED')}>Descartar Lead</Button>
                          <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer" onClick={() => changeConversationStatus("OPEN")} disabled={isChangingStatus}>
                              {isChangingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <UserPlus className="w-4 h-4 mr-2"/>} {isChangingStatus ? "Asignando chat..." : "Atender Cliente"}
                          </Button>
                      </div>
                  ) : isResolved ? (
                      <div className="p-4 bg-muted/40 text-center border-t w-full">
                          <p className="text-sm text-muted-foreground mb-3 font-medium">Esta conversación está archivada</p>
                          <Button variant="outline" className="w-full sm:w-auto shadow-sm cursor-pointer" onClick={() => changeConversationStatus("OPEN")} disabled={isChangingStatus}>
                              {isChangingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <RefreshCcw className="w-4 h-4 mr-2"/>} Reabrir Chat
                          </Button>
                      </div>
                  ) : (
                      <div className="px-4 py-3 border-t flex gap-2 items-end relative bg-background">
                          
                          {showQuickMenu && filteredReplies.length > 0 && (
                              <div className="absolute bottom-full left-4 mb-2 bg-popover border shadow-xl rounded-lg w-64 max-h-48 overflow-y-auto z-[60]">
                                  {filteredReplies.map(r => (
                                      <div key={r.id} onClick={() => selectQuickReply(r)} className="px-3 py-2 hover:bg-muted cursor-pointer text-sm">
                                          <span className="font-bold text-primary">/{r.atajo}</span>: {r.mensaje.substring(0,30)}...
                                      </div>
                                  ))}
                              </div>
                          )}

                          {recordingState === 'inactive' && (
                              <div className="flex gap-1 pb-1 items-center">
                                  <div className="relative">
                                      {showEmojiPicker && (
                                          <div className="absolute bottom-full left-0 mb-2 z-[99] shadow-2xl rounded-xl overflow-hidden border">
                                              <EmojiPicker onEmojiClick={onEmojiClick} theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT} />
                                          </div>
                                      )}
                                      <Button variant="ghost" size="icon" className="cursor-pointer h-9 w-9" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                                        <Smile className="w-5 h-5 text-muted-foreground"/>
                                      </Button>
                                  </div>
                                  
                                  <Button variant="ghost" size="icon" className="cursor-pointer h-9 w-9" onClick={() => fileInputRef.current?.click()}>
                                    <Paperclip className="w-5 h-5 text-muted-foreground"/>
                                  </Button>
                                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect}/>

                                  {/* 🔥 NUEVO: BOTÓN MAGICO DE VENTAS (Glass & Pulse) */}
                                  <div className="relative group ml-1">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full blur opacity-30 group-hover:opacity-75 transition duration-200 animate-pulse"></div>
                                    <Button 
                                      variant="outline"
                                      size="icon" 
                                      onClick={() => setIsSaleModalOpen(true)}
                                      className="relative bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800/50 rounded-full w-9 h-9 cursor-pointer transition-all"
                                    >
                                      <DollarSign className="w-[18px] h-[18px]" />
                                    </Button>
                                  </div>
                              </div>
                          )}

                          {recordingState !== 'inactive' ? (
                              <div className="flex-1 flex items-center justify-between bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full border border-red-200 dark:border-red-800 transition-all">
                                  <Button variant="ghost" size="icon" onClick={cancelRecording} className="text-red-500 hover:bg-red-100 rounded-full w-8 h-8 cursor-pointer">
                                      <Trash2 className="w-4 h-4" />
                                  </Button>
                                  <div className="flex items-center gap-3">
                                      <div className={`w-2.5 h-2.5 rounded-full bg-red-500 ${recordingState === 'recording' ? 'animate-ping' : ''}`} />
                                      <span className="text-red-500 font-mono text-sm font-bold w-12 text-center">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2">
                                      {recordingState === 'recording' ? (
                                          <Button variant="ghost" size="icon" onClick={pauseRecording} className="text-red-500 hover:bg-red-100 rounded-full w-8 h-8 cursor-pointer"><Pause className="w-4 h-4" /></Button>
                                      ) : (
                                          <Button variant="ghost" size="icon" onClick={resumeRecording} className="text-red-500 hover:bg-red-100 rounded-full w-8 h-8 cursor-pointer"><Mic className="w-4 h-4" /></Button>
                                      )}
                                      <Button onClick={sendRecording} size="icon" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md w-8 h-8 sm:w-10 sm:h-10 ml-1 cursor-pointer"><Send className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
                                  </div>
                              </div>
                          ) : (
                              <>
                                  <textarea 
                                      value={localText} 
                                      onChange={handleTextChange} 
                                      onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault(); 
                                              if (localText.trim() || selectedImage) handleSend();
                                          }
                                      }} 
                                      placeholder="Escribir mensaje..." 
                                      className="flex-1 resize-none bg-muted/50 border border-transparent rounded-2xl px-4 py-2.5 text-[14.5px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50 shadow-sm leading-snug" 
                                      rows={Math.max(1, Math.min(5, (localText.match(/\n/g) || []).length + 1))} 
                                  />
                                  <div className="pb-0.5">
                                      {localText.trim() || selectedImage ? (
                                          <Button onClick={handleSend} size="icon" className="rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-md shrink-0 h-10 w-10 transition-transform cursor-pointer" disabled={sending}>
                                              {sending ? <Loader2 className="animate-spin w-4 h-4"/> : <Send className="w-4 h-4"/>}
                                          </Button>
                                      ) : (
                                          <Button variant="ghost" size="icon" onClick={startRecording} className="text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-full w-10 h-10 shrink-0 transition-colors cursor-pointer">
                                              <Mic className="w-5 h-5" />
                                          </Button>
                                      )}
                                  </div>
                              </>
                          )}
                      </div>
                  )}
              </>
          )}
      </div>
      {/* 🚀 MODAL DE REGISTRO RÁPIDO DE VENTA */}
        <Dialog open={isSaleModalOpen} onOpenChange={setIsSaleModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl z-[99999]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-500">
                <TrendingUp className="w-5 h-5" /> Ingreso Manual
              </DialogTitle>
              <DialogDescription>
                Asignando pago a <strong>{conversation.contact_name || conversation.contact_phone}</strong> sin validación.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Monto Cobrado ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={saleAmount}
                    onChange={(e) => setSaleAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border rounded-lg text-lg font-semibold focus:ring-2 focus:ring-orange-500 outline-none bg-background"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Concepto <span className="text-muted-foreground font-normal">(Opcional)</span></label>
                <input 
                  type="text"
                  placeholder="Ej: Zapatillas Nike, Renovación mensual..." 
                  value={saleConcept}
                  onChange={(e) => setSaleConcept(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background"
                />
              </div>

              {/* 🔥 LA TRAMPA PSICOLÓGICA */}
              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-lg flex gap-3">
                 <span className="text-orange-500 text-lg leading-none mt-0.5">⚠️</span>
                 <p className="text-xs text-orange-800 dark:text-orange-300 leading-tight">
                   <b>Advertencia de Auditoría:</b> Estás a punto de registrar un pago manual. 
                   Esta transacción <span className="font-bold">no contará con verificación antifraude de IA</span> ni enviará datos de conversión al Píxel de marketing.
                 </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSaleModalOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleRegisterSale} 
                disabled={!saleAmount || isSubmittingSale}
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20"
              >
                {isSubmittingSale ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isSubmittingSale ? "Guardando..." : "Guardar sin verificar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
