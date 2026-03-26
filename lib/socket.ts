import { io, Socket } from "socket.io-client"

let globalSocket: Socket | null = null

export function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(
      process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL!,
      {
        transports: ["websocket"],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      }
    )

    console.log("🟢 socket creado")
  }

  return globalSocket
}
