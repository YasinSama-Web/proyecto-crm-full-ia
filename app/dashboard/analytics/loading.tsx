import { Loader2 } from "lucide-react"

export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col h-[80vh] items-center justify-center space-y-4">
      <div className="relative">
        <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin relative z-10" />
      </div>
      <p className="text-slate-500 font-medium animate-pulse">Procesando millones de datos...</p>
    </div>
  )
}
