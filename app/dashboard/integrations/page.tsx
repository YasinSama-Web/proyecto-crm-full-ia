"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, Zap, Link as LinkIcon, Lock, Cloud, Calendar, Database, Mail, BarChart, CheckCircle2, Lightbulb, ArrowRight, MessageSquare, Plus, FileSpreadsheet, Receipt } from "lucide-react"
import Swal from "sweetalert2"
import { Badge } from "@/components/ui/badge"
import { guardarWebhookUrl, obtenerWebhooksActivos } from "./actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const INTEGRATIONS = [
  // CONECTORES (PUENTES)
  { id: "make", name: "Make (Integromat)", domain: "make.com", category: "Conectores", type: "bridge", desc: "Puente visual para automatizar flujos de trabajo.", connected: false, icon: <Zap className="text-purple-500 w-8 h-8" /> },
  { id: "zapier", name: "Zapier", domain: "zapier.com", category: "Conectores", type: "bridge", desc: "El puente más popular para más de 5,000 aplicaciones.", connected: false, icon: <Zap className="text-orange-500 w-8 h-8" /> },
  { id: "webhooks", name: "Webhooks", domain: "json.org", category: "Conectores", type: "bridge", desc: "Conexión técnica universal en tiempo real.", connected: false, icon: <LinkIcon className="text-blue-500 w-8 h-8" /> },

  // Tiendas online
  { id: "shopify", name: "Shopify", domain: "shopify.com", category: "Comercio/Dropshiping", type: "make", desc: "Recupera carritos abandonados automáticamente por WhatsApp.", connected: false, icon: <Database className="text-green-500 w-8 h-8" /> },
  { id: "tiendanube", name: "Tiendanube", domain: "tiendanube.com", category: "Comercio/Dropshiping", type: "make", desc: "Sincroniza tus clientes y pedidos de e-commerce.", connected: false, icon: <Cloud className="text-blue-500 w-8 h-8" /> },
  { id: "Wix", name: "Wix", domain: "wix.com", category: "Comercio/Dropshiping", type: "make", desc: "Sincroniza tus clientes y pedidos de e-commerce.", connected: false, icon: <Cloud className="text-blue-500 w-8 h-8" /> },
  { id: "prestashop", name: "Prestashop", domain: "prestashop.com", category: "Comercio/Dropshiping", type: "make", desc: "Sincroniza tus clientes y pedidos de e-commerce.", connected: false, icon: <Cloud className="text-blue-500 w-8 h-8" /> },
  { id: "bigcommerce", name: "BigCommerce", domain: "bigcommerce.com", category: "Comercio/Dropshiping", type: "make", desc: "Sincroniza tus clientes y pedidos de e-commerce.", connected: false, icon: <Cloud className="text-blue-500 w-8 h-8" /> },
  
  // CRMs
  { id: "hubspot", name: "HubSpot", domain: "hubspot.com", category: "CRM", type: "zapier", desc: "Envía los contactos y ventas de WhatsApp directo a tu embudo.", connected: false, icon: <Database className="text-orange-600 w-8 h-8" /> },
  { id: "salesforce", name: "Salesforce", domain: "salesforce.com", category: "CRM", type: "coming_soon", desc: "Integración corporativa para empresas Enterprise.", connected: false, icon: <Cloud className="text-blue-400 w-8 h-8" /> },
  { id: "pipedrive", name: "Pipedrive", domain: "pipedrive.com", category: "CRM", type: "zapier", desc: "Actualiza la etapa de tus negocios automáticamente.", connected: false, icon: <BarChart className="text-green-500 w-8 h-8" /> },
  { id: "zoho", name: "Zoho CRM", domain: "zoho.com", category: "CRM", type: "zapier", desc: "Sincroniza tu base de datos centralizada.", connected: false, icon: <Database className="text-red-500 w-8 h-8" /> },

  // MARKETING & LEADS
  { id: "meta", name: "Facebook Lead Ads", domain: "facebook.com", category: "Marketing", type: "inbound", desc: "Recibe clientes de Instagram y Facebook directo al chat.", connected: false, icon: <Cloud className="text-blue-600 w-8 h-8" /> },
  { id: "tiktok", name: "TikTok Leads", domain: "tiktok.com", category: "Marketing", type: "coming_soon", desc: "Captura la nueva generación de clientes.", connected: false, icon: <Database className="text-black dark:text-white w-8 h-8" /> },

  // EMAIL
  { id: "mailchimp", name: "Mailchimp", domain: "mailchimp.com", category: "Email", type: "zapier", desc: "Cuando alguien te compre, añádelo a tu lista VIP.", connected: false, icon: <Mail className="text-yellow-500 w-8 h-8" /> },
  { id: "brevo", name: "Brevo", domain: "brevo.com", category: "Email", type: "zapier", desc: "Automatiza emails de bienvenida al vender.", connected: false, icon: <Mail className="text-blue-500 w-8 h-8" /> },

  // PRODUCTIVIDAD
  { id: "gcalendar", name: "Google Calendar", domain: "calendar.google.com", category: "Productividad", type: "native", desc: "Agenda recordatorios de seguimiento a clientes.", connected: false, icon: <Calendar className="text-blue-500 w-8 h-8" /> },
  { id: "slack", name: "Slack", domain: "slack.com", category: "Productividad", type: "zapier", desc: "Recibe alertas en tu equipo al aprobar un pago alto.", connected: false, icon: <Cloud className="text-purple-600 w-8 h-8" /> },
  { id: "calendly", name: "Calendly", domain: "calendly.com", category: "Productividad", type: "make", desc: "Agrega automáticamente las citas de tus clientes a tu calendario de tareas.", connected: false, icon: <Calendar className="text-blue-600 w-8 h-8" /> },
  // ARCHIVOS Y DATOS
  { id: "gsheets", name: "Google Sheets", domain: "google.com", category: "Archivos", type: "zapier", desc: "Registra cada venta aprobada en una fila de Excel.", connected: false, icon: <FileSpreadsheet className="text-emerald-500 w-8 h-8" /> },
  { id: "gdrive", name: "Google Drive", domain: "drive.google.com", category: "Archivos", type: "zapier", desc: "Guarda la foto del comprobante en una carpeta compartida.", connected: false, icon: <Cloud className="text-green-500 w-8 h-8" /> },
  { id: "dropbox", name: "Dropbox", domain: "dropbox.com", category: "Archivos", type: "zapier", desc: "Respaldo automático de archivos adjuntos.", connected: false, icon: <Cloud className="text-blue-600 w-8 h-8" /> },
  
  // FINANZAS (FACTURACIÓN AFIP)
  { id: "facturante", name: "Facturante (AFIP)", domain: "facturante.com", category: "Finanzas", type: "zapier", desc: "Emite facturas y tickets fiscales automáticamente al cobrar.", connected: false, icon: <Receipt className="text-indigo-500 w-8 h-8" /> },
];

