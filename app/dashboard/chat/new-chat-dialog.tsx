"use client"



import React from "react"



import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"

import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogHeader,

  DialogTitle,

  DialogTrigger,

} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"

import { Plus, Search, MessageSquarePlus, UserPlus, Loader2, X, Users } from "lucide-react"

import { initiateChat, searchContactsAction } from "./actions"

import { useRouter } from "next/navigation"

import { ScrollArea } from "@/components/ui/scroll-area"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { motion, AnimatePresence } from "framer-motion"



interface NewChatDialogProps {

  userId: string;

}



export function NewChatDialog({ userId }: NewChatDialogProps) {

  const [open, setOpen] = useState(false)

  const [loading, setLoading] = useState(false)

  const router = useRouter()

 

  const [activeTab, setActiveTab] = useState<"search" | "new">("search")

  const [searchTerm, setSearchTerm] = useState("")

  const [searchResults, setSearchResults] = useState<any[]>([])

  const [selectedContact, setSelectedContact] = useState<any | null>(null)

  const [isSearching, setIsSearching] = useState(false)



  useEffect(() => {

    if (open && userId) {

        setSearchTerm("");

        loadContacts("");

    }

  }, [open, userId])



  useEffect(() => {

    const delayDebounceFn = setTimeout(() => {

       if (searchTerm.trim() !== "") {

           loadContacts(searchTerm)

       } else if (open && searchTerm === "") {

           loadContacts("")

       }

    }, 300)

    return () => clearTimeout(delayDebounceFn)

  }, [searchTerm])



const loadContacts = async (query: string) => {
      setIsSearching(true)
      const res = await searchContactsAction(query, userId)
      
      // 🔥 FILTRO MÁGICO: Limpiamos la lista de basura
      const filteredContacts = res.filter((contact: any) => {
          const phone = contact.phone || "";
          
          // 1. Ignoramos los IDs internos de WhatsApp (@lid)
          const isLid = phone.includes('@lid');
          // 2. Ignoramos los grupos (@g.us)
          const isGroup = phone.includes('@g.us');
          // 3. Ignoramos números con más de 14 dígitos (un número normal tiene entre 10 y 13)
          const isTooLong = phone.replace(/\D/g, '').length > 13; 
          
          return !isLid && !isGroup && !isTooLong;
      });

      setSearchResults(filteredContacts) // Guardamos la lista limpia
      setIsSearching(false)
  }



  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, mode: 'search' | 'new') => {

    e.preventDefault()

    setLoading(true)

   

    const formData = new FormData(e.currentTarget)

    formData.append("mode", mode)

   

    if (mode === 'search' && selectedContact) {

        formData.set("contactId", selectedContact.id)

        formData.set("phone", selectedContact.phone)

    }

   

    const res = await initiateChat(formData)

    setLoading(false)

   

    if (res.success) {

        setOpen(false)

        setSelectedContact(null)

        setSearchTerm("")

        router.push(`/dashboard/chat?id=${res.conversationId}`)

        router.refresh()

    } else {

        alert(`Error: ${res.error}`);

    }

  }



  const tabs = [

    { value: "search" as const, label: "Mis Contactos", icon: Users },

    { value: "new" as const, label: "Nuevo Numero", icon: UserPlus },

  ]



  return (

    <Dialog open={open} onOpenChange={setOpen}>

      <DialogTrigger asChild>

        <Button size="icon" variant="ghost" className="hover:bg-slate-100 rounded-xl">

          <Plus className="h-5 w-5" />

          <span className="sr-only">Nuevo chat</span>

        </Button>

      </DialogTrigger>

     

      <DialogContent className="sm:max-w-[520px] bg-white/95 backdrop-blur-2xl border-white/20 shadow-2xl rounded-3xl p-0 overflow-hidden">

       

        {/* Header con gradiente */}

        <div className="px-6 pt-6 pb-4">

          <DialogHeader>

            <DialogTitle className="text-xl font-bold text-slate-800">

              Iniciar conversacion

            </DialogTitle>

            <DialogDescription className="text-slate-500">

              Selecciona un contacto de tu lista o crea uno nuevo.

            </DialogDescription>

          </DialogHeader>

        </div>

       

        {/* Tabs Pill Style */}

        <div className="px-6 pb-4">

          <div className="flex bg-slate-100/80 rounded-xl p-1 gap-1">

            {tabs.map((tab) => (

              <button

                key={tab.value}

                type="button"

                onClick={() => { setActiveTab(tab.value); setSelectedContact(null); }}

                className={`

                  relative flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200

                  ${activeTab === tab.value

                    ? "bg-white text-slate-800 shadow-sm"

                    : "text-slate-500 hover:text-slate-700"

                  }

                `}

              >

                <tab.icon className="w-4 h-4" />

                <span>{tab.label}</span>

                {activeTab === tab.value && (

                  <motion.div

                    layoutId="activeDialogTab"

                    className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"

                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}

                  />

                )}

              </button>

            ))}

          </div>

        </div>



        {/* Content */}

        <div className="px-6 pb-6">

          <AnimatePresence mode="wait">

            {activeTab === "search" ? (

              <motion.div

                key="search"

                initial={{ opacity: 0, x: -10 }}

                animate={{ opacity: 1, x: 0 }}

                exit={{ opacity: 0, x: 10 }}

                transition={{ duration: 0.2 }}

              >

                <form onSubmit={(e) => handleSubmit(e, 'search')} className="space-y-4">

                  <input type="hidden" name="userId_frontend" value={userId} />



                  {!selectedContact ? (

                      <div className="space-y-3">

                          {/* Buscador Glassmorphism */}

                          <div className="relative">

                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

                            <Input

                                placeholder="Buscar en mi lista..."

                                className="pl-10 bg-slate-50/80 border-slate-200/60 rounded-xl h-11 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"

                                value={searchTerm}

                                onChange={(e) => setSearchTerm(e.target.value)}

                            />

                            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}

                          </div>



                          {/* Lista de Contactos */}

                          <div className="border border-slate-200/60 rounded-2xl overflow-hidden bg-white">

                              <div className="bg-gradient-to-r from-slate-50 to-white px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wide">

                                  Lista de Contactos ({searchResults.length})

                              </div>

                              <ScrollArea className="h-[280px]">

                                  {searchResults.length === 0 && !isSearching ? (

                                      <div className="text-center py-12 flex flex-col items-center">

                                          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">

                                            <Users className="w-7 h-7 text-slate-400" />

                                          </div>

                                          <p className="text-slate-500 text-sm font-medium">No se encontraron contactos.</p>

                                      </div>

                                  ) : (

                                      <div className="p-2 space-y-1">

                                          {searchResults.map((contact, index) => (

                                              <motion.div

                                                key={contact.id}

                                                initial={{ opacity: 0, y: 5 }}

                                                animate={{ opacity: 1, y: 0 }}

                                                transition={{ delay: index * 0.03 }}

                                                onClick={() => setSelectedContact(contact)}

                                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-100 group"

                                              >

                                                  <Avatar className="h-10 w-10 border-2 border-white shadow-md">

                                                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold">

                                                          {contact.name?.substring(0,2).toUpperCase() || "#"}

                                                      </AvatarFallback>

                                                  </Avatar>

                                                  <div className="flex-1 overflow-hidden">

                                                      <p className="font-semibold text-sm truncate text-slate-700 group-hover:text-slate-900">

                                                          {contact.name || "Sin Nombre"}

                                                      </p>

                                                      <p className="text-xs text-slate-500">{contact.phone}</p>

                                                  </div>

                                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">

                                                    <div className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg">

                                                      Seleccionar

                                                    </div>

                                                  </div>

                                              </motion.div>

                                          ))}

                                      </div>

                                  )}

                              </ScrollArea>

                          </div>

                      </div>

                  ) : (

                      /* Contacto Seleccionado */

                      <motion.div

                        initial={{ opacity: 0, scale: 0.95 }}

                        animate={{ opacity: 1, scale: 1 }}

                        className="bg-gradient-to-br from-blue-50/80 to-white border border-blue-100 rounded-2xl p-5"

                      >

                          <div className="flex justify-between items-start mb-5">

                              <div className="flex items-center gap-4">

                                  <Avatar className="h-14 w-14 border-2 border-white shadow-lg">

                                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-lg font-bold">

                                          {selectedContact.name?.substring(0,2).toUpperCase()}

                                      </AvatarFallback>

                                  </Avatar>

                                  <div>

                                      <p className="font-bold text-lg text-slate-800">{selectedContact.name}</p>

                                      <p className="text-sm text-slate-500">{selectedContact.phone}</p>

                                  </div>

                              </div>

                              <Button

                                variant="ghost"

                                size="icon"

                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"

                                onClick={() => setSelectedContact(null)}

                                type="button"

                              >

                                  <X className="h-5 w-5" />

                              </Button>

                          </div>



                          <div className="space-y-2">

                              <Label className="text-slate-700 font-semibold">Escribe tu mensaje</Label>

                              <Textarea

                                id="message-search"

                                name="message"

                                placeholder={`Hola ${selectedContact.name}, te escribo para...`}

                                required={!!selectedContact}

                                className="min-h-[100px] border-slate-200/60 focus-visible:ring-blue-500/30 bg-white rounded-xl resize-none"

                                autoFocus

                              />

                          </div>

                      </motion.div>

                  )}



                  <input type="hidden" name="contactId" value={selectedContact?.id || ""} />



                  {selectedContact && (

                      <Button

                        type="submit"

                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black shadow-xl shadow-slate-900/20 rounded-xl"

                        disabled={loading}

                      >

                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <MessageSquarePlus className="w-5 h-5 mr-2" />}

                        Enviar Mensaje

                      </Button>

                  )}

                </form>

              </motion.div>

            ) : (

              <motion.div

                key="new"

                initial={{ opacity: 0, x: 10 }}

                animate={{ opacity: 1, x: 0 }}

                exit={{ opacity: 0, x: -10 }}

                transition={{ duration: 0.2 }}

              >

                <form onSubmit={(e) => handleSubmit(e, 'new')} className="space-y-4">

                  <input type="hidden" name="userId_frontend" value={userId} />



                  <div className="grid grid-cols-2 gap-4">

                      <div className="space-y-2">

                        <Label htmlFor="phone" className="text-slate-700 font-medium">Telefono</Label>

                        <Input

                          id="phone"

                          name="phone"

                          placeholder="549..."

                          required

                          className="bg-slate-50/80 border-slate-200/60 rounded-xl h-11 focus:bg-white focus:ring-2 focus:ring-blue-500/20"

                        />

                      </div>

                      <div className="space-y-2">

                        <Label htmlFor="name" className="text-slate-700 font-medium">Nombre</Label>

                        <Input

                          id="name"

                          name="name"

                          placeholder="Juan Perez"

                          required

                          className="bg-slate-50/80 border-slate-200/60 rounded-xl h-11 focus:bg-white focus:ring-2 focus:ring-blue-500/20"

                        />

                      </div>

                  </div>

                 

                  <div className="space-y-2">

                    <Label htmlFor="message" className="text-slate-700 font-medium">Mensaje</Label>

                    <Textarea

                      id="message"

                      name="message"

                      placeholder="Hola..."

                      required

                      className="min-h-[100px] bg-slate-50/80 border-slate-200/60 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 resize-none"

                    />

                  </div>

                 

                  <Button

                    type="submit"

                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black shadow-xl shadow-slate-900/20 rounded-xl"

                    disabled={loading}

                  >

                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <MessageSquarePlus className="w-5 h-5 mr-2" />}

                    Crear y Enviar

                  </Button>

                </form>

              </motion.div>

            )}

          </AnimatePresence>

        </div>

      </DialogContent>

    </Dialog>

  )

}
