"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, ShieldCheck, Network, Sparkles, CheckCircle , Loader2, Save, Coins, Lock, ImageIcon, Info, Lightbulb, Settings2, X, CheckCircle2, AlertTriangle, Calculator, Users, Database } from "lucide-react"
import Swal from "sweetalert2"
import { Switch } from "@/components/ui/switch" // Asegúrate de tener esta línea

interface AIBotSettingsProps {
  chatbotId: string
  plan: "STARTER" | "PRO" | "ENTERPRISE" | "TRIAL"
  onStateChange?: (mode: string, prompt: string) => void
  pipelineStages: any[]
  baseAIBots: number;     // 🔥 NUEVO
  canUseFull: boolean;    // 🔥 NUEVO
}

export function AIBotSettings({ chatbotId, plan, baseAIBots,  canUseFull, onStateChange, pipelineStages = [] }: AIBotSettingsProps) {
  const [mode, setMode] = useState<"OFF" | "HYBRID" | "FULL">("OFF")
  const [prompt, setPrompt] = useState("")
  const [knowledge, setKnowledge] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showExamples, setShowExamples] = useState(false)

  const [autoWakeup, setAutoWakeup] = useState("0")
  const [intentStage, setIntentStage] = useState("none")
  const [autoArchive, setAutoArchive] = useState(false)
  const [escalateHuman, setEscalateHuman] = useState(false)
  const [autoFollowUp, setAutoFollowUp] = useState(false)
  const [transcribeAudio, setTranscribeAudio] = useState(false)
  const [jefeTotal, setJefeTotal] = useState("solicitudes") // 🔥 EL NUEVO JEFE
  const [botTone, setBotTone] = useState("amigable")

  const [activeRuleModal, setActiveRuleModal] = useState<string | null>(null)

  const [autoReceipt, setAutoReceipt] = useState(false)

const [aiDatosBancarios, setAiDatosBancarios] = useState("");

  // 🧠 LÓGICA DE PERMISOS
  const canUseHybrid = plan === "PRO" || plan === "ENTERPRISE" || plan === "TRIAL"
  // const canUseFull = plan === "ENTERPRISE" || plan === "TRIAL"
  const getKnowledgeLimit = () => {
    if (plan === "ENTERPRISE" || plan === "TRIAL") return 5000;
    if (plan === "PRO") return 1500;
    return 0; // El STARTER no usa esto
  }
  const maxKnowledgeChars = getKnowledgeLimit();

  useEffect(() => {
    if (onStateChange) {
      onStateChange(mode, prompt);
    }
  }, [mode, prompt]);
  
useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`/api/chatbots/${chatbotId}/ai`)
        if (res.ok) {
          const data = await res.json()
          setMode(data.ai_mode || "OFF")
          setPrompt(data.ai_prompt || "")
          setKnowledge(data.ai_knowledge || "")
          
          // 🔥 CARGAMOS LOS NUEVOS CABLES
          setAutoWakeup(data.ai_auto_wakeup || "0")
          setBotTone(data.ai_bot_tone || "amigable")
          setAutoFollowUp(data.ai_auto_followup || false)
          setAutoArchive(data.ai_auto_archive || false)
          setIntentStage(data.ai_intent_stage || "none")
          setEscalateHuman(data.ai_escalate_human || false)
          setTranscribeAudio(data.ai_transcribe_audio || false)
          setJefeTotal(data.ai_jefe_total || "solicitudes")
          setAutoReceipt(data.ai_auto_receipt || false)
          setAiDatosBancarios(data.ai_datos_bancarios || "");
        }
      } catch (error) {
        console.error("Error cargando configuración IA", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (chatbotId) loadSettings()
    else setIsLoading(false)
  }, [chatbotId])

  const handleModeClick = (selectedMode: "OFF" | "HYBRID" | "FULL") => {
    if (selectedMode === "HYBRID" && !canUseHybrid) {
      Swal.fire({
        icon: "info",
        title: "¡Función PRO!",
        text: "Mejora tu plan a PRO o ENTERPRISE para desbloquear la Inteligencia Artificial Híbrida.",
        confirmButtonText: "Ver Planes ⭐",
        confirmButtonColor: "#8b5cf6"
      })
      return
    }

    if (selectedMode === "FULL" && !canUseFull) {
      Swal.fire({
        icon: "info",
        title: "¡Función ENTERPRISE!",
        text: "Mejora al plan ENTERPRISE para liberar a la IA y que tome el control total como vendedor experto.",
        confirmButtonText: "Ver Planes 🚀",
        confirmButtonColor: "#3b82f6"
      })
      return
    }

    setMode(selectedMode)
  }

  const handleSave = async () => {
    // Seguridad extra frontend
    if (mode === "HYBRID" && !canUseHybrid) return;
    if (mode === "FULL" && !canUseFull) return;

    setIsSaving(true)
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/ai`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ai_mode: mode, 
          ai_prompt: prompt, 
          ai_knowledge: knowledge,
          ai_auto_wakeup: autoWakeup,
          ai_bot_tone: botTone,
          ai_auto_followup: autoFollowUp,
          ai_auto_archive: autoArchive,
          ai_intent_stage: intentStage,
          ai_escalate_human: escalateHuman,
          ai_transcribe_audio: transcribeAudio,
          ai_datos_bancarios: aiDatosBancarios,
          ai_jefe_total: jefeTotal,
          ai_auto_receipt: autoReceipt
        })
      })

      if (!res.ok) throw new Error("Error al guardar")

      Swal.fire({ icon: "success", title: "Cerebro IA Actualizado", toast: true, position: "top-end", timer: 2000, showConfirmButton: false })
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error al guardar", text: "No se pudo actualizar la configuración." })
    } finally {
      setIsSaving(false)
    }
  }

  // Verifica si el botón guardar y los inputs deben estar activos
  const canSave = (mode === "OFF") || (mode === "HYBRID" && canUseHybrid) || (mode === "FULL" && canUseFull);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

  const showUpgradeAlert = (tier: string) => {
    Swal.fire({
      icon: "info",
      title: `¡Función ${tier}!`,
      text: `Mejora tu plan a ${tier} para desbloquear esta regla avanzada y llevar tu bot al siguiente nivel.`,
      confirmButtonText: "Ver Planes ⭐",
      confirmButtonColor: tier === "PRO" ? "#8b5cf6" : "#3b82f6"
    })
  }

  return (
    <>
      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Cerebro IA (Pro)
          </CardTitle>
          <CardDescription>
            Configura cómo quieres que la Inteligencia Artificial atienda a tus clientes en esta línea.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-6">
          
          {/* SELECTOR DE MODO */}
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase text-muted-foreground">1. Modo de Operación</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* 1. FLUJO BÁSICO (STARTER) */}
              <div 
                onClick={() => handleModeClick("OFF")}
                className={`border rounded-xl p-4 cursor-pointer transition-all ${mode === "OFF" ? "border-slate-500 bg-slate-500/10 ring-1 ring-slate-500" : "border-border hover:border-slate-300"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Network className={`w-6 h-6 ${mode === "OFF" ? "text-slate-600 dark:text-slate-400" : "text-muted-foreground"}`} />
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">STARTER</span>
                </div>
                <h4 className="font-bold text-sm">Flujo Básico</h4>
                <p className="text-xs text-muted-foreground mt-1">Solo sigue las reglas estrictas de los nodos. No usa IA.</p>
              </div>

              {/* 2. HÍBRIDO (PRO) */}
              <div 
                onClick={() => handleModeClick("HYBRID")}
                className={`relative border rounded-xl p-4 cursor-pointer transition-all ${mode === "HYBRID" ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500" : "border-border hover:border-violet-300"} ${!canUseHybrid ? "opacity-75 bg-muted/50" : ""}`}
              >
                {!canUseHybrid && <Lock className="absolute top-3 right-3 w-4 h-4 text-muted-foreground" />}
                <div className="flex items-center justify-between mb-2">
                  <Bot className={`w-6 h-6 ${mode === "HYBRID" ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`} />
                  <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">PRO</span>
                </div>
                <h4 className="font-bold text-sm">Híbrido (Nodos + IA)</h4>
                <p className="text-xs text-muted-foreground mt-1">La IA responde dudas fuera de guion y devuelve al cliente al menú.</p>
              </div>

             {/* 3. IA LIBRE (ENTERPRISE / PRO / SCALE) */}
      <div 
        onClick={() => {
          if (!canUseFull) {
            Swal.fire({
              title: 'Límite de IA Alcanzado',
              html: `Tu plan permite un máximo de <b>${baseAIBots} bot(s)</b> con IA Vendedora activa.<br><br>Desactívala en otro departamento o mejora tu plan para expandir tu equipo de IA.`,
              icon: 'warning',
              confirmButtonColor: '#8b5cf6',
              confirmButtonText: 'Ver planes',
              showCancelButton: true,
              cancelButtonText: 'Cerrar'
            }).then((result) => {
              if (result.isConfirmed) {
                window.location.href = '/dashboard/billing'; 
              }
            });
            return;
          }
          handleModeClick("FULL");
        }}
        className={`relative border rounded-xl p-4 cursor-pointer transition-all ${mode === "FULL" ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500" : "border-border hover:border-blue-300"} ${!canUseFull ? "opacity-75 bg-slate-100 dark:bg-slate-800 border-slate-200" : ""}`}
      >
        
        {/* 🔥 EL CANDADO VISUAL GIGANTE (Mantenemos solo este) */}
        {!canUseFull && (
          <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10">
            <Lock className="w-8 h-8 text-slate-500 opacity-50" />
          </div>
        )}
        
        <div className="flex items-center justify-between mb-2">
          <Sparkles className={`w-6 h-6 ${mode === "FULL" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} />
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">SCALE / ADDON</span>
        </div>
        <h4 className="font-bold text-sm">IA Vendedora Automática</h4>
        <p className="text-xs text-muted-foreground mt-1">La IA toma el control total de la charla como un experto. Sin menús.</p>
      </div>

            </div>
          </div>

       {/* CAMPOS DE TEXTO (Solo para HÍBRIDO y FULL) */}
          {mode !== "OFF" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label className="text-sm font-bold uppercase text-muted-foreground">2. Personalidad (System Prompt)</Label>
                <Textarea 
                  placeholder="Ej: Eres Sofía, asesora de ventas..."
                  className="h-20 resize-none bg-muted/30"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={!canSave}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-sm font-bold uppercase text-muted-foreground">3. Base de Conocimientos del Negocio</Label>
                  {maxKnowledgeChars > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${knowledge.length >= maxKnowledgeChars ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                      {knowledge.length} / {maxKnowledgeChars}
                    </span>
                  )}
                </div>
                <Textarea 
                  placeholder="Pega aquí Precios, Catálogo, Políticas, Horarios..."
                  className="h-40 bg-muted/30"
                  value={knowledge}
                  maxLength={maxKnowledgeChars > 0 ? maxKnowledgeChars : undefined}
                  onChange={(e) => setKnowledge(e.target.value)}
                  disabled={!canSave}
                />
                {!canUseFull && canUseHybrid && (
                  <p className="text-[10px] text-amber-600 font-medium">
                    ⚡ Mejora a ENTERPRISE para expandir tu memoria a 5,000 caracteres.
                  </p>
                )}
              </div>
            </div>
          )}
          {/* ⬆️ AQUÍ CIERRA EL CONDICIONAL DEL MODO OFF ⬆️ */}

        {/* =========================================================
              ⚙️ SECCIÓN: COMPORTAMIENTO AVANZADO Y REGLAS (SIEMPRE VISIBLE)
              ========================================================= */}
          <div className="space-y-4 pt-6 mt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2">
            <Label className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-slate-500" />
              4. Reglas Avanzadas (Supersónico 🚀)
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 1. Auto-Wakeup (STARTER) */}
              <div className="border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col overflow-hidden relative">
                <div className="absolute top-0 right-0 bg-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">STARTER</div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Label className="text-sm font-semibold text-slate-700">Reactivación Automática ⏰</Label>
                      <p className="text-[11px] text-slate-500 mt-1">Si el chat queda abierto y el cliente habla, la IA despierta después de:</p>
                    </div>
                  </div>
                  <select value={autoWakeup} onChange={(e) => setAutoWakeup(e.target.value)} disabled={!canSave} className="w-full text-sm rounded-lg border-slate-200 bg-white p-2 shadow-sm">
                    <option value="0">No reactivar automáticamente</option>
                    <option value="1">1 Hora de inactividad</option>
                    <option value="12">12 Horas de inactividad</option>
                    <option value="24">24 Horas de inactividad</option>
                  </select>
                </div>
                <div className="bg-slate-100/50 px-4 py-2 border-t border-slate-200/50 flex justify-end">
                  <button onClick={() => setActiveRuleModal('wakeup')} className="text-[11px] text-slate-600 font-semibold flex items-center gap-1 hover:text-slate-800"><Lightbulb className="w-3 h-3" /> Ver ejemplo</button>
                </div>
              </div>

              {/* X. Tono de Conversación (PRO) */}
              <div className="relative border border-violet-200 rounded-xl bg-violet-50/30 flex flex-col overflow-hidden">
                {(!canUseHybrid || mode === "OFF") && (
                  <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-[1.5px] z-10 flex flex-col items-center justify-center gap-2" onClick={() => { if (!canUseHybrid) showUpgradeAlert("PRO"); else Swal.fire({ icon: 'info', title: 'Requiere IA', text: 'Activa la IA Híbrida o Libre.', confirmButtonColor: '#8b5cf6' }); }}>
                    <div className="bg-white/90 px-3 py-1.5 rounded-full font-bold text-slate-600 flex items-center gap-1.5 shadow-sm text-xs cursor-pointer hover:scale-105 transition-transform"><Lock className="w-3 h-3 text-violet-500"/> {!canUseHybrid ? "Mejorar a PRO" : "Activar IA"}</div>
                    <button onClick={(e) => { e.stopPropagation(); setActiveRuleModal('tone'); }} className="text-[10px] font-bold text-violet-600 bg-violet-100 px-3 py-1 rounded-full hover:bg-violet-200 cursor-pointer shadow-sm">💡 ¿Cómo funciona?</button>
                  </div>
                )}
                <div className="absolute top-0 right-0 bg-violet-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><Bot className="w-2.5 h-2.5"/> IA HÍBRIDA / LIBRE</div>
                <div className="p-4 space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">Personalidad de Venta 🎭</Label>
                    <p className="text-[11px] text-slate-500 mt-1">¿Cómo quieres que la IA trate a tus clientes?</p>
                  </div>
                  <select value={botTone} onChange={(e) => setBotTone(e.target.value)} disabled={!canUseHybrid || mode === "OFF" || !canSave} className="w-full text-sm rounded-lg border-slate-200 bg-white p-2 shadow-sm">
                    <option value="amigable">Amigable y Consultivo (Responde dudas con paciencia)</option>
                    <option value="directo">Directo y al grano (Respuestas cortas, ideal soporte)</option>
                    <option value="agresivo">Vendedor Agresivo (Siempre empuja hacia la venta/CTA)</option>
                  </select>
                </div>
                {(canUseHybrid && mode !== "OFF") && (
                  <div className="bg-violet-100/50 px-4 py-2 border-t border-violet-100/50 flex justify-end">
                    <button onClick={() => setActiveRuleModal('tone')} className="text-[11px] text-violet-600 font-semibold flex items-center gap-1 hover:text-violet-800"><Lightbulb className="w-3 h-3" /> Ver ejemplo</button>
                  </div>
                )}
              </div>

              {/* 2. Seguimiento Automático (PRO) */}
              <div className="relative border border-violet-200 rounded-xl bg-violet-50/30 flex flex-col overflow-hidden">
                {(!canUseHybrid || mode === "OFF") && (
                  <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-[1.5px] z-10 flex flex-col items-center justify-center gap-2" onClick={() => { if (!canUseHybrid) showUpgradeAlert("PRO"); else Swal.fire({ icon: 'info', title: 'Requiere IA', text: 'Activa la IA Híbrida o Libre.', confirmButtonColor: '#8b5cf6' }); }}>
                    <div className="bg-white/90 px-3 py-1.5 rounded-full font-bold text-slate-600 flex items-center gap-1.5 shadow-sm text-xs cursor-pointer hover:scale-105 transition-transform"><Lock className="w-3 h-3 text-violet-500"/> {!canUseHybrid ? "Mejorar a PRO" : "Activar IA Híbrida"}</div>
                    <button onClick={(e) => { e.stopPropagation(); setActiveRuleModal('followup'); }} className="text-[10px] font-bold text-violet-600 bg-violet-100 px-3 py-1 rounded-full hover:bg-violet-200 cursor-pointer shadow-sm">💡 ¿Cómo funciona?</button>
                  </div>
                )}
                <div className="absolute top-0 right-0 bg-violet-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><Bot className="w-2.5 h-2.5"/> IA HÍBRIDA</div>
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">Seguimiento Automático 💬</Label>
                    <p className="text-[11px] text-slate-500 mt-1">Si envías un precio y clavan el visto, hace retargeting a las 24h.</p>
                  </div>
                  <Switch checked={autoFollowUp} onCheckedChange={setAutoFollowUp} disabled={!canUseHybrid || mode === "OFF" || !canSave} />
                </div>
                {(canUseHybrid && mode !== "OFF") && (
                  <div className="bg-violet-100/50 px-4 py-2 border-t border-violet-100/50 flex justify-end">
                    <button onClick={() => setActiveRuleModal('followup')} className="text-[11px] text-violet-600 font-semibold flex items-center gap-1 hover:text-violet-800"><Lightbulb className="w-3 h-3" /> Ver ejemplo</button>
                  </div>
                )}
              </div>

              {/* 3. Escudo Anti-Spam (PRO) */}
              <div className="relative border border-violet-200 rounded-xl bg-violet-50/30 flex flex-col overflow-hidden">
                {(!canUseHybrid || mode === "OFF") && (
                  <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-[1.5px] z-10 flex flex-col items-center justify-center gap-2" onClick={() => { if (!canUseHybrid) showUpgradeAlert("PRO"); else Swal.fire({ icon: 'info', title: 'Requiere IA', text: 'Activa la IA Híbrida o Libre.', confirmButtonColor: '#8b5cf6' }); }}>
                    <div className="bg-white/90 px-3 py-1.5 rounded-full font-bold text-slate-600 flex items-center gap-1.5 shadow-sm text-xs cursor-pointer hover:scale-105 transition-transform"><Lock className="w-3 h-3 text-violet-500"/> {!canUseHybrid ? "Mejorar a PRO" : "Activar IA Híbrida"}</div>
                    <button onClick={(e) => { e.stopPropagation(); setActiveRuleModal('spam'); }} className="text-[10px] font-bold text-violet-600 bg-violet-100 px-3 py-1 rounded-full hover:bg-violet-200 cursor-pointer shadow-sm">💡 ¿Cómo funciona?</button>
                  </div>
                )}
                <div className="absolute top-0 right-0 bg-violet-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><Bot className="w-2.5 h-2.5"/> IA HÍBRIDA</div>
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">Auto-Archivar Spam 🛡️</Label>
                    <p className="text-[11px] text-slate-500 mt-1">Cierra el chat si la IA detecta spam o falta de interés.</p>
                  </div>
                  <Switch checked={autoArchive} onCheckedChange={setAutoArchive} disabled={!canUseHybrid || mode === "OFF" || !canSave} />
                </div>
                {(canUseHybrid && mode !== "OFF") && (
                  <div className="bg-violet-100/50 px-4 py-2 border-t border-violet-100/50 flex justify-end">
                    <button onClick={() => setActiveRuleModal('spam')} className="text-[11px] text-violet-600 font-semibold flex items-center gap-1 hover:text-violet-800"><Lightbulb className="w-3 h-3" /> Ver ejemplo</button>
                  </div>
                )}
              </div>

              {/* 4. Lead Scoring por Intención (ENTERPRISE) */}
              <div className="relative border border-blue-200 rounded-xl bg-blue-50/30 flex flex-col overflow-hidden">
                {(!canUseFull || mode !== "FULL") && (
                  <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-[1.5px] z-10 flex flex-col items-center justify-center gap-2" onClick={() => { if (!canUseFull) showUpgradeAlert("ENTERPRISE"); else Swal.fire({ icon: 'info', title: 'Requiere IA Libre', text: 'Selecciona IA Libre.', confirmButtonColor: '#3b82f6' }); }}>
                    <div className="bg-white/90 px-3 py-1.5 rounded-full font-bold text-slate-600 flex items-center gap-1.5 shadow-sm text-xs cursor-pointer hover:scale-105 transition-transform"><Lock className="w-3 h-3 text-blue-500"/> {!canUseFull ? "Mejorar a ENTERPRISE" : "Activar IA Libre"}</div>
                    <button onClick={(e) => { e.stopPropagation(); setActiveRuleModal('intent'); }} className="text-[10px] font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full hover:bg-blue-200 cursor-pointer shadow-sm">💡 ¿Cómo funciona?</button>
                  </div>
                )}
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><Sparkles className="w-2.5 h-2.5"/> IA LIBRE</div>
                <div className="p-4 space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">Intención de Compra 🧠</Label>
                    <p className="text-[11px] text-slate-500 mt-1">Si la IA detecta que el cliente quiere comprar, mover a etapa:</p>
                  </div>
                  <select 
                  value={intentStage}
                  onChange={(e) => setIntentStage(e.target.value)}
                  disabled={!canUseFull || mode !== "FULL" || !canSave}
                  className="w-full text-sm rounded-lg border-slate-200 bg-white p-2 shadow-sm"
                >
                  <option value="none">No mover en el Kanban</option>
                  {/* 🔥 OPCIONES DINÁMICAS DESDE LA BASE DE DATOS */}
                  {pipelineStages.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      Pipeline: {stage.name}
                    </option>
                  ))}
                </select>
                </div>
                {(canUseFull && mode === "FULL") && (
                  <div className="bg-blue-100/50 px-4 py-2 border-t border-blue-100/50 flex justify-end">
                    <button onClick={() => setActiveRuleModal('intent')} className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-800"><Lightbulb className="w-3 h-3" /> Ver ejemplo</button>
                  </div>
                )}
              </div>

              {/* 5. Escalamiento a Humano (ENTERPRISE) */}
              <div className="relative border border-blue-200 rounded-xl bg-blue-50/30 flex flex-col overflow-hidden">
                {(!canUseFull || mode !== "FULL") && (
                  <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-[1.5px] z-10 flex flex-col items-center justify-center gap-2" onClick={() => { if (!canUseFull) showUpgradeAlert("ENTERPRISE"); else Swal.fire({ icon: 'info', title: 'Requiere IA Libre', text: 'Selecciona IA Libre.', confirmButtonColor: '#3b82f6' }); }}>
                    <div className="bg-white/90 px-3 py-1.5 rounded-full font-bold text-slate-600 flex items-center gap-1.5 shadow-sm text-xs cursor-pointer hover:scale-105 transition-transform"><Lock className="w-3 h-3 text-blue-500"/> {!canUseFull ? "Mejorar a ENTERPRISE" : "Activar IA Libre"}</div>
                    <button onClick={(e) => { e.stopPropagation(); setActiveRuleModal('panic'); }} className="text-[10px] font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full hover:bg-blue-200 cursor-pointer shadow-sm">💡 ¿Cómo funciona?</button>
                  </div>
                )}
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><Sparkles className="w-2.5 h-2.5"/> IA LIBRE</div>
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">Botón de Pánico 🚨</Label>
                    <p className="text-[11px] text-slate-500 mt-1">Notifica a un agente si el cliente se frustra o pide un humano.</p>
                  </div>
                  <Switch checked={escalateHuman} onCheckedChange={setEscalateHuman} disabled={!canUseFull || mode !== "FULL" || !canSave} />
                </div>
                {(canUseFull && mode === "FULL") && (
                  <div className="bg-blue-100/50 px-4 py-2 border-t border-blue-100/50 flex justify-end">
                    <button onClick={() => setActiveRuleModal('panic')} className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-800"><Lightbulb className="w-3 h-3" /> Ver ejemplo</button>
                  </div>
                )}
              </div>

              {/* 6. Transcripción de Audios (ENTERPRISE) */}
              <div className="relative border border-blue-200 rounded-xl bg-blue-50/30 flex flex-col overflow-hidden">
                {(!canUseFull || mode !== "FULL") && (
                  <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-[1.5px] z-10 flex flex-col items-center justify-center gap-2" onClick={() => { if (!canUseFull) showUpgradeAlert("ENTERPRISE"); else Swal.fire({ icon: 'info', title: 'Requiere IA Libre', text: 'Selecciona IA Libre.', confirmButtonColor: '#3b82f6' }); }}>
                    <div className="bg-white/90 px-3 py-1.5 rounded-full font-bold text-slate-600 flex items-center gap-1.5 shadow-sm text-xs cursor-pointer hover:scale-105 transition-transform"><Lock className="w-3 h-3 text-blue-500"/> {!canUseFull ? "Mejorar a ENTERPRISE" : "Activar IA Libre"}</div>
                    <button onClick={(e) => { e.stopPropagation(); setActiveRuleModal('audio'); }} className="text-[10px] font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full hover:bg-blue-200 cursor-pointer shadow-sm">💡 ¿Cómo funciona?</button>
                  </div>
                )}
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> IA LIBRE | 3 CRÉDITOS</div>
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-blue-900">Escuchar Audios 🎙️</Label>
                    <p className="text-[11px] text-blue-700/80 mt-1">La IA transcribirá y responderá notas de voz.</p>
                  </div>
                  <Switch checked={transcribeAudio} onCheckedChange={setTranscribeAudio} disabled={!canUseFull || mode !== "FULL" || !canSave} className="data-[state=checked]:bg-blue-600" />
                </div>
                {(canUseFull && mode === "FULL") && (
                  <div className="bg-blue-100/50 px-4 py-2 border-t border-blue-100/50 flex justify-end">
                    <button onClick={() => setActiveRuleModal('audio')} className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-800"><Lightbulb className="w-3 h-3" /> Ver ejemplo</button>
                  </div>
                )}
              </div>

             {/* 8. Automatización Financiera (ENTERPRISE / FULL) */}
              <div className="relative border border-emerald-200 rounded-xl bg-emerald-50/30 flex flex-col overflow-hidden">
                {(!canUseFull || mode !== "FULL") && (
                  <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-[1.5px] z-10 flex flex-col items-center justify-center gap-2" onClick={() => { if (!canUseFull) showUpgradeAlert("ENTERPRISE"); else Swal.fire({ icon: 'info', title: 'Requiere IA Libre', text: 'Selecciona IA Libre para automatizar cobros.', confirmButtonColor: '#10b981' }); }}>
                    <div className="bg-white/90 px-3 py-1.5 rounded-full font-bold text-slate-600 flex items-center gap-1.5 shadow-sm text-xs cursor-pointer hover:scale-105 transition-transform"><Lock className="w-3 h-3 text-emerald-500"/> {!canUseFull ? "Mejorar a ENTERPRISE" : "Activar IA Libre"}</div>
                    <button onClick={(e) => { e.stopPropagation(); setActiveRuleModal('receipts'); }} className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full hover:bg-emerald-200 cursor-pointer shadow-sm">💡 ¿Cómo funciona?</button>
                  </div>
                )}
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-sm">
                  <Lock className="w-2.5 h-2.5" /> IA LIBRE | 5 CRÉDITOS
                </div>
                
                {/* Contenido principal de la tarjeta */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-emerald-900">Validar Comprobantes 🧾</Label>
                      <p className="text-[11px] text-emerald-800/80 mt-1">La IA lee transferencias, extrae el monto y verifica el destinatario.</p>
                    </div>
                    <Switch checked={autoReceipt} onCheckedChange={setAutoReceipt} disabled={!canUseFull || mode !== "FULL" || !canSave} className="data-[state=checked]:bg-emerald-600" />
                  </div>

                  {/* 🔥 SECCIÓN DESPLEGABLE: DATOS BANCARIOS */}
                  {autoReceipt && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-2 block">Datos Bancarios para Auditoría 🏦</Label>
                      <textarea
                        value={aiDatosBancarios}
                        onChange={(e) => setAiDatosBancarios(e.target.value)}
                        placeholder="Ej: Titular: Graciela Noelia Cornejo. Alias: zapatos.noe.mp. CVU: 00000031000... Banco: Mercado Pago."
                        className="w-full text-xs bg-white border border-emerald-200 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px] resize-none shadow-sm"
                      />
                      <p className="text-[10px] text-emerald-700/90 mt-1.5 leading-tight font-medium">
                        ⚠️ <span className="font-bold">Crucial:</span> La IA comparará el nombre del titular del comprobante con estos datos. Si el cliente le transfiere a otra persona, la IA rechazará el pago.
                      </p>
                    </div>
                  )}
                </div>

                {/* Pie de tarjeta fijado abajo */}
                {(canUseFull && mode === "FULL") && (
                  <div className="bg-emerald-100/50 px-4 py-2 border-t border-emerald-100/50 flex justify-end mt-auto">
                    <button onClick={() => setActiveRuleModal('receipts')} className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 hover:text-emerald-900 transition-colors cursor-pointer"><Lightbulb className="w-3 h-3" /> Ver ejemplo de IA Auditora</button>
                  </div>
                )}
              </div>

              {/* 7. MODO JEFE TOTAL (ENTERPRISE) - Ocupa 2 columnas en Desktop */}
              <div className="relative border-2 border-amber-300 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col overflow-hidden md:col-span-2 shadow-sm">
                {(!canUseFull || mode !== "FULL") && (
                  <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2" onClick={() => { if (!canUseFull) showUpgradeAlert("ENTERPRISE"); else Swal.fire({ icon: 'info', title: 'Requiere IA Libre', text: 'El Modo Jefe Total es exclusivo de IA Libre.', confirmButtonColor: '#f59e0b' }); }}>
                    <div className="bg-white/90 px-4 py-2 rounded-full font-bold text-slate-600 flex items-center gap-2 shadow-lg cursor-pointer hover:scale-105 transition-transform"><Lock className="w-4 h-4 text-amber-500"/> {!canUseFull ? "Desbloquear Jefe Total" : "Activar IA Libre"}</div>
                    <button onClick={(e) => { e.stopPropagation(); setActiveRuleModal('boss'); }} className="text-[11px] font-bold text-amber-700 bg-amber-200/50 border border-amber-300 px-4 py-1.5 rounded-full hover:bg-amber-200 cursor-pointer shadow-sm">💡 ¿Cómo funciona?</button>
                  </div>
                )}
                <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-3 py-1 rounded-bl-lg shadow-sm">IA LIBRE VIP</div>
                
                {/* Contenido principal */}
                <div className="p-4 space-y-3 flex-1">
                  <div>
                    <Label className="text-sm font-bold text-amber-900 flex items-center gap-2">Modo Jefe Total 👑</Label>
                    <p className="text-[11px] text-amber-800/80 mt-1 font-medium">Define el alcance del bot. (Se requiere supervisión humana esporádica).</p>
                  </div>
                  <select value={jefeTotal} onChange={(e) => setJefeTotal(e.target.value)} disabled={!canUseFull || mode !== "FULL" || !canSave} className="w-full text-sm font-semibold rounded-lg border-amber-200 bg-white p-2.5 shadow-sm text-amber-950 focus:ring-amber-500 focus:border-amber-500 outline-none">
                    <option value="solicitudes">Solo atender Nuevos (Bandeja de Solicitudes)</option>
                    <option value="total">Control Total (Bandeja Principal y Solicitudes) hasta que un humano escriba</option>
                  </select>
                </div>

                {/* Pie de tarjeta fijado abajo */}
                {(canUseFull && mode === "FULL") && (
                  <div className="bg-amber-100/50 px-4 py-2 border-t border-amber-200/50 flex justify-end mt-auto">
                    <button onClick={() => setActiveRuleModal('boss')} className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 hover:text-amber-900 transition-colors cursor-pointer"><Lightbulb className="w-3 h-3" /> Ver explicación detallada</button>
                  </div>
                )}
              </div>

            {/* Aquí cerramos el Grid general que contiene las tarjetas (Asegúrate de que no te falte ni te sobre) */}
            </div>
          </div>
          
          {/* ======================= */}
          {/* BOTONES FINALES         */}
          {/* ======================= */}
          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4">
            <Button 
              type="button"
              onClick={() => setShowExamples(true)} 
              variant="outline" 
              className="w-full sm:w-auto border-amber-300 text-amber-600 dark:text-amber-400 dark:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 relative overflow-hidden group cursor-pointer"
            >
              <span className="absolute inset-0 bg-amber-400/20 animate-pulse"></span>
              <Lightbulb className="w-4 h-4 mr-2 relative z-10" />
              <span className="relative z-10 font-medium">¿Cómo funciona la IA? Ver ejemplos</span>
            </Button>

            <Button onClick={handleSave} disabled={isSaving || !canSave} className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white shadow-md cursor-pointer">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Configuración
            </Button>
          </div>

        </CardContent>
      </Card>
      {showExamples && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95">
            
            {/* Cabecera del Modal */}
            <div className="sticky top-0 bg-card z-10 border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  El poder de la IA en tu negocio
                </h3>
                <p className="text-sm text-muted-foreground">Mira cómo responde cada modo cuando un cliente hace una pregunta difícil.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowExamples(false)} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6">
              
              {/* CASO 1: BÁSICO */}
              <div className="border rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 mb-3">
                  <Network className="w-5 h-5 text-slate-500" />
                  <h4 className="font-bold text-lg text-slate-700 dark:text-slate-300">Modo Básico (Sin IA) 🤖</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">El bot es rígido. Solo entiende opciones exactas (1, 2, 3...). Si el cliente se sale del guion, el bot no sabe qué hacer.</p>
                
                <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border shadow-sm text-sm font-mono space-y-3">
                  <div className="flex justify-end"><span className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-3 py-1.5 rounded-l-xl rounded-tr-xl max-w-[85%]">🙋‍♂️ Hola, ¿tienen pantalones tiro alto talle 40?</span></div>
                  <div className="flex justify-start"><span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 px-3 py-1.5 rounded-r-xl rounded-tl-xl max-w-[85%]">🤖 ⚠️ Opción no válida.<br/><br/>*Selecciona una opción:*<br/>1. Ver catálogo<br/>2. Horarios</span></div>
                </div>
                <p className="text-xs text-red-500 mt-3 font-semibold text-center">❌ Resultado: El cliente se frustra y abandona la compra.</p>
              </div>

              {/* CASO 2: HÍBRIDO */}
              <div className="border border-violet-200 dark:border-violet-900/50 rounded-xl p-5 bg-violet-50/50 dark:bg-violet-900/10">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-5 h-5 text-violet-600" />
                  <h4 className="font-bold text-lg text-violet-700 dark:text-violet-400">Modo Híbrido (Recomendado) 🤝</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Lo mejor de ambos mundos. La IA responde dudas de forma humana leyendo tu <span className="font-bold">Base de Conocimientos</span>, y luego muestra el menú para no perder el control.</p>
                
                <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border shadow-sm text-sm font-mono space-y-3">
                  <div className="flex justify-end"><span className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-3 py-1.5 rounded-l-xl rounded-tr-xl max-w-[85%]">🙋‍♂️ Hola, ¿tienen pantalones tiro alto talle 40?</span></div>
                  <div className="flex justify-start"><span className="bg-violet-100 dark:bg-violet-900/40 text-violet-900 dark:text-violet-300 px-3 py-1.5 rounded-r-xl rounded-tl-xl max-w-[85%]">✨ ¡Hola! Sí, claro. Tenemos jeans Mom y Slouchy en talle 40 por $45.000. ¡Te van a encantar! 👖<br/><br/>*Selecciona una opción:*<br/>1. Ver catálogo<br/>2. Comprar ahora</span></div>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-3 font-semibold text-center flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4"/> Resultado: Resuelves la duda y lo guías a la venta al instante.</p>
              </div>

              {/* CASO 3: IA LIBRE */}
              <div className="border border-blue-200 dark:border-blue-900/50 rounded-xl p-5 bg-blue-50/50 dark:bg-blue-900/10">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-lg text-blue-700 dark:text-blue-400">Modo IA Libre (Vendedor Experto) 🚀</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Adiós a los menús. La IA se comporta 100% como un humano, negociando, recomendando outfits y teniendo conversaciones fluidas basadas en tus reglas.</p>
                
                <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border shadow-sm text-sm font-mono space-y-3">
                  <div className="flex justify-end"><span className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-3 py-1.5 rounded-l-xl rounded-tr-xl max-w-[85%]">🙋‍♂️ Tengo una boda de día y soy baja, ¿qué recomiendas?</span></div>
                  <div className="flex justify-start"><span className="bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 px-3 py-1.5 rounded-r-xl rounded-tl-xl max-w-[85%]">✨ ¡Qué lindo! Para una boda de día te sugiero nuestro vestido floral de temporada ($60.000). Al ser corto estiliza muchísimo la figura 👗. ¿Te gustaría que te envíe unas fotos o prefieres pasar por el local a probártelo?</span></div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 font-semibold text-center flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4"/> Resultado: Atención personalizada 24/7 sin mover un dedo.</p>
              </div>

            </div>
            
            {/* Pie del Modal */}
            <div className="p-6 border-t bg-muted/20 flex justify-end">
              <Button onClick={() => setShowExamples(false)} className="bg-slate-900 text-white hover:bg-slate-800">
                ¡Entendido, quiero configurarlo!
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================
          🚀 MODAL DINÁMICO DE REGLAS AVANZADAS
          ========================================================= */}
      {activeRuleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95">
            
            <div className="bg-slate-50 dark:bg-slate-900 border-b px-5 py-4 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  {activeRuleModal === 'wakeup' && "Reactivación Automática ⏰"}
                  {activeRuleModal === 'tone' && "Personalidad de Venta 🎭"}
                  {activeRuleModal === 'followup' && "Seguimiento Automático 💬"}
                  {activeRuleModal === 'spam' && "Auto-Archivar Spam 🛡️"}
                  {activeRuleModal === 'intent' && "Intención de Compra 🧠"}
                  {activeRuleModal === 'panic' && "Botón de Pánico 🚨"}
                  {activeRuleModal === 'audio' && "Escuchar Audios 🎙️"}
                  {activeRuleModal === 'receipts' && "Validar Comprobantes 🧾"}
                  {activeRuleModal === 'boss' && "Modo Jefe Total 👑"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Así es como funciona esta regla en la vida real:</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setActiveRuleModal(null)} className="rounded-full h-8 w-8 -mr-2"><X className="w-4 h-4" /></Button>
            </div>

            <div className="p-6 bg-[#E5DDD5] dark:bg-[#0b141a] space-y-4 font-mono text-sm max-h-[60vh] overflow-y-auto" style={{backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: "overlay"}}>
              
              {activeRuleModal === 'wakeup' && (
                <>
                  <div className="flex justify-center"><span className="bg-slate-800/10 text-slate-600 text-[10px] px-2 py-1 rounded-md font-sans">El asesor humano olvidó cerrar el chat el Viernes</span></div>
                  <div className="flex justify-end"><span className="bg-green-100 dark:bg-green-900/40 text-green-900 px-3 py-2 rounded-l-xl rounded-tr-xl max-w-[85%]">🙋‍♂️ Hola, ¿están atendiendo hoy sábado?</span></div>
                  <div className="flex justify-center"><span className="bg-blue-500/10 text-blue-700 text-[10px] px-2 py-1 rounded-md font-sans font-bold">¡LA IA DETECTA INACTIVIDAD Y DESPIERTA! 🤖⚡</span></div>
                  <div className="flex justify-start"><span className="bg-white dark:bg-slate-800 text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[85%]">✨ ¡Hola! Sí claro, estamos atendiendo. ¿En qué te puedo ayudar hoy?</span></div>
                </>
              )}

              {activeRuleModal === 'tone' && (
                <>
                  <div className="flex justify-end"><span className="bg-green-100 text-green-900 px-3 py-2 rounded-l-xl rounded-tr-xl max-w-[85%]">🙋‍♂️ ¿A cuánto está la remera negra?</span></div>
                  <div className="flex justify-start"><span className="bg-white text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[85%] border-l-4 border-blue-400"><strong>Modo Amigable:</strong><br/>¡Hola corazón! ✨ La remera negra te queda en $15.000. Es súper linda y de algodón. ¿Te gustaría verla en otros colores? 🥰</span></div>
                  <div className="flex justify-start"><span className="bg-white text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[85%] border-l-4 border-slate-400"><strong>Modo Directo:</strong><br/>Hola. La remera negra cuesta $15.000.</span></div>
                  <div className="flex justify-start"><span className="bg-white text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[85%] border-l-4 border-orange-500"><strong>Modo Agresivo:</strong><br/>Cuesta $15.000 y me quedan las últimas dos en stock 🔥. Te paso el link de pago así te separo la tuya ahora mismo, ¿te parece? 💳👇</span></div>
                </>
              )}

              {activeRuleModal === 'followup' && (
                <>
                  <div className="flex justify-start"><span className="bg-white text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[85%]">✨ El jean cuesta $45.000. ¿Lo vas a querer?</span></div>
                  <div className="flex justify-center"><span className="bg-slate-800/10 text-slate-600 text-[10px] px-2 py-1 rounded-md font-sans">El cliente clava el visto. Pasan 24 horas... ⏳</span></div>
                  <div className="flex justify-start"><span className="bg-white text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[85%]">✨ ¡Hola de nuevo! 😊 Solo pasaba para ver si pudiste ver la info que te mandé ayer o si te quedó alguna duda. ¡Avisame cualquier cosa!</span></div>
                </>
              )}

              {activeRuleModal === 'spam' && (
                <>
                  <div className="flex justify-end"><span className="bg-green-100 text-green-900 px-3 py-2 rounded-l-xl rounded-tr-xl max-w-[85%] text-4xl">👍</span></div>
                  <div className="flex justify-center"><span className="bg-slate-800/10 text-slate-600 text-[10px] px-2 py-1 rounded-md font-sans">Chat auto-archivado. No le llega a ningún asesor. 🗑️</span></div>
                  <div className="flex justify-end mt-4"><span className="bg-green-100 text-green-900 px-3 py-2 rounded-l-xl rounded-tr-xl max-w-[85%]">🙋‍♂️ Invierta en criptomonedas hoy y gane miles...</span></div>
                  <div className="flex justify-center"><span className="bg-slate-800/10 text-slate-600 text-[10px] px-2 py-1 rounded-md font-sans">Spam detectado. Chat auto-archivado. 🛡️</span></div>
                </>
              )}

              {activeRuleModal === 'intent' && (
                <>
                  <div className="flex justify-end"><span className="bg-green-100 text-green-900 px-3 py-2 rounded-l-xl rounded-tr-xl max-w-[85%]">🙋‍♂️ Me re sirve. Pasame el CBU así te transfiero.</span></div>
                  <div className="flex justify-start"><span className="bg-white text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[85%]">✨ ¡Genial! Nuestro CBU es...</span></div>
                  <div className="flex justify-center mt-2"><span className="bg-blue-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-full font-sans shadow-lg">🎯 Magia: El sistema movió silenciosamente a este cliente a la columna "Listo para Cierre" en tu Kanban.</span></div>
                </>
              )}

              {activeRuleModal === 'panic' && (
                <>
                  <div className="flex justify-end"><span className="bg-green-100 text-green-900 px-3 py-2 rounded-l-xl rounded-tr-xl max-w-[85%]">🙋‍♂️ Esto no es lo que pedí, estoy muy enojado. Quiero hablar con una persona YA.</span></div>
                  <div className="flex justify-start"><span className="bg-white text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[85%] border-l-4 border-red-500">🚨 Entiendo tu molestia. He pausado mis respuestas automáticas y acabo de notificar a un agente humano para que revise tu caso de inmediato.</span></div>
                  <div className="flex justify-center mt-2"><span className="bg-red-500/10 text-red-700 text-[10px] px-2 py-1 rounded-md font-sans font-bold">La IA se apaga sola y te llega una notificación al celular.</span></div>
                </>
              )}

              {activeRuleModal === 'receipts' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* 🚀 BANNER HERO */}
                  <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-700 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <h3 className="font-black text-xl flex items-center gap-2 relative z-10">
                      <ShieldCheck className="w-6 h-6 text-emerald-100" /> Perito Financiero IA
                    </h3>
                    <p className="text-emerald-50 text-sm mt-1.5 relative z-10 font-medium leading-relaxed">
                      No es solo un lector de imágenes. Es un auditor contable implacable trabajando 24/7 para proteger tus ingresos y automatizar tus ventas.
                    </p>
                  </div>

                  {/* ⚡ GRID DE SUPERPODERES */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600"><AlertTriangle className="w-4 h-4" /></div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Antifraude</h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight">Rechaza tickets viejos, editados o transferencias "programadas".</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600"><Calculator className="w-4 h-4" /></div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Multicuentas</h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight">Suma pagos parciales en memoria y avisa si el cliente pagó de más o de menos.</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600"><Users className="w-4 h-4" /></div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Auditoría de Alias</h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight">Cruza el nombre del destinatario del ticket con tus datos bancarios reales.</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><Database className="w-4 h-4" /></div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">CRM Automático</h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight">Registra el ingreso, mueve el embudo y te notifica al instante.</p>
                    </div>
                  </div>

                  {/* 📱 SIMULADOR DE CHAT - CASOS DE USO REALES */}
                  <div className="space-y-5 bg-slate-100/50 p-4 rounded-2xl border border-slate-200">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center mb-2">Ejemplos en Acción</h4>
                    
                    {/* CASO 1: CONTEXTO Y PAGO PARCIAL */}
                    <div className="space-y-2">
                      <div className="flex justify-start">
                        <span className="bg-white text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[85%] shadow-sm text-[11px]">
                          El total de tu pedido es <strong>$25.000</strong>. ¿Cómo prefieres abonar?
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <span className="bg-[#dcf8c6] text-slate-800 px-3 py-2 rounded-l-xl rounded-tr-xl max-w-[85%] shadow-sm text-[11px]">
                          Te transfiero una parte de mi cuenta y la otra de la de mi novia, ¿se puede?
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <span className="bg-[#dcf8c6] p-1.5 rounded-l-xl rounded-tr-xl flex flex-col items-end gap-1 shadow-sm border border-green-200/50">
                          <div className="w-32 h-16 bg-white/80 rounded flex items-center justify-center border border-green-300 text-[10px] font-bold text-slate-500 text-center px-2">
                            📷 [Comprobante por $10.000]
                          </div>
                        </span>
                      </div>
                      <div className="flex justify-start">
                        <span className="bg-white text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[90%] border-l-4 border-blue-500 shadow-sm text-[11px] leading-relaxed">
                          ¡Excelente! Registramos este pago parcial por <strong>$10.000</strong>. Aún quedan pendientes <strong>$15.000</strong>. Quedo a la espera del resto para procesar tu compra. 💪
                        </span>
                      </div>
                      <div className="flex justify-center mt-3">
                        <span className="bg-slate-800 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3" /> Venta sumada al historial (Costo: 5 Créditos)
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-px bg-slate-200 my-4"></div>

                    {/* CASO 2: INTENTO DE FRAUDE (PROGRAMADO) */}
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <span className="bg-[#dcf8c6] p-1.5 rounded-l-xl rounded-tr-xl flex flex-col items-end gap-1 shadow-sm border border-green-200/50">
                          <div className="w-32 h-16 bg-white/80 rounded flex items-center justify-center border border-green-300 text-[10px] font-bold text-slate-500 text-center px-2">
                            📷 [Ticket "Programado"]
                          </div>
                        </span>
                      </div>
                      <div className="flex justify-start">
                        <span className="bg-white text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[90%] border-l-4 border-red-500 shadow-sm text-[11px] leading-relaxed">
                          ⚠️ <strong>¡ALERTA!</strong> El comprobante indica que la transferencia está "Programada" y no completada. Lo registraremos únicamente cuando la app confirme el envío exitoso.
                        </span>
                      </div>
                      <div className="flex justify-center mt-3">
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-3 py-1.5 rounded-full border border-red-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3" /> Fraude bloqueado (Costo: 5 Créditos)
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-px bg-slate-200 my-4"></div>

                    {/* CASO 3: SIN CONTEXTO / MEME */}
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <span className="bg-[#dcf8c6] p-1.5 rounded-l-xl rounded-tr-xl flex flex-col items-end gap-1 shadow-sm border border-green-200/50">
                          <div className="w-32 h-16 bg-white/80 rounded flex items-center justify-center border border-green-300 text-[10px] font-bold text-slate-500 text-center px-2">
                            📷 [Comprobante de la nada]
                          </div>
                        </span>
                      </div>
                      <div className="flex justify-start">
                        <span className="bg-white text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[90%] border-l-4 border-amber-500 shadow-sm text-[11px] leading-relaxed">
                          ¡Hola! Recibí este comprobante, pero revisando nuestro chat no tengo registro de tu pedido 🤔. ¿Me confirmas qué estamos abonando?
                        </span>
                      </div>
                      <div className="flex justify-center mt-3">
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1.5 rounded-full border border-amber-200 flex items-center gap-1.5">
                          <Info className="w-3 h-3" /> Rechazo rápido (Costo: 2 Créditos)
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* 💰 FACTURACIÓN INTELIGENTE */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-emerald-500" /> Facturación Inteligente
                    </h4>
                    <ul className="space-y-2 text-[11px] text-slate-600 font-medium">
                      <li className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                        <span>📷 Imágenes basura o Memes (Spam)</span>
                        <span className="font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">1 Crédito</span>
                      </li>
                      <li className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                        <span>🤷‍♂️ Recibos enviados sin charlar antes (Sin Contexto)</span>
                        <span className="font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">2 Créditos</span>
                      </li>
                      <li className="flex justify-between items-center pt-0.5">
                        <span>✅ Auditoría Completa (Ventas, Vueltos, Bloqueo de Estafas)</span>
                        <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">5 Créditos</span>
                      </li>
                    </ul>
                  </div>

                  {/* 🛑 AVISO IMPORTANTE (EL QUE AVISA NO TRAICIONA) */}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3 items-start shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[11px] font-black text-orange-800 uppercase tracking-wider mb-1">El que avisa no traiciona</h4>
                      <p className="text-[11px] text-orange-700/90 font-medium leading-relaxed">
                        Aunque nuestro Perito IA es altamente preciso, sigue siendo un asistente digital y <strong>no reemplaza la revisión humana</strong>. Recomendamos auditar tu cuenta bancaria periódicamente. El sistema marcará con un <strong>punto verde</strong> en tu CRM las conversaciones que contengan pagos procesados para que puedas verificarlas rápidamente.
                      </p>
                    </div>
                  </div>

                </div>
              )}

              {activeRuleModal === 'audio' && (
                <>
                  <div className="flex justify-end">
                    <span className="bg-green-100 text-green-900 px-3 py-2 rounded-l-xl rounded-tr-xl flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-green-600 rounded-full"></div></div>
                      <div className="h-1 w-16 bg-green-600 rounded-full"></div>
                      <span className="text-xs font-bold text-green-700">0:15</span>
                    </span>
                  </div>
                  <div className="flex justify-center"><span className="bg-slate-800/10 text-slate-600 text-[10px] px-2 py-1 rounded-md font-sans">La IA escucha: "Hola, necesito saber si el local está abierto hoy" (Costo: 3 Créditos)</span></div>
                  <div className="flex justify-start"><span className="bg-white text-slate-800 px-3 py-2 rounded-r-xl rounded-tl-xl max-w-[85%]">✨ ¡Hola! Sí, estamos abiertos hoy hasta las 20:00hs. ¡Te esperamos!</span></div>
                </>
              )}

              {activeRuleModal === 'boss' && (
                <div className="space-y-4 font-sans">
                  <p className="text-slate-700 text-sm leading-relaxed">El <strong className="text-amber-600">Modo Jefe Total</strong> define qué chats tiene permiso de tocar la IA.</p>
                  
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <h5 className="font-bold text-slate-800 flex items-center gap-2"><div className="w-2 h-2 bg-slate-400 rounded-full"></div> 1. Solo Solicitudes (Estándar)</h5>
                    <p className="text-xs text-slate-500 mt-1">La IA <strong>solo</strong> atiende a los clientes nuevos que llegan por primera vez (Inbox de Solicitudes). Si tú mueves el chat a "Principal" (OPEN), la IA se calla para siempre.</p>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <h5 className="font-bold text-amber-900 flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div> 2. Control Total (VIP)</h5>
                    <p className="text-xs text-amber-800 mt-1">La IA atiende absolutamente <strong>todos</strong> los mensajes (Nuevos y Viejos). Solo se pausa si tú entras al chat y escribes un mensaje manualmente.</p>
                  </div>
                </div>
              )}

            </div>
            
            <div className="p-4 border-t bg-card flex justify-end">
              <Button onClick={() => setActiveRuleModal(null)} className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800">¡Entendido!</Button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
