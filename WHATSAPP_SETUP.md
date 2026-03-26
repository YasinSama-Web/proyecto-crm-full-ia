# Configuración del Servidor WhatsApp

Este CRM se integra con un servidor Baileys externo para conectar WhatsApp.

## Variables de Entorno Configuradas

```bash
WHATSAPP_SERVER_URL=whatsapp-server-production-005f.up.railway.app
WHATSAPP_SERVER_SECRET=ws195479304
```

## Arquitectura

1. **CRM (Next.js)** - Esta aplicación
   - Interfaz web para gestionar conversaciones
   - Guarda mensajes en base de datos Neon
   - Envía comandos al servidor Baileys vía API

2. **Servidor Baileys (Railway)** - `whatsapp-server-production-005f.up.railway.app`
   - Mantiene conexión persistente con WhatsApp
   - Genera códigos QR para autenticación
   - Recibe y envía mensajes de WhatsApp
   - Notifica al CRM vía webhook cuando llegan mensajes

## Endpoints del Servidor Baileys

El servidor debe implementar estos endpoints:

### POST `/connect/:lineId`
Inicia conexión para una línea de WhatsApp.

**Headers:**
```
Authorization: Bearer ws195479304
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qr": "2@abc123...",  // QR code string
    "status": "QR_READY"   // or "CONNECTED", "PENDING"
  }
}
```

### GET `/status/:lineId`
Obtiene estado de conexión de una línea.

**Response:**
```json
{
  "status": "CONNECTED",
  "phoneNumber": "+1234567890"
}
```

### POST `/send`
Envía un mensaje de WhatsApp.

**Body:**
```json
{
  "lineId": 1,
  "phoneNumber": "+1234567890",
  "message": "Hola, ¿cómo estás?"
}
```

### POST `/disconnect/:lineId`
Desconecta una línea de WhatsApp.

## Webhook del CRM

El servidor Baileys debe enviar mensajes entrantes a:

**URL:** `https://tu-dominio.vercel.app/api/webhook/whatsapp`

**Method:** `POST`

**Headers:**
```
Authorization: Bearer ws195479304
Content-Type: application/json
```

**Body:**
```json
{
  "lineId": 1,
  "phoneNumber": "+1234567890",
  "contactName": "Juan Pérez",
  "message": "Hola, necesito ayuda",
  "messageType": "texto",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### PATCH `/api/webhook/whatsapp`
Actualiza estado de línea.

**Body:**
```json
{
  "lineId": 1,
  "status": "CONECTADA",
  "phoneNumber": "+1234567890"
}
```

## Flujo de Trabajo

### 1. Conectar WhatsApp
1. Usuario hace clic en "Conectar" en una línea
2. CRM llama a `POST https://whatsapp-server-production-005f.up.railway.app/connect/:lineId`
3. Servidor responde con código QR
4. Usuario escanea QR con WhatsApp
5. Servidor notifica al CRM vía `PATCH /api/webhook/whatsapp` que está conectado

### 2. Recibir Mensajes
1. Servidor Baileys recibe mensaje de WhatsApp
2. Servidor envía el mensaje a `POST /api/webhook/whatsapp`
3. CRM guarda el mensaje en la base de datos
4. Usuario ve el mensaje en la interfaz de "Mensajes"

### 3. Enviar Mensajes
1. Usuario escribe mensaje en el chat
2. CRM guarda mensaje en DB y llama a `POST /send` del servidor
3. Servidor envía el mensaje vía WhatsApp
4. Mensaje aparece como "enviado" en la interfaz

## Código Ejemplo del Servidor Baileys

```typescript
import express from 'express'
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'

const app = express()
app.use(express.json())

const sessions = new Map() // lineId -> socket

// Middleware de autenticación
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token !== process.env.SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// Conectar línea
app.post('/connect/:lineId', authenticate, async (req, res) => {
  const { lineId } = req.params
  
  const { state, saveCreds } = await useMultiFileAuthState(`./auth/${lineId}`)
  const sock = makeWASocket({ auth: state })
  
  sock.ev.on('creds.update', saveCreds)
  
  sock.ev.on('connection.update', async (update) => {
    const { qr, connection } = update
    
    if (qr) {
      res.json({ success: true, data: { qr, status: 'QR_READY' } })
    }
    
    if (connection === 'open') {
      sessions.set(lineId, sock)
      // Notificar al CRM
      await fetch(`${process.env.CRM_URL}/api/webhook/whatsapp`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${process.env.SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lineId, status: 'CONECTADA' })
      })
    }
  })
  
  // Recibir mensajes
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      
      await fetch(`${process.env.CRM_URL}/api/webhook/whatsapp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lineId,
          phoneNumber: msg.key.remoteJid,
          contactName: msg.pushName,
          message: msg.message?.conversation || msg.message?.extendedTextMessage?.text,
          messageType: 'texto'
        })
      })
    }
  })
})

// Enviar mensaje
app.post('/send', authenticate, async (req, res) => {
  const { lineId, phoneNumber, message } = req.body
  const sock = sessions.get(lineId.toString())
  
  if (!sock) {
    return res.status(404).json({ error: 'Line not connected' })
  }
  
  await sock.sendMessage(phoneNumber, { text: message })
  res.json({ success: true })
})

app.listen(3000)
```

## Notas de Seguridad

- El secreto `ws195479304` autentica todas las comunicaciones
- Usa HTTPS en producción
- Mantén el servidor Baileys en una red segura
- Rota el secreto periódicamente
