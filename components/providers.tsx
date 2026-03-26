"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 🔥 LA CURA AL PARPADEO Y AL TIMEOUT DE LA BASE DE DATOS
            refetchOnWindowFocus: false, // No recargar al hacer clic en la ventana
            refetchOnMount: false,       // No recargar si el componente se re-monta
            refetchOnReconnect: false,   // No recargar al perder/recuperar internet
            retry: 1,                    // Si falla, reintentar solo 1 vez (no infinitamente)
            staleTime: 5 * 60 * 1000,    // Considerar los datos "frescos" por 5 minutos
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
