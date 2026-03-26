"use client"

import React from "react"
import { motion } from "framer-motion"
import { Bot, Plus, Pencil, Trash2, ChevronRight, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Chatbot {
  id: string
  nombre: string
  color: string
  created_at: Date
}

interface ChatbotListProps {
  chatbots: Chatbot[]
  onCreateClick: () => void
  onEditClick: (bot: Chatbot) => void
  onDeleteClick: (botId: string) => void
}

export function ChatbotList({ chatbots, onCreateClick, onEditClick, onDeleteClick }: ChatbotListProps) {
  if (chatbots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/40 backdrop-blur-md rounded-3xl border border-dashed border-slate-300">
        <div className="p-4 bg-violet-100 rounded-full mb-4">
          <Bot className="h-10 w-10 text-violet-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">No tienes Chatbots creados</h3>
        <p className="text-slate-500 mb-6">Crea departamentos para organizar tus flujos de atención automática.</p>
        <Button onClick={onCreateClick} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-8 shadow-lg shadow-violet-200">
          <Plus className="mr-2 h-5 w-5" /> Crear mi primer Bot
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Departamentos & Chatbots</h2>
        <Button onClick={onCreateClick} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> Agregar Bot
        </Button>
      </div>

      <div className="grid gap-3">
        {chatbots.map((bot, index) => (
          <motion.div
            key={bot.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group flex items-center justify-between p-5 bg-white/60 backdrop-blur-md border border-white/20 rounded-2xl hover:bg-white/80 transition-all cursor-pointer shadow-sm hover:shadow-md"
            onClick={() => onEditClick(bot)}
          >
            <div className="flex items-center gap-4">
              <div 
                className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-inner"
                style={{ backgroundColor: bot.color }}
              >
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-lg">{bot.nombre}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                   <Badge variant="outline" className="text-[10px] bg-white/50 text-slate-500 border-slate-200">
                     ID: {bot.id.split('_')[1]?.substring(0,6)}
                   </Badge>
                   <span className="text-[11px] text-slate-400">Creado: {new Date(bot.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                onClick={(e) => { e.stopPropagation(); onEditClick(bot); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50"
                onClick={(e) => { e.stopPropagation(); onDeleteClick(bot.id); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-violet-500 transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
