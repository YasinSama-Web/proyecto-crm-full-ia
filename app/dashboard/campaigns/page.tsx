"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus, Eye, Trash2, Upload, Download, Database, FileSpreadsheet,
  PlayCircle, PauseCircle, CheckCircle2, Search, Users, Calendar, Clock, CreditCard , ShieldCheck, Copy,
  Megaphone, Zap, Send, Sparkles, Lock
} from "lucide-react"
import Swal from "sweetalert2"
import Papa from "papaparse"
import {
  getCampaigns,
  createCampaign,
  deleteCampaign,
  getCampaignTargets,
  logCampaignSend,
  updateCampaignStatus,
  getConnectedLines,
  getTagsWithCount,
  getAllContactsForSelector,
  saveCampaignMessageToChat
} from "./actions"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// === GLASS COMPONENTS - DARK MODE READY ===
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-border/50 dark:border-slate-700/50 shadow-xl ${className}`}>
      {children}
    </div>
  )
}

function GlassInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      className={`bg-background/50 dark:bg-slate-900/50 border-border/30 focus:bg-background/80 dark:focus:bg-slate-900/80 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl ${className}`}
      {...props}
    />
  )
}

function GlassTextarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Textarea
      className={`bg-background/50 dark:bg-slate-900/50 border-border/30 focus:bg-background/80 dark:focus:bg-slate-900/80 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl ${className}`}
      {...props}
    />
  )
}

// === TILT CARD FOR MODAL ===
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  // 🔥 CAMBIO 1: Reducimos de 5 a 1.5 grados (Mucho más sutil)
  const rotateX = useTransform(y, [-100, 100], [1.5, -1.5]) 
  const rotateY = useTransform(x, [-100, 100], [-1.5, 1.5]) 
  
  // Opcional: Puedes aumentar el damping a 40 o 50 para que sea más "pesado" y menos "gelatina"
  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 40 })
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 40 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set(e.clientX - centerX)
    y.set(e.clientY - centerY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      // 🔥 CAMBIO 2: Perspective de 1000 a 2500 (Hace el 3D menos agresivo)
      style={{ rotateX: springRotateX, rotateY: springRotateY, transformPerspective: 2500 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Funciones auxiliares (INTACTAS)
function processSpintax(text: string): string {
  return text.replace(/\{([^{}]+)\}/g, (_, options) => {
    const choices = options.split("|")
    return choices[Math.floor(Math.random() * choices.length)]
  })
}

function replaceVariables(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "")
}

// Colores dinámicos para la barra de progreso
const getProgressGradient = (percent: number) => {
  if (percent === 100) return "from-emerald-400 to-emerald-600"
  if (percent > 50) return "from-blue-400 to-blue-600"
  return "from-sky-400 to-blue-500"
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "draft": return { label: "Borrador", className: "bg-slate-500/20 text-muted-foreground border-border" }
    case "running": return { label: "En Curso", className: "bg-emerald-500/20 text-emerald-600 border-emerald-300 animate-pulse" }
    case "paused": return { label: "Pausada", className: "bg-amber-500/20 text-amber-600 border-amber-300" }
    case "completed": return { label: "Completada", className: "bg-blue-500/20 text-blue-600 border-blue-300" }
    case "scheduled": return { label: "Programada", className: "bg-violet-500/20 text-violet-600 border-violet-300" }
    default: return { label: status, className: "bg-gray-500/20 text-gray-600 border-gray-300" }
  }
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [monitorCampaign, setMonitorCampaign] = useState<string | null>(null)

  // Wizard state
  const [step, setStep] = useState(1)
  const [campaignName, setCampaignName] = useState("")
  const [sourceType, setSourceType] = useState<"crm" | "csv">("crm")
  const [phonePrefix, setPhonePrefix] = useState("549")
 
  // Configuración Nueva
  const [selectedLineId, setSelectedLineId] = useState<string>("")
  const [availableLines, setAvailableLines] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<{tag: string, count: number}[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
 
  // Programación
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")

  // Selector Manual
  const [showContactSelector, setShowContactSelector] = useState(false)
  const [allContacts, setAllContacts] = useState<any[]>([])
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [contactSearch, setContactSearch] = useState("")

  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [messageTemplate, setMessageTemplate] = useState("")
  const [speedValue, setSpeedValue] = useState([50])

  const [planCredits, setPlanCredits] = useState(0)
  const [extraCredits, setExtraCredits] = useState(0)

  const [userPlan, setUserPlan] = useState("STARTER")
  const [campanasRestantes, setCampanasRestantes] = useState(0)

useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data?.user) {
          // Asignamos cada billetera a su estado correspondiente
          setPlanCredits(data.user.mensajes_plan || 0)
          setExtraCredits(data.user.mensajes_extra || 0)

          setUserPlan((data.user.plan || "STARTER").toUpperCase())
          setCampanasRestantes(data.user.campanas_restantes || 3)
        }
      })
      .catch(console.error)
  }, [])

  // 🔥 MATEMÁTICA DE LÍMITES PARA CAMPAÑAS
  // Enterprise: 9999 (Ilimitado), Pro: 5, Starter: 3 (Puedes ajustar la base según tu modelo)
  const baseCampaigns = userPlan === 'ENTERPRISE' ? 9999 : userPlan === 'PRO' ? 10 : 3;
  
  // En tu tabla de usuarios, campanas_restantes disminuye con cada envío.
  // Pero para el botón "Límite alcanzado" visual, podemos simplemente usar esa columna:
  // Si campanasRestantes es 0, no puede crear más.
  const limit = baseCampaigns;
  const used = baseCampaigns - campanasRestantes; // Si base es 3 y le quedan 3, usó 0. Si le queda 1, usó 2.
  const isLimitReached = userPlan !== 'ENTERPRISE' && campanasRestantes <= 0;
  const displayLimit = userPlan === 'ENTERPRISE' ? '∞' : limit;

  useEffect(() => {
    loadCampaigns()
    loadInitialData()
  }, [])

  const loadCampaigns = async () => {
    setLoading(true)
    const data = await getCampaigns()
    setCampaigns(data)
    setLoading(false)
  }

const loadInitialData = async () => {
      const lines = await getConnectedLines()
      setAvailableLines(lines)
      if (lines.length > 0) setSelectedLineId(lines[0].id)

      const tags = await getTagsWithCount()
      setAvailableTags(tags)

      const contacts = await getAllContactsForSelector()
      
      // 🔥 FILTRO ANTI-BASURA
      const contactosLimpios = contacts.filter((c: any) => {
          if (!c.phone) return false;
          
          // Extraemos solo los números (ignorando el símbolo + o espacios si los hay)
          const soloNumeros = c.phone.replace(/\D/g, '');
          
          // Validamos: Debe tener entre 11 y 15 dígitos (estándar de WhatsApp)
          return soloNumeros.length >= 11 && soloNumeros.length <= 13;
      });

      // Guardamos y seleccionamos ÚNICAMENTE los contactos válidos
      setAllContacts(contactosLimpios)
      
      setSelectedContactIds([])
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setCsvFile(file);
    Papa.parse(file, { header: true, complete: (res) => setCsvData(res.data.slice(0, 5)) })
  }

  const downloadTemplate = () => {
    const csv = "number,name,body\n54911223344,Juan,Hola";
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "plantilla.csv"; a.click()
  }


  const handleAddCredits = async () => {
    // 1. ELECCIÓN DEL PACK DE CRÉDITOS
    const { value: selectedPack } = await Swal.fire({
      title: '<h3 class="text-2xl font-bold text-slate-800 dark:text-white">🚀 Recarga de Créditos</h3>',
      html: `
        <p class="text-sm text-slate-500 mb-6">Los créditos extra <b>no caducan</b> y se usan automáticamente cuando tu plan mensual llega a cero.</p>
        <div class="space-y-3 text-left">
          
          <label class="flex items-center justify-between p-4 border rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer transition-all border-slate-200 dark:border-slate-700">
             <div class="flex items-center gap-3">
               <input type="radio" name="swal-pack" value="500" data-price="15000" class="w-4 h-4 text-violet-600 accent-violet-600">
               <div>
                 <p class="font-bold text-slate-800 dark:text-slate-200">Pack S <span class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full ml-2 text-slate-500">500 msj</span></p>
               </div>
             </div>
             <p class="font-bold text-violet-600 dark:text-violet-400">$15.000</p>
          </label>

          <label class="flex items-center justify-between p-4 border rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer transition-all border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10 relative overflow-hidden">
             <div class="absolute top-0 right-0 bg-violet-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">POPULAR</div>
             <div class="flex items-center gap-3">
               <input type="radio" name="swal-pack" value="2000" data-price="50000" class="w-4 h-4 text-violet-600 accent-violet-600" checked>
               <div>
                 <p class="font-bold text-slate-800 dark:text-slate-200">Pack M <span class="text-xs bg-violet-100 dark:bg-violet-900/50 px-2 py-1 rounded-full ml-2 text-violet-600 dark:text-violet-300">2.000 msj</span></p>
               </div>
             </div>
             <p class="font-bold text-violet-600 dark:text-violet-400">$50.000</p>
          </label>

          <label class="flex items-center justify-between p-4 border rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer transition-all border-slate-200 dark:border-slate-700">
             <div class="flex items-center gap-3">
               <input type="radio" name="swal-pack" value="5000" data-price="100000" class="w-4 h-4 text-violet-600 accent-violet-600">
               <div>
                 <p class="font-bold text-slate-800 dark:text-slate-200">Pack L <span class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full ml-2 text-slate-500">5.000 msj</span></p>
               </div>
             </div>
             <p class="font-bold text-violet-600 dark:text-violet-400">$100.000</p>
          </label>

        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Elegir Método de Pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#7c3aed', // Violeta
      cancelButtonColor: '#64748b', // Gris
      preConfirm: () => {
        const selected = document.querySelector('input[name="swal-pack"]:checked') as HTMLInputElement;
        return selected ? { pack: selected.value, price: selected.dataset.price } : null;
      }
    });

    if (!selectedPack) return;

    // 2. ELECCIÓN DEL MÉTODO DE PAGO
    const usdtPrice = (parseInt(selectedPack.price) / 1000).toFixed(2); // Ajustar según tu tasa

    const methodResult = await Swal.fire({
      title: 'Elige tu método de pago',
      html: `
        <div class="text-left mt-4 space-y-4">
          <label class="flex items-start p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all">
            <input type="radio" name="payment_method_credits" value="mp" class="mt-1 w-4 h-4 text-blue-600" checked>
            <div class="ml-3">
              <span class="block font-bold text-slate-800 text-base">Mercado Pago</span>
              <span class="block text-sm text-slate-500">Pago automático e instantáneo. Recibes tus créditos enseguida.</span>
            </div>
          </label>
          
          <label class="flex items-start p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-emerald-50 transition-all">
            <input type="radio" name="payment_method_credits" value="usdt" class="mt-1 w-4 h-4 text-emerald-600">
            <div class="ml-3">
              <span class="block font-bold text-slate-800 text-base">USDT / Cripto (Manual)</span>
              <span class="block text-sm text-amber-600 font-medium mt-1">⚠️ Requiere envío manual de comprobante.</span>
              <span class="block text-xs text-slate-500 mt-1">Tus créditos se cargarán una vez que el equipo valide el pago.</span>
            </div>
          </label>
        </div>
      `,
      preConfirm: () => {
        const checked = document.querySelector('input[name="payment_method_credits"]:checked') as HTMLInputElement;
        return checked ? checked.value : 'mp';
      },
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6',
      customClass: { popup: 'rounded-3xl' }
    });

    if (!methodResult.isConfirmed) return;

    const selectedMethod = methodResult.value;

    // 3. PROCESAMIENTO SEGÚN EL MÉTODO ELEGIDO
    if (selectedMethod === 'mp') {
      Swal.fire({ title: "Generando link de pago...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      
      try {
        const response = await fetch('/api/billing/buy-credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: parseInt(selectedPack.pack) })
        });
        const data = await response.json();
        
        if (response.ok && data.url) {
          window.location.href = data.url; 
        } else throw new Error(data.error);
      } catch (error: any) {
        Swal.fire("Error", "No pudimos generar el pago. Intenta de nuevo.", "error");
      }
    } 
    else if (selectedMethod === 'usdt') {
      Swal.fire({
        title: 'Pago con USDT (TRC20)',
        html: `
          <div class="text-left text-sm text-slate-600 space-y-3">
             <p>Para cargar <strong>${selectedPack.pack} créditos</strong>, envía exactamente:</p>
             <p class="text-2xl font-bold text-emerald-600 text-center py-2">${usdtPrice} USDT</p>
             
             <div class="bg-slate-100 p-3 rounded-xl border border-slate-200">
                <p class="text-xs text-slate-500 mb-1 uppercase font-bold">Dirección de depósito (Red TRC20)</p>
                <p class="font-mono text-[13px] text-slate-800 break-all select-all">T_TU_DIRECCION_USDT_AQUI_123456789</p>
             </div>
             
             <div class="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <p class="text-amber-800 text-xs font-medium">⚠️ <strong>Aviso importante:</strong></p>
                <p class="text-amber-700 text-xs mt-1">Una vez realizado el envío, presiona el botón abajo para enviarnos el comprobante por WhatsApp. Tus créditos se cargarán en los próximos minutos.</p>
             </div>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#25D366', 
        cancelButtonColor: '#cbd5e1',
        confirmButtonText: 'Ya pagué (Enviar comprobante)',
        cancelButtonText: 'Cerrar',
        customClass: { popup: 'rounded-3xl' }
      }).then((res) => {
        if (res.isConfirmed) {
           const msg = encodeURIComponent(`Hola, acabo de pagar ${usdtPrice} USDT por la recarga de ${selectedPack.pack} créditos. Adjunto el comprobante:`);
           window.open(`https://wa.me/5491100000000?text=${msg}`, "_blank");
        }
      });
    }
  }

  // Lógica de Velocidad Detallada (INTACTA)
  const getDelayRange = () => {
    const value = speedValue[0]
    if (value <= 20) return { min: 45, max: 60, label: "Modo Seguro", icon: "🐢", color: "text-emerald-600", bg: "bg-emerald-500" }
    if (value <= 70) return { min: 20, max: 45, label: "Modo Normal", icon: "🐇", color: "text-amber-600", bg: "bg-amber-500" }
    return { min: 5, max: 15, label: "Modo Arriesgado", icon: "🚀", color: "text-rose-600", bg: "bg-rose-500" }
  }

  // Lógica de filtrado manual (INTACTA)
