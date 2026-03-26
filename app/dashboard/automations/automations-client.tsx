"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Bot, Copy, Zap, Plus, Trash2, Loader2, 
  List, MessageSquare, Pencil, Sparkles, Settings2, ChevronLeft, 
  ChevronRight, CornerDownRight, Image as ImageIcon, Lock, Music, Smile, Filter
} from "lucide-react"
import Swal from "sweetalert2"
import { motion, AnimatePresence } from "framer-motion"
import EmojiPicker, { Theme } from 'emoji-picker-react'
import {
  getRules, createMenuRule, updateMenuRule, deleteRule,
  getQuickReplies, createQuickReply, deleteQuickReply,
  getGeneralConfig, saveGeneralConfig,
  getChatbots, createChatbot, deleteChatbot, updateChatbotGreeting, getLineas, getPipelineStages, duplicateChatbot, updateChatbotName
} from "./actions"
import { uploadImage } from "@/lib/supabase-client" 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AIBotSettings } from "@/components/dashboard/ai-bot-settings"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
// --- Componentes UI Base ---
function GlassCard({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`relative bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
function GlassInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} className={`bg-white/50 backdrop-blur-sm border-white/60 focus:border-blue-400/50 focus:ring-blue-400/20 rounded-xl ${className}`} />
}
function GlassTextarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <Textarea {...props} className={`bg-white/50 backdrop-blur-sm border-white/60 focus:border-blue-400/50 focus:ring-blue-400/20 rounded-xl resize-none ${className}`} />
}
function PillTabs({ tabs, activeTab, onTabChange }: { tabs: { id: string; label: string; icon: React.ReactNode }[]; activeTab: string; onTabChange: (id: string) => void }) {
  return (
    <div className="flex gap-2 p-1.5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 w-fit">
      {tabs.map((tab) => (
        <motion.button key={tab.id} onClick={() => onTabChange(tab.id)} className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id ? "text-white" : "text-slate-600 hover:text-slate-800"}`}>
          {activeTab === tab.id && <motion.div layoutId="activePill" className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
          <span className="relative z-10 flex items-center gap-2">{tab.icon}{tab.label}</span>
        </motion.button>
      ))}
    </div>
  )
}

