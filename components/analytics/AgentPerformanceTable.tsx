"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, MessageSquare, Clock, CheckCircle2, Loader2, ArrowUpRight } from "lucide-react"
import { GlobalLoader } from "@/components/ui/global-loader" // El loader premium que hicimos

interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  agent_email: string;
  total_chats: string | number;
  chats_pendientes: string | number;
  chats_resueltos: string | number;
  mensajes_enviados: string | number;
}

export function AgentPerformanceTable() {
  const [data, setData] = useState<AgentPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/agents')
      .then(res => res.json())
      .then(fetchedData => setData(Array.isArray(fetchedData) ? fetchedData : []))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <GlobalLoader title="Analizando Rendimiento" subtitle="Calculando métricas del equipo..." />

  // Totales Globales del Equipo
  const globalMensajes = data.reduce((acc, curr) => acc + Number(curr.mensajes_enviados || 0), 0)
  const globalPendientes = data.reduce((acc, curr) => acc + Number(curr.chats_pendientes || 0), 0)
  const globalResueltos = data.reduce((acc, curr) => acc + Number(curr.chats_resueltos || 0), 0)
  const globalChats = globalPendientes + globalResueltos
  const globalTasa = globalChats > 0 ? ((globalResueltos / globalChats) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      
      {/* 🎯 TARJETAS SUPERIORES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tarjeta 1: Mensajes */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl" />
          <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5"/> Mensajes Enviados</p>
          <p className="text-3xl font-black mt-2 text-foreground">{globalMensajes.toLocaleString("es-AR")}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.length} agentes activos</p>
        </div>

        {/* Tarjeta 2: Pendientes */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl" />
          <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500"/> Chats Pendientes</p>
          <p className="text-3xl font-black mt-2 text-amber-600 dark:text-amber-500">{globalPendientes}</p>
          <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>
        </div>

        {/* Tarjeta 3: Resueltos */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-2xl" />
          <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> Chats Resueltos</p>
          <div className="flex items-end gap-3 mt-2">
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500">{globalResueltos}</p>
            <span className="mb-1 text-sm font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-md">
              {globalTasa}% Tasa
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">De {globalChats} chats totales</p>
        </div>
      </div>

      {/* 📊 TABLA DETALLADA POR AGENTE */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border/50 flex justify-between items-center bg-muted/20">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Rendimiento por Agente
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">Carga de trabajo y eficacia de respuesta individual.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40">
              <tr>
                <th className="px-6 py-4 font-semibold">Agente</th>
                <th className="px-6 py-4 font-semibold text-center">Mensajes<br/>Enviados</th>
                <th className="px-6 py-4 font-semibold text-center">Total<br/>Asignados</th>
                <th className="px-6 py-4 font-semibold text-center text-amber-600 dark:text-amber-500">Pendientes</th>
                <th className="px-6 py-4 font-semibold text-center text-emerald-600 dark:text-emerald-500">Resueltos</th>
                <th className="px-6 py-4 font-semibold text-center">Tasa de<br/>Resolución</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.map((agent, i) => {
                const total = Number(agent.total_chats)
                const resueltos = Number(agent.chats_resueltos)
                const rate = total > 0 ? Math.round((resueltos / total) * 100) : 0

                return (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    key={agent.agent_id} 
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Identidad */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-sm">
                          {(agent.agent_name || "A")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{agent.agent_name}</p>
                          <p className="text-[10px] text-muted-foreground">{agent.agent_email}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Métricas Numéricas */}
                    <td className="px-6 py-4 text-center font-medium text-slate-600 dark:text-slate-300">
                      {Number(agent.mensajes_enviados).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center font-bold">{total}</td>
                    <td className="px-6 py-4 text-center font-bold text-amber-600 dark:text-amber-500">{agent.chats_pendientes}</td>
                    <td className="px-6 py-4 text-center font-bold text-emerald-600 dark:text-emerald-500">{resueltos}</td>
                    
                    {/* Tasa de Resolución con Barra */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-center">
                        <span className="text-xs font-bold">{rate}%</span>
                        <div className="w-full max-w-[80px] h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                            style={{ width: `${rate}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
              
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No hay datos de agentes para mostrar en este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