const filteredContactsForSelector = allContacts.filter(c => {
      // 1. Filtro por texto
      const matchesSearch = c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone?.includes(contactSearch);
      
      // 2. Filtro por etiquetas (Si el array está vacío, deja pasar a todos)
      const matchesTags = selectedTags.length === 0 || (
        c.tags && Array.isArray(c.tags) && c.tags.some((t: string) => selectedTags.includes(t))
      );

      return matchesSearch && matchesTags;
  });

  const toggleContactSelection = (id: string) => {
      setSelectedContactIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAllContacts = () => {
      // Comprobamos si todos los contactos que están visibles AHORA MISMO ya están seleccionados
      const allFilteredAreSelected = filteredContactsForSelector.length > 0 && 
          filteredContactsForSelector.every(c => selectedContactIds.includes(c.id));

      if (allFilteredAreSelected) {
          // Si ya están todos seleccionados, los desmarcamos (pero solo a los visibles, respetando el resto)
          const filteredIds = filteredContactsForSelector.map(c => c.id);
          setSelectedContactIds(prev => prev.filter(id => !filteredIds.includes(id)));
      } else {
          // Si falta alguno, los marcamos todos (usamos Set para que no haya IDs duplicados en el array final)
          const newSelections = filteredContactsForSelector.map(c => c.id);
          setSelectedContactIds(prev => Array.from(new Set([...prev, ...newSelections])));
      }
  };

  // --- CREAR CAMPAÑA --- (INTACTA)
const handleCreateCampaign = async () => {
    if (!campaignName || !messageTemplate || !selectedLineId) {
      Swal.fire("Error", "Completa los campos obligatorios", "error"); return
    }
   
    if (isScheduled && !scheduledDate) {
        Swal.fire("Error", "Selecciona una fecha para programar", "error"); return
    }

    const delay = getDelayRange()
    const csvTargets = csvFile ? await new Promise<any[]>((r) => Papa.parse(csvFile, { header: true, complete: (res) => r(res.data) })) : undefined

    let crmTargets = null
    if (sourceType === 'crm') {
        const finalContacts = allContacts.filter(c => {
            if (!selectedContactIds.includes(c.id)) return false
            if (selectedTags.length > 0) return c.tags && Array.isArray(c.tags) && c.tags.some((t: string) => selectedTags.includes(t))
            return true
        })
        crmTargets = finalContacts.map(c => ({ phone: c.phone, name: c.name }))
    }

    // Calculamos el total de contactos seleccionados
    const totalAudience = sourceType === 'crm' ? crmTargets?.length : csvTargets?.length

    // 🔥 VALIDACIÓN DE BILLETERAS (CANDADO FRONTEND)
    const totalCredits = planCredits + extraCredits;

    if (totalAudience > totalCredits) {
      Swal.fire({
        title: "Créditos Insuficientes",
        html: `
          <div style="text-align: left; font-size: 0.95em; line-height: 1.5; color: #475569;">
            <p>Has superado tu límite de mensajes disponibles.</p>
            <div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; margin: 15px 0;">
              <p>🎯 Contactos seleccionados: <strong>${totalAudience}</strong></p>
              <p>💰 Créditos disponibles: <strong style="color: #7c3aed;">${totalCredits}</strong></p>
            </div>
            <p style="font-size: 0.85em;">👉 <strong>¿Qué hacer?</strong> Desmarca algunos contactos, reduce tu archivo CSV, o cierra esta ventana y añade más créditos a tu billetera.</p>
          </div>
        `,
        icon: "warning",
        confirmButtonColor: "#7c3aed",
        confirmButtonText: "Revisar selección",
        customClass: {
          popup: 'rounded-2xl'
        }
      });
      return; // ⛔ Detenemos la creación de la campaña aquí mismo
    }

    // Si pasamos el candado, creamos la campaña en el backend
    const res = await createCampaign({
      name: campaignName,
      template: messageTemplate,
      audienceType: 'csv',
      csvTargets: sourceType === 'crm' ? crmTargets : csvTargets,
      speedConfig: { min: delay.min, max: delay.max },
      filters: {
          lineId: selectedLineId,
          tags: selectedTags,
          originalType: sourceType,
          targetCount: totalAudience,
      },
      status: isScheduled ? 'scheduled' : 'draft',
      scheduledAt: isScheduled ? new Date(scheduledDate).toISOString() : null
    })

    if (res.success) {
      setShowWizard(false)
      resetWizard()
      loadCampaigns()

      Swal.fire({
          title: isScheduled ? "Campaña Programada!" : "Campaña Creada!",
          html: `
            <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
                <p><strong>Nombre:</strong> ${campaignName}</p>
                <p><strong>Fecha Inicio:</strong> ${isScheduled ? new Date(scheduledDate).toLocaleString() : "Inmediata (Manual)"}</p>
                <p><strong>Audiencia:</strong> ${totalAudience} contactos</p>
                <p><strong>Velocidad:</strong> ${delay.label}</p>
                <p><strong>Linea:</strong> ${availableLines.find(l => l.id === selectedLineId)?.nombre || "Seleccionada"}</p>
            </div>
          `,
          icon: "success",
          confirmButtonColor: "#10b981", // Un verde esmeralda para el éxito
          confirmButtonText: "Entendido"
      })

    } else {
      Swal.fire("Error", res.error || "Fallo al crear la campaña", "error")
    }
  }

  const resetWizard = () => {
    setStep(1); setCampaignName(""); setSourceType("crm"); setPhonePrefix("549"); setIsScheduled(false); setScheduledDate("")
    setCsvFile(null); setCsvData([]); setMessageTemplate(""); setSpeedValue([50]); setSelectedTags([])
    setSelectedContactIds(allContacts.map(c => c.id))
  }

  const handleDelete = async (id: string) => {
    const r = await Swal.fire({ title: "¿Eliminar?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Si, eliminar" })
    if (r.isConfirmed) { await deleteCampaign(id); loadCampaigns() }
  }

  const delay = getDelayRange()

  return (
    <div className="p-6 lg:p-8 space-y-6">
     
      {/* === HEADER PREMIUM === */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Megaphone className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Campañas Masivas</h1>
            
            {/* LAS BILLETERAS */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-3">
              <div className="flex items-center gap-2 text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <CreditCard className="w-4 h-4 text-emerald-500"/>
                <span className="text-muted-foreground">Plan: <strong className="text-foreground">{planCredits.toLocaleString()}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-800/30">
                <Zap className="w-4 h-4 text-violet-500"/>
                <span className="text-muted-foreground">Billetera Extra: <strong className="text-violet-600 dark:text-violet-400">{extraCredits.toLocaleString()}</strong></span>
              </div>
              <Button variant="link" className="h-auto p-0 text-xs text-violet-600 font-medium cursor-pointer ml-1" onClick={handleAddCredits}>
                + Añadir créditos
              </Button>
            </div>

          </div>
        </div>

        {/* 🔥 BOTÓN NUEVA CAMPAÑA CON LÍMITES */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div tabIndex={0} className="inline-block">
                {isLimitReached ? (
                  <Button disabled className="gap-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 h-12 px-6 cursor-not-allowed font-semibold shadow-sm">
                    <Lock className="w-4 h-4" />
                    Límite Alcanzado ({used}/{displayLimit})
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setShowWizard(true)} 
                    className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/30 text-white rounded-xl px-6 h-12"
                  >
                    <Plus className="h-4 w-4" /> 
                    Nueva Campaña ({used}/{displayLimit})
                  </Button>
                )}
              </div>
            </TooltipTrigger>
            
            {isLimitReached && (
              <TooltipContent className="bg-slate-900 text-white border-none shadow-xl p-3 rounded-xl z-50">
                <p className="font-semibold text-sm">Límite mensual alcanzado</p>
                <p className="text-xs text-slate-300 mt-1">Tu plan actual te permite {limit} campañas al mes.</p>
                <a href="/dashboard/billing" className="text-emerald-400 text-xs font-bold mt-2 inline-block hover:underline">
                  Mejorar plan para envíos ilimitados &rarr;
                </a>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

      </motion.div>

      {/* === TABLA GLASS === */}
      {loading ? (
        <GlassCard className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-muted-foreground">Cargando campañas...</p>
          </div>
        </GlassCard>
      ) : campaigns.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center">
              <Megaphone className="w-10 h-10 text-violet-500" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">No hay campañas creadas</p>
              <p className="text-sm text-muted-foreground mt-1">Crea tu primera campaña masiva</p>
            </div>
            <Button onClick={() => setShowWizard(true)} variant="outline" className="mt-2 rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Crear primera campaña
            </Button>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaña</th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Creado</th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conexión</th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progreso</th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comportamiento</th>
                  <th className="p-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {campaigns.map((c, index) => {
                    const progress = c.total_targets > 0 ? (c.sent_count / c.total_targets) * 100 : 0
                    const lineName = availableLines.find(l => l.id === c.filters?.lineId)?.nombre || c.filters?.lineId?.substring(0,8) || "Desconocida"
                    const statusConfig = getStatusConfig(c.status)
                   
                    return (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-white/10 last:border-0 hover:bg-white/40 transition-all duration-300 group"
                      >
                        <td className="p-4">
                          <span className="font-semibold text-foreground">{c.name}</span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                            <span className="block text-xs opacity-70">{new Date(c.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                            <span className="text-sm font-medium">{lineName}</span>
                          </div>
                        </td>
                        <td className="p-4 min-w-[180px]">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-200/50 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 1, delay: index * 0.1 }}
                                  className={`h-full bg-gradient-to-r ${getProgressGradient(progress)} rounded-full`}
                                />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                {Math.round(progress)}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{c.sent_count} / {c.total_targets} enviados</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={`${statusConfig.className} border rounded-full px-3 py-1 text-xs font-medium`}>
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">
                            {c.status === 'scheduled' && c.filters?.scheduledAt
                              ? `Programada: ${new Date(c.filters.scheduledAt).toLocaleString()}`
                              : c.status === 'running' ? 'Enviando mensajes...' : 'Manual'
                            }
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setMonitorCampaign(c.id)}
                              className="h-9 w-9 p-0 rounded-xl hover:bg-violet-100 hover:text-violet-600 transition-all hover:scale-110 hover:shadow-lg hover:shadow-violet-500/20"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 p-0 rounded-xl text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-all hover:scale-110"
                              onClick={() => handleDelete(c.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* === WIZARD MODAL PREMIUM === */}
      <AnimatePresence>
        {showWizard && (
          <Dialog open={showWizard} onOpenChange={setShowWizard}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-transparent border-0 shadow-none p-0">
              <TiltCard>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl shadow-violet-500/20 overflow-hidden"
                >
                  {/* Header con gradiente */}
                  <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <DialogTitle className="text-white text-xl font-bold">Nueva Campaña</DialogTitle>
                        <p className="text-white/70 text-sm">Paso {step} de 3</p>
                      </div>
                    </div>
                    {/* Progress steps */}
                    <div className="flex gap-2 mt-4">
                      {[1, 2, 3].map((s) => (
                        <div
                          key={s}
                          className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? 'bg-white' : 'bg-white/30'}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="p-6">
                    <AnimatePresence mode="wait">
                      {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                         
                          <div className="space-y-2">
                            <Label className="text-white/80">Nombre de la Campaña</Label>
                            <input
                              value={campaignName}
                              onChange={(e) => setCampaignName(e.target.value)}
                              placeholder="Ej: Promo Clientes"
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-white/80">Linea de Salida</Label>
                            <Select value={selectedLineId} onValueChange={setSelectedLineId}>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-xl">
                                <SelectValue placeholder="Selecciona una linea" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-white/20">
                                {availableLines.length > 0 ? (
                                  availableLines.map(l => (
                                    <SelectItem key={l.id} value={l.id} className="text-white hover:bg-white/10">
                                      {l.phone || l.nombre} ({l.status})
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="none" disabled className="text-white/50">Sin lineas</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`p-4 rounded-2xl cursor-pointer border-2 transition-all ${sourceType === 'crm' ? 'border-violet-500 bg-violet-500/20' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}
                              onClick={() => setSourceType('crm')}
                            >
                              <Database className="mb-2 text-violet-400 w-6 h-6" />
                              <h3 className="font-semibold text-white text-sm">Base de Datos CRM</h3>
                              <p className="text-xs text-white/50 mt-1">Usa tus contactos existentes</p>
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`p-4 rounded-2xl cursor-pointer border-2 transition-all ${sourceType === 'csv' ? 'border-violet-500 bg-violet-500/20' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}
                              onClick={() => setSourceType('csv')}
                            >
                              <FileSpreadsheet className="mb-2 text-violet-400 w-6 h-6" />
                              <h3 className="font-semibold text-white text-sm">Importar Archivo</h3>
                              <p className="text-xs text-white/50 mt-1">Sube un CSV o Excel</p>
                            </motion.div>
                          </div>

                          {sourceType === "crm" && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-4 border-t border-white/10">
                              <div className="space-y-2">
                                <Label className="text-white/80">Filtrar por Etiquetas</Label>
                                <div className="flex flex-wrap gap-2">
                                  {availableTags.map(t => (
                                    <Badge
                                      key={t.tag}
                                      variant={selectedTags.includes(t.tag) ? "default" : "outline"}
                                      className={`cursor-pointer transition-all ${selectedTags.includes(t.tag) ? 'bg-violet-500 text-white border-violet-500' : 'border-white/30 text-white/70 hover:border-violet-500 hover:text-violet-400'}`}
                                      onClick={() => setSelectedTags(p => p.includes(t.tag) ? p.filter(x => x !== t.tag) : [...p, t.tag])}
                                    >
                                      {t.tag} ({t.count})
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="flex justify-between items-center bg-white/5 rounded-xl p-3">
                                <span className="text-sm text-white/60">{selectedContactIds.length} contactos seleccionados</span>
                               <Button variant="outline" size="sm" onClick={() => setShowContactSelector(true)} className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white rounded-lg transition-colors">
  <Users className="mr-2 h-4 w-4"/> Editar selección
</Button>
                              </div>
                            </motion.div>
                          )}

                          {sourceType === "csv" && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-4 border-t border-white/10">
                              <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-violet-500/50 transition-colors">
                                <Upload className="w-8 h-8 text-white/40 mx-auto mb-2" />
                                <Input type="file" accept=".csv,.xlsx" onChange={handleCSVUpload} className="bg-transparent border-0 text-white" />
                              </div>
                              <Button variant="link" size="sm" onClick={downloadTemplate} className="p-0 h-auto text-violet-400 hover:text-violet-300">
                                <Download className="mr-2 h-3 w-3"/> Descargar plantilla
                              </Button>
                            </motion.div>
                          )}

                          {/* PROGRAMACIÓN */}
                          <div className="pt-4 border-t border-white/10 space-y-3">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id="schedule"
                                checked={isScheduled}
                                onCheckedChange={(c) => setIsScheduled(c as boolean)}
                                className="border-white/30 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                              />
                              <Label htmlFor="schedule" className="cursor-pointer font-medium text-white">Programar envio</Label>
                            </div>
                            {isScheduled && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                                <Label className="text-white/80">Fecha y Hora de Inicio</Label>
                                <input
                                  type="datetime-local"
                                  value={scheduledDate}
                                  onChange={(e) => setScheduledDate(e.target.value)}
                                  min={new Date().toISOString().slice(0, 16)}
                                  className="mt-2 w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                                />
                              </motion.div>
                            )}
                          </div>

                          <div className="flex justify-end gap-3 pt-4">
                            <Button variant="ghost" onClick={() => setShowWizard(false)} className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl">
                              Cancelar
                            </Button>
                            <Button
                              onClick={() => setStep(2)}
                              disabled={!campaignName}
                              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl px-6"
                            >
                              Siguiente
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {step === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                          
                          {/* CAJA DE EDUCACIÓN SPINTAX */}
                          <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="bg-violet-500/20 p-2 rounded-xl">
                                <ShieldCheck className="h-5 w-5 text-violet-400" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-violet-300 text-sm">Protección Anti-Spam (Spintax)</h4>
                                <p className="text-xs text-violet-300/70 mt-1 leading-relaxed">
                                  WhatsApp bloquea si envias el mismo texto a todos. Usa <strong>llaves y barras</strong> para crear variaciones aleatorias.
                                </p>
                              </div>
                            </div>
                            
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs space-y-2">
                              <div className="flex justify-between items-center text-white/60">
                                <span>Formato:</span>
                                <code className="bg-violet-500/20 px-2 py-0.5 rounded text-violet-300">{"{Hola|Buenas|Qué tal}"}</code>
                              </div>
                              <div className="flex justify-between items-center text-white/60">
                                <span>Resultado A:</span>
                                <span className="font-medium text-white">"Hola"</span>
                              </div>
                              <div className="flex justify-between items-center text-white/60">
                                <span>Resultado B:</span>
                                <span className="font-medium text-white">"Qué tal"</span>
                              </div>
                            </div>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full text-violet-300 border-violet-500/30 hover:bg-violet-500/20 h-9 text-xs rounded-xl bg-transparent"
                              onClick={() => setMessageTemplate(prev => prev + "{Hola|Buenos días|Qué tal} {{name}}, te escribo para {contarte|ofrecerte} una {oportunidad|promo} exclusiva.")}
                            >
                              <Copy className="h-3 w-3 mr-2" /> Copiar Ejemplo Seguro
                            </Button>
                          </div>

                          {/* EDITOR DE MENSAJE */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label className="text-white/80">Escribe tu mensaje</Label>
                              <Badge variant="outline" className="text-[10px] font-normal border-white/20 text-white/50">Variables: {"{{name}}"}, {"{{phone}}"}</Badge>
                            </div>
                            <textarea
                              value={messageTemplate}
                              onChange={(e) => setMessageTemplate(e.target.value)}
                              rows={6}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-mono text-sm leading-relaxed resize-none"
                              placeholder="Escribe aqui... Usa {opcion1|opcion2} para variar."
                            />
                          </div>

                          {/* BOTONES DE NAVEGACIÓN */}
                          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <Button variant="ghost" onClick={() => setStep(1)} className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl">
                              Atrás
                            </Button>
                            <Button
                              onClick={() => setStep(3)}
                              disabled={!messageTemplate}
                              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl px-6"
                            >
                              Siguiente
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {step === 3 && (
                        <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">

                          <div className="space-y-4">
                            <Label className="text-white/80">Velocidad de Envio</Label>
                            <Slider
                              value={speedValue}
                              onValueChange={setSpeedValue}
                              max={100}
                              className="[&_[role=slider]]:bg-violet-500 [&_[role=slider]]:border-violet-500"
                            />
                           
                            {/* UI DE VELOCIDAD */}
                            <div className="text-center space-y-2 py-4">
                              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${delay.bg}/20`}>
                                <span className="text-2xl">{delay.icon}</span>
                                <p className={`text-lg font-bold ${delay.color}`}>{delay.label}</p>
                              </div>
                              <p className="text-sm text-white/50">
                                Delay: {delay.min}-{delay.max} segundos entre mensajes
                              </p>
                            </div>
                          </div>
                         
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-white/80 text-sm">
                              <Megaphone className="w-4 h-4 text-violet-400" />
                              <strong>Campaña:</strong>
                              <span className="text-white">{campaignName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/80 text-sm">
                              <Zap className="w-4 h-4 text-violet-400" />
                              <strong>Linea:</strong>
                              <span className="text-white">{availableLines.find(l => l.id === selectedLineId)?.nombre}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/80 text-sm">
                              <Calendar className="w-4 h-4 text-violet-400" />
                              <strong>Inicio:</strong>
                              <span className="text-white">{isScheduled ? new Date(scheduledDate).toLocaleString() : "Inmediato"}</span>
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <Button variant="ghost" onClick={() => setStep(2)} className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl">
                              Atrás
                            </Button>
                            <Button
                              onClick={handleCreateCampaign}
                              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl px-8 py-3 text-base font-semibold shadow-lg shadow-violet-500/30"
                            >
                              <PlayCircle className="mr-2 h-5 w-5"/>
                              {isScheduled ? "Programar Campaña" : "Crear e Iniciar"}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </TiltCard>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* MODAL CONTACTOS */}
     <Dialog open={showContactSelector} onOpenChange={setShowContactSelector}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col bg-slate-900/95 backdrop-blur-2xl border-white/20 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">Seleccionar Contactos</DialogTitle>
          </DialogHeader>
          
          {/* BUSCADOR Y BOTÓN MARCAR TODOS */}
          <div className="flex gap-2 items-center mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-white/40"/>
              <input
                placeholder="Buscar por nombre o teléfono..."
                className="w-full pl-10 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={toggleAllContacts} className="border-white/30 text-white hover:bg-white/10 hover:text-white rounded-xl bg-transparent transition-colors h-11 px-4">
              {selectedContactIds.length > 0 && selectedContactIds.length === filteredContactsForSelector.length ? "Desmarcar" : "Marcar Todos"}
            </Button>
          </div>

          {/* 🔥 NUEVO: FILTRO RÁPIDO DE ETIQUETAS */}
          {availableTags.length > 0 && (
            <div className="flex flex-wrap gap-2 py-3 border-b border-white/10">
              <span className="text-xs text-white/50 w-full mb-1">Filtrar por etiquetas:</span>
              {availableTags.map(t => (
                <Badge
                  key={t.tag}
                  variant={selectedTags.includes(t.tag) ? "default" : "outline"}
                  className={`cursor-pointer transition-all px-3 py-1 ${
                    selectedTags.includes(t.tag) 
                      ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-500/20' 
                      : 'bg-transparent border-white/30 text-white/70 hover:border-violet-500 hover:text-violet-400'
                  }`}
                  onClick={() => setSelectedTags(p => p.includes(t.tag) ? p.filter(x => x !== t.tag) : [...p, t.tag])}
                >
                  {t.tag} ({t.count})
                </Badge>
              ))}
            </div>
          )}

          {/* LISTA DE CONTACTOS */}
          <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl p-2 space-y-1 bg-white/5 mt-2 custom-scrollbar">
            {filteredContactsForSelector.length === 0 ? (
              <p className="text-center text-white/40 py-10 text-sm">No se encontraron contactos</p>
            ) : (
              filteredContactsForSelector.map(c => (
                <div
                  key={c.id}
                  onClick={() => toggleContactSelection(c.id)}
                  className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
                >
                  <Checkbox checked={selectedContactIds.includes(c.id)} className="border-white/30 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-white">{c.name}</p>
                    <p className="text-xs text-white/50">{c.phone}</p>
                  </div>
                  {c.tags?.map((t:any) => <Badge key={t} variant="secondary" className="text-[10px] bg-white/10 text-white/70 border-0">{t}</Badge>)}
                </div>
              ))
            )}
          </div>
          
          <DialogFooter className="mt-2">
            <Button onClick={() => setShowContactSelector(false)} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-violet-500/20">
              Confirmar ({selectedContactIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {monitorCampaign && <ControlRoom campaignId={monitorCampaign} onClose={() => setMonitorCampaign(null)} availableLines={availableLines} />}
    </div>
  )
}

// --- SALA DE CONTROL (Visual upgrade, lógica intacta) ---
function ControlRoom({ campaignId, onClose, availableLines }: { campaignId: string; onClose: () => void, availableLines: any[] }) {
  const [campaign, setCampaign] = useState<any>(null)
  const [targets, setTargets] = useState<any[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const isRunningRef = useRef(false)

  useEffect(() => {
    getCampaigns().then(camps => {
        const c = camps.find(x => x.id === campaignId); setCampaign(c)
        getCampaignTargets(campaignId).then(setTargets)
    })
  }, [])

  const addLog = (msg: string) => {
      setLogs(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`])
      const el = document.getElementById("log-container"); if(el) el.scrollTop = el.scrollHeight
  }

  const startCampaign = async () => {
    const lineId = campaign.filters?.lineId || campaign.filters?.targets?.lineId
    if (!lineId) return Swal.fire("Error", "Sin linea asignada", "error")

    setIsRunning(true); isRunningRef.current = true
    await updateCampaignStatus(campaignId, "running")
    addLog("🚀 Iniciando...")

    for (let i = 0; i < targets.length; i++) {
      if (!isRunningRef.current) {
          addLog("⏸️ Campaña pausada por el usuario.")
          break
      }

      const target = targets[i]
      setCurrentIndex(i)

      const processed = processSpintax(campaign.template)
      const finalMessage = replaceVariables(processed, { name: target.name || "", ...target.vars })

      addLog(`📤 Enviando a ${target.phone}...`)

      try {
          const res = await fetch("/api/whatsapp/send", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  lineId: lineId,
                  contactPhone: target.phone,
                  content: finalMessage,
                  type: "text"
              }),
          })

          if (res.ok) {
              await saveCampaignMessageToChat(target.phone, finalMessage, lineId)
              await logCampaignSend(campaignId, target.phone, "sent")
              addLog(`✅ Enviado correctamente a ${target.phone}`)
          } else {
              console.error(await res.text())
              await logCampaignSend(campaignId, target.phone, "failed")
              addLog(`❌ Falló el envio a ${target.phone}`)
          }
      } catch (error) {
          console.error(error)
          await logCampaignSend(campaignId, target.phone, "failed")
          addLog(`❌ Error de red con ${target.phone}`)
      }

      if (i < targets.length - 1) {
          const minDelay = campaign.speed_config?.min || 5
          const maxDelay = campaign.speed_config?.max || 15
          const delayMs = (Math.random() * (maxDelay - minDelay) + minDelay) * 1000
         
          addLog(`⏳ Esperando ${Math.round(delayMs/1000)}s para el siguiente...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
   
    if(isRunningRef.current) {
        setIsRunning(false)
        isRunningRef.current = false
        await updateCampaignStatus(campaignId, "completed")
        addLog("🎉 ¡Campaña finalizada con éxito!")
        setCampaign((prev: any) => ({...prev, status: 'completed'}))
    }
  }

  if (!campaign) return null
  const progress = targets.length > 0 ? (currentIndex / targets.length) * 100 : 0
  const isScheduled = campaign.status === 'scheduled'

  return (
    <Dialog open onOpenChange={() => !isRunning && onClose()}>
      <DialogContent className="max-w-3xl bg-slate-900/95 backdrop-blur-2xl border-white/20 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            Sala de Control: {campaign.name}
          </DialogTitle>
        </DialogHeader>
       
        {campaign.status === 'completed' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 text-center bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl border border-emerald-500/30"
          >
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4"/>
            <h2 className="text-2xl font-bold text-white">¡Finalizada!</h2>
           
            <div className="grid grid-cols-3 gap-4 mt-6 text-sm border-t border-emerald-500/20 pt-6">
              <div>
                <p className="text-white/50">Enviados</p>
                <p className="text-2xl font-bold text-emerald-400">{campaign.sent_count}</p>
              </div>
              <div>
                <p className="text-white/50">Fallidos</p>
                <p className="text-2xl font-bold text-rose-400">{campaign.failed_count}</p>
              </div>
              <div>
                <p className="text-white/50">Total</p>
                <p className="text-2xl font-bold text-white">{campaign.total_targets}</p>
              </div>
            </div>
           
            <Button onClick={onClose} className="mt-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl px-8">
              Cerrar Ventana
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
           
            {isScheduled && !isRunning && (
              <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl flex flex-col gap-2 items-center text-center">
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                  <Clock className="h-5 w-5"/>
                  <span>Campaña Programada</span>
                </div>
                <p className="text-sm text-blue-300/70">
                  Fecha de inicio automática: <br/>
                  <span className="font-bold text-lg text-white">
                    {campaign.filters?.scheduledAt ? new Date(campaign.filters.scheduledAt).toLocaleString() : "Pendiente"}
                  </span>
                </p>
                <p className="text-xs bg-white/5 p-2 rounded-lg text-white/50 mt-1">
                  Si pulsas "Forzar Inicio", la campaña saldrá ahora mismo ignorando la fecha.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/50 font-medium">
                <span>Progreso de Envio</span>
                <span>{currentIndex} / {targets.length}</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                />
              </div>
            </div>

            <div className="flex gap-3">
              {!isRunning ? (
                <Button
                  onClick={startCampaign}
                  className={`w-full gap-2 font-bold shadow-lg transition-all rounded-xl py-6 text-lg
                    ${isScheduled
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/30"
                      : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-violet-500/30"
                    }`
                  }
                >
                  <PlayCircle className="h-6 w-6"/>
                  {isScheduled ? "Forzar Inicio Ahora" : "Iniciar Campaña"}
                </Button>
              ) : (
                <Button
                  onClick={() => {isRunningRef.current=false; setIsRunning(false)}}
                  className="w-full gap-2 font-bold shadow-lg bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-xl py-6 text-lg"
                >
                  <PauseCircle className="h-6 w-6"/>
                  Pausar Envio
                </Button>
              )}
            </div>

            <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-950/50">
              <div className="bg-slate-900 px-4 py-2 text-xs text-white/40 border-b border-white/10 flex justify-between">
                <span>Consola de Sistema</span>
                <span>{logs.length} eventos</span>
              </div>
              <div
                className="p-4 font-mono text-xs h-36 overflow-y-auto space-y-1"
                id="log-container"
              >
                {logs.length === 0 ? (
                  <p className="text-white/30 italic">Esperando inicio de motor...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="text-emerald-400 break-words">
                      <span className="opacity-50 mr-2">{log.split(']')[0]}]</span>
                      {log.split(']')[1]}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
