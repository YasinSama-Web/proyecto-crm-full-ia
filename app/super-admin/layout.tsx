export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  // Quitamos la redirección de aquí para que el login pueda cargar
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  )
}
