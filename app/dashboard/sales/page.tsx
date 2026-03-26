"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { motion, AnimatePresence } from "framer-motion"
import { DollarSign, TrendingUp, Users, Phone, GripVertical, Loader2, Settings2, Plus, Trash2, CheckCircle2, Search, Calendar, Tag as TagIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"
import { DateRange } from "react-day-picker"
import { subDays, startOfMonth, format, startOfDay, endOfDay, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { GlobalLoader } from "@/components/ui/global-loader"

// IMPORTANTE: Asegúrate de que esta función exista en tu actions de campañas
import { getAllContactsForSelector } from "@/app/dashboard/campaigns/actions" 

interface Deal { id: string, contact_name: string, phone: string, deal_value: number, pipeline_stage_id: string, tags: string[], updated_at?: string }
interface Stage { id: string, name: string, color: string, bgFrom: string, bgTo: string, dotColor: string }

const THEMES = [
  { color: "text-blue-400", bgFrom: "from-blue-500/10", bgTo: "to-blue-600/5", dotColor: "bg-blue-500" },
  { color: "text-amber-400", bgFrom: "from-amber-500/10", bgTo: "to-amber-600/5", dotColor: "bg-amber-500" },
  { color: "text-violet-400", bgFrom: "from-violet-500/10", bgTo: "to-violet-600/5", dotColor: "bg-violet-500" },
  { color: "text-emerald-400", bgFrom: "from-emerald-500/10", bgTo: "to-emerald-600/5", dotColor: "bg-emerald-500" },
  { color: "text-rose-400", bgFrom: "from-rose-500/10", bgTo: "to-rose-600/5", dotColor: "bg-rose-400" },
]

const COUNTRY_CODES = [
    { value: "549", label: "🇦🇷 +54 9 (Arg)" },
    { value: "56", label: "🇨🇱 +56 (Chi)" },
    { value: "52", label: "🇲🇽 +52 (Mex)" },
    { value: "57", label: "🇨🇴 +57 (Col)" },
    { value: "51", label: "🇵🇪 +51 (Per)" },
    { value: "34", label: "🇪🇸 +34 (Esp)" },
    { value: "1", label: "🇺🇸 +1 (USA)" },
]

// --- COMPONENTES AUXILIARES VISUALES ---
function useAnimatedCounter(target: number, duration = 800) {
  const [value, setValue] = useState(0); const prevTarget = useRef(0)
  useEffect(() => {
    const start = prevTarget.current; prevTarget.current = target; const diff = target - start;
    if (diff === 0) { setValue(target); return }
    const startTime = performance.now(); let raf: number;
    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      setValue(Math.round(start + diff * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

function KpiCard({ label, value, prefix = "", icon: Icon, gradient, delay = 0 }: any) {
  const animatedValue = useAnimatedCounter(value)
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }} className={cn("relative overflow-hidden rounded-2xl border border-white/10 p-5 bg-card/60 dark:bg-white/[0.04] backdrop-blur-xl shadow-lg")}>
      <div className={cn("absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-20 blur-2xl", gradient)} />
      <div className="flex items-center justify-between relative">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{prefix}{animatedValue.toLocaleString("es-AR")}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", gradient)}><Icon className="h-5 w-5 text-white" /></div>
      </div>
    </motion.div>
  )
}

function DealCard({ deal, index, onEdit, availableTags }: any) {
  
  // ¡NO HAY NINGÚN useState AQUÍ! La tarjeta solo usa lo que recibe de props.

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} style={provided.draggableProps.style}>
          <motion.div whileHover={{ scale: 1.02, y: -2 }} className={cn("group rounded-xl border p-3.5 cursor-pointer transition-shadow duration-200 bg-card/80 dark:bg-white/[0.04] backdrop-blur-md border-border/60", snapshot.isDragging ? "shadow-xl ring-2 ring-violet-500/30 z-50" : "shadow-sm hover:shadow-lg")} onClick={() => onEdit(deal)}>
            <div className="flex items-start gap-3">
              <div {...provided.dragHandleProps} className="mt-1 text-muted-foreground/40 group-hover:text-muted-foreground/70"><GripVertical className="h-4 w-4" /></div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white text-xs font-bold shadow-md">
                {(deal.contact_name || deal.phone || "#")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-sm font-semibold text-foreground truncate">{deal.contact_name || "Sin Nombre"}</p>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /><span className="text-[11px] truncate">{deal.phone}</span></div>
                <div className="flex flex-wrap gap-1">
                  {/* Aquí usa availableTags que le llega de las props */}
                  {(deal.tags || []).slice(0,2).map((tagName: string) => {
                    const cleanTagName = tagName.trim().toLowerCase();
                    const tagInfo = availableTags.find((t: any) => t.name.trim().toLowerCase() === cleanTagName);
                    const color = tagInfo?.color || "#94a3b8"
                    return (
                      <span key={tagName} className="inline-flex text-sm items-center">
                        <span className="h-1.5 w-1.5 rounded-full mx-2" style={{ backgroundColor: color }} />
                        {tagName}
                      </span>
                    )
                  })}
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold tabular-nums">
                ${Number(deal.deal_value || 0).toLocaleString("es-AR")}
              </Badge>
            </div>
          </motion.div>
        </div>
      )}
    </Draggable>
  )
}

function StageColumn({ stage, deals, onEditDeal, availableTags }: any) {
  const total = deals.reduce((sum: number, d: any) => sum + Number(d.deal_value || 0), 0)
  
  return (
    // 🔥 1. Agregamos h-[calc(100vh-260px)] para que la columna nunca pase del alto de la pantalla
    <div className="flex flex-col w-[300px] shrink-0 lg:flex-1 lg:min-w-[240px] h-[calc(100vh-260px)]">
      
      {/* Cabecera de la columna (Shrink-0 para que siempre se quede fija arriba) */}
      <div className="flex items-center justify-between rounded-t-xl px-4 py-3 bg-card/70 dark:bg-white/[0.03] backdrop-blur-md border border-b-0 border-border/50 shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", stage.dotColor)} />
          <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary/80 px-1.5 text-[11px] font-bold text-muted-foreground">{deals.length}</span>
        </div>
        <p className={cn("text-xs font-bold tabular-nums", stage.color)}>${total.toLocaleString("es-AR")}</p>
      </div>

      {/* Cuerpo de la columna (Aquí ocurre la magia del Scroll) */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef} 
            {...provided.droppableProps} 
            // 🔥 2. Agregamos overflow-y-auto y la clase custom-scrollbar
            className={cn(
              "flex-1 overflow-y-auto space-y-2.5 rounded-b-xl p-2.5 transition-colors border border-t-0 border-border/50 custom-scrollbar pb-10", 
              snapshot.isDraggingOver ? cn("bg-gradient-to-b", stage.bgFrom, stage.bgTo) : "bg-muted/30 dark:bg-white/[0.01]"
            )}
          >
            <AnimatePresence>
              {deals.map((deal: any, index: number) => <DealCard key={deal.id} availableTags={availableTags} deal={deal} index={index} onEdit={onEditDeal} />)}
            </AnimatePresence>
            {provided.placeholder}
            
            {/* Mensaje de Columna Vacía */}
            {deals.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex h-32 items-center justify-center text-muted-foreground/50 text-xs">
                Columna Vacía
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}

// --- PANTALLA PRINCIPAL ---
export default function SalesPipelinePage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  
  // Estructura y Datos
  const [stages, setStages] = useState<Stage[]>([])
  const [allDeals, setAllDeals] = useState<Deal[]>([]) // 🔥 Histórico completo
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  
  // Configuración Columnas
  const [isManagingStages, setIsManagingStages] = useState(false)
  const [newStageName, setNewStageName] = useState("")

  // Venta Manual
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false)
  const [saleCountryCode, setSaleCountryCode] = useState("549") 
  const [saleLocalPhone, setSaleLocalPhone] = useState("")
  const [saleName, setSaleName] = useState("")
  const [saleAmount, setSaleAmount] = useState("")
  const [saleStage, setSaleStage] = useState("")
  const [saleMethod, setSaleMethod] = useState("transfer")
  const [saleConcept, setSaleConcept] = useState("") 
  const [isRecurring, setIsRecurring] = useState(false) 

  // Buscador
  const [isContactSelectorOpen, setIsContactSelectorOpen] = useState(false)
  const [contactsList, setContactsList] = useState<any[]>([])
  const [contactSearchTerm, setContactSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("") 
  const [isSearchingPhone, setIsSearchingPhone] = useState(false)

  // Metas y Tags
  const [goalData, setGoalData] = useState({ goal: 1000000, currentTotal: 0, trendPercentage: 0 })
  const [availableTags, setAvailableTags] = useState<any[]>([])

  const [dealPayments, setDealPayments] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)

  const todayArg = new Date().toLocaleString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).split(' ')[0];

  // 🔥 NUEVO ESTADO DE FECHAS
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(todayArg + "T00:00:00"), 
    to: new Date(todayArg + "T23:59:59")
  })

  // 1. CARGAR DATOS INICIALES (Metas y Tags)
  useEffect(() => { setIsMounted(true) }, [])
  
  useEffect(() => {
    fetch('/api/tags').then(res => res.ok ? res.json() : []).then(data => setAvailableTags(data)).catch(console.error)
  }, [])

  const fetchGoalData = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/goal')
      if (res.ok) setGoalData(await res.json())
    } catch (e) { console.error("Error trayendo meta:", e) }
  }, [])

  useEffect(() => { fetchGoalData() }, [fetchGoalData])

  // 2. CARGAR EL PIPELINE (UNA SOLA VEZ O AL RECARGAR FUERTE)
