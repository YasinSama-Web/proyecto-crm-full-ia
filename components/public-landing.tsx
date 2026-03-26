"use client"

import { useEffect, useRef, useMemo } from "react"
import Script from "next/script" // 🔥 1. IMPORTAMOS SCRIPT
import { MessageCircle, Send, Mail, Phone, Calendar, Link as LinkIcon } from "lucide-react"
import { trackLandingVisit, trackLandingClick } from "@/app/dashboard/pages/actions"
import { trackSmartLinkClick } from "@/app/dashboard/marketing/action"

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

interface PublicLandingProps {
  landing: any
  resolvedUrl: string 
}

export function PublicLanding({ landing, resolvedUrl }: PublicLandingProps) {
  const visitTracked = useRef(false)
  const config = landing.configuracion_json || landing.design_settings || {}
  
  // 🔥 2. EXTRAMOS EL PIXEL ID
  const PIXEL_ID = config.pixel_id

  // 🔥 3. TRACKING DE VISITA + PIXEL PAGEVIEW
  useEffect(() => {
    if (!visitTracked.current) {
        // Track Interno
        trackLandingVisit(landing.id)
        
        // Track Pixel (Navegador)
        if (PIXEL_ID && typeof window !== 'undefined' && (window as any).fbq) {
            (window as any).fbq('track', 'PageView');
        }

        visitTracked.current = true
    }
  }, [landing.id, PIXEL_ID])

  // 🔥 4. TRACKING DE CLIC + PIXEL LEAD
  const handleBtnClick = () => {
      // Track Interno
      trackLandingClick(landing.id)

      // Track Pixel (Navegador)
      if (PIXEL_ID && typeof window !== 'undefined' && (window as any).fbq) {
          // Evento 'Lead' o 'Contact' porque hicieron clic en el CTA
          (window as any).fbq('track', 'Lead'); 
      }
      if (config.destination_type === 'smart' && config.smart_link_id) {
          // Disparamos la acción sin esperar (fire & forget) para no frenar al usuario
          trackSmartLinkClick(config.smart_link_id)
      }
  }

  // 🔥 5. GENERAR URL INTELIGENTE CON "REF"
  // Si es un link de WhatsApp, le agregamos (Ref: slug) al mensaje
const finalUrl = useMemo(() => {
      if (!resolvedUrl) return '#'
      
      // Verificamos si es un enlace de WhatsApp
      if (resolvedUrl.includes('wa.me') || resolvedUrl.includes('whatsapp.com')) {
          try {
              const urlObj = new URL(resolvedUrl)
              const currentText = urlObj.searchParams.get('text') || ''
              
              // Solo agregamos la referencia si no está ya
              if (!currentText.includes(`Ref: ${landing.slug}`)) {
                  // 👇 AGREGAMOS MUCHOS SALTOS DE LÍNEA PARA "OCULTARLO" VISUALMENTE
                  const hiddenRef = `\n\n\(Ref: ${landing.slug})`
                  
                  const newText = currentText 
                    ? `${currentText}${hiddenRef}` 
                    : `Hola${hiddenRef}`
                  
                  urlObj.searchParams.set('text', newText)
                  return urlObj.toString()
              }
          } catch (e) {
              return resolvedUrl
          }
      }
      return resolvedUrl
  }, [resolvedUrl, landing.slug])

  const settings = {
    font: config.font || "Inter",
    text_color: config.text_color || "#ffffff",
    accent_color: config.accent_color || "#25D366",
    content_alignment: config.content_alignment || "center",
    background_type: config.background_type || "solid",
    background_color: config.background_color || "#111827",
    background_gradient_start: config.background_gradient_start || "#111827",
    background_gradient_end: config.background_gradient_end || "#4B5563",
    background_image_url: config.background_image_url || "",
    background_overlay_opacity: Number(config.background_overlay_opacity ?? 40),
    animation_entrance: config.animation_entrance || "fadeIn",
    button_animation: config.button_animation || "pulse",
    logo_url: config.logo_url || "",
    logo_size: Number(config.logo_size) || 100,
    logo_radius: Number(config.logo_radius) || 0,
    headline: config.headline || "",
    headline_size: Number(config.headline_size) || 32,
    subtitle: config.subtitle || "",
    subtitle_size: Number(config.subtitle_size) || 16,
    hero_image_url: config.hero_image_url || "",
    button_text: config.button_text || "Contactar",
    button_icon: config.button_icon || "whatsapp",
    button_shadow: config.button_shadow ?? true,
    footer_text: config.footer_text || "",
    top_padding: Number(config.top_padding) || 20,
    content_gap: Number(config.content_gap) || 24,
    layoutOrder: config.layoutOrder || ["logo", "headline", "hero", "text", "button", "footer"]
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
            <div key="logo" className="mb-4">
                <img src={settings.logo_url} alt="Logo" style={{ height: `${settings.logo_size}px`, borderRadius: `${settings.logo_radius}%` }} className="object-contain mx-auto" />
            </div>
        ) : null

        case "headline": return (
            <div key="headline" className="text-center px-4">
                <h1 style={{ fontSize: `${settings.headline_size}px`, color: settings.text_color, fontFamily: settings.font }} className="font-extrabold mb-2 leading-tight tracking-tight text-balance">{settings.headline}</h1>
                <p style={{ fontSize: `${settings.subtitle_size}px`, color: settings.text_color, fontFamily: settings.font }} className="opacity-90 max-w-2xl mx-auto text-pretty">{settings.subtitle}</p>
            </div>
        )

        case "hero": return settings.hero_image_url ? (
            <div key="hero" className="rounded-xl overflow-hidden shadow-2xl mx-auto max-w-md w-full relative z-20">
                 <img src={settings.hero_image_url} alt="Hero" className="w-full h-auto object-cover"/>
            </div>
        ) : null

        case "text": return null 

        case "button": return (
            <div key="button" className="w-full max-w-md mx-auto px-4 relative z-30">
               <a
                    href={finalUrl || '#'} // 🔥 USAMOS LA URL MODIFICADA
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleBtnClick}
                    className={`flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold text-lg text-white w-full hover:scale-105 transition-all 
                    ${settings.button_shadow ? 'shadow-xl shadow-black/20' : 'shadow-none'} 
                    ${settings.button_animation !== 'none' ? `animate__animated animate__${settings.button_animation} animate__infinite` : ''}`}
                    style={{ backgroundColor: settings.accent_color, fontFamily: settings.font, opacity: finalUrl ? 1 : 0.7, pointerEvents: finalUrl ? 'auto' : 'none' }}
                >
                    {getIcon(settings.button_icon)}
                    <span className="tracking-wide">{settings.button_text}</span>
                </a>
            </div>
        )

        case "footer": return <div key="footer" style={{ color: settings.text_color, fontFamily: settings.font }} className="mt-auto text-xs opacity-60 py-6 text-center px-4">{settings.footer_text}</div>
        default: return null
    }
  }

  const backgroundStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: -1,
    ...(settings.background_type === "gradient" ? { background: `linear-gradient(135deg, ${settings.background_gradient_start}, ${settings.background_gradient_end})` } :
       settings.background_type === "image" && settings.background_image_url ? { backgroundImage: `url(${settings.background_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } :
       { backgroundColor: settings.background_color })
  }

  return (
    <>
        <style jsx global>{`
            @import url('https://fonts.googleapis.com/css2?family=${settings.font.replace(' ', '+')}:wght@400;700;900&display=swap');
            @import 'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css';
        `}</style>

        {/* 🔥 6. INYECCIÓN DEL SCRIPT DE FACEBOOK (Solo si existe Pixel ID) */}
        {PIXEL_ID && (
            <>
                <Script id="fb-pixel" strategy="afterInteractive">
                    {`
                    !function(f,b,e,v,n,t,s)
                    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window, document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                    fbq('init', '${PIXEL_ID}');
                    fbq('track', 'PageView');
                    `}
                </Script>
                <noscript>
                    <img height="1" width="1" style={{ display: 'none' }}
                        src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
                    />
                </noscript>
            </>
        )}

        <div className="min-h-screen relative overflow-x-hidden">
            <div style={backgroundStyle} />
            {settings.background_type === 'image' && <div className="fixed inset-0 bg-black z-0 pointer-events-none" style={{ opacity: settings.background_overlay_opacity / 100 }} />}
            <div className={`relative z-10 min-h-screen w-full ${settings.animation_entrance !== 'none' ? `animate__animated animate__${settings.animation_entrance}` : ''}`}
                style={{ display: 'flex', flexDirection: 'column', paddingTop: `${settings.top_padding}px`, paddingBottom: '40px', gap: `${settings.content_gap}px`, justifyContent: settings.content_alignment }}
            >
                <div className="w-full max-w-4xl mx-auto flex flex-col" style={{ gap: `${settings.content_gap}px` }}>
                    {settings.layoutOrder.map((block: string) => renderBlock(block))}
                </div>
            </div>
        </div>
    </>
  )
}
