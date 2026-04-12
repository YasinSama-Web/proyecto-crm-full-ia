"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, PackageSearch, Search, Edit2, Trash2, Box, 
  DollarSign, Package, Download, Upload, CheckSquare, 
  X, Copy, Lightbulb, AlertTriangle, BookOpen, 
  Link as LinkIcon, Star, Sparkles, TrendingUp, Calendar, Bot, User, BarChart3, CreditCard,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import Swal from "sweetalert2"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

// ==========================================
// INTERFACES
// ==========================================
interface Product {
  id: string
  sku: string
  nombre: string
  precio: number
  stock: number
  categoria: string
  descripcion_corta: string
  palabras_clave: string
  activo: boolean
  talle?: string
  color?: string
  medidas?: string
  marca?: string
  material?: string
  prioritario?: boolean
}

interface Catalogo {
  id?: string
  categoria: string
  url: string
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [catalogos, setCatalogos] = useState<Catalogo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<any[] | null>(null)
  const [showCatalogsModal, setShowCatalogsModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ESTADOS PARA VENTAS
  const [activeTab, setActiveTab] = useState("catalogo")
  const [salesDateRange, setSalesDateRange] = useState("7d")
  const [salesData, setSalesData] = useState<any>(null)
  const [loadingSales, setLoadingSales] = useState(false)

  // ==========================================
  // CARGA DE DATOS (CORREGIDO)
  // ==========================================
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [resProd, resCat] = await Promise.all([
        fetch('/api/products').catch(() => fetch('/api/productos')), 
        fetch('/api/catalogos').catch(() => null)
      ])
      
      if (resProd && resProd.ok) {
        const dataProd = await resProd.json()
        const arrayProductos = dataProd.productos || dataProd.products || (Array.isArray(dataProd) ? dataProd : [])
        setProducts(arrayProductos)
      }
      
      if (resCat?.ok) {
        const dataCat = await resCat.json()
        setCatalogos(Array.isArray(dataCat) ? dataCat : [])
      }
    } catch (e) {
      console.error("Error cargando datos:", e)
      Swal.fire("Error", "No se pudo cargar el catálogo", "error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Carga de datos de ventas
  const loadSalesData = useCallback(async () => {
    if (activeTab !== "ventas") return;
    setLoadingSales(true);
    try {
      const res = await fetch(`/api/products/sales-metrics?range=${salesDateRange}`);
      if (res.ok) setSalesData(await res.json());
    } catch (error) {
      console.error("Error cargando métricas:", error);
    } finally {
      setLoadingSales(false);
    }
  }, [activeTab, salesDateRange]);

  useEffect(() => { loadSalesData() }, [loadSalesData]);

  // ==========================================
  // FILTRADO Y VARIABLES DERIVADAS
  // ==========================================
  const filtered = products.filter(p => 
    p.nombre?.toLowerCase().includes(search.toLowerCase()) || 
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(search.toLowerCase())
  )

  const uniqueCategories = Array.from(new Set(products.map(p => p.categoria))).filter(Boolean).sort()

  const countPrioritariosPorCategoria = (categoria: string) => {
    return products.filter(p => p.categoria === categoria && p.prioritario).length
  }

  // ==========================================
  // HANDLERS ORIGINALES RESTAURADOS
  // ==========================================
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filtered.map(p => p.id))
    else setSelectedIds([])
  }

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleTogglePrioridad = async (product: Product) => {
    const categoria = product.categoria
    const currentCount = countPrioritariosPorCategoria(categoria)
    
    if (!product.prioritario && currentCount >= 3) {
      Swal.fire({ icon: 'warning', title: 'Límite alcanzado', text: `Solo puedes tener 3 productos estrella en "${categoria}". Desmarca uno primero.`, confirmButtonColor: '#3b82f6' })
      return
    }

    try {
      // Ajusta la ruta a /api/productos si es necesario
      const res = await fetch(`/api/products/${product.id}/prioridad`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prioritario: !product.prioritario })
      }).catch(() => fetch(`/api/productos/${product.id}/prioridad`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prioritario: !product.prioritario })
      }))

      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, prioritario: !product.prioritario } : p))
        if (!product.prioritario) {
          Swal.fire({ icon: 'success', title: '⭐ Producto destacado', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false })
        }
      }
    } catch (e) { Swal.fire("Error", "No se pudo actualizar la prioridad", "error") }
  }

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({ title: '¿Eliminar producto?', text: "Esta acción quitará el producto del catálogo de la IA permanentemente.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' })
    if (res.isConfirmed) {
      try {
        const response = await fetch(`/api/products/${id}`, { method: 'DELETE' }).catch(() => fetch(`/api/productos/${id}`, { method: 'DELETE' }))
        if (response.ok) {
          setProducts(prev => prev.filter(p => p.id !== id))
          setSelectedIds(prev => prev.filter(i => i !== id))
          Swal.fire({ icon: 'success', title: 'Producto eliminado', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false })
        } else throw new Error()
      } catch (e) { Swal.fire("Error", "No se pudo eliminar el producto", "error") }
    }
  }

  const handleBulkDelete = async () => {
    const res = await Swal.fire({ title: `¿Eliminar ${selectedIds.length} productos?`, text: "Esta acción no se puede deshacer.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' })
    if (res.isConfirmed) {
      try {
        await fetch('/api/products/bulk', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ids: selectedIds }) }).catch(() => fetch('/api/productos/bulk', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ids: selectedIds }) }))
        setSelectedIds([])
        loadData()
        Swal.fire({ icon: 'success', title: 'Productos eliminados', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false })
      } catch(e) { Swal.fire('Error', 'No se pudieron eliminar los productos.', 'error') }
    }
  }

  const handleDuplicate = (prod: Product) => {
    handleAddOrEdit({ ...prod, id: undefined as any, sku: prod.sku ? `${prod.sku}-COPIA` : '', nombre: `${prod.nombre} (Copia)`, prioritario: false })
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !current }) }).catch(() => fetch(`/api/productos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !current }) }))
      if (res.ok) setProducts(prev => prev.map(p => p.id === id ? { ...p, activo: !current } : p))
    } catch (e) { Swal.fire("Error", "No se pudo actualizar el estado", "error") }
  }

  const showAIEducationModal = () => {
    Swal.fire({
      title: '🧠 ¿Cómo "Piensa" la IA Caleb?',
      width: '42em',
      html: `
        <div class="text-left text-sm text-slate-600 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 class="font-bold text-amber-700 flex items-center gap-2 mb-2"><span class="text-xl">⭐</span> NUEVO: Productos Estrella</h4>
            <p class="text-xs text-slate-700">Marca hasta <strong>3 productos por categoría</strong> con la estrella. Estos serán los primeros que la IA mostrará antes de ofrecer el catálogo PDF.</p>
          </div>
          <p>Para que Caleb venda como un experto y reserve tu stock sin errores, <strong>necesita datos claros y exactos</strong>.</p>
          <div class="bg-red-50 border border-red-200 rounded-xl p-4">
            <h4 class="font-bold text-red-700 flex items-center gap-2 mb-2">❌ EL DESASTRE (Cómo NO cargar)</h4>
            <p class="text-xs mb-2">Imagina que cargas 5 productos llamándolos solo "Zapatillas Nike".</p>
            <ul class="text-xs space-y-1 text-red-600 mb-2 font-mono bg-white/50 p-2 rounded">
              <li>❌ SKU: 001 | Nombre: Zapatillas Nike</li>
              <li>❌ SKU: 002 | Nombre: Zapatillas Nike</li>
            </ul>
          </div>
          <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <h4 class="font-bold text-emerald-700 flex items-center gap-2 mb-2">✅ EL ÉXITO (El "Embudo Descriptivo")</h4>
            <p class="text-xs mb-2">Usa esta fórmula: <strong>[Tipo] + [Marca] + [Modelo] + [Género/Uso]</strong>.</p>
            <ul class="text-xs space-y-1 text-emerald-700 mb-2 font-mono bg-white/50 p-2 rounded">
              <li>✅ SKU: NIK-RUN-01 | Nombre: Zapatillas Nike Revolution Running Mujer</li>
              <li>✅ SKU: NIK-URB-02 | Nombre: Zapatillas Nike Dunk Urbanas Hombre</li>
            </ul>
          </div>
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 class="font-bold text-blue-700 mb-1">🔑 El Poder de las Palabras Clave</h4>
            <p class="text-xs text-slate-700">En el campo "Palabras Clave", pon sinónimos y modismos.</p>
            <p class="text-xs font-mono mt-1 text-blue-600 bg-white/50 p-1 rounded">Ej: llantas tenis deportivas trotar gym</p>
          </div>
        </div>
      `,
      confirmButtonText: '¡Entendido!',
      confirmButtonColor: '#2563eb',
    })
  }

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,SKU,Nombre,Precio,Stock,Categoria,Descripcion,Palabras_Clave\nNIK-RUN-01,Zapatillas Nike Revolution Running Mujer,45000,10,Calzado,Zapatillas deportivas súper livianas ideales para asfalto.,llantas tenis altas correr gym\nREM-ALG-02,Remera Básica Oversize Negra,15000,50,Ropa,Remera 100% algodón peinado pesada.,remera lisa negra tshit algodon"
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "plantilla_productos.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(l => l.trim().length > 0)
      const items = lines.slice(1).map(line => {
        const values = line.split(',')
        return {
          SKU: values[0]?.trim() || "",
          Nombre: values[1]?.trim() || "",
          Precio: values[2]?.trim() || "0",
          Stock: values[3]?.trim() || "0",
          Categoria: values[4]?.trim() || "",
          Descripcion: values[5]?.trim() || "",
          Palabras_Clave: values[6]?.trim() || ""
        }
      }).filter(item => item.SKU && item.Nombre)
      
      if (items.length > 0) setPreviewData(items)
      else Swal.fire("Error", "El archivo CSV está vacío o tiene formato incorrecto", "error")
      
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsText(file)
  }

  const confirmImport = async () => {
    if (!previewData || previewData.length === 0) return
    Swal.fire({ title: 'Importando Catálogo...', text: `Sincronizando ${previewData.length} productos con la IA`, allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })

    try {
      const res = await fetch('/api/products/bulk', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: previewData }) }).catch(() => fetch('/api/productos/bulk', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: previewData }) }))
      const data = await res.json()
      if (data.success) {
        Swal.fire({ icon: 'success', title: '¡Importación Exitosa!', text: `Se sincronizaron ${data.procesados} productos con la IA.` })
        setPreviewData(null)
        loadData()
      } else throw new Error(data.error || "Error desconocido")
    } catch (err: any) { Swal.fire('Error', err.message || 'Hubo un problema al importar el archivo.', 'error') }
  }

  const saveCatalogLink = async (categoria: string, url: string) => {
    if (!url.trim()) return Swal.fire("Campo vacío", "Por favor ingresa una URL válida", "warning")
    try {
      const res = await fetch('/api/catalogos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoria, url }) })
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Link Guardado', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false })
        loadData()
      } else throw new Error()
    } catch (error) { Swal.fire('Error', 'No se pudo guardar el link', 'error') }
  }

  const handleAddOrEdit = async (prod?: Product) => {
    const catOptions = uniqueCategories.map(c => `<option value="${c}" ${prod?.categoria === c ? 'selected' : ''}>${c}</option>`).join('')
    const isCustomCat = prod?.categoria && !uniqueCategories.includes(prod.categoria)

    const { value: formValues } = await Swal.fire({
      title: prod ? 'Editar Producto' : 'Nuevo Producto',
      html: `
        <div class="space-y-4 text-left px-2 mt-4 max-h-[70vh] overflow-y-auto">
            <div class="grid grid-cols-3 gap-4">
               <div class="col-span-1">
                 <label class="text-[10px] font-bold text-slate-500 uppercase">SKU (ÚNICO) *</label>
                 <input id="p-sku" class="swal2-input !m-0 !w-full !text-sm border-blue-400" placeholder="Ej: REM-ROJ" value="${prod?.sku || ''}" />
               </div>
               <div class="col-span-2">
                 <label class="text-[10px] font-bold text-slate-500 uppercase">Nombre Descriptivo *</label>
                 <input id="p-nombre" class="swal2-input !m-0 !w-full !text-sm" placeholder="Ej: Remera Básica Negra Hombre" value="${prod?.nombre || ''}" />
               </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
               <div>
                 <label class="text-[10px] font-bold text-slate-500 uppercase">Precio ($) *</label>
                 <input id="p-precio" type="number" class="swal2-input !m-0 !w-full !text-sm" value="${prod?.precio || ''}" />
               </div>
               <div>
                 <label class="text-[10px] font-bold text-slate-500 uppercase">Stock Físico</label>
                 <input id="p-stock" type="number" class="swal2-input !m-0 !w-full !text-sm" value="${prod?.stock || '0'}" />
               </div>
            </div>

            <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
               <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Variantes y Atributos (Opcional)</p>
               <div class="grid grid-cols-3 gap-2">
                 <div>
                   <label class="text-[9px] font-bold text-slate-500 uppercase">Talle</label>
                   <input id="p-talle" class="swal2-input !m-0 !w-full !text-sm !h-8" placeholder="S, 40..." value="${prod?.talle || ''}" />
                 </div>
                 <div>
                   <label class="text-[9px] font-bold text-slate-500 uppercase">Color</label>
                   <input id="p-color" class="swal2-input !m-0 !w-full !text-sm !h-8" placeholder="Rojo..." value="${prod?.color || ''}" />
                 </div>
                 <div>
                   <label class="text-[9px] font-bold text-slate-500 uppercase">Marca</label>
                   <input id="p-marca" class="swal2-input !m-0 !w-full !text-sm !h-8" placeholder="Nike..." value="${prod?.marca || ''}" />
                 </div>
               </div>
            </div>

            <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
               <label class="text-[10px] font-bold text-slate-500 uppercase">Categoría</label>
               <select id="p-cat-select" class="swal2-select !m-0 !w-full !text-sm !h-10 !flex !px-3">
                  ${uniqueCategories.length > 0 ? catOptions : '<option value="" disabled>No hay categorías aún</option>'}
                  <option value="__NEW__" ${isCustomCat || uniqueCategories.length === 0 ? 'selected' : ''}>✨ + Crear nueva categoría...</option>
               </select>
               <input id="p-cat-new" class="swal2-input !m-0 !w-full !text-sm !mt-2 border-dashed border-blue-300 bg-blue-50" placeholder="Nombre de la nueva categoría" style="display: ${isCustomCat || uniqueCategories.length === 0 ? 'block' : 'none'};" value="${isCustomCat ? prod?.categoria : ''}" />
            </div>

            <div>
               <label class="text-[10px] font-bold text-slate-500 uppercase">Palabras Clave (Sinónimos p/ IA)</label>
               <input id="p-keys" class="swal2-input !m-0 !w-full !text-sm" placeholder="Ej: remera chomba tshit basica" value="${prod?.palabras_clave || ''}" />
            </div>
            <div>
               <label class="text-[10px] font-bold text-slate-500 uppercase">Argumento de Venta IA</label>
               <textarea id="p-desc" class="swal2-textarea !m-0 !w-full !h-16 text-sm" placeholder="Info que la IA usará para convencer al cliente...">${prod?.descripcion_corta || ''}</textarea>
            </div>
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'Guardar Producto', confirmButtonColor: '#3b82f6', width: '36em',
      preConfirm: () => {
        const catSelect = (document.getElementById('p-cat-select') as HTMLSelectElement).value
        const catNew = (document.getElementById('p-cat-new') as HTMLInputElement).value
        return {
          sku: (document.getElementById('p-sku') as HTMLInputElement).value,
          nombre: (document.getElementById('p-nombre') as HTMLInputElement).value,
          precio: (document.getElementById('p-precio') as HTMLInputElement).value,
          stock: (document.getElementById('p-stock') as HTMLInputElement).value,
          categoria: catSelect === '__NEW__' ? catNew : catSelect || 'General',
          palabras_clave: (document.getElementById('p-keys') as HTMLInputElement).value,
          descripcion_corta: (document.getElementById('p-desc') as HTMLTextAreaElement).value,
          talle: (document.getElementById('p-talle') as HTMLInputElement).value,
          color: (document.getElementById('p-color') as HTMLInputElement).value,
          marca: (document.getElementById('p-marca') as HTMLInputElement).value,
        }
      }
    })

    if (formValues) {
      if (!formValues.nombre || !formValues.precio) return Swal.fire("Error", "Nombre y precio son obligatorios", "warning")
      Swal.showLoading()
      try {
        const res = await fetch(prod ? `/api/products/${prod.id}` : '/api/products', { method: prod ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formValues) }).catch(() => fetch(prod ? `/api/productos/${prod.id}` : '/api/productos', { method: prod ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formValues) }))
        
        if (res && res.ok) {
          Swal.fire({ icon: 'success', title: 'Guardado', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false })
          loadData()
        } else {
          throw new Error("Error al guardar")
        }
      } catch (e: any) { Swal.fire("Error", e.message || "No se pudo guardar", "error") }
    }
  }

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2"><PackageSearch className="text-blue-600" /> Motor E-commerce</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Control de inventario y auditoría de ventas IA.</p>
        </div>
        
        <Tabs defaultValue="catalogo" className="w-full md:w-auto" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 rounded-xl">
            <TabsTrigger value="catalogo" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm font-bold"><Box className="w-4 h-4 mr-2" /> Catálogo</TabsTrigger>
            <TabsTrigger value="ventas" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm font-bold"><TrendingUp className="w-4 h-4 mr-2" /> Ventas & IA</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* PESTAÑA: CATÁLOGO */}
      {activeTab === "catalogo" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 w-full bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <Button onClick={() => setShowCatalogsModal(true)} variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 flex-1 sm:flex-none"><BookOpen className="w-4 h-4 mr-2" /> PDFs / Links</Button>
            <Button onClick={downloadTemplate} variant="outline" className="border-slate-300 text-slate-600 hidden sm:flex"><Download className="w-4 h-4 mr-2" /> Plantilla CSV</Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 flex-1 sm:flex-none"><Upload className="w-4 h-4 mr-2" /> Importar</Button>
            <Button onClick={() => handleAddOrEdit()} className="bg-blue-600 hover:bg-blue-700 shadow-md flex-1 sm:flex-none ml-auto"><Plus className="w-4 h-4 mr-2" /> Crear Producto</Button>
          </div>

          <div onClick={showAIEducationModal} className="cursor-pointer group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 shadow-md hover:shadow-lg transition-all">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-white">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm"><Lightbulb className="w-8 h-8 text-yellow-300" /></div>
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">Aprende a vender más con Caleb AI <Sparkles className="w-4 h-4 text-yellow-300" /></h3>
                  <p className="text-blue-100 text-sm mt-1 max-w-2xl">Descubre cómo nombrar tus productos y usar <span className="font-bold text-yellow-300">⭐ Estrella</span> para la IA. <span className="underline font-semibold text-white">Ver guía</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* MODAL CATÁLOGOS PDF (RESTAURADO) */}
          <AnimatePresence>
            {showCatalogsModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><BookOpen className="text-indigo-600 w-5 h-5"/> Catálogos Externos (PDF/Web)</h3>
                      <p className="text-xs text-slate-500 mt-1">Si tienes muchos productos, la IA enviará estos links cuando el cliente quiera ver más opciones.</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setShowCatalogsModal(false)} className="rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600"><X className="w-5 h-5" /></Button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                    {uniqueCategories.length === 0 ? (
                      <div className="text-center py-10 text-slate-400"><BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" /> Primero crea productos con categorías para asignarles un catálogo.</div>
                    ) : (
                      uniqueCategories.map(cat => {
                        const catGuardado = catalogos.find(c => c.categoria === cat)
                        const countPrioritarios = countPrioritariosPorCategoria(cat)
                        return (
                          <div key={cat} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="w-full sm:w-1/3">
                              <Badge variant="secondary" className="text-sm px-3 py-1 bg-slate-100 text-slate-700">{cat}</Badge>
                              <p className="text-xs text-slate-400 mt-1">{countPrioritarios}/3 productos estrella</p>
                            </div>
                            <div className="w-full sm:w-2/3 flex gap-2">
                              <div className="relative flex-1">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input id={`link-${cat}`} defaultValue={catGuardado?.url || ''} placeholder="https://drive.google.com/... o tudominio.com/catálogo" className="pl-9 h-10 text-sm" />
                              </div>
                              <Button onClick={() => saveCatalogLink(cat, (document.getElementById(`link-${cat}`) as HTMLInputElement)?.value || '')} className="bg-indigo-600 hover:bg-indigo-700">Guardar</Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PREVIEW IMPORTACIÓN (RESTAURADO) */}
          <AnimatePresence>
            {previewData && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-amber-800 flex items-center gap-2"><Upload className="w-5 h-5" /> Vista previa de importación ({previewData.length} productos)</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPreviewData(null)} className="border-amber-300 text-amber-700">Cancelar</Button>
                    <Button onClick={confirmImport} className="bg-amber-600 hover:bg-amber-700 text-white">Confirmar Importación</Button>
                  </div>
                </div>
                <div className="bg-white rounded-xl overflow-hidden border border-amber-200 max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-100 text-amber-800">
                      <tr><th className="px-4 py-2 text-left">SKU</th><th className="px-4 py-2 text-left">Nombre</th><th className="px-4 py-2 text-left">Precio</th><th className="px-4 py-2 text-left">Categoría</th></tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((item, idx) => (
                        <tr key={idx} className="border-b border-amber-100"><td className="px-4 py-2 font-mono text-xs">{item.SKU}</td><td className="px-4 py-2">{item.Nombre}</td><td className="px-4 py-2">${item.Precio}</td><td className="px-4 py-2">{item.Categoria}</td></tr>
                      ))}
                      {previewData.length > 5 && <tr><td colSpan={4} className="px-4 py-2 text-center text-amber-600 text-xs">... y {previewData.length - 5} productos más</td></tr>}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input placeholder="Buscar por SKU, nombre o categoría..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-12 rounded-xl border-slate-200 bg-white shadow-sm" />
            </div>
            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute right-0 h-12 bg-slate-800 rounded-xl px-4 flex items-center gap-4 shadow-lg z-10">
                  <span className="text-sm font-bold text-white"><CheckSquare className="w-4 h-4 inline mr-2 text-blue-400"/> {selectedIds.length} seleccionados</span>
                  <div className="w-px h-6 bg-slate-600"></div>
                  <Button size="sm" onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 text-white h-8 text-xs font-bold"><Trash2 className="w-3 h-3 mr-1" /> Borrar</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {loading ? (
            <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl border-dashed">
              <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700">Catálogo vacío</h3>
              <p className="text-slate-500 text-sm mt-1">Crea tu primer producto para que la IA empiece a vender.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
              <div className="hidden lg:flex items-center gap-4 px-4 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="w-6"><input type="checkbox" className="rounded border-slate-300 cursor-pointer" onChange={handleSelectAll} checked={selectedIds.length === filtered.length && filtered.length > 0} /></div>
                <div className="flex-1">Producto & Categoría</div>
                <div className="w-24 text-right">Precio</div>
                <div className="w-16 text-right">Stock</div>
                <div className="w-20 text-center">⭐ Estrella</div>
                <div className="w-32 text-center">Estado IA</div>
                <div className="w-24 text-center">Acciones</div>
              </div>

              <AnimatePresence>
                {filtered.map(product => {
                  const countCat = countPrioritariosPorCategoria(product.categoria)
                  const isMaxReached = countCat >= 3 && !product.prioritario
                  return (
                    <motion.div key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className={`flex flex-col lg:flex-row lg:items-center gap-4 p-3 rounded-xl transition-all border border-transparent hover:border-slate-100 ${product.activo ? 'hover:bg-slate-50' : 'opacity-60 bg-slate-50/50'} ${product.prioritario ? 'bg-amber-50/30 border-amber-100' : ''}`}>
                      <div className="hidden lg:flex items-center justify-center w-6">
                        <input type="checkbox" className="rounded border-slate-300 w-4 h-4 cursor-pointer" checked={selectedIds.includes(product.id)} onChange={() => handleSelectOne(product.id)} />
                      </div>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${product.stock > 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                          {product.stock > 0 ? <Package className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{product.nombre}</h4>
                            {product.sku && <Badge variant="outline" className="text-[9px] text-slate-400 font-mono py-0">{product.sku}</Badge>}
                            {product.prioritario && <Badge className="bg-amber-100 text-amber-700 text-[9px] border-0"><Star className="w-3 h-3 mr-1 fill-current" /> TOP</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 truncate flex items-center gap-2">
                            <span className="font-medium text-slate-600">{product.categoria}</span>
                            {product.palabras_clave && <span className="hidden md:inline-block text-[10px] text-slate-400 border-l border-slate-300 pl-2 truncate">{product.palabras_clave}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 flex-wrap lg:flex-nowrap">
                        <div className="text-left lg:text-right w-auto lg:w-24"><p className="font-bold text-emerald-600 text-sm flex items-center justify-end"><DollarSign className="w-3 h-3" />{product.precio.toLocaleString('es-AR')}</p></div>
                        <div className="text-left lg:text-right w-auto lg:w-16"><p className={`font-bold text-sm ${product.stock > 0 ? 'text-slate-700' : 'text-red-500'}`}>{product.stock}</p></div>
                        <div className="w-20 flex justify-center lg:border-x lg:border-slate-200 lg:px-2">
                          <button onClick={() => handleTogglePrioridad(product)} disabled={isMaxReached} className={`p-2 rounded-lg transition-all ${product.prioritario ? 'text-amber-500 bg-amber-100' : isMaxReached ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}>
                            <Star className={`w-5 h-5 ${product.prioritario ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                        <div className="w-32 flex justify-center">
                          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                            <Switch checked={product.activo} onCheckedChange={() => handleToggleActive(product.id, product.activo)} className="data-[state=checked]:bg-blue-600 scale-75" />
                            <span className="text-[10px] font-bold text-slate-500 w-10">{product.activo ? 'ACTIVO' : 'PAUSA'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 w-auto lg:w-24 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleAddOrEdit(product)} className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicate(product)} className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><Copy className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* PESTAÑA: MÉTRICAS Y VENTAS */}
      {activeTab === "ventas" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 ml-2"><Calendar className="w-5 h-5 text-emerald-500" /> Rendimiento Global</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {[{ id: "today", label: "Hoy" }, { id: "yesterday", label: "Ayer" }, { id: "7d", label: "7 Días" }, { id: "30d", label: "Mes" }].map(btn => (
                <button key={btn.id} onClick={() => setSalesDateRange(btn.id)} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${salesDateRange === btn.id ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {loadingSales ? (
            <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-emerald-500" /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                  <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
                  <p className="text-emerald-100 font-medium text-sm flex items-center gap-2"><CreditCard className="w-4 h-4"/> Facturación Total</p>
                  <h2 className="text-4xl font-black mt-2">${salesData?.totalAmount?.toLocaleString('es-AR') || "0"}</h2>
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium bg-black/20 w-fit px-3 py-1.5 rounded-full">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-300" /> {salesData?.totalSalesCount || 0} Ventas concretadas
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-4">Cierres por Origen</p>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1"><div className="flex items-center gap-2 text-slate-700"><Bot className="w-4 h-4 text-blue-500" /> Caleb AI</div><p className="text-2xl font-black text-blue-600">${salesData?.aiAmount?.toLocaleString('es-AR') || "0"}</p></div>
                    <div className="h-10 w-px bg-slate-200"></div>
                    <div className="space-y-1"><div className="flex items-center gap-2 text-slate-700"><User className="w-4 h-4 text-orange-500" /> Humanos</div><p className="text-2xl font-black text-orange-600">${salesData?.humanAmount?.toLocaleString('es-AR') || "0"}</p></div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden flex">
                    <div className="h-full bg-blue-500" style={{ width: `${salesData?.aiPercentage || 0}%` }}></div>
                    <div className="h-full bg-orange-400" style={{ width: `${salesData?.humanPercentage || 0}%` }}></div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Automatización</p>
                    <h3 className="text-3xl font-black text-slate-800">{salesData?.aiPercentage || 0}%</h3>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">Del volumen de ventas fue cerrado en piloto automático.</p>
                  </div>
                  <div className="w-24 h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[{ name: 'IA', value: salesData?.aiPercentage || 0, color: '#3b82f6' }, { name: 'Humano', value: salesData?.humanPercentage || 100, color: '#f1f5f9' }]} innerRadius={30} outerRadius={45} dataKey="value" stroke="none">
                          {[{ color: '#3b82f6' }, { color: '#f1f5f9' }].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-indigo-500" /> Top Vendidos</h3>
                  <div className="space-y-4">
                    {salesData?.topProducts?.length > 0 ? salesData.topProducts.map((prod: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs">{idx + 1}</div>
                        <div className="flex-1 min-w-0"><p className="font-bold text-sm text-slate-700 truncate">{prod.nombre}</p><p className="text-xs text-slate-400 font-mono">{prod.sku}</p></div>
                        <div className="text-right"><p className="font-black text-slate-800">{prod.cantidad}x</p></div>
                      </div>
                    )) : <p className="text-sm text-slate-400 text-center py-4">No hay datos en este período.</p>}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col h-[400px]">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 shrink-0"><BookOpen className="w-5 h-5 text-slate-500" /> Historial de Transacciones</h3>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-white shadow-sm z-10 text-xs text-slate-500 uppercase">
                        <tr><th className="pb-3 pt-1">Fecha</th><th className="pb-3 pt-1">Cliente</th><th className="pb-3 pt-1">Origen</th><th className="pb-3 pt-1 text-right">Monto</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {salesData?.recentSales?.length > 0 ? salesData.recentSales.map((sale: any) => (
                          <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 text-slate-500">{new Date(sale.created_at).toLocaleDateString('es-AR', {day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'})}</td>
                            <td className="py-3 font-medium text-slate-700">{sale.contact_name || "Desconocido"}</td>
                            <td className="py-3">{sale.origen === 'ia' ? <Badge className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"><Bot className="w-3 h-3 mr-1" /> Caleb AI</Badge> : <Badge className="bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"><User className="w-3 h-3 mr-1" /> Humano</Badge>}</td>
                            <td className="py-3 text-right font-bold text-emerald-600">${Number(sale.amount).toLocaleString('es-AR')}</td>
                          </tr>
                        )) : <tr><td colSpan={4} className="text-center py-10 text-slate-400">Sin transacciones recientes</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}

    </div>
  )
}