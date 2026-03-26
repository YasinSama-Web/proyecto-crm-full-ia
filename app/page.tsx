import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  MessageSquare,
  Zap,
  BarChart3,
  Users,
  FileText,
  CheckCircle,
  ArrowRight,
  Smartphone,
  TrendingUp,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
            CRM WhatsApp
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Funciones
            </Link>
            <Link href="#benefits" className="text-sm text-muted-foreground hover:text-foreground">
              Beneficios
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Precios
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Comenzar Gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl text-balance">
            Gestiona tu negocio con WhatsApp
          </h1>
          <p className="mt-6 text-lg text-muted-foreground text-pretty">
            Convierte conversaciones en ventas. Un CRM completo con WhatsApp, landing pages y analytics para escalar tu
            negocio.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register">
                Comenzar Gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Ver Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">Todo lo que necesitas</h2>
            <p className="mt-4 text-muted-foreground">
              Gestiona conversaciones, crea landing pages y analiza resultados en un solo lugar
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: MessageSquare,
                title: "WhatsApp Integrado",
                description: "Conecta múltiples líneas de WhatsApp y gestiona todas las conversaciones desde un panel.",
              },
              {
                icon: FileText,
                title: "Landing Pages",
                description: "Crea páginas de aterrizaje personalizadas con botones de WhatsApp integrados.",
              },
              {
                icon: BarChart3,
                title: "Analytics Avanzados",
                description: "Mide visitas, clics y conversiones para optimizar tus campañas.",
              },
              {
                icon: Users,
                title: "Gestión de Contactos",
                description: "Organiza tus contactos, marca conversiones y asigna agentes.",
              },
              {
                icon: Zap,
                title: "Respuestas Rápidas",
                description: "Responde instantáneamente con mensajes predefinidos y automatizaciones.",
              },
              {
                icon: TrendingUp,
                title: "Tracking de Ventas",
                description: "Registra montos de conversión y visualiza el crecimiento de tu negocio.",
              },
            ].map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">¿Por qué elegir nuestro CRM?</h2>
            <p className="mt-4 text-muted-foreground">Diseñado para negocios que quieren escalar</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {[
              {
                title: "Sin límites de conversaciones",
                description: "Gestiona todas las conversaciones que necesites sin restricciones.",
              },
              {
                title: "Configuración en minutos",
                description: "Conecta tu WhatsApp escaneando un código QR y empieza inmediatamente.",
              },
              {
                title: "Dashboard personalizado",
                description: "Cada usuario tiene su propio espacio con sus líneas y estadísticas.",
              },
              {
                title: "Seguro y confiable",
                description: "Tus datos están protegidos con encriptación y backups automáticos.",
              },
            ].map((benefit) => (
              <div key={benefit.title} className="flex gap-4">
                <div className="shrink-0">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Smartphone className="mx-auto h-12 w-12 text-primary mb-6" />
            <h2 className="text-3xl font-bold text-foreground mb-4">Listo para escalar tu negocio</h2>
            <p className="text-muted-foreground mb-8">
              Únete a cientos de negocios que ya están convirtiendo conversaciones en ventas
            </p>
            <Button size="lg" asChild>
              <Link href="/register">
                Comenzar Gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>2024 CRM WhatsApp. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
