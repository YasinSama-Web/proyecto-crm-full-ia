"use client"

import { useState, useEffect } from "react"
import { CreditCard, DollarSign, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { motion } from "framer-motion"

// --- TIPOS ---
interface Payment {
  id: string
  amount: number
  created_at: string | Date | null // 🔥 Permitimos null por seguridad
  status?: string
}

interface ContactPaymentWidgetProps {
  conversationId: string
  contactPhone?: string
}

export function ContactPaymentWidget({ conversationId, contactPhone }: ContactPaymentWidgetProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // --- FUNCIÓN DE SEGURIDAD PARA FECHAS (Aquí estaba el error) ---
  const safeFormatDate = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return "Fecha desconocida"
    try {
      const date = new Date(dateInput)
      // Verificar si es una fecha válida
      if (isNaN(date.getTime())) return "Fecha inválida"
      return formatDistanceToNow(date, { addSuffix: true, locale: es })
    } catch (e) {
      return "Hace un momento"
    }
  }

  const safeLocaleDate = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return "-"
    try {
      const date = new Date(dateInput)
      if (isNaN(date.getTime())) return "-"
      return date.toLocaleDateString("es-ES", {
        weekday: 'short', day: "numeric", month: "short", hour: '2-digit', minute:'2-digit'
      })
    } catch (e) {
      return "-"
    }
  }

useEffect(() => {
    // Si no hay ID ni teléfono, no hacemos nada
    if (!conversationId && !contactPhone) return

    const fetchPayments = async () => {
      setLoading(true)
      try {
        const timestamp = new Date().getTime()
        
        // 🔥 TRUCO FINAL: Enviamos el teléfono en la URL si lo tenemos
        let url = `/api/conversations/${conversationId}/payments?_t=${timestamp}`
        if (contactPhone) {
            url += `&phone=${encodeURIComponent(contactPhone)}`
        }

        const res = await fetch(url, {
            headers: { 'Pragma': 'no-cache' }
        })

        if (res.ok) {
          const data = await res.json()
          setPayments(Array.isArray(data) ? data : [])
        } else {
          setPayments([])
        }
      } catch (error) {
        console.error("Error cargando pagos:", error)
        setPayments([])
      } finally {
        setLoading(false)
      }
    }

    fetchPayments()
  }, [conversationId, contactPhone])

  const totalAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const lastPayment = payments[0]

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <CreditCard className="h-3 w-3" /> Facturación
      </h4>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm overflow-hidden"
      >
        {/* Header Widget */}
        <div className="p-3 border-b border-emerald-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-600 font-medium uppercase">Total Cobrado</p>
              <p className="text-lg font-bold text-emerald-700 leading-none">
                ${totalAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Body Widget */}
        <div className="p-3 bg-white/50">
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-2 animate-pulse">Cargando...</p>
          ) : payments.length > 0 && lastPayment ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Último pago:</span>
                <span className="font-medium text-emerald-600">+${lastPayment.amount}</span>
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                 {/* 🔥 USO SEGURO DE FECHA */}
                 {safeFormatDate(lastPayment.created_at)}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                onClick={() => setShowModal(true)}
              >
                Ver historial ({payments.length}) <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-slate-400 mb-2">Sin pagos registrados</p>
              <Button variant="outline" size="sm" className="h-7 text-xs w-full bg-white">
                Registrar Cobro
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* --- MODAL (Glass) --- */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-emerald-100/50 shadow-2xl rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <div className="p-2 bg-emerald-100 rounded-full">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              Historial de Pagos
            </DialogTitle>
            <DialogDescription>
              Transacciones asociadas a este chat.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[300px] mt-2 pr-4">
            <div className="space-y-3">
             {payments.map((p) => {
                // 🔥 DETECTAMOS EL ORIGEN DEL PAGO
                const isManual = p.processed_by_ai !== true; 
                const paymentTitle = isManual ? "Pago Manual" : "Pago Verificado IA ✨";

                return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-emerald-50/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      {/* 🔥 MOSTRAMOS EL TÍTULO DINÁMICO */}
                      <p className="text-sm font-medium text-slate-700">{paymentTitle}</p>
                      {p.content && p.content.includes(':') && (
                        <p className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit my-0.5 truncate max-w-[180px]">
                          {p.content.split(':')[1].trim()} 
                        </p>
                      )}
                      <p className="text-xs text-slate-400 capitalize">
                        {safeLocaleDate(p.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-emerald-600">+${p.amount.toLocaleString()}</span>
                    <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 bg-emerald-50 text-emerald-700 border-emerald-200">
                      Aprobado
                    </Badge>
                  </div>
                </div>
              )})}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t border-slate-100 pt-4 mt-2">
            <div className="w-full flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Acumulado</span>
              <span className="text-2xl font-bold text-emerald-600">
                ${totalAmount.toLocaleString()}
              </span>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
