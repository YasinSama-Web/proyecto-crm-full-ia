"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Zap, Bot, DollarSign, Target, Lightbulb, TrendingUp, Medal, Award, Crown  } from "lucide-react"
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis
} from "recharts"
import { motion } from "framer-motion"
import { AgentPerformanceTable } from "@/components/analytics/AgentPerformanceTable"
// Interface para los datos reales que vienen de SQL
interface AgentSalesData {
  agente: string
  leads: number
  ventas: number
  facturado: number
  efectividad: number
  ia_usados: number
}

interface TeamAnalyticsProps {
  realSalesData: AgentSalesData[]
}

// Datos de actividad general (Simulados hasta que conectes el historial de mensajes por día)
const mockActivityGlobal = [
  { name: "Lun", manuales: 150, ia: 320 },
  { name: "Mar", manuales: 180, ia: 350 },
  { name: "Mié", manuales: 120, ia: 410 },
  { name: "Jue", manuales: 200, ia: 280 },
  { name: "Vie", manuales: 170, ia: 450 },
]

export function TeamAnalytics({ realSalesData = [] }: TeamAnalyticsProps) {
  const [selectedAgent, setSelectedAgent] = useState("todos")

  // 1. Ordenamos de mayor a menor facturación y sacamos los top 3
const sortedAgents = [...realSalesData].sort((a, b) => b.facturado - a.facturado)
const top3 = sortedAgents.slice(0, 3)

// 2. Asignamos los puestos (El array original es: [Primero, Segundo, Tercero]. Los reordenamos para la UI [Segundo, Primero, Tercero])
const firstPlace = top3[0]
const secondPlace = top3[1]
const thirdPlace = top3[2]

  const dataToUse = realSalesData && realSalesData.length > 0 ? realSalesData : [
    { 
      name: "Aún sin datos", // 👈 Cambiado de 'agente' a 'name'
      leads: 0, 
      ventas: 0, 
      facturado: 0, 
      efectividad: 0, 
      ia_usados: 0,
      tiempo_resp_min: 0 // 👈 Agregamos esto por si tu gráfico de SLA lo necesita
    }
  ]

  // 🔥 LÓGICA DINÁMICA DE INSIGHTS
  const insights = useMemo(() => {
    if (selectedAgent === "todos") {
      const totalLeads = dataToUse.reduce((acc, curr) => acc + curr.leads, 0)
      const totalVentas = dataToUse.reduce((acc, curr) => acc + curr.ventas, 0)
      const totalFacturado = dataToUse.reduce((acc, curr) => acc + curr.facturado, 0)
      const conversionGlobal = totalLeads > 0 ? ((totalVentas / totalLeads) * 100).toFixed(1) : "0"
      
      const bestSeller = [...dataToUse].sort((a, b) => b.ventas - a.ventas)[0]

      return {
        ventasTitle: "Conversión Global",
        ventasMain: `${conversionGlobal}%`,
        ventasSub: `${totalVentas} ventas de ${totalLeads} leads`,
        ingresosMain: `$${totalFacturado.toLocaleString()}`,
        ingresosSub: "Facturación total del equipo",
        nota: bestSeller.ventas > 0 
          ? `Líder actual: ${bestSeller.name} con ${bestSeller.ventas} ventas sobre ${bestSeller.leads} leads (${bestSeller.efectividad}% efectividad).`
          : "El equipo aún no ha registrado ventas en este período."
      }
    } else {
      const data = dataToUse.find(a => a.name.toLowerCase() === selectedAgent) || dataToUse[0]
      
      let nota = ""
      if (data.efectividad >= 25) nota = `¡Excelente! ${data.name} cierra 1 de cada ${Math.round(100/data.efectividad)} leads. Usa bien la IA (${data.ia_usados} msjs).`
      else if (data.efectividad >= 10) nota = `${data.name} tiene un rendimiento estable (${data.ventas} ventas). Podría mejorar su conversión ajustando sus prompts.`
      else nota = `Atención: ${data.name} tiene ${data.leads} leads pero poca conversión. Validar que no esté gastando mensajes de IA sin intención de cierre.`

      return {
        ventasTitle: "Tasa de Resolución",
        ventasMain: `${data.efectividad}%`,
        ventasSub: `${data.ventas} ventas de ${data.leads} leads`,
        ingresosMain: `$${data.facturado.toLocaleString()}`,
        ingresosSub: `Facturación de ${data.name}`,
        nota: nota
      }
    }
  }, [selectedAgent, dataToUse])


  // 🔥 FORMATEADOR DE TIEMPO HUMANO
const formatSLA = (totalMinutes) => {
  if (!totalMinutes || isNaN(totalMinutes)) return "0m";
  
  const mins = Number(totalMinutes);

  // Si es menos de 1 minuto, mostramos segundos
  if (mins < 1) {
    const secs = Math.round(mins * 60);
    return `${secs}s`;
  }

  // Si es menos de 1 hora, mostramos minutos y segundos
  if (mins < 60) {
    const m = Math.floor(mins);
    const s = Math.round((mins - m) * 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }

  // Si es menos de 1 día (24h), mostramos horas y minutos
  if (mins < 1440) {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  // Si es más de 1 día, mostramos días y horas
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
};

  return (
    <div className="space-y-6 mt-8">
      {/* CABECERA Y FILTRO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Inteligencia de Negocio</h2>
          <p className="text-muted-foreground">Analiza facturación, conversión y uso de Inteligencia Artificial.</p>
        </div>
        
        <select 
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="bg-card border border-border text-foreground text-sm rounded-lg focus:ring-blue-500 block p-2.5 shadow-sm"
        >
          <option value="todos">Resumen Global (Comparativa)</option>
          {dataToUse.map(agent => (
            <option key={agent.name} value={agent.name.toLowerCase()}>{agent.name}</option>
          ))}
        </select>
      </div>

      {top3.length > 0 && firstPlace?.facturado > 0 && (
  <div className="my-10 relative bg-gradient-to-b from-transparent to-slate-900/5 dark:to-white/[0.02] rounded-3xl p-8 border border-border/50 overflow-hidden">
    
    {/* Focos Dorados de fondo */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-yellow-500/10 blur-[100px] rounded-full pointer-events-none" />
    
    <div className="text-center mb-10 relative z-10">
      <h3 className="text-3xl font-black bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 bg-clip-text text-transparent uppercase tracking-widest flex items-center justify-center gap-3">
        <Crown className="w-8 h-8 text-yellow-500" /> Salón de la Fama <Crown className="w-8 h-8 text-yellow-500" />
      </h3>
      <p className="text-muted-foreground mt-2 font-medium">Top Facturación del Periodo Actual</p>
    </div>

    <div className="flex items-end justify-center gap-2 sm:gap-6 mt-16 h-[280px] relative z-10">
      
      {/* 🥈 SEGUNDO PUESTO */}
      {secondPlace && (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center w-[30%] max-w-[140px]">
          <div className="mb-3 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(148,163,184,0.5)] mb-2 ring-2 ring-slate-200">
               {(secondPlace.name || "#")[0].toUpperCase()}
            </div>
            <p className="font-bold text-sm text-foreground truncate w-full text-center">{secondPlace.name}</p>
            <p className="text-xs text-muted-foreground">{secondPlace.ventas} ventas</p>
          </div>
          <div className="w-full bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 h-[120px] rounded-t-xl border-t-4 border-slate-400 flex flex-col items-center pt-4 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] w-full h-full skew-x-12" />
            <Medal className="w-8 h-8 text-slate-400 mb-1" />
            <span className="text-xl font-black text-slate-500">2</span>
            <span className="font-bold text-sm text-slate-600 dark:text-slate-300 mt-auto mb-4">${secondPlace.facturado.toLocaleString("es-AR")}</span>
          </div>
        </motion.div>
      )}

      {/* 🥇 PRIMER PUESTO (EL REY) */}
      {firstPlace && (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center w-[35%] max-w-[160px] z-10">
          <div className="mb-4 flex flex-col items-center relative">
            {/* Corona flotante */}
            <motion.div animate={{ y: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute -top-8 text-yellow-500">
              <Crown className="w-8 h-8 drop-shadow-md" />
            </motion.div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 flex items-center justify-center text-white text-xl font-bold shadow-[0_0_30px_rgba(234,179,8,0.6)] mb-2 ring-4 ring-yellow-200 dark:ring-yellow-900 z-10">
               {(firstPlace.name || "#")[0].toUpperCase()}
            </div>
            <p className="font-black text-base text-foreground truncate w-full text-center">{firstPlace.name}</p>
            <p className="text-xs font-bold text-yellow-600 dark:text-yellow-500">{firstPlace.ventas} ventas (MVP)</p>
          </div>
          <div className="w-full bg-gradient-to-t from-yellow-200 to-yellow-50 dark:from-yellow-900/40 dark:to-yellow-700/20 h-[160px] rounded-t-xl border-t-4 border-yellow-400 flex flex-col items-center pt-4 shadow-[0_-10px_40px_-10px_rgba(234,179,8,0.5)] relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] w-full h-full skew-x-12" />
            <Trophy className="w-10 h-10 text-yellow-500 mb-1 drop-shadow-sm" />
            <span className="text-3xl font-black text-yellow-600 dark:text-yellow-500">1</span>
            <span className="font-black text-base text-yellow-700 dark:text-yellow-400 mt-auto mb-4">${firstPlace.facturado.toLocaleString("es-AR")}</span>
          </div>
        </motion.div>
      )}

      {/* 🥉 TERCER PUESTO */}
      {thirdPlace && (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-col items-center w-[30%] max-w-[140px]">
          <div className="mb-3 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(217,119,6,0.4)] mb-2 ring-2 ring-amber-200/50">
               {(thirdPlace.name || "#")[0].toUpperCase()}
            </div>
            <p className="font-bold text-sm text-foreground truncate w-full text-center">{thirdPlace.name}</p>
            <p className="text-xs text-muted-foreground">{thirdPlace.ventas} ventas</p>
          </div>
          <div className="w-full bg-gradient-to-t from-amber-900/20 to-amber-800/10 dark:from-amber-900/40 dark:to-amber-800/20 h-[90px] rounded-t-xl border-t-4 border-amber-700 flex flex-col items-center pt-4 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] w-full h-full skew-x-12" />
            <Award className="w-8 h-8 text-amber-700 mb-1" />
            <span className="text-xl font-black text-amber-800/50 dark:text-amber-600">3</span>
            <span className="font-bold text-sm text-amber-700 dark:text-amber-500 mt-auto mb-3">${thirdPlace.facturado.toLocaleString("es-AR")}</span>
          </div>
        </motion.div>
      )}
      
    </div>
  </div>
)}

      {/* 💡 LA NOTA INTELIGENTE */}
      <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-4 flex gap-3 shadow-sm">
        <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm mb-1">Auditoría IA</h4>
          <p className="text-sm text-blue-800/80 dark:text-blue-200/70 leading-relaxed">{insights.nota}</p>
        </div>
      </div>

      {/* 📈 LOS GRÁFICOS (4 TABS) */}
      <Tabs defaultValue="ventas" className="w-full">
     <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="ventas">Conversión</TabsTrigger>
          <TabsTrigger value="facturacion">Facturación</TabsTrigger>
          <TabsTrigger value="tiempos">Tiempos de respuesta (SLA)</TabsTrigger>
          <TabsTrigger value="mensajes">Mensajes y Equipo</TabsTrigger>
          <TabsTrigger value="ia" className="text-violet-600 dark:text-violet-400">Eficiencia IA</TabsTrigger>
        </TabsList>
        
        {/* TABS 1: VENTAS (LEADS VS VENTAS) */}
        <TabsContent value="ventas" className="mt-4 space-y-4 animate-in fade-in duration-500">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Efectividad Comercial</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedAgent === 'todos' ? dataToUse : dataToUse.filter(a => a.name.toLowerCase() === selectedAgent)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                    <XAxis dataKey="agente" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'var(--accent)', opacity: 0.1 }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Legend verticalAlign="top" height={36}/>
                    <Bar dataKey="leads" name="Leads Asignados" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="ventas" name="Ventas Cerradas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-6">
                <div className="text-center md:text-left md:pl-8">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{insights.ventasTitle}</p>
                  <h3 className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{insights.ventasMain}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{insights.ventasSub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TABS 2: FACTURACIÓN */}
        <TabsContent value="facturacion" className="mt-4 space-y-4 animate-in fade-in duration-500">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Ingresos Generados (USD/ARS)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedAgent === 'todos' ? dataToUse : dataToUse.filter(a => a.name.toLowerCase() === selectedAgent)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                    <XAxis dataKey="agente" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <RechartsTooltip cursor={{ fill: 'var(--accent)', opacity: 0.1 }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Bar dataKey="facturado" name="Dinero Ingresado" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={80} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="border-t border-border/50 pt-6 text-center md:text-left md:pl-8">
                 <p className="text-sm font-medium text-muted-foreground mb-1">Total Generado</p>
                 <h3 className="text-4xl font-bold text-foreground">{insights.ingresosMain}</h3>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

 {/* TABS 3: TIEMPOS (SLA REAL) */}
        <TabsContent value="tiempos" className="mt-4 space-y-4 animate-in fade-in duration-500">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Velocidad de Respuesta (SLA)</CardTitle>
              <CardDescription>Tiempo promedio histórico en contestar a los clientes.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedAgent === 'todos' ? dataToUse : dataToUse.filter(a => a.name.toLowerCase() === selectedAgent)} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#333" opacity={0.1} />
                    <XAxis type="number" stroke="#888" fontSize={12} tickFormatter={(val) => `${val}m`} />
                    <YAxis dataKey="agente" type="category" stroke="#888" fontSize={12} width={80} />
                    <RechartsTooltip cursor={{ fill: 'var(--accent)', opacity: 0.1 }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Bar dataKey="tiempo_resp_min" name="Minutos Promedio" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

           <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-6">
                <div className="text-center md:text-left md:pl-8">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Rendimiento Actual</p>
                  <h3 className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {formatSLA(
                      selectedAgent === 'todos' 
                        ? dataToUse.reduce((acc, curr) => acc + curr.tiempo_resp_min, 0) / (dataToUse.length || 1) 
                        : (dataToUse.find(a => a.name.toLowerCase() === selectedAgent)?.tiempo_resp_min || 0)
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Promedio General</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mensajes" className="mt-6 space-y-4 animate-in fade-in duration-500">
            <AgentPerformanceTable />
        </TabsContent>

        {/* 🔥 TABS 4: EFICIENCIA IA */}
        <TabsContent value="ia" className="mt-4 space-y-4 animate-in fade-in duration-500">
          <Card className="border-violet-200 dark:border-violet-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-violet-700 dark:text-violet-400 flex items-center gap-2">
                <Bot className="w-5 h-5" /> Costo vs Beneficio (IA)
              </CardTitle>
              <CardDescription>Cruza los mensajes de IA gastados contra las ventas logradas.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              
              {/* EL GRÁFICO SCATTER */}
              <div className="h-[300px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
                    <XAxis type="number" dataKey="ia_usados" name="Mensajes IA" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="number" dataKey="ventas" name="Ventas" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <ZAxis type="category" dataKey="agente" name="Agente" />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Legend verticalAlign="top" height={36}/>
                    <Scatter name="Rendimiento Agentes" data={selectedAgent === 'todos' ? dataToUse : dataToUse.filter(a => a.name.toLowerCase() === selectedAgent)} fill="#8b5cf6" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              
              {/* 🔥 NUEVO: LOS NÚMEROS GIGANTES DE IA */}
              <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-6 mb-6">
                <div className="text-center md:text-left md:pl-8">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Créditos Invertidos</p>
                  <h3 className="text-4xl font-bold text-violet-600 dark:text-violet-400">
                    {selectedAgent === 'todos' 
                      ? dataToUse.reduce((acc, curr) => acc + curr.ia_usados, 0) 
                      : dataToUse.find(a => a.name.toLowerCase() === selectedAgent)?.ia_usados || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedAgent === 'todos' ? 'Consumo global del equipo' : 'Mensajes de IA utilizados'}
                  </p>
                </div>
                <div className="text-center md:text-left border-l border-border/50 md:pl-8">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Retorno de Inversión</p>
                  <h3 className="text-4xl font-bold text-foreground">
                    {selectedAgent === 'todos' 
                      ? dataToUse.reduce((acc, curr) => acc + curr.ventas, 0) 
                      : dataToUse.find(a => a.name.toLowerCase() === selectedAgent)?.ventas || 0}
                    <span className="text-lg text-muted-foreground font-medium ml-1">ventas</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Logradas en este período
                  </p>
                </div>
              </div>

              {/* EL CARTELITO DE AYUDA */}
              <div className="bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30 rounded-xl p-4 text-sm text-violet-800 dark:text-violet-200 text-center">
                💡 <strong>¿Cómo evaluar esto?</strong> Si el agente gasta muchos créditos (número alto a la izquierda) pero logra pocas ventas (número bajo a la derecha), está quemando saldo sin generar ingresos.
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
