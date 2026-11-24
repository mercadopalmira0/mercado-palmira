import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Receipt, Coins, QrCode, Trash2, X, AlertCircle, CheckCircle2, RefreshCw, ExternalLink, ShieldAlert } from 'lucide-react'

export default function HistorialPagosModal({
  isOpen,
  onClose,
  cobro,
  onPaymentUpdated,
}) {
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [anulandoId, setAnulandoId] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchPagos = async () => {
    if (!cobro?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('pagos_servicios')
        .select('*')
        .eq('cobro_id', cobro.id)
        .order('fecha_pago', { ascending: false })

      if (error) throw error
      setPagos(data || [])
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al cargar pagos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchPagos()
      setAnulandoId(null)
      setMotivoAnulacion('')
      setErrorMsg('')
      setSuccessMsg('')
    }
  }, [isOpen, cobro])

  if (!isOpen || !cobro) return null

  const handleAnular = async (pagoId) => {
    if (!motivoAnulacion.trim()) {
      setErrorMsg('El motivo de anulación es obligatorio (regla de cero borrados).')
      return
    }

    try {
      setErrorMsg('')
      // 1. Marcar pago como anulado con motivo escrito
      const { error: pError } = await supabase
        .from('pagos_servicios')
        .update({
          estado: 'anulado',
          motivo_anulacion: motivoAnulacion.trim(),
        })
        .eq('id', pagoId)

      if (pError) throw pError

      // 2. Recalcular total pagado activo del cobro
      const { data: activePagos, error: aError } = await supabase
        .from('pagos_servicios')
        .select('monto')
        .eq('cobro_id', cobro.id)
        .eq('estado', 'activo')

      if (aError) throw aError

      const nuevoTotalPagado = activePagos?.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0) || 0
      const nuevoSaldo = (cobro.total_a_pagar || 0) - nuevoTotalPagado
      const nuevoEstado = nuevoTotalPagado <= 0 ? 'pendiente' : nuevoSaldo <= 0 ? 'pagado' : 'parcial'

      await supabase
        .from('cobros_servicios')
        .update({ estado: nuevoEstado })
        .eq('id', cobro.id)

      setSuccessMsg('Pago anulado correctamente con registro de auditoría.')
      setAnulandoId(null)
      setMotivoAnulacion('')
      await fetchPagos()
      if (onPaymentUpdated) onPaymentUpdated()
    } catch (err) {
      console.error(err)
      setErrorMsg('Error al anular el pago: ' + err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Historial de Pagos</h3>
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

        {/* Content */}
        <div className="p-6 space-y-4">
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

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-slate-400" />
              Cargando historial de pagos...
            </div>
          ) : pagos.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No hay pagos registrados para este cobro en el mes.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {pagos.map((pago) => {
                const isAnulado = pago.estado === 'anulado'
                const isThisAnulando = anulandoId === pago.id

                return (
                  <div key={pago.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`p-1.5 rounded-lg ${
                            pago.metodo_pago === 'qr'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {pago.metodo_pago === 'qr' ? <QrCode className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}
                        </span>
                        <div>
                          <p className={`font-bold ${isAnulado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {parseFloat(pago.monto).toFixed(2)} Bs
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(pago.fecha_pago).toLocaleString('es-BO', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {pago.nro_talonario_fisico && (
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">
                            N° {pago.nro_talonario_fisico}
                          </span>
                        )}

                        {pago.comprobante_drive_url && (
                          <a
                            href={pago.comprobante_drive_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Ver foto de comprobante"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {isAnulado ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                            Anulado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAnulandoId(pago.id)
                              setMotivoAnulacion('')
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Anular
                          </button>
                        )}
                      </div>
                    </div>

                    {isAnulado && pago.motivo_anulacion && (
                      <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-700">
                        <strong>Motivo de anulación:</strong> {pago.motivo_anulacion}
                      </div>
                    )}

                    {/* Formulario de Anulación con Motivo */}
                    {isThisAnulando && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          <span>Anulación con Motivo Obligatorio</span>
                        </div>
                        <p className="text-[11px] text-amber-700">
                          El pago quedará tachado en el historial y se descontará del saldo sin eliminarse de la base de datos.
                        </p>
                        <input
                          type="text"
                          required
                          value={motivoAnulacion}
                          onChange={(e) => setMotivoAnulacion(e.target.value)}
                          placeholder="Escribe el motivo de la anulación (ej. Error en monto digitado)..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setAnulandoId(null)}
                            className="px-2.5 py-1 text-slate-600 hover:text-slate-800 text-[11px]"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnular(pago.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] transition-colors"
                          >
                            Confirmar Anulación
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
