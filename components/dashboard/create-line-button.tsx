"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2, Smartphone, Lock } from "lucide-react"

// 🔥 DEFINIMOS LOS DATOS QUE RECIBIRÁ EL BOTÓN DESDE LA PÁGINA
interface CreateLineButtonProps {
  used: number;
  limit: number;
  isLimitReached: boolean;
}

export function CreateLineButton({ used, limit, isLimitReached }: CreateLineButtonProps) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState("")
  const [nombre, setNombre] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCreate = async () => {
    if (!phone.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/lineas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, nombre: nombre || `Línea ${phone}` }),
      })

      if (res.ok) {
        setOpen(false)
        setPhone("")
        setNombre("")
        router.refresh()
      }
    } catch (error) {
      console.error("Error creating line:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div tabIndex={0} className="inline-block">
              {isLimitReached ? (
                <Button disabled className="gap-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed">
                  <Lock className="w-4 h-4" />
                  Límite Alcanzado ({used}/{limit})
                </Button>
              ) : (
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 text-white rounded-xl gap-2 transition-all">
                    <Plus className="w-4 h-4" />
                    Crear línea ({used}/{limit})
                  </Button>
                </DialogTrigger>
              )}
            </div>
          </TooltipTrigger>
          
          {isLimitReached && (
            <TooltipContent className="bg-slate-900 text-white border-none shadow-xl p-3 rounded-xl z-50">
              <p className="font-semibold text-sm">Límite de líneas alcanzado</p>
              <p className="text-xs text-slate-300 mt-1">Tu plan actual y complementos permiten un máximo de {limit} línea{limit !== 1 ? 's' : ''}.</p>
              <Link href="/dashboard/billing" className="text-emerald-400 text-xs font-bold mt-2 inline-block hover:underline">
                Comprar líneas adicionales &rarr;
              </Link>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="bg-slate-900 text-white border-slate-700 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Crear nueva línea</DialogTitle>
              <DialogDescription className="text-slate-400">Crea una nueva línea de WhatsApp para conectar</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-slate-300">Número de teléfono *</Label>
            <Input 
              id="phone" 
              placeholder="5491112345678" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-slate-300">Nombre (opcional)</Label>
            <Input
              id="nombre"
              placeholder="Ej: Ventas, Soporte, etc."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
            />
          </div>
        </div>
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800 rounded-xl bg-transparent">
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={loading || !phone.trim()} className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear línea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
