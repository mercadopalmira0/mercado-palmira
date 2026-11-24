import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ArrowRightLeft, ArrowDownRight, ArrowUpRight, CheckCircle2, AlertCircle, X, ShieldAlert, Coins, QrCode } from 'lucide-react'

export default function MovimientoInternoModal({ isOpen, onClose, onMovementRegistered }) {
  const [tipo, setTipo] = useState('retiro_qr_a_efectivo')
  const [caja, setCaja] = useState('servicios') // Para retiros y depósitos
  const [cajaOrigen, setCajaOrigen] = useState('servicios') // Para préstamos
  const [cajaDestino, setCajaDestino] = useState('afiliaciones') // Para préstamos
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  if (!isOpen) return null

  const handleRegister = async (e) => {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) {
      setErrorMsg('Ingresa un monto válido mayor a 0.')
      return
    }

    if (!descripcion.trim()) {
      setErrorMsg('Ingresa una descripción del movimiento para el arqueo.')
      return
    }

    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    let origen = caja
    let destino = caja

    if (tipo === 'prestamo_entre_cajas' || tipo === 'reposicion_prestamo') {
      origen = cajaOrigen
      destino = cajaDestino
      if (origen === destino) {
        setErrorMsg('La caja de origen y destino deben ser distintas para préstamos/reposiciones.')
        setSaving(false)
        return
      }
    }

    try {
      const { error } = await supabase.from('movimientos_internos').insert([
        {
          tipo,
          caja_origen: origen,
          caja_destino: destino,
          monto: montoNum,
          descripcion: descripcion.trim(),
          estado: 'activo',
          fecha: new Date().toISOString(),
        },
      ])

      if (error) throw error

      setSuccessMsg('¡Movimiento interno registrado con éxito!')
      if (onMovementRegistered) onMovementRegistered()
      setTimeout(() => {
        onClose()
        setMonto('')
        setDescripcion('')
      }, 700)
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al registrar movimiento: ' + (err.message || 'Error desconocido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Movimiento Interno de Fondos</h3>
              <p className="text-xs text-slate-400">Ajustes QR ↔ Efectivo y Préstamos entre Cajas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleRegister} className="p-6 space-y-4">
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

          {/* Tipo de Movimiento */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Movimiento</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="retiro_qr_a_efectivo">🏦 Retiro de Cajero: QR a Efectivo (Billetes en mano)</option>
              <option value="deposito_efectivo_a_qr">💵 Depósito: Efectivo a QR / Cuenta Bancaria</option>
              <option value="prestamo_entre_cajas">🤝 Préstamo entre Cajas (Servicios ↔ Afiliaciones)</option>
              <option value="reposicion_prestamo">↩️ Reposición / Devolución de Préstamo</option>
            </select>
          </div>

          {/* Selección de Cajas según el Tipo */}
          {tipo === 'retiro_qr_a_efectivo' || tipo === 'deposito_efectivo_a_qr' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Caja Involucrada</label>
              <select
                value={caja}
                onChange={(e) => setCaja(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="servicios">Caja 1: Servicios Básicos</option>
                <option value="afiliaciones">Caja 2: Afiliaciones</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {tipo === 'retiro_qr_a_efectivo'
                  ? 'Descuenta de saldo QR y suma al efectivo en mano de esta caja.'
                  : 'Descuenta de efectivo en mano y suma al saldo QR de esta caja.'}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Caja Origen (Sale)</label>
                <select
                  value={cajaOrigen}
                  onChange={(e) => setCajaOrigen(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="servicios">Caja Servicios</option>
                  <option value="afiliaciones">Caja Afiliaciones</option>
                  <option value="externo">Bolsillo Propio / Externo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Caja Destino (Entra)</label>
                <select
                  value={cajaDestino}
                  onChange={(e) => setCajaDestino(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="afiliaciones">Caja Afiliaciones</option>
                  <option value="servicios">Caja Servicios</option>
                  <option value="externo">Devolución a Externo</option>
                </select>
              </div>
            </div>
          )}

          {/* Monto */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Monto a Transferir (Bs) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full pl-3 pr-12 py-2 text-sm bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">Bs</span>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción / Motivo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Retiro de 500 Bs para pago en efectivo de guardia..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Botones */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
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
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Registrando...' : 'Confirmar Movimiento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