const fetchPipelineData = useCallback((currentDateRange: any) => {
    setIsLoading(true)
    let url = '/api/pipeline'
    
    // Si hay un rango, lo pasamos a la URL. Si no hay, la URL queda '/api/pipeline' (Histórico)
    if (currentDateRange?.from && currentDateRange?.to) {
       const fromStr = format(currentDateRange.from, 'yyyy-MM-dd')
       const toStr = format(currentDateRange.to, 'yyyy-MM-dd')
       url += `?from=${fromStr}&to=${toStr}`
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if(data.stages) {
          const mappedStages = data.stages.map((s: any, i: number) => ({ ...s, ...(THEMES[i % THEMES.length]) }))
          setStages(mappedStages)
        }
        if(data.deals) setAllDeals(data.deals)
      }).finally(() => setIsLoading(false))
  }, [])

  // Disparar la búsqueda inicial y cada vez que cambie el calendario
useEffect(() => { 
    // Ahora enviamos la fecha siempre (ya sea un rango o undefined)
    fetchPipelineData(date)
  }, [date, fetchPipelineData])

  // 3. CARGAR CONTACTOS PARA VENTA MANUAL
  useEffect(() => {
    async function loadContacts() {
      if (isNewSaleOpen && contactsList.length === 0) {
        try {
          const contacts = await getAllContactsForSelector();
          const contactosLimpios = contacts.filter((c: any) => {
              if (!c.phone) return false;
              const soloNumeros = c.phone.replace(/\D/g, '');
              return soloNumeros.length >= 11 && soloNumeros.length <= 15;
          });
          setContactsList(contactosLimpios);
        } catch (error) { console.error("Error cargando contactos:", error); }
      }
    }
    loadContacts();
  }, [isNewSaleOpen, contactsList.length]);

  // 4. DEBOUNCE BUSCADOR
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearchTerm(contactSearchTerm) }, 300)
    return () => clearTimeout(timer)
  }, [contactSearchTerm])


  // 🔥 FILTRO INTELIGENTE LOCAL PARA EL KANBAN
