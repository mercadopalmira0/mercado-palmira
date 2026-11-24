import React from 'react'
import { Store, ShieldCheck, Smartphone, Eye } from 'lucide-react'

export default function Header({ activeTabName, role, onToggleRole }) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-md shadow-emerald-900/30">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                Hacienda Mercado Palmira
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PWA v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Secretaría de Hacienda • Control de Servicios y Afiliaciones
            </p>
          </div>
        </div>

        {/* Status / Role Tag */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={onToggleRole}
              title="Alternar vista entre Admin y Directiva (Simulación para verificación de permisos RLS)"
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md transition-all ${
                role === 'admin'
                  ? 'bg-emerald-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={onToggleRole}
              title="Modo solo lectura de la Directiva"
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md transition-all ${
                role === 'directiva'
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Directiva</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
