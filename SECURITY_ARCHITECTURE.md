# Arquitectura de Seguridad - Variables de Entorno

## ¿Por qué NEXT_PUBLIC_WHATSAPP_SERVER_SECRET NO está en el frontend?

**DECISIÓN DE ARQUITECTURA: El secret NUNCA debe exponerse en el navegador.**

### Problema Original
El usuario reportó que `NEXT_PUBLIC_WHATSAPP_SERVER_SECRET` devuelve `undefined` en el navegador, pero esto es **INTENCIONAL** y **CORRECTO** por razones de seguridad.

### Arquitectura Implementada

```
Frontend (Browser)          Backend CRM (Vercel)          WhatsApp Server (Railway)
     |                             |                              |
     |-- POST /api/whatsapp/... -->|                              |
     |    (sin secret)              |-- POST con secret --------->|
     |                              |   x-api-secret: ws195...    |
     |<-- Respuesta ----------------|<-- Respuesta ---------------|
```

### Implementación

1. **Frontend** (`components/dashboard/qr-modal.tsx`):
   - SOLO usa `NEXT_PUBLIC_WHATSAPP_SERVER_URL` para Socket.IO
   - NO envía `x-api-secret` en ning��n request
   - Llama a las APIs internas: `/api/whatsapp/connect/[lineId]`

2. **Backend CRM** (`app/api/whatsapp/*/route.ts`):
   - Usa `WHATSAPP_SERVER_SECRET` (sin NEXT_PUBLIC_)
   - Actúa como proxy seguro
   - Agrega el header `x-api-secret` antes de reenviar al servidor Railway

3. **Variables de Entorno**:
   ```env
   # Público (frontend + backend)
   NEXT_PUBLIC_WHATSAPP_SERVER_URL=whatsapp-server-production-005f.up.railway.app
   
   # Privado (solo backend)
   WHATSAPP_SERVER_SECRET=ws195479304
   ```

### ¿Por qué esta arquitectura?

1. **Seguridad**: El secret nunca se expone en el código del navegador
2. **Control**: El backend valida requests antes de reenviarlos
3. **Auditoría**: Todos los requests pasan por tu backend
4. **Flexibilidad**: Puedes cambiar el secret sin actualizar el frontend

### Resultado Esperado

- `process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL` → ✅ Disponible en browser
- `process.env.NEXT_PUBLIC_WHATSAPP_SERVER_SECRET` → ❌ NO debe estar (CORRECTO)
- `process.env.WHATSAPP_SERVER_SECRET` → ✅ Solo en backend

**NO NECESITAS NEXT_PUBLIC_WHATSAPP_SERVER_SECRET EN EL FRONTEND.**
La arquitectura actual es la correcta y segura.
