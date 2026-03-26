import { Loader2, Sparkles } from "lucide-react"

interface GlobalLoaderProps {
  title?: string;
  subtitle?: string;
}

export function GlobalLoader({ 
  title = "Sincronizando Entorno", 
  subtitle = "Conectando módulos..." 
}: GlobalLoaderProps) {
  return (
    <div className="flex flex-col h-[80vh] w-full items-center justify-center space-y-8 animate-in fade-in duration-500">
      
      {/* 🔮 EL NÚCLEO ANIMADO */}
      <div className="relative flex items-center justify-center">
        {/* Anillo exterior punteado girando lento */}
        <div className="absolute w-24 h-24 border-[3px] border-dashed border-emerald-500/30 rounded-full animate-[spin_4s_linear_infinite]" />
        
        {/* Anillo interior girando en sentido contrario */}
        <div className="absolute w-16 h-16 border-[3px] border-emerald-400/20 rounded-full border-t-emerald-500 animate-[spin_2s_linear_infinite_reverse]" />
        
        {/* Resplandor pulsante */}
        <div className="absolute w-12 h-12 bg-emerald-500/40 rounded-full blur-xl animate-pulse" />
        
        {/* Centro sólido con el icono */}
        <div className="relative bg-background p-3.5 rounded-full border border-emerald-100 dark:border-emerald-900/50 shadow-2xl shadow-emerald-500/20">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </div>
      
      {/* ✍️ TEXTO CON ESTILO */}
      <div className="flex flex-col items-center gap-2">
        <h3 className="text-xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent animate-pulse tracking-tight">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {subtitle}
          </span>
        </div>
      </div>
    </div>
  )
}
