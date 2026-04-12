"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts"
import { BrainCircuit, Mic, Image as ImageIcon, Zap, Activity, Calendar, Coins, History, ShieldCheck, Info, Globe, FileText, Shirt, Stethoscope, Sparkles } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// Diccionario visual para las funciones (¡AHORA CON TODOS LOS ADD-ONS!)
const FEATURE_MAP: Record<string, { label: string, icon: any, color: string, bg: string }> = {
  // --- CORE & VISION ---
  'AUTO_VISION_RECEIPT': { label: 'Perito IA (Auto)', icon: BrainCircuit, color: '#10b981', bg: 'bg-emerald-500/10' },
  'MANUAL_VISION_RECEIPT': { label: 'Perito IA (Manual)', icon: ShieldCheck, color: '#3b82f6', bg: 'bg-blue-500/10' },
  'AUDIO_TRANSCRIPTION': { label: 'Transcripción Whisper', icon: Mic, color: '#8b5cf6', bg: 'bg-violet-500/10' },
  'TEXT_GENERATION': { label: 'Respuestas Texto', icon: Zap, color: '#f59e0b', bg: 'bg-amber-500/10' },
  
  // --- SUB-ETIQUETAS DINÁMICAS (Para la tabla) ---
  'AUTO_FRAUD': { label: 'Bloqueo Antifraude', icon: ShieldCheck, color: '#ef4444', bg: 'bg-red-500/10' },
  'AUTO_REJECT': { label: 'Rebote (Sin Contexto)', icon: BrainCircuit, color: '#f97316', bg: 'bg-orange-500/10' },
  'AUTO_TRASH': { label: 'Imagen Descartada', icon: ImageIcon, color: '#eab308', bg: 'bg-yellow-500/10' },
  'AUTO_PARTIAL': { label: 'Pago Parcial IA', icon: Coins, color: '#06b6d4', bg: 'bg-cyan-500/10' },
  'AUTO_SUCCESS': { label: 'Venta Confirmada IA', icon: BrainCircuit, color: '#10b981', bg: 'bg-emerald-500/10' },

  // --- NUEVOS MÓDULOS DE INTELIGENCIA ---
  'REALTIME_TRANSLATOR': { label: 'Traductor (Entrante)', icon: Globe, color: '#06b6d4', bg: 'bg-cyan-500/10' },
  'REALTIME_TRANSLATOR_OUT': { label: 'Traductor (Saliente)', icon: Globe, color: '#0ea5e9', bg: 'bg-sky-500/10' },
  'AUTO_LEAD_SCORING': { label: 'Auto-Perfilado', icon: BrainCircuit, color: '#3b82f6', bg: 'bg-blue-500/10' },

  // --- ADD-ONS VIP ---
  'PDF_GENERATOR': { label: 'Generador PDF', icon: FileText, color: '#64748b', bg: 'bg-slate-500/10' },
  'OCR_READER': { label: 'Lector OCR (Receta)', icon: Stethoscope, color: '#14b8a6', bg: 'bg-teal-500/10' },
  'MAGIC_FITTING': { label: 'Probador Mágico', icon: Shirt, color: '#f43f5e', bg: 'bg-rose-500/10' },
  'VOICE_CLONING': { label: 'Clonación de Voz', icon: Mic, color: '#d946ef', bg: 'bg-fuchsia-500/10' },
}

