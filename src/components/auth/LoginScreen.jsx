import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Store, ShieldCheck, Mail, Lock, User, AlertCircle, LogIn } from 'lucide-react'

export default function LoginScreen() {
  const { signIn, signUp, inactivityMessage, clearInactivityMessage } = useAuth()
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('Secretario de Hacienda')
  const [cargo, setCargo] = useState('Secretario de Hacienda')
  const [rol, setRol] = useState('admin')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

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
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Credenciales incorrectas o error en la autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_55%)] pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative z-10">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-7 text-white text-center border-b border-slate-800">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-900/40 mb-3">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">Hacienda Mercado Palmira</h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acceso Restringido • Autenticación Obligatoria</span>
          </p>
        </div>

        {/* Form */}
        <div className="p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">
              {isRegistering ? 'Registrar Administrador' : 'Iniciar Sesión'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingresa con tu cuenta autorizada de Supabase para acceder a las cajas, cobros y registros.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {inactivityMessage && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                  <span className="font-semibold">{inactivityMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={clearInactivityMessage}
                  className="text-amber-700 hover:text-amber-950 font-bold text-[11px] shrink-0"
                >
                  OK
                </button>
              </div>
            )}

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
                      placeholder="Ej. Secretario de Hacienda"
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
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Autenticando...' : isRegistering ? 'Crear Cuenta' : 'Ingresar al Sistema'}</span>
            </button>

            <div className="text-center pt-1">
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
        </div>
      </div>
    </div>
  )
}
