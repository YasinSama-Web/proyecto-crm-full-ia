"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts"
import { BrainCircuit, Mic, Image as ImageIcon, Zap, Activity, Calendar, Coins, History, ShieldCheck } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// Diccionario visual para las funciones
const FEATURE_MAP: Record<string, { label: string, icon: any, color: string, bg: string }> = {
  'VISION_RECEIPT': { label: 'Perito IA (Auto)', icon: BrainCircuit, color: '#10b981', bg: 'bg-emerald-500/10' },
  'MANUAL_VISION_RECEIPT': { label: 'Perito IA (Manual)', icon: ShieldCheck, color: '#3b82f6', bg: 'bg-blue-500/10' },
  'AUDIO_TRANSCRIPTION': { label: 'Transcripción Whisper', icon: Mic, color: '#8b5cf6', bg: 'bg-violet-500/10' },
  'TEXT_GENERATION': { label: 'Respuestas Texto', icon: Zap, color: '#f59e0b', bg: 'bg-amber-500/10' },
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

  // Función para rellenar colores en el gráfico
  const getFeatureColor = (featureName: string) => FEATURE_MAP[featureName]?.color || '#cbd5e1'

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

            {data?.byFeature?.map((feat: any) => {
              const meta = FEATURE_MAP[feat.name] || { label: feat.name, icon: Zap, color: '#888', bg: 'bg-muted' }
              const Icon = meta.icon
              return (
                <Card key={feat.name} className="border-border hover:border-border/80 transition-all shadow-sm">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${meta.bg}`}>
                      <Icon className="w-6 h-6" style={{ color: meta.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{meta.label}</p>
                      <p className="text-2xl font-black mt-0.5">{feat.value}</p>
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
          <Card className="border-border shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-violet-500" /> Desglose en Tiempo Real
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
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
                    const meta = FEATURE_MAP[log.feature] || { label: log.feature, color: '#888' }
                    return (
                      <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-medium">
                          {new Date(log.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-6 py-4 font-bold">{log.agent_name || "Bot Automático"}</td>
                        <td className="px-6 py-4">
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
