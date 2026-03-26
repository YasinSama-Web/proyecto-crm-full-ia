import { Check, CheckCheck, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

// Asegúrate de que tu backend devuelva estos estados. 
// Usualmente: 'pending', 'sent' (1 tick), 'delivered' (2 ticks), 'read' (2 azules), 'error'
type MessageStatusType = "pending" | "sent" | "delivered" | "read" | "error"

export function MessageStatus({ status, className }: { status: string, className?: string }) {
  if (status === "error") {
    return <AlertCircle className={cn("h-3 w-3 text-red-500", className)} />
  }

  if (status === "pending") {
    return <Clock className={cn("h-3 w-3 text-slate-400", className)} />
  }

  if (status === "sent") {
    return <Check className={cn("h-3 w-3 text-slate-400", className)} />
  }

  if (status === "delivered") {
    return <CheckCheck className={cn("h-3 w-3 text-slate-400", className)} />
  }

  if (status === "read") {
    return <CheckCheck className={cn("h-3 w-3 text-blue-500", className)} />
  }

  return null
}
