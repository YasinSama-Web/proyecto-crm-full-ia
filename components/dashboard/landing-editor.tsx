"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { 
  Save, ArrowLeft, GripVertical, Upload, Image as ImageIcon, 
  Smartphone, Monitor, AlertCircle, CheckCircle2, XCircle, Loader2, RefreshCw, Trash2, Send, Mail, Phone, Calendar, Link as LinkIcon
} from "lucide-react"
import Link from "next/link"
import Swal from "sweetalert2"
import { saveLanding, checkSlugAvailability } from "@/app/dashboard/pages/actions"
import { Reorder } from "framer-motion"
import { uploadImage } from "@/lib/supabase-client"
// 🔥 IMPORTAMOS EL TIPO TAMBIÉN
import { getSmartLinks, type SmartLink } from "@/app/dashboard/marketing/action"

// --- ICONO WHATSAPP ORIGINAL ---
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

interface DesignSettings {
  title: string
  slug: string
  destination_type: "smart" | "custom"
  smart_link_id: string
  custom_url: string
  font: string
  text_color: string
  accent_color: string
  content_alignment: "start" | "center" | "end"
  background_type: "solid" | "gradient" | "image"
  background_color: string
  background_gradient_start: string
  background_gradient_end: string
  background_image_url: string
  background_overlay_opacity: number
  animation_entrance: string
  button_animation: string
  logo_url: string
  logo_size: number
  logo_radius: number
  headline: string
  headline_size: number
  subtitle: string
  subtitle_size: number
  hero_image_url: string
  button_text: string
  button_icon: string
  button_shadow: boolean
  footer_text: string
  top_padding: number
  content_gap: number
  layoutOrder: string[]
  pixel_id?: string
  capi_token?: string
}

const defaultSettings: DesignSettings = {
  title: "",
  slug: "",
  destination_type: "smart",
  smart_link_id: "",
  custom_url: "",
  font: "Inter",
  text_color: "#ffffff",
  accent_color: "#25D366",
  content_alignment: "center",
  background_type: "solid",
  background_color: "#111827",
  background_gradient_start: "#111827",
  background_gradient_end: "#4B5563",
  background_image_url: "",
  background_overlay_opacity: 40,
  animation_entrance: "fadeIn",
  button_animation: "pulse",
  logo_url: "",
  logo_size: 100,
  logo_radius: 0,
  headline: "TU TÍTULO IMPACTANTE",
  headline_size: 32,
  subtitle: "Subtítulo persuasivo que explica tu oferta única.",
  subtitle_size: 16,
  hero_image_url: "",
  button_text: "QUIERO ACCEDER AHORA",
  button_icon: "whatsapp",
  button_shadow: true,
  footer_text: "© 2024 Tu Empresa. Todos los derechos reservados.",
  top_padding: 20,
  content_gap: 24,
  layoutOrder: ["logo", "headline", "hero", "text", "button", "footer"],
  pixel_id: "",
  capi_token: ""
}

const fontMap: Record<string, string> = {
  "Inter": "Inter, sans-serif",
  "Montserrat": "Montserrat, sans-serif",
  "Playfair Display": "Playfair Display, serif",
  "Roboto Mono": "Roboto Mono, monospace",
  "Lato": "Lato, sans-serif",
  "Oswald": "Oswald, sans-serif"
}

// Uploader Component
function ImageUploader({ currentUrl, onUpload, onRemove, label }: { currentUrl?: string, onUpload: (url: string) => void, onRemove: () => void, label: string }) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return Swal.fire("Error", "La imagen es muy pesada (Máx 2MB)", "error")

    setIsUploading(true)
    try {
      const publicUrl = await uploadImage(file)
      onUpload(publicUrl)
    } catch (error) {
      Swal.fire("Error", "No se pudo subir la imagen", "error")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {currentUrl ? (
        <div className="flex items-center gap-3 p-3 border rounded-md bg-slate-50">
           <div className="relative w-16 h-16 rounded overflow-hidden border shrink-0 bg-white">
             <img src={currentUrl} alt="Preview" className="object-cover w-full h-full" />
           </div>
           <div className="flex-1 overflow-hidden">
             <p className="text-xs text-muted-foreground truncate">{currentUrl.split('/').pop()}</p>
           </div>
           <Button variant="destructive" size="icon" className="h-8 w-8" onClick={onRemove}>
             <Trash2 className="w-4 h-4"/>
           </Button>
        </div>
      ) : (
        <div className="flex gap-2">
           <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
           <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="w-full gap-2 border-dashed border-2 h-12">
             {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
             {isUploading ? "Subiendo..." : "Seleccionar Imagen"}
           </Button>
        </div>
      )}
    </div>
  )
}