const deals = useMemo(() => {
    // Si es "Histórico Completo", date es undefined, devolvemos todo.
    if (!date?.from || !date?.to) return allDeals;
    
    return allDeals.filter(deal => {
      // 🚩 IMPORTANTE: Aquí usamos updated_at (con guion bajo)
      const dateToCompare = deal.updated_at;
      
      if (!dateToCompare) return false; 
      
      const dealDate = new Date(dateToCompare); 
      const rangeStart = startOfDay(date.from!);
      const rangeEnd = endOfDay(date.to!);
      
      return dealDate >= rangeStart && dealDate <= rangeEnd;
    });
  }, [allDeals, date]);

  const handleEditGoal = async () => {
      const { value: newGoal } = await Swal.fire({
        title: 'Meta de Ventas Mensual',
        input: 'number',
        inputLabel: 'Ingresa el monto objetivo en $',
        inputValue: goalData.goal,
        showCancelButton: true,
        confirmButtonColor: '#059669'
      })
      if (newGoal) {
          setGoalData(prev => ({ ...prev, goal: Number(newGoal) }));
          await fetch('/api/pipeline/goal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: Number(newGoal) })
          });
          fetchGoalData();
      }
  }

  // --- LÓGICA DE DRAG & DROP Y EDICIÓN ---
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return
    
    // Actualizamos el array local completo para que no parpadee
    setAllDeals((prev) => {
      const updated = [...prev]; const dealIndex = updated.findIndex((d) => d.id === draggableId);
      if (dealIndex === -1) return prev
      const [moved] = updated.splice(dealIndex, 1); moved.pipeline_stage_id = destination.droppableId;
      updated.splice(destination.index, 0, moved); return updated
    })
    
    try {
      await fetch(`/api/contacts/${draggableId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pipeline_stage_id: destination.droppableId }) })
    } catch (e) {}
  }

  const handleSaveDeal = async (id: string, deal_value: number, pipeline_stage_id: string) => {
    setAllDeals(prev => prev.map(d => d.id === id ? { ...d, deal_value, pipeline_stage_id } : d)); 
    setEditingDeal(null)
    try {
      await fetch(`/api/contacts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deal_value, pipeline_stage_id }) })
      router.refresh()
    } catch (e) {}
  }

  useEffect(() => {
    if (!editingDeal?.phone) return;
    
    const fetchPayments = async () => {
      setLoadingPayments(true)
      try {
        // Usamos tu mismo endpoint. Le pasamos 'pipeline' como ID falso
        // porque tu API ya es inteligente y filtra por el ?phone=
        const res = await fetch(`/api/conversations/pipeline/payments?phone=${encodeURIComponent(editingDeal.phone)}`)
        if (res.ok) {
          const data = await res.json()
          setDealPayments(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error("Error cargando pagos del deal:", error)
      } finally {
        setLoadingPayments(false)
      }
    }
    
    fetchPayments()
  }, [editingDeal])

  // --- LÓGICA DE GESTIÓN DE COLUMNAS ---
  const handleAddStage = async () => {
    if (!newStageName.trim()) return
    const res = await fetch('/api/pipeline/stages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newStageName }) })
    if (res.ok) { setNewStageName(""); fetchPipelineData() }
  }

  const handleDeleteStage = async (id: string) => {
    const res = await fetch(`/api/pipeline/stages?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { Swal.fire("Aviso", data.error, "warning"); return }
    fetchPipelineData()
  }

  const handleUpdateStageName = async (id: string, newName: string) => {
    await fetch('/api/pipeline/stages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name: newName }) })
    fetchPipelineData()
  }

  // --- LÓGICA DE VENTA MANUAL ---
  const handlePhoneChange = async (val: string) => {
    setSaleLocalPhone(val);
    const fullPhone = saleCountryCode + val;
    
    const existingContact = contactsList.find(c => c.phone === fullPhone || c.phone === val);
    if (existingContact && existingContact.name) {
       setSaleName(existingContact.name);
       return;
    }

    if (val.length >= 8) {
       setIsSearchingPhone(true)
       try {
         const res = await fetch(`/api/contacts?phone=${encodeURIComponent(fullPhone)}`)
         const data = await res.json()
         if (data?.[0]?.name) setSaleName(data[0].name)
       } catch(e) {}
       setIsSearchingPhone(false)
    }
  }

  const handleSubmitSale = async () => {
     const targetStageId = stages.length > 0 ? stages[stages.length - 1].id : saleStage;

     if(!saleLocalPhone || !saleAmount || !targetStageId) {
         Swal.fire("Atención", "Completa el teléfono y el monto.", "warning")
         return
     }
     
     const result = await Swal.fire({
        title: 'Registrar Venta Manual',
        html: `
          <div class="text-left space-y-3 mt-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p>👤 <b>Cliente:</b> ${saleName || "Sin Nombre"} ${isRecurring ? '<span class="text-amber-600 text-[10px] bg-amber-100 px-2 py-0.5 rounded ml-1">Recurrente</span>' : ''}</p>
            <p>📱 <b>Teléfono:</b> +${saleCountryCode} ${saleLocalPhone}</p>
            ${saleConcept ? `<p>🏷️ <b>Concepto:</b> ${saleConcept}</p>` : ''}
            <div class="border-t border-slate-200 pt-2 mt-2">
                <p class="text-lg">💰 <b>Total:</b> <span class="text-emerald-600 font-bold">$${Number(saleAmount).toLocaleString("es-AR")}</span></p>
            </div>
            <div class="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex gap-2">
               <span class="text-orange-500 text-lg">⚠️</span>
               <p class="text-xs text-orange-800 leading-tight">
                 <b>Aviso de Auditoría:</b> Esta venta se registrará como "No Verificada". No se analizará el fraude ni se enviarán los datos enriquecidos al Píxel de Marketing <b>(deberas hacerlo manual).</b>
               </p>
            </div>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f97316',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Guardar sin verificar',
        cancelButtonText: 'Cancelar'
     });

     if (!result.isConfirmed) return;
     Swal.fire({ title: "Procesando...", allowOutsideClick: false, didOpen: () => Swal.showLoading() })
     
     try {
        const payload = {
            phone: saleCountryCode + saleLocalPhone,
            name: saleName || "Sin Nombre",
            amount: Number(saleAmount),
            stageId: targetStageId,
            method: saleMethod,
            concept: saleConcept 
        }
        
        await fetch('/api/pipeline/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        
        Swal.fire("¡Venta Registrada!", "El ingreso ya figura en tus analíticas.", "success")
        
        setIsNewSaleOpen(false)
        setSaleLocalPhone(""); setSaleName(""); setSaleAmount(""); setSaleConcept(""); setIsRecurring(false);
        fetchPipelineData()
        fetchGoalData()
        router.refresh()
     } catch(e) {
        Swal.fire("Error", "No se pudo registrar la venta.", "error")
     }
  }

  useEffect(() => {
    if (isNewSaleOpen && stages.length > 0 && !saleStage) {
        setSaleStage(stages[stages.length - 1].id)
    }
  }, [isNewSaleOpen, stages])


  const filteredContacts = contactsList.filter(c =>
    (c.name || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    (c.phone || "").includes(debouncedSearchTerm)
  );

// LO QUE PONES AHORA (El loader Premium):
if (!isMounted || isLoading) return <GlobalLoader title="Cargando Embudo" subtitle="Procesando ventas..." />
  const totalPipeline = deals.reduce((sum, d) => sum + Number(d.deal_value || 0), 0)
  const activeContacts = deals.length

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      <div className="shrink-0 px-4 md:px-6 pt-4 pb-4 space-y-4 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Pipeline de Ventas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Arrastra los contactos o registra ventas manualmente.</p>
          </div>
          
          {/* 🔥 CONTROLES SUPERIORES (Botones y Calendario) */}
          <div className="flex flex-wrap items-center gap-2">
             <Button variant="outline" className="h-9 border-dashed border-violet-300 text-violet-600 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:border-violet-700/50 dark:text-violet-300" onClick={() => setIsManagingStages(true)}>
                <Settings2 className="w-4 h-4 mr-2" /> Tablero
             </Button>
             
             <Button className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20" onClick={() => setIsNewSaleOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Venta
             </Button>
             
             <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

             {/* SELECTOR DE FECHAS PREMIUM */}
             <div className="flex items-center gap-2">
               <Select onValueChange={(val) => {
                 const t = new Date()
                 if (val === "today") setDate({ from: startOfDay(t), to: endOfDay(t) })
                 if (val === "yesterday") {
                   const yesterday = subDays(t, 1);
                   setDate({ from: startOfDay(yesterday), to: endOfDay(yesterday) })
                 }
                 if (val === "7") setDate({ from: startOfDay(subDays(t, 7)), to: endOfDay(t) })
                 if (val === "30") setDate({ from: startOfDay(subDays(t, 30)), to: endOfDay(t) })
                 if (val === "month") setDate({ from: startOfMonth(t), to: endOfMonth(t) })
                 if (val === "all") setDate(undefined) 
               }}>
                 <SelectTrigger className="h-9 w-[130px] bg-card/60 backdrop-blur-sm border-border/50 rounded-xl">
                   <SelectValue placeholder="Rápido..." />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="today">Hoy</SelectItem>
                   <SelectItem value="yesterday">Ayer</SelectItem>
                   <SelectItem value="7">Últimos 7 días</SelectItem>
                   <SelectItem value="month">Este Mes</SelectItem>
                   <SelectItem value="all" className="font-bold text-violet-600">Histórico Completo</SelectItem>
                 </SelectContent>
               </Select>

               <Popover>
                 <PopoverTrigger asChild>
                   <Button variant="outline" className={`h-9 flex items-center gap-2 px-3 w-[220px] justify-start text-left font-medium bg-card/60 backdrop-blur-sm border-border/50 rounded-xl transition-all ${!date && "text-slate-500"}`}>
                     <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                     <span className="truncate text-xs text-foreground">
                       {date?.from ? (
                         date.to ? `${format(date?.from, "dd LLL", { locale: es })} - ${format(date?.to, "dd LLL, y", { locale: es })}` : format(date?.from, "dd LLL, y", { locale: es })
                       ) : "Elegir fechas..."}
                     </span>
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl" align="end">
                   <CalendarComponent 
                     initialFocus 
                     mode="range" 
                     defaultMonth={date?.from} 
                     selected={date} 
                     onSelect={setDate} 
                     numberOfMonths={2} 
                     locale={es} 
                     showOutsideDays={false}
                     className="bg-card/95 backdrop-blur-md rounded-2xl" 
                   />
                 </PopoverContent>
               </Popover>
             </div>
          </div>
        </div>

        {/* 🔥 CALCULAMOS CUÁNTO LLEVAMOS GANADO PARA LA BARRA (Corregido y Limpio) */}
        {(() => {
           const goalPercentage = Math.min((goalData.currentTotal / (goalData.goal || 1)) * 100, 100);
           const isTrendPositive = goalData.trendPercentage >= 0;

           return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
              <KpiCard label="Valor Total del Embudo" value={totalPipeline} prefix="$" icon={DollarSign} gradient="bg-gradient-to-br from-violet-500 to-violet-600" />
              <KpiCard label="Contactos en Proceso" value={activeContacts} icon={Users} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" delay={0.1} />
              
              {/* TARJETA DE META INTERACTIVA Y CONTABLE */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} onClick={handleEditGoal} className="relative overflow-hidden rounded-2xl border border-white/10 p-5 bg-card/60 dark:bg-white/[0.04] backdrop-blur-xl shadow-lg cursor-pointer hover:border-emerald-500/50 transition-colors group flex flex-col justify-between">
                <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-20 blur-2xl bg-gradient-to-br from-emerald-500 to-teal-600" />
                
                <div className="relative z-10 space-y-3">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground group-hover:text-emerald-500 transition-colors">Meta Mensual</p>
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">{goalPercentage.toFixed(1)}%</span>
                  </div>
                  
                  <div>
                      <div className="flex items-end gap-2 mb-1">
                        <p className="text-2xl font-bold text-foreground tabular-nums">${goalData.currentTotal.toLocaleString("es-AR")}</p>
                        <p className="text-xs text-muted-foreground mb-1 font-medium">/ ${goalData.goal.toLocaleString("es-AR")}</p>
                      </div>
                      
                      {/* 🔥 EL CONDIMENTO: TENDENCIA VS MES PASADO */}
                      <p className={cn("text-[10px] font-semibold flex items-center gap-1", isTrendPositive ? "text-emerald-500" : "text-rose-500")}>
                         {isTrendPositive ? "🔼" : "🔽"} {Math.abs(goalData.trendPercentage).toFixed(1)}% vs mismo día mes anterior
                      </p>
                  </div>
                  
                  {/* BARRA DE PROGRESO */}
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${goalPercentage}%` }} transition={{ duration: 1, ease: "easeOut" }} className={cn("h-full rounded-full", goalPercentage >= 100 ? "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-gradient-to-r from-emerald-500 to-emerald-400")} />
                  </div>
                </div>
              </motion.div>
            </div>
           )
        })()}
      </div>
    

      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 md:px-6 py-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 h-full lg:grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
            {stages.map((stage) => (
              <StageColumn key={stage.id} stage={stage} availableTags={availableTags} deals={deals.filter((d) => d.pipeline_stage_id === stage.id)} onEditDeal={setEditingDeal} />
            ))}
          </div>
        </DragDropContext>
      </div>

    <Sheet open={!!editingDeal} onOpenChange={(open) => !open && setEditingDeal(null)}>
        <SheetContent className="sm:max-w-lg bg-background overflow-y-auto p-0 border-l border-border/50">
          <div className="p-8 space-y-8">
              
              <SheetHeader className="pb-4 border-b border-border/50">
                <SheetTitle>Editar Oportunidad</SheetTitle>
              </SheetHeader>

              {editingDeal && (
                <div className="space-y-8">
                  
                  {/* Perfil del Cliente Superior (Igual) */}
                  <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl border border-border/50">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0">
                        {(editingDeal.contact_name || editingDeal.phone || "#")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-foreground truncate">{editingDeal.contact_name || "Sin Nombre"}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="w-3.5 h-3.5" /> {editingDeal.phone}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                             {(editingDeal.tags || []).map((tagName: string) => {
                                const cleanTagName = tagName.trim().toLowerCase();
                                const tagInfo = availableTags.find((t: any) => t.name.trim().toLowerCase() === cleanTagName);
                                const color = tagInfo?.color || "#94a3b8"
                                return (
                                  <Badge key={tagName} variant="secondary" className="px-2 text-[10px] bg-secondary/80 flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />{tagName}
                                  </Badge>
                                )
                             })}
                          </div>
                      </div>
                  </div>

                  {/* Monto Global Editable */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">Monto Acumulado ($)</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-500" />
                        <Input type="number" defaultValue={editingDeal.deal_value} id="deal-val" className="pl-10 h-14 text-xl font-bold bg-background shadow-sm" />
                    </div>
                  </div>

                  {/* Columna */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">Columna del Pipeline</label>
                    <Select defaultValue={editingDeal.pipeline_stage_id} onValueChange={(val) => document.getElementById("deal-stage")?.setAttribute("value", val)}>
                      <SelectTrigger id="deal-stage" value={editingDeal.pipeline_stage_id} className="h-12 bg-background shadow-sm text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 🔥 NUEVO: HISTORIAL DE PAGOS INTEGRADO */}
                  <div className="space-y-4 pt-6 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        Desglose de Transacciones
                      </label>
                      <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30">
                        {dealPayments.length} Pagos
                      </Badge>
                    </div>

                    {loadingPayments ? (
                      <p className="text-xs text-muted-foreground text-center py-4 animate-pulse">Buscando historial...</p>
                    ) : dealPayments.length > 0 ? (
                      <ScrollArea className="h-[220px] pr-4 rounded-xl">
                        <div className="space-y-2">
                          {dealPayments.map((p) => {


                      const isManual = p.processed_by_ai !== true; 
                      const paymentTitle = isManual ? "Pago Manual" : "Pago Verificado IA ✨";
                            
                            return (
                              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
  "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
  isManual 
    ? "bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400" 
    : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
)}>
  <CheckCircle2 className="h-4 w-4" />
</div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{paymentTitle}</p>
                                    <p className="text-xs text-slate-400">
                                      {new Date(p.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: '2-digit', minute:'2-digit' })}
                                    </p>
                                  </div>
                                </div>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">+${Number(p.amount).toLocaleString()}</span>
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed border-border/60">
                        <p className="text-sm text-muted-foreground">No hay registros detallados.</p>
                      </div>
                    )}
                  </div>

                  {/* BOTONES DE ACCIÓN */}
                  <div className="flex gap-3 pt-4 border-t border-border/50">
                    <Button 
                        variant="outline" 
                        className="h-12 w-14 shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 bg-transparent"
                        onClick={() => handleSaveDeal(editingDeal.id, 0, "none")}
                        title="Eliminar Oportunidad"
                    >
                        <Trash2 className="w-5 h-5" />
                    </Button>
                    <Button className="h-12 flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-base shadow-lg shadow-violet-500/20" onClick={() => {
                      const val = Number((document.getElementById('deal-val') as HTMLInputElement).value);
                      const stage = document.getElementById('deal-stage')?.getAttribute("value") || editingDeal.pipeline_stage_id;
                      handleSaveDeal(editingDeal.id, val, stage);
                    }}>
                      Guardar Cambios
                    </Button>
                  </div>

                </div>
              )}
          </div>
        </SheetContent>
      </Sheet>
      {/* --- MODAL 2: PERSONALIZAR COLUMNAS --- */}
      <Sheet open={isManagingStages} onOpenChange={setIsManagingStages}>
        <SheetContent className="sm:max-w-md bg-background overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>Personalizar Tablero</SheetTitle>
            <SheetDescription>Agrega, renombra o elimina las columnas de tu proceso de ventas.</SheetDescription>
          </SheetHeader>
          <div className="p-6 space-y-4">
            <div className="flex gap-2 pb-4 border-b border-border/50">
              <Input placeholder="Ej: Esperando Seña" value={newStageName} onChange={e => setNewStageName(e.target.value)} className="h-9" />
              <Button size="sm" onClick={handleAddStage} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-1"/> Agregar</Button>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase">Tus Columnas Actuales</label>
              {stages.map((stage, index) => {
                const isLastColumn = index === stages.length - 1;
                return (
                <div key={stage.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-secondary/30">
                  <div className={cn("w-3 h-3 rounded-full shrink-0", stage.dotColor)} />
                  <Input defaultValue={stage.name} className="h-8 text-sm bg-transparent border-transparent hover:border-border focus:border-border focus:bg-background" onBlur={(e) => { if (e.target.value !== stage.name) handleUpdateStageName(stage.id, e.target.value) }} />
                  {isLastColumn ? (
                      <div className="h-8 w-8 flex items-center justify-center text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-md shrink-0" title="Columna de ventas cerradas">
                          <DollarSign className="w-4 h-4" />
                      </div>
                  ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 shrink-0" onClick={() => handleDeleteStage(stage.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                  )}
                </div>
              )})}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* --- 🔥 MODAL 3: REGISTRAR NUEVA VENTA MANUAL --- */}
      <Sheet open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
        <SheetContent className="sm:max-w-md bg-background overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Registrar Venta Manual
            </SheetTitle>
            <SheetDescription>Asigna un pago a un contacto existente o crea uno nuevo al vuelo.</SheetDescription>
          </SheetHeader>
          
          <div className="p-6 space-y-5">
            <div className="space-y-2">
                <label className="text-sm font-medium text-emerald-700 dark:text-emerald-400">1. Seleccionar Cliente Existente</label>
                
                {/* 🔥 BOTÓN QUE ABRE EL NUEVO MODAL DE CONTACTOS */}
                <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal h-11 border-dashed border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100"
                    onClick={() => setIsContactSelectorOpen(true)}
                >
                    <Search className="mr-2 h-4 w-4 text-emerald-600" />
                    {saleName ? `${saleName} (${saleCountryCode}${saleLocalPhone})` : "Buscar en tu agenda de contactos..."}
                </Button>
                
                <div className="flex items-center my-6 before:flex-1 before:border-t before:border-border after:flex-1 after:border-t after:border-border">
                   <span className="px-3 text-xs text-muted-foreground uppercase font-semibold">O crear cliente nuevo</span>
                </div>
            </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono (WhatsApp)</label>
                <div className="flex gap-2">
                    {/* 🔥 SELECTOR DE PAÍS INCORPORADO */}
                    <Select value={saleCountryCode} onValueChange={setSaleCountryCode}>
                        <SelectTrigger className="w-[120px] h-11 bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {COUNTRY_CODES.map(code => (
                                <SelectItem key={code.value} value={code.value}>{code.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input placeholder="Ej: 115022..." className="h-11 flex-1" value={saleLocalPhone} onChange={(e) => handlePhoneChange(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input placeholder="Nombre del cliente" className="h-11" value={saleName} onChange={(e) => setSaleName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Concepto / Descripcion <span className="text-muted-foreground font-normal">(Opcional)</span></label>
                <div className="relative">
                    <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Ej: Curso de Marketing, Renovacion..." className="pl-9 h-11" value={saleConcept} onChange={(e) => setSaleConcept(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Monto Cobrado ($)</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                    <Input type="number" placeholder="0.00" className="pl-9 h-11 font-bold text-lg" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} />
                </div>
              </div>

      <div className="space-y-2">
                <label className="text-sm font-medium">Destino en el Tablero</label>
                <div className="h-11 w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-md flex items-center px-3 gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-emerald-800 dark:text-emerald-200">
                        Se moverá a <span className="font-bold">{stages.length > 0 ? stages[stages.length - 1].name : "Ventas"}</span>
                    </span>
                </div>
              </div>

              <Button className="w-full h-12 mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-500/20" onClick={handleSubmitSale}>
                 Guardar Venta
              </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* --- 🔥 NUEVO MODAL GIGANTE: BUSCADOR DE CONTACTOS --- */}
      <Dialog open={isContactSelectorOpen} onOpenChange={setIsContactSelectorOpen}>
        <DialogContent className="sm:max-w-md bg-background p-0 overflow-hidden border-border/50 shadow-2xl">
          <DialogHeader className="p-4 border-b border-border/50 bg-muted/20">
            <DialogTitle className="flex items-center gap-2 text-foreground">
                <Users className="w-5 h-5 text-emerald-600" /> Seleccionar Contacto
            </DialogTitle>
            <DialogDescription>
                Busca un cliente en tu base de datos para asignarle esta venta.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 border-b border-border/50 bg-background">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o teléfono..."
                className="pl-9 bg-muted/50 h-11 text-sm border-transparent focus-visible:ring-1 focus-visible:ring-emerald-500"
                value={contactSearchTerm}
                onChange={(e) => setContactSearchTerm(e.target.value)}
              />
              {isRecurring && (
   <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 mt-2">
      ⭐ Cliente Registra Ventas Previas
   </Badge>
)}
              {contactSearchTerm && (
                 <Button variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setContactSearchTerm("")}>
                    <X className="w-3.5 h-3.5" />
                 </Button>
              )}
            </div>
          </div>
          
          <ScrollArea className="h-[350px] bg-background">
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No se encontraron clientes válidos.</p>
                  <p className="text-xs text-muted-foreground">Cierra este panel y regístralo manualmente.</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredContacts.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      // 🔥 MAGIA: Extrae el 549 y lo acomoda en los inputs solos
                      const isArg = c.phone.startsWith("549");
                      setSaleCountryCode(isArg ? "549" : "1"); 
                      setSaleLocalPhone(isArg ? c.phone.substring(3) : c.phone);
                      setSaleName(c.name || "");
                      setIsContactSelectorOpen(false);
                      setIsRecurring(Number(c.deal_value || 0) > 0);
                    }}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold shrink-0 shadow-sm group-hover:shadow-md transition-all">
                      {(c.name || c.phone || "#")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {c.name || "Sin Nombre"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

    </div>
  )
}