const CATEGORIES = ["Todos", "Conectores", "CRM", "Marketing", "Comercio/Dropshiping", "Email", "Productividad", "Archivos", "Finanzas"]

export default function IntegrationsMarketplace() {
  const [activeCategory, setActiveCategory] = useState("Todos")
  const [searchQuery, setSearchQuery] = useState("")
  const [integrations, setIntegrations] = useState(INTEGRATIONS)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<typeof INTEGRATIONS[0] | null>(null)
  const [webhookUrl, setWebhookUrl] = useState("")

  useEffect(() => {
    obtenerWebhooksActivos().then(res => {
      if (res.success && res.conectadas.length > 0) {
        setIntegrations(prev => prev.map(app => 
          // Si el ID de la app está en la base de datos, la encendemos visualmente
          res.conectadas.includes(app.id) ? { ...app, connected: true } : app
        ));
      }
    });
  }, []);

  // 🔥 Lógica de "Puentes Activos": Si hay al menos una app normal conectada, los puentes se ponen verdes.
  const isAnyAppConnected = integrations.some(i => i.type !== 'bridge' && i.connected);

  const filteredIntegrations = integrations.filter(i => {
    // Si la categoría es "Conectadas", filtramos solo las activas
    if (activeCategory === "Conectadas") {
      // Ocultamos los puentes de esta vista para no ensuciar, a menos que quieras verlos
      return i.connected && i.type !== 'bridge'; 
    }
    // Filtro normal
    const matchesCategory = activeCategory === "Todos" || i.category === activeCategory;
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  })
  // 🔥 EL MODAL MAGISTRAL DE CASOS DE USO (¡Restaurado!)
  const showUseCases = () => {
    Swal.fire({
      title: 'Casos de Uso Prácticos 🚀',
      html: `
        <div style="text-align: left; font-size: 14px; color: #475569; display: flex; flex-direction: column; gap: 16px; margin-top: 10px;">
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <strong style="color: #0f172a; font-size: 16px; display: flex; align-items: center; gap: 8px;">📂 1. El Contador Feliz (Google Drive / Dropbox)</strong>
            <div style="margin-top: 8px; border-left: 3px solid #cbd5e1; padding-left: 10px;">
              <span style="color: #64748b; font-size: 13px;"><b>El problema:</b> A fin de mes, tu contador te pide todos los comprobantes y es un caos buscarlos en los chats.</span><br/>
              <span style="color: #3b82f6; font-size: 13px;"><b>La magia:</b> Cada vez que nuestra IA lee y aprueba un ticket, manda el PDF/Foto automáticamente a una carpeta llamada "Ventas Marzo 2026". ¡Cero estrés!</span>
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <strong style="color: #0f172a; font-size: 16px; display: flex; align-items: center; gap: 8px;">📈 2. El Director Comercial (HubSpot / Pipedrive)</strong>
            <div style="margin-top: 8px; border-left: 3px solid #cbd5e1; padding-left: 10px;">
              <span style="color: #64748b; font-size: 13px;"><b>El problema:</b> Cierras ventas por WhatsApp, pero el CRM oficial de la empresa siempre está desactualizado.</span><br/>
              <span style="color: #10b981; font-size: 13px;"><b>La magia:</b> Al confirmar un pago en nuestro chat, avisamos a HubSpot para que mueva a ese cliente a "Cerrado Ganado" y sume el dinero a tus métricas mensuales automáticamente.</span>
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <strong style="color: #0f172a; font-size: 16px; display: flex; align-items: center; gap: 8px;">💌 3. Re-Marketing en Piloto Automático (Mailchimp)</strong>
            <div style="margin-top: 8px; border-left: 3px solid #cbd5e1; padding-left: 10px;">
              <span style="color: #64748b; font-size: 13px;"><b>El problema:</b> Le vendes a alguien hoy, pero te olvidas de ofrecerle un descuento el mes que viene.</span><br/>
              <span style="color: #8b5cf6; font-size: 13px;"><b>La magia:</b> Al realizar una compra, el CRM lo manda a Mailchimp. A los 30 días, Mailchimp le enviará un correo solo: "¡Hola! Te extrañamos, aquí tienes un 10% OFF para tu próxima compra".</span>
            </div>
          </div>

        </div>
      `,
      width: 650,
      showConfirmButton: true,
      confirmButtonText: '¡Entendido, quiero conectar!',
      confirmButtonColor: '#0f172a',
      customClass: { popup: 'rounded-3xl' }
    })
  }

  // 🔥 GESTOR DE CLICS (Abre el modal para la app específica)
  const handleConnect = async (app: typeof INTEGRATIONS[0]) => {

    if (app.id === 'meta') {
      const res = await Swal.fire({
        title: 'Facebook Leads vs. Píxel en "Marketing" 🧠',
        html: `
          <div style="text-align: left; font-size: 14px; color: #475569; display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
            <p>Es normal confundir estas dos herramientas. Aquí tienes la diferencia fácil:</p>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 12px;">
              <strong style="color: #166534; display: flex; align-items: center; gap: 6px;">📥 1. Facebook Leads (Esta integración)</strong>
              <span style="color: #15803d; font-size: 13px;"><b>Trae clientes AL CRM.</b> Alguien llena un formulario en Instagram y aparece mágicamente aquí como un nuevo contacto.</span>
            </div>

            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 12px;">
              <strong style="color: #1e40af; display: flex; align-items: center; gap: 6px;">📤 2. Píxel y CAPI (Módulo de Marketing)</strong>
              <span style="color: #1d4ed8; font-size: 13px;"><b>Manda datos A FACEBOOK.</b> Le avisa a Meta cuando alguien te compra para que te consiga clientes similares.</span>
            </div>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: '¡Entendido, conectar Leads!',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3b82f6'
      });

      if (!res.isConfirmed) return; // Si cancela, no hacemos nada
      
      // Si entendió y quiere conectar, abrimos el modal normal de Webhooks
      setSelectedApp(app);
      setWebhookUrl(""); 
      setIsModalOpen(true);
      return;
    }
    
    if (app.type === 'coming_soon') {
      Swal.fire({
        title: '¡Próximamente!',
        text: `Estamos trabajando duro para integrar ${app.name} de forma nativa. ¡Hemos registrado tu voto!`,
        icon: 'info',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }

    if (app.connected) {
      const res = await Swal.fire({
        title: `¿Desconectar ${app.name}?`,
        text: `Dejarás de sincronizar datos con ${app.name}.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, desconectar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ef4444'
      });
      
      if (res.isConfirmed) {
        // Aquí puedes hacer la llamada a la BD para borrar
        setIntegrations(prev => prev.map(i => i.id === app.id ? { ...i, connected: false } : i));
        Swal.fire('Desconectado', 'La integración ha sido pausada.', 'success');
      }
      return;
    }

    // Si no está conectada, abrimos el modal preparado para ESA app
    setSelectedApp(app);
    setWebhookUrl(""); // Limpiamos el input
    setIsModalOpen(true);
  }

  // 🔥 GUARDAR LA URL ESPECÍFICA
  const handleSaveConnection = async () => {
    if (!webhookUrl || !selectedApp) {
      Swal.fire('Aviso', 'Debes pegar una URL válida.', 'warning');
      return;
    }

    Swal.fire({ title: 'Vinculando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      // Guardamos en la base de datos usando el ID de la app como event_type (Ej: 'hubspot', 'gdrive')
      await guardarWebhookUrl(selectedApp.id, webhookUrl, true);

      // Actualizamos la UI: Encendemos la app seleccionada, y también prendemos Make/Zapier/Webhooks visualmente
      setIntegrations(prev => prev.map(i => {
        if (i.id === selectedApp.id) return { ...i, connected: true };
        if (['make', 'zapier', 'webhooks'].includes(i.id)) return { ...i, connected: true };
        return i;
      }));

      Swal.fire('¡Conexión Exitosa!', `${selectedApp.name} ahora está conectado a tu flujo.`, 'success');
      setIsModalOpen(false);
    } catch (e) {
      Swal.fire('Error', 'No se pudo guardar la configuración.', 'error');
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* HEADER GLASSMORPHISM */}
      <div className="relative overflow-hidden rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800 p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-4">Marketplace de Integraciones</h1>
          <p className="text-slate-600 dark:text-slate-300 text-lg">
            Conecta tu CRM con las herramientas que ya utilizas. Sincroniza contactos, automatiza pagos con IA y potencia tu flujo de trabajo sin escribir código.
          </p>
        </div>
      </div>

      {/* BANNER DE CASOS DE USO */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-violet-600 rounded-3xl p-6 md:p-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
         <div className="relative z-10 text-white flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-6 h-6 text-yellow-300" />
              <h2 className="text-2xl font-bold">¿No sabes por dónde empezar?</h2>
            </div>
            <p className="text-blue-100 text-sm md:text-base max-w-2xl">
              Descubre cómo otras empresas están utilizando estas integraciones para ahorrar horas de trabajo, complacer a sus contadores y vender más en automático.
            </p>
         </div>
         <button onClick={showUseCases} className="relative z-10 shrink-0 group flex items-center gap-2 bg-white text-violet-700 font-bold px-6 py-3.5 rounded-2xl shadow-xl hover:scale-105 transition-all animate-pulse hover:animate-none">
           Ver Ejemplos Prácticos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
         </button>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
     <div className="flex flex-col md:flex-row gap-4 justify-between items-center sticky top-20 z-30 bg-background/80 backdrop-blur-md p-4 rounded-2xl border shadow-sm">
        <div className="flex gap-2 overflow-x-auto w-full pb-2 md:pb-0 scrollbar-hide items-center">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
            >
              {cat}
            </button>
          ))}
          <div className="w-px h-6 bg-slate-300 mx-1"></div> {/* Separador */}
          <button
            onClick={() => setActiveCategory("Conectadas")}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2
              ${activeCategory === "Conectadas" 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}
          >
            <CheckCircle2 className="w-4 h-4" /> Conectadas
          </button>
        </div>
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar aplicación..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {/* GRILLA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredIntegrations.map((app, idx) => {
          
          // 🔥 Lógica especial para los puentes
          const isBridge = app.type === 'bridge';
          const isBridgeActive = isBridge && isAnyAppConnected;

          return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={app.id}
            className={`group relative flex flex-col backdrop-blur-lg border rounded-3xl p-6 transition-all duration-300
              ${app.connected || isBridgeActive ? 'bg-white/90 border-emerald-400/50 shadow-md' : 'bg-white/60 border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1'}
            `}
          >
            <div className="absolute top-4 right-4 z-10">
              {app.connected ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none px-2 py-0.5 shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1"/> Activa</Badge>
              ) : app.type === 'coming_soon' ? (
                <Badge variant="outline" className="text-slate-400 border-slate-200 bg-white/50 backdrop-blur-sm">Próximamente</Badge>
              ) : null}
            </div>

            <div className="w-16 h-16 mb-5 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden p-2 relative">
              <img src={`https://logo.clearbit.com/${app.domain}`} alt={app.name} className={`w-full h-full object-contain absolute inset-0 p-2 z-10 bg-white ${app.type === 'coming_soon' ? 'grayscale opacity-50' : ''}`} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div className="absolute inset-0 flex items-center justify-center z-0 opacity-80">{app.icon}</div>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 mb-1">{app.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">{app.desc}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              {/* RENDERIZADO CONDICIONAL DEL BOTÓN */}
              {isBridge ? (
                 <div className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-default
                    ${isBridgeActive 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                      : 'bg-indigo-50 text-indigo-500 animate-pulse border border-indigo-100'}`}
                 >
                   {isBridgeActive ? <><CheckCircle2 className="w-4 h-4"/> Puente Activo</> : <><Zap className="w-4 h-4"/> Esperando conexión...</>}
                 </div>
              ) : (
                <button
                  onClick={() => handleConnect(app)}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all
                    ${app.connected 
                      ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600' 
                      : app.type === 'coming_soon'
                        ? 'bg-slate-100 text-slate-400 hover:bg-violet-50 hover:text-violet-600'
                        : 'bg-slate-900 text-white shadow-md hover:bg-blue-600'
                    }
                  `}
                >
                  {app.connected ? (<>Configurar <Lock className="w-4 h-4 opacity-50"/></>) : app.type === 'coming_soon' ? (<>Votar Integración</>) : (<>Conectar {app.name} <LinkIcon className="w-4 h-4"/></>)}
                </button>
              )}
            </div>
          </motion.div>
        )})}
      </div>

      {/* WIDGET FLOTANTE WHATSAPP */}
      <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5, duration: 0.4 }} className="fixed bottom-6 right-6 z-50 flex items-center gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 flex items-center gap-4 max-w-sm">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <img src="/images/design-mode/3608034(1).png" alt="Soporte" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">¿Necesitas ayuda técnica?</p>
            <p className="text-xs text-slate-500 mt-0.5">Nuestro equipo te ayuda gratis.</p>
          </div>
          <a href="https://wa.me/5491123456789?text=Hola,%20necesito%20ayuda%20para%20conectar%20una%20integración%20en%20mi%20CRM" target="_blank" rel="noopener noreferrer" className="ml-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 text-white p-2.5 rounded-xl shadow-lg transition-all hover:scale-105">
            <MessageSquare className="h-5 w-5" />
          </a>
        </div>
      </motion.div>

      {/* 🔥 MODAL DINÁMICO DE CONEXIÓN */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {selectedApp?.icon} Conectar {selectedApp?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Cómo conectar vía Make/Zapier
              </h4>
              <ol className="text-xs text-blue-700/80 dark:text-blue-200/70 space-y-1 list-decimal list-inside ml-1">
                <li>Ve a Zapier o Make.com</li>
                <li>Crea un "Webhook" para atrapar los datos del CRM</li>
                <li>Conéctalo con el módulo de <b>{selectedApp?.name}</b></li>
                <li>Pega el enlace del Webhook que generaste aquí abajo:</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                URL del Webhook
              </Label>
              <Input 
                placeholder="https://hook.us2.make.com/..." 
                value={webhookUrl} 
                onChange={(e) => setWebhookUrl(e.target.value)} 
                className="bg-slate-50 dark:bg-slate-900 font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white" onClick={handleSaveConnection}>
              Conectar y Activar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
