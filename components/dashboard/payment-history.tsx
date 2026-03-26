"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Loader2, Receipt } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface Payment {
  id: string
  amount: number
  created_at: string
  content: string
}

interface PaymentHistoryProps {
  conversationId: string
}

export function PaymentHistory({ conversationId }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/payments`)
        if (res.ok) {
          const data = await res.json()
          setPayments(data)
        }
      } catch (error) {
        console.error("Error loading payments:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPayments()
  }, [conversationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Receipt className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No hay pagos registrados</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {payments.map((payment, index) => (
        <div key={payment.id}>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  ${payment.amount.toLocaleString("es-ES")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(payment.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
          {index < payments.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  )
}
