"use client"
import React, { useState, useEffect } from "react"
import Swal from "sweetalert2"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { getMyBillingHistory, getMyAddons } from "./actions"
import { 
  Check, X, Zap, Gift, Sparkles, Rocket, Crown, Loader2, AlertCircle,
  CreditCard, Receipt, PackagePlus, Users, MessageCircle, Bot, BrainCircuit, Smartphone, ChevronDown, Plus, Minus, ArrowRight,
  Mic, FileText, Shirt, Stethoscope
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// --- PLANES CORE ---
const plans = [
  {
    id: "STARTER", 
    backendId: "STARTER",
    name: "Starter",
    price: { monthly: 100, annual: 250000 },
    description: "Para emprendedores",
    icon: Zap,
    gradient: "from-blue-500 to-cyan-500",
    shadowColor: "shadow-blue-500/30",
    baseLimits: { agents: 3, lines: 1 }, 
    features: [
      { text: "3 Usuarios", included: true },
      { text: "1 Línea WhatsApp", included: true },
      { text: "IA Financiera (Comprobantes)", included: true, highlight: true },
      { text: "Marketing Center (CAPI)", included: false },
      { text: "Campañas Masivas", included: false },
    ],
  },
  {
    id: "GROWTH",
    backendId: "PRO",
    name: "Growth",
    price: { monthly: 45000, annual: 450000 },
    description: "El más popular",
    icon: Rocket,
    gradient: "from-emerald-500 to-teal-500",
    shadowColor: "shadow-emerald-500/30",
    popular: true,
    baseLimits: { agents: 8, lines: 3 },
    features: [
      { text: "8 Usuarios", included: true },
      { text: "3 Líneas WhatsApp", included: true },
      { text: "IA Financiera Ilimitada", included: true, highlight: true },
      { text: "Marketing Center (CAPI)", included: true, highlight: true },
      { text: "Campañas Masivas", included: true },
    ],
  },
  {
    id: "SCALE",
    backendId: "ENTERPRISE",
    name: "Scale",
    price: { monthly: 85000, annual: 850000 },
    description: "Para agencias",
    icon: Crown,
    gradient: "from-violet-500 to-purple-600",
    shadowColor: "shadow-violet-500/30",
    baseLimits: { agents: "Ilimitados", lines: 10 },
    features: [
      { text: "Usuarios Ilimitados", included: true },
      { text: "10 Líneas WhatsApp", included: true },
      { text: "IA Financiera Ilimitada", included: true, highlight: true },
      { text: "Marketing Center Ilimitado", included: true, highlight: true },
      { text: "Soporte VIP + Onboarding", included: true },
    ],
  },
]

// --- ADD-ONS CONFIG ---
const addonsOneOff = [
  { 
    id: "IA_CREDITS", name: "Créditos IA Extra", desc: "Mensajes para Mega Cerebro", icon: BrainCircuit, color: "text-violet-500", bg: "bg-violet-100",
    options: [
      { id: "pack_s", label: "Pack S (+500 msj)", price: 15000 },
      { id: "pack_m", label: "Pack M (+2000 msj)", price: 50000, popular: true },
      { id: "pack_l", label: "Pack L (+5000 msj)", price: 100000 }
    ]
  },
  { 
    id: "MASS_MSGS", name: "Mensajes Masivos", desc: "Envíos para Campañas", icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-100",
    options: [
      { id: "mass_s", label: "Pack S (+5.000)", price: 12000 },
      { id: "mass_m", label: "Pack M (+15.000)", price: 30000 },
    ]
  }
]

const addonsMonthly = [
  { id: "EXTRA_AGENT", key: "agentes_extra", name: "Agente Adicional", desc: "+1 Usuario para atender chats", price: 1, icon: Users, color: "text-emerald-500", bg: "bg-emerald-100" },
  { id: "EXTRA_LINE", key: "lineas_extra", name: "Línea WhatsApp", desc: "+1 Número extra conectado", price: 1, icon: Smartphone, color: "text-amber-500", bg: "bg-amber-100" },
  { id: "EXTRA_BOT", key: "bots_extra", name: "Chatbot de Flujo", desc: "+1 Bot tradicional (Botones)", price: 1, icon: Bot, color: "text-slate-500", bg: "bg-slate-200" },
  { id: "EXTRA_AI_BOT", key: "ia_bots_extra", name: "Bot Jefe Total (IA)", desc: "+1 Bot Inteligente adicional", price: 1, icon: Sparkles, color: "text-purple-500", bg: "bg-purple-100", requiresPlan: "ENTERPRISE" },
]

const addonsVip = [
  { id: "VIP_VOICE", key: "addon_voice_clone", name: "Clonación de Voz", desc: "La IA responderá con notas de voz ultra-realistas.", price: 5, icon: Mic, color: "text-violet-500", bg: "bg-violet-100", requiresPlan: "ENTERPRISE" },
  { id: "VIP_PDF", key: "addon_pdf_quotes", name: "Presupuestos en PDF", desc: "Maqueta y envía presupuestos formales al cliente.", price: 3, icon: FileText, color: "text-slate-500", bg: "bg-slate-200", requiresPlan: "ENTERPRISE" },
  { id: "VIP_MAGIC", key: "addon_magic_fitting", name: "Probador Mágico", desc: "La IA coloca tu ropa en la foto del cliente.", price: 8, icon: Shirt, color: "text-pink-500", bg: "bg-pink-100", requiresPlan: "ENTERPRISE" },
  { id: "VIP_MEDICAL", key: "addon_prescription_reader", name: "Lector de Recetas", desc: "Descifra recetas manuscritas médicas.", price: 4, icon: Stethoscope, color: "text-emerald-500", bg: "bg-emerald-100", requiresPlan: "ENTERPRISE" },
]
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative bg-card/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-border/50 dark:border-slate-700/50 shadow-xl overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 dark:from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function BillingToggle({ isAnnual, onToggle }: { isAnnual: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-center gap-4 p-1.5 bg-muted/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl border border-border/50 dark:border-slate-700/50 w-fit mx-auto mb-8">
      <button onClick={() => !isAnnual || onToggle()} className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all ${!isAnnual ? "text-white" : "text-muted-foreground hover:text-foreground"}`}>
        {!isAnnual && <motion.div layoutId="billingToggle" className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
        <span className="relative z-10">Mensual</span>
      </button>
      <button onClick={() => isAnnual || onToggle()} className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all ${isAnnual ? "text-white" : "text-muted-foreground hover:text-foreground"}`}>
        {isAnnual && <motion.div layoutId="billingToggle" className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
        <span className="relative z-10 flex items-center gap-2">
          Anual <Badge className="bg-emerald-500 text-white border-0 text-[10px] px-1.5">-17%</Badge>
        </span>
      </button>
    </div>
  )
}

function AddonOneOffCard({ addon, onBuy, processingId }: { addon: typeof addonsOneOff[0], onBuy: (addonId: string, optionId: string, price: number) => void, processingId: string | null }) {
  const [selectedOptId, setSelectedOptId] = useState(() => {
    const defaultOpt = addon.options.find(o => (o as any).popular) || addon.options[0];
    return defaultOpt.id;
  });

  const selectedOpt = addon.options.find(o => o.id === selectedOptId)!;

  return (
    <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col relative">
       <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-xl ${addon.bg} ${addon.color}`}><addon.icon className="w-6 h-6" /></div>
          <div className="w-full">
             <h4 className="font-bold text-base leading-tight">{addon.name}</h4>
             <p className="text-xs text-muted-foreground mt-1">{addon.desc}</p>
             <div className="mt-3 relative">
               <select 
                 value={selectedOptId} 
                 onChange={(e) => setSelectedOptId(e.target.value)} 
                 className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-emerald-500/50 cursor-pointer appearance-none"
               >
                 {addon.options.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
               </select>
               <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
             </div>
          </div>
       </div>
       <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
          <div><span className="text-xl font-black">${selectedOpt.price.toLocaleString()}</span><span className="text-[10px] text-muted-foreground ml-1 uppercase font-bold">Pago Único</span></div>
          <Button size="sm" onClick={() => onBuy(addon.id, selectedOpt.id, selectedOpt.price)} disabled={processingId === selectedOpt.id} className="bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-sm">
             {processingId === selectedOpt.id ? <Loader2 className="w-4 h-4 animate-spin"/> : "Comprar"}
          </Button>
       </div>
    </div>
  )
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<"PLAN" | "ADDONS" | "HISTORY">("PLAN")
  const [isLoading, setIsLoading] = useState(true)
  const [isAnnual, setIsAnnual] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [billingHistory, setBillingHistory] = useState<any[]>([])
  const [myAddonsList, setMyAddonsList] = useState<any[]>([])
  
  const [userData, setUserData] = useState({
    plan: "TRIAL",
    status: "ACTIVE",
    cycle: "MONTHLY",
    daysLeft: 0,
    agentes_extra: 0,
    lineas_extra: 0,
    bots_extra: 0,
    ia_bots_extra: 0,
    addon_voice_clone: false,
    addon_pdf_quotes: false,
    addon_magic_fitting: false,
    addon_prescription_reader: false
  })

  const [monthlyCart, setMonthlyCart] = useState<Record<string, number>>({
    EXTRA_AGENT: 0,
    EXTRA_LINE: 0,
    EXTRA_BOT: 0,
    EXTRA_AI_BOT: 0,
    VIP_VOICE: 0,
    VIP_PDF: 0,
    VIP_MAGIC: 0,
    VIP_MEDICAL: 0
  })

  useEffect(() => {
    fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data?.user) {
          let daysLeft = 0;
          if (data.user.trial_ends_at) {
            const diff = new Date(data.user.trial_ends_at).getTime() - new Date().getTime()
            daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
          }

          setUserData({
            plan: data.user.plan?.toUpperCase() || "TRIAL",
            status: data.user.subscription_status?.toUpperCase() || "ACTIVE",
            cycle: data.user.billing_cycle?.toUpperCase() || "MONTHLY",
            daysLeft,
            agentes_extra: data.user.agentes_extra || 0,
            lineas_extra: data.user.lineas_extra || 0,
            bots_extra: data.user.bots_extra || 0,
            ia_bots_extra: data.user.ia_bots_extra || 0,
            addon_voice_clone: !!data.user.addon_voice_clone,
            addon_pdf_quotes: !!data.user.addon_pdf_quotes,
            addon_magic_fitting: !!data.user.addon_magic_fitting,
            addon_prescription_reader: !!data.user.addon_prescription_reader
          })
        }
        getMyBillingHistory().then(history => setBillingHistory(history));
        getMyAddons().then(addons => setMyAddonsList(addons));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const handleUpgrade = async (plan: typeof plans[0]) => {
    if (userData.status === "ACTIVE" && userData.plan !== "TRIAL") {
      Swal.fire({
        title: "🛡️ Modificar Plan Base",
        html: `Actualmente ya tienes un plan activo. Para proteger tu facturación y pasarte al plan <strong>${plan.name}</strong> abonando solo la diferencia, comunícate con soporte.`,
        icon: "info",
        confirmButtonColor: "#25D366",
        confirmButtonText: "Contactar por WhatsApp",
        showCancelButton: true,
        cancelButtonText: "Cerrar"
      }).then((res) => {
        if (res.isConfirmed) window.open("https://wa.me/5491100000000?text=Hola,%20quiero%20cambiar%20mi%20plan%20a%20" + plan.name, "_blank")
      })
      return
    }

    const price = isAnnual ? plan.price.annual : plan.price.monthly
    const cycleText = isAnnual ? "anual" : "mensual"
    const usdtPrice = (price / 1000).toFixed(2);

    const methodResult = await Swal.fire({
      title: 'Elige tu método de pago',
      html: `
        <div class="text-left mt-4 space-y-4">
          <label class="flex items-start p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all">
            <input type="radio" name="payment_method" value="mp" class="mt-1 w-4 h-4 text-blue-600" checked>
            <div class="ml-3">
              <span class="block font-bold text-slate-800 text-base">Mercado Pago</span>
              <span class="block text-sm text-slate-500">Suscripción automática. Débito mensual o anual sin cortes.</span>
            </div>
          </label>
          
          <label class="flex items-start p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-emerald-50 transition-all">
            <input type="radio" name="payment_method" value="usdt" class="mt-1 w-4 h-4 text-emerald-600">
            <div class="ml-3">
              <span class="block font-bold text-slate-800 text-base">USDT / Cripto (Manual)</span>
              <span class="block text-sm text-amber-600 font-medium mt-1">⚠️ Requiere envío manual de comprobante.</span>
              <span class="block text-xs text-slate-500 mt-1">Si no renuevas a tiempo, tu cuenta y automatizaciones se pausarán.</span>
            </div>
          </label>
        </div>
      `,
      preConfirm: () => {
        const checked = document.querySelector('input[name="payment_method"]:checked') as HTMLInputElement;
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

    if (selectedMethod === 'mp') {
        const confirmMp = await Swal.fire({
          title: `Suscribirse a ${plan.name}`,
          html: `
            <div class="text-left">
              <p class="mb-2">Serás redirigido a Mercado Pago para procesar tu suscripción de forma segura.</p>
              <div class="bg-slate-100 p-4 rounded-lg my-4">
                 <p class="text-sm text-gray-800">Plan: <strong>${plan.name}</strong></p>
                 <p class="text-sm text-gray-800">Facturación: <strong>${cycleText.toUpperCase()}</strong></p>
                 <p class="text-lg font-bold text-blue-600 mt-2">Total: $${price.toLocaleString()}</p>
              </div>
            </div>
          `,
          icon: "info",
          showCancelButton: true,
          confirmButtonColor: "#009ee3",
          confirmButtonText: "Ir a Pagar",
          cancelButtonText: "Volver",
        })

        if (confirmMp.isConfirmed) {
          setProcessingId(plan.id)
          try {
            const response = await fetch('/api/billing/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tier: plan.backendId.toLowerCase(), cycle: isAnnual ? "annual" : "monthly" })
            })
            const data = await response.json()
            if (response.ok && data.url) window.location.href = data.url
            else throw new Error(data.error)
          } catch (error: any) {
            Swal.fire("Error", "Fallo link de pago: " + error.message, "error")
            setProcessingId(null)
          }
        }
    }
    else if (selectedMethod === 'usdt') {
        Swal.fire({
          title: 'Pago con USDT (TRC20)',
          html: `
            <div class="text-left text-sm text-slate-600 space-y-3">
               <p>Para activar el plan <strong>${plan.name}</strong>, envía exactamente:</p>
               <p class="text-2xl font-bold text-emerald-600 text-center py-2">${usdtPrice} USDT</p>
               
               <div class="bg-slate-100 p-3 rounded-xl border border-slate-200">
                  <p class="text-xs text-slate-500 mb-1 uppercase font-bold">Dirección de depósito (Red TRC20)</p>
                  <p class="font-mono text-[13px] text-slate-800 break-all select-all">T_TU_DIRECCION_USDT_AQUI_123456789</p>
               </div>
               
               <div class="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <p class="text-amber-800 text-xs font-medium">⚠️ <strong>Aviso importante:</strong></p>
                  <p class="text-amber-700 text-xs mt-1">Una vez realizado el envío, presiona el botón abajo para enviarnos el comprobante por WhatsApp.</p>
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
             const msg = encodeURIComponent(`Hola, acabo de pagar el plan ${plan.name} (${cycleText}) con USDT. Adjunto mi comprobante para la activación de la cuenta:`);
             window.open(`https://wa.me/5491100000000?text=${msg}`, "_blank");
          }
        });
    }
  }

  const handleBuyOneOff = async (addonId: string, optionId: string, price: number) => {
    setProcessingId(optionId);
    try {
        const res = await fetch("/api/mp-ia-credits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packId: optionId })
        });
        const data = await res.json();
        if (res.ok && data.url) window.location.href = data.url;
        else throw new Error(data.error);
    } catch (error: any) {
        Swal.fire("Error", "No se pudo generar el link: " + error.message, "error");
    } finally {
        setProcessingId(null);
    }
  }

  const handleUpdateSubscription = async (totalAddedCost: number) => {
    Swal.fire({
      title: "Actualizar Suscripción",
      html: `<p class="text-sm text-slate-600 mb-3">Se actualizará tu contrato de Mercado Pago.</p>
             <p class="text-base">Tu nueva cuota mensual se incrementará en <b>$${totalAddedCost.toLocaleString()}</b>.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, confirmar actualización",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
    }).then(async (res) => {
       if(res.isConfirmed) {
           Swal.fire({ title: "Procesando actualización...", didOpen: () => Swal.showLoading() });
           try {
             const response = await fetch('/api/billing/addons', {
                 method: 'POST',
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ cart: monthlyCart, totalAddedCost })
             });
             
             if(response.ok) {
                 Swal.fire("¡Actualizado!", "Tus nuevos límites ya están disponibles en tu cuenta.", "success").then(() => window.location.reload());
             } else {
                 throw new Error("No se pudo actualizar");
             }
           } catch (error) {
             Swal.fire("Error", "Ocurrió un problema de comunicación con Mercado Pago. Intenta nuevamente.", "error");
           }
       }
    })
  }

  const handleCancelSubscription = async () => {
    const result = await Swal.fire({
      title: '¿Cancelar suscripción?',
      html: `
        <p class="text-sm text-slate-600 mb-4">Tu plan no se renovará el próximo mes, pero podrás seguir usando tus beneficios hasta que finalice el ciclo actual.</p>
        <p class="text-xs font-bold text-red-500">Esta acción no se puede deshacer.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#cbd5e1',  
      confirmButtonText: 'Sí, cancelar mi plan',
      cancelButtonText: 'Mantener plan'
    })

    if (result.isConfirmed) {
      Swal.fire({ title: "Procesando...", allowOutsideClick: false, didOpen: () => Swal.showLoading() })
      try {
        const res = await fetch('/api/billing/cancel', { method: 'POST' })
        const data = await res.json()
        if (res.ok) {
          Swal.fire("¡Cancelada!", "Tu suscripción ha sido cancelada correctamente. No se te volverá a cobrar.", "success")
          setUserData(prev => ({...prev, status: "CANCELLED"}))
        } else {
          throw new Error(data.error)
        }
      } catch (error: any) {
        Swal.fire("Error", "No se pudo cancelar: " + error.message, "error")
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="relative animate-spin h-10 w-10 text-emerald-500" />
          </div>
          <p className="text-slate-500">Cargando facturación...</p>
        </div>
      </div>
    )
  }

  // --- CÁLCULOS EN VIVO PARA EL CARRITO ---
  const cartItemsCount = Object.values(monthlyCart).reduce((a, b) => a + b, 0);
  
  const monthlyCost = addonsMonthly.reduce((total, addon) => total + (monthlyCart[addon.id] * addon.price), 0);
  const vipCost = addonsVip.reduce((total, addon) => total + (monthlyCart[addon.id] * addon.price), 0);
  const cartTotalCost = monthlyCost + vipCost;
  
  const currentPlanObj = plans.find(p => p.backendId === userData.plan);
  const basePlanPrice = currentPlanObj ? currentPlanObj.price.monthly : 0;
  
  const currentExtrasCost = 
    (userData.agentes_extra * addonsMonthly.find(a => a.id === "EXTRA_AGENT")!.price) + 
    (userData.lineas_extra * addonsMonthly.find(a => a.id === "EXTRA_LINE")!.price) + 
    (userData.bots_extra * addonsMonthly.find(a => a.id === "EXTRA_BOT")!.price) + 
    (userData.ia_bots_extra * addonsMonthly.find(a => a.id === "EXTRA_AI_BOT")!.price) +
    (userData.addon_voice_clone ? addonsVip.find(a => a.id === "VIP_VOICE")!.price : 0) +
    (userData.addon_pdf_quotes ? addonsVip.find(a => a.id === "VIP_PDF")!.price : 0) +
    (userData.addon_magic_fitting ? addonsVip.find(a => a.id === "VIP_MAGIC")!.price : 0) +
    (userData.addon_prescription_reader ? addonsVip.find(a => a.id === "VIP_MEDICAL")!.price : 0);
    
  const currentMonthlyTotal = basePlanPrice + currentExtrasCost;

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto px-4">
      
      {/* HEADER Y TABS */}
      <div className="text-center space-y-6 mt-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          Suscripción y Mejoras
        </h1>
        
        <div className="inline-flex bg-muted/50 p-1.5 rounded-full border border-border/50">
           {[
             { id: "PLAN", label: "Mi Plan", icon: Zap },
             { id: "ADDONS", label: "Complementos", icon: PackagePlus },
             { id: "HISTORY", label: "Historial", icon: Receipt },
           ].map((t) => (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`relative px-5 py-2 text-sm font-semibold rounded-full flex items-center gap-2 transition-all ${activeTab === t.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {activeTab === t.id && <motion.div layoutId="activeTabBg" className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full shadow-sm" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                <t.icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{t.label}</span>
              </button>
           ))}
        </div>
      </div>

      {/* =========================================
          PESTAÑA 1: MI PLAN
          ========================================= */}
      {activeTab === "PLAN" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          
          {/* RESUMEN ACTUAL DEL CLIENTE */}
          {userData.plan !== "TRIAL" && (
            <GlassCard className="max-w-4xl mx-auto ring-1 ring-border/50">
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center justify-between">
                 <div>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none mb-3">Suscripción Activa</Badge>
                    <h2 className="text-2xl font-bold text-foreground">Plan {currentPlanObj?.name || "Activo"}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">Tu cuota mensual actual incluye tu plan base y los complementos activos.</p>
                 </div>
                 <div className="text-center sm:text-right bg-muted/30 p-4 rounded-2xl border border-border/50 min-w-[200px]">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Mensual</p>
                    <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">${currentMonthlyTotal.toLocaleString()}</p>
                 </div>
              </div>
              
              {currentExtrasCost > 0 && (
                <div className="bg-muted/20 border-t border-border/50 p-6 sm:px-8">
                   <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Complementos Adicionales Activos</h4>
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {userData.agentes_extra > 0 && <div className="bg-background p-3 rounded-xl border border-border shadow-sm text-center"><Users className="w-5 h-5 mx-auto text-emerald-500 mb-2"/><p className="font-bold">{userData.agentes_extra}</p><p className="text-xs text-muted-foreground">Agentes Extra</p></div>}
                      {userData.lineas_extra > 0 && <div className="bg-background p-3 rounded-xl border border-border shadow-sm text-center"><Smartphone className="w-5 h-5 mx-auto text-amber-500 mb-2"/><p className="font-bold">{userData.lineas_extra}</p><p className="text-xs text-muted-foreground">Conexiones Extra</p></div>}
                      {userData.bots_extra > 0 && <div className="bg-background p-3 rounded-xl border border-border shadow-sm text-center"><Bot className="w-5 h-5 mx-auto text-slate-500 mb-2"/><p className="font-bold">{userData.bots_extra}</p><p className="text-xs text-muted-foreground">Bots Flujo</p></div>}
                      {userData.ia_bots_extra > 0 && <div className="bg-background p-3 rounded-xl border border-border shadow-sm text-center"><Sparkles className="w-5 h-5 mx-auto text-purple-500 mb-2"/><p className="font-bold">{userData.ia_bots_extra}</p><p className="text-xs text-muted-foreground">Bots IA (Jefe)</p></div>}
                      
                      {/* 🔥 AÑADIMOS LOS VIPs PARA QUE NO SE VEA VACÍO */}
                      {userData.addon_voice_clone && <div className="bg-background p-3 rounded-xl border border-border shadow-sm text-center flex flex-col justify-between"><Mic className="w-5 h-5 mx-auto text-violet-500 mb-1"/><p className="font-bold text-xs">Clonación Voz</p><Badge className="text-[9px] px-1.5 mt-1 bg-violet-100 text-violet-700 border-0 mx-auto w-fit">VIP</Badge></div>}
                      {userData.addon_pdf_quotes && <div className="bg-background p-3 rounded-xl border border-border shadow-sm text-center flex flex-col justify-between"><FileText className="w-5 h-5 mx-auto text-slate-500 mb-1"/><p className="font-bold text-xs">Presupuestos PDF</p><Badge className="text-[9px] px-1.5 mt-1 bg-violet-100 text-violet-700 border-0 mx-auto w-fit">VIP</Badge></div>}
                      {userData.addon_magic_fitting && <div className="bg-background p-3 rounded-xl border border-border shadow-sm text-center flex flex-col justify-between"><Shirt className="w-5 h-5 mx-auto text-pink-500 mb-1"/><p className="font-bold text-xs">Probador Mágico</p><Badge className="text-[9px] px-1.5 mt-1 bg-violet-100 text-violet-700 border-0 mx-auto w-fit">VIP</Badge></div>}
                      {userData.addon_prescription_reader && <div className="bg-background p-3 rounded-xl border border-border shadow-sm text-center flex flex-col justify-between"><Stethoscope className="w-5 h-5 mx-auto text-emerald-500 mb-1"/><p className="font-bold text-xs">Lector Recetas</p><Badge className="text-[9px] px-1.5 mt-1 bg-violet-100 text-violet-700 border-0 mx-auto w-fit">VIP</Badge></div>}
                   </div>
                </div>
              )}
              
              {/* BOTÓN DE CANCELAR PLAN BASE */}
              <div className="flex justify-end mt-4 px-2 mb-4 mr-2">
                <button 
                  onClick={handleCancelSubscription}
                  className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" /> Cancelar suscripción
                </button>
              </div>
            </GlassCard>
          )}

          <div className="text-center pt-8">
            <h3 className="text-xl font-bold mb-6">¿Necesitas cambiar tu plan base?</h3>
            <BillingToggle isAnnual={isAnnual} onToggle={() => setIsAnnual(!isAnnual)} />
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, idx) => {
              const isCurrentTier = userData.plan === plan.backendId
              const price = isAnnual ? plan.price.annual : plan.price.monthly

              return (
                <motion.div key={plan.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1, duration: 0.4 }} className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                      <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 px-4 py-1.5 text-sm font-semibold shadow-lg shadow-emerald-500/40">Más Popular</Badge>
                    </div>
                  )}

                  <GlassCard className={`h-full transition-all duration-300 hover:shadow-xl ${plan.popular ? "ring-2 ring-emerald-400/50" : ""}`}>
                    <div className={`p-6 bg-gradient-to-br ${plan.gradient} text-white`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm"><plan.icon className="h-6 w-6" /></div>
                        {isCurrentTier && <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm shadow-sm">Tu Plan Base</Badge>}
                      </div>
                      <h3 className="text-2xl font-bold">{plan.name}</h3>
                      <p className="text-white/80 text-sm">{plan.description}</p>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-4xl font-bold">${price.toLocaleString()}</span>
                        <span className="text-white/70">/mes</span>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      <ul className="space-y-3">
                        {plan.features?.map((feature, fidx) => (
                          <motion.li key={fidx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 + fidx * 0.05 }} className="flex items-start gap-3">
                            {feature.included ? (
                              <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              </div>
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                                <X className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                              </div>
                            )}
                            <span className={`text-sm ${feature.included ? "text-foreground" : "text-muted-foreground line-through"} ${feature.highlight ? "font-semibold" : ""}`}>
                              {feature.text}
                              {feature.highlight && feature.included && <Sparkles className="inline-block ml-1 h-4 w-4 text-amber-500" />}
                            </span>
                          </motion.li>
                        ))}
                      </ul>

                      <Button onClick={() => handleUpgrade(plan)} disabled={isCurrentTier} className={`w-full rounded-xl py-6 font-semibold transition-all ${isCurrentTier ? "bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed" : `bg-gradient-to-r ${plan.gradient} text-white hover:shadow-xl`}`}>
                        {isCurrentTier ? "Plan Actual" : "Elegir Plan"}
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* =========================================
          PESTAÑA 2: COMPLEMENTOS (ADD-ONS)
          ========================================= */}
      {activeTab === "ADDONS" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative pb-20">
          
          {/* INVENTARIO DE ADDONS COMPRADOS */}
          {myAddonsList.length > 0 && (
            <div className="mb-12 max-w-4xl mx-auto">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
                <PackagePlus className="w-6 h-6 text-emerald-500" /> Mis Complementos Activos
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {myAddonsList.map(addon => {
                  let Icon = Check;
                  if (addon.id === "EXTRA_AGENT") Icon = Users;
                  if (addon.id === "EXTRA_LINE") Icon = Smartphone;
                  if (addon.id === "EXTRA_BOT") Icon = Bot;
                  if (addon.id === "EXTRA_AI_BOT") Icon = Sparkles;
                  if (addon.id === "VIP_VOICE") Icon = Mic;
                  if (addon.id === "VIP_PDF") Icon = FileText;
                  if (addon.id === "VIP_MAGIC") Icon = Shirt;
                  if (addon.id === "VIP_MEDICAL") Icon = Stethoscope;

                  const periodEnd = addon.current_period_end ? new Date(addon.current_period_end) : null;
                  const isLocked = periodEnd ? new Date() < periodEnd : false;
                  const formattedDate = periodEnd ? format(periodEnd, "d 'de' MMMM", { locale: es }) : "próxima factura";

                  return (
                    <GlassCard key={addon.id} className={`p-4 flex items-center justify-between border-l-4 ${addon.isVip ? 'border-l-violet-500' : 'border-l-emerald-500'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl ${addon.isVip ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground flex items-center gap-2">
                            {addon.quantity > 1 ? `${addon.quantity}x ` : ''}{addon.name}
                            {addon.isVip && <Badge className="bg-violet-500 text-white text-[9px] px-1 border-0">VIP</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">Renueva el {formattedDate}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={isLocked}
                          className={`h-8 text-xs ${isLocked ? 'text-slate-400 bg-slate-100 dark:bg-slate-800' : 'text-red-500 hover:text-red-600 hover:bg-red-50'}`}
                          onClick={() => {
                            if (isLocked) return;
                            Swal.fire({
                              title: '¿Programar baja?',
                              html: `
                                <div class="text-sm text-slate-600 text-left space-y-3">
                                  <p>Estás por dar de baja <b>${addon.quantity > 1 ? addon.quantity + 'x ' : ''}${addon.name}</b>.</p>
                                  <div class="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                    <p class="text-amber-800 text-xs leading-relaxed">
                                      <b>Aviso de facturación:</b> Como la mejora ya fue habilitada en tu cuenta, este complemento se incluirá en tu próxima factura de Mercado Pago.<br><br>
                                      La baja se hará efectiva al finalizar tu ciclo, y a partir del mes siguiente ya no se te cobrará.
                                    </p>
                                  </div>
                                </div>
                              `,
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonText: 'Sí, programar baja',
                              cancelButtonText: 'Mantener activo',
                              confirmButtonColor: '#ef4444'
                            }).then((res) => {
                               if(res.isConfirmed) {
                                  // Llamada a tu API para bajar la suscripción en MP y restar el addon en la BD
                                  Swal.fire("Programado", "Baja solicitada correctamente.", "success");
                               }
                            })
                          }}
                        >
                          {isLocked ? "Bloqueado" : "Dar de baja"}
                        </Button>
                        {isLocked && <span className="text-[9px] text-slate-400 mt-1 cursor-help" title={`Por seguridad, podrás cancelar este complemento a partir del ${formattedDate}.`}>Disponible el {formattedDate}</span>}
                      </div>
                    </GlassCard>
                  )
                })}
              </div>
              
              <div className="w-full h-px bg-border/60 my-10 relative">
                 <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Catálogo de Complementos
                 </div>
              </div>
            </div>
          )}

           <div className="mb-8 text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground">Potencia tu CRM a medida</h2>
              <p className="text-muted-foreground mt-2">Los packs de créditos se abonan al instante. Los agentes, líneas y bots se sumarán a tu facturación mensual.</p>
           </div>
           
           <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
              
              {/* RENDERIZAR PACKS DE PAGO ÚNICO */}
              {addonsOneOff.map((addon) => (
                 <AddonOneOffCard 
                    key={addon.id} 
                    addon={addon} 
                    onBuy={handleBuyOneOff} 
                    processingId={processingId} 
                 />
              ))}

              {/* RENDERIZAR ADDONS MENSUALES (Con Contador) */}
              {addonsMonthly.map((addon) => {
                const isLocked = addon.requiresPlan && addon.requiresPlan !== userData.plan;
                const qty = monthlyCart[addon.id] || 0;
                
                return (
                  <div key={addon.id} className={`bg-card p-5 rounded-2xl border ${qty > 0 ? 'border-emerald-500 ring-1 ring-emerald-500/30 shadow-emerald-500/10' : 'border-border'} shadow-sm flex flex-col relative transition-all`}>
                     {isLocked && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-9 flex flex-col items-center justify-center p-4 text-center rounded-2xl">
                           <div className="bg-slate-800 p-2.5 rounded-full mb-3 shadow-lg"><Crown className="w-6 h-6 text-amber-400" /></div>
                           <p className="font-bold text-base text-foreground">Exclusivo Scale</p>
                           <Button variant="link" onClick={() => setActiveTab("PLAN")} className="text-emerald-600 text-xs mt-1">Mejorar Plan</Button>
                            <div className="absolute -top-3 right-4 z-20">
                        <Badge className="bg-violet-600 text-white border-0 shadow-sm"><Sparkles className="w-3 h-3 mr-1"/> Funcionalidad VIP</Badge>
                     </div>
                        </div>
                        
                     )}
                     
                     <div className="flex items-start gap-4 mb-4">
                        <div className={`p-3 rounded-xl ${addon.bg} ${addon.color}`}><addon.icon className="w-6 h-6" /></div>
                        <div>
                           <h4 className="font-bold text-base leading-tight">{addon.name}</h4>
                           <p className="text-xs text-muted-foreground mt-1">{addon.desc}</p>
                        </div>
                     </div>
                     <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
                        <div><span className="text-xl font-black">${addon.price.toLocaleString()}</span><span className="text-xs text-muted-foreground ml-1">/mes</span></div>
                        
                        <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/60">
                           <button onClick={() => setMonthlyCart({...monthlyCart, [addon.id]: Math.max(0, qty - 1)})} disabled={qty === 0} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background disabled:opacity-30 transition-colors shadow-sm bg-background border border-border/50"><Minus className="w-4 h-4"/></button>
                           <span className="font-bold text-sm w-4 text-center">{qty}</span>
                           <button onClick={() => setMonthlyCart({...monthlyCart, [addon.id]: qty + 1})} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors shadow-sm"><Plus className="w-4 h-4"/></button>
                        </div>
                     </div>
                  </div>
                )
              })}

              {/* RENDERIZAR ADDONS VIP (Booleanos) */}
              {addonsVip.map((addon) => {
                const isOwned = (userData as any)[addon.key] === true;
                const isInCart = monthlyCart[addon.id] > 0;
                
                // 🔥 LÓGICA DE BLOQUEO DE PLAN
                const isLocked = addon.requiresPlan && addon.requiresPlan !== userData.plan;

                return (
                  <div key={addon.id} className={`bg-card p-5 rounded-2xl border ${isInCart ? 'border-violet-500 ring-1 ring-violet-500/30 shadow-violet-500/10' : 'border-border'} shadow-sm flex flex-col relative transition-all`}>
                     {/* BARRERA DE BLOQUEO VISUAL */}
                     {isLocked && !isOwned && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-9 flex flex-col items-center justify-center p-4 text-center rounded-2xl">
                           <div className="bg-slate-800 p-2.5 rounded-full mb-3 shadow-lg"><Crown className="w-6 h-6 text-amber-400" /></div>
                           <p className="font-bold text-base text-foreground">Exclusivo Scale</p>
                           <Button variant="link" onClick={() => setActiveTab("PLAN")} className="text-emerald-600 text-xs mt-1">Mejorar Plan</Button>
                        </div>
                     )}
                     
                     <div className="absolute -top-3 right-4 z-20">
                        <Badge className="bg-violet-600 text-white border-0 shadow-sm"><Sparkles className="w-3 h-3 mr-1"/> Funcionalidad VIP</Badge>
                     </div>
                     <div className="flex items-start gap-4 mb-4 mt-2">
                        <div className={`p-3 rounded-xl ${addon.bg} ${addon.color}`}><addon.icon className="w-6 h-6" /></div>
                        <div>
                           <h4 className="font-bold text-base leading-tight">{addon.name}</h4>
                           <p className="text-xs text-muted-foreground mt-1">{addon.desc}</p>
                        </div>
                     </div>
                     <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
                        <div><span className="text-xl font-black">${addon.price.toLocaleString()}</span><span className="text-xs text-muted-foreground ml-1">/mes</span></div>
                        
                        {isOwned ? (
                           <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">Ya lo tienes</Badge>
                        ) : isInCart ? (
                           <Button size="sm" variant="secondary" className="bg-violet-100 text-violet-700 hover:bg-violet-200" onClick={() => setMonthlyCart({...monthlyCart, [addon.id]: 0})}>
                             <Check className="w-4 h-4 mr-1"/> Añadido
                           </Button>
                        ) : (
                           <Button size="sm" variant="outline" className="border-border hover:border-violet-500 hover:text-violet-600" onClick={() => setMonthlyCart({...monthlyCart, [addon.id]: 1})}>
                             <Plus className="w-4 h-4 mr-1"/> Añadir
                           </Button>
                        )}
                     </div>
                  </div>
                )
              })}

           </div>

           {/* 🔥 CARRITO FLOTANTE INFERIOR */}
           <AnimatePresence>
             {cartItemsCount > 0 && (
               <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4">
                 <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-2xl shadow-slate-900/20 p-4 md:p-6 w-full max-w-4xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-700">
                     <div className="flex-1 w-full">
                        <div className="flex items-center gap-2 mb-2">
                           <Sparkles className="w-5 h-5 text-emerald-400" />
                           <h4 className="font-bold text-lg">Resumen de Actualización</h4>
                        </div>
                        <p className="text-slate-400 text-sm">Vas a sumar a tu cuenta:</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                           {addonsMonthly.map(addon => {
                              if (monthlyCart[addon.id] > 0) {
                                 return <Badge key={addon.id} className="bg-slate-800 text-emerald-300 border-slate-700 font-medium">+{monthlyCart[addon.id]} {addon.name}</Badge>
                              }
                              return null;
                           })}
                           {addonsVip.map(addon => {
                              if (monthlyCart[addon.id] > 0) {
                                 return <Badge key={addon.id} className="bg-slate-800 text-violet-300 border-slate-700 font-medium">+1 {addon.name} (VIP)</Badge>
                              }
                              return null;
                           })}
                        </div>
                     </div>

                     <div className="flex items-center gap-6 w-full md:w-auto bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div className="text-right">
                           <p className="text-xs text-slate-400 font-medium">Nueva Cuota Mensual</p>
                           <div className="flex items-center gap-2 mt-1">
                              <span className="text-lg text-slate-500 line-through">${currentMonthlyTotal.toLocaleString()}</span>
                              <ArrowRight className="w-4 h-4 text-emerald-400" />
                              <span className="text-3xl font-black text-emerald-400">${(currentMonthlyTotal + cartTotalCost).toLocaleString()}</span>
                           </div>
                        </div>
                        <Button size="lg" onClick={() => handleUpdateSubscription(cartTotalCost)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 px-8 py-6 h-auto text-base">
                           Actualizar Contrato
                        </Button>
                     </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </motion.div>
      )}

      {/* =========================================
          PESTAÑA 3: HISTORIAL 
          ========================================= */}
      {activeTab === "HISTORY" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto w-full">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6"><Receipt className="w-6 h-6 text-slate-400" /> Historial de Facturas</h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {billingHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Aún no tienes facturas registradas.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr><th className="p-4">Fecha</th><th className="p-4">Monto</th><th className="p-4">Estado</th><th className="p-4 text-right">Recibo</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {billingHistory.map((inv, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">{format(new Date(inv.created_at), "d MMM yyyy", { locale: es })}</td>
                      <td className="p-4 font-bold">${Number(inv.amount).toLocaleString('es-AR')}</td>
                      <td className="p-4"><Badge className="bg-emerald-100 text-emerald-700 border-none">Pagada</Badge></td>
                      <td className="p-4 text-right">{inv.mp_payment_id ? <span className="text-slate-400 font-mono text-xs">#{inv.mp_payment_id.toString().slice(-6)}</span> : <span className="text-slate-400 text-xs">Manual</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      )}

    </div>
  )
}