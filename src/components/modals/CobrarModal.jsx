import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import FotoUploaderModal from './FotoUploaderModal'
import { Receipt, Coins, QrCode, CheckCircle2, AlertCircle, X, Camera, FileText, ExternalLink } from 'lucide-react'

export default function CobrarModal({
  isOpen,
  onClose,
  cobro,
  onPaymentSuccess,
}) {
  const { user } = useAuth()
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo') // 'efectivo' | 'qr'
  const [nroTalonarioFisico, setNroTalonarioFisico] = useState('')
  const [comprobanteUrl, setComprobanteUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)

  React.useEffect(() => {
    if (isOpen && cobro) {
      const saldo = Math.max(0, (cobro.total_a_pagar || 0) - (cobro.total_pagado || 0))
      setMonto(saldo > 0 ? saldo.toFixed(2) : '')
      setMetodoPago('efectivo')
      setNroTalonarioFisico('')
      setComprobanteUrl('')
      setErrorMsg('')
      setSuccessMsg('')
    }
  }, [isOpen, cobro])

  if (!isOpen || !cobro) return null

  const totalAPagar = cobro.total_a_pagar || 0
  const totalPagado = cobro.total_pagado || 0
  const saldoPendiente = Math.max(0, totalAPagar - totalPagado)

  const handleRegisterPayment = async (e) => {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) {
      setErrorMsg('Ingresa un monto válido mayor a 0.')
      return
    }

    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      // 1. Insertar en pagos_servicios
      const { error: pagoError } = await supabase.from('pagos_servicios').insert([
        {
          cobro_id: cobro.id,
          monto: montoNum,
          metodo_pago: metodoPago,
          nro_talonario_fisico: nroTalonarioFisico.trim() || null,
          comprobante_drive_url: comprobanteUrl || null,
          estado: 'activo',
          fecha_pago: new Date().toISOString(),
        },
      ])

      if (pagoError) throw pagoError

      // 2. Actualizar estado del cobro
      const nuevoTotalPagado = totalPagado + montoNum
      const nuevoSaldo = totalAPagar - nuevoTotalPagado
      const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : 'parcial'

      const { error: cobroError } = await supabase
        .from('cobros_servicios')
        .update({
          estado: nuevoEstado,
        })
        .eq('id', cobro.id)

      if (cobroError) throw cobroError

      setSuccessMsg('¡Pago registrado con éxito!')
      if (onPaymentSuccess) onPaymentSuccess()
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al registrar pago: ' + (err.message || 'Error desconocido'))
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
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Registrar Cobro de Servicios</h3>
              <p className="text-xs text-slate-400">
                {cobro.unidades_cobro?.numero_identificador} • {cobro.unidades_cobro?.socios?.nombre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de la deuda */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total a Pagar</span>
            <p className="text-sm font-bold text-slate-800">{totalAPagar.toFixed(2)} Bs</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Ya Abonado</span>
            <p className="text-sm font-bold text-emerald-700">{totalPagado.toFixed(2)} Bs</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Saldo Pendiente</span>
            <p className="text-sm font-bold text-red-600">{saldoPendiente.toFixed(2)} Bs</p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleRegisterPayment} className="p-6 space-y-4">
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

          {/* Monto a Cobrar */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Monto a Cobrar (Bs) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.50"
                min="0.50"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full pl-3 pr-16 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="absolute right-3 top-3 text-xs font-semibold text-slate-400">Bs</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonto(saldoPendiente.toFixed(2))}
                className="text-[11px] text-emerald-700 font-semibold hover:underline"
              >
                Cobro total ({saldoPendiente.toFixed(2)} Bs)
              </button>
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  metodoPago === 'efectivo'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago('qr')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  metodoPago === 'qr'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QR / Banco</span>
              </button>
            </div>
          </div>

          {/* N° Talonario Físico */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              N° Recibo Talonario Físico (Opcional)
            </label>
            <input
              type="text"
              value={nroTalonarioFisico}
              onChange={(e) => setNroTalonarioFisico(e.target.value)}
              placeholder="Ej. Recibo 0452"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">Para cruce con el talonario de papel entregado al socio</span>
          </div>

          {/* Comprobante / Foto */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">Foto de Comprobante (Drive):</span>
            <div className="flex items-center space-x-2">
              {comprobanteUrl && (
                <a
                  href={comprobanteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                <span>{comprobanteUrl ? 'Cambiar Foto' : 'Adjuntar Foto'}</span>
              </button>
            </div>
          </div>

          {/* Botones */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
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
              <span>{saving ? 'Registrando...' : 'Confirmar Cobro'}</span>
            </button>
          </div>
        </form>
      </div>

      <FotoUploaderModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onPhotoSaved={(url) => setComprobanteUrl(url)}
        currentUrl={comprobanteUrl}
        titulo="Comprobante de Pago"
        categoria="Comprobantes"
        anio={new Date().getFullYear()}
        mes={new Date().getMonth() + 1}
        customName={`Recibo_${cobro.unidades_cobro?.numero_identificador}_${Date.now()}.jpg`}
      />
    </div>
  )
}
