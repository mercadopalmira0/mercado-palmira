import React from 'react'
import { Store, ShieldCheck, User, LogIn } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Header({ activeTabName, onOpenAuth }) {
  const { user, profile, isAdmin, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and App Title */}
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

        {/* User Session & Role */}
        <div className="flex items-center space-x-2.5">
          {user ? (
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-white truncate max-w-[140px]">
                  {profile?.nombre || user.email}
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1 font-semibold capitalize">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {profile?.rol || user.user_metadata?.rol || 'admin'}
                </span>
              </div>

              <button
                type="button"
                onClick={onOpenAuth}
                title="Administrar cuenta"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <User className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-900/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
