"use client"

import { useState } from "react"
import { superAdminLogin } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, ShieldAlert, Loader2 } from "lucide-react"

export default function SuperAdminLoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await superAdminLogin(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // Si hay éxito, el server action hace redirect automáticamente
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Efecto de fondo estilo Matrix/Cyber */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 border border-blue-500/20 flex items-center justify-center rounded-2xl mb-4 backdrop-blur-sm">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Core</h1>
          <p className="text-slate-400 mt-2 text-sm">Acceso restringido a Super Administradores</p>
        </div>

        <div className="bg-[#1e293b]/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Admin Email</label>
              <Input 
                name="email" 
                type="email" 
                required 
                className="bg-[#0f172a]/50 border-slate-700 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 h-12"
                placeholder="root@system.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Master Password</label>
              <Input 
                name="password" 
                type="password" 
                required 
                className="bg-[#0f172a]/50 border-slate-700 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 h-12"
                placeholder="••••••••••••"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold tracking-wide shadow-lg shadow-blue-900/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ACCEDER AL CORE"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
