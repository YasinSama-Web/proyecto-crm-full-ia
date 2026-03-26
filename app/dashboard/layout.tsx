import type { ReactNode } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { ConnectionMonitor } from "@/components/dashboard/connection-monitor"
import { Providers } from "@/components/providers"
import { SocketProvider } from "@/contexts/socket-provider" 
import { NotificationProvider } from "@/contexts/notification-context"
import { NotificationManager } from "@/components/notification-manager"
import { AttentionMonitor } from "@/components/attention-monitor"
import { ClientBillingGuard } from "@/components/billing/billing-guard"
import { SileoThemeProvider } from "@/components/sileo-provider"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  
  return (
    <SocketProvider>
      <NotificationProvider>
        <NotificationManager/>

        {/* 👮‍♂️ EL GUARDIÁN CLIENTE ENVUELVE AL CRM */}
        <ClientBillingGuard>
          <div className="flex h-screen w-full bg-background text-foreground overflow-hidden transition-colors duration-300">
            <ConnectionMonitor />
            <DashboardSidebar />
            <div className="flex flex-1 flex-col h-full min-w-0">
              
              <div className="w-full z-40 bg-transparent flex-shrink-0"> 
                 {/* 🔥 UNA SOLA VEZ AQUÍ (Sin props) */}
                 <DashboardHeader />
              </div>

              <main className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
                 <Providers>
                  <AttentionMonitor />
                  <SileoThemeProvider />
                  {children}
                 </Providers>
              </main>

            </div>
          </div>
        </ClientBillingGuard>

      </NotificationProvider>
    </SocketProvider>
  )
}
