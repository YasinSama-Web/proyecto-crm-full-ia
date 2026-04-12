"use client"

import type React from "react"
import { useState, Fragment, useEffect, useRef, useMemo  } from "react"
import { Button } from "@/components/ui/button"
import {
  Bot, Send, Loader2, PanelRightClose, PanelRight, CheckCheck, Check,
  RefreshCcw, Paperclip, X, Sparkles, CheckCircle, UserPlus, Smile, Mic, CheckCircle2,
  MoreVertical, LogOut, Info, FileText, ExternalLink, FileDown, ChevronLeft, ZoomIn, Download, Pause, Trash2, Reply, ChevronDown, XCircle, DollarSign, TrendingUp, Brain
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AudioMessage } from "@/components/AudioMessage"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

// 🔥 CORRECCIÓN: Importación correcta desde tus componentes de UI locales
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type ConversacionConStatus = Conversacion & {
  lead_score?: number | null; 
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
  omni_channel_id?: string;
  ai_profile?: string | null; 
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
  hasEcommerceAddon: boolean;
}

const handleDownloadFile = async (url: string, filename: string) => {
  Swal.fire({ title: 'Preparando descarga...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
    Swal.close();
  } catch (error) {
    Swal.fire('Error', 'No se pudo descargar el archivo.', 'error');
  }
};

function ImageLightbox({ src, open, onOpenChange }: { src: string, open: boolean, onOpenChange: (open: boolean) => void }) {
  const filename = `imagen-${Date.now()}.jpg`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-1 bg-black/90 border-none flex flex-col items-center justify-center rounded-2xl overflow-hidden z-[99999]">
        <DialogHeader className="absolute top-2 right-12 z-50">
          <DialogTitle className="sr-only">Zoom de imagen</DialogTitle>
           <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 rounded-full cursor-pointer"
            onClick={() => handleDownloadFile(src, filename)}
            title="Descargar imagen"
          >
            <Download className="h-5 w-5" />
          </Button>
        </DialogHeader>
        
        <div className="w-full h-full flex items-center justify-center overflow-auto p-4 mt-10">
          <img 
            src={src} 
            alt="Zoom" 
            className="max-w-full max-h-full object-contain rounded-md shadow-2xl transition-transform duration-300 hover:scale-110 cursor-zoom-in" 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocumentMessage({ message, isIncoming, conversationId }: { message: MensajeExtendido, isIncoming: boolean, conversationId: string }) {
  const fileUrl = message.media_url || message.content;
  const rawFilename = fileUrl ? fileUrl.split('/').pop()?.split('?')[0] || "Documento" : "Documento";
  let cleanFilename = decodeURIComponent(rawFilename).replace(/^(inbound|self)-doc-[^-]+-\d+-/, '');
  const extension = cleanFilename.split('.').pop()?.toLowerCase() || '';
  const isViewable = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension);
  const isPdf = extension === 'pdf';

  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localData, setLocalData] = useState({ amount: message.amount, processed: message.processed_by_ai });

  const handleAnalyzePDF = async () => {
    setLoading(true);
    Swal.fire({ title: 'Analizando PDF...', html: 'Extrayendo texto bancario 🤖', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch('/api/messages/analyze', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ imageUrl: fileUrl, isPdf: true }) 
      });
      const data = await res.json();
      
      if (data.success) {
        const result = await Swal.fire({
          title: data.needs_manual_review ? '⚠️ Revisión' : 'Confirmar PDF',
          html: `<div class="text-4xl font-bold text-emerald-600">$${data.amount}</div>`,
          icon: data.needs_manual_review ? 'warning' : 'question',
          showCancelButton: true, confirmButtonText: 'Confirmar Pago',
         footer: data.remaining_credits !== undefined ? `✨ Tienes ${data.remaining_credits} créditos IA` : ''
        });

        if (result.isConfirmed) {
            await fetch('/api/messages/confirm-payment', { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ messageId: message.id, amount: data.amount, conversationId, needsManualReview: data.needs_manual_review, imageUrl: fileUrl }) 
            });
            setLocalData({ amount: data.amount, processed: true });
            Swal.fire('¡Pago registrado!', '', 'success');
        }
      } else {
        Swal.fire('Atención', data.message || 'No se detectó un pago válido o no tienes créditos.', 'info');
      }
    } catch (error) {
      Swal.fire('Error', 'Fallo al analizar el PDF', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col space-y-2 p-2 rounded-xl border max-w-[280px] sm:max-w-[320px] ${isIncoming ? 'bg-muted/30 border-border' : 'bg-white/10 border-white/20'}`}>
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={`p-2.5 rounded-lg shrink-0 ${isIncoming ? 'bg-muted text-muted-foreground' : 'bg-white/20 text-white'}`}>
          <FileText className="w-6 h-6" />
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <p className={`text-sm font-medium truncate ${isIncoming ? 'text-foreground' : 'text-white'}`} title={cleanFilename}>{cleanFilename}</p>
        </div>
      </div>

      <div className="flex gap-1.5 pt-1 border-t border-dashed border-border/50">
        <Button variant="ghost" size="sm" onClick={() => handleDownloadFile(fileUrl, cleanFilename)} className="h-8 flex-1 text-xs gap-1.5"><FileDown className="w-3.5 h-3.5" /> Bajar</Button>
        {isViewable && <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)} className="h-8 flex-1 text-xs gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Abrir</Button>}
      </div>

      {isIncoming && isPdf && !localData.amount && !localData.processed && (
        <Button variant="outline" size="sm" disabled={loading} onClick={handleAnalyzePDF} className="w-full mt-1 bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 cursor-pointer shadow-sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />} 
          Analizar Pago (2 Créditos)
        </Button>
      )}

      {localData.amount && (
        <div className="mt-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md text-center">
          ✅ Pago IA: ${localData.amount}
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] h-[90vh] p-0 rounded-2xl overflow-hidden z-[99999] flex flex-col bg-muted/20">
          
          <DialogHeader className="p-3 border-b bg-background relative shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-semibold truncate pr-4 max-w-[85%] leading-none m-0" title={cleanFilename}>
              {cleanFilename}
            </DialogTitle>
            <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:bg-muted rounded-full cursor-pointer h-8 w-8 m-0"
                onClick={() => handleDownloadFile(fileUrl, cleanFilename)}
                title="Descargar archivo"
              >
                <Download className="h-4 w-4" />
            </Button>
          </DialogHeader>
          
          <iframe 
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`} 
            className="w-full flex-1 border-none bg-white"
            title="Preview"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
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

const formatDateSeparator = (dateString: string | Date) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";

    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
        return date.toLocaleDateString('es-ES', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase());
    }

    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
  const [lightboxOpen, setLightboxOpen] = useState(false)

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
    <div className="flex flex-col space-y-1.5 max-w-full relative group">
      <img 
        src={imageSource || "/placeholder.svg"} 
        alt="Mensaje" 
        onClick={() => setLightboxOpen(true)} 
        className="rounded-xl w-auto h-auto max-w-[240px] max-h-[300px] object-cover cursor-pointer shadow-sm transition-opacity group-hover:opacity-90" 
      />
      
      <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <ZoomIn className="w-4 h-4" />
      </div>

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

      <ImageLightbox 
        src={imageSource} 
        open={lightboxOpen} 
        onOpenChange={setLightboxOpen} 
      />
    </div>
  )
}

