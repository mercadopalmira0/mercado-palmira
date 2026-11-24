import React from 'react'
import { NAVIGATION_ITEMS } from './navigation'

export default function Sidebar({ currentTab, onSelectTab, role }) {
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-4 text-slate-300 select-none">
      <div className="px-3 py-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Módulos de Gestión
        </span>
      </div>

      <nav className="flex-1 space-y-1.5">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = currentTab === item.id
          const isAdminOnly = item.id === 'bitacora'

          if (isAdminOnly && role === 'directiva') {
            return (
              <div
                key={item.id}
                className="flex items-center px-3 py-2.5 rounded-xl text-xs text-slate-500 opacity-60 cursor-not-allowed border border-transparent"
                title="Módulo restringido únicamente a rol Admin por políticas RLS"
              >
                <Icon className="w-4 h-4 mr-3 text-slate-500" />
                <span className="truncate">{item.label}</span>
                <span className="ml-auto text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                  Bloqueado
                </span>
              </div>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon
                className={`w-5 h-5 mr-3 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 space-y-1 px-2">
        <p className="font-medium text-slate-400">Fase 1: Base & Esquema</p>
        <p className="text-[11px] text-slate-500">Supabase RLS activo • Costo $0/mes</p>
      </div>
    </aside>
  )
}
