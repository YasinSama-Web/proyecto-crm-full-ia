"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, CreditCard, Wallet } from "lucide-react"

interface IACreditsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PACKS = [
  { id: "pack_s", name: "Pack S", amount: 500, price: 15000, popular: false },
  { id: "pack_m", name: "Pack M", amount: 2000, price: 50000, popular: true },
  { id: "pack_l", name: "Pack L", amount: 5000, price: 100000, popular: false },
]

export function IACreditsModal({ open, onOpenChange }: IACreditsModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedPack, setSelectedPack] = useState<string>("pack_m")
  const [paymentMethod, setPaymentMethod] = useState<"mp" | "usdt">("mp")
  const [isLoading, setIsLoading] = useState(false)

  const handleNext = () => setStep(2)
  const handleBack = () => setStep(1)

  const handleCheckout = async () => {
    setIsLoading(true)
    try {
      if (paymentMethod === "mp") {
        // Llamada a tu API para generar la preferencia de MP
        const res = await fetch("/api/billing/mp-ia-credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packId: selectedPack })
        })
        const data = await res.json()
        if (data.url) window.location.href = data.url // Redirige a MP
      } else {
        // Flujo USDT: Redirigir a WhatsApp o a una pantalla de instrucciones
        window.open("https://wa.me/TUNUMERO?text=Hola,%20quiero%20pagar%20créditos%20IA%20con%20USDT", "_blank")
      }
    } catch (error) {
      console.error("Error procesando pago:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Resetea el modal al cerrarse
  const onOpenChangeWrapper = (isOpen: boolean) => {
    if (!isOpen) setTimeout(() => setStep(1), 300)
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeWrapper}>
      <DialogContent className="sm:max-w-[450px]">
        
        {step === 1 && (
          <>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl text-center flex items-center justify-center gap-2">
                🚀 Recarga de Créditos
              </DialogTitle>
              <p className="text-center text-sm text-muted-foreground mt-2">
                Los créditos extra <strong>no caducan</strong> y se usan automáticamente cuando tu plan mensual llega a cero.
              </p>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              {PACKS.map((pack) => (
                <div 
                  key={pack.id}
                  onClick={() => setSelectedPack(pack.id)}
                  className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${selectedPack === pack.id 
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-900/10" 
                      : "border-border hover:border-violet-200"
                    }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-3 right-4 bg-violet-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      POPULAR
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${selectedPack === pack.id ? "border-violet-500" : "border-slate-300"}
                    `}>
                      {selectedPack === pack.id && <div className="w-2.5 h-2.5 bg-violet-500 rounded-full" />}
                    </div>
                    <div>
                      <span className="font-bold">{pack.name}</span>
                      <span className="ml-2 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full text-slate-600 dark:text-slate-300">
                        {pack.amount} msj
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-violet-600 dark:text-violet-400">
                    ${pack.price.toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleNext} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                Elegir Método de Pago
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl text-center">
                Elige tu método de pago
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div 
                onClick={() => setPaymentMethod("mp")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex gap-3
                  ${paymentMethod === "mp" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10" : "border-border"}`}
              >
                <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                  ${paymentMethod === "mp" ? "border-blue-500" : "border-slate-300"}`}>
                  {paymentMethod === "mp" && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" /> Mercado Pago
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Pago automático e instantáneo. Recibes tus créditos enseguida.
                  </p>
                </div>
              </div>

              <div 
                onClick={() => setPaymentMethod("usdt")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex gap-3
                  ${paymentMethod === "usdt" ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10" : "border-border"}`}
              >
                <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                  ${paymentMethod === "usdt" ? "border-amber-500" : "border-slate-300"}`}>
                  {paymentMethod === "usdt" && <div className="w-2 h-2 bg-amber-500 rounded-full" />}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-500" /> USDT / Cripto (Manual)
                  </div>
                  <p className="text-sm text-amber-600 font-medium mt-1 text-[13px]">
                    ⚠️ Requiere envío manual de comprobante.
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5 text-[13px]">
                    Tus créditos se cargarán una vez que el equipo valide el pago.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                Atrás
              </Button>
              <Button 
                onClick={handleCheckout} 
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? "Procesando..." : "Continuar"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
