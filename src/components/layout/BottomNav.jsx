import React from 'react'
import { NAVIGATION_ITEMS } from './navigation'
import { useAuth } from '../../context/AuthContext'

export default function BottomNav({ currentTab, onSelectTab }) {
  const { isAdmin } = useAuth()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1 py-1 shadow-lg">
      <div className="flex items-center justify-around overflow-x-auto no-scrollbar">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = currentTab === item.id
          const isAdminOnly = item.id === 'bitacora'

          if (isAdminOnly && !isAdmin) {
            return null
          }

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[52px] py-1.5 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive ? 'bg-emerald-500/20' : 'bg-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] mt-0.5 leading-tight truncate max-w-[56px] text-center">
                {item.id === 'inicio' ? 'Inicio' : item.id === 'afiliaciones' ? 'Afiliac.' : item.id === 'rendicion' ? 'Rendic.' : item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