export default function AutomationsClient() {
  // 1. TODOS LOS ESTADOS ARRIBA (Limpio y ordenado)
  const [activeTab, setActiveTab] = useState("bot")
  const formRef = useRef<HTMLDivElement>(null)

  const [chatbots, setChatbots] = useState<any[]>([])
  const [selectedBot, setSelectedBot] = useState<any | null>(null)
  const [botGreeting, setBotGreeting] = useState("")
  const [savingGreeting, setSavingGreeting] = useState(false)
  const [showGreetingEmoji, setShowGreetingEmoji] = useState(false)

  const [rules, setRules] = useState<any[]>([])
  const [quickReplies, setQuickReplies] = useState<any[]>([])
  const [pipelineStages, setPipelineStages] = useState<any[]>([])
  const [lineas, setLineas] = useState<any[]>([])

  const [config, setConfig] = useState<any>({ 
    bienvenida_activa: false, 
    mensaje_bienvenida: "", 
    ausencia_activa: false, 
    hora_apertura: "", 
    hora_cierre: "", 
    mensaje_ausencia: "",
    fb_lead_message: "¡Hola! Vimos que te registraste en nuestro anuncio. 🎉 ¿En qué te podemos ayudar hoy?",
    fb_lead_line_id: "ALL"
  })
  const [loadingConfig, setLoadingConfig] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingToParentId, setAddingToParentId] = useState<string | null>(null) 
  const [menuTitle, setMenuTitle] = useState("")
  const [menuResponse, setMenuResponse] = useState("")
  const [loadingRule, setLoadingRule] = useState(false)
  const [showRuleEmoji, setShowRuleEmoji] = useState(false)
  const [menuPipelineStage, setMenuPipelineStage] = useState<string>("none")
  
  const [selectedFiles, setSelectedFiles] = useState<{file: File, type: 'image'|'audio'}[]>([])
  const [existingMedia, setExistingMedia] = useState<string[]>([]) 

  const [newShortcut, setNewShortcut] = useState("")
  const [newQuickMessage, setNewQuickMessage] = useState("")

  // 🔥 NUEVOS ESTADOS PARA EL NOMBRE
  const [botName, setBotName] = useState("")
  const [savingName, setSavingName] = useState(false)

  const [currentPlan, setCurrentPlan] = useState<"STARTER" | "PRO" | "ENTERPRISE" | "TRIAL">("STARTER")

  const [currentAiMode, setCurrentAiMode] = useState<string>("OFF")
  const [currentAiPrompt, setCurrentAiPrompt] = useState<string>("")

  const [iaBotsExtra, setIaBotsExtra] = useState(0) // 🔥 NUEVO ESTADO

  const [userPlan, setUserPlan] = useState("STARTER")

  // 2. FUNCIONES DE CARGA DE DATOS
  const loadChatbotsData = async () => { setChatbots(await getChatbots()) }
  const loadRules = async (botId: string) => { setRules(await getRules(botId)) }
  const loadQuickReplies = async () => { setQuickReplies(await getQuickReplies()) }
  const loadPipelineStages = async () => { setPipelineStages(await getPipelineStages()) }
  const loadLineasWhatsapp = async () => { setLineas(await getLineas() || []) }
  
  const loadGeneralConfig = async () => {
    const data = await getGeneralConfig()
    if (data) {
      setConfig({ 
        ...config, 
        ...data, 
        mensaje_bienvenida: data.mensaje_bienvenida || "", 
        mensaje_ausencia: data.mensaje_ausencia || "",
        fb_lead_message: data.fb_lead_message || "¡Hola! Vimos que te registraste en nuestro anuncio. 🎉 ¿En qué te podemos ayudar hoy?",
        fb_lead_line_id: data.fb_lead_line_id || "ALL"
      })
    }
  }

  
   useEffect(() => {
    fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data?.user) {
          const planReal = data.user.plan?.toUpperCase() || "STARTER";
          setCurrentPlan(planReal); 
          setUserPlan(planReal); // 🔥 AGREGAR ESTA LÍNEA AQUÍ
          setIaBotsExtra(data.user.ia_bots_extra || 0)
        }
      })
      .catch(console.error)
  }, [])


  // 3. EFECTOS (Un solo bloque limpio)
  useEffect(() => { 
    loadChatbotsData(); 
    loadQuickReplies(); 
    loadGeneralConfig(); 
    loadPipelineStages(); 
    loadLineasWhatsapp();
  }, [])

  useEffect(() => { 
    if (selectedBot) {
        loadRules(selectedBot.id)
        setBotGreeting(selectedBot.mensaje_saludo || "")
        setBotName(selectedBot.nombre || "") // 🔥 Cargar el nombre actual
    } 
  }, [selectedBot])

  // --- ACTIONS CHATBOTS ---
  const handleCreateBot = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Crear Departamento / Chatbot',
      html: `
        <div class="space-y-4 text-left px-2">
            <div><label class="text-sm font-bold text-slate-600">Nombre del Bot</label><input id="bot-name" class="swal2-input !m-0 !w-full" placeholder="Ej: Ventas, Soporte..." /></div>
            <div><label class="text-sm font-bold text-slate-600 block mb-2">Color identificador</label><input id="bot-color" type="color" value="#8b5cf6" class="w-full h-12 rounded-xl cursor-pointer border-none" /></div>
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'Crear Bot', confirmButtonColor: '#8b5cf6',
      preConfirm: () => {
        const name = (document.getElementById('bot-name') as HTMLInputElement).value;
        const color = (document.getElementById('bot-color') as HTMLInputElement).value;
        if (!name) Swal.showValidationMessage('El nombre es requerido');
        return { name, color };
      }
    });

    if (formValues) {
      const res = await createChatbot(formValues.name, formValues.color);
      if (res.success) { Swal.fire({ icon: 'success', title: 'Bot Creado', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false }); loadChatbotsData(); }
    }
  }

  const handleDeleteBot = async (botId: string) => {
    const result = await Swal.fire({ title: '¿Eliminar Chatbot?', text: 'Se borrarán todos sus sub-menús.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, eliminar' });
    if (result.isConfirmed) { await deleteChatbot(botId); setSelectedBot(null); loadChatbotsData(); }
  }

const handleDuplicateBot = async (botId: string) => {
    // 1. Buscamos el bot completo en nuestra lista
    const botToDuplicate = chatbots.find(b => b.id === botId);
    if (!botToDuplicate) return; // Por seguridad

    // 2. SweetAlert con advertencia e input (ahora sí tiene el nombre real)
    const { value: newName } = await Swal.fire({
      title: 'Duplicar Chatbot',
      text: 'Se creará una copia exacta de este bot (flujos, archivos y respuestas). Ingresa un nombre para la copia:',
      input: 'text',
      inputValue: `${botToDuplicate.nombre} (Copia)`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Duplicar Bot',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      inputValidator: (value) => {
        if (!value.trim()) return '¡Necesitas ingresar un nombre!';
      }
    });

    if (!newName) return; // Si cancela o cierra, no hacemos nada

    // 3. Cargando...
    Swal.fire({
      title: 'Duplicando...',
      html: 'Generando nuevo árbol de opciones 🤖',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // 4. Disparamos la acción pasando el ID y el Nombre Nuevo
    const res = await duplicateChatbot(botId, newName);
    
    if (res.success) {
      Swal.fire({ icon: 'success', title: '¡Bot Duplicado!', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      loadChatbotsData();
    } else {
      Swal.fire("Error", res.error || "Ocurrió un error al duplicar", "error");
    }
  }

  const handleSaveBotName = async () => {
      if(!selectedBot || !botName.trim()) return;
      setSavingName(true);
      const res = await updateChatbotName(selectedBot.id, botName);
      setSavingName(false);
      
      if(res.success) {
          setSelectedBot({...selectedBot, nombre: botName});
          Swal.fire({ icon: 'success', title: 'Nombre actualizado', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
          loadChatbotsData(); // Refresca la lista de bots en el fondo
      }
  }

  const handleSaveBotGreeting = async () => {
      if(!selectedBot) return;
      setSavingGreeting(true)
      const res = await updateChatbotGreeting(selectedBot.id, botGreeting)
      setSavingGreeting(false)
      
      if(res.success) {
          setSelectedBot({...selectedBot, mensaje_saludo: botGreeting})
          Swal.fire({ icon: 'success', title: 'Saludo actualizado', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false })
      }
  }

  // --- ACTIONS RULES (CON SCROLL) ---
  const scrollToForm = () => {
      setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100);
  }

  const startEditing = (rule: any) => {
      setMenuTitle(rule.titulo); 
      setMenuResponse(rule.mensaje); 
      setEditingId(rule.id); 
      setAddingToParentId(null); 
      setSelectedFiles([]);
      setExistingMedia(rule.media_url ? rule.media_url.split(',') : []);
      setMenuPipelineStage(rule.pipeline_stage_id || "none");
      scrollToForm();
  }

  const startAddingChild = (parentId: string) => {
      setMenuTitle(""); 
      setMenuResponse(""); 
      setEditingId(null); 
      setAddingToParentId(parentId); 
      setSelectedFiles([]); 
      setExistingMedia([]);
      setMenuPipelineStage("none"); 
      scrollToForm();
  }

  const cancelEditing = () => {
      setMenuTitle(""); 
      setMenuResponse(""); 
      setEditingId(null); 
      setAddingToParentId(null); 
      setSelectedFiles([]); 
      setExistingMedia([]); 
      setShowRuleEmoji(false);
      setMenuPipelineStage("none"); 
  }

  const removeExistingMedia = (index: number) => {
      setExistingMedia(prev => prev.filter((_, i) => i !== index));
  }

  const handleCreateOrUpdateMenu = async () => {
    if (!menuTitle || !menuResponse) return Swal.fire("Faltan datos", "Agrega título y respuesta", "warning")
    if (!selectedBot) return;

    setLoadingRule(true)
    let res;
    
    let finalMediaUrls = [...existingMedia];
    if (selectedFiles.length > 0) {
        for (const f of selectedFiles) {
            const url = await uploadImage(f.file);
            if (url) finalMediaUrls.push(url);
        }
    }
    const mediaUrlString = finalMediaUrls.length > 0 ? finalMediaUrls.join(',') : null;
    const stageToSave = menuPipelineStage === "none" ? null : menuPipelineStage;

    if (editingId) {
        res = await updateMenuRule(editingId, menuTitle, menuResponse, mediaUrlString, stageToSave)
    } else {
        res = await createMenuRule(selectedBot.id, menuTitle, menuResponse, addingToParentId, mediaUrlString, stageToSave)
    }
    
    setLoadingRule(false)
    
    if (res.success) {
        cancelEditing()
        loadRules(selectedBot.id)
        Swal.fire({ icon: 'success', title: editingId ? 'Actualizado' : 'Creado', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false })
    } else {
        Swal.fire("Error", res?.error || "Ocurrió un error al guardar", "error")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const files = Array.from(e.target.files);
          if (files.length + selectedFiles.length > 3) {
              Swal.fire("Límite excedido", "Puedes subir un máximo de 3 archivos por respuesta", "warning");
              return;
          }

          const validFiles: {file: File, type: 'image'|'audio'}[] = [];
          let hadErrors = false;

          files.forEach(f => {
              if (f.type.startsWith('image/')) {
                  if (f.size <= 2 * 1024 * 1024) validFiles.push({ file: f, type: 'image' });
                  else hadErrors = true;
              } else if (f.type.startsWith('audio/')) {
                  if (f.size <= 5 * 1024 * 1024) validFiles.push({ file: f, type: 'audio' });
                  else hadErrors = true;
              }
          });

          if (hadErrors) {
              Swal.fire("Archivos pesados", "Imágenes máx 2MB, Audios máx 5MB. Algunos fueron descartados.", "warning");
          }
          
          setSelectedFiles(prev => [...prev, ...validFiles]);
      }
  }

  const removeFile = (index: number) => {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  const handleDeleteRule = async (id: string) => {
      const res = await Swal.fire({ title: '¿Eliminar?', text: 'Si tiene sub-opciones, también se borrarán.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' })
      if(res.isConfirmed) { await deleteRule(id, selectedBot.id); loadRules(selectedBot.id); }
  }

  const handleCreateQuick = async () => { await createQuickReply(newShortcut, newQuickMessage); setNewShortcut(""); setNewQuickMessage(""); loadQuickReplies() }
  const handleDeleteQuick = async (id: string) => { await deleteQuickReply(id); loadQuickReplies() }
  const handleSaveConfig = async () => { setLoadingConfig(true); await saveGeneralConfig(config); setLoadingConfig(false); Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false }) }

  // 4. CONFIGURACIÓN DE TABS (Con Facebook Leads incluido)
  const tabs = [
    { id: "bot", label: "Departamentos & Bots", icon: <Bot className="w-4 h-4" /> },
    { id: "quick", label: "Respuestas Rápidas", icon: <Zap className="w-4 h-4" /> },
    { id: "config", label: "Configuración Global", icon: <Settings2 className="w-4 h-4" /> },
    { id: "fbleads", label: "Facebook Leads", icon: <MessageSquare className="w-4 h-4" /> },
  ]

  const renderRulesTree = (parentId: string | null = null, depth: number = 0) => {
    const children = rules.filter(r => r.parent_id === parentId).sort((a,b) => parseInt(a.tipo) - parseInt(b.tipo));
    if (children.length === 0) return null;



    return (
      <div className={`space-y-3 ${depth > 0 ? 'ml-6 pl-4 border-l-2 border-indigo-100/50' : ''}`}>
        {children.map((rule, idx) => (
          <motion.div key={rule.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
            <GlassCard className="p-4 group transition-all duration-300 hover:border-indigo-300 relative">
              {depth > 0 && <div className="absolute -left-4 top-8 w-4 h-0.5 bg-indigo-100/50" />}
              <div className="flex items-start gap-4">
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${depth === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                  {rule.tipo}
                </div>
                <div className="flex-1 min-w-0">
                 <h4 className="font-semibold text-slate-800 flex items-center gap-2">
  {rule.titulo}
  {depth === 0 && <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-600">Menú Principal</Badge>}
  
  {/* 🔥 NUEVO INDICADOR VISUAL DE ARCHIVOS */}
  {rule.media_url && (
      <Badge variant="outline" className="text-[10px] bg-indigo-50/50 text-indigo-500 border-indigo-100 flex items-center gap-1 px-1.5 py-0">
          <ImageIcon className="w-3 h-3" />
          {rule.media_url.split(',').length}
      </Badge>
  )}
</h4>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">{rule.mensaje}</p>

                  <div className="mt-3">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2" onClick={() => startAddingChild(rule.id)}>
                      <Plus className="w-3 h-3 mr-1" /> Agregar sub-opción
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50" onClick={() => startEditing(rule)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={()=>handleDeleteRule(rule.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </GlassCard>
            {renderRulesTree(rule.id, depth + 1)}
          </motion.div>
        ))}
      </div>
    )
  }

  const rootRules = rules.filter(r => r.parent_id === null).sort((a,b) => parseInt(a.tipo) - parseInt(b.tipo));
  const displayGreeting = selectedBot?.mensaje_saludo || config.mensaje_bienvenida || "¡Hola! Bienvenido a nuestro servicio.";

// --- MATEMÁTICA DE LÍMITES PARA CREAR BOTS ---
  // Starter: 1, Pro: 3, Enterprise: 5 (o 9999 si es infinito)
  const baseBots = userPlan === 'ENTERPRISE' ? 5 : userPlan === 'PRO' ? 3 : 1; 
  const limitBots = baseBots; 
  const usedBots = chatbots.length;
  const isBotLimitReached = usedBots >= limitBots;

// --- MATEMÁTICA QUIRÚRGICA PARA IA VENDEDORA (FULL) ---
  // Starter: 0, Pro: 1, Enterprise: 1 (Límite base por plan)
  const baseAIBots = userPlan === 'ENTERPRISE' ? 1 : userPlan === 'PRO' ? 1 : 0; 
  
  // Sumamos la base + los extras que compró (Addons)
  const totalAIBotsAllowed = baseAIBots + iaBotsExtra;

  // 🔥 CORRECCIÓN CLAVE: En tu DB la columna es 'ai_mode', no 'mode'
  const usedAIBots = chatbots.filter(b => b.ai_mode === 'FULL').length;
  
  // Revisamos si el bot que el usuario tiene seleccionado AHORA ya tiene la IA
  const isThisBotAlreadyFull = selectedBot?.ai_mode === 'FULL';

  // ESTA ES LA MAGIA: Solo podemos activar la IA si:
  // 1. O si el bot que estás editando ya la tiene
  // 2. O si los que estás usando son MENOS que los que tienes permitidos en total
  const canEnableFullForThisBot = isThisBotAlreadyFull || (usedAIBots < totalAIBotsAllowed);
  
  const canUseFull = canEnableFullForThisBot;

  return (
    <div className="flex-1 space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30"><Bot className="h-6 w-6 text-white" /></div>
            Centro de Automatización
          </h1>
          <p className="text-slate-500 mt-1">Configura tus bots, menús y respuestas rápidas para todo el equipo.</p>
        </div>
        <PillTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "bot" && (
          <motion.div key="bot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            
            {!selectedBot ? (
                // --- LISTA DE BOTS ---
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white/40 p-4 rounded-2xl backdrop-blur-md border border-white/50">
            <p className="text-slate-600 font-medium">Crea departamentos y asígnalos a tus líneas de WhatsApp.</p>
            
            {/* 🔥 BOTÓN CREAR BOT CON LÍMITES */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div tabIndex={0} className="inline-block">
                            {isBotLimitReached ? (
                                <Button disabled className="bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-xl cursor-not-allowed font-semibold shadow-sm">
                                    <Lock className="mr-2 h-4 w-4" />
                                    Límite Alcanzado ({usedBots}/{limitBots})
                                </Button>
                            ) : (
                                <Button onClick={handleCreateBot} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-all">
                                    <Plus className="mr-2 h-4 w-4" /> 
                                    Crear Chatbot ({usedBots}/{userPlan === 'ENTERPRISE' ? '5' : limitBots})
                                </Button>
                            )}
                        </div>
                    </TooltipTrigger>
                    
                    {isBotLimitReached && (
                        <TooltipContent className="bg-slate-900 text-white border-none shadow-xl p-3 rounded-xl z-50">
                            <p className="font-semibold text-sm">Límite de Chatbots alcanzado</p>
                            <p className="text-xs text-slate-300 mt-1">Tu plan te permite crear hasta {limitBots} bot(s).</p>
                            <a href="/dashboard/billing" className="text-emerald-400 text-xs font-bold mt-2 inline-block hover:underline">
                                Mejorar plan para más bots &rarr;
                            </a>
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>
        </div>

                    {chatbots.length === 0 ? (
                        <GlassCard className="p-12 text-center flex flex-col items-center">
                            <div className="p-5 bg-indigo-100 rounded-full mb-4"><Bot className="h-10 w-10 text-indigo-600" /></div>
                            <h3 className="text-xl font-bold text-slate-800">No tienes Chatbots creados</h3>
                            <Button onClick={handleCreateBot} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 shadow-lg shadow-indigo-200"><Plus className="mr-2 h-5 w-5" /> Crear mi primer Bot</Button>
                        </GlassCard>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {chatbots.map((bot, idx) => (
                                <motion.div key={bot.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} onClick={() => setSelectedBot(bot)} className="group cursor-pointer">
                                    <GlassCard className="p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-indigo-100 h-full flex flex-col justify-between">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: bot.color }}><Bot className="h-6 w-6" /></div>
                                            <div className="flex items-center gap-1">
        {/* 🔥 NUEVO BOTÓN DE DUPLICAR */}
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50" 
            onClick={(e) => { e.stopPropagation(); handleDuplicateBot(bot.id); }}
            title="Duplicar Bot"
        >
            <Copy className="h-4 w-4" />
        </Button>
        
        {/* TU BOTÓN ACTUAL DE ELIMINAR */}
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50" 
            onClick={(e) => { e.stopPropagation(); handleDeleteBot(bot.id); }}
            title="Eliminar Bot"
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    </div>
                                        </div>
                                        <div><h4 className="font-bold text-slate-800 text-lg">{bot.nombre}</h4></div>
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-indigo-600 font-medium text-sm">Configurar Flujo <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></div>
                                    </GlassCard>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // --- EDITOR DE FLUJOS ---
                <div className="space-y-6">
                    <div className="flex items-center justify-between bg-white/60 p-3 px-4 rounded-2xl backdrop-blur-md border border-white/50 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedBot(null); cancelEditing(); }} className="rounded-xl text-slate-500 hover:text-slate-800">
                                <ChevronLeft className="h-4 w-4 mr-1" /> Volver a Departamentos
                            </Button>
                            <div className="h-6 w-px bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: selectedBot.color }}><Bot className="h-3 w-3" /></div>
                                <span className="font-bold text-slate-700">Flujo de: {selectedBot.nombre}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-7 space-y-6">

                      <GlassCard className="border-indigo-100/50 mb-6">
                            <div className="p-4 border-b border-white/30 bg-white/30">
                                <h3 className="font-semibold text-slate-700 text-sm">Nombre del Departamento / Chatbot</h3>
                            </div>
                            <div className="p-4 flex items-center gap-4">
                                <GlassInput 
                                    value={botName} 
                                    onChange={(e) => setBotName(e.target.value)} 
                                    className="flex-1 font-semibold text-slate-800"
                                    placeholder="Ej: Ventas, Soporte..."
                                />
                                <Button 
                                    onClick={handleSaveBotName} 
                                    disabled={savingName || botName === selectedBot.nombre} 
                                    size="sm" 
                                    className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg shrink-0"
                                >
                                    {savingName ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : "Guardar Nombre"}
                                </Button>
                            </div>
                        </GlassCard>

                        {/* SALUDO ESPECÍFICO */}
                        <GlassCard className="border-indigo-100/50 overflow-visible">
                            <div className="p-4 border-b border-white/30 bg-white/30">
                                <h3 className="font-semibold text-slate-700 text-sm">GENERAL - Saludo inicial del Departamento</h3>
                            </div>
                            <div className="p-4 space-y-3 relative">
                                <div className="relative">
                                    <GlassTextarea placeholder="Ej: ¡Hola! Somos el equipo de Ventas..." value={botGreeting} onChange={(e) => setBotGreeting(e.target.value)} className="h-20 pr-10" />
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-400 hover:text-indigo-500" onClick={() => setShowGreetingEmoji(!showGreetingEmoji)}>
                                        <Smile className="w-5 h-5" />
                                    </Button>
                                    {showGreetingEmoji && (
                                        <div className="absolute top-12 right-0 z-50 shadow-2xl rounded-2xl overflow-hidden">
                                            <EmojiPicker theme={Theme.LIGHT} onEmojiClick={(e) => { setBotGreeting(prev => prev + e.emoji); setShowGreetingEmoji(false) }} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleSaveBotGreeting} disabled={savingGreeting} size="sm" className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg">
                                        {savingGreeting ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : "Guardar Saludo"}
                                    </Button>
                                </div>
                            </div>
                        </GlassCard>

                       <AIBotSettings 
    chatbotId={selectedBot.id} 
    plan={currentPlan} 
    onStateChange={(m, p) => { setCurrentAiMode(m); setCurrentAiPrompt(p); }} 
    pipelineStages={pipelineStages}
    baseAIBots={totalAIBotsAllowed}
    canUseFull={canUseFull} 
  />
                        
                        {/* FORMULARIO (Con Ref para el Scroll) */}
                       {/* =========================================================
                            ZONA CONDICIONAL: SE OCULTA SI ESTÁ EN MODO "FULL"
                            ========================================================= */}
                        {currentAiMode !== "FULL" && (
                          <>
                            {/* FORMULARIO (Con Ref para el Scroll) */}
                            <div ref={formRef}>
                              <GlassCard className={`${editingId ? 'ring-2 ring-orange-400/50' : addingToParentId ? 'ring-2 ring-emerald-400/50' : 'ring-2 ring-indigo-400/30'} overflow-visible`}>
                                <div className="p-6 border-b border-white/30 flex items-center justify-between bg-white/40">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${editingId ? 'bg-orange-100' : addingToParentId ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                                      {editingId ? <Pencil className="w-4 h-4 text-orange-600"/> : addingToParentId ? <CornerDownRight className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4 text-indigo-600"/>}
                                    </div>
                                    <div>
                                      <h3 className="font-semibold text-slate-800">
                                        {editingId ? "Editar Opción" : addingToParentId ? "Crear Sub-Opción" : "Agregar Menú Principal"}
                                      </h3>
                                    </div>
                                  </div>
                                  {(editingId || addingToParentId) && (
                                    <Button variant="ghost" size="sm" onClick={cancelEditing} className="text-slate-500 hover:text-slate-700 bg-white shadow-sm">Cancelar</Button>
                                  )}
                                </div>
                                
                                <div className="p-6 space-y-4">
                                  <div className="grid grid-cols-4 gap-4 items-center">
                                    <div className="col-span-1 flex justify-center">
                                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ${editingId ? 'bg-gradient-to-br from-orange-400 to-orange-500' : addingToParentId ? 'bg-gradient-to-br from-emerald-400 to-emerald-500' : 'bg-gradient-to-br from-indigo-400 to-indigo-500'} text-white`}>
                                        {editingId ? <Pencil className="w-5 h-5"/> : "#"}
                                      </div>
                                    </div>
                                    <div className="col-span-3">
                                      <GlassInput placeholder="Título (Ej: Ventas, Soporte)" value={menuTitle} onChange={e => setMenuTitle(e.target.value)} />
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2 relative">
                                    <Label className="text-xs text-slate-500 ml-1">Respuesta del Bot al elegir esta opción:</Label>
                                    <div className="relative">
                                        <GlassTextarea placeholder="Lo que dirá el bot..." value={menuResponse} onChange={e => setMenuResponse(e.target.value)} className="h-24 pr-10" />
                                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-400 hover:text-indigo-500" onClick={() => setShowRuleEmoji(!showRuleEmoji)}>
                                            <Smile className="w-5 h-5" />
                                        </Button>
                                        {showRuleEmoji && (
                                            <div className="absolute top-12 right-0 z-50 shadow-2xl rounded-2xl overflow-hidden">
                                                <EmojiPicker theme={Theme.LIGHT} onEmojiClick={(e) => { setMenuResponse(prev => prev + e.emoji); setShowRuleEmoji(false) }} />
                                            </div>
                                        )}
                                    </div>
                                  </div>

                                  {/* ARCHIVOS (IMÁGENES Y AUDIOS) */}
                                  <div className="space-y-3 pt-4 border-t border-slate-100">
                                      <Label className="text-xs text-slate-500 ml-1 flex items-center gap-1 font-semibold">
                                          Adjuntar Archivos (Opcional - Máx 3)
                                      </Label>
                                      
                                      <div className="flex items-center gap-2">
                                          <Label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors text-sm font-medium border border-slate-200 border-dashed">
                                              <ImageIcon className="w-4 h-4 text-indigo-500" />
                                              <Music className="w-4 h-4 text-emerald-500" />
                                              <span>Subir Imagen / Audio</span>
                                          </Label>
                                          <input id="file-upload" type="file" accept="image/*, audio/*" multiple className="hidden" onChange={handleFileChange} />
                                      </div>

                                      {/* Píldoras de archivos subidos */}
                                      {selectedFiles.length > 0 && (
                                          <div className="flex flex-wrap gap-2 mt-2">
                                              {selectedFiles.map((f, i) => (
                                                  <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${f.type === 'image' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                      {f.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                                                      <span className="truncate max-w-[120px]">{f.file.name}</span>
                                                      <button onClick={() => removeFile(i)} className="ml-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>

                                  {existingMedia.length > 0 && (
                                      <div className="flex flex-wrap gap-3 mt-3">
                                          {existingMedia.map((url, i) => (
                                              <div key={i} className="relative group">
                                                  {url.includes('.mp3') || url.includes('.ogg') || url.includes('.wav') || url.includes('audio') ? (
                                                      <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                                          <Music className="w-5 h-5 text-emerald-600" />
                                                          <span className="text-xs font-medium text-emerald-700">Audio Guardado</span>
                                                      </div>
                                                  ) : (
                                                      <img src={url} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-slate-200 shadow-sm" />
                                                  )}
                                                  <button onClick={() => removeExistingMedia(i)} className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white rounded-full p-1 shadow-sm transition-colors opacity-0 group-hover:opacity-100">
                                                      <Trash2 className="w-3 h-3" />
                                                  </button>
                                              </div>
                                          ))}
                                      </div>
                                  )}

                                  {(!addingToParentId && (!editingId || rules.find(r => r.id === editingId)?.parent_id === null)) && (
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        <Label className="text-xs text-slate-500 ml-1 flex items-center gap-1 font-semibold">
                                            <Filter className="w-4 h-4 text-orange-500" />
                                            Acción Automática: Lead Scoring (Pipeline)
                                        </Label>
                                        <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                                            <p className="text-[11px] text-slate-500 mb-2">Si el cliente elige esta opción, su contacto se moverá automáticamente a esta etapa del Kanban:</p>
                                            <Select value={menuPipelineStage} onValueChange={setMenuPipelineStage}>
                                                <SelectTrigger className="bg-white border-slate-200 shadow-sm rounded-lg">
                                                    <SelectValue placeholder="No realizar acción" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="none" className="italic text-slate-400">No mover el contacto</SelectItem>
                                                    {pipelineStages.map(stage => (
                                                        <SelectItem key={stage.id} value={stage.id}>
                                                            <div className="flex items-center gap-2 font-medium">
                                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                                                                {stage.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                  )}

                                  <Button 
                                    onClick={handleCreateOrUpdateMenu} disabled={loadingRule} 
                                    className={`w-full rounded-xl py-5 font-semibold shadow-lg transition-all text-white mt-4 ${editingId ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-orange-500/30' : addingToParentId ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-emerald-500/30' : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-indigo-500/30'}`}
                                  >
                                    {loadingRule ? <Loader2 className="animate-spin w-4 h-4"/> : (editingId ? "Guardar Cambios" : "Guardar Opción")}
                                  </Button>
                                </div>
                              </GlassCard>
                            </div>

                            {/* ÁRBOL RECURSIVO */}
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center justify-between px-1">
                                <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2"><List className="w-4 h-4" /> Estructura del Chatbot</h3>
                              </div>
                              {rules.length === 0 ? (
                                <GlassCard className="p-8 text-center border-dashed"><p className="text-slate-400 italic">El flujo está vacío. Agrega la opción 1 arriba.</p></GlassCard>
                              ) : (
                                <div className="bg-white/40 p-4 rounded-3xl border border-white/50 shadow-inner">
                                    {renderRulesTree(null, 0)}
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {/* =========================================================
                            MENSAJE DE MODO FULL (Reemplaza al árbol)
                            ========================================================= */}
                        {currentAiMode === "FULL" && (
                          <div className="p-8 text-center bg-blue-50/50 rounded-3xl border border-blue-100 mt-6 animate-in zoom-in-95">
                            <Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">Modo Vendedor Experto Activado</h3>
                            <p className="text-slate-600 mt-2 max-w-lg mx-auto text-sm">
                              La Inteligencia Artificial tiene el control total de las conversaciones en este departamento. 
                              No necesitas crear menús ni opciones. La IA charlará de forma natural basándose en el <strong>Cerebro IA</strong> que configuraste arriba.
                            </p>
                          </div>
                        )}

                      </div>

                      {/* DERECHA: MOCKUP CELULAR STICKY */}
                      <div className="lg:col-span-5 flex justify-center lg:justify-start items-start">
                        <div className="sticky top-6">
                          <div className="relative">
                            <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-[4rem] blur-2xl" />
                            <div className="relative w-[320px] h-[600px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl border-4 border-gray-800">
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-gray-800 rounded-b-xl z-20" />
                              <div className="h-full w-full bg-[#E5DDD5] rounded-[2.5rem] overflow-hidden flex flex-col relative">
                                
                                <div className="bg-[#075E54] h-16 flex items-end pb-2 px-4 text-white z-10">
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs shadow-md border border-white/20" style={{ backgroundColor: selectedBot.color }}>
                                        <Bot className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="text-sm font-medium">{selectedBot.nombre}</div>
                                  </div>
                                </div>

                                <div className="flex-1 p-3 space-y-3 overflow-y-auto text-xs pb-10" style={{backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: "soft-light"}}>
                                  <div className="flex justify-end"><div className="bg-[#DCF8C6] p-2 rounded-lg rounded-tr-none shadow-sm max-w-[80%]">hola<span className="text-[9px] text-gray-500 block text-right mt-1">10:00</span></div></div>

                                  {/* CONDICIONAL DEL MOCKUP: FULL IA vs NODOS */}
                                  {currentAiMode === "FULL" ? (
                                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                                      <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm max-w-[85%] border-l-2 border-blue-500">
                                        <p className="whitespace-pre-wrap mb-1 text-slate-700">
                                          ✨ ¡Hola! Soy <strong className="text-blue-600">
                                            {currentAiPrompt.match(/eres\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)/i)?.[1] || "tu asistente virtual"}
                                          </strong>. ¿En qué te puedo ayudar hoy?
                                        </p>
                                        <span className="text-[9px] text-gray-400 block text-right">10:00</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {displayGreeting && (
                                        <div className="flex justify-start">
                                          <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm max-w-[85%]">
                                            <p className="whitespace-pre-wrap mb-1 text-slate-700">{displayGreeting}</p>
                                            <span className="text-[9px] text-gray-400 block text-right">10:00</span>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {rootRules.length > 0 && (
                                        <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                                          <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm max-w-[85%]">
                                            <p className="font-bold text-gray-800 mb-2">Selecciona una opción:</p>
                                            <div className="space-y-1.5">
                                              {rootRules.map(r => (
                                                <div key={r.id} className="text-slate-600 font-medium"><span className="text-blue-500 mr-1">{r.tipo}.</span> {r.titulo}</div>
                                              ))}
                                              <div className="pt-2 mt-2 border-t border-slate-100">
                                                <div className="text-slate-500 font-medium"><span className="text-slate-400 mr-1">0.</span> Volver al menú anterior</div>
                                                <div className="text-slate-500 font-medium"><span className="text-slate-400 mr-1">#.</span> Volver al menú principal</div>
                                              </div>
                                            </div>
                                            <span className="text-[9px] text-gray-400 block text-right mt-2 border-t border-gray-100 pt-1">10:00</span>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
            )}
          </motion.div>
        )}

        {/* ================= TAB 2: RESPUESTAS RÁPIDAS ================= */}
        {activeTab === "quick" && (
          <motion.div key="quick" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="lg:col-span-1 h-fit ring-2 ring-amber-400/30">
              <div className="p-6 border-b border-white/30"><h3 className="font-semibold text-slate-800 flex items-center gap-2"><div className="p-2 rounded-xl bg-amber-100"><Plus className="w-4 h-4 text-amber-600" /></div>Nuevo Atajo</h3></div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2"><span className="text-2xl font-bold text-slate-300">/</span><GlassInput placeholder="cbu, precio..." value={newShortcut} onChange={e=>setNewShortcut(e.target.value)} /></div>
                <GlassTextarea placeholder="Mensaje completo..." value={newQuickMessage} onChange={e=>setNewQuickMessage(e.target.value)} className="h-28" />
                <Button onClick={handleCreateQuick} className="w-full rounded-xl py-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/30 font-semibold">Crear Atajo</Button>
              </div>
            </GlassCard>

            <GlassCard className="lg:col-span-2">
              <div className="p-6 border-b border-white/30"><h3 className="font-semibold text-slate-800 flex items-center gap-2"><div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg"><Zap className="w-4 h-4 text-white" /></div>Mis Atajos</h3></div>
              <div className="p-6 space-y-3">
                {quickReplies.length === 0 && <p className="text-center text-slate-400 py-12 italic">Sin atajos creados.</p>}
                {quickReplies.map((qr, idx) => (
                  <motion.div key={qr.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/60 group hover:shadow-lg transition-all">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 px-3 py-1.5 text-sm font-mono shrink-0 shadow-md">/{qr.atajo}</Badge>
                      <p className="text-sm text-slate-600 truncate">{qr.mensaje}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => {navigator.clipboard.writeText(qr.mensaje); Swal.fire({title:"Copiado", icon:"success", toast:true, position:"top-end", timer:1500, showConfirmButton:false})}}><Copy className="w-4 h-4 text-slate-400"/></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-500" onClick={()=>handleDeleteQuick(qr.id)}><Trash2 className="w-4 h-4"/></Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* ================= TAB 3: CONFIGURACIÓN GLOBAL ================= */}
        {activeTab === "config" && (
          <motion.div key="config" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard>
                <div className="p-6 border-b border-white/30 flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-2xl">👋</span><h3 className="font-semibold text-slate-800">Mensaje de Bienvenida</h3></div><Switch checked={config.bienvenida_activa} onCheckedChange={(c) => setConfig({...config, bienvenida_activa: c})} /></div>
                <div className="p-6 space-y-3"><p className="text-sm text-slate-500">Se envía automáticamente antes de mostrar el menú.</p><GlassTextarea placeholder="Hola! Gracias por contactarnos..." value={config.mensaje_bienvenida} onChange={(e) => setConfig({...config, mensaje_bienvenida: e.target.value})} className="h-32" /></div>
              </GlassCard>

              <GlassCard>
                <div className="p-6 border-b border-white/30 flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-2xl">🌙</span><h3 className="font-semibold text-slate-800">Mensaje de Ausencia</h3></div><Switch checked={config.ausencia_activa} onCheckedChange={(c) => setConfig({...config, ausencia_activa: c})} /></div>
                <div className="p-6 space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2"><Label className="text-xs text-slate-500">Abre</Label><GlassInput type="time" value={config.hora_apertura} onChange={(e)=>setConfig({...config, hora_apertura: e.target.value})}/></div>
                    <div className="flex-1 space-y-2"><Label className="text-xs text-slate-500">Cierra</Label><GlassInput type="time" value={config.hora_cierre} onChange={(e)=>setConfig({...config, hora_cierre: e.target.value})}/></div>
                  </div>
                  <GlassTextarea placeholder="Estamos cerrados..." value={config.mensaje_ausencia} onChange={(e) => setConfig({...config, mensaje_ausencia: e.target.value})} className="h-20" />
                </div>
              </GlassCard>
            </div>
            <div className="flex justify-end"><Button onClick={handleSaveConfig} disabled={loadingConfig} className="rounded-xl px-8 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/30 font-semibold">{loadingConfig ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : "Guardar Todo"}</Button></div>
          </motion.div>
        )}

        {/* ================= TAB 4: FACEBOOK LEADS ================= */}
        {activeTab === "fbleads" && (
          <motion.div key="fbleads" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
            <GlassCard className="max-w-3xl mx-auto ring-2 ring-blue-400/30">
              <div className="p-6 border-b border-white/30 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shadow-inner">
                  <img src="/images/design-mode/124010.png" alt="FB" className="h-5 w-5 object-contain" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Mensaje para Facebook Leads</h3>
                  <p className="text-sm text-slate-500">Personaliza el primer contacto automático para tus anuncios.</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Mensaje de Bienvenida</Label>
                  <GlassTextarea
                    value={config.fb_lead_message}
                    onChange={(e) => setConfig({...config, fb_lead_message: e.target.value})}
                    placeholder="¡Hola! Vimos tu registro en Facebook..."
                    className="h-28"
                  />
                  <p className="text-xs text-slate-500">Tip: Usa <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-bold">{'{nombre}'}</span> para que la IA salude al cliente por su nombre.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">¿Desde qué línea enviamos el mensaje?</Label>
                  <Select value={config.fb_lead_line_id} onValueChange={(val) => setConfig({...config, fb_lead_line_id: val})}>
                    <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/60 focus:ring-blue-400/20 rounded-xl h-12">
                      <SelectValue placeholder="Selecciona una línea" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="ALL">Cualquier línea conectada (Aleatorio)</SelectItem>
                      {lineas.map(linea => (
                        <SelectItem key={linea.id} value={linea.id.toString()}>
                          {linea.nombre || linea.telefono || `Línea ${linea.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">¿A qué columna del Kanban (Ventas) los enviamos?</Label>
                  <Select value={config.fb_lead_pipeline_stage_id || "none"} onValueChange={(val) => setConfig({...config, fb_lead_pipeline_stage_id: val})}>
                    <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/60 focus:ring-blue-400/20 rounded-xl h-12">
                      <SelectValue placeholder="Selecciona una etapa" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="text-slate-400 italic">No enviar al Kanban</SelectItem>
                      {pipelineStages.map(stage => (
                        <SelectItem key={stage.id} value={stage.id.toString()}>
                          <div className="flex items-center gap-2 font-medium">
                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: stage.color }} />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 flex justify-end">
                  {/* Reutilizamos handleSaveConfig porque ya maneja todo el objeto config */}
                  <Button onClick={handleSaveConfig} disabled={loadingConfig} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 shadow-lg shadow-blue-500/30 transition-all hover:scale-105">
                    {loadingConfig ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : "Guardar Configuración"}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
