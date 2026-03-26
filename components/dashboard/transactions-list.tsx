"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { DollarSign, ArrowUpRight } from "lucide-react"
import Link from "next/link"

interface TransactionsListProps {
  recentPayments: any[]
}

const formatTimeAgo = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `Hace ${days} dias`
}

export function TransactionsList({ recentPayments }: TransactionsListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="lg:col-span-2"
    >
      {/* 1. CONTENEDOR: Exactamente las mismas clases que ActivityFeed */}
      <div className="rounded-3xl bg-card/80 dark:bg-card/60 backdrop-blur-sm shadow-xl overflow-hidden border border-border/50">
        
        {/* 2. HEADER: Mismo gradiente y bordes */}
        <div className="p-6 border-b border-border/50 bg-gradient-to-r from-muted/50 to-card">
          <div className="flex items-center gap-3">
            {/* Icono: Mismo estilo rounded-2xl y shadow, pero verde (Dinero) */}
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Últimas Transacciones</h3>
              <p className="text-sm text-muted-foreground">Pagos registrados recientemente</p>
            </div>
          </div>
        </div>

        <div className="p-0">
          {recentPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center mb-4">
                <DollarSign className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">Sin pagos registrados</p>
              <p className="text-sm text-muted-foreground mt-1">Los pagos aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recentPayments.map((payment: any, index: number) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <Link
                    href={`/dashboard/messages?id=${payment.conversation_id}`}
                    // 3. HOVER: Mismo efecto 'hover:bg-muted/30' que ActivityFeed
                    className="flex items-center justify-between p-5 hover:bg-muted/30 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Icono de Item: Estilo consistente */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold shadow-lg shrink-0">
                        <DollarSign className="h-6 w-6" />
                      </div>
                      
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {payment.contact_name || payment.contact_phone}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatTimeAgo(payment.timestamp)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Badge className="bg-gradient-to-r from-emerald-400 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-600 border-0 px-3 py-1">
                          ${payment.amount?.toLocaleString() || "0"}
                        </Badge>
                        
                        {/* Flechita de interacción igual que en ActivityFeed */}
                        <ArrowUpRight className="h-5 w-5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 group-hover:text-emerald-500 transition-all shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
