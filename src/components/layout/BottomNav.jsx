import React, { useState } from 'react'
import { NAVIGATION_ITEMS } from './navigation'
import { useAuth } from '../../context/AuthContext'
import { LayoutGrid, X } from 'lucide-react'

const PRIMARY_IDS = ['inicio', 'cobrar', 'socios', 'egresos']
const SECONDARY_IDS = ['deudores', 'afiliaciones', 'inventario', 'rendicion', 'bitacora']

const SHORT_LABELS = {
  inicio: 'Inicio',
  cobrar: 'Cobrar',
  socios: 'Socios',
  egresos: 'Egresos',
  deudores: 'Deudas',
  afiliaciones: 'Afiliaciones',
  inventario: 'Inventario',
  rendicion: 'Rendición',
  bitacora: 'Bitácora',
}

export default function BottomNav({ currentTab, onSelectTab }) {
  const { isAdmin } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)

  const primaryItems = PRIMARY_IDS.map((id) => NAVIGATION_ITEMS.find((it) => it.id === id)).filter(Boolean)
  const secondaryItems = SECONDARY_IDS.map((id) => NAVIGATION_ITEMS.find((it) => it.id === id))
    .filter(Boolean)
    .filter((it) => it.id !== 'bitacora' || isAdmin)

  const isSecondaryActive = secondaryItems.some((it) => it.id === currentTab)

  const handleSelect = (id) => {
    onSelectTab(id)
    setMoreOpen(false)
  }

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1.5 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] shadow-lg">
        <div className="grid grid-cols-5 items-center max-w-md mx-auto">
          {primaryItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                  isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-emerald-500/20' : 'bg-transparent'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                </div>
                <span className="text-[10px] mt-0.5 leading-tight truncate max-w-full text-center">
                  {SHORT_LABELS[item.id] || item.label}
                </span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              moreOpen || isSecondaryActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`relative p-1 rounded-lg transition-colors ${
                moreOpen || isSecondaryActive ? 'bg-emerald-500/20' : 'bg-transparent'
              }`}
            >
              <LayoutGrid
                className={`w-5 h-5 ${moreOpen || isSecondaryActive ? 'text-emerald-400' : 'text-slate-400'}`}
              />
              {isSecondaryActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-tight truncate max-w-full text-center">
              {isSecondaryActive ? SHORT_LABELS[currentTab] || 'Más' : 'Más'}
            </span>
          </button>
        </div>
      </nav>

      {/* Menú Emergente (Bottom Sheet) "Más" en móvil */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 overflow-hidden pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Más Módulos de Hacienda</h3>
                <p className="text-[11px] text-slate-400">Acceso rápido a todas las secciones</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-2 gap-2.5 max-h-[65dvh] overflow-y-auto overscroll-contain">
              {secondaryItems.map((item) => {
                const Icon = item.icon
                const isActive = currentTab === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isActive ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs block truncate">
                        {SHORT_LABELS[item.id] || item.label}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {isActive ? 'Sección activa' : 'Abrir módulo'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
