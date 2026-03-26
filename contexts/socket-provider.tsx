"use client"

import React, { createContext, useContext } from "react"
import { useSocket } from "@/hooks/use-socket" // Reutilizamos el hook simple
import type { Socket } from "socket.io-client"

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export function SocketProvider({ children }: { children: React.ReactNode }) {
  // Usamos el hook que ya sabemos que funciona
  const { socket, isConnected } = useSocket()

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

// Este hook es opcional, por si algún componente necesita consumir el contexto en vez del hook directo
export function useSocketContext() {
  return useContext(SocketContext)
}