export default function AIAuditPage() {
  const [range, setRange] = useState("7d")

  const { data, isLoading } = useQuery({
    queryKey: ['ai-audit', range],
    queryFn: async () => {
      const res = await fetch(`/api/ai-audit?range=${range}`)
      if (!res.ok) throw new Error("Error fetching audit data")
      return res.json()
    }
  })

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER Y FILTROS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-500" /> Auditoría de IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Monitoreo de consumo y rendimiento cognitivo</p>
        </div>

        <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
          {[
            { id: "today", label: "Hoy" },
            { id: "yesterday", label: "Ayer" },
            { id: "7d", label: "7 Días" },
            { id: "30d", label: "Este Mes" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setRange(btn.id)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                range === btn.id 
                  ? "bg-background shadow-md text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* GUÍA DE COSTOS / BASE DE CONOCIMIENTO */}
      <Card className="border-blue-500/20 shadow-lg bg-gradient-to-r from-blue-500/5 via-transparent to-emerald-500/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Info className="w-5 h-5 text-blue-500" /> Guía de Costos por Operación (Créditos IA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 mt-2">
            
            {/* SECCIÓN 1: OPERACIONES CORE */}
            <div>
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 px-1">Operaciones Base y Auditoría</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm hover:border-emerald-500/50 transition-colors">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><BrainCircuit className="w-3.5 h-3.5 text-emerald-500"/> Venta Auto</span>
                  <span className="text-base font-black text-emerald-500">5</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm hover:border-cyan-500/50 transition-colors">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-cyan-500"/> Traducción</span>
                  <span className="text-base font-black text-cyan-500">1</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm hover:border-blue-500/50 transition-colors">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><BrainCircuit className="w-3.5 h-3.5 text-blue-500"/> Scoring</span>
                  <span className="text-base font-black text-blue-500">3</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm hover:border-violet-500/50 transition-colors">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Mic className="w-3.5 h-3.5 text-violet-500"/> Audio Whisper</span>
                  <span className="text-base font-black text-violet-500">3</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm hover:border-red-500/50 transition-colors">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-red-500"/> Antifraude</span>
                  <span className="text-base font-black text-red-500">2</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm hover:border-yellow-500/50 transition-colors">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-yellow-500"/> Imagen Basura</span>
                  <span className="text-base font-black text-yellow-500">1</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm hover:border-blue-400/50 transition-colors md:col-span-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500"/> Respuestas Generativas (Chat)</span>
                  <span className="text-[11px] font-bold text-amber-500 uppercase">Varía por largo</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: ADD-ONS VIP */}
            <div className="pt-2">
              <h4 className="text-[10px] font-black text-fuchsia-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/> Add-Ons VIP</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-400 transition-colors">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Generar PDF</span>
                  <span className="text-base font-black text-slate-700 dark:text-slate-300">10</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50 shadow-sm hover:border-teal-400 transition-colors">
                  <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5"/> Lector medico OCR</span>
                  <span className="text-base font-black text-teal-700 dark:text-teal-400">15</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-200 dark:border-fuchsia-800/50 shadow-sm hover:border-fuchsia-400 transition-colors">
                  <span className="text-[11px] font-bold text-fuchsia-700 dark:text-fuchsia-400 uppercase tracking-wider flex items-center gap-1.5"><Mic className="w-3.5 h-3.5"/> Clonar Voz propia</span>
                  <span className="text-base font-black text-fuchsia-700 dark:text-fuchsia-400">20</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 shadow-sm hover:border-rose-400 transition-colors">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5"><Shirt className="w-3.5 h-3.5"/> Probador Virtual</span>
                  <span className="text-base font-black text-rose-700 dark:text-rose-400">30</span>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></div>
      ) : (
        <>
          {/* TARJETAS DE RESUMEN (KPIs) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white shadow-xl">
              <CardContent className="p-6 flex flex-col justify-center h-full relative overflow-hidden">
                <Coins className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
                <p className="text-sm font-bold text-slate-300 uppercase tracking-wider">Total Invertido</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-black text-emerald-400">{data?.totalCredits || 0}</span>
                  <span className="text-sm font-medium text-slate-400">Créditos</span>
                </div>
              </CardContent>
            </Card>

            {Object.entries(
              data?.byFeature?.reduce((acc: any, curr: any) => {
                const key = curr.name === 'VISION_RECEIPT' ? 'AUTO_VISION_RECEIPT' : curr.name;
                acc[key] = (acc[key] || 0) + curr.value;
                return acc;
              }, {}) || {}
            ).map(([featName, featValue]: any) => {
              const meta = FEATURE_MAP[featName] || { label: featName, icon: Zap, color: '#888', bg: 'bg-muted' }
              const Icon = meta.icon
              return (
                <Card key={featName} className="border-border hover:border-border/80 transition-all shadow-sm">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${meta.bg}`}>
                      <Icon className="w-6 h-6" style={{ color: meta.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{meta.label}</p>
                      <p className="text-2xl font-black mt-0.5">{featValue}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* GRÁFICO PRINCIPAL */}
          <Card className="border-border shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" /> Consumo Diario
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-8">
              <div className="h-[300px] w-full">
                {data?.timeline?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.timeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip 
                            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: '#0f172a', color: '#fff' }}
                        />
                        <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                          {data.timeline.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill="url(#colorUv)" />
                          ))}
                        </Bar>
                        <defs>
                          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.8} />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <History className="w-12 h-12 opacity-20 mb-2" />
                        <p className="text-sm font-medium">No hay consumo en este período</p>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* TABLA DE REGISTROS RECIENTES */}
          <Card className="border-border shadow-md rounded-2xl overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4 shrink-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-violet-500" /> Desglose en Tiempo Real
              </CardTitle>
            </CardHeader>
            
            <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative w-full custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-card border-b border-border/50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 font-bold">Fecha y Hora</th>
                    <th className="px-6 py-3 font-bold">Agente</th>
                    <th className="px-6 py-3 font-bold">Operación</th>
                    <th className="px-6 py-3 font-bold">Detalles de Auditoría</th>
                    <th className="px-6 py-3 font-bold text-right">Créditos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data?.recentLogs?.map((log: any) => {
                    
                    let featureKey = log.feature;
                    if (log.feature === 'AUTO_VISION_RECEIPT') {
                        const det = log.details.toLowerCase();
                        if (det.includes('bloqueo antifraude')) featureKey = 'AUTO_FRAUD';
                        else if (det.includes('rebote de comprobante')) featureKey = 'AUTO_REJECT';
                        else if (det.includes('imagen descartada')) featureKey = 'AUTO_TRASH';
                        else if (det.includes('partial_payment') || det.includes('underpayment')) featureKey = 'AUTO_PARTIAL';
                        else if (det.includes('venta ia confirmada') || det.includes('exact_match')) featureKey = 'AUTO_SUCCESS';
                    }

                    const meta = FEATURE_MAP[featureKey] || { label: log.feature, color: '#888', bg: 'bg-muted/10' }
                    
                    return (
                      <tr key={log.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-medium">
                          {new Date(log.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-6 py-4 font-bold">{log.agent_name || "Bot Automático"}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border" style={{ color: meta.color, borderColor: `${meta.color}40`, backgroundColor: `${meta.color}10` }}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground min-w-[300px]">{log.details}</td>
                        <td className="px-6 py-4 font-black text-right text-red-500">-{log.credits_cost}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}