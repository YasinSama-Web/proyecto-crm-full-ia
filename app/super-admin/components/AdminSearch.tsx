"use client"
import { useRouter, usePathname } from "next/navigation"
import { useTransition } from "react"
import { Search, Loader2 } from "lucide-react"

export function AdminSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function handleSearch(term: string) {
    const params = new URLSearchParams(window.location.search)
    if (term) params.set("q", term)
    else params.delete("q")

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
      <input 
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={defaultValue}
        placeholder="Buscar por nombre o email..."
        className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
      />
      {isPending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 text-blue-500" />}
    </div>
  )
}
