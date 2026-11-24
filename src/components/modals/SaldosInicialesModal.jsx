import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Wallet, CheckCircle2, AlertCircle, X, ShieldAlert, Calendar, FileText } from 'lucide-react'

export default function SaldosInicialesModal({ isOpen, onClose, onUpdated }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form state
  const [serviciosEfectivo, setServiciosEfectivo] = useState(0)
  const [serviciosQr, setServiciosQr] = useState(0)
  const [afiliacionesEfectivo, setAfiliacionesEfectivo] = useState(0)
  const [afiliacionesQr, setAfiliacionesQr] = useState(0)
  const [fechaArranque, setFechaArranque] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    if (!isOpen) return

    const loadSaldos = async () => {
      setLoading(true)
      setErrorMsg('')
      setSuccessMsg('')
      try {
        const { data, error } = await supabase.from('saldos_iniciales').select('*')
        if (error) throw error

        if (data && data.length > 0) {
          data.forEach((item) => {
            if (item.caja === 'servicios' && item.metodo_pago === 'efectivo') {
              setServiciosEfectivo(item.monto_inicial)
              if (item.fecha_arranque) setFechaArranque(item.fecha_arranque)
              if (item.observaciones) setObservaciones(item.observaciones)
            }
            if (item.caja === 'servicios' && item.metodo_pago === 'qr') {
              setServiciosQr(item.monto_inicial)
            }
            if (item.caja === 'afiliaciones' && item.metodo_pago === 'efectivo') {
              setAfiliacionesEfectivo(item.monto_inicial)
            }
            if (item.caja === 'afiliaciones' && item.metodo_pago === 'qr') {
              setAfiliacionesQr(item.monto_inicial)
            }
          })
        }
      } catch (err) {
        console.error('Error cargando saldos iniciales:', err)
        setErrorMsg('Error al leer saldos iniciales: ' + (err.message || 'Error desconocido'))
      } finally {
        setLoading(false)
      }
    }

    loadSaldos()
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSaving(true)

    const payload = [
      {
        caja: 'servicios',
        metodo_pago: 'efectivo',
        monto_inicial: parseFloat(serviciosEfectivo) || 0,
        fecha_arranque: fechaArranque,
        observaciones: observaciones.trim() || 'Arranque de Caja Servicios en Efectivo',
      },
      {
        caja: 'servicios',
        metodo_pago: 'qr',
        monto_inicial: parseFloat(serviciosQr) || 0,
        fecha_arranque: fechaArranque,
        observaciones: observaciones.trim() || 'Arranque de Caja Servicios en QR',
      },
      {
        caja: 'afiliaciones',
        metodo_pago: 'efectivo',
        monto_inicial: parseFloat(afiliacionesEfectivo) || 0,
        fecha_arranque: fechaArranque,
        observaciones: observaciones.trim() || 'Arranque de Caja Afiliaciones en Efectivo',
      },
      {
        caja: 'afiliaciones',
        metodo_pago: 'qr',
        monto_inicial: parseFloat(afiliacionesQr) || 0,
        fecha_arranque: fechaArranque,
        observaciones: observaciones.trim() || 'Arranque de Caja Afiliaciones en QR',
      },
    ]

    try {
      const { error } = await supabase
        .from('saldos_iniciales')
        .upsert(payload, { onConflict: 'caja,metodo_pago' })

      if (error) throw error

      setSuccessMsg('¡Saldos iniciales de arranque guardados con éxito en Supabase!')
      if (onUpdated) onUpdated()
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err) {
      console.error('Error guardando saldos iniciales:', err)
      const isRlsError = err.message?.includes('violates row-level security policy') || err.code === '42501'
      setErrorMsg(
        isRlsError
          ? 'Bloqueado por política RLS: debes iniciar sesión como Administrador para modificar los saldos iniciales.'
          : 'Error al guardar saldos iniciales: ' + (err.message || 'Error desconocido')
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Módulo de Arranque (Saldos Iniciales)</h3>
              <p className="text-xs text-slate-400">Configuración única de arranque para las dos cajas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {!user && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Para guardar cambios permanentes, asegúrate de haber iniciado sesión con el rol de <strong>Admin</strong>.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Caja 1: Servicios Básicos */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                1. Caja Servicios Básicos
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Cuotas, luz y multas</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Efectivo en Mano (Bs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={serviciosEfectivo}
                  onChange={(e) => setServiciosEfectivo(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Saldo en QR / Banco (Bs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={serviciosQr}
                  onChange={(e) => setServiciosQr(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Caja 2: Afiliaciones */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                2. Caja Afiliaciones
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Cuotas de nuevos socios</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Efectivo en Mano (Bs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={afiliacionesEfectivo}
                  onChange={(e) => setAfiliacionesEfectivo(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Saldo en QR / Banco (Bs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={afiliacionesQr}
                  onChange={(e) => setAfiliacionesQr(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Fecha y Observaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Fecha de Arranque
              </label>
              <input
                type="date"
                required
                value={fechaArranque}
                onChange={(e) => setFechaArranque(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Observaciones
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej. Saldo entregado por anterior directiva"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Guardando en Supabase...' : 'Guardar Saldos Iniciales'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