// =========================================================================
// 🚀 INICIO DEL COMPONENTE PRINCIPAL
// =========================================================================

export function ChatView({ conversation, onToggleDetails, showDetails, onToggleStatus, initialDraft = "", hasEcommerceAddon, onDraftChange, onBack, currentUserId, agents = [], lines = [] }: ChatViewProps) {
  
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

  // 🔥 NUEVO: Estados para el Selector de Productos
  const [productos, setProductos] = useState<any[]>([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState<{sku: string, nombre: string, cantidad: number, precio: number}[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);

useEffect(() => {
    // Si no está abierto o NO tiene el addon, no hacemos nada
    if (!isSaleModalOpen || !hasEcommerceAddon) return; 
    
    const fetchProductos = async () => {
      setCargandoProductos(true);
      try {
        // 🔥 FIX: Apuntamos a la ruta en inglés (la que realmente existe)
        const res = await fetch('/api/products?activos=true'); 
        
        // 🔥 ESCUDO: Si la ruta no existe (404), cortamos la ejecución antes de que explote el JSON
        if (!res.ok) {
           console.warn("⚠️ Advertencia: No se encontró la ruta de productos.");
           return;
        }
        
        const data = await res.json();
        
        // 🔥 FIX 2: Soportamos si tu API devuelve el arreglo directo o adentro de { productos: [...] }
        const arrayProductos = data.productos || data.products || (Array.isArray(data) ? data : []);
        setProductos(arrayProductos);

      } catch (error) {
        console.error("Error cargando productos:", error);
      } finally {
        setCargandoProductos(false);
      }
    };

    fetchProductos();
  }, [isSaleModalOpen, hasEcommerceAddon]);

  // 🔥 NUEVO: Limpiar el selector cuando se cierra el modal
  useEffect(() => {
    if (!isSaleModalOpen) {
      setProductosSeleccionados([]);
      setSaleAmount("");
      setSaleConcept("");
    }
  }, [isSaleModalOpen]);

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
    refetchOnWindowFocus: true ,
    refetchInterval: 500
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

  // 🔥 NUEVA LÓGICA DE SEND (100% Optimista y sin parpadeos)
  const handleSend = async () => {
    if ((!localText.trim() && !selectedImage) || !conversation) return
    if (soundEnabled) try { new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sent-mfTXcHLLUP4hL8i8ybKBvyzCPQUZvA.mp3").play().catch(() => {}) } catch(e) {}

    setSending(true)
    setShowQuickMenu(false)
    const uniqueId = crypto.randomUUID(); 
    const currentText = localText.trim() 
    
    const isDoc = selectedImage && !selectedImage.type.startsWith('image/');
    let messageContent = currentText;
    let messageType: "texto" | "image" | "document" = "texto";
    let fileToSend = selectedImage;

    setLocalText("") 
    clearImage()
    setOptimisticBotEnabled(false)

    // 1. DIBUJAMOS EN PANTALLA INMEDIATAMENTE (Optimismo 100%)
    if (!fileToSend) {
       const msgReal: MensajeExtendido = {
          id: uniqueId, conversation_id: conversation.id, content: messageContent, type: messageType,
          is_incoming: false, timestamp: new Date(), status: 'sent', usuario_id: 'me', is_read: false,
          media_url: null,
          quoted_content: replyingTo ? (replyingTo.type === 'image' ? '📷 Imagen' : replyingTo.type === 'audio' ? '🎤 Audio' : replyingTo.type === 'document' ? '📄 Documento' : replyingTo.content) : undefined,
          quoted_participant: replyingTo ? (replyingTo.is_incoming ? conversation.contact_phone : 'me') : undefined,
          quoted_message_id: replyingTo?.whatsapp_id || replyingTo?.id
       }
       queryClient.setQueryData(['messages', conversation.id], (old: any[] = []) => [...old, msgReal])
    } else {
       setTempContent(isDoc ? "📎 Adjuntando archivo..." : "📷 Enviando imagen...")
       setUploadingImage(true)
    }

    const currentReplyingTo = replyingTo;
    setReplyingTo(null);

    // 2. HACEMOS EL TRABAJO PESADO DE FONDO
    try {
      if (fileToSend) {
        const fileUrl = await uploadImage(fileToSend) 
        if (!fileUrl) throw new Error("Error subiendo archivo")
        messageContent = fileUrl
        messageType = fileToSend.type.startsWith('image/') ? "image" : "document"
      }

      const res = await sendMessage({ 
          conversationId: conversation.id, body: messageContent, type: messageType,
          lineId: conversation.line_id || conversation.lineId || conversation.omni_channel_id || "",
          mobileId: uniqueId, quotedMessageId: currentReplyingTo?.whatsapp_id || currentReplyingTo?.id,
          quotedParticipant: currentReplyingTo ? (currentReplyingTo.is_incoming ? conversation.contact_phone : 'me') : null,
          quotedContent: currentReplyingTo ? (currentReplyingTo.type === 'image' ? '📷 Imagen' : currentReplyingTo.type === 'audio' ? '🎤 Audio' : currentReplyingTo.type === 'document' ? '📄 Documento' : currentReplyingTo.content) : null
      }) 
      
      if (res && res.error) throw new Error(res.error);
      
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

    } catch (error: any) { 
        console.error("🚨 ERROR EN FRONTEND:", error);
        // Si falla, removemos el mensaje optimista
        queryClient.setQueryData(['messages', conversation.id], (old: any[] = []) => old.filter(m => m.id !== uniqueId))
        Swal.fire({
            title: 'Error de envío',
            text: error.message || "Ocurrió un error desconocido",
            icon: 'error'
        });
        setLocalText(currentText); 
    } 
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
              if (!isCancelingRef.current) {
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                  handleSendAudio(audioBlob);
              }
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
      isCancelingRef.current = true; 
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
      setRecordingState('inactive');
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
  };

  const sendRecording = () => {
      isCancelingRef.current = false; 
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop(); 
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
          await fetch(`/api/conversations/${conversation.id}`, { 
              method: 'PATCH', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ status: newStatus }) 
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
              body: JSON.stringify({ bot_enabled: true }) 
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
        descripcion: saleConcept,
        // 🔥 NUEVO: Enviamos el array de SKUs al backend
        productos_skus: productosSeleccionados.map(p => `${p.cantidad}x ${p.sku}`) 
      });
      
      setIsSaleModalOpen(false);
      setSaleAmount("");
      setSaleConcept("");
      setProductosSeleccionados([]); // Limpiamos
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingSale(false);
    }
  }

  // 🔥 NUEVAS FUNCIONES PARA EL MINI CARRITO MANUAL
  const actualizarCarrito = (nuevaLista: any[]) => {
    setProductosSeleccionados(nuevaLista);
    const nuevoTotal = nuevaLista.reduce((acc, curr) => acc + (curr.precio * curr.cantidad), 0);
    setSaleAmount(nuevoTotal > 0 ? nuevoTotal.toString() : "");
    setSaleConcept(nuevaLista.length > 0 ? `Venta manual: ${nuevaLista.map(p => `${p.cantidad}x ${p.nombre}`).join(', ')}` : "");
  };

  const cambiarCantidad = (sku: string, delta: number) => {
    const nuevaLista = productosSeleccionados.map(p => {
      if (p.sku === sku) {
        const prodDb = productos.find(x => x.sku === sku);
        const maxStock = prodDb ? prodDb.stock : 999;
        const nuevaCant = Math.max(1, Math.min(p.cantidad + delta, maxStock)); // Ni menos de 1, ni más del stock
        return { ...p, cantidad: nuevaCant };
      }
      return p;
    });
    actualizarCarrito(nuevaLista);
  };


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

        {/* 🔥 EL CEREBRITO DE IA PERFILADA EN EL HEADER 🔥 */}
            {conversation?.ai_profile && (
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <div className="cursor-help p-1 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-800/50">
                              <Brain className="w-4 h-4 text-blue-500 animate-pulse" />
                          </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-white border-none p-2 rounded-lg z-50">
                          <p className="text-xs font-medium">Cliente perfilado por IA</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
            )}

            {/* 🌡️ EL TERMÓMETRO */}
            {conversation?.lead_score !== null && conversation?.lead_score !== undefined && (
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <div className="text-base hover:scale-110 transition-transform cursor-help ml-1 p-0.5">
                              {conversation.lead_score < 40 ? '❄️' : conversation.lead_score < 75 ? '☀️' : '🔥'}
                          </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-white border-none p-2 rounded-lg flex flex-col gap-1 z-50">
                          <p className="text-xs font-bold">Probabilidad de Cierre: {conversation.lead_score}%</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
            )}
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
                    <Button variant="outline" size="sm" className="text-slate-500 border-slate-200 hover:bg-slate-100 hidden sm:flex cursor-pointer" onClick={() => changeConversationStatus("ABANDONED")} title="El cliente no respondió o no le interesó">
                        <XCircle className="h-4 w-4 mr-1.5"/> Descartar
                    </Button>
                    
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

                    {messages.slice().reverse().map((msg: MensajeExtendido, index: number, arr: MensajeExtendido[]) => {
    const isIncoming = msg.is_incoming === true
    const isHighlighted = highlightedMsgId === msg.id 
    const isSystemMsg = msg.content?.startsWith('🟣') || msg.type === 'system';

    const nextMsg = arr[index + 1]; 
    let showDateSeparator = false;
    let dateSeparatorText = "";

    if (!nextMsg) {
        showDateSeparator = true;
        dateSeparatorText = formatDateSeparator(msg.timestamp);
    } else {
        const currDate = new Date(msg.timestamp).toDateString();
        const prevDate = new Date(nextMsg.timestamp).toDateString();
        if (currDate !== prevDate) {
            showDateSeparator = true;
            dateSeparatorText = formatDateSeparator(msg.timestamp);
        }
    }

    return (
        <Fragment key={msg.id}>
            <motion.div 
                data-whatsapp-id={msg.whatsapp_id}
                id={`msg-${msg.id}`} 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                className={`flex w-full ${isSystemMsg ? "justify-center my-3" : isIncoming ? "justify-start" : "justify-end"} group`}
            >
                <div className={`px-3 py-1.5 max-w-[85%] md:max-w-[70%] text-[15px] rounded-lg shadow-sm relative transition-all duration-700 
                    ${isSystemMsg 
                        ? "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-800 text-center text-sm shadow-none" 
                        : isIncoming 
                            ? "bg-card text-foreground" 
                            : (msg.is_receipt && msg.processed_by_ai !== true)
                                ? "bg-blue-600 text-white" 
                                : "bg-emerald-600 text-white" 
                    }
                    ${isHighlighted ? "ring-4 ring-emerald-400 scale-[1.02] shadow-2xl z-50 bg-emerald-100 dark:bg-emerald-900/80" : ""}
                `}>
                    
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

                    {(msg.quoted_content && msg.quoted_content !== "null" && msg.quoted_content !== "undefined") && !isSystemMsg && (
                        <div 
                            onClick={() => handleScrollToMessage(msg.quoted_message_id)}
                            className={`mt-1 mb-1.5 p-1.5 rounded text-xs border-l-4 opacity-90 cursor-pointer hover:opacity-100 transition-opacity ${isIncoming ? 'bg-gray-100 dark:bg-gray-800 border-emerald-500 text-gray-700' : 'bg-emerald-700 border-emerald-300 text-emerald-50'}`}
                        >
                            <span className="font-bold block mb-0.5 text-[10px] opacity-80 cursor-pointer">{msg.quoted_participant?.includes('me') ? 'Tú' : (msg.quoted_participant?.includes(conversation.contact_phone || 'x') ? conversation.contact_name : 'Usuario')}</span>
                            <span className="truncate block max-w-[200px] italic cursor-pointer">{msg.quoted_content}</span>
                        </div>
                    )}

                    {msg.type === 'image' || msg.media_url ? (
    <div className={msg.quoted_content ? "mt-1" : ""}><ImageMessageWithAI message={msg} imageSource={msg.media_url || msg.content} conversationId={conversation.id} isIncoming={isIncoming} /></div>
) : msg.type === 'audio' ? (
    <div className={msg.quoted_content ? "mt-1" : ""}><AudioMessage src={msg.content} isIncoming={isIncoming} /></div>
) : msg.type === 'document' ? (
    <div className={`mt-1 min-w-[200px] ${msg.quoted_content ? "mt-1" : ""}`}>
        <DocumentMessage message={msg} conversationId={conversation.id} isIncoming={isIncoming} />
    </div>
) : (
                        <p className={`text-[14.5px] leading-[1.35] whitespace-pre-wrap break-words overflow-wrap-anywhere pt-0.5 ${isSystemMsg ? 'font-medium' : ''}`}>
                            {formatMessageText(msg.content)}
                        </p>
                    )}

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

            {showDateSeparator && (
                <div className="flex w-full justify-center my-4 relative z-10">
                    <span className="bg-background/80 backdrop-blur-sm text-muted-foreground text-[11px] font-medium px-3 py-1 rounded-full border shadow-sm">
                        {dateSeparatorText}
                    </span>
                </div>
            )}
        </Fragment>
    )
})}
                </AnimatePresence>
              </div>
          )}
      </div>

      {/* FOOTER / INPUT */}
      <div className="z-50 bg-background flex flex-col relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {isAssignedToOther ? (
              <div className="p-4 bg-muted/40 text-center border-t w-full flex flex-col items-center justify-center h-20">
                  <div className="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm">
                      <span className="text-base">🔒</span>
                      <p className="text-[13px] font-bold tracking-tight">Chat en modo Solo Lectura. Asignado a otro agente.</p>
                  </div>
              </div>
          ) : (
              <>
                  {replyingTo && !isResolved && !isInbox && (
                      <div className="px-4 py-2 bg-muted/80 border-t flex items-center justify-between border-l-4 border-l-emerald-500">
                          <div className="flex flex-col overflow-hidden">
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Respondiendo a {replyingTo.is_incoming ? conversation.contact_name : 'ti mismo'}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-sm">
    {replyingTo.type === 'image' ? '📷 Imagen' : 
     replyingTo.type === 'audio' ? '🎤 Audio' : 
     replyingTo.type === 'document' ? '📄 Documento' : 
     replyingTo.content}
</span>
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
                                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={handleImageSelect}/>

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

       {/* 💰 MODAL DE INGRESO MANUAL CON CARRITO */}
        <Dialog open={isSaleModalOpen} onOpenChange={setIsSaleModalOpen}>
          <DialogContent className="sm:max-w-lg rounded-2xl z-[99999] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-500">
                <TrendingUp className="w-5 h-5" /> Cajero Manual
              </DialogTitle>
              <DialogDescription>
                Asignando venta a <strong>{conversation?.contact_name || conversation?.contact_phone}</strong>.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-5 py-2">
              
              {/* 🔥 CARRITO DE PRODUCTOS (SOLO VISIBLE CON ADDON E-COMMERCE) */}
              {hasEcommerceAddon && (
                  <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border border-dashed">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                       🛒 Productos de esta venta
                    </label>
                    
                    {/* DESPLEGABLE PARA AGREGAR AL CARRITO */}
                    <select 
                        disabled={cargandoProductos || productos.length === 0}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 font-medium"
                        onChange={(e) => {
                            if (!e.target.value) return;
                            const prod = productos.find(p => p.sku === e.target.value);
                            if (prod) {
                                let nuevaLista = [...productosSeleccionados];
                                const existe = nuevaLista.find(p => p.sku === prod.sku);
                                if (existe) {
                                    if (existe.cantidad < prod.stock) existe.cantidad += 1;
                                } else {
                                    nuevaLista.push({sku: prod.sku, nombre: prod.nombre, cantidad: 1, precio: Number(prod.precio)});
                                }
                                actualizarCarrito(nuevaLista);
                            }
                            e.target.value = ""; // Resetear selector
                        }}
                    >
                        <option value="">
                          {cargandoProductos ? "Cargando inventario..." : "✨ + Agregar un producto..."}
                        </option>
                        {productos.map(p => (
                            <option key={p.id} value={p.sku} disabled={p.stock <= 0}>
                              {p.nombre} (Stock: {p.stock}) - ${Number(p.precio).toLocaleString('es-AR')}
                            </option>
                        ))}
                    </select>

                    {/* LISTADO TIPO CARRITO CON CANTIDADES */}
                    {productosSeleccionados.length > 0 && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-dashed">
                            {productosSeleccionados.map((item, idx) => {
                                const prodDb = productos.find(p => p.sku === item.sku);
                                const hasStock = prodDb && item.cantidad < prodDb.stock;

                                return (
                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-background p-3 rounded-lg border shadow-sm text-sm gap-3">
                                    <div className="flex-1 min-w-0">
                                        <span className="font-bold text-foreground block truncate">{item.nombre}</span>
                                        <span className="text-muted-foreground text-xs">${Number(item.precio).toLocaleString('es-AR')} c/u</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 sm:justify-end">
                                        {/* CONTROLES DE CANTIDAD */}
                                        <div className="flex items-center bg-muted rounded-md border border-border overflow-hidden">
                                            <button 
                                                onClick={() => cambiarCantidad(item.sku, -1)}
                                                className="px-2.5 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-30"
                                                disabled={item.cantidad <= 1}
                                            > - </button>
                                            <span className="px-2 font-bold min-w-[2rem] text-center text-xs">{item.cantidad}</span>
                                            <button 
                                                onClick={() => cambiarCantidad(item.sku, 1)}
                                                className="px-2.5 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-30"
                                                disabled={!hasStock}
                                                title={!hasStock ? "Stock máximo alcanzado" : ""}
                                            > + </button>
                                        </div>

                                        <span className="font-black text-emerald-600 min-w-[4rem] text-right">
                                            ${(item.precio * item.cantidad).toLocaleString('es-AR')}
                                        </span>
                                        
                                        {/* ELIMINAR */}
                                        <button 
                                            onClick={() => {
                                                const newList = productosSeleccionados.filter(p => p.sku !== item.sku);
                                                actualizarCarrito(newList);
                                            }}
                                            className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-md p-1.5 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                  </div>
              )}

              {/* CAMPOS ORIGINALES (Se autocompletan, pero se pueden editar) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Total Cobrado ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={saleAmount}
                      onChange={(e) => setSaleAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 border rounded-lg text-xl font-black text-emerald-600 focus:ring-2 focus:ring-orange-500 outline-none bg-background shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Detalle para el recibo</label>
                  <textarea 
                    placeholder="Ej: Zapatillas Nike..." 
                    value={saleConcept}
                    onChange={(e) => setSaleConcept(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background resize-none h-[46px]"
                  />
                </div>
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-lg flex gap-3">
                 <span className="text-orange-500 text-lg leading-none mt-0.5">⚠️</span>
                 <p className="text-[11px] text-orange-800 dark:text-orange-300 leading-tight">
                   <b>Auditoría:</b> Este pago manual impactará en el sistema y descontará el stock de los productos seleccionados, pero <b>no pasará por el filtro anti-fraude de la IA</b>.
                 </p>
              </div>

            </div> 

            <DialogFooter className="pt-2 border-t">
              <Button variant="ghost" onClick={() => setIsSaleModalOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleRegisterSale} 
                disabled={!saleAmount || isSubmittingSale}
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 px-8"
              >
                {isSubmittingSale ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                {isSubmittingSale ? "Procesando..." : "Confirmar Venta"}
              </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  )
}