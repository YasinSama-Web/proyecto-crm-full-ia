"use client"

import { useEffect, useState } from "react"
import { getSocket } from "@/lib/socket"
import type { Socket } from "socket.io-client"

export function useSocket() {
  // Usamos el singleton para asegurar que sea la misma conexión siempre
  const [socket] = useState<Socket>(() => getSocket())
  const [isConnected, setIsConnected] = useState(socket.connected)

  useEffect(() => {
    function onConnect() {
      setIsConnected(true)
    }

    function onDisconnect() {
      setIsConnected(false)
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)

    // Sincronizar estado inicial
    setIsConnected(socket.connected)

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
    }
  }, [socket])

  return { socket, isConnected }
}