// EDITOR PRINCIPAL
// 🔥 QUITAMOS 'smartLinks' DE LAS PROPS PARA EVITAR CONFLICTO CON EL STATE INTERNO
export function LandingEditor({ landing }: { landing: any }) {
  const savedConfig = landing.configuracion_json || landing.design_settings || {};

  const [settings, setSettings] = useState<DesignSettings>({
    ...defaultSettings,
    title: landing.title || landing.nombre || "",
    slug: landing.slug || "",
    ...savedConfig,
    // Asegurar valores por defecto si no existen
    destination_type: savedConfig.destination_type || defaultSettings.destination_type,
    background_color: savedConfig.background_color || defaultSettings.background_color,
    background_gradient_start: savedConfig.background_gradient_start || defaultSettings.background_gradient_start,
    background_gradient_end: savedConfig.background_gradient_end || defaultSettings.background_gradient_end,
    layoutOrder: savedConfig.layoutOrder || defaultSettings.layoutOrder,
    logo_size: Number(savedConfig.logo_size) || defaultSettings.logo_size,
    logo_radius: Number(savedConfig.logo_radius) || defaultSettings.logo_radius,
    headline_size: Number(savedConfig.headline_size) || defaultSettings.headline_size,
    subtitle_size: Number(savedConfig.subtitle_size) || defaultSettings.subtitle_size,
    top_padding: Number(savedConfig.top_padding) || defaultSettings.top_padding,
    content_gap: Number(savedConfig.content_gap) || defaultSettings.content_gap,
    background_overlay_opacity: Number(savedConfig.background_overlay_opacity ?? defaultSettings.background_overlay_opacity),
    pixel_id: savedConfig.pixel_id || "",
    capi_token: savedConfig.capi_token || ""
  })

  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile")
  const [animKey, setAnimKey] = useState(0)
  const router = useRouter()
  
  // SLUG LOGIC
  const [slugStatus, setSlugStatus] = useState<'idle' | 'loading' | 'available' | 'taken'>('idle')
  const [slugSuggestion, setSlugSuggestion] = useState("")
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // SMART LINKS LOGIC
  const [smartLinks, setSmartLinks] = useState<SmartLink[]>([])

  useEffect(() => {
    async function loadLinks() {
        try {
            // 🔥 Cargamos los links desde el servidor
            const links = await getSmartLinks()
            setSmartLinks(links)
        } catch (e) {
            console.error("Error cargando smart links", e)
        }
    }
    loadLinks()
  }, [])

  useEffect(() => {
      if (!settings.slug) {
          setSlugStatus('idle')
          return
      }
      setSlugStatus('loading')
      if (debounceRef.current) clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(async () => {
          const result = await checkSlugAvailability(settings.slug, landing.id)
          
          if (result.available) {
              setSlugStatus('available')
          } else {
              setSlugStatus('taken')
              setSlugSuggestion(result.suggestion || "")
          }
      }, 500)

      return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [settings.slug, landing.id])

  const updateSettings = (key: keyof DesignSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => { setAnimKey(prev => prev + 1) }, [settings.animation_entrance, settings.button_animation])

  // 🔥 BUSCAMOS EL LINK ACTIVO
  const activeSmartLink = smartLinks.find(link => link.id === settings.smart_link_id)
  
  // 🔥 Usamos 'destination_url' porque así se llama en tu base de datos (Prisma)
  const finalDestinationUrl = settings.destination_type === 'smart' 
    ? (activeSmartLink ? activeSmartLink.destination_url : '') 
    : settings.custom_url

  const isLinkConfigured = finalDestinationUrl && finalDestinationUrl.length > 0

  const handleSave = async () => {
    if (!settings.title.trim()) return Swal.fire("Falta el Título", "Por favor escribe un título interno.", "warning")
    if (!settings.slug.trim()) return Swal.fire("Falta el Slug", "Por favor escribe una URL.", "warning")
    
    if (slugStatus === 'loading') {
        return Swal.fire("Espera un momento", "Estamos verificando la disponibilidad del enlace.", "info")
    }
    if (slugStatus === 'taken') {
        return Swal.fire({
            title: "¡Enlace ocupado!",
            text: "El nombre que elegiste ya existe. Por favor elige otro o usa la sugerencia.",
            icon: "error",
            confirmButtonText: "Entendido"
        })
    }

    if (!isLinkConfigured) {
        const confirm = await Swal.fire({
            title: "¿Guardar sin enlace?",
            text: "El botón de la landing no funcionará.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Guardar igual"
        })
        if (!confirm.isConfirmed) return
    }

    setSaving(true)
    try {
        const payload = { id: landing.id || null, title: settings.title, slug: settings.slug, ...settings }
        const result = await saveLanding(payload)
        
        if (result.success) {
            await Swal.fire({ icon: "success", title: "¡Guardado!", text: "Volviendo a la tabla...", timer: 1500, showConfirmButton: false })
            router.push("/dashboard/pages")
            router.refresh() 
        } else {
            Swal.fire("Error", result.error, "error")
        }
    } catch (error) { Swal.fire("Error", "Fallo inesperado", "error") }
    finally { setSaving(false) }
  }

  const getIcon = (type: string) => {
      switch(type) {
          case 'whatsapp': return <WhatsAppIcon />
          case 'telegram': return <Send className="w-5 h-5" />
          case 'phone': return <Phone className="w-5 h-5" />
          case 'email': return <Mail className="w-5 h-5" />
          case 'calendar': return <Calendar className="w-5 h-5" />
          default: return <LinkIcon className="w-5 h-5" />
      }
  }

  const renderBlock = (block: string) => {
    switch(block) {
        case "logo": return settings.logo_url ? (
            <div key="logo" className="mb-4 cursor-move">
                <img src={settings.logo_url} alt="Logo" style={{ height: `${settings.logo_size}px`, borderRadius: `${settings.logo_radius}%` }} className="object-contain mx-auto transition-all"/>
            </div>
        ) : null

        case "headline": return (
            <div key="headline" className="cursor-move text-center px-4">
                <h1 style={{ fontSize: `${settings.headline_size}px`, color: settings.text_color, fontFamily: settings.font }} className="font-extrabold mb-2 leading-tight tracking-tight transition-all">{settings.headline}</h1>
                <p style={{ fontSize: `${settings.subtitle_size}px`, color: settings.text_color, fontFamily: settings.font }} className="opacity-90 max-w-lg mx-auto transition-all">{settings.subtitle}</p>
            </div>
        )

        case "hero": return settings.hero_image_url ? (
            <div key="hero" className="cursor-move rounded-xl overflow-hidden shadow-lg mx-auto max-w-md w-full relative z-20">
                 <img src={settings.hero_image_url} alt="Hero" className="w-full h-auto object-cover"/>
            </div>
        ) : null

        case "text": return null 

        case "button": return (
            <div key="button" className="w-full max-w-md mx-auto cursor-move px-4 relative z-30">
               <a
                    href={finalDestinationUrl || '#'}
                    target="_blank"
                    key={`btn-${animKey}`}
                    className={`flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold text-lg text-white w-full hover:scale-105 transition-all 
                    ${settings.button_shadow ? 'shadow-xl shadow-black/20' : 'shadow-none'} 
                    ${settings.button_animation !== 'none' ? `animate__animated animate__${settings.button_animation} animate__infinite` : ''}`}
                    style={{ backgroundColor: settings.accent_color, fontFamily: settings.font, pointerEvents: isLinkConfigured ? 'auto' : 'none', opacity: isLinkConfigured ? 1 : 0.7 }}
                >
                    {getIcon(settings.button_icon)}
                    <span className="tracking-wide">{settings.button_text}</span>
                </a>
                {!isLinkConfigured && (
                    <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 text-center">
                         <p className="text-xs text-red-600 font-semibold flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3"/> Falta enlace</p>
                    </div>
                )}
            </div>
        )

        case "footer": return <div key="footer" style={{ color: settings.text_color, fontFamily: settings.font }} className="mt-auto text-xs opacity-60 py-6 cursor-move text-center px-4">{settings.footer_text}</div>
        default: return null
    }
  }

  const backgroundStyle: React.CSSProperties = {
    ...(settings.background_type === "gradient" ? { background: `linear-gradient(135deg, ${settings.background_gradient_start}, ${settings.background_gradient_end})` } :
       settings.background_type === "image" && settings.background_image_url ? { backgroundImage: `url(${settings.background_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } :
       { backgroundColor: settings.background_color })
  }

  const baseContentStyle: React.CSSProperties = {
      fontFamily: settings.font,
      color: settings.text_color,
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-50">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=${settings.font.replace(' ', '+')}:wght@400;700;900&display=swap');
        @import 'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css';
      `}</style>

      {/* PANEL IZQUIERDO */}
      <div className="w-full lg:w-[480px] flex flex-col h-full border-r bg-white z-40 shadow-xl shrink-0">
        <div className="flex items-center justify-between p-4 border-b bg-white shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link href="/dashboard/pages"><ArrowLeft className="h-5 w-5 text-slate-600" /></Link></Button>
            <h1 className="text-xl font-bold text-slate-800">{landing.id ? "Editar" : "Nueva"} Landing</h1>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Guardar
          </Button>
        </div>

        <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-full w-full">
                <div className="p-5 pb-32 space-y-4">
                    
                    {/* SECCIONES ACORDEÓN */}
                    <Accordion type="single" collapsible defaultValue="general" className="bg-white rounded-xl border shadow-sm px-4">
                        <AccordionItem value="general" className="border-0">
                            <AccordionTrigger className="hover:no-underline py-4 font-semibold">⚙️ Configuración</AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                                
                                <div className="grid grid-cols-2 gap-4 items-start">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Título Interno</Label>
                                        <Input 
                                            value={settings.title} 
                                            onChange={(e) => updateSettings("title", e.target.value)} 
                                            className="h-9"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">Slug URL</Label>
                                        <div className="relative">
                                            <Input 
                                                value={settings.slug} 
                                                onChange={(e) => {
                                                    const val = e.target.value.toLowerCase().replace(/\s+/g, '-')
                                                    updateSettings("slug", val)
                                                }} 
                                                className={`h-9 font-mono pr-8 transition-colors ${
                                                    slugStatus === 'available' ? 'border-green-500 focus-visible:ring-green-500' : 
                                                    slugStatus === 'taken' ? 'border-red-500 focus-visible:ring-red-500' : ''
                                                }`}
                                            />
                                            <div className="absolute right-2 top-2.5 pointer-events-none">
                                                {slugStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground"/>}
                                                {slugStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-green-500"/>}
                                                {slugStatus === 'taken' && <XCircle className="w-4 h-4 text-red-500"/>}
                                            </div>
                                        </div>
                                        <div className="h-5">
                                            {slugStatus === 'loading' && <p className="text-[10px] text-muted-foreground">Verificando...</p>}
                                            {slugStatus === 'available' && settings.slug && (
                                                <p className="text-[10px] text-green-600 font-medium">¡Disponible!</p>
                                            )}
                                            {slugStatus === 'taken' && (
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[10px] text-red-600 font-medium leading-none">Ups! Este dominio esta ocupado!.</p>
                                                    {slugSuggestion && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <span className="text-[10px] text-muted-foreground">Te recomendamos:</span>
                                                            <button 
                                                                onClick={() => updateSettings("slug", slugSuggestion)}
                                                                className="text-[10px] font-mono bg-blue-50 text-blue-600 px-1.5 rounded border border-blue-100 hover:bg-blue-100 flex items-center gap-1 transition-colors"
                                                            >
                                                                {slugSuggestion}
                                                                <RefreshCw className="w-3 h-3"/>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-3 border-t">
                                    <Label className="font-semibold text-sm">Destino del Botón</Label>
                                    <Tabs value={settings.destination_type} onValueChange={(v:any) => updateSettings("destination_type", v)} className="w-full">
                                        <TabsList className="w-full grid grid-cols-2">
                                            <TabsTrigger value="smart">Smart Link</TabsTrigger>
                                            <TabsTrigger value="custom">Externo</TabsTrigger>
                                        </TabsList>
                                        <div className="mt-3">
                                            {settings.destination_type === 'smart' && (
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Seleccionar Smart Link</Label>
                                                    
                                                    {smartLinks.length > 0 ? (
                                                        <Select 
                                                            value={settings.smart_link_id} 
                                                            onValueChange={(val) => updateSettings("smart_link_id", val)}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="Selecciona una promo..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {smartLinks.map((link) => (
                                                                    <SelectItem key={link.id} value={link.id}>
                                                                        {/* Usamos 'name' y 'slug' del tipo SmartLink */}
                                                                        {link.name} ({link.slug})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <div className="text-[10px] text-red-500 bg-red-50 p-2 rounded border border-red-100">
                                                            No tienes Smart Links creados. Ve a la sección <b>Marketing</b> para crear uno.
                                                        </div>
                                                    )}
                                                    
                                                    <p className="text-[10px] text-muted-foreground">
                                                        El botón de tu landing abrirá este link de WhatsApp.
                                                    </p>
                                                </div>
                                            )}
                                            {settings.destination_type === 'custom' && (
                                                <Input placeholder="https://..." value={settings.custom_url} onChange={(e) => updateSettings("custom_url", e.target.value)} />
                                            )}
                                        </div>
                                    </Tabs>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    {/* ESTILO */}
                    <Accordion type="single" collapsible className="bg-white rounded-xl border shadow-sm px-4">
                        <AccordionItem value="style" className="border-0">
                            <AccordionTrigger className="hover:no-underline py-4 font-semibold">🎨 Estilo</AccordionTrigger>
                            <AccordionContent className="space-y-5 pt-0 pb-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-xs">Fuente</Label><Select value={settings.font} onValueChange={(v) => updateSettings("font", v)}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{Object.keys(fontMap).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                                    <div className="space-y-3 pt-2">
                                        <div className="space-y-1"><div className="flex justify-between"><Label className="text-[10px]">Margen Top</Label><span className="text-xs">{settings.top_padding}px</span></div><Slider value={[settings.top_padding]} min={0} max={200} step={5} onValueChange={(val) => updateSettings("top_padding", val[0])} /></div>
                                        <div className="space-y-1"><div className="flex justify-between"><Label className="text-[10px]">Gap</Label><span className="text-xs">{settings.content_gap}px</span></div><Slider value={[settings.content_gap]} min={0} max={60} step={2} onValueChange={(val) => updateSettings("content_gap", val[0])} /></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-xs">Texto</Label><div className="flex gap-2"><Input type="color" value={settings.text_color} onChange={(e) => updateSettings("text_color", e.target.value)} className="w-8 h-9 p-0.5"/><Input value={settings.text_color} onChange={(e) => updateSettings("text_color", e.target.value)} className="h-9 text-xs"/></div></div>
                                    <div className="space-y-1"><Label className="text-xs">Botón</Label><div className="flex gap-2"><Input type="color" value={settings.accent_color} onChange={(e) => updateSettings("accent_color", e.target.value)} className="w-8 h-9 p-0.5"/><Input value={settings.accent_color} onChange={(e) => updateSettings("accent_color", e.target.value)} className="h-9 text-xs"/></div></div>
                                </div>
                                <div className="pt-3 border-t space-y-3">
                                    <Label className="text-xs font-semibold">Fondo</Label>
                                    <Select value={settings.background_type} onValueChange={(val: any) => updateSettings("background_type", val)}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="solid">Sólido</SelectItem><SelectItem value="gradient">Gradiente</SelectItem><SelectItem value="image">Imagen</SelectItem></SelectContent></Select>
                                    {settings.background_type === 'solid' && <Input type="color" value={settings.background_color} onChange={(e) => updateSettings("background_color", e.target.value)} className="w-full h-10 p-1"/>}
                                    {settings.background_type === 'gradient' && <div className="flex gap-2"><Input type="color" value={settings.background_gradient_start} onChange={(e) => updateSettings("background_gradient_start", e.target.value)} className="w-full h-10 p-1"/><Input type="color" value={settings.background_gradient_end} onChange={(e) => updateSettings("background_gradient_end", e.target.value)} className="w-full h-10 p-1"/></div>}
                                    {settings.background_type === 'image' && (
                                        <div className="space-y-3">
                                            <ImageUploader label="Imagen Fondo" currentUrl={settings.background_image_url} onUpload={(url) => updateSettings("background_image_url", url)} onRemove={() => updateSettings("background_image_url", "")} />
                                            <div className="space-y-1"><div className="flex justify-between"><Label className="text-xs">Oscurecer</Label><span className="text-xs">{settings.background_overlay_opacity}%</span></div><Slider value={[settings.background_overlay_opacity]} max={90} step={10} onValueChange={(val) => updateSettings("background_overlay_opacity", val[0])} /></div>
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    {/* API Y PIXEL */}
                    <Accordion type="single" collapsible className="bg-white rounded-xl border shadow-sm px-4">
                        <AccordionItem value="tracking" className="border-0">
                            <AccordionTrigger className="hover:no-underline py-4 font-semibold flex gap-2 items-center">
                                📈 API y Pixel <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Meta/Facebook</span>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                                <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs space-y-2">
                                    <p className="font-semibold text-slate-700">¿Cómo funciona la prioridad?</p>
                                    <ul className="list-disc pl-4 space-y-1 text-slate-600">
                                        <li>Si configuras el Pixel aquí, las ventas de esta landing se enviarán a <strong>este Pixel específico</strong>.</li>
                                        <li>Si lo dejas vacío, el sistema usará el <strong>Pixel Global</strong> configurado en la sección "Marketing" (si existe).</li>
                                    </ul>
                                </div>
                                <div className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <Label className="text-xs">Meta Pixel ID</Label>
                                            <span className="text-[10px] text-muted-foreground">Opcional</span>
                                        </div>
                                        <Input placeholder="Ej: 1234567890" value={settings.pixel_id || ""} onChange={(e) => updateSettings("pixel_id", e.target.value)} className="h-9 font-mono"/>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <Label className="text-xs">API Access Token (CAPI)</Label>
                                            <span className="text-[10px] text-muted-foreground">Recomendado</span>
                                        </div>
                                        <Input type="password" placeholder="EAA..." value={settings.capi_token || ""} onChange={(e) => updateSettings("capi_token", e.target.value)} className="h-9 font-mono"/>
                                        <p className="text-[10px] text-muted-foreground">Permite enviar eventos de "Compra" directamente desde el servidor.</p>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    {/* CONTENIDO */}
                    <Accordion type="single" collapsible className="bg-white rounded-xl border shadow-sm px-4">
                        <AccordionItem value="content" className="border-0">
                            <AccordionTrigger className="hover:no-underline py-4 font-semibold">📝 Contenido</AccordionTrigger>
                            <AccordionContent className="space-y-5 pt-0 pb-4">
                                <div className="space-y-2 pb-3 border-b">
                                    <ImageUploader label="Logo" currentUrl={settings.logo_url} onUpload={(url) => updateSettings("logo_url", url)} onRemove={() => updateSettings("logo_url", "")} />
                                    {settings.logo_url && <div className="space-y-3 mt-2"><div className="flex items-center gap-2"><span className="text-xs w-16">Tamaño</span><Slider value={[settings.logo_size]} min={20} max={300} step={5} onValueChange={(val) => updateSettings("logo_size", val[0])} className="flex-1" /></div><div className="flex items-center gap-2"><span className="text-xs w-16">Redondeo</span><Slider value={[settings.logo_radius]} min={0} max={50} step={1} onValueChange={(val) => updateSettings("logo_radius", val[0])} className="flex-1" /></div></div>}
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-1"><Label className="text-xs">Título</Label><Input value={settings.headline} onChange={(e) => updateSettings("headline", e.target.value)}/></div>
                                    <div className="flex items-center gap-2"><span className="text-xs w-12">Tamaño</span><Slider value={[settings.headline_size]} min={12} max={80} step={1} onValueChange={(val) => updateSettings("headline_size", val[0])} className="flex-1" /></div>
                                    <div className="space-y-1"><Label className="text-xs">Subtítulo</Label><Textarea value={settings.subtitle} onChange={(e) => updateSettings("subtitle", e.target.value)} rows={2}/></div>
                                    <div className="flex items-center gap-2"><span className="text-xs w-12">Tamaño</span><Slider value={[settings.subtitle_size]} min={10} max={40} step={1} onValueChange={(val) => updateSettings("subtitle_size", val[0])} className="flex-1" /></div>
                                </div>
                                <div className="py-3 border-t border-b"><ImageUploader label="Imagen Hero" currentUrl={settings.hero_image_url} onUpload={(url) => updateSettings("hero_image_url", url)} onRemove={() => updateSettings("hero_image_url", "")} /></div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold">Botón</Label>
                                    <div className="flex items-center gap-2"><Label className="text-[10px]">Sombra</Label><Switch checked={settings.button_shadow} onCheckedChange={(c) => updateSettings("button_shadow", c)} className="scale-75" /></div>
                                    <div className="flex gap-2">
                                        <Select value={settings.button_icon} onValueChange={(v) => updateSettings("button_icon", v)}><SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="whatsapp">WA</SelectItem><SelectItem value="telegram">TG</SelectItem><SelectItem value="email">Mail</SelectItem><SelectItem value="link">Link</SelectItem></SelectContent></Select>
                                        <Input value={settings.button_text} onChange={(e) => updateSettings("button_text", e.target.value)} className="flex-1"/>
                                    </div>
                                    <div className="space-y-1"><Label className="text-xs">Animación</Label><Select value={settings.button_animation} onValueChange={(v) => updateSettings("button_animation", v)}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Ninguna</SelectItem><SelectItem value="pulse">Pulse</SelectItem><SelectItem value="tada">Tada</SelectItem></SelectContent></Select></div>
                                </div>
                                <div className="pt-3 border-t"><Label className="text-xs">Footer</Label><Input value={settings.footer_text} onChange={(e) => updateSettings("footer_text", e.target.value)} className="h-9"/></div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    {/* ORDEN */}
                    <Accordion type="single" collapsible className="bg-white rounded-xl border shadow-sm px-4">
                        <AccordionItem value="orden" className="border-0">
                            <AccordionTrigger className="hover:no-underline py-4 font-semibold">✨ Orden y Entrada</AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-0 pb-4">
                                <div className="space-y-1"><Label className="text-xs">Animación Entrada</Label><Select value={settings.animation_entrance} onValueChange={(v) => updateSettings("animation_entrance", v)}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Ninguna</SelectItem><SelectItem value="fadeIn">Fade In</SelectItem><SelectItem value="zoomIn">Zoom In</SelectItem><SelectItem value="slideInUp">Slide Up</SelectItem></SelectContent></Select></div>
                                <div className="pt-2"><Label className="text-xs mb-2 block">Arrastra para ordenar</Label><Reorder.Group axis="y" values={settings.layoutOrder} onReorder={(newOrder) => updateSettings("layoutOrder", newOrder)}>{settings.layoutOrder.map((item) => (<Reorder.Item key={item} value={item} className="p-2 mb-2 bg-slate-50 border rounded flex justify-between text-sm cursor-grab active:cursor-grabbing"><span className="capitalize">{item}</span><GripVertical className="w-4 h-4 text-slate-400"/></Reorder.Item>))}</Reorder.Group></div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </ScrollArea>
        </div>
      </div>

      {/* PANEL DERECHO */}
      <div className="flex-1 flex flex-col bg-slate-200/80 relative">
         <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white p-1 rounded-full shadow-lg flex gap-1 border">
             <button onClick={() => setPreviewMode('mobile')} className={`p-2 rounded-full transition-all ${previewMode === 'mobile' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Smartphone className="w-5 h-5"/></button>
             <button onClick={() => setPreviewMode('desktop')} className={`p-2 rounded-full transition-all ${previewMode === 'desktop' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Monitor className="w-5 h-5"/></button>
         </div>
         <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
             {/* MÓVIL */}
             {previewMode === 'mobile' && (
                <div className="relative w-[375px] h-[780px] bg-black rounded-[3.5rem] p-3 shadow-2xl border-[8px] border-slate-900 shrink-0 transition-all duration-500 z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-50" />
                    <ScrollArea className="w-full h-full rounded-[2.5rem] bg-white overflow-hidden relative">
                        <div className="absolute inset-0 z-0" style={backgroundStyle} />
                        {settings.background_type === 'image' && <div className="absolute inset-0 bg-black z-10 pointer-events-none transition-opacity duration-300" style={{ opacity: settings.background_overlay_opacity / 100 }} />}
                        <div className="absolute inset-0 overflow-y-auto no-scrollbar z-20">
                            <div key={`content-${animKey}`} style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', paddingTop: `${settings.top_padding}px`, gap: `${settings.content_gap}px`, ...baseContentStyle }} className={`p-6 relative ${settings.animation_entrance !== 'none' ? `animate__animated animate__${settings.animation_entrance}` : ''}`}>
                                {settings.layoutOrder.map(block => renderBlock(block))}
                            </div>
                        </div>
                    </ScrollArea>
                </div>
             )}
             {/* DESKTOP */}
             {previewMode === 'desktop' && (
                <div className="relative w-full max-w-6xl h-[95%] bg-white rounded-xl shadow-2xl border overflow-hidden flex flex-col transition-all duration-500 animate-in fade-in zoom-in-95 z-10">
                    <div className="h-10 bg-slate-100 border-b flex items-center px-4 gap-2 shrink-0 z-50">
                        <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400"/><div className="w-3 h-3 rounded-full bg-yellow-400"/><div className="w-3 h-3 rounded-full bg-green-400"/></div>
                        <div className="flex-1 text-center text-xs text-slate-500 font-mono bg-white mx-4 rounded-md py-1 border truncate shadow-sm">{`${typeof window !== 'undefined' ? window.location.origin : ''}/p/${settings.slug}`}</div>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                          <div className="absolute inset-0 z-0" style={backgroundStyle} />
                          {settings.background_type === 'image' && <div className="absolute inset-0 bg-black z-10 pointer-events-none sticky top-0 h-full" style={{ opacity: settings.background_overlay_opacity / 100 }} />}
                          <div className="absolute inset-0 z-20 overflow-y-auto">
                            <div key={`content-desk-${animKey}`} style={{ minHeight: '100%', paddingTop: `${settings.top_padding}px` }} className={`p-12 relative ${settings.animation_entrance !== 'none' ? `animate__animated animate__${settings.animation_entrance}` : ''}`}>
                                <div className="max-w-4xl mx-auto w-full" style={{ display: 'flex', flexDirection: 'column', gap: `${settings.content_gap}px`, ...baseContentStyle }}>{settings.layoutOrder.map(block => renderBlock(block))}</div>
                            </div>
                          </div>
                    </div>
                </div>
             )}
         </div>
      </div>
    </div>
  )
}
