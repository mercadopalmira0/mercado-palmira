import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ShieldCheck, Mail, Lock, User, Briefcase, X, AlertCircle } from 'lucide-react'

export default function AuthModal({ isOpen, onClose }) {
  const { signIn, signUp, user, profile, signOut } = useAuth()
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('Secretario de Hacienda')
  const [cargo, setCargo] = useState('Secretario de Hacienda')
  const [rol, setRol] = useState('admin')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    try {
      if (isRegistering) {
        await signUp(email, password, nombre, cargo, rol)
        setSuccessMsg('¡Usuario creado con éxito! Ya puedes iniciar sesión.')
        setIsRegistering(false)
      } else {
        await signIn(email, password)
        setSuccessMsg('¡Sesión iniciada correctamente!')
        setTimeout(() => {
          onClose()
        }, 600)
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Error en la autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="shrink-0 bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base leading-tight truncate">
                {user ? 'Sesión de Usuario' : isRegistering ? 'Crear Administrador' : 'Acceso al Sistema'}
              </h3>
              <p className="text-xs text-slate-400 truncate">Autenticación Supabase con RLS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {user ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Sesión Activa</p>
                <p className="text-base font-bold mt-1">{profile?.nombre || user.email}</p>
                <div className="mt-2 text-xs text-emerald-800 flex items-center gap-2">
                  <span>Rol: <strong className="capitalize">{profile?.rol || user.user_metadata?.rol || 'admin'}</strong></span>
                  <span>•</span>
                  <span>{user.email}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Tu usuario cuenta con los permisos necesarios para modificar socios, unidades de cobro, tarifas y saldos iniciales bajo las políticas de Row Level Security (RLS).
              </p>

              <button
                type="button"
                onClick={async () => {
                  await signOut()
                  onClose()
                }}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs">
                  {successMsg}
                </div>
              )}

              {isRegistering && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej. Dennar Huarachi"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo</label>
                      <input
                        type="text"
                        value={cargo}
                        onChange={(e) => setCargo(e.target.value)}
                        placeholder="Secretario Hacienda"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Rol</label>
                      <select
                        value={rol}
                        onChange={(e) => setRol(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="admin">Admin (Total)</option>
                        <option value="directiva">Directiva (Lectura)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hacienda.mercadopalmira@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-emerald-900/20"
              >
                {loading ? 'Procesando...' : isRegistering ? 'Crear Cuenta y Asignar Rol' : 'Iniciar Sesión'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering)
                    setErrorMsg('')
                  }}
                  className="text-xs text-emerald-600 hover:underline font-medium"
                >
                  {isRegistering
                    ? '¿Ya tienes cuenta? Inicia sesión aquí'
                    : '¿Primer arranque? Crea aquí tu usuario Administrador'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
