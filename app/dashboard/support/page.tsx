"use client"

import { Suspense, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { 
  Search, Video, Megaphone, QrCode, MessageCircle, Mail, ExternalLink, Play, HelpCircle, ChevronRight, Zap, Loader2, Bug 
} from "lucide-react"
import Swal from "sweetalert2"
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion"
import { Crisp } from "crisp-sdk-web"

// Importamos componentes del Modal (Dialog)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// --- COMPONENTE TILT ---
function TiltCard({ children, className = "", onClick }: { children: React.ReactNode; className?: string, onClick?: () => void }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  const rotateX = useTransform(y, [-100, 100], [1.5, -1.5])
  const rotateY = useTransform(x, [-100, 100], [-1.5, 1.5])
  
  const springRotateX = useSpring(rotateX, { stiffness: 200, damping: 30 })
  const springRotateY = useSpring(rotateY, { stiffness: 200, damping: 30 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set(e.clientX - centerX)
    y.set(e.clientY - centerY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      style={{ rotateX: springRotateX, rotateY: springRotateY, transformPerspective: 2500 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function SupportContent() {
  const [searchQuery, setSearchQuery] = useState("")
  
  // Estados para el Modal de Reporte
  const [isBugModalOpen, setIsBugModalOpen] = useState(false)
  const [bugMessage, setBugMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  // --- 1. ABRIR CHAT DE CRISP ---
  const handleOpenChat = () => {
    try {
      Crisp.chat.open()
      Crisp.chat.show()
    } catch (e) {
      console.error("Error Crisp", e)
      Swal.fire({
         title: "Error",
         text: "No se pudo cargar el chat. Intenta recargar la página.",
         icon: "error"
      })
    }
  }

  const handleWhatsAppSupport = () => {
    window.open("https://wa.me/5492604500369", "_blank")
  }

  // --- 2. ABRIR MODAL DE TICKET ---
  const handleOpenTicket = () => {
    setIsBugModalOpen(true)
  }

  // --- 3. ENVIAR REPORTE (Simulación) ---
  const handleSendBugReport = async () => {
    if (!bugMessage.trim()) return

    setIsSending(true)

    try {
      // AQUÍ IRÍA TU FETCH A LA API DE EMAIL (ej: /api/send-email)
     await fetch('/api/send-email', {
  method: 'POST',
  body: JSON.stringify({ message: bugMessage, userEmail: "cursosluckylabmarketing@gmail.com" })
})

      setIsBugModalOpen(false)
      setBugMessage("")

      Swal.fire({
        title: '¡Ticket Enviado!',
        text: 'Hemos recibido tu reporte. Nuestro equipo técnico lo revisará y te contactaremos por email.',
        icon: 'success',
        confirmButtonColor: '#3b82f6',
      })

    } catch (error) {
      Swal.fire("Error", "No se pudo enviar el reporte.", "error")
    } finally {
      setIsSending(false)
    }
  }

  const tutorials = [
    {
      title: "Configurar CAPI y Pixeles",
      description: "Aprende a conectar Meta Ads con tu CRM",
      icon: Video,
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/20",
    },
    {
      title: "Crear Campaña Masiva",
      description: "Envía mensajes a múltiples contactos",
      icon: Megaphone,
      gradient: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/20",
    },
    {
      title: "Conectar WhatsApp con QR",
      description: "Vincula tu línea en menos de 1 minuto",
      icon: QrCode,
      gradient: "from-emerald-400 to-green-600",
      shadow: "shadow-emerald-500/20",
    },
  ]

  const faqs = [
    {
      question: "¿Qué pasa si se vence mi prueba gratuita?",
      answer: "Al vencerse la prueba gratuita de 7 días, deberás elegir un plan de pago. Tus datos se mantendrán seguros.",
    },
    {
      question: "¿Cómo evito que WhatsApp bloquee mi número?",
      answer: "No envíes más de 100 mensajes por hora, usa plantillas aprobadas y evita palabras spam.",
    },
    {
      question: "¿Puedo cambiar mi plan en cualquier momento?",
      answer: "Sí, puedes mejorar o reducir tu plan desde Suscripción. Los cambios son inmediatos.",
    },
    {
      question: "¿Los mensajes se guardan en la base de datos?",
      answer: "Sí, todos los mensajes se almacenan de forma segura y puedes acceder al historial completo.",
    },
    {
      question: "¿Puedo agregar más usuarios a mi cuenta?",
      answer: "Sí, desde la sección Equipos puedes agregar agentes con diferentes niveles de permisos.",
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto space-y-12"
      >
        
        {/* --- HERO HEADER --- */}
        <motion.div variants={itemVariants} className="text-center space-y-6 pt-4">
          <div className="flex justify-center">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-800 shadow-xl">
                    <HelpCircle className="h-10 w-10 text-blue-500" />
                </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-white">
              Centro de Ayuda <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500">Pro</span>
            </h1>
            <p className="text-lg text-slate-500 dark:text-gray-400 max-w-2xl mx-auto">
              Todo lo que necesitas para dominar tu CRM. Documentación, tutoriales y soporte directo.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative group">
            <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-xl group-hover:bg-blue-500/10 transition-all duration-500" />
            <div className="relative">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <Input
                placeholder="¿Qué estás buscando hoy?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-14 text-lg bg-white/80 dark:bg-[#1e293b]/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-gray-200 placeholder:text-slate-400 rounded-2xl focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* --- SECCIÓN 1: ACADEMIA --- */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Academia</h2>
                <p className="text-slate-500 dark:text-gray-400 text-sm">Aprende rápido con guías paso a paso</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {tutorials.map((tutorial, index) => {
              const Icon = tutorial.icon
              return (
                <TiltCard
                  key={index}
                  className="group h-full cursor-pointer"
                >
                  <div className="relative h-full flex flex-col p-6 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-800 rounded-3xl hover:border-blue-200 dark:hover:border-blue-800 transition-all shadow-lg hover:shadow-xl hover:shadow-blue-500/5">
                    
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${tutorial.gradient} flex items-center justify-center mb-6 shadow-md ${tutorial.shadow} text-white`}>
                        <Icon className="h-7 w-7" />
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{tutorial.title}</h3>
                    <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed mb-6 flex-1">
                        {tutorial.description}
                    </p>

                    <Button 
                        variant="ghost" 
                        className="w-full justify-between bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-gray-300 hover:text-blue-600 rounded-xl transition-all"
                        onClick={() => Swal.fire({ 
                            title: tutorial.title, 
                            text: "Tutorial disponible próximamente en video.", 
                            icon: "info",
                            background: document.documentElement.classList.contains("dark") ? "#1e293b" : "#fff",
                            color: document.documentElement.classList.contains("dark") ? "#fff" : "#000"
                        })}
                    >
                        <span className="flex items-center gap-2 font-medium"><Play className="h-4 w-4 fill-current" /> Ver ahora</span>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                    </Button>
                  </div>
                </TiltCard>
              )
            })}
          </div>
        </motion.div>

        {/* --- SECCIÓN 2: CONTACTO DIRECTO --- */}
        <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-3">
            {/* WhatsApp Premium Card */}
            <TiltCard className="md:col-span-1 h-full" onClick={handleWhatsAppSupport}>
                 <div className="h-full p-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-xl shadow-emerald-500/20 cursor-pointer relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4 backdrop-blur-sm">
                            <MessageCircle className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-lg font-bold mb-1">WhatsApp Soporte</h3>
                        <p className="text-emerald-50 text-sm mb-6 flex-1">Habla directo con un humano de nuestro equipo.</p>
                        
                        <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 border-0 shadow-sm rounded-xl font-semibold">
                            Iniciar Chat <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                 </div>
            </TiltCard>

            {/* Chat en Vivo & Reportar Bug */}
            <div className="md:col-span-2 grid gap-6 md:grid-cols-2">
                
                {/* 1. CARD CHAT EN VIVO (CRISP) */}
                <TiltCard className="h-full" onClick={handleOpenChat}>
                    <div className="h-full p-6 rounded-3xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-800 shadow-lg hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer flex flex-col">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 text-blue-500 dark:text-blue-400">
                            <MessageCircle className="h-5 w-5" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-white">Chat en Vivo</h3>
                        <p className="text-slate-500 dark:text-gray-400 text-sm mb-4 flex-1">Respuesta en tiempo real desde el widget.</p>
                        <Button variant="outline" className="w-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl bg-transparent">
                            Abrir Widget
                        </Button>
                    </div>
                </TiltCard>

                {/* 2. CARD REPORTAR BUG (MODAL) */}
                <TiltCard className="h-full" onClick={handleOpenTicket}>
                    <div className="h-full p-6 rounded-3xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-800 shadow-lg hover:shadow-xl hover:shadow-orange-500/5 transition-all cursor-pointer flex flex-col">
                        <div className="h-10 w-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4 text-orange-500 dark:text-orange-400">
                            <Bug className="h-5 w-5" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-white">Reportar Bug</h3>
                        <p className="text-slate-500 dark:text-gray-400 text-sm mb-4 flex-1">¿Algo no funciona? Avísanos.</p>
                        <Button variant="outline" className="w-full border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl bg-transparent">
                            Crear Ticket
                        </Button>
                    </div>
                </TiltCard>
            </div>
        </motion.div>

        {/* --- SECCIÓN 3: FAQ --- */}
        <motion.div variants={itemVariants} className="pb-12">
           <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Preguntas Frecuentes</h2>
              <p className="text-slate-500 dark:text-gray-400">Respuestas rápidas</p>
           </div>

           <div className="bg-white/50 dark:bg-[#1e293b]/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <Accordion type="single" collapsible className="w-full space-y-3">
                {faqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`} 
                    className="border-b-0 bg-white dark:bg-[#111b21] rounded-2xl px-4 border border-slate-100 dark:border-slate-800 shadow-sm data-[state=open]:shadow-md transition-all"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-4 text-slate-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <span className="font-semibold text-base">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-slate-500 dark:text-gray-400 leading-relaxed text-sm">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
           </div>
        </motion.div>

      </motion.div>

      {/* --- MODAL (DIALOG) DE REPORTE --- */}
      <Dialog open={isBugModalOpen} onOpenChange={setIsBugModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1e293b] border-none text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>Reportar Bug</DialogTitle>
            <DialogDescription>
              Describe el problema que encontraste. Te contactaremos por email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              value={bugMessage}
              onChange={(e) => setBugMessage(e.target.value)}
              placeholder="Describe el problema aquí..."
              className="min-h-[120px] bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 resize-none focus-visible:ring-blue-500"
            />
          </div>
          
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setIsBugModalOpen(false)}
              className="dark:bg-slate-700 dark:text-white"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleSendBugReport}
              disabled={!bugMessage.trim() || isSending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                "Enviar Ticket"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SupportPage() {
  return (
    <Suspense fallback={null}>
      <SupportContent />
    </Suspense>
  )
}
